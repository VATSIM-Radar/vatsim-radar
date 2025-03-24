FROM node:22
WORKDIR /radar

RUN apt-get update
RUN apt-get install -y default-mysql-client

ENV NODE_ENV=development

COPY . /radar
