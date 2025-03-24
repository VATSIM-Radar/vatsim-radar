#!/bin/sh

cd /radar
npx prisma generate
npx prisma migrate deploy
exec node --unhandled-rejections=warn-with-error-code --import=tsx /radar/src/utils/backend/worker/data-worker.ts
