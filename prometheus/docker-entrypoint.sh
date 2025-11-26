#!/bin/sh
set -e

# Substitute environment variables in the template
envsubst < /etc/prometheus/prometheus.yml.template > /etc/prometheus/prometheus.yml

# Execute the original Prometheus entrypoint
exec "$@"

