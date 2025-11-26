#!/bin/sh
set -e

# Substitute environment variables in the template using sed
# This works without needing to install additional packages
sed -i "s|\${GRAFANA_CLOUD_REMOTE_WRITE_URL}|${GRAFANA_CLOUD_REMOTE_WRITE_URL}|g" /etc/prometheus/prometheus.yml.template
sed -i "s|\${GRAFANA_CLOUD_USERNAME}|${GRAFANA_CLOUD_USERNAME}|g" /etc/prometheus/prometheus.yml.template
sed -i "s|\${GRAFANA_CLOUD_PASSWORD}|${GRAFANA_CLOUD_PASSWORD}|g" /etc/prometheus/prometheus.yml.template
sed -i "s|\${BACKEND_SERVICE_URL}|${BACKEND_SERVICE_URL}|g" /etc/prometheus/prometheus.yml.template

# Copy the substituted template to the final config file
cp /etc/prometheus/prometheus.yml.template /etc/prometheus/prometheus.yml

# Execute the original Prometheus entrypoint
exec "$@"

