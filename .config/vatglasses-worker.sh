#!/bin/sh

cd /radar
npx prisma generate
npx prisma migrate deploy
exec node --import=tsx /radar/src/utils/backend/worker/vatglasses-worker.ts
