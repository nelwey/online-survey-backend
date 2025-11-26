FROM prom/prometheus:latest

# Copy template file
COPY prometheus.yml.template /etc/prometheus/prometheus.yml.template

# Copy startup script with execute permissions
COPY --chmod=755 docker-entrypoint.sh /docker-entrypoint.sh

EXPOSE 9090

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["prometheus", "--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.path=/prometheus"]

