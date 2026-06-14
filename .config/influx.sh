#!/bin/bash
set -e

DATA_DIR="${INFLUXDB3_DB_DIR:-/tmp/influxdb3/data}"
TOKEN_FILE="${INFLUXDB3_ADMIN_TOKEN_FILE:-/tmp/influxdb3/admin-token.json}"
HTTP_BIND="${INFLUXDB3_HTTP_BIND_ADDR:-0.0.0.0:8181}"
HTTP_URL="http://localhost:${HTTP_BIND##*:}"
RETENTION_PERIOD="${INFLUX_RETENTION_PERIOD:-24h}"
NODE_ID="${INFLUXDB3_NODE_IDENTIFIER_PREFIX:-influx-v3}"

if [ -z "$INFLUX_TOKEN" ]; then
  echo "INFLUX_TOKEN is required to start InfluxDB 3."
  exit 1
fi

case "$INFLUX_TOKEN" in
  apiv3_*) ;;
  *)
    echo "INFLUX_TOKEN must be an InfluxDB 3 admin token that starts with 'apiv3_'."
    exit 1
    ;;
esac

mkdir -p "$DATA_DIR" "$(dirname "$TOKEN_FILE")"

if [ ! -f "$TOKEN_FILE" ] || ! grep -q "\"token\":\"apiv3_" "$TOKEN_FILE"; then
  printf '{"token":"%s","name":"radar-admin-token"}\n' "$INFLUX_TOKEN" > "$TOKEN_FILE"
fi

influxdb3 serve \
  --node-id "$NODE_ID" \
  --object-store file \
  --data-dir "$DATA_DIR" \
  --http-bind "$HTTP_BIND" \
  --admin-token-file "$TOKEN_FILE" \
  --log-filter error &

INFLUX_PID="$!"

cleanup() {
  kill "$INFLUX_PID" || true
  wait "$INFLUX_PID" || true
}
trap cleanup TERM INT

until influxdb3 show databases --host "$HTTP_URL" > /dev/null 2>&1; do
  echo "Waiting for InfluxDB 3 to be ready..."
  sleep 2
done

export INFLUXDB3_AUTH_TOKEN="$INFLUX_TOKEN"

for database in "$INFLUX_BUCKET_MAIN" "$INFLUX_BUCKET_PLANS"; do
  if [ -z "$database" ]; then
    continue
  fi

  if influxdb3 show databases --host "$HTTP_URL" | grep -Fq "$database"; then
    echo "Database '$database' already exists. Skipping setup."
  else
    echo "Database '$database' not found. Creating..."
    influxdb3 create database \
      --host "$HTTP_URL" \
      --retention-period "$RETENTION_PERIOD" \
      "$database"
  fi
done

wait "$INFLUX_PID"
