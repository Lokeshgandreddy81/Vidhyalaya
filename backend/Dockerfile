FROM node:20-slim

# Install system dependencies required by MongoDB binary and SSL
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libcurl4 \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
