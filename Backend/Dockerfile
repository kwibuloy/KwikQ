FROM node:22-alpine

WORKDIR /app

# tsx (a devDependency) runs the TypeScript at startup, so dev deps are installed.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
EXPOSE 5000
USER node

# Run node directly (not via npm) so SIGTERM reaches the app for a clean shutdown.
CMD ["node", "--import", "tsx", "src/server.ts"]
