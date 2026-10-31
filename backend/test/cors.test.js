import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "production";
process.env.FRONTEND_URL = "https://hetp4759-code.github.io";
process.env.COOKIE_SAMESITE = "None";

const { default: app } = await import("../src/app.js");

const server = app.listen(0);
const baseUrl = await new Promise((resolve) => {
  server.once("listening", () => {
    const { port } = server.address();
    resolve(`http://127.0.0.1:${port}`);
  });
});

test.after(() => new Promise((resolve, reject) => {
  server.close((error) => (error ? reject(error) : resolve()));
}));

test("production and local origins receive credentialed CORS access", async () => {
  for (const origin of [
    "https://hetp4759-code.github.io",
    "http://localhost:5173",
  ]) {
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Origin: origin },
    });

    assert.equal(response.status, 401);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
    assert.equal(response.headers.get("access-control-allow-credentials"), "true");
    assert.deepEqual(await response.json(), {
      success: false,
      message: "Authentication required.",
    });
  }
});

test("untrusted origins receive no CORS permission and cannot submit mutations", async () => {
  const preflight = await fetch(`${baseUrl}/api/auth/login`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://untrusted.example",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });

  assert.equal(preflight.headers.get("access-control-allow-origin"), null);

  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      Origin: "https://untrusted.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: "user@example.com", password: "pass" }),
  });

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("trusted preflight requests succeed without authentication", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://hetp4759-code.github.io",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,authorization",
    },
  });

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "https://hetp4759-code.github.io"
  );
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  assert.match(
    response.headers.get("access-control-allow-headers"),
    /content-type/i
  );
  assert.match(
    response.headers.get("access-control-allow-headers"),
    /authorization/i
  );
});

test("logout clears the production session cookie using matching attributes", async () => {
  const response = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: {
      Origin: "https://hetp4759-code.github.io",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const cookie = response.headers.get("set-cookie");

  assert.equal(response.status, 200);
  assert.match(cookie, /admin_token=;/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=None/i);
  assert.match(cookie, /Path=\//i);
  assert.doesNotMatch(cookie, /Domain=/i);
});
