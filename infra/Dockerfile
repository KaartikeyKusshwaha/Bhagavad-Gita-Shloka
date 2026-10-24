FROM node:22-bookworm-slim
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3100
EXPOSE 3100
CMD ["pnpm", "start"]
