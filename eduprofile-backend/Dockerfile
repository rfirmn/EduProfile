FROM node:22-alpine

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install ALL dependencies (dev included, needed for nest build)
RUN npm install

# Copy all source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the NestJS app (creates /app/dist)
RUN npm run build

# Verify dist was created (will fail the build if not)
RUN ls dist/main.js

EXPOSE 3000

CMD ["node", "dist/main"]
