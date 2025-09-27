FROM node:18-alpine

WORKDIR /app

# Install bash for wait-for-it script
RUN apk add --no-cache bash

# Copy wait-for-it script
COPY wait-for-it.sh /usr/local/bin/wait-for-it
RUN chmod +x /usr/local/bin/wait-for-it

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create directory for CSV data
RUN mkdir -p /data

# Expose port
EXPOSE 3011

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3011/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Start server after waiting for MySQL
CMD ["wait-for-it", "mysql:3306", "--timeout=60", "--", "npm", "start"]