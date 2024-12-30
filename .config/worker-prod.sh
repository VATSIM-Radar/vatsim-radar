#!/bin/sh

cd /radar
export $(grep -v '^#' /radar/.env | xargs)
exec node --import=tsx /radar/src/utils/backend/worker/data-worker.ts
