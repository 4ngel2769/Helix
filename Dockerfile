# Use the specified Node.js version
FROM node:22.15.0-bullseye

# Install zsh and set as default shell
RUN apt-get update && \
    apt-get install -y \
    zsh \
    curl \
    git \
    && \
    sh -c "$(curl -fsSL https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh)" && \
    echo "export ZSH=/root/.oh-my-zsh" >> /etc/zsh/zshenv && \
    chsh -s /bin/zsh && \
    echo "export NODE_ENV=production" >> /etc/zsh/zshenv

# Set default shell for container operations
SHELL ["/bin/zsh", "-c"]

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

RUN npm i -g npm@latest
RUN npm -v && node -v

# Install specific yarn version globally
RUN npm install -g yarn@berry

# Copy package files first for better layer caching
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy application source
COPY . .

# Build application
RUN yarn build:both

# Clean up unnecessary files (but keep any needed assets)
RUN find src -type f -name "*.ts" -delete && \
    rm -rf .gitignore .vscode tsconfig.json

# Expose the dashboard port
EXPOSE 8080

# Start the bot in production mode
CMD ["yarn", "start"]