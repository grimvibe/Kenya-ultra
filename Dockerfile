FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache ffmpeg

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

CMD ["npm","start"]
