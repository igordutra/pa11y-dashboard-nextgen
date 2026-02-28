#!/bin/bash

# ==============================================================================
# Pa11y Dashboard NextGen - Daily Demo Reset Script
# 
# This script is designed to be run as a cron job on the host machine to 
# clean up the live demo environment every night. It drops the MongoDB 
# collections and wipes out generated screenshots to prevent storage exhaustion.
#
# Usage:
#   1. chmod +x reset-demo.sh
#   2. Add to crontab (e.g., run at 2 AM every day):
#      0 2 * * * /path/to/pa11y-dashboard-nextgen/scripts/reset-demo.sh >> /var/log/pa11y-reset.log 2>&1
# ==============================================================================

echo "Starting daily demo reset at $(date)"

# Go to the directory where this script is located, then up to the project root
cd "$(dirname "$0")/.." || exit 1

# 1. Clear the MongoDB Database
# We execute a mongo shell command directly against the running 'mongo' container.
# This drops the entire 'pa11y-dashboard' database.
echo "Dropping MongoDB database..."
docker compose -f docker-compose.oracle.yml exec -T mongo mongosh pa11y-dashboard --eval "db.dropDatabase()"

if [ $? -eq 0 ]; then
    echo "MongoDB database dropped successfully."
else
    echo "ERROR: Failed to drop MongoDB database."
    exit 1
fi

# 2. Clear the Screenshots Volume
# Instead of deleting the volume (which requires bringing down the containers),
# we execute an 'rm' command inside the running 'app' container to clear the directory contents.
echo "Clearing screenshot files..."
docker compose -f docker-compose.oracle.yml exec -T app sh -c "rm -rf /app/server/screenshots/*"

if [ $? -eq 0 ]; then
    echo "Screenshots cleared successfully."
else
    echo "ERROR: Failed to clear screenshots."
    exit 1
fi

echo "Demo reset completed successfully at $(date)"
echo "---------------------------------------------------"