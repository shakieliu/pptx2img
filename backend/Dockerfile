FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-core libreoffice-impress libreoffice-common \
    poppler-utils fonts-noto-cjk fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/package.json ./
RUN npm install --production
COPY backend/ .

EXPOSE 3001
CMD ["node", "server.js"]
