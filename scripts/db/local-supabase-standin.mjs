// Local stand-in for the Supabase HTTP surface used by FundMatch. TEST TOOL ONLY:
// it trusts a fixed HS256 secret and keeps passwords in memory. Never deploy it,
// and never point it at anything but a throwaway local database.
//
//   node scripts/db/local-supabase-standin.mjs      # listens on 127.0.0.1:54321
//
// Extra dependencies (not app dependencies): npm i --no-save postgres jsonwebtoken
//
// Surfaces:
//   /auth/v1/*    -> minimal GoTrue-compatible auth (HS256 JWTs, users in auth.users)
//   /rest/v1/*    -> proxied to PostgREST (RLS enforced by Postgres)
//   /storage/v1/* -> minimal storage API that enforces storage.objects policies
//                    by running the metadata insert/select/delete as the user
// Test-only. Never deploy.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import jwt from "jsonwebtoken";

const SECRET = "fundmatch-local-test-jwt-secret-with-32-plus-chars";
const sql = postgres(
  process.env["FUNDMATCH_TEST_DATABASE_URL"] ||
    "postgres://postgres@127.0.0.1:54329/fundmatch_test",
  {
    max: 4,
    onnotice: () => {},
  },
);
const FILES = path.resolve("./files");
fs.mkdirSync(FILES, { recursive: true });
const passwords = new Map(); // email -> password (test only)
const refresh = new Map(); // refresh token -> user id
export const mailbox = []; // recovery mails

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "content-range, range",
};

function json(res, status, body) {
  res.writeHead(status, { ...cors, "content-type": "application/json" });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}
async function userRow(id) {
  const [u] =
    await sql`select id, email, raw_user_meta_data, created_at from auth.users where id = ${id}`;
  return (
    u && {
      id: u.id,
      aud: "authenticated",
      role: "authenticated",
      email: u.email,
      email_confirmed_at: u.created_at,
      user_metadata: u.raw_user_meta_data,
      app_metadata: { provider: "email" },
      created_at: u.created_at,
      updated_at: u.created_at,
    }
  );
}
async function session(userId) {
  const user = await userRow(userId);
  const access_token = jwt.sign(
    { sub: user.id, email: user.email, role: "authenticated", aud: "authenticated" },
    SECRET,
    { expiresIn: "1h" },
  );
  const refresh_token = Math.random().toString(36).slice(2);
  refresh.set(refresh_token, user.id);
  return {
    access_token,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token,
    user,
  };
}
function claimsFrom(req) {
  const h = req.headers.authorization || "";
  const token = h.replace(/^Bearer /, "");
  try {
    const c = jwt.verify(token, SECRET);
    return c.role === "authenticated" ? c : null;
  } catch {
    return null;
  }
}
async function asUser(claims, fn) {
  return sql.begin(async (tx) => {
    await tx.unsafe(
      `select set_config('request.jwt.claims', '${JSON.stringify(claims).replace(/'/g, "''")}', true)`,
    );
    await tx.unsafe(`set local role authenticated`);
    return fn(tx);
  });
}

async function auth(req, res, url) {
  const body = req.method === "GET" ? {} : JSON.parse((await readBody(req)).toString() || "{}");
  const p = url.pathname.replace("/auth/v1", "");
  if (req.method === "POST" && p === "/signup") {
    const email = String(body.email || "").toLowerCase();
    if (!email || !body.password || body.password.length < 6)
      return json(res, 422, { code: 422, msg: "Password should be at least 6 characters" });
    const [exists] = await sql`select id from auth.users where email = ${email}`;
    if (exists) return json(res, 422, { code: 422, msg: "User already registered" });
    const [u] =
      await sql`insert into auth.users (email, raw_user_meta_data) values (${email}, ${sql.json(body.data || {})}) returning id`;
    passwords.set(email, body.password);
    return json(res, 200, await session(u.id));
  }
  if (req.method === "POST" && p === "/token") {
    const grant = url.searchParams.get("grant_type");
    if (grant === "password") {
      const email = String(body.email || "").toLowerCase();
      const [u] = await sql`select id from auth.users where email = ${email}`;
      if (!u || passwords.get(email) !== body.password)
        return json(res, 400, {
          code: 400,
          error_code: "invalid_credentials",
          msg: "Invalid login credentials",
        });
      return json(res, 200, await session(u.id));
    }
    if (grant === "refresh_token") {
      const id = refresh.get(body.refresh_token);
      if (!id) return json(res, 400, { code: 400, msg: "Invalid Refresh Token" });
      return json(res, 200, await session(id));
    }
  }
  if (req.method === "GET" && p === "/user") {
    const c = claimsFrom(req);
    if (!c) return json(res, 401, { code: 401, msg: "invalid JWT" });
    return json(res, 200, await userRow(c.sub));
  }
  if (req.method === "PUT" && p === "/user") {
    const c = claimsFrom(req);
    if (!c) return json(res, 401, { code: 401, msg: "invalid JWT" });
    if (body.password) passwords.set(c.email, body.password);
    return json(res, 200, await userRow(c.sub));
  }
  if (req.method === "POST" && p === "/logout") return json(res, 204, {});
  if (req.method === "POST" && p === "/recover") {
    mailbox.push({ to: body.email, kind: "recovery" });
    return json(res, 200, {});
  }
  return json(res, 404, { msg: "not found " + p });
}

