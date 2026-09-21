import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { artifactImageFiles, isImageAttachment, listScreenshots, screenshotPathsFromText } from "./upload.js";

test("lists image files in the run folder and skips other types", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "bug-checker-"));
  const dir = join(cwd, "runs", "ticket-1");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "shot.png"), "png");
  await writeFile(join(dir, "notes.txt"), "no");

  const files = await listScreenshots("ticket-1", cwd);
  expect(files.map((file) => file.filename)).toEqual(["shot.png"]);
  expect(files[0].contentType).toBe("image/png");
});

test("treats image content types as reporter screenshots", () => {
  expect(
    isImageAttachment({ filename: "a.png", contentType: "image/png" }),
  ).toBe(true);
  expect(
    isImageAttachment({ filename: "a.pdf", contentType: "application/pdf" }),
  ).toBe(false);
});

test("picks image artifacts and skips other files", () => {
  const files = artifactImageFiles({
    items: [
      { path: "artifacts/login-page.png", sizeBytes: 12 },
      { path: "artifacts/notes.txt", sizeBytes: 4 },
      { path: "artifacts/settings-page.png", sizeBytes: 20 },
    ],
  });
  expect(files.map((file) => file.filename)).toEqual([
    "login-page.png",
    "settings-page.png",
  ]);
  expect(files[0].path).toBe("artifacts/login-page.png");
});

test("parses screenshot paths from a cloud reply", () => {
  expect(
    screenshotPathsFromText(
      "Screenshots: artifacts/login-page.png , artifacts/after-login.png , /opt/cursor/artifacts/settings-page.png.",
    ),
  ).toEqual([
    "artifacts/login-page.png",
    "artifacts/after-login.png",
    "artifacts/settings-page.png",
  ]);
});
