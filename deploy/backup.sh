#!/usr/bin/env bash
# پشتیبان روزانه از پایگاه داده و عکس‌ها. برای اجرای خودکار هر شب ساعت ۳:
#   crontab -e  →  0 3 * * * bash /home/dornela/deploy/backup.sh >> /home/dornela/backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
dir="backups/$(date +%Y-%m-%d)"
mkdir -p "$dir"
docker compose exec -T db pg_dump -U dornela -d dornela --no-owner | gzip > "$dir/db.sql.gz"
docker compose run --rm --no-deps -v "$PWD/$dir:/backup" --entrypoint tar api czf /backup/uploads.tgz -C /app uploads
# پشتیبان‌های قدیمی‌تر از ۱۴ روز پاک می‌شوند
find backups -maxdepth 1 -type d -name '20*' -mtime +14 -exec rm -rf {} +
echo "پشتیبان ساخته شد: $dir"
