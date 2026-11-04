FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV PORT=5000
ENV DENO_INSTALL=/usr/local

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ffmpeg \
       curl \
       ca-certificates \
       python3 \
       unzip \
    && curl -fsSL https://deno.land/install.sh | sh \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /app/uploads \
    && chmod 755 /app/uploads

EXPOSE 5000

CMD ["npm", "start"]
