FROM node:12

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

# COPY ../webapp/vue-js-client-crud/dist/ public

EXPOSE 9001 

ADD start.sh /
RUN chmod +x /start.sh
CMD ["/start.sh"]

