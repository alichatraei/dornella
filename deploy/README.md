# راه‌اندازی درنلا روی سرور

همه چیز با داکر بالا می‌آید: پایگاه داده، API، سایت، nginx و گواهی SSL.
مسیر پروژه روی سرور `/home/dornela` است و بعد از راه‌اندازی، هر push به `main` خودکار روی سرور می‌رود.

## پیش‌نیازها

- سرور لینوکس (اوبونتو ۲۲ یا ۲۴) با حداقل ۲ گیگ رم
- رکورد `A` دامنه (و اگر خواستید `www`) که به IP سرور اشاره کند
- پورت‌های ۲۲، ۸۰ و ۴۴۳ باز باشند

## ۱. آماده‌سازی سرور (یک بار، با root)

```bash
curl -fsSL https://get.docker.com | sh
apt-get install -y git
useradd -M -d /home/dornela -s /bin/bash -G docker dornela
mkdir -p /home/dornela && chown dornela:dornela /home/dornela
sudo -u dornela git clone https://github.com/alichatraei/dornella.git /home/dornela
```

عضویت در گروه docker عملاً دسترسی کامل به سرور می‌دهد؛ این کاربر و کلیدش را فقط برای دیپلوی استفاده کنید.

اگر سرور داخل ایران است و `get.docker.com` یا Docker Hub باز نمی‌شود، بعد از نصب داکر، در `.env` مقدار `IMAGE_PREFIX=docker.arvancloud.ir/` را بگذارید.

## ۲. کپی فونت (یک بار، از سیستم خودتان)

فونت ایران‌سنس تجاری است و در گیت نیست. با `SERVER_IP` خودتان اجرا کنید:

```bash
scp apps/web/public/fonts/*.ttf root@SERVER_IP:/home/dornela/apps/web/public/fonts/
```

بعد روی سرور:

```bash
chown -R dornela:dornela /home/dornela/apps/web/public/fonts
```

## ۳. تنظیمات (روی سرور)

```bash
sudo -iu dornela
cd /home/dornela
cp .env.example .env
nano .env
```

حتماً پر کنید: `DOMAIN`، `CERTBOT_EMAIL`، `POSTGRES_PASSWORD`، `JWT_SECRET`، `ADMIN_PASSWORD` و برای ورود مشتری‌ها `SMS_*`.
برای دو رمز اول از خروجی این دستور استفاده کنید (هر کدام جدا):

```bash
openssl rand -hex 32
```

## ۴. SSL و اولین اجرا

```bash
bash deploy/init-ssl.sh
```

بعد از چند دقیقه سایت روی `https://DOMAIN` و پنل مدیریت روی `https://DOMAIN/admin/login` بالاست. گواهی خودکار تمدید می‌شود.

