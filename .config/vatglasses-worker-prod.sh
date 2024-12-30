#!/bin/sh

cd /radar
exec node --import=tsx /radar/src/utils/backend/worker/vatglasses-worker.ts
