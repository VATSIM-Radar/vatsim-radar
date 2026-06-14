FROM influxdb:3-core

COPY ./.env /.env
COPY --chmod=755 .config/influx.sh /entrypoint.sh

EXPOSE 8181

ENTRYPOINT ["sh", "-c", "export $(grep -v '^#' /.env | xargs) && /entrypoint.sh"]
