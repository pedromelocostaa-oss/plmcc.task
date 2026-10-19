import { getDb } from "./supabase";
import { TOOLS, executeTool } from "./tools";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

const SERVER_INFO = {
  name: "plmcc",
  version: "1.0.0",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ status: "ok", server: SERVER_INFO });
    }

    if (url.pathname === "/sse" && request.method === "GET") {
      return handleSSE(url);
    }

    if (url.pathname === "/mcp" && request.method === "POST") {
      return handleMCP(request, env);
    }

    return json({ error: "Not found" }, 404);
  },
};

function handleSSE(url: URL): Response {
  const baseUrl = `${url.protocol}//${url.host}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`event: endpoint\ndata: ${baseUrl}/mcp\n\n`)
      );
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function handleMCP(request: Request, env: Env): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null });
  }

  const req = body as { jsonrpc: string; method: string; params?: Record<string, unknown>; id?: number | string | null };

  if (req.jsonrpc !== "2.0") {
    return json({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Invalid Request" },
      id: req.id ?? null,
    });
  }

  const result = await dispatch(req.method, req.params ?? {}, env);
  return json({ jsonrpc: "2.0", result, id: req.id ?? null });
}

async function dispatch(
  method: string,
  params: Record<string, unknown>,
  env: Env
): Promise<unknown> {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      };

    case "notifications/initialized":
      return {};

    case "tools/list":
      return { tools: TOOLS };

    case "tools/call": {
      const toolName = params.name as string;
      const toolArgs = (params.arguments ?? {}) as Record<string, unknown>;
      const db = getDb(env);
      return executeTool(db, toolName, toolArgs);
    }

    case "ping":
      return {};

    default:
      return { error: { code: -32601, message: `Method not found: ${method}` } };
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
