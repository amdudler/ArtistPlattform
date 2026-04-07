FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000

# Nötig damit Hot-Reload in Docker auf Windows funktioniert
ENV CHOKIDAR_USEPOLLING=true

CMD ["npm", "start"]
