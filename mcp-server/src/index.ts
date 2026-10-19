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

const SUPPORTED_PROTOCOLS = ["2024-11-05", "2025-03-26", "2025-06-18"];

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

  // Notificacoes (sem id) nao recebem resposta — exigencia do JSON-RPC 2.0.
  const isNotification = req.id === undefined || req.id === null;

  if (req.jsonrpc !== "2.0") {
    if (isNotification) return new Response(null, { status: 202, headers: CORS_HEADERS });
    return json({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Invalid Request" },
      id: req.id ?? null,
    });
  }

  if (isNotification) {
    await dispatch(req.method, req.params ?? {}, env).catch(() => {});
    return new Response(null, { status: 202, headers: CORS_HEADERS });
  }

  try {
    const result = await dispatch(req.method, req.params ?? {}, env);
    return json({ jsonrpc: "2.0", result, id: req.id });
  } catch (e) {
    const rpc = e as RpcError;
    return json({
      jsonrpc: "2.0",
      error: {
        code: rpc.code ?? -32603,
        message: rpc.message ?? "Internal error",
      },
      id: req.id,
    });
  }
}

class RpcError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

async function dispatch(
  method: string,
  params: Record<string, unknown>,
  env: Env
): Promise<unknown> {
  switch (method) {
    case "initialize": {
      const asked = params.protocolVersion as string | undefined;
      return {
        protocolVersion: SUPPORTED_PROTOCOLS.includes(asked ?? "")
          ? asked
          : "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      };
    }

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

    case "resources/list":
      return { resources: [] };

    case "prompts/list":
      return { prompts: [] };

    default:
      if (method.startsWith("notifications/")) return {};
      throw new RpcError(-32601, `Method not found: ${method}`);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
