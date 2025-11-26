FROM prom/prometheus:latest

# Install gettext for envsubst (Prometheus uses Debian-based image, so use apt)
USER root
RUN apt-get update && apt-get install -y gettext-base && rm -rf /var/lib/apt/lists/*
USER nobody

# Copy template file
COPY prometheus.yml.template /etc/prometheus/prometheus.yml.template

# Copy startup script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 9090

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["prometheus", "--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.path=/prometheus"]

