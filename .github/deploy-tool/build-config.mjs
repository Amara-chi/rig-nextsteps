// CI-only: turns config.template.js into a real config.js by substituting
// the two Supabase placeholders with secret values. The result is written
// only into the CI runner's workspace, never committed back to the repo.
import { readFileSync, writeFileSync } from "node:fs";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("SUPABASE_URL and SUPABASE_ANON_KEY must be set");
  process.exit(1);
}

let content = readFileSync("config.template.js", "utf8");
content = content.replace("https://YOUR-PROJECT-REF.supabase.co", url);
content = content.replace("PASTE-YOUR-ANON-PUBLIC-KEY-HERE", anonKey);

if (content.includes("YOUR-PROJECT-REF") || content.includes("PASTE-YOUR-ANON")) {
  console.error("Placeholder substitution failed — check config.template.js markers");
  process.exit(1);
}

writeFileSync("config.js", content);
console.log("config.js written from config.template.js");
