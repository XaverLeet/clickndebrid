FROM node:alpine

COPY ./ /usr/src/app
WORKDIR /usr/src/app
RUN npm install

CMD ["npm", "run", "start"]
