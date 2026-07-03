import test from "node:test";
import assert from "node:assert/strict";
import {
  buildYouTubeUrl,
  isValidVideoId,
  isValidPlaylistId,
  parseYouTubeUrl,
  resolveVideoInput,
  thumbnailUrlForVideo,
} from "../src/parseYouTubeUrl.js";
import { isAgentAction } from "../src/security.js";

const SAMPLE = "dQw4w9WgXcQ";
const PLAYLIST = "PLrAXtmRdnEQy6nuLM17y4N4-lYly1xpTQ";

test("isValidVideoId accepts 11-char ids", () => {
  assert.equal(isValidVideoId(SAMPLE), true);
  assert.equal(isValidVideoId("short"), false);
});

test("isValidPlaylistId validates playlist ids", () => {
  assert.equal(isValidPlaylistId(PLAYLIST), true);
  assert.equal(isValidPlaylistId("not-a-playlist"), false);
});

test("parseYouTubeUrl handles common formats", () => {
  assert.deepEqual(parseYouTubeUrl(SAMPLE), {
    videoId: SAMPLE,
    url: `https://www.youtube.com/watch?v=${SAMPLE}`,
  });

  assert.equal(parseYouTubeUrl(`https://www.youtube.com/watch?v=${SAMPLE}`)?.videoId, SAMPLE);
  assert.equal(parseYouTubeUrl(`https://youtu.be/${SAMPLE}`)?.videoId, SAMPLE);
  assert.equal(parseYouTubeUrl(`https://www.youtube.com/shorts/${SAMPLE}`)?.videoId, SAMPLE);
  assert.equal(
    parseYouTubeUrl(`https://www.youtube.com/watch?v=${SAMPLE}&t=90`)?.startSeconds,
    90
  );
});

test("parseYouTubeUrl handles playlists", () => {
  const withVideo = parseYouTubeUrl(`https://www.youtube.com/watch?v=${SAMPLE}&list=${PLAYLIST}`);
  assert.equal(withVideo?.videoId, SAMPLE);
  assert.equal(withVideo?.playlistId, PLAYLIST);

  const playlistOnly = parseYouTubeUrl(`https://www.youtube.com/playlist?list=${PLAYLIST}`);
  assert.equal(playlistOnly?.videoId, null);
  assert.equal(playlistOnly?.playlistId, PLAYLIST);
  assert.equal(playlistOnly?.isPlaylistOnly, true);
});

test("parseYouTubeUrl rejects unsafe input", () => {
  assert.equal(parseYouTubeUrl(""), null);
  assert.equal(parseYouTubeUrl("https://evil.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(parseYouTubeUrl("http://www.youtube.com/watch?v=dQw4w9WgXcQ"), null);
});

test("thumbnailUrlForVideo builds predictable urls", () => {
  assert.equal(thumbnailUrlForVideo(SAMPLE).includes(SAMPLE), true);
});

test("isAgentAction validates extended actions", () => {
  assert.equal(isAgentAction({ action: "next" }), true);
  assert.equal(isAgentAction({ action: "mute" }), true);
  assert.equal(isAgentAction({ action: "seek", seconds: 30 }), true);
  assert.equal(isAgentAction({ action: "seek", seconds: -1 }), false);
});
