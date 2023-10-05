FROM amazonlinux:2.0.20191217.0 as base

RUN yum install https://rpm.nodesource.com/pub_16.x/nodistro/repo/nodesource-release-nodistro-1.noarch.rpm -y && \
    yum install nodejs -y --setopt=nodesource-nodejs.module_hotfixes=1

RUN amazon-linux-extras install epel -y
RUN yum install clamav freshclam clamav-update clamav-daemon -y

WORKDIR /app

ENV NODE_ENV=production
COPY package*.json ./
RUN npm install

# build
COPY . .

RUN $HOME/.bun/bin/bun run build

EXPOSE 3000
CMD ["bun", "run", "start"]
