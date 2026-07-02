import test from "node:test";
import assert from "node:assert/strict";
import {
  buildYouTubeUrl,
  isValidVideoId,
  parseYouTubeUrl,
  resolveVideoInput,
} from "../src/parseYouTubeUrl.js";
import { isAgentAction } from "../src/security.js";

test("isValidVideoId accepts 11-char ids", () => {
  assert.equal(isValidVideoId("dQw4w9WgXcQ"), true);
  assert.equal(isValidVideoId("short"), false);
  assert.equal(isValidVideoId("javascript:alert(1)"), false);
});

test("parseYouTubeUrl handles common formats", () => {
  assert.deepEqual(parseYouTubeUrl("dQw4w9WgXcQ"), {
    videoId: "dQw4w9WgXcQ",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  });

  assert.deepEqual(parseYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), {
    videoId: "dQw4w9WgXcQ",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    startSeconds: undefined,
  });

  assert.deepEqual(parseYouTubeUrl("https://youtu.be/dQw4w9WgXcQ"), {
    videoId: "dQw4w9WgXcQ",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    startSeconds: undefined,
  });

  assert.deepEqual(parseYouTubeUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ"), {
    videoId: "dQw4w9WgXcQ",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    startSeconds: undefined,
  });

  assert.deepEqual(
    parseYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90"),
    {
      videoId: "dQw4w9WgXcQ",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s",
      startSeconds: 90,
    }
  );
});

test("parseYouTubeUrl rejects unsafe or invalid input", () => {
  assert.equal(parseYouTubeUrl(""), null);
  assert.equal(parseYouTubeUrl("https://evil.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(parseYouTubeUrl("javascript:alert(1)"), null);
  assert.equal(parseYouTubeUrl("https://www.youtube.com/watch?v=tooshort"), null);
  assert.equal(
    parseYouTubeUrl("http://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    null
  );
});

test("buildYouTubeUrl includes timestamp when provided", () => {
  assert.equal(
    buildYouTubeUrl("dQw4w9WgXcQ", 125),
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=125s"
  );
});

test("resolveVideoInput prefers url then videoId", () => {
  assert.deepEqual(resolveVideoInput("https://youtu.be/dQw4w9WgXcQ"), {
    videoId: "dQw4w9WgXcQ",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    startSeconds: undefined,
  });
  assert.deepEqual(resolveVideoInput(undefined, "dQw4w9WgXcQ"), {
    videoId: "dQw4w9WgXcQ",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  });
  assert.equal(resolveVideoInput(undefined, "bad"), null);
});

test("isAgentAction validates action payloads", () => {
  assert.equal(isAgentAction({ action: "play", url: "https://youtu.be/dQw4w9WgXcQ" }), true);
  assert.equal(isAgentAction({ action: "toggle" }), true);
  assert.equal(isAgentAction({ action: "setLayout", layout: "mini" }), true);
  assert.equal(isAgentAction({ action: "setPlaybackRate", rate: 1.5 }), true);
  assert.equal(isAgentAction({ action: "evil" }), false);
  assert.equal(isAgentAction({ action: "setLayout", layout: "huge" }), false);
  assert.equal(isAgentAction({ action: "setPlaybackRate", rate: 99 }), false);
  assert.equal(isAgentAction(null), false);
});
