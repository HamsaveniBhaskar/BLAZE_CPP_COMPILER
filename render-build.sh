#!/bin/bash

# Install dependencies for C++ and Node.js
echo "Installing dependencies..."

# Install Intel C++ Compiler (ICX)
apt-get update
wget -qO - https://apt.repos.intel.com/setup/intel-setup.sh | bash
apt-get install -y intel-oneapi-compiler-dpcpp-cpp build-essential

# Install Node.js dependencies
npm install

echo "Dependencies installed successfully."

# Run the server
echo "Starting the server..."
npm start
