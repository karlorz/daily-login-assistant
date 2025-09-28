#!/bin/bash

# Daily Login Assistant Docker Run Script
# Make sure to replace the example values with your actual credentials and notification URLs

# Set environment variables (replace with your actual values)
export NOTIFICATION_URLS="discord://token@channel"
export EXAMPLE_USERNAME="your_username"
export EXAMPLE_PASSWORD="your_password"
export NODE_ENV="production"
export LOG_LEVEL="info"

# Run the Docker container
docker run -d \
  --name daily-login-bot \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/profiles:/app/profiles \
  -v $(pwd)/logs:/app/logs \
  -e NOTIFICATION_URLS="$NOTIFICATION_URLS" \
  -e EXAMPLE_USERNAME="$EXAMPLE_USERNAME" \
  -e EXAMPLE_PASSWORD="$EXAMPLE_PASSWORD" \
  -e NODE_ENV="$NODE_ENV" \
  -e LOG_LEVEL="$LOG_LEVEL" \
  karl8080/daily-login-assistant:ci-1

echo "Container started. Use 'docker logs daily-login-bot' to view logs."