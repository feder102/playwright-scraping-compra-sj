FROM mcr.microsoft.com/playwright:v1.58.2-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy scripts
COPY *.js ./
