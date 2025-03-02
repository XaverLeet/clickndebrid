# Build stage
FROM node:23-alpine as builder

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install most recent npm
RUN npm -g install npm

# Install dependencies
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/
COPY copy-public.js ./

# Build TypeScript code
RUN npm run build

# Production stage
FROM node:23-alpine

WORKDIR /usr/src/app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built JavaScript files from builder
COPY --from=builder /usr/src/app/dist ./dist

# Set user to non-root
USER node

# Start the application
CMD ["node", "dist/index.js"]
