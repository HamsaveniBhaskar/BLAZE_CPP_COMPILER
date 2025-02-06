#!/bin/bash

# Install dependencies for C++ and Node.js
echo "Installing dependencies..."

# Install TCC
apt-get update
apt-get install -y tcc build-essential

# Install Node.js dependencies
npm install

echo "Dependencies installed successfully."

# Run the server
echo "Starting the server..."
npm start
