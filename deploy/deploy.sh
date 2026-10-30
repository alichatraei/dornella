#!/usr/bin/env bash
# به‌روزرسانی سایت روی سرور. GitHub Actions بعد از هر push این را اجرا می‌کند؛ دستی هم می‌شود:
#   bash /home/dornela/deploy/deploy.sh            آخرین نسخه main
#   bash /home/dornela/deploy/deploy.sh <commit>   یک نسخه مشخص (برای برگشت به عقب)
# فایل‌های خارج از گیت (.env، فونت‌ها، گواهی SSL) دست نمی‌خورند.
set -euo pipefail
cd "$(dirname "$0")/.."

target="${1:-origin/main}"

[ -f .env ] || { echo "فایل .env روی سرور نیست"; exit 1; }
ls apps/web/public/fonts/*.ttf >/dev/null 2>&1 || echo "هشدار: فونت‌ها در apps/web/public/fonts نیستند؛ سایت با فونت جایگزین نمایش داده می‌شود"

git fetch --prune origin main
git reset --hard "$target"
echo "▸ نسخه: $(git log -1 --format='%h %s')"

docker compose up -d --build --remove-orphans

echo "▸ بررسی سلامت…"
ok=""
for _ in $(seq 1 40); do
  if docker compose exec -T api wget -qO- http://127.0.0.1:4000/api/health >/dev/null 2>&1 \
    && docker compose exec -T web wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 5
done

if [ -z "$ok" ]; then
  echo "✗ سرویس‌ها سالم بالا نیامدند:"
  docker compose ps
  docker compose logs --tail 60 api web
  exit 1
fi

docker image prune -f >/dev/null
echo "✓ دیپلوی انجام شد"
