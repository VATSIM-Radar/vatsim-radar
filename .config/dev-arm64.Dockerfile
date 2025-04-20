FROM arm64v8/node:22-slim
WORKDIR /radar

RUN apt-get update
RUN apt-get install -y default-mysql-client git

ENV NODE_ENV=development
