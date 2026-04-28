# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Use a dedicated working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy package manifests and lockfile for reproducible installs
COPY package*.json ./
COPY package-lock.json* ./

# Install only production dependencies
RUN npm ci --only=production

# Copy application source
COPY . .

# Remove dev files if any (safe-guard)
RUN rm -rf ./.npmignore || true

# Expose application port
EXPOSE 5000

# Default command
CMD ["node", "index.js"]