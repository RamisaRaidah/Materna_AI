# MaternaAI MCP Inventory

This document gives hackathon judges a quick way to verify MCP protocol depth.

## Built MCP Servers

| Server | Location | Transports | MCP tools | MCP resources | HTTP paths |
| --- | --- | --- | ---: | ---: | --- |
| `maternaai-mcp-inventory` | `MaternaAI/backend/mcp_server.py` | `stdio`, optional `http-json-rpc` | 4 | 2 | `/mcp`, `/health` |

The server is intentionally standalone. It scans the Flask route files with Python `ast`, so it does not import the Flask app, connect to PostgreSQL, initialize Firebase, or call external AI providers.

## Used MCP Servers

| Server | Transport | Endpoint count | Reuse |
| --- | --- | ---: | --- |
| None external in-repo | n/a | 0 | The repository previously called provider APIs directly. No external MCP client configuration, SDK dependency, or server call site was present before this inventory server. |

## Endpoint Counts

The inventory server reports the live count directly from source code. At the time this was added, it reports:

| Surface | Count |
| --- | ---: |
| Flask REST route decorators | 89 |
| MCP tools | 4 |
| MCP resources | 2 |
| HTTP JSON-RPC endpoint | 1 |
| HTTP health endpoint | 1 |

The count ignores commented legacy code in `app.py`.

## Exposed MCP Tools

| Tool | Purpose |
| --- | --- |
| `maternaai.protocol_inventory` | Lists MCP servers built/used, transports, endpoint counts, and reuse summary. |
| `maternaai.route_inventory` | Lists discovered Flask REST endpoints with counts by file and method. |
| `maternaai.reuse_map` | Maps reusable MaternaAI capability areas to source files. |
| `maternaai.search_routes` | Searches route paths, handlers, methods, and source files by keyword. |

## Verification Commands

From the repository root:

```bash
python MaternaAI/backend/mcp_server.py --dump
```

Run the stdio transport:

```bash
python MaternaAI/backend/mcp_server.py
```

The stdio transport uses MCP `Content-Length` framing. For quick manual smoke tests, the server also accepts one-line JSON-RPC input and returns a framed response.

Run the HTTP JSON-RPC transport:

```bash
python MaternaAI/backend/mcp_server.py --http --port 8765
```

Example HTTP call:

```bash
curl -X POST http://127.0.0.1:8765/mcp \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"maternaai.protocol_inventory\",\"arguments\":{}}}"
```

## Reuse Across Projects

The MCP inventory pattern is reusable for other Flask projects because it statically scans route decorators instead of importing app modules. The MaternaAI capability map also identifies reusable modules for other health, safety, and low-connectivity projects:

- RAG maternal guidance: `services/rag.py`, `db/seed_knowledge.py`
- Clinical risk scoring: `services/risk_engine.py`, `rules/severity.py`
- Silent abuse and SOS escalation: `services/abuse_detection.py`, `routes/sos.py`
- Multimodal document intake: `routes/health.py`
- Voice and SMS access: `services/tts.py`, `services/sms.py`, `routes/sms_routes.py`
