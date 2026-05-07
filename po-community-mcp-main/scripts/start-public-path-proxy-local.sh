#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PO_COMMUNITY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RUNTIME_DIR="${PO_COMMUNITY_ROOT}/.runtime/path-proxy"

mkdir -p "${RUNTIME_DIR}"

PATH_PROXY_HOST="${PATH_PROXY_HOST:-127.0.0.1}"
PATH_PROXY_PORT="${PATH_PROXY_PORT:-5080}"
DISCHARGE_GATEKEEPER_BASE_URL="${DISCHARGE_GATEKEEPER_BASE_URL:-http://127.0.0.1:5055}"
CLINICAL_INTELLIGENCE_BASE_URL="${CLINICAL_INTELLIGENCE_BASE_URL:-http://127.0.0.1:5056}"
EXTERNAL_A2A_BASE_URL="${EXTERNAL_A2A_BASE_URL:-http://127.0.0.1:5057}"
PATH_PROXY_WIRE_CAPTURE_DIR="${PATH_PROXY_WIRE_CAPTURE_DIR:-}"
PATH_PROXY_CAPTURE_BODIES="${PATH_PROXY_CAPTURE_BODIES:-0}"

PID_FILE="${RUNTIME_DIR}/path-proxy.pid"
LOG_FILE="${RUNTIME_DIR}/path-proxy.log"

if [[ -f "${PID_FILE}" ]]; then
  existing_pid="$(cat "${PID_FILE}")"
  if kill -0 "${existing_pid}" >/dev/null 2>&1; then
    echo "[path-proxy] already running with pid ${existing_pid}"
    echo "[path-proxy] log file: ${LOG_FILE}"
    exit 0
  fi
fi

if curl -sSf "http://${PATH_PROXY_HOST}:${PATH_PROXY_PORT}/readyz" >/dev/null 2>&1; then
  echo "[path-proxy] already healthy on ${PATH_PROXY_HOST}:${PATH_PROXY_PORT}"
  echo "[path-proxy] log file: ${LOG_FILE}"
  exit 0
fi

PATH_PROXY_HOST="${PATH_PROXY_HOST}" \
PATH_PROXY_PORT="${PATH_PROXY_PORT}" \
DISCHARGE_GATEKEEPER_BASE_URL="${DISCHARGE_GATEKEEPER_BASE_URL}" \
CLINICAL_INTELLIGENCE_BASE_URL="${CLINICAL_INTELLIGENCE_BASE_URL}" \
EXTERNAL_A2A_BASE_URL="${EXTERNAL_A2A_BASE_URL}" \
PATH_PROXY_WIRE_CAPTURE_DIR="${PATH_PROXY_WIRE_CAPTURE_DIR}" \
PATH_PROXY_CAPTURE_BODIES="${PATH_PROXY_CAPTURE_BODIES}" \
nohup node <<'NODE' >"${LOG_FILE}" 2>&1 &
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const host = process.env.PATH_PROXY_HOST || "127.0.0.1";
const port = Number(process.env.PATH_PROXY_PORT || "5080");

const targets = {
  dgk: new URL(process.env.DISCHARGE_GATEKEEPER_BASE_URL || "http://127.0.0.1:5055"),
  ci: new URL(process.env.CLINICAL_INTELLIGENCE_BASE_URL || "http://127.0.0.1:5056"),
  a2a: new URL(process.env.EXTERNAL_A2A_BASE_URL || "http://127.0.0.1:5057"),
};
const wireCaptureDir = process.env.PATH_PROXY_WIRE_CAPTURE_DIR || "";
const captureBodies = process.env.PATH_PROXY_CAPTURE_BODIES === "1";
const maxCapturedBodyBytes = 100 * 1024;
let captureCounter = 0;

if (wireCaptureDir) {
  fs.mkdirSync(wireCaptureDir, { recursive: true });
}

function routeFor(originalUrl) {
  const parsed = new URL(originalUrl, "http://local-proxy");
  if (parsed.pathname === "/dgk" || parsed.pathname.startsWith("/dgk/")) {
    parsed.pathname = parsed.pathname.replace(/^\/dgk(?=\/|$)/, "") || "/";
    return { label: "dgk", target: targets.dgk, path: `${parsed.pathname}${parsed.search}` };
  }
  if (parsed.pathname === "/ci" || parsed.pathname.startsWith("/ci/")) {
    parsed.pathname = parsed.pathname.replace(/^\/ci(?=\/|$)/, "") || "/";
    return { label: "ci", target: targets.ci, path: `${parsed.pathname}${parsed.search}` };
  }
  return { label: "a2a", target: targets.a2a, path: `${parsed.pathname}${parsed.search}` };
}

function log(level, message, metadata = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...metadata }));
}

function shouldCapture(originalUrl) {
  const pathname = new URL(originalUrl, "http://local-proxy").pathname;
  return (
    wireCaptureDir &&
    (pathname.includes("/message:send") || pathname.includes("/rpc") || pathname.includes("/tasks"))
  );
}

