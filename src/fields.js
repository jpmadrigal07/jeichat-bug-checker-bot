export const MISSING_FIELDS_MESSAGE = `I need a bit more detail before I can reproduce this.

Please put this on the ticket description (Edit under the title), then remove the Bug label and add it again so I retry:

Website: https://example.com
Page: /settings
Test credentials: user@test.com / password (optional — only if the page requires login)`;

const WEBSITE_LINE = /^(?:website|url|site)\s*[:\-]\s*(.+)$/im;
const PAGE_LINE = /^(?:page|path|route)\s*[:\-]\s*(.+)$/im;
const CREDS_LINE =
  /^(?:test\s+credentials|credentials|login|auth)\s*[:\-]\s*(.+)$/im;
const BARE_URL = /https?:\/\/[^\s)>\]]+/i;

function trimField(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function pageFromWebsite(website) {
  try {
    const url = new URL(website);
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (path && path !== "/") return path;
    return null;
  } catch {
    return null;
  }
}

function firstUrl(text) {
  const match = text.match(BARE_URL);
  return match?.[0] ?? null;
}

export function parseReproduceFields(text) {
  const websiteLine = trimField(text.match(WEBSITE_LINE)?.[1]);
  const pageLine = trimField(text.match(PAGE_LINE)?.[1]);
  const credentials = trimField(text.match(CREDS_LINE)?.[1]);
  const website = firstUrl(websiteLine ?? "") ?? websiteLine ?? firstUrl(text);

  return {
    website,
    page: pageLine ?? (website ? pageFromWebsite(website) : null),
    credentials,
  };
}

export function isPlaceholderWebsite(website) {
  if (!website) return true;
  try {
    const href = website.includes("://") ? website : `https://${website}`;
    const host = new URL(href).hostname.toLowerCase();
    return host === "example.com" || host === "www.example.com";
  } catch {
    return true;
  }
}

export function hasRequiredFields(fields) {
  return Boolean(
    fields.website &&
      fields.page &&
      !isPlaceholderWebsite(fields.website),
  );
}

export function redactCredentials(text, credentials) {
  if (!credentials || credentials.length < 3) return text;
  return text.split(credentials).join("[redacted]");
}
