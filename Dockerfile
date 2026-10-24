FROM node:25-slim

WORKDIR /app
COPY . .
RUN npm ci && npm run build -w @covenant-desk/web

ENV NODE_ENV=production
ENV WEB_DIST_DIR=apps/web/dist

# Reseeds the demo data on every start, then serves the API and the web app on $PORT.
CMD ["npm", "start"]
