const baseUrl = process.env.PREVIEW_BASE_URL?.trim().replace(/\/$/u, "");

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

const health = await waitForHealthyPreview(`${baseUrl}/api/health`);
const healthBody = JSON.stringify(health.body);
if (/service_role|secret|token|password|access[_-]?key/iu.test(healthBody)) {
  fail("The health response appears to expose sensitive configuration.");
}

const home = await fetch(baseUrl, { redirect: "manual" });
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

const corsProbe = await fetch(`${baseUrl}/api/health`, {
  headers: { origin: "https://untrusted.invalid" },
});
if (corsProbe.headers.get("access-control-allow-origin") === "*") {
  fail("Health endpoint unexpectedly allows every CORS origin.");
}

console.log(
  `Preview verification passed (${parsedUrl.hostname}, health=${health.response.status}).`,
);

async function waitForHealthyPreview(url) {
  let lastStatus = "unreachable";

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      lastStatus = String(response.status);
      const body = await response.json();
      if (response.status === 200 && body?.status === "ok") {
        return { response, body };
      }
    } catch {
      lastStatus = "unreachable";
    }

    if (attempt < 30) await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  fail(`Preview health never became ready (last status: ${lastStatus}).`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
