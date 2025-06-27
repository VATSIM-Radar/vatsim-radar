#!/bin/sh

cd /radar
exec node --unhandled-rejections=warn-with-error-code --import=tsx /radar/src/utils/backend/worker/navigraph.ts
