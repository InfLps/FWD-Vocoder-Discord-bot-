FROM node:20-slim

# Install build tools for audio libraries
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Ensure temp directory exists
RUN mkdir -p temp

# Start the bot
CMD ["node", "index.js"]
