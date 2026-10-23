import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const loginInput = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

export const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getRequest, setCookie, setResponseHeader } = await import("@tanstack/react-start/server");
  const { authenticate } = await import("./session.server");
  const { user, cookies, headers } = await authenticate(getRequest());
  for (const c of cookies) setCookie(c.name, c.value, c.options as Parameters<typeof setCookie>[2]);
  for (const [k, v] of Object.entries(headers)) setResponseHeader(k, v);
  return user;
});

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginInput.parse(data))
  .handler(async ({ data }) => {
    const { getRequest, setCookie, setResponseHeader } = await import("@tanstack/react-start/server");
    const { attemptLogin } = await import("./session.server");
    const result = await attemptLogin(getRequest(), data.email, data.password);
    if (!result.ok) return { ok: false as const, reason: result.reason, retryAfter: result.retryAfter };
    for (const c of result.cookies) setCookie(c.name, c.value, c.options as Parameters<typeof setCookie>[2]);
    for (const [k, v] of Object.entries(result.headers)) setResponseHeader(k, v);
    return { ok: true as const };
  });
