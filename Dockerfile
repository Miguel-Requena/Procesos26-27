FROM node:24-bookworm-slim
WORKDIR /app
COPY servidor/package.json servidor/package-lock.json ./servidor/
RUN npm ci --prefix servidor --omit=dev
COPY --chown=node:node servidor ./servidor
COPY --chown=node:node cliente ./cliente
ENV NODE_ENV=production
USER node
EXPOSE 8080
CMD ["npm", "start", "--prefix", "servidor"]
