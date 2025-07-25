#!/bin/sh

cd /radar
exec node --unhandled-rejections=warn-with-error-code --env-file=/radar/.env --import=tsx /radar/app/utils/backend/worker/data-worker.ts
