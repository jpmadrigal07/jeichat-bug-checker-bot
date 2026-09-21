import { Agent, CursorAgentError } from "@cursor/sdk";
import { cursorAgentOptions, isCloudAgent, truncateReply } from "./cursor.js";
import { artifactImageFiles, screenshotPathsFromText, writeScreenshots } from "./upload.js";

export function checkPrompt(ticket, options = {}) {
  const cloud = Boolean(options.cloud);
  const messages =
    ticket.messages.length > 0
      ? ticket.messages.map((line) => `- ${line}`).join("\n")
      : "(none)";
  const credentials = ticket.fields.credentials
    ? ticket.fields.credentials
    : "(none — do not try to log in)";
  const reporterFiles =
    ticket.reporterFiles?.length > 0
      ? ticket.reporterFiles.map((line) => `- ${line}`).join("\n")
      : "(none)";
  const screenshotInstruction = cloud
    ? `Save each proving PNG to the absolute path /opt/cursor/artifacts/ (example: /opt/cursor/artifacts/settings-page.png). Cursor only exports that folder. A relative artifacts/ or runs/ path will not attach to the JeiChat ticket.`
    : `Save proving PNG files under runs/${ticket.id}/ in this working directory (not inside reporter/).`;
  const reporterInstruction = cloud
    ? "Reporter screenshots are not copied onto the cloud VM. Rely on the ticket description."
    : `Reporter screenshots (if any) are saved under runs/${ticket.id}/reporter/ :\n${reporterFiles}`;

  return `You are a QA bot reproducing a reported bug on a live website. Do not inspect this repo for product code. Do not modify files except screenshots, do not commit, and do not open a pull request.

Ticket: ${ticket.displayId} ${ticket.name}
Description:
${ticket.description?.trim() || "(empty)"}

Recent messages:
${messages}

${reporterInstruction}

Reproduction target:
- Website: ${ticket.fields.website}
- Page: ${ticket.fields.page}
- Test credentials: ${credentials}

Instructions:
1. Open the website and go to the page. Sign in with the test credentials only if they were provided.
2. Try to reproduce the bug described on the ticket. You may look at reporter screenshots if those files exist.
3. If a screenshot helps prove CONFIRM or REFUTE (broken UI, error toast, 404, empty state), ${screenshotInstruction} Skip screenshots when the outcome is obvious from text.
4. Do not include the raw test credentials in your reply.
5. Reply with a short Markdown report in this exact shape (use CONFIRM or REFUTE, not both):

Verdict: CONFIRM
What's happening: <one or two sentences>
Steps to reproduce:
1. ...
2. ...

or:

Verdict: REFUTE
What's happening: <what you saw instead>
Steps to reproduce:
1. <what you tried>
2. ...`;
}

async function disposeAgent(agent) {
  if (!agent) return;
  if (typeof agent[Symbol.asyncDispose] === "function") {
    await agent[Symbol.asyncDispose]();
    return;
  }
  agent.close();
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadArtifactBytes(agent, path) {
  try {
    return await agent.downloadArtifact(path);
  } catch (error) {
    console.error(`downloadArtifact failed for ${path}`, error);
    return null;
  }
}

async function listedCloudImages(agent) {
  const artifacts = await agent.listArtifacts();
  return artifactImageFiles(artifacts);
}

function imagesFromReply(replyText) {
  return screenshotPathsFromText(replyText).map((path) => ({
    path,
    filename: path.slice(path.lastIndexOf("/") + 1),
    contentType: "image/png",
  }));
}

async function downloadImages(agent, images) {
  const files = [];
  const seen = new Set();
  for (const image of images) {
    if (seen.has(image.path)) continue;
    seen.add(image.path);
    const bytes = await downloadArtifactBytes(agent, image.path);
    if (!bytes) continue;
    files.push({
      filename: image.filename,
      contentType: image.contentType,
      bytes,
    });
  }
  return files;
}

async function pullCloudScreenshots(agent, ticketId, replyText) {
  let images = [...(await listedCloudImages(agent)), ...imagesFromReply(replyText)];
  let files = await downloadImages(agent, images);

  for (let attempt = 0; attempt < 6 && files.length === 0; attempt++) {
    await sleep(2500);
    images = [...(await listedCloudImages(agent)), ...imagesFromReply(replyText)];
    files = await downloadImages(agent, images);
  }

  if (files.length === 0) {
    console.error("cloud artifacts: none downloaded");
    return;
  }
  await writeScreenshots(ticketId, files);
  console.log(`cloud artifacts: attached ${files.length} screenshot(s)`);
}

export async function checkBug(ticket) {
  const options = cursorAgentOptions();
  const cloud = isCloudAgent(options);
  let agent;
  try {
    agent = await Agent.create(options);
    const run = await agent.send(checkPrompt(ticket, { cloud }));
    const result = await run.wait();
    if (result.status !== "finished") {
      return `I could not finish the check (${result.status}${
        result.error?.message ? `: ${result.error.message}` : ""
      }).`;
    }
    const text = result.result?.trim();
    if (!text) return "The check finished but returned no explanation.";
    const reply = truncateReply(text);

    if (cloud) {
      try {
        await pullCloudScreenshots(agent, ticket.id, reply);
      } catch (error) {
        console.error("could not download cloud screenshots", error);
      }
    }

    return reply;
  } catch (error) {
    if (error instanceof CursorAgentError) {
      return `I could not start a Cursor check: ${error.message}`;
    }
    throw error;
  } finally {
    await disposeAgent(agent);
  }
}
