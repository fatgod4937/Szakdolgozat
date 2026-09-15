FROM node:22-alpine AS build

WORKDIR /app

COPY api/package.json api/package-lock.json ./
RUN npm ci

COPY api/ ./
RUN npm run build && test -f dist/src/main.js

FROM node:22-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY web/public/images/logo.png ./assets/logo.png

EXPOSE 3000

CMD ["node", "dist/src/main"]