#!/bin/sh

# Disable yarn telemetry
yarn config set --home enableTelemetry 0

yarn
npx prisma generate
npx prisma migrate deploy
rm -rf /tmp/nitro/worker-*
