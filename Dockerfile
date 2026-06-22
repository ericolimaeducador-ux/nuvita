# syntax=docker/dockerfile:1
# Dockerfile na RAIZ do monorepo — usado pelo Cloud Run (gcloud run deploy --source .).
# Espelha apps/api/Dockerfile (que é usado pelo docker-compose). Mantê-los iguais.
# Cloud Run injeta a env PORT (8080); o app escuta em process.env.PORT.

FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci

COPY apps/api apps/api
COPY packages/shared packages/shared
RUN npm run build --workspace=apps/api

RUN npm prune --omit=dev

# ---------- Runtime ----------
FROM node:20-bookworm-slim AS runner
# NODE_ENV controla a fonte de config: 'production'/'staging' => GCP Secret Manager;
# qualquer outro valor => variáveis de ambiente. Para o demo, defina NODE_ENV=development
# no serviço Cloud Run (via --env-vars-file) e injete os segredos como env vars.
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
