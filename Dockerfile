# FROM node:22-slim AS builder
# WORKDIR /app
#
# RUN apt-get update && apt-get install -y openssl
#
# RUN corepack enable && corepack prepare yarn@3.7.0 --activate
#
# COPY package.json yarn.lock ./
# COPY .yarn .yarn
# COPY .yarnrc.yml ./
# # Install all dependencies including devDependencies
# RUN for i in 1 2 3; do yarn install --immutable --production && break || sleep 5; done
# # RUN yarn install --frozen-lockfile
#
#
# # create prisma directory and copy schema
# RUN mkdir -p /app/prisma
# COPY prisma/schema.prisma /app/prisma/schema.prisma
#
# RUN yarn prisma generate
#
# COPY . .
#
# # Build the application
# RUN yarn build
#
# FROM node:22-slim
# WORKDIR /app
#
# RUN apt-get update && apt-get install -y openssl && \
#     rm -rf /var/lib/apt/lists/*
#
# RUN corepack enable && corepack prepare yarn@3.7.0 --activate
#
# # Copy package files
# COPY package.json yarn.lock ./
# COPY prisma ./prisma
# # Install only production dependencies
# # RUN yarn install --frozen-lockfile --production
# RUN for i in 1 2 3; do yarn install --immutable --production && break || sleep 5; done
#
#
# # Copy built files from builder
# COPY --from=builder /app ./
# COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
#
#
# # Set the command to run the application
# CMD ["yarn", "start:prod"]

# for yarn 1 version 

FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY prisma ./prisma
RUN yarn prisma generate

COPY . .
RUN yarn build

# ---- runtime ----
FROM node:22-slim
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000
CMD ["yarn", "start:prod"]
