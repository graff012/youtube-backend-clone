FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl

COPY package.json yarn.lock ./
# Install all dependencies including devDependencies
RUN yarn install --frozen-lockfile

# create prisma directory and copy schema
RUN mkdir -p /app/prisma
COPY prisma/schema.prisma /app/prisma/schema.prisma

RUN ls -la /app/prisma/
RUN npx prisma generate

COPY . .
# Build the application
RUN yarn build

RUN ls -la /app/dist/
RUN find /app/dist -type f

FROM node:22-slim
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json yarn.lock ./
COPY prisma ./prisma
# Install only production dependencies
RUN yarn install --frozen-lockfile --production

# Copy built files from builder
COPY --from=builder /app ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN ls -la /app/dist/
RUN find /app/dist -type f

# Set the command to run the application
CMD ["node", "dist/main.js"]
