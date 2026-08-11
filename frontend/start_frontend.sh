#!/bin/bash
# start_frontend.sh - Script to setup and run the DICE Frontend on Linux

# Stop on first error
set -e

echo "=========================================="
echo "    Starting Setup for DICE Frontend"
echo "=========================================="

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is required but not installed. Please install Node.js (v18+ recommended)."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is required but not installed."
    exit 1
fi

echo "Installing dependencies..."
npm install

echo "Building Next.js application..."
npm run build

echo "=========================================="
echo "    Starting Frontend Server"
echo "=========================================="
# Runs the production server on port 3000 (bind to 0.0.0.0)
npx next start -H 0.0.0.0 -p 3000
