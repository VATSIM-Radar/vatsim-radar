#!/bin/sh

yarn
npx prisma generate
npx prisma migrate deploy
rm -rf /tmp/nitro/worker-*
