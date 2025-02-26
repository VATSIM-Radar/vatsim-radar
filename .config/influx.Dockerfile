FROM influxdb:2.7

RUN apt-get update && \
    apt-get install -y wget gnupg software-properties-common gettext && \
    wget -qO- https://repos.influxdata.com/influxdata-archive_compat.key | apt-key add - && \
    echo "deb https://repos.influxdata.com/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/influxdb.list && \
    rm -rf /var/lib/apt/lists/*

COPY ./.env /.env
COPY .config/influx.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 8086

ENTRYPOINT ["sh", "-c", "export $(grep -v '^#' /.env | xargs) && /entrypoint.sh"]
