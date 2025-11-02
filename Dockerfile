# Production Dockerfile for SketchWave
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install only production dependencies first (faster builds)
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --only=production

# Copy rest of the application
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
