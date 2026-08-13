FROM node:20-alpine

# Install Docker CLI so the compiler service can invoke 'docker run' via host Docker socket
RUN apk add --no-cache docker-cli

# Set working directory inside container
WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy microservice code
COPY . .

# Ensure temp execution directory exists
RUN mkdir -p temp

# Expose microservice port
EXPOSE 5001

# Start the Express server
CMD ["node", "server.js"]
