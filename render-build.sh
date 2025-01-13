#!/bin/bash
# Install dependencies
echo "Installing dependencies..."
apk add --no-cache clang

# Install Node.js dependencies
npm install

echo "Starting the server..."
npm start
