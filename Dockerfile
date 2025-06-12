FROM node:22.15.0-bullseye

# Install dependencies and oh-my-zsh
RUN apt-get update && apt-get install -y zsh curl git && \
    sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" && \
    echo "export ZSH=/root/.oh-my-zsh" >> /etc/zsh/zshenv && \
    chsh -s /bin/zsh && \
    echo "export NODE_ENV=production" >> /etc/zsh/zshenv

SHELL ["/bin/zsh", "-c"]

WORKDIR /app

ENV NODE_ENV=production
ENV PATH="./node_modules/.bin:$PATH"

RUN npm i -g npm@latest typescript ts-node @sapphire/cli

COPY package.json package-lock.json ./ 

RUN npm install

COPY . .

# Clean up unnecessary files (but keep any needed assets)
###RUN find src -type f -name "*.ts" -delete && \
###    rm -rf .gitignore .vscode tsconfig.json

# Expose the dashboard port
###EXPOSE 8080

# Start the bot in production mode
###CMD ["npm", "run start"]

# Keep tail running to keep container alive by default
CMD ["npm", "run", "deploy"]
