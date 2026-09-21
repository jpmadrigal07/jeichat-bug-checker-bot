import { expect, test } from "bun:test";
import { createLabelDebouncer } from "./debounce.js";

test("runs after the delay", () => {
  const pending = [];
  const debouncer = createLabelDebouncer({
    delayMs: 15_000,
    setTimeoutFn: (fn) => {
      pending.push(fn);
      return pending.length;
    },
    clearTimeoutFn: () => {},
  });

  let ran = false;
  debouncer.schedule("t1", () => {
    ran = true;
  });
  expect(ran).toBe(false);
  pending[0]();
  expect(ran).toBe(true);
});

test("cancel skips a pending check", () => {
  const handles = new Map();
  let nextId = 1;
  const debouncer = createLabelDebouncer({
    delayMs: 15_000,
    setTimeoutFn: (fn) => {
      const id = nextId++;
      handles.set(id, fn);
      return id;
    },
    clearTimeoutFn: (id) => {
      handles.delete(id);
    },
  });

  let ran = false;
  debouncer.schedule("t1", () => {
    ran = true;
  });
  expect(debouncer.has("t1")).toBe(true);
  debouncer.cancel("t1");
  expect(debouncer.has("t1")).toBe(false);
  for (const fn of handles.values()) fn();
  expect(ran).toBe(false);
});

test("reschedule replaces the previous timer", () => {
  const handles = new Map();
  let nextId = 1;
  const debouncer = createLabelDebouncer({
    delayMs: 15_000,
    setTimeoutFn: (fn) => {
      const id = nextId++;
      handles.set(id, fn);
      return id;
    },
    clearTimeoutFn: (id) => {
      handles.delete(id);
    },
  });

  const order = [];
  debouncer.schedule("t1", () => order.push("first"));
  debouncer.schedule("t1", () => order.push("second"));
  for (const fn of handles.values()) fn();
  expect(order).toEqual(["second"]);
});
