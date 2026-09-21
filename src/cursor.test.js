import { afterEach, expect, test } from "bun:test";
import { cursorAgentOptions } from "./cursor.js";

const keys = [
  "CURSOR_API_KEY",
  "CURSOR_MODEL",
  "CURSOR_RUNTIME",
  "CURSOR_REPO_URL",
  "CURSOR_REPO_REF",
  "CURSOR_REPO_PATH",
];
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

test("cloud without a repo uses an empty VM", () => {
  process.env.CURSOR_API_KEY = "cursor_test";
  process.env.CURSOR_RUNTIME = "cloud";
  delete process.env.CURSOR_REPO_URL;

  expect(cursorAgentOptions()).toEqual({
    apiKey: "cursor_test",
    model: { id: "composer-2.5" },
    cloud: { repos: [], skipReviewerRequest: true },
  });
});

test("cloud with a repo clones that git URL", () => {
  process.env.CURSOR_API_KEY = "cursor_test";
  process.env.CURSOR_RUNTIME = "cloud";
  process.env.CURSOR_REPO_URL = "https://github.com/org/repo";
  process.env.CURSOR_REPO_REF = "dev";

  expect(cursorAgentOptions().cloud).toEqual({
    repos: [{ url: "https://github.com/org/repo", startingRef: "dev" }],
    skipReviewerRequest: true,
  });
});
