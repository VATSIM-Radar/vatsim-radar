FROM arm64v8/node:26-slim
WORKDIR /radar

RUN apt-get update
RUN apt-get install -y default-mysql-client git
RUN npm i -g yarn

ENV NODE_ENV=development
