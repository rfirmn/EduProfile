FROM node:22-alpine

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Force install ALL dependencies (including devDependencies required for build)
RUN npm install --include=dev

# Copy all source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the NestJS app (creates /app/dist)
RUN npx nest build

# Now remove dev dependencies to slim down the image
RUN npm prune --omit=dev

EXPOSE 3000

CMD ["node", "dist/main"]
