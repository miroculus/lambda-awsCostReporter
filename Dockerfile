FROM node:8.10

ARG NPM_TOKEN={$NPM_TOKEN}

WORKDIR /src

COPY package*.json ./

RUN npm config set //registry.npmjs.org/:_authToken=$NPM_TOKEN
RUN npm install

COPY . ./