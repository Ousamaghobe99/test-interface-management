# --- Build Stage ---
FROM node:20-alpine AS builder

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies (only if package*.json changes)
RUN npm install

# Copy the rest of your application code
COPY . .

# Generate Prisma Client (this needs your prisma schema and dependencies)
# Ensure `openssl` is installed if you encounter issues during `prisma generate` on alpine
RUN apk add --no-cache openssl
RUN npx prisma generate

# If you have a build step (e.g., TypeScript compilation), add it here
# RUN npm run build # Uncomment if you use TypeScript and have a build script

# --- Production Stage ---
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy only necessary files from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/index.js ./index.js # Assuming your main entry file is index.js or similar
COPY --from=builder /app/package.json ./package.json
# If you had a build step, copy the compiled output, e.g.:
# COPY --from=builder /app/dist ./dist

# Expose the port your Node.js app listens on (e.g., 5000 from your .env)
EXPOSE 5000

# Command to run your application
# This CMD will be overridden by docker-compose for migrations in dev,
# but is good as a default for other scenarios
CMD ["node", "src/index.js"] # Adjust to your main entry file