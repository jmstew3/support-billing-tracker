# MySQL Backup Container
# Runs scheduled backups using cron inside the container

FROM mysql:8.0

# Install cron
RUN microdnf install -y cronie && microdnf clean all

# Create backup directory
RUN mkdir -p /backups/daily /backups/weekly /backups/monthly

# Copy backup script
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Copy cron configuration
COPY crontab /etc/cron.d/mysql-backup
RUN chmod 0644 /etc/cron.d/mysql-backup

# Create log file
RUN touch /var/log/backup.log

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
