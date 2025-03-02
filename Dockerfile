# Build stage
FROM node:20-alpine as builder

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and config files
COPY tsconfig.json ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY src/ ./src/
COPY scripts/ ./scripts/

# Build TypeScript code
RUN npm run build

# Production stage
FROM node:20-alpine

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
