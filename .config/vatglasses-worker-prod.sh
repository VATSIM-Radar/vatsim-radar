#!/bin/sh

cd /radar
exec node --unhandled-rejections=warn-with-error-code --env-file=/radar/.env --import=tsx /radar/src/utils/backend/worker/vatglasses-worker.ts
