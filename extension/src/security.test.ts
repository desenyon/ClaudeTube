import test from "node:test";
import assert from "node:assert/strict";
import { validateInboxPayload, isAllowedYouTubeHttpUrl, sanitizeInfoMessage } from "../src/security.js";

test("validateInboxPayload rejects oversized input", () => {
  assert.throws(() => validateInboxPayload("x".repeat(70_000)));
});

test("validateInboxPayload accepts valid play action", () => {
  const actions = validateInboxPayload(
    JSON.stringify({ action: "play", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" })
  );
  assert.equal(actions.length, 1);
  assert.equal(actions[0].action, "play");
});

test("validateInboxPayload ignores invalid actions", () => {
  const actions = validateInboxPayload(
    JSON.stringify([
      { action: "play", url: "https://evil.com/x" },
      { action: "toggle" },
    ])
  );
  assert.equal(actions.length, 1);
  assert.equal(actions[0].action, "toggle");
});

test("isAllowedYouTubeHttpUrl only allows https youtube hosts", () => {
  assert.equal(isAllowedYouTubeHttpUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), true);
  assert.equal(isAllowedYouTubeHttpUrl("http://www.youtube.com/watch?v=dQw4w9WgXcQ"), false);
  assert.equal(isAllowedYouTubeHttpUrl("https://evil.com/"), false);
});

test("sanitizeInfoMessage strips newlines and truncates", () => {
  const sanitized = sanitizeInfoMessage("hello\nworld ".repeat(50));
  assert.equal(sanitized.includes("\n"), false);
  assert.ok(sanitized.length <= 240);
});
