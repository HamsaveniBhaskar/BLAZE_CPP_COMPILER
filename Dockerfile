FROM node:16-slim

RUN apt-get update && apt-get install -y clang build-essential libc++-dev libc++abi-dev

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
