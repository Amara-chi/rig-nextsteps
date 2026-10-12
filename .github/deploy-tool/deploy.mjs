// CI-only script: calls the official hostinger-hosting-mcp server (run locally
// on the runner, HTTP transport) to deploy a static-site archive. This mirrors
// exactly what a human operator does through the Hostinger MCP tool by hand —
// same operations, same arguments — just automated for CI.
//
// Since hostinger-api-mcp v2.x the server exposes three meta-tools over HTTP
// (search / execute / multi-execute) and every real operation, including the
// custom upload-and-deploy one, is reached through execute({ operation, params }).
// Operation names are pinned alongside the package version in deploy.yml.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const [, , domain, archivePath] = process.argv;
const token = process.env.HOSTINGER_API_TOKEN;

if (!domain || !archivePath) {
  console.error("Usage: node deploy.mjs <domain> <archivePath>");
  process.exit(1);
}
if (!token) {
  console.error("HOSTINGER_API_TOKEN is not set");
  process.exit(1);
}

const transport = new StreamableHTTPClientTransport(
  new URL("http://127.0.0.1:8100/"),
  { requestInit: { headers: { Authorization: `Bearer ${token}` } } }
);

const client = new Client({ name: "rig-nextsteps-deploy", version: "1.0.0" }, { capabilities: {} });

function extractJson(result) {
  const text = (result.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// The GitHub Actions runner <-> Hostinger connection has hit transient
// network failures (ETIMEDOUT/ENETUNREACH) more than once in practice,
// failing an otherwise-fine deploy. Retrying the same call is safe here:
// the failures observed happened before any bytes were sent ("Pre-upload
// request failed"), so nothing has been partially applied server-side.
// Run one named operation through the server's execute meta-tool and unwrap
// its JSON result. An isError reply is thrown so withRetry can retry it.
async function run(operation, params) {
  const result = await client.callTool({ name: "execute", arguments: { operation, params } });
  const parsed = extractJson(result);
  if (result.isError) throw new Error(`${operation}: ${typeof parsed === "string" ? parsed : JSON.stringify(parsed)}`);
  return parsed;
}

async function withRetry(label, fn, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts) throw err;
      console.error(`${label} failed (attempt ${i}/${attempts}): ${err?.message || err}`);
      console.log(`Retrying ${label} in 10s ...`);
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
}

try {
  await client.connect(transport);

  console.log(`Deploying ${archivePath} -> ${domain} ...`);
  const parsed = await withRetry("Deploy", () =>
    run("hosting_deploy-static-website", { domain, archivePath, removeArchive: true })
  );
  console.log("Deploy result:", JSON.stringify(parsed, null, 2));

  if (parsed?.upload?.status !== "success" || parsed?.deploy?.status !== "success") {
    console.error("Deploy did not report success.");
    process.exit(1);
  }

  // The cache-clear tool needs the hosting account username as well as the
  // domain, so look it up rather than hardcoding an account id in the repo.
  console.log("Resolving hosting account ...");
  const sites = await withRetry("Website lookup", () => run("hosting_websites_list", { domain }));
  const username = sites?.data?.[0]?.username;
  if (!username) {
    console.error("Could not resolve the hosting username for", domain, JSON.stringify(sites));
    process.exit(1);
  }

  console.log("Clearing website cache ...");
  const cacheResult = await withRetry("Cache clear", () => run("hosting_cache_clear-website", { username, domain }));
  console.log("Cache clear result:", JSON.stringify(cacheResult, null, 2));

  console.log("Deploy succeeded.");
} catch (err) {
  console.error("Deploy failed:", err?.message || err);
  if (err?.cause) console.error("Cause:", err.cause);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
} finally {
  await client.close().catch(() => {});
}
