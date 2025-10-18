#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";

function collectNestedMessages(item, collector) {
  if (!item || typeof item !== "object") return false;

  let found = false;
  if (Array.isArray(item.messages)) {
    for (const m of item.messages) {
      collector.push(m);
    }
    found = true;
  }

  // recurse over object properties in case nested deeper
  for (const key of Object.keys(item)) {
    const v = item[key];
    if (Array.isArray(v)) {
      for (const el of v) {
        if (el && typeof el === "object") {
          found = collectNestedMessages(el, collector) || found;
        }
      }
    } else if (v && typeof v === "object") {
      found = collectNestedMessages(v, collector) || found;
    }
  }

  return found;
}

async function main() {
  const filePath = process.argv[2] || "packages/data/discord-qna.json";
  const abs = path.resolve(filePath);

  const raw = await fs.readFile(abs, "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data.messages)) {
    console.error("Expected top-level messages array");
    process.exit(1);
  }

  const extracted = [];
  const remainder = [];

  for (const item of data.messages) {
    // collect nested messages recursively; if none found, keep the item
    const found = collectNestedMessages(item, extracted);
    if (!found) remainder.push(item);
  }

  if (extracted.length === 0) {
    console.log("No nested messages found. Nothing to do.");
    return;
  }

  const merged = remainder.concat(extracted);
  const out = { ...data, messages: merged };
  const formatted = JSON.stringify(out, null, 4) + "\n";

  await fs.writeFile(abs + ".flatten.bak", raw, "utf8");
  await fs.writeFile(abs, formatted, "utf8");

  console.log(`Flattened ${extracted.length} nested messages into ${abs}`);
  console.log(`Backup written to ${abs}.flatten.bak`);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
