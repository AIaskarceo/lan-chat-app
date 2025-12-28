FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY server.js .
COPY .env .

EXPOSE 8000

CMD ["npm", "start"]
