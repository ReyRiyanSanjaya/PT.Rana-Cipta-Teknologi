# Dockerfile untuk Rana Server — Fly.io
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies & generate Prisma client
RUN npm ci --only=production
RUN npx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "src/index.js"]
