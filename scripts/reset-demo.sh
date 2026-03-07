#!/bin/bash

# ==============================================================================
# Pa11y Dashboard NextGen - Daily Demo Reset Script
# 
# This script is designed to be run as a cron job on the host machine to 
# clean up the live demo environment every night. It drops the MongoDB 
# collections and wipes out generated screenshots to prevent storage exhaustion.
# ==============================================================================

echo "Starting daily demo reset at $(date)"

# Go to the directory where this script is located, then up to the project root
cd "$(dirname "$0")/.." || exit 1

# 1. Clear the MongoDB Database
echo "Dropping MongoDB database..."
docker compose -f docker-compose.oracle.yml exec -T mongo mongosh pa11y-dashboard --eval "db.dropDatabase()"

if [ $? -eq 0 ]; then
    echo "MongoDB database dropped successfully."
else
    echo "ERROR: Failed to drop MongoDB database."
    exit 1
fi

# 2. Clear the Screenshots Volume
echo "Clearing screenshot files..."
docker compose -f docker-compose.oracle.yml exec -T app sh -c "rm -rf /app/server/screenshots/*"

if [ $? -eq 0 ]; then
    echo "Screenshots cleared successfully."
else
    echo "ERROR: Failed to clear screenshots."
    exit 1
fi

# 3. Seed initial data
echo "Seeding initial demo data..."
docker compose -f docker-compose.oracle.yml exec -T mongo mongosh pa11y-dashboard <<EOF
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

# 4. Trigger initial scans
# We trigger the scans via the API to ensure they are added to the scanQueue.
echo "Triggering initial scans..."
docker compose -f docker-compose.oracle.yml exec -T app sh -c "
  # Get all URL IDs from MongoDB via mongosh inside the app container context
  # (though we target localhost:3000 API)
  for id in \$(wget -qO- http://localhost:3000/api/urls | grep -o '\"_id\":\"[^\"]*\"' | cut -d'\"' -f4); do
    echo \"Triggering scan for \$id...\"
    wget -qO- --post-data='' http://localhost:3000/api/urls/\$id/scan
  done
"

echo "Demo reset and seeding completed successfully at $(date)"
echo "---------------------------------------------------"
