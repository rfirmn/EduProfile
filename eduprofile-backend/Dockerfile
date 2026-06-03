# ===================================================
# EduProfile Backend — Dockerfile for Railway
# ===================================================

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency files first (for Docker layer caching)
COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for building)
RUN npm install

# Copy the rest of the source code
COPY . .

# Generate Prisma Client & Build NestJS
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm install --omit=dev

# Generate Prisma Client in production node_modules
RUN npx prisma generate

# Copy built output from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]