function redactHeaders(headers) {
  const redacted = {};
  const secretNames = new Set([
    "authorization",
    "cookie",
    "set-cookie",
    "proxy-authorization",
    "x-api-key",
    "x-csrf-token",
  ]);
  for (const [name, value] of Object.entries(headers || {})) {
    const normalized = name.toLowerCase();
    const valueText = Array.isArray(value) ? value.join(", ") : String(value ?? "");
    redacted[normalized] =
      secretNames.has(normalized) || /\b(bearer|token)\b/i.test(valueText)
        ? "[REDACTED]"
        : value;
  }
  return redacted;
}

function redactBody(buffer, contentType) {
  const byteCount = buffer.length;
  if (!captureBodies) {
    return { byte_count: byteCount, truncated: false, body: "[body capture disabled]" };
  }

  const captured = buffer.subarray(0, maxCapturedBodyBytes);
  const raw = captured.toString("utf8");
  let body = raw;

  if ((contentType || "").toLowerCase().includes("json")) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = raw;
    }
  }

  return {
    byte_count: byteCount,
    captured_byte_count: captured.length,
    truncated: byteCount > maxCapturedBodyBytes,
    body,
  };
}

function writeWireCapture(entry) {
  if (!wireCaptureDir) {
    return;
  }
  captureCounter += 1;
  const filename = `${String(captureCounter).padStart(4, "0")}-${Date.now()}-${entry.route}-${entry.method}-${entry.path.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "root"}.json`;
  fs.writeFileSync(path.join(wireCaptureDir, filename), `${JSON.stringify(entry, null, 2)}\n`);
}

const server = http.createServer((req, res) => {
  const route = routeFor(req.url || "/");
  const headers = { ...req.headers };
  headers.host = route.target.host;
  headers["x-forwarded-host"] = req.headers.host || `${host}:${port}`;
  headers["x-forwarded-proto"] = req.headers["x-forwarded-proto"] || "https";

  log("info", "proxy request", {
    method: req.method,
    path: req.url,
    route: route.label,
    target: `${route.target.origin}${route.path}`,
    request_id: req.headers["x-request-id"] || null,
  });

  const captureThisRequest = shouldCapture(req.url || "/");
  const requestChunks = [];
  req.on("data", (chunk) => {
    if (captureThisRequest) {
      requestChunks.push(Buffer.from(chunk));
    }
  });

  const proxyReq = http.request(
    {
      protocol: route.target.protocol,
      hostname: route.target.hostname,
      port: route.target.port,
      method: req.method,
      path: route.path,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      const responseChunks = [];
      proxyRes.on("data", (chunk) => {
        if (captureThisRequest) {
          responseChunks.push(Buffer.from(chunk));
        }
        res.write(chunk);
      });
      proxyRes.on("end", () => {
        res.end();
        if (captureThisRequest) {
          const requestBody = Buffer.concat(requestChunks);
          const responseBody = Buffer.concat(responseChunks);
          writeWireCapture({
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.url,
            route: route.label,
            target: `${route.target.origin}${route.path}`,
            status_code: proxyRes.statusCode || 502,
            request_headers: redactHeaders(req.headers),
            request: redactBody(requestBody, req.headers["content-type"]),
            response_headers: redactHeaders(proxyRes.headers),
            response: redactBody(responseBody, proxyRes.headers["content-type"]),
          });
        }
        log("info", "proxy response", {
          method: req.method,
          path: req.url,
          route: route.label,
          status_code: proxyRes.statusCode || 502,
          request_id: req.headers["x-request-id"] || null,
        });
      });
    },
  );

  proxyReq.on("error", (error) => {
    log("error", "proxy error", {
      method: req.method,
      path: req.url,
      route: route.label,
      error: error.message,
      request_id: req.headers["x-request-id"] || null,
    });
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "application/json" });
    }
    res.end(JSON.stringify({ status: "error", message: "path proxy upstream unavailable" }));
  });

  req.pipe(proxyReq);
});

server.listen(port, host, () => {
  log("info", "path proxy listening", {
    host,
    port,
    routes: {
      "/dgk/*": `${targets.dgk.origin}/*`,
      "/ci/*": `${targets.ci.origin}/*`,
      "/*": `${targets.a2a.origin}/*`,
    },
  });
});
NODE

echo $! > "${PID_FILE}"

for _ in {1..20}; do
  if curl -sSf "http://${PATH_PROXY_HOST}:${PATH_PROXY_PORT}/readyz" >/dev/null 2>&1; then
    echo "[path-proxy] started on ${PATH_PROXY_HOST}:${PATH_PROXY_PORT} (pid=$(cat "${PID_FILE}"))"
    echo "[path-proxy] log file: ${LOG_FILE}"
    exit 0
  fi
  sleep 1
done

echo "[path-proxy] failed to become ready on ${PATH_PROXY_HOST}:${PATH_PROXY_PORT}" >&2
echo "[path-proxy] log file: ${LOG_FILE}" >&2
exit 1
