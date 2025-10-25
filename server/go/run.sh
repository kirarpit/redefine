#!/bin/bash

# Ensure the script exits if any command fails
set -e

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating default .env file"
  cat > .env << EOF
# Database configuration
DB_PATH=./redefine.db

# Server configuration
PORT=5000
GIN_MODE=debug

# Encryption configuration - CHANGE THIS IN PRODUCTION!
SALT_KEY=redefine-default-salt-key
EOF
fi

# Check if Go is installed
if ! command -v go &> /dev/null; then
  echo "Go is not installed. Please install Go first."
  exit 1
fi

# Install dependencies
echo "Installing dependencies..."
go mod tidy

# Run the server
echo "Starting Redefine Go server..."
go run main.go 
