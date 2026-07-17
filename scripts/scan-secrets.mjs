import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const scanHistory = process.argv.includes("--history");
const maxTextBytes = 5 * 1024 * 1024;

const patterns = [
  {
    name: "database URL with embedded credentials",
    expression: /postgres(?:ql)?:\/\/[^\s:/@]+:[^\s/@]+@/giu,
  },
  {
    name: "private environment variable assignment",
    expression:
      /^[ \t]*(?:SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|MERCADOPAGO_ACCESS_TOKEN|MERCADOPAGO_WEBHOOK_SECRET|RESEND_API_KEY|CRON_SECRET|NOTIFICATION_WEBHOOK_SECRET)[ \t]*=[ \t]*["']?(?![ \t]*(?:["']?$|<|your[_-]|example|change[-_]?me|replace[-_]?me|env\())[^\s#"']+/gimu,
  },
  {
    name: "private key",
    expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gu,
  },
  {
    name: "GitHub token",
    expression: /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{30,}\b/gu,
  },
  {
    name: "AWS access key",
    expression: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/gu,
  },
  {
    name: "provider secret token",
    expression: /\b(?:sk_(?:live|test)_|whsec_|re_)[A-Za-z0-9_-]{16,}\b/gu,
  },
];

const findings = [];

for (const pathname of gitNullList([
  "ls-files",
  "-co",
  "--exclude-standard",
  "-z",
])) {
  try {
    scanBuffer(readFileSync(pathname), pathname, "worktree");
  } catch (error) {
    fail(`No se pudo leer ${pathname}: ${error.message}`);
  }
}

if (scanHistory) scanGitHistory();

if (findings.length > 0) {
  console.error("Secret scan failed. Potential secrets were found:");
  for (const finding of findings) {
    console.error(`- ${finding.location}: ${finding.pattern}`);
  }
  process.exit(1);
}

console.log(
  `Secret scan passed (${scanHistory ? "worktree and Git history" : "worktree"}).`,
);

function scanGitHistory() {
  const commits = gitLines(["rev-list", "--all"]);
  const scannedBlobs = new Set();

  for (const commit of commits) {
    for (const entry of gitNullList(["ls-tree", "-r", "-z", commit])) {
      const match = entry.match(/^\d+\s+blob\s+([0-9a-f]+)\t(.+)$/u);
      if (!match || scannedBlobs.has(match[1])) continue;
      scannedBlobs.add(match[1]);

      const blob = git(["cat-file", "blob", match[1]]);
      scanBuffer(blob, match[2], `history:${commit.slice(0, 12)}`);
    }
  }
}

function scanBuffer(buffer, pathname, source) {
  if (buffer.length > maxTextBytes || buffer.includes(0)) return;
  const content = buffer.toString("utf8");

  for (const pattern of patterns) {
    pattern.expression.lastIndex = 0;
    if (pattern.expression.test(content)) {
      findings.push({
        location: `${source}:${pathname}`,
        pattern: pattern.name,
      });
    }
  }
}

function gitNullList(args) {
  const output = git(args).toString("utf8");
  return output.split("\0").filter(Boolean);
}

function gitLines(args) {
  return git(args).toString("utf8").split(/\r?\n/u).filter(Boolean);
}

function git(args) {
  const result = spawnSync("git", args, {
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    fail(`git ${args[0]} falló durante el secret scan.`);
  }
  return result.stdout;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
