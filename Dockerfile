FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Install dependencies including devDeps needed for build
RUN npm ci

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the Next.js app
# Disabling telemetry
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Make sure the data directory exists
RUN mkdir -p /app/prisma/data

EXPOSE 3000

# Run db push then start the app
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm start"]
