import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { requirePermission } from "../src/lib/permissions";

test("Better Auth issues HttpOnly sessions, verifies passwords and revokes other sessions", async () => {
  const baseURL = "http://localhost:3000";
  const secret = randomBytes(32).toString("hex");
  const password = randomBytes(24).toString("hex");
  const newPassword = randomBytes(24).toString("hex");
  const address = "user@openasset.example";
  const state = { user: [], session: [], account: [], rateLimit: [], verification: [] };
  const database = memoryAdapter(state);
  const shared = { baseURL, secret, database, logger: { disabled: true }, telemetry: { enabled: false } };
  const bootstrap = betterAuth({ ...shared, emailAndPassword: { enabled: true, autoSignIn: false } });
  const auth = betterAuth({ ...shared, emailAndPassword: { enabled: true, minPasswordLength: 14, maxPasswordLength: 128, disableSignUp: true } });

  await bootstrap.api.signUpEmail({ body: { name: "Test User", email: address, password } });
  await assert.rejects(auth.api.signUpEmail({ body: { name: "Blocked", email: "blocked@openasset.example", password } }));
  await assert.rejects(auth.api.signInEmail({ body: { email: address, password: "wrong-password" } }));

  const cookie = (headers: Headers) => headers.getSetCookie().map(value => value.split(";", 1)[0]).join("; ");
  const first = await auth.api.signInEmail({ body: { email: address, password }, returnHeaders: true });
  const second = await auth.api.signInEmail({ body: { email: address, password }, returnHeaders: true });
  assert.ok(first.headers.getSetCookie().some(value => /HttpOnly/i.test(value)));
  const firstHeaders = new Headers({ cookie: cookie(first.headers) });
  const secondHeaders = new Headers({ cookie: cookie(second.headers) });
  assert.equal((await auth.api.getSession({ headers: firstHeaders }))?.user.email, address);
  assert.equal((await auth.api.getSession({ headers: secondHeaders }))?.user.email, address);
  const changed = await auth.api.changePassword({
    headers: firstHeaders, body: { currentPassword: password, newPassword, revokeOtherSessions: true }, returnHeaders: true,
  });
  const replacement = new Headers({ cookie: cookie(changed.headers) });
  assert.equal(await auth.api.getSession({ headers: secondHeaders }), null);
  assert.equal((await auth.api.getSession({ headers: replacement }))?.user.email, address);
  await assert.rejects(auth.api.signInEmail({ body: { email: address, password } }));
  await auth.api.signOut({ headers: replacement });
  assert.equal(await auth.api.getSession({ headers: replacement }), null);
  assert.equal((await auth.api.signInEmail({ body: { email: address, password: newPassword } })).user.email, address);
});

test("admin and IT staff have different write permissions", () => {
  assert.doesNotThrow(() => requirePermission({ id: "admin", role: "admin" }, "manage"));
  assert.doesNotThrow(() => requirePermission({ id: "staff", role: "staff" }, "assign"));
  assert.throws(() => requirePermission({ id: "staff", role: "staff" }, "manage"), /permission/);
});

test("local HTTP routes protect workspace pages and CSV without enabling public signup", { skip: !process.env.OPENASSET_TEST_URL }, async () => {
  const origin = URL.parse(process.env.OPENASSET_TEST_URL ?? "");
  assert.ok(origin && !origin.username && !origin.password, "Set a local HTTP test URL.");
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname));
  const request = (path: string, options?: RequestInit) => fetch(new URL(path, origin), {
    redirect: "manual", signal: AbortSignal.timeout(30000), ...options,
  });
  const login = await request("/login");
  assert.equal(login.status, 200);
  const loginPage = await login.text();
  assert.match(loginPage, /type="password"/);
  assert.match(loginPage, /<form\b[^>]*\bmethod="post"/i);
  for (const path of ["/dashboard", "/assets", "/assets/new", "/assignments", "/directory/categories", "/directory/locations", "/employees", "/users", "/reports", "/audit", "/profile"]) {
    const response = await request(path);
    const body = await response.text();
    const headerRedirect = [303, 307, 308].includes(response.status) && response.headers.get("location") === "/login";
    assert.ok(headerRedirect || (response.status === 200 && /(?:NEXT_REDIRECT;replace;\/login;307;|url=\/login)/i.test(body)), path + " access");
    assert.doesNotMatch(body, /DEMO-001|OpenAsset Demo Admin/);
  }
  const exported = await request("/api/reports/export");
  assert.equal(exported.status, 401);
  assert.equal(exported.headers.get("cache-control"), "no-store");
  const signup = await request("/api/auth/sign-up/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.equal(signup.status, 404);
});
