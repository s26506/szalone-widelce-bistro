#!/bin/bash

# Stop on any error
set -e

echo "🚀 Starting deployment..."

# 1. Pull latest changes
echo "📥 Pulling from Git..."
git pull

# 2. Install dependencies (only if needed)
echo "📦 Installing dependencies..."
npm install --omit=dev

# 3. Build frontend
echo "🏗️  Building frontend..."
npm run build

# 4. Restart server
echo "🔄 Restarting application..."
# We use --update-env to make sure any new env vars are picked up
# Ensure PORT is set if defined in environment, otherwise default to 20158 in ecosystem or use inline
# We assume the process is already running as 'bistro'. If not, this might fail first time, but 'restart' usually works if it exists.
pm2 restart bistro --update-env || PORT=20158 pm2 start server.js --name "bistro"

echo "✅ Deployment complete!"
