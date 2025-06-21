FROM node:22-slim as build
WORKDIR /app
COPY package*.json yarn.lock ./ 
RUN yarn install --frozen-lockfile --production && yarn cache clean
COPY . . 

FROM node:22-slim 
WORKDIR /app 
COPY --from=build /app ./ 
CMD ["yarn", "start:dev"]
