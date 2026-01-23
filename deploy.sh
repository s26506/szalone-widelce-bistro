#!/bin/bash
echo "Backing up data..."
cp -r data data_backup

echo "Pulling changes..."
git pull

echo "Restoring data..."
# Ensure data dir exists
mkdir -p data
# Restore backup, overwriting any git-pulled empty files or restoring deleted ones
cp -r data_backup/* data/
rm -rf data_backup

npm install
npm run build
pm2 restart bistro
