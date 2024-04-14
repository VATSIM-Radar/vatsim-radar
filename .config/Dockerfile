FROM node:20.12.2
WORKDIR /frontend

COPY package.json package.json
COPY yarn.lock yarn.lock
COPY .yarn /frontend/.yarn/
COPY .yarnrc.yml .yarnrc.yml

RUN yarn

COPY . /frontend
RUN yarn build

EXPOSE 3000
CMD ["node", "/frontend/.output/server/index.mjs"]
