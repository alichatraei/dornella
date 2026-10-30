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

### اگر پورت ۸۰ یا ۴۴۳ را سرویس دیگری گرفته

خطای `address already in use` یعنی همین. ببینید کدام سرویس است:

```bash
ss -ltnp | grep -E ':(80|443) '
```

در `.env` این‌ها را اضافه کنید (دامنه خودتان):

```
HTTP_PORT=8080
HTTPS_PORT=8443
SITE_ORIGIN=https://DOMAIN:8443
```

سایت روی `https://DOMAIN:8443` بالا می‌آید. Let's Encrypt فقط پورت ۸۰ را چک می‌کند، پس سرویس فعلی پورت ۸۰ باید درخواست‌های گواهی را جلو بفرستد. اگر آن سرویس nginx است، این را به `server` دامنه روی پورت ۸۰ اضافه کنید و آن را reload کنید، بعد `init-ssl.sh` را بزنید:

```
location /.well-known/acme-challenge/ {
    proxy_pass http://127.0.0.1:8080;
}
```

برای آدرس بدون شماره پورت، همان سرویس باید کل دامنه را روی پورت‌های ۸۰ و ۴۴۳ به `127.0.0.1:8443` پروکسی کند؛ در این حالت `SITE_ORIGIN` را بدون پورت بگذارید.

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
