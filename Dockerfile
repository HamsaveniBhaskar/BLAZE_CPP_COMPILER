# Use the official Node.js image as the base
FROM node:16

# Install necessary dependencies including pm2 and clang
RUN apt-get update && apt-get install -y clang build-essential libc++-dev libc++abi-dev && npm install pm2 -g

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json into the container
COPY package.json package-lock.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 3000

# Start the server using pm2 with max instances based on CPU cores
CMD ["pm2", "start", "server.js", "-i", "max"]
