// CI-only script: calls the official hostinger-hosting-mcp server (run locally
// on the runner, HTTP transport) to deploy a static-site archive. This mirrors
// exactly what a human operator does through the Hostinger MCP tool by hand —
// same tool name, same arguments — just automated for CI.
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

try {
  await client.connect(transport);

  console.log(`Deploying ${archivePath} -> ${domain} ...`);
  const deployResult = await client.callTool({
    name: "hosting_deployStaticWebsite",
    arguments: { domain, archivePath, removeArchive: true },
  });
  const parsed = extractJson(deployResult);
  console.log("Deploy result:", JSON.stringify(parsed, null, 2));

  if (
    deployResult.isError ||
    parsed?.upload?.status !== "success" ||
    parsed?.deploy?.status !== "success"
  ) {
    console.error("Deploy did not report success.");
    process.exit(1);
  }

  console.log("Clearing website cache ...");
  const cacheResult = await client.callTool({
    name: "hosting_clearWebsiteCacheV1",
    arguments: { domain },
  });
  console.log("Cache clear result:", JSON.stringify(extractJson(cacheResult), null, 2));

  console.log("Deploy succeeded.");
} catch (err) {
  console.error("Deploy failed:", err?.message || err);
  process.exit(1);
} finally {
  await client.close().catch(() => {});
}
