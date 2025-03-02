FROM node:23-alpine

# Add basic development tools
RUN apk add --no-cache git sudo

# Ensure default `node` user has access to `sudo`
ARG USERNAME=node
RUN echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Set `DEVCONTAINER` environment variable to help with debugging
ENV DEVCONTAINER=true

WORKDIR /workspace

# Install global packages
RUN npm install -g typescript ts-node nodemon npm

# Set up workspace permissions
RUN mkdir -p /workspace/node_modules && \
    chown -R node:node /workspace

# Switch to node user
USER node

# This will be overridden by docker-compose command
CMD ["sleep", "infinity"]
