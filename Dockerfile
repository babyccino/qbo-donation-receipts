FROM oven/bun:1.0.4

COPY package.json ./
COPY bun.lockb ./
RUN bun install && bun run patch

COPY . .
RUN bun run build

EXPOSE 3000

CMD ["bun", "run", "start"]
