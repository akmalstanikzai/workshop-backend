FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
USER node

EXPOSE 5000

CMD ["node", "src/server.js"]
