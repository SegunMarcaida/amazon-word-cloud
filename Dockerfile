FROM node:22
WORKDIR /app
# Copy only package.json and package-lock.json first
COPY package*.json ./

RUN npm install

RUN npm install -g nodemon

COPY . .

EXPOSE 8080

CMD ["nodemon", "src/main.js"]