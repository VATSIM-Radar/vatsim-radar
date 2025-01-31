FROM oven/bun:1.2.0
WORKDIR /radar

COPY package.json package.json
COPY bun.lock bun.lock

RUN apt-get update
RUN apt-get install -y default-mysql-client

RUN bun install

COPY . /radar
RUN ls -la
RUN bunx prisma generate
RUN bun run build

EXPOSE 3000
CMD ["sh", "-c", "bunx prisma migrate deploy && export $(grep -v '^#' /radar/.env | xargs) && bun run /radar/.output/server/index.mjs"]
