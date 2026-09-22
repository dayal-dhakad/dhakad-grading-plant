FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/desktop/package.json apps/desktop/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/shared packages/shared
COPY apps/frontend apps/frontend

RUN npm ci --ignore-scripts \
  && npm run build -w @dhakad/shared \
  && npm run build -w @dhakad/frontend

FROM nginx:1.28-alpine AS production
COPY infrastructure/nginx/frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 8080
