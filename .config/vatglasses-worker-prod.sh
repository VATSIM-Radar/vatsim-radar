#!/bin/sh

cd /radar
exec node --env-file=/radar/.env --import=tsx /radar/src/utils/backend/worker/vatglasses-worker.ts