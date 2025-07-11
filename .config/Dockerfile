FROM node:24-slim
WORKDIR /radar

COPY package.json package.json
COPY yarn.lock yarn.lock
COPY .yarn /radar/.yarn/
COPY .yarnrc.yml .yarnrc.yml

ENV NODE_ENV=production

RUN apt-get update
RUN apt-get install -y default-mysql-client git

RUN yarn

COPY . /radar
RUN ls -la
RUN npx prisma generate
RUN yarn build

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && export $(grep -v '^#' /radar/.env | xargs) && node /radar/.output/server/index.mjs"]
