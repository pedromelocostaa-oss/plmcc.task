// SOMENTE servidor. Valida a sessao do cookie e centraliza o login.
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { SESSION_MAX_AGE_SECONDS } from "./auth-shared";

export type CookieToSet = { name: string; value: string; options: Record<string, unknown> };
export type SessionUser = { id: string; email: string | null };

function config() {
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase environment variables");
  return { url, key };
}

function parseCookies(header: string | null): { name: string; value: string }[] {
  if (!header) return [];
  const out: { name: string; value: string }[] = [];
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const name = part.slice(0, i).trim();
    let value = part.slice(i + 1).trim();
    try { value = decodeURIComponent(value); } catch { /* mantem o valor cru */ }
    if (name) out.push({ name, value });
  }
  return out;
}

export function serializeCookie(name: string, value: string, o: Record<string, unknown>): string {
  let s = `${name}=${encodeURIComponent(value)}`;
  if (typeof o.maxAge === "number") s += `; Max-Age=${Math.floor(o.maxAge)}`;
  if (typeof o.domain === "string") s += `; Domain=${o.domain}`;
  s += `; Path=${typeof o.path === "string" ? o.path : "/"}`;
  if (o.expires) s += `; Expires=${new Date(o.expires as string | number | Date).toUTCString()}`;
  if (o.httpOnly) s += "; HttpOnly";
  if (o.secure) s += "; Secure";
  const ss = o.sameSite;
  if (ss) s += `; SameSite=${ss === true ? "Strict" : String(ss).charAt(0).toUpperCase() + String(ss).slice(1)}`;
  return s;
}

function makeServerClient(request: Request) {
  const { url, key } = config();
  const cookies: CookieToSet[] = [];
  const headers: Record<string, string> = {};
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => parseCookies(request.headers.get("cookie")),
      setAll: (list, extra) => {
        for (const c of list) cookies.push({ name: c.name, value: c.value, options: { ...c.options } });
        Object.assign(headers, extra ?? {});
      },
    },
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: new URL(request.url).protocol === "https:",
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  });
  return { supabase, cookies, headers };
}

export async function authenticate(request: Request) {
  const { supabase, cookies, headers } = makeServerClient(request);
  // getSession renova o access token vencido (e dispara setAll); em seguida getUser
  // confirma no servidor de Auth que o token e valido de fato.
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return { user: null as SessionUser | null, cookies, headers };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { user: null as SessionUser | null, cookies, headers };
  return { user: { id: data.user.id, email: data.user.email ?? null } as SessionUser, cookies, headers };
}

export function withSessionCookies(res: Response, cookies: CookieToSet[], headers: Record<string, string>) {
  if (cookies.length === 0 && Object.keys(headers).length === 0) return res;
  const next = new Response(res.body, res);
  for (const c of cookies) next.headers.append("Set-Cookie", serializeCookie(c.name, c.value, c.options));
  for (const [k, v] of Object.entries(headers)) next.headers.set(k, v);
  return next;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type LoginResult =
  | { ok: true; cookies: CookieToSet[]; headers: Record<string, string> }
  | { ok: false; reason: "invalid" | "locked" | "unavailable"; retryAfter?: number };

export async function attemptLogin(request: Request, email: string, password: string): Promise<LoginResult> {
  const { url, key } = config();
  const anon = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const throttleKey = await sha256Hex(ip);

  const before = await anon.rpc("auth_throttle_check", { p_key: throttleKey });
  if (before.error) return { ok: false, reason: "unavailable" };
  if (Number(before.data) > 0) return { ok: false, reason: "locked", retryAfter: Number(before.data) };

  const { supabase, cookies, headers } = makeServerClient(request);
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  await anon.rpc("auth_throttle_record", { p_key: throttleKey, p_ok: !error });

  if (error) {
    const after = await anon.rpc("auth_throttle_check", { p_key: throttleKey });
    const wait = Number(after.data ?? 0);
    return wait > 0 ? { ok: false, reason: "locked", retryAfter: wait } : { ok: false, reason: "invalid" };
  }
  return { ok: true, cookies, headers };
}
