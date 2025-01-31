#!/bin/sh

cd /radar
bun install
bunx prisma generate
bunx prisma migrate deploy
rm -rf /tmp/nitro/worker-*
exec bun run dev --qr=false
