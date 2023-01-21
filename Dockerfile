# syntax=docker/dockerfile:1
FROM node:18-alpine
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
COPY ./ ./
RUN npm i
RUN  chown -R node:node app/node_modules
CMD ["npm", "run", "start"]
EXPOSE 3001