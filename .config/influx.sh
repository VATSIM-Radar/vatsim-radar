#!/bin/bash

# Change Telegraf config file env
envsubst < /etc/telegraf/telegraf.conf > /etc/telegraf_resolved.conf

# Run InfluxDB in background
influxd &

# Wait for InfluxDB to be available
until curl -s http://localhost:8086/health | grep -q '"status":"pass"'; do
  echo "Waiting for InfluxDB to be ready..."
  sleep 2
done

# Check for existing bucket "fast-vatsim-data"
if influx bucket list --org homelab | grep -q "fast-vatsim-data"; then
  echo "Bucket 'fast-vatsim-data' already exists. Skipping setup."
else
  echo "Bucket 'fast-vatsim-data' not found. Running setup..."
  # Configure InfluxDB
  influx setup --force \
      --bucket fast-vatsim-data \
      --org homelab \
      --token $INFLUX_TOKEN \
      --username $INFLUX_USER \
      --password $INFLUX_PASSWORD \
      --retention 24h

  # Create flight plan bucket
  influx bucket create \
      --name vatsim-fpln-data \
      --org homelab \
      --retention 24h \
      --token $INFLUX_TOKEN
fi
