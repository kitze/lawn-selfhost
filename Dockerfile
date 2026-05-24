FROM oven/bun:1.2

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG VITE_CONVEX_URL=https://keen-chipmunk-797.convex.cloud
ARG VITE_CONVEX_SITE_URL=https://keen-chipmunk-797.convex.site
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL
ENV VITE_CONVEX_SITE_URL=$VITE_CONVEX_SITE_URL

RUN bun run build

EXPOSE 5296

CMD ["bunx", "vite", "preview", "--host", "0.0.0.0", "--port", "5296"]
