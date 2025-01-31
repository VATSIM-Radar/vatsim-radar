#!/bin/sh

cd /radar
bunx prisma generate
bunx prisma migrate deploy
exec node --import=tsx /radar/src/utils/backend/worker/vatglasses-worker.ts
