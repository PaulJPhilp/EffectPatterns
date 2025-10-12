#!/usr/bin/env node
import { writeFileSync } from "fs";
import fs from "fs/promises";
import path from "path";

function usage() {
  console.error(
    "Usage: node scripts/add-seqid.js [file] [--start N] [--backup] [--dry-run]"
  );
  console.error("");
  console.error(
    "Adds sequential seqId fields to messages that don't already have them."
  );
  console.error("Existing seqId values are preserved.");
  console.error("");
  console.error("Options:");
  console.error("  --start N    Start numbering new seqIds at N (default: 1)");
  console.error("  --backup     Create a backup file before writing");
  console.error(
    "  --keep=first|last  When deduping by id, keep the first or last occurrence (default: first)"
  );
  console.error(
    "  --dry-run    Print output to stdout instead of writing file"
  );
  process.exit(1);
}

const argv = process.argv.slice(2);
if (argv.includes("--help")) usage();

const fileArg =
  argv.find((a) => !a.startsWith("--")) || "packages/data/discord-qna.json";
const startIndex = (() => {
  const idx = argv.indexOf("--start");
  if (idx !== -1 && argv[idx + 1]) {
    const n = parseInt(argv[idx + 1], 10);
    return Number.isNaN(n) ? 1 : n;
  }
  return 1;
})();
const doBackup = argv.includes("--backup");
const dryRun = argv.includes("--dry-run");
const keepOption = (() => {
  const k = argv.find((a) => a.startsWith("--keep="));
  if (!k) return "first";
  const val = k.split("=")[1];
  return val === "last" ? "last" : "first";
})();

const filePath = path.resolve(process.cwd(), fileArg);

async function main() {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(raw);

    if (!data || !Array.isArray(data.messages)) {
      console.error(
        'Error: JSON does not contain a top-level "messages" array'
      );
      process.exit(2);
    }

    if (doBackup) {
      writeFileSync(filePath + ".bak", raw, "utf8");
    }

    // Deduplicate messages by `id` according to keepOption.
    // Also preserve existing seqId values and only assign seqIds to
    // messages that are missing them.
    let deduped = [];
    if (keepOption === "first") {
      const seenIds = new Set();
      for (const m of data.messages) {
        if (m && typeof m.id === "string") {
          if (seenIds.has(m.id)) continue; // skip duplicates, keep first
          seenIds.add(m.id);
          deduped.push(m);
        } else {
          deduped.push(m);
        }
      }
    } else {
      // keepOption === "last" : iterate in reverse and keep last occurrence
      const seenIds = new Set();
      const tmp = [];
      for (let i = data.messages.length - 1; i >= 0; i--) {
        const m = data.messages[i];
        if (m && typeof m.id === "string") {
          if (seenIds.has(m.id)) continue; // skip earlier duplicates
          seenIds.add(m.id);
          tmp.push(m);
        } else {
          tmp.push(m);
        }
      }
      // tmp contains items in reverse order, restore original order
      deduped = tmp.reverse();
    }

    // Find the highest existing seqId to continue from, or use startIndex
    let nextSeqId = startIndex;
    const existingSeqIds = deduped
      .map((m) => m.seqId)
      .filter((id) => typeof id === "number")
      .sort((a, b) => a - b);

    if (existingSeqIds.length > 0) {
      nextSeqId = Math.max(
        nextSeqId,
        existingSeqIds[existingSeqIds.length - 1] + 1
      );
    }

    const updated = deduped.map((m) => {
      // Only add seqId if missing, preserve existing ones
      if (m && typeof m.seqId === "number") {
        return m; // Keep existing seqId
      } else {
        return Object.assign({ seqId: nextSeqId++ }, m);
      }
    });

    const out = Object.assign({}, data, { messages: updated });
    const formatted = JSON.stringify(out, null, 4) + "\n";

    if (dryRun) {
      console.log(formatted);
    } else {
      await fs.writeFile(filePath, formatted, "utf8");
      const missingCount = data.messages.filter(
        (m) => typeof m.seqId !== "number"
      ).length;
      console.log(
        `Wrote ${filePath} with ${
          updated.length
        } messages (${missingCount} seqId fields added)${
          doBackup ? ", backup created" : ""
        }`
      );
    }
  } catch (err) {
    console.error("Error:", err && err.message ? err.message : err);
    process.exit(3);
  }
}

main();
