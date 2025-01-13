#!/bin/bash
# Install dependencies for Python and Node.js
echo "Installing dependencies..."
apt-get update
apt-get install -y clang
# Install Node.js dependencies
npm install

# Install pm2 to manage the server process
npm install -g pm2

echo "Dependencies installed successfully."

# Run the server with pm2 using maximum instances based on CPU cores
echo "Starting the server with pm2..."
pm2 start server.js -i max
