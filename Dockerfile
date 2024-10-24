FROM node:20-bookworm

WORKDIR /app

COPY package*.json ./

RUN npm install playwright@1.45.3 install --with-deps

RUN npx playwright install && \
    npx playwright install-deps

RUN npm install -g typescript

COPY . .

RUN tsc --project /app/tsconfig.json

EXPOSE 3000

CMD ["npm", "start"]
