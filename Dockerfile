FROM amazonlinux:2.0.20191217.0 as base

RUN amazon-linux-extras install epel -y
RUN yum install clamav freshclam clamav-update unzip -y
RUN curl -fsSL https://bun.sh/install | bash
RUN echo $PATH
RUN echo -e 'export BUN_INSTALL="$HOME/.bun"\nexport PATH=$BUN_INSTALL/bin:$PATH' >> ~/.bashrc

WORKDIR /app

COPY package.json bun.lockb ./
# ENV PATH = "$PATH:$HOME/.bun/bin"
RUN $HOME/.bun/bin/bun install
# RUN $HOME/.bun/bin/bun install

COPY . .

RUN $HOME/.bun/bin/bun run build

EXPOSE 3000
CMD ["bun", "run", "start"]
