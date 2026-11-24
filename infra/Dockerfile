FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY App ./App
COPY tsconfig.json vite.config.ts ./
COPY infra/build.js ./infra/build.js
RUN pnpm run build:server && pnpm prune --prod

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY App/backend/db ./App/backend/db
COPY App/backend/tools ./App/backend/tools
COPY App/shared ./App/shared
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
  CMD node App/backend/tools/healthcheck.js
CMD ["node", "dist/node/backend/server.js"]
