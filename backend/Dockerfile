# ---- build: compiles TypeScript to dist/
FROM node:22-alpine AS build
WORKDIR /app
# mongodb-memory-server (tests only) would download a MongoDB binary on install.
ENV MONGOMS_DISABLE_POSTINSTALL=1
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- runtime: production dependencies + compiled code only
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3333
# Configuration comes from the environment (docker-compose.yml), not from a .env file.
CMD ["node", "dist/server.js"]
