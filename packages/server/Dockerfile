ARG NODE_IMAGE=node:22-alpine
FROM ${NODE_IMAGE} AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
RUN npm install --workspace=@record/server --include-workspace-root

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server
RUN npm run build -w @record/shared
WORKDIR /app/packages/server
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app/packages/server
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages/shared /app/packages/shared
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/server/prisma ./prisma
COPY --from=builder /app/packages/server/package.json ./
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy || npx prisma db push; node dist/index.js"]
