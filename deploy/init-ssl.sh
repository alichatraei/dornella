#!/usr/bin/env bash
# گرفتن گواهی SSL از Let's Encrypt و بالا آوردن کل سایت
#   bash deploy/init-ssl.sh            اولین بار
#   bash deploy/init-ssl.sh --force    گرفتن دوباره گواهی (مثلاً بعد از تغییر دامنه)
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "اول فایل .env را از روی .env.example بسازید"; exit 1; }
set -a; . ./.env; set +a
: "${DOMAIN:?DOMAIN در .env خالی است}"
: "${CERTBOT_EMAIL:?CERTBOT_EMAIL در .env خالی است}"

live="deploy/certbot/conf/live/$DOMAIN"
domains=(-d "$DOMAIN")
[ "${CERT_WWW:-true}" = "true" ] && domains+=(-d "www.$DOMAIN")

if [ -f "$live/fullchain.pem" ] && [ "${1:-}" != "--force" ] && ! grep -q "dummy" "$live/.dummy" 2>/dev/null; then
  echo "گواهی $DOMAIN از قبل هست. فقط سرویس‌ها بالا می‌آیند."
  docker compose up -d --build
  exit 0
fi

mkdir -p deploy/certbot/conf deploy/certbot/www

if [ "${HTTP_PORT:-80}" != "80" ]; then
  echo "توجه: Let's Encrypt فقط پورت ۸۰ را چک می‌کند. سرویسی که الان روی پورت ۸۰ است باید مسیر"
  echo "/.well-known/acme-challenge/ را به پورت ${HTTP_PORT} بفرستد، وگرنه گرفتن گواهی خطا می‌دهد (deploy/README.md)."
fi

make_dummy() {
  echo "▸ ساخت گواهی موقت تا nginx بتواند بالا بیاید…"
  docker compose run --rm --no-deps --entrypoint /bin/sh certbot -c "
    mkdir -p /etc/letsencrypt/live/$DOMAIN &&
    openssl req -x509 -nodes -newkey rsa:2048 -days 2 \
      -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
      -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem -subj /CN=$DOMAIN >/dev/null 2>&1 &&
    echo dummy > /etc/letsencrypt/live/$DOMAIN/.dummy"
}

make_dummy
echo "▸ ساخت و اجرای سرویس‌ها (بار اول چند دقیقه طول می‌کشد)…"
docker compose up -d --build

echo "▸ حذف گواهی موقت…"
docker compose run --rm --no-deps --entrypoint /bin/sh certbot -c "
  rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf"

echo "▸ درخواست گواهی واقعی برای: ${domains[*]}"
extra=()
[ "${CERT_STAGING:-false}" = "true" ] && extra+=(--staging)
# اگر Let's Encrypt از سرور در دسترس نبود، می‌شود از ZeroSSL استفاده کرد (راهنما: deploy/README.md)
[ -n "${ACME_SERVER:-}" ] && extra+=(--server "$ACME_SERVER")
[ -n "${ACME_EAB_KID:-}" ] && extra+=(--eab-kid "$ACME_EAB_KID" --eab-hmac-key "$ACME_EAB_HMAC_KEY")
if ! docker compose run --rm --no-deps --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
    "${domains[@]}" --email "$CERTBOT_EMAIL" --agree-tos --no-eff-email --key-type ecdsa "${extra[@]}"; then
  echo
  echo "✗ گرفتن گواهی انجام نشد. سایت فعلاً با گواهی موقت بالاست. علت‌های رایج:"
  echo "  • رکورد A دامنه هنوز به IP این سرور اشاره نمی‌کند یا پورت ۸۰ بسته است"
  echo "  • زیردامنه www تعریف نشده → در .env بگذارید CERT_WWW=false"
  echo "  • خطای SSLError یا Connection: سرور به Let's Encrypt دسترسی ندارد (فیلتر)"
  echo "    → در .env مقدارهای ACME_SERVER و ACME_EAB_* را برای ZeroSSL پر کنید و دوباره اجرا کنید"
  make_dummy
  docker compose exec nginx nginx -s reload || true
  exit 1
fi

docker compose exec nginx nginx -s reload
echo
echo "✓ آماده است: https://$DOMAIN"
echo "  پنل مدیریت: https://$DOMAIN/admin/login"
