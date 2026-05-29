#!/usr/bin/env node
/**
 * Strips Cursor agent co-author trailers from commit messages.
 * Installed via scripts/install-githooks.js (core.hooksPath = .githooks).
 */
const fs = require("node:fs");

const commitMsgFile = process.argv[2];
if (!commitMsgFile) process.exit(0);

let message = fs.readFileSync(commitMsgFile, "utf8");
const lines = message.split(/\r?\n/);
const filtered = lines.filter((line) => {
  const trimmed = line.trim();
  if (!/^Co-authored-by:/i.test(trimmed)) return true;
  return !/cursor\s*<cursoragent@cursor\.com>/i.test(trimmed) && !/cursoragent@cursor\.com/i.test(trimmed);
});

message = filtered.join("\n").replace(/\n{3,}/g, "\n\n");
if (!message.endsWith("\n")) message += "\n";

fs.writeFileSync(commitMsgFile, message);
