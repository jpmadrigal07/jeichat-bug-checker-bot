import { expect, test } from "bun:test";
import { checkPrompt } from "./check.js";

test("embeds website, page, and screenshot path in the prompt", () => {
  const prompt = checkPrompt({
    id: "ticket-1",
    displayId: "GEN-12",
    name: "Save fails",
    description: "Clicking Save does nothing.",
    messages: ["Ada: still broken"],
    fields: {
      website: "https://example.com",
      page: "/settings",
      credentials: "qa@test.com / secret",
    },
    reporterFiles: ["runs/ticket-1/reporter/shot.png"],
  });
  expect(prompt).toContain("Website: https://example.com");
  expect(prompt).toContain("Page: /settings");
  expect(prompt).toContain("Test credentials: qa@test.com / secret");
  expect(prompt).toContain("runs/ticket-1/");
  expect(prompt).not.toContain("artifacts/");
  expect(prompt).toContain("Verdict: CONFIRM");
  expect(prompt).toContain("do not commit");
  expect(prompt).not.toContain("autoCreatePR");
});

test("cloud prompt asks for screenshots under /opt/cursor/artifacts", () => {
  const prompt = checkPrompt(
    {
      id: "ticket-1",
      displayId: "GEN-12",
      name: "Save fails",
      description: "Clicking Save does nothing.",
      messages: [],
      fields: {
        website: "https://jeichat.zkript.dev",
        page: "/settings",
        credentials: null,
      },
    },
    { cloud: true },
  );
  expect(prompt).toContain("/opt/cursor/artifacts/settings-page.png");
  expect(prompt).toContain("Cursor only exports that folder");
  expect(prompt).not.toContain("runs/ticket-1/");
});
