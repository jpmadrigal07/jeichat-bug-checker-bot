import { checkBug } from "./check.js";
import { JeiChat } from "./client.js";
import { createLabelDebouncer } from "./debounce.js";
import {
  hasRequiredFields,
  MISSING_FIELDS_MESSAGE,
  parseReproduceFields,
  redactCredentials,
} from "./fields.js";
import {
  bugLabelWasAdded,
  bugLabelWasRemoved,
  ticketHasBugLabel,
  ticketIdFromEvent,
} from "./labels.js";
import {
  downloadReporterImages,
  isImageAttachment,
  listScreenshots,
  uploadScreenshots,
} from "./upload.js";

const token = process.env.JEICHAT_BOT_TOKEN?.trim();
if (!token) {
  console.error("Set JEICHAT_BOT_TOKEN (create a bot in JeiChat Settings → Bots).");
  process.exit(1);
}

const client = new JeiChat({
  apiUrl: process.env.JEICHAT_API_URL ?? "http://localhost:3001",
});

const checking = new Set();
const debouncer = createLabelDebouncer();

client.on("ready", () => {
  console.log(
    `Bug checker ready as ${client.user?.name} userId=${client.user?.userId} in workspace ${client.user?.workspaceId}`,
  );
  console.log("Add the Bug label to a ticket to start a check (15s delay).");
});

client.on("ticketUpdate", (event) => {
  const ticketId = ticketIdFromEvent(event);
  if (bugLabelWasRemoved(event)) {
    debouncer.cancel(ticketId);
    return;
  }
  if (!bugLabelWasAdded(event)) return;

  debouncer.schedule(ticketId, () => {
    void runCheck(ticketId);
  });
});

async function runCheck(ticketId) {
  if (checking.has(ticketId)) {
    await client.send(
      ticketId,
      "I am already checking this ticket. I will skip this extra run.",
    );
    return;
  }

  checking.add(ticketId);
  try {
    const ticket = await loadTicket(ticketId);
    if (!ticketHasBugLabel(ticket.labels)) return;

    const fields = parseReproduceFields(ticket.description ?? "");
    if (!hasRequiredFields(fields)) {
      await client.send(ticketId, MISSING_FIELDS_MESSAGE);
      return;
    }

    await client.send(
      ticketId,
      "Got it — I will try to reproduce this and reply here.",
    );

    let reporterFiles = [];
    try {
      reporterFiles = await downloadReporterImages(
        client,
        ticketId,
        ticket.imageAttachments,
      );
    } catch (error) {
      console.error("could not download reporter screenshots", error);
    }

    const summary = await checkBug({
      id: ticket.id,
      displayId: ticket.displayId,
      name: ticket.name,
      description: ticket.description,
      messages: ticket.messages,
      fields,
      reporterFiles,
    });
    const reply = redactCredentials(summary, fields.credentials);

    let attachmentIds = [];
    try {
      const screenshots = await listScreenshots(ticketId);
      if (screenshots.length > 0) {
        attachmentIds = await uploadScreenshots(client, ticketId, screenshots);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown error";
      console.error("screenshot upload failed", error);
      await client.send(
        ticketId,
        `${reply}\n\n_(Could not attach screenshots: ${detail})_`,
      );
      return;
    }

    await client.send(ticketId, reply, { attachmentIds });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    console.error("check failed", error);
    await client.send(ticketId, `Check failed: ${detail}`);
  } finally {
    checking.delete(ticketId);
  }
}

async function loadTicket(ticketId) {
  const workspaceId = client.user.workspaceId;
  const ticket = await client.get(
    `/workspaces/${workspaceId}/channels/${ticketId}`,
  );

  const page = await client.get(`/channels/${ticketId}/messages?limit=20`);
  const messageRows = page.data ?? [];
  const messages = messageRows
    .slice()
    .reverse()
    .map((row) => `${row.sender?.name ?? "Unknown"}: ${row.content}`.trim())
    .filter(Boolean);

  const imageAttachments = [
    ...(ticket.attachments ?? []),
    ...messageRows.flatMap((row) => row.attachments ?? []),
  ].filter(isImageAttachment);

  return {
    id: ticket.id,
    displayId:
      ticket.ticketNumber && ticket.ticketNumber > 0
        ? `#${ticket.ticketNumber}`
        : ticket.id.slice(0, 8),
    name: ticket.name,
    description: ticket.description,
    labels: ticket.labels ?? [],
    messages,
    imageAttachments,
  };
}

await client.login(token);
