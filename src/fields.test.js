import { expect, test } from "bun:test";
import {
  hasRequiredFields,
  MISSING_FIELDS_MESSAGE,
  parseReproduceFields,
  redactCredentials,
} from "./fields.js";

test("parses website, page, and credentials from a full report", () => {
  const fields = parseReproduceFields(`
Website: https://staging.example.com
Page: /w/abc/settings
Test credentials: qa@test.com / secret

What's wrong:
Clicking Save does nothing.

Expected:
Name updates.

Steps I tried:
1. Sign in
2. Click Save

Browser: Chrome
When: always
Screenshot: attached
  `);
  expect(fields.website).toBe("https://staging.example.com");
  expect(fields.page).toBe("/w/abc/settings");
  expect(fields.credentials).toBe("qa@test.com / secret");
  expect(hasRequiredFields(fields)).toBe(true);
});

test("parses labeled website, page, and credentials", () => {
  const fields = parseReproduceFields(`
Website: https://staging.zkript.dev
Page: /settings
Test credentials: qa@test.com / secret
  `);
  expect(fields.website).toBe("https://staging.zkript.dev");
  expect(fields.page).toBe("/settings");
  expect(fields.credentials).toBe("qa@test.com / secret");
  expect(hasRequiredFields(fields)).toBe(true);
});

test("accepts a bare URL as website and path as page", () => {
  const fields = parseReproduceFields(
    "The bug is on https://app.example.com/settings/profile",
  );
  expect(fields.website).toBe("https://app.example.com/settings/profile");
  expect(fields.page).toBe("/settings/profile");
  expect(hasRequiredFields(fields)).toBe(true);
});

test("requires page when the URL has no path", () => {
  const fields = parseReproduceFields("Website: https://staging.zkript.dev");
  expect(fields.website).toBe("https://staging.zkript.dev");
  expect(fields.page).toBe(null);
  expect(hasRequiredFields(fields)).toBe(false);
});

test("does not treat an empty description or example.com as ready to check", () => {
  expect(hasRequiredFields(parseReproduceFields(""))).toBe(false);
  expect(
    hasRequiredFields(
      parseReproduceFields(`Website: https://example.com\nPage: /settings`),
    ),
  ).toBe(false);
});

test("redacts credentials in the public reply", () => {
  expect(
    redactCredentials("Logged in as qa@test.com / secret", "qa@test.com / secret"),
  ).toBe("Logged in as [redacted]");
});

test("missing-fields template asks to fill the description, not chat history", () => {
  expect(MISSING_FIELDS_MESSAGE).toContain(
    "I need a bit more detail before I can reproduce this.",
  );
  expect(MISSING_FIELDS_MESSAGE).toContain("ticket description");
  expect(MISSING_FIELDS_MESSAGE).toContain("Website: https://example.com");
  expect(MISSING_FIELDS_MESSAGE).toContain("Page: /settings");
  expect(MISSING_FIELDS_MESSAGE).toContain("Test credentials:");
});
