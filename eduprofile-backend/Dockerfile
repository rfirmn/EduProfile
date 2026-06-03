FROM node:22-alpine

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Force install ALL dependencies (Railway sets NODE_ENV=production which skips dev)
RUN npm install --include=dev

# Copy all source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the NestJS app
RUN npx nest build

# Verify dist was created
RUN ls dist/main.js

# Now remove dev dependencies to slim down
RUN npm prune --omit=dev

EXPOSE 3000

CMD ["node", "dist/main"]
