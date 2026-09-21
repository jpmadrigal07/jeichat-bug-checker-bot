import { expect, test } from "bun:test";
import { parseCheckVerdict } from "./verdict.js";

test("parses CONFIRM even when bolded", () => {
  expect(parseCheckVerdict("**Verdict:** **CONFIRM**\nBroken save.")).toBe(
    "CONFIRM",
  );
});

test("parses REFUTE", () => {
  expect(parseCheckVerdict("Verdict: REFUTE\nCould not reproduce.")).toBe(
    "REFUTE",
  );
});

test("returns null when there is no verdict", () => {
  expect(parseCheckVerdict("I could not finish the check (error).")).toBe(null);
});
