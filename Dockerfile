# Apify's Node.js base image with Chromium (not needed here, but works fine)
FROM apify/actor-node:18

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source
COPY . ./

# Run the actor
CMD ["node", "src/main.js"]
