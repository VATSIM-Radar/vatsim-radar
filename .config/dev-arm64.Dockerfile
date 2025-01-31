FROM oven/bun:1.2.0
WORKDIR /radar

RUN apt-get update
RUN apt-get install -y default-mysql-client

COPY . /radar