async function storage(req, res, url) {
  const c = claimsFrom(req);
  const p = url.pathname.replace("/storage/v1", "");
  const m = p.match(/^\/object\/(documents)\/(.+)$/);
  const claims = c || { role: "anon" };
  if (req.method === "POST" && m) {
    const name = decodeURIComponent(m[2]);
    const size = Number(req.headers["content-length"] || 0);
    const body = await readBody(req);
    try {
      await asUser(
        claims,
        (tx) =>
          tx`insert into storage.objects (bucket_id, name, owner_id, metadata) values ('documents', ${name}, ${claims.sub ?? null}, ${sql.json({ size: body.length, mimetype: req.headers["content-type"] })})`,
      );
    } catch (e) {
      return json(res, 400, {
        statusCode: "403",
        error: "Unauthorized",
        message: "new row violates row-level security policy",
      });
    }
    const file = path.join(FILES, name.replace(/\//g, "__"));
    fs.writeFileSync(file, body);
    return json(res, 200, { Key: "documents/" + name, Id: name, size });
  }
  if (req.method === "GET" && m) {
    const name = decodeURIComponent(m[2]);
    const rows = await asUser(
      claims,
      (tx) => tx`select name from storage.objects where bucket_id = 'documents' and name = ${name}`,
    );
    if (rows.length === 0)
      return json(res, 400, { statusCode: "404", error: "not_found", message: "Object not found" });
    res.writeHead(200, { ...cors, "content-type": "application/octet-stream" });
    return res.end(fs.readFileSync(path.join(FILES, name.replace(/\//g, "__"))));
  }
  if (req.method === "DELETE" && p === "/object/documents") {
    const body = JSON.parse((await readBody(req)).toString() || "{}");
    const removed = [];
    for (const name of body.prefixes || []) {
      const rows = await asUser(
        claims,
        (tx) =>
          tx`delete from storage.objects where bucket_id = 'documents' and name = ${name} returning name`,
      );
      if (rows.length) {
        removed.push({ name });
        try {
          fs.unlinkSync(path.join(FILES, name.replace(/\//g, "__")));
        } catch {}
      }
    }
    return json(res, 200, removed);
  }
  return json(res, 404, { message: "not found " + p });
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "OPTIONS") {
      res.writeHead(204, cors);
      return res.end();
    }
    try {
      if (url.pathname.startsWith("/auth/v1")) return await auth(req, res, url);
      if (url.pathname.startsWith("/storage/v1")) return await storage(req, res, url);
      if (url.pathname.startsWith("/rest/v1")) {
        const body = await readBody(req);
        const target =
          (process.env["FUNDMATCH_POSTGREST_URL"] || "http://127.0.0.1:3001") +
          url.pathname.replace("/rest/v1", "") +
          url.search;
        const headers = { ...req.headers };
        delete headers.host;
        delete headers["content-length"];
        const r = await fetch(target, {
          method: req.method,
          headers,
          body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
        });
        const out = Buffer.from(await r.arrayBuffer());
        const h = { ...cors };
        for (const [k, v] of r.headers)
          if (
            !["content-encoding", "transfer-encoding"].includes(k) &&
            !k.startsWith("access-control")
          )
            h[k] = v;
        res.writeHead(r.status, h);
        return res.end(out);
      }
      json(res, 404, { message: "unknown route" });
    } catch (e) {
      console.error(e);
      json(res, 500, { message: String(e) });
    }
  })
  .listen(54321, "127.0.0.1", () =>
    console.log("local supabase stand-in on http://127.0.0.1:54321"),
  );
