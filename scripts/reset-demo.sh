#!/bin/bash

# ==============================================================================
# Pa11y Dashboard NextGen - Daily Demo Reset Script
# 
# This script is designed to clean up the demo environment by dropping the 
# MongoDB collections, wiping out generated screenshots, and seeding initial 
# data. It can be used for daily automated resets or manual resets.
#
# Usage:
#   ./scripts/reset-demo.sh [compose-file]
#
# Examples:
#   ./scripts/reset-demo.sh                          # Defaults to docker-compose.yml
#   ./scripts/reset-demo.sh docker-compose.oracle.yml # For production/Oracle VPS
# ==============================================================================

# 1. Determine which docker-compose file to use
COMPOSE_FILE=${1:-"docker-compose.yml"}

# 2. Determine service names (production uses 'app', dev uses 'api')
if [[ "$COMPOSE_FILE" == *"oracle"* ]]; then
    APP_SERVICE="app"
else
    APP_SERVICE="api"
fi

echo "Starting demo reset using $COMPOSE_FILE (Service: $APP_SERVICE) at $(date)"

# Go to the directory where this script is located, then up to the project root
cd "$(dirname "$0")/.." || exit 1

# Check if docker-compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "ERROR: File $COMPOSE_FILE not found."
    exit 1
fi

# 3. Clear the MongoDB Database
# We use the 'mongo' service which is common to both compose files
echo "Dropping MongoDB database..."
docker compose -f "$COMPOSE_FILE" exec -T mongo mongosh pa11y-dashboard --eval "db.dropDatabase()"

if [ $? -eq 0 ]; then
    echo "MongoDB database dropped successfully."
else
    echo "ERROR: Failed to drop MongoDB database."
    exit 1
fi

# 4. Clear the Screenshots Volume
echo "Clearing screenshot files..."
docker compose -f "$COMPOSE_FILE" exec -T "$APP_SERVICE" sh -c "rm -rf /app/server/screenshots/*"

if [ $? -eq 0 ]; then
    echo "Screenshots cleared successfully."
else
    echo "ERROR: Failed to clear screenshots (Service: $APP_SERVICE)."
    exit 1
fi

# 5. Seed initial data
echo "Seeding initial demo data..."
docker compose -f "$COMPOSE_FILE" exec -T mongo mongosh pa11y-dashboard <<EOF
  // 1. Create Categories
  const newsCat = db.categories.insertOne({ 
    name: "News", 
    icon: "Globe", 
    color: "#3b82f6",
    description: "General news and journalism sites"
  });
  
  const personalCat = db.categories.insertOne({ 
    name: "Personal", 
    icon: "User", 
    color: "#10b981",
    description: "Personal blogs and portfolios"
  });

  // 2. Create URLs
  const urls = [
    { name: "BBC", url: "https://www.bbc.co.uk", categoryId: newsCat.insertedId },
    { name: "The Times", url: "https://www.thetimes.com/", categoryId: newsCat.insertedId },
    { name: "Le Monde", url: "https://www.lemonde.fr/en/", categoryId: newsCat.insertedId },
    { name: "Tim Ferriss blog", url: "https://tim.blog/", categoryId: personalCat.insertedId },
    { name: "Matt Mullenberg", url: "https://ma.tt/", categoryId: personalCat.insertedId }
  ];

  urls.forEach(u => {
    db.urls.insertOne({
      ...u,
      schedule: "",
      standard: "WCAG22AA",
      status: "active",
      actions: [],
      lastIssueCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });
EOF

if [ $? -eq 0 ]; then
    echo "Demo data seeded successfully."
else
    echo "ERROR: Failed to seed demo data."
    exit 1
fi

# 6. Trigger initial scans via the API
echo "Triggering initial scans..."
docker compose -f "$COMPOSE_FILE" exec -T "$APP_SERVICE" sh -c "
  # We use wget or curl to call the internal API
  # The API endpoint is always localhost:3000 inside the container
  for id in \$(wget -qO- http://localhost:3000/api/urls | grep -o '\"_id\":\"[^\"]*\"' | cut -d'\"' -f4); do
    echo \"Triggering scan for \$id...\"
    wget -qO- --header='Content-Type: application/json' --post-data='{}' http://localhost:3000/api/urls/\$id/scan
  done
"

echo "Demo reset and seeding completed successfully at $(date)"
echo "---------------------------------------------------"
