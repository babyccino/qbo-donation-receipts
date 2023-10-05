# vercel's image according to their docs
FROM amazonlinux:2.0.20191217.0 as base

RUN yum install https://rpm.nodesource.com/pub_16.x/nodistro/repo/nodesource-release-nodistro-1.noarch.rpm -y && \
    yum install nodejs -y --setopt=nodesource-nodejs.module_hotfixes=1

WORKDIR /app

COPY package*.json ./

RUN npm install
COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
