# Use Node.js image based on Ubuntu
FROM node:16

# Install necessary tools
RUN apt-get update && apt-get install -y clang build-essential libc++-dev libc++abi-dev

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
