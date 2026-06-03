FROM node:22-alpine

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Force install ALL dependencies
RUN npm install --include=dev

# Show what was installed (debug)
RUN echo "=== Checking nest CLI ===" && npx nest --version

# Copy all source code
COPY . .

# Show files copied (debug)
RUN echo "=== Source files ===" && ls -la src/

# Generate Prisma Client
RUN npx prisma generate

# Build the NestJS app — show ALL output including errors
RUN echo "=== Building NestJS ===" && npx nest build 2>&1 || (echo "BUILD FAILED - trying tsc directly" && npx tsc -p tsconfig.build.json 2>&1; echo "=== Listing all files ===" && find . -name "main.js" 2>/dev/null; exit 1)

# Verify dist was created
RUN ls -la dist/

EXPOSE 3000

CMD ["node", "dist/main"]
