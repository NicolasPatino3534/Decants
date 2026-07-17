const baseUrl = process.env.PREVIEW_BASE_URL?.trim().replace(/\/$/u, "");
const allowedDegradedChecks = readAllowedDegradedChecks();

if (!baseUrl) fail("PREVIEW_BASE_URL is required.");

let parsedUrl;
try {
  parsedUrl = new URL(baseUrl);
} catch {
  fail("PREVIEW_BASE_URL must be a valid URL.");
}

if (parsedUrl.protocol !== "https:") {
  fail("Preview verification requires HTTPS.");
}

const protectionHeaders = await createProtectionHeaders(baseUrl);
const health = await waitForHealthyPreview(`${baseUrl}/api/health`);
const healthBody = JSON.stringify(health.body);
if (/service_role|secret|token|password|access[_-]?key/iu.test(healthBody)) {
  fail("The health response appears to expose sensitive configuration.");
}

const home = await previewFetch(baseUrl, { redirect: "manual" });
if (home.status < 200 || home.status >= 400) {
  fail(`Preview home returned HTTP ${home.status}.`);
}

for (const header of [
  "content-security-policy",
  "referrer-policy",
  "x-content-type-options",
  "x-frame-options",
  "permissions-policy",
  "strict-transport-security",
]) {
  if (!home.headers.get(header)) fail(`Missing security header: ${header}.`);
}

const corsProbe = await previewFetch(`${baseUrl}/api/health`, {
  headers: { origin: "https://untrusted.invalid" },
});
if (corsProbe.headers.get("access-control-allow-origin") === "*") {
  fail("Health endpoint unexpectedly allows every CORS origin.");
}

console.log(
  `Preview verification passed (${parsedUrl.hostname}, health=${health.response.status}${health.degraded ? ", expected external blocks" : ""}).`,
);

async function waitForHealthyPreview(url) {
  let lastStatus = "unreachable";

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const response = await previewFetch(url, { cache: "no-store" });
      lastStatus = String(response.status);
      const body = await response.json();
      if (response.status === 200 && body?.status === "ok") {
        return { response, body, degraded: false };
      }
      if (
        response.status === 503 &&
        body?.status === "degraded" &&
        isExpectedExternalDegradation(body)
      ) {
        return { response, body, degraded: true };
      }
    } catch {
      lastStatus = "unreachable";
    }

    if (attempt < 30) await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  fail(`Preview health never became ready (last status: ${lastStatus}).`);
}

async function previewFetch(url, init = {}) {
  const headers = new Headers(init.headers);
  for (const [name, value] of Object.entries(protectionHeaders)) {
    headers.set(name, value);
  }
  return fetch(url, { ...init, headers });
}

async function createProtectionHeaders(url) {
  const automationSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  if (automationSecret) {
    return { "x-vercel-protection-bypass": automationSecret };
  }

  const shareSecret = process.env.VERCEL_SHARE_BYPASS?.trim();
  if (!shareSecret) return {};

  const shareUrl = new URL(url);
  shareUrl.searchParams.set("_vercel_share", shareSecret);
  const response = await fetch(shareUrl, { redirect: "manual" });
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) fail("Vercel share bypass did not establish a cookie.");
  return { cookie: setCookie.split(";", 1)[0] };
}

function readAllowedDegradedChecks() {
  const allowed = new Set(
    (process.env.PREVIEW_ALLOWED_DEGRADED_CHECKS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const externalOnly = new Set(["payments", "email"]);
  for (const check of allowed) {
    if (!externalOnly.has(check)) {
      fail(`Preview degradation cannot be allowed for ${check}.`);
    }
  }
  return allowed;
}

function isExpectedExternalDegradation(body) {
  if (allowedDegradedChecks.size === 0 || !body?.checks) return false;
  const failed = Object.entries(body.checks)
    .filter(([, ok]) => ok !== true)
    .map(([name]) => name);
  return (
    failed.length > 0 && failed.every((name) => allowedDegradedChecks.has(name))
  );
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
