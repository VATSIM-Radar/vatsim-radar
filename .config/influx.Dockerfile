FROM influxdb:3-core

RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

COPY ./.env /.env
COPY .config/influx.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 8181

ENTRYPOINT ["sh", "-c", "export $(grep -v '^#' /.env | xargs) && /entrypoint.sh"]
