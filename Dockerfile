FROM node:20-slim AS build

WORKDIR /app

# Instalar dependencias del sistema necesarias para compilacion nativa
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci

COPY . .
RUN npm run build

FROM node:20-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Copiar package files
COPY package.json package-lock.json ./

# Copiar node_modules completos desde el build stage (incluye drizzle-kit)
COPY --from=build /app/node_modules ./node_modules

# Copiar archivos de la aplicacion
COPY --from=build /app/dist ./dist
COPY --from=build /app/shared ./shared
COPY --from=build /app/drizzle.config.ts ./

RUN mkdir -p /app/uploads

EXPOSE 5000

CMD ["npm", "start"]
