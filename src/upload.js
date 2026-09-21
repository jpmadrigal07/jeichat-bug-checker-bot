import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const MAX_SCREENSHOTS = 5;

const IMAGE_EXT = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
]);

export function screenshotDir(ticketId, cwd = process.cwd()) {
  return join(cwd, "runs", ticketId);
}

export function reporterDir(ticketId, cwd = process.cwd()) {
  return join(screenshotDir(ticketId, cwd), "reporter");
}

export function contentTypeForFilename(name) {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return IMAGE_EXT.get(ext) ?? null;
}

function basename(path) {
  const parts = String(path).split(/[\\/]/);
  return parts[parts.length - 1] || "";
}

function safeFilename(name) {
  const cleaned = basename(name).replace(/[^A-Za-z0-9._-]/g, "_");
  return cleaned || "screenshot.png";
}

export function artifactDownloadPath(path) {
  const normalized = String(path).replace(/\\/g, "/");
  if (normalized.startsWith("/opt/cursor/artifacts/")) {
    return `artifacts/${normalized.slice("/opt/cursor/artifacts/".length)}`;
  }
  if (normalized.startsWith("artifacts/")) return normalized;
  return `artifacts/${basename(normalized)}`;
}

const SCREENSHOT_PATH =
  /(?:\/opt\/cursor\/)?artifacts\/[A-Za-z0-9._-]+\.(?:png|jpe?g|gif|webp)/gi;

export function screenshotPathsFromText(text) {
  const matches = String(text).match(SCREENSHOT_PATH) ?? [];
  return [...new Set(matches.map((path) => artifactDownloadPath(path)))];
}

export function artifactImageFiles(artifacts) {
  const rows = Array.isArray(artifacts)
    ? artifacts
    : Array.isArray(artifacts?.items)
      ? artifacts.items
      : [];
  return rows
    .flatMap((artifact) => {
      const filename = safeFilename(artifact.path);
      const contentType = contentTypeForFilename(filename);
      if (!contentType) return [];
      return [
        {
          path: artifactDownloadPath(artifact.path),
          filename,
          contentType,
        },
      ];
    })
    .slice(0, MAX_SCREENSHOTS);
}

export async function writeScreenshots(ticketId, files, cwd = process.cwd()) {
  const dir = screenshotDir(ticketId, cwd);
  await mkdir(dir, { recursive: true });
  const saved = [];
  for (const file of files) {
    const filename = safeFilename(file.filename);
    const contentType =
      file.contentType ?? contentTypeForFilename(filename) ?? "image/png";
    const dest = join(dir, filename);
    await writeFile(dest, file.bytes);
    saved.push({ path: dest, filename, contentType });
  }
  return saved;
}

export function isImageAttachment(attachment) {
  const type = attachment.contentType?.toLowerCase() ?? "";
  if (type.startsWith("image/")) return true;
  return Boolean(contentTypeForFilename(attachment.filename ?? ""));
}

export async function listScreenshots(ticketId, cwd = process.cwd()) {
  const dir = screenshotDir(ticketId, cwd);
  try {
    const names = await readdir(dir);
    return names
      .flatMap((name) => {
        const contentType = contentTypeForFilename(name);
        if (!contentType) return [];
        return [{ path: join(dir, name), filename: name, contentType }];
      })
      .slice(0, MAX_SCREENSHOTS);
  } catch {
    return [];
  }
}

export async function uploadScreenshots(client, ticketId, files) {
  const ids = [];
  for (const file of files) {
    const bytes = await readFile(file.path);
    const presign = await client.post("/attachments/presign", {
      channelId: ticketId,
      filename: file.filename,
      contentType: file.contentType,
      sizeBytes: bytes.byteLength,
    });
    const put = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.contentType },
      body: bytes,
    });
    if (!put.ok) {
      throw new Error(
        `Screenshot upload failed (${put.status}) for ${file.filename}`,
      );
    }
    ids.push(presign.attachmentId);
  }
  return ids;
}

export async function downloadReporterImages(client, ticketId, attachments, cwd = process.cwd()) {
  const images = attachments.filter(isImageAttachment).slice(0, MAX_SCREENSHOTS);
  if (images.length === 0) return [];

  const dir = reporterDir(ticketId, cwd);
  await mkdir(dir, { recursive: true });
  const saved = [];

  for (const attachment of images) {
    const { url } = await client.get(`/attachments/${attachment.id}/download-url`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Could not download ${attachment.filename ?? attachment.id} (${response.status})`,
      );
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const filename = attachment.filename || `${attachment.id}.png`;
    const path = join(dir, filename);
    await writeFile(path, bytes);
    saved.push(path);
  }

  return saved;
}
