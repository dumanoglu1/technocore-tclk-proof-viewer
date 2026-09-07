import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeProof, renderProofHtml } from "../src/render.mjs";

test("renders a contribution proof receipt", () => {
  const proof = {
    schema: "technocore-contribution-proof-v1",
    artifact_url: "https://github.com/dumanoglu1/example",
    commit: "0123456789abcdef0123456789abcdef01234567",
    did: "did:key:z6Mkexample",
    signature: "signature"
  };

  const html = renderProofHtml(proof, { sourceName: "proof.json" });
  assert.match(html, /Technocore Contribution Proof/);
  assert.match(html, /0123456789abcdef0123456789abcdef01234567/);
  assert.match(html, /did:key:z6Mkexample/);
});

test("rejects placeholder commit values", () => {
  assert.throws(
    () => normalizeProof({
      schema: "technocore-contribution-proof-v1",
      artifact_url: "https://github.com/dumanoglu1/example",
      commit: "FULL_COMMIT_HASH",
      did: "did:key:z6Mkexample",
      signature: "signature"
    }),
    /commit must be a full/
  );
});

test("renders a TCLK contract table", () => {
  const html = renderProofHtml({
    tool: "technocore-tclk-proof",
    summary: {
      contracts: 1,
      frames: 4,
      rooms: ["tclk-offers"],
      status: "complete"
    },
    contracts: [
      {
        id: "tclk-1",
        state: "revealed",
        frameCount: 4,
        room: "deal-room"
      }
    ]
  });

  assert.match(html, /Technocore TCLK Proof/);
  assert.match(html, /tclk-1/);
  assert.match(html, /revealed/);
});

