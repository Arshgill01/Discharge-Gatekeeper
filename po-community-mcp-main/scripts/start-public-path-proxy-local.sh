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

PATH_PROXY_HOST="${PATH_PROXY_HOST}" \
PATH_PROXY_PORT="${PATH_PROXY_PORT}" \
DISCHARGE_GATEKEEPER_BASE_URL="${DISCHARGE_GATEKEEPER_BASE_URL}" \
CLINICAL_INTELLIGENCE_BASE_URL="${CLINICAL_INTELLIGENCE_BASE_URL}" \
EXTERNAL_A2A_BASE_URL="${EXTERNAL_A2A_BASE_URL}" \
nohup node <<'NODE' >"${LOG_FILE}" 2>&1 &
const http = require("node:http");
const { URL } = require("node:url");

const host = process.env.PATH_PROXY_HOST || "127.0.0.1";
const port = Number(process.env.PATH_PROXY_PORT || "5080");

const targets = {
  dgk: new URL(process.env.DISCHARGE_GATEKEEPER_BASE_URL || "http://127.0.0.1:5055"),
  ci: new URL(process.env.CLINICAL_INTELLIGENCE_BASE_URL || "http://127.0.0.1:5056"),
  a2a: new URL(process.env.EXTERNAL_A2A_BASE_URL || "http://127.0.0.1:5057"),
};

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
      proxyRes.pipe(res);
      proxyRes.on("end", () => {
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
