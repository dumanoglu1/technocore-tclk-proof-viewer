#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { renderProofHtml } from "../src/render.mjs";

function usage() {
  return [
    "Usage: tclk-proof-viewer <proof.json> [--output report.html]",
    "",
    "Renders an offline HTML receipt for Technocore contribution proofs or",
    "technocore-tclk-proof audit output. No network calls are made."
  ].join("\n");
}

function parseArgs(argv) {
  const args = [...argv];
  const input = args.shift();
  let output = "report.html";

  while (args.length > 0) {
    const flag = args.shift();
    if (flag === "--output") {
      output = args.shift();
      if (!output) {
        throw new Error("--output requires a path");
      }
    } else {
      throw new Error(`unknown argument: ${flag}`);
    }
  }

  if (!input || input === "--help" || input === "-h") {
    return { help: true };
  }
  return { input, output };
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    process.exit(0);
  }

  const raw = await readFile(args.input, "utf8");
  const proof = JSON.parse(raw);
  const html = renderProofHtml(proof, { sourceName: basename(args.input) });
  await writeFile(args.output, html, "utf8");
  console.log(args.output);
} catch (error) {
  console.error(`error: ${error.message}`);
  console.error(usage());
  process.exit(1);
}

