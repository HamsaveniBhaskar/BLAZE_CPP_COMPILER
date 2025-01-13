# Use a lightweight Node.js image with Alpine
FROM node:16-alpine

# Install necessary tools
RUN apk add --no-cache clang build-base libcxx libcxxabi

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the application code
COPY . .

# Expose the application port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
