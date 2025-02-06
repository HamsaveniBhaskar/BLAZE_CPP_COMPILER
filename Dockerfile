# Use the official Node.js image as the base
FROM node:16

# Install required dependencies
RUN apt-get update && apt-get install -y build-essential wget gnupg

# Add Intel OneAPI repository and install Intel C++ Compiler
RUN wget -qO - https://apt.repos.intel.com/setup/intel-setup.sh | bash && \
    apt-get update && \
    apt-get install -y intel-oneapi-compiler-dpcpp-cpp intel-oneapi-runtime-cpp

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json into the container
COPY package.json package-lock.json ./

# Install dependencies using npm
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
