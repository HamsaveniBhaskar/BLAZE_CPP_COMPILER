#!/bin/bash
# Install dependencies for Python and Node.js
echo "Installing dependencies..."
apt-get update
apt-get install -y clang
# Install Node.js dependencies
npm install
npm install express cors http piscina

echo "Dependencies installed successfully."

# Run the server
echo "Starting the server..."
npm start
