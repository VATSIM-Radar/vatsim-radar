FROM node:24-slim
WORKDIR /radar

RUN apt-get update
RUN apt-get install -y default-mysql-client git

ENV NODE_ENV=development
