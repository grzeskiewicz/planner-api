# syntax=docker/dockerfile:1
FROM node:18-alpine
WORKDIR /planner-api
COPY package.json ./
COPY package-lock.json ./
COPY ./ ./
RUN npm i
RUN  chown -R node:node /planner-api/node_modules
CMD ["npm", "run", "start"]
EXPOSE 3001