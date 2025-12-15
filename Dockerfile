FROM node:20-slim

# Install system dependencies in one layer for optimal Docker build cache:
# 1. FFmpeg: CRITICAL for audio-decode to process MP3/FLAC/OGG files.
# 2. python3/make/g++: Needed to compile any native Node.js modules 
#    (e.g., packages related to audio or database if you add them later).
RUN apt-get update && \
    apt-get install -y \
        ffmpeg \
        python3 \
        make \
        g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package*.json ./
# Using npm ci is faster and ensures deterministic installs
RUN npm ci --omit=dev

# Copy source
COPY . .

# Ensure temp directory exists (You can also do this in index.js, but this is fine)
RUN mkdir -p temp

# Start the bot
CMD ["node", "index.js"]