**اگر خطای `SSLError` یا قطع اتصال به `letsencrypt.org` گرفتید** (روی بعضی سرورهای ایران فیلتر است): در [zerossl.com](https://zerossl.com) حساب رایگان بسازید، از بخش Developer یک EAB بگیرید، در `.env` مقدارهای `ACME_SERVER=https://acme.zerossl.com/v2/DV90` و `ACME_EAB_KID` و `ACME_EAB_HMAC_KEY` را بگذارید و این را بزنید:

```bash
bash deploy/init-ssl.sh --force
```

راه دیگر: دامنه را پشت CDN ابر آروان ببرید و SSL خود آروان را روشن کنید.

### اگر روی سرور از قبل nginx روی پورت ۸۰ و ۴۴۳ هست

در این حالت nginx سرور جلو می‌ماند و فقط این دامنه را به داکر می‌فرستد. سایت‌های دیگر سرور دست نمی‌خورند.

۱. در `.env` بگذارید (پورت‌ها فقط از داخل خود سرور در دسترس‌اند و `SITE_ORIGIN` لازم نیست):

```
HTTP_PORT=127.0.0.1:8080
HTTPS_PORT=127.0.0.1:8443
```

۲. با root بخش HTTP را از فایل نمونه فعال کنید. `DOMAIN` را عوض کنید:

```bash
sed 's/DOMAIN_HERE/DOMAIN/g' /home/dornela/deploy/nginx/host-http.conf.example > /etc/nginx/conf.d/dornela.conf
```

```bash
nginx -t && systemctl reload nginx
```

۳. با کاربر dornela گواهی بگیرید و سایت را بالا بیاورید:

```bash
bash /home/dornela/deploy/init-ssl.sh
```

۴. با root بخش HTTPS را هم اضافه کنید. فقط بعد از گرفتن موفق گواهی:

```bash
sed 's/DOMAIN_HERE/DOMAIN/g' /home/dornela/deploy/nginx/host-https.conf.example >> /etc/nginx/conf.d/dornela.conf
```

```bash
nginx -t && systemctl reload nginx
```

۵. nginx سرور گواهی تمدیدشده را خودش نمی‌خواند. با `crontab -e` کاربر root این خط را اضافه کنید:

```
0 4 * * * /usr/sbin/nginx -s reload
```

## ۵. فعال کردن دیپلوی خودکار (یک بار، از سیستم خودتان)

کلید مخصوص دیپلوی بسازید و روی سرور بگذارید:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/dornela_deploy -N "" -C github-actions-dornela
```

```bash
cat ~/.ssh/dornela_deploy.pub | ssh root@SERVER_IP 'install -d -m 700 -o dornela -g dornela /home/dornela/.ssh && cat >> /home/dornela/.ssh/authorized_keys && chown dornela:dornela /home/dornela/.ssh/authorized_keys && chmod 600 /home/dornela/.ssh/authorized_keys'
```

اطلاعات را در GitHub بگذارید (`SERVER_IP` را عوض کنید؛ اگر پورت SSH چیز دیگری است `SERVER_PORT` را هم تنظیم کنید و در `ssh-keyscan` با `-p` بدهید):

```bash
gh secret set SERVER_SSH_KEY -R alichatraei/dornella < ~/.ssh/dornela_deploy
```

```bash
gh secret set SERVER_HOST -R alichatraei/dornella --body SERVER_IP
```

```bash
gh secret set SERVER_USER -R alichatraei/dornella --body dornela
```

```bash
ssh-keyscan SERVER_IP | gh secret set SERVER_KNOWN_HOSTS -R alichatraei/dornella
```

```bash
gh variable set DEPLOY_ENABLED -R alichatraei/dornella --body true
```

برای امتحان، دیپلوی را دستی اجرا کنید:

```bash
gh workflow run ci-cd.yml -R alichatraei/dornella --ref main
```

از این به بعد هر push به `main` اول تست می‌شود و اگر پاس شد روی سرور می‌رود. نتیجه در تب Actions گیت‌هاب است.

> **سرور داخل ایران:** ممکن است گیت‌هاب نتواند به SSH سرور وصل شود (مرحله Deploy با timeout خطا می‌دهد). در این حالت روی سرور `bash /home/dornela/deploy/deploy.sh` را دستی بزنید یا runner گیت‌هاب را روی خود سرور نصب کنید.

## کارهای روزمره

برگشت به یک نسخه قبلی:

```bash
bash /home/dornela/deploy/deploy.sh COMMIT_SHA
```

وضعیت و لاگ:

```bash
docker compose ps
```

```bash
docker compose logs -f api
```

بعد از هر تغییر در `.env`:

```bash
docker compose up -d
```

## پشتیبان‌گیری

پشتیبان پایگاه داده و عکس‌ها در پوشه `backups` ساخته می‌شود و نسخه‌های قدیمی‌تر از ۱۴ روز پاک می‌شوند:

```bash
bash deploy/backup.sh
```

برای اجرای خودکار هر شب، با `crontab -e` (کاربر dornela) این خط را اضافه کنید:

```
0 3 * * * bash /home/dornela/deploy/backup.sh >> /home/dornela/backups/backup.log 2>&1
```

## پیامک و درگاه

- **پیامک:** در پنل کاوه‌نگار یا sms.ir یک قالب برای کد ورود بسازید (کاوه‌نگار: پارامتر `token`، sms.ir: پارامتر `CODE`) و مقادیر `SMS_*` را در `.env` بگذارید. تا وقتی `SMS_PROVIDER=console` است پیامکی ارسال نمی‌شود و مشتری‌ها نمی‌توانند وارد شوند.
- **زرین‌پال:** مرچنت‌کد را در `ZARINPAL_MERCHANT_ID` بگذارید و از پنل مدیریت ← تنظیمات، پرداخت آنلاین را روشن کنید. دامنه را در پنل زرین‌پال ثبت کنید. آدرس بازگشت: `https://DOMAIN/api/payments/zarinpal/callback`
- **نماد اعتماد و نشان زرین‌پال:** کد HTML آن‌ها را در پنل مدیریت ← تنظیمات ← نمادها بگذارید.
- **قبل از شروع فروش:** شماره کارت و لینک کانال بله را در پنل مدیریت ← تنظیمات با اطلاعات واقعی عوض کنید؛ مقدارهای فعلی نمونه‌اند.
