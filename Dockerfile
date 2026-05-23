# Stage 1: Builder
FROM node:20-slim AS builder

WORKDIR /app

# Install system dependencies required by node-canvas during install/build
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    libpango1.0-dev \
    libcairo2-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    pixman-1-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package configurations
COPY package.json package-lock.json* ./
COPY packages/circular-id-codec/package.json ./packages/circular-id-codec/
COPY apps/web/package.json ./apps/web/

# Install dependencies (workspaces layout)
RUN npm ci --no-audit

# Copy source code
COPY tsconfig.base.json ./
COPY packages/circular-id-codec/ ./packages/circular-id-codec/
COPY apps/web/ ./apps/web/

# Build codec package first
RUN npm run build -w packages/circular-id-codec

# Build Next.js application
RUN npm run build -w apps/web

# Stage 2: Runner
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install runtime system libraries required by node-canvas
RUN apt-get update && apt-get install -y \
    libcairo2 \
    libjpeg62-turbo \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgif7 \
    librsvg2-2 \
    pixman-1-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy required resources from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/circular-id-codec/dist ./packages/circular-id-codec/dist
COPY --from=builder /app/packages/circular-id-codec/package.json ./packages/circular-id-codec/package.json
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json

EXPOSE 3000

# Run Next.js production server
CMD ["npm", "run", "dev", "-w", "apps/web"]
