import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(new URL(pathname, "http://localhost/"), { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Living Comic setup without exposing Debug semantics", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Living Comic Engine v0\.1<\/title>/i);
  assert.match(html, /Three people enter/i);
  assert.match(html, /Your Goal &amp; Reason/);
  assert.match(html, /Enter this story/);
  assert.doesNotMatch(html, /Quick Scene Maker/i);
  assert.doesNotMatch(html, /conflict_skeleton|BASED Vibe|npcDecisions|candidateScores/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("server-renders Quick Scene Maker at its dedicated route", async () => {
  const response = await render("/scene-maker");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Trapstar Quick Scene Maker<\/title>/i);
  assert.match(html, /Quick Scene Maker/i);
  assert.match(html, /APT_305_QUICK_SCENE/);
  assert.match(html, /Export PNG/);
  assert.doesNotMatch(html, /Three people enter/i);
});

test("server-renders the multi-character Expression Maker at its dedicated route", async () => {
  const response = await render("/expression-maker");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Trapstar Expression Maker v0\.2<\/title>/i);
  assert.match(html, /Expression Maker/i);
  assert.match(html, /TRAPSTAR \/ MULTI-CHARACTER \/ AUTHORING TOOL/i);
  assert.match(html, /CHARACTER PACK/i);
  assert.match(html, />Marcus<\/option>/i);
  assert.match(html, />Goose<\/option>/i);
  assert.match(html, /Export PNG/i);
  assert.match(html, /PRESET ORDER/i);
  assert.doesNotMatch(html, /Three people enter/i);
  assert.doesNotMatch(html, /APT_305_QUICK_SCENE/);
});
