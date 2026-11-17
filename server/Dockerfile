FROM oven/bun:1

WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Copy application source
COPY . ./

EXPOSE 9000

# Build and start
RUN bun run build
CMD ["bun", "run", "start"]
