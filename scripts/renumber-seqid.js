#!/usr/bin/env node
import { writeFileSync } from "fs";
import fs from "fs/promises";
import path from "path";

async function main() {
  const fileArg = process.argv[2] || "packages/data/discord-qna.json";
  const filePath = path.resolve(process.cwd(), fileArg);

  const raw = await fs.readFile(filePath, "utf8");
  const data = JSON.parse(raw);

  if (!data || !Array.isArray(data.messages)) {
    console.error("Expected top-level messages array");
    process.exit(1);
  }

  // backup
  writeFileSync(filePath + ".renumber.bak", raw, "utf8");

  const updated = data.messages.map((m, idx) => {
    return Object.assign({}, m, { seqId: idx + 1 });
  });

  const out = Object.assign({}, data, { messages: updated });
  await fs.writeFile(filePath, JSON.stringify(out, null, 4) + "\n", "utf8");

  console.log(`Renumbered ${updated.length} messages in ${filePath}`);
  console.log(`Backup written to ${filePath}.renumber.bak`);
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(2);
});
