# syntax=docker/dockerfile:1
# Build context = raiz do monorepo (ver docker-compose.yml).
# Monorepo npm workspaces; a API usa nest build e importa packages/shared por
# caminho relativo, então o build emite em apps/api/dist/apps/api/src/main.js.

FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Toolchain nativo para bcrypt/sharp
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Dependências primeiro (cache de layers)
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci

# Código-fonte e build da API
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN npm run build --workspace=apps/api

# Remove devDependencies para a imagem final
RUN npm prune --omit=dev

# ---------- Runtime ----------
FROM node:20-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN groupadd -r nuvita && useradd -r -g nuvita nuvita

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/package.json ./package.json

USER nuvita
EXPOSE 3000
CMD ["node", "apps/api/dist/apps/api/src/main.js"]
