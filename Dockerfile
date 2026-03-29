# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Next.js on Alpine may require glibc compatibility for some native deps
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build static export
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Builds the static export into /app/out
RUN npm run build

# Stage 3: Serve static files with nginx
FROM nginx:1.27-alpine AS runner

WORKDIR /usr/share/nginx/html

RUN rm -rf /usr/share/nginx/html/*

COPY nginx/app.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/out ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
