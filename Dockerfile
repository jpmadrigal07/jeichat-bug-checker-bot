FROM oven/bun:1.3.10

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY src ./src

ENV NODE_ENV=production

# Cloud Cursor does the browser work. Do not install Playwright Chromium here.
CMD ["bun", "run", "src/index.js"]
