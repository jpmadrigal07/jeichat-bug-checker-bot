export function cursorAgentOptions() {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "CURSOR_API_KEY is missing. Create one at https://cursor.com/dashboard/integrations",
    );
  }

  const model = { id: process.env.CURSOR_MODEL?.trim() || "composer-2.5" };
  const repoUrl = process.env.CURSOR_REPO_URL?.trim();
  const runtime =
    process.env.CURSOR_RUNTIME?.trim() || (repoUrl ? "cloud" : "local");

  if (runtime === "cloud") {
    return {
      apiKey,
      model,
      cloud: {
        skipReviewerRequest: true,
        repos: repoUrl
          ? [
              {
                url: repoUrl,
                startingRef: process.env.CURSOR_REPO_REF?.trim() || "main",
              },
            ]
          : [],
      },
    };
  }

  const cwd = process.env.CURSOR_REPO_PATH?.trim() || process.cwd();
  return { apiKey, model, local: { cwd } };
}

export function isCloudAgent(options) {
  return Boolean(options?.cloud);
}

const MAX_REPLY = 3500;

export function truncateReply(text) {
  if (text.length <= MAX_REPLY) return text;
  return `${text.slice(0, MAX_REPLY)}\n\n_(truncated)_`;
}
