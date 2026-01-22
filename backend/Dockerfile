FROM node:20-alpine

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY src ./src

# Create data directory for SQLite
RUN mkdir -p /app/data

# Environment variables (override in docker-compose or at runtime)
ENV PORT=3001
ENV DB_PATH=/app/data/bookings.db

# Expose port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
