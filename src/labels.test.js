import { expect, test } from "bun:test";
import {
  bugLabelWasAdded,
  bugLabelWasRemoved,
  ticketHasBugLabel,
  ticketIdFromEvent,
} from "./labels.js";

const bug = { id: "lab-bug", name: "Bug", color: "red" };
const feature = { id: "lab-feat", name: "Feature", color: "purple" };

function event(fromValue, toValue, type = "labels_changed") {
  return {
    id: "evt-1",
    channelId: "ticket-1",
    parentId: "general-1",
    type,
    fromValue,
    toValue,
    ticket: { id: "ticket-1", name: "Save fails", displayId: "GEN-12" },
  };
}

test("detects when Bug is added", () => {
  expect(bugLabelWasAdded(event([], [bug]))).toBe(true);
  expect(bugLabelWasAdded(event([], [{ id: "lab-bug", name: "BUG" }]))).toBe(
    true,
  );
  expect(bugLabelWasAdded(event([bug], [bug, feature]))).toBe(false);
});

test("detects when Bug is removed", () => {
  expect(bugLabelWasRemoved(event([bug], []))).toBe(true);
  expect(bugLabelWasRemoved(event([bug, feature], [feature]))).toBe(true);
  expect(bugLabelWasRemoved(event([bug], [bug]))).toBe(false);
});

test("ignores other ticket events", () => {
  expect(bugLabelWasAdded(event([], [bug], "status_changed"))).toBe(false);
  expect(bugLabelWasRemoved(event([bug], [], "assignee_changed"))).toBe(false);
});

test("ticketHasBugLabel matches by name", () => {
  expect(ticketHasBugLabel([bug])).toBe(true);
  expect(ticketHasBugLabel([feature])).toBe(false);
  expect(ticketHasBugLabel(undefined)).toBe(false);
});

test("ticketIdFromEvent prefers ticket.id", () => {
  expect(ticketIdFromEvent(event([], [bug]))).toBe("ticket-1");
  expect(
    ticketIdFromEvent({
      id: "evt-2",
      channelId: "ch-9",
      parentId: null,
      type: "labels_changed",
      fromValue: [],
      toValue: [],
      ticket: null,
    }),
  ).toBe("ch-9");
});
