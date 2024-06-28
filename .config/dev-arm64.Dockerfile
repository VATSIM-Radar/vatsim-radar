FROM arm64v8/node:22
WORKDIR /radar

RUN apt-get update
RUN apt-get install -y default-mysql-client

COPY . /radar
