FROM node:20-slim AS build
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install all dependencies (including dev for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy package files
COPY package.json package-lock.json ./

# Install production deps + drizzle-kit for migrations
RUN npm ci --omit=dev && \
    npm install drizzle-kit && \
    npm cache clean --force

# Copy built application
COPY --from=build /app/dist ./dist

# Copy files needed for drizzle migrations
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/shared ./shared
COPY --from=build /app/node_modules/drizzle-kit ./node_modules/drizzle-kit

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node
EXPOSE 5000
CMD ["node", "dist/index.cjs"]
