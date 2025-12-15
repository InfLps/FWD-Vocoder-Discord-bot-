FROM node:20-slim

# Step 1: Install CRITICAL System Dependencies (FFmpeg & Build Tools)
RUN apt-get update && \
    apt-get install -y \
        ffmpeg \
        python3 \
        make \
        g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Step 2: Install Node Dependencies
# Copy both package files. We use npm ci for a fast, predictable build.
COPY package*.json ./
RUN npm ci --omit=dev

# Step 3: Copy Bot Source Code
COPY . .

# Step 4: Prepare Temp Directory (where output files are saved)
RUN mkdir -p temp

# Step 5: Start the Bot
CMD ["node", "index.js"]
