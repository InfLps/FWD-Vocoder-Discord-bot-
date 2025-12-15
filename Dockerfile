FROM node:20-slim

ENV NODE_ENV=production

RUN apt-get update && \
    apt-get install -y \
        ffmpeg \
        python3 \
        make \
        g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p temp

CMD ["node", "index.js"]
