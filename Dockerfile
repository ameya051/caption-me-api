FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

COPY pnpm-lock.yaml ./

RUN npm install -g pnpm && \
    pnpm install

COPY . .

EXPOSE 8000

CMD [ "pnpm", "start" ]