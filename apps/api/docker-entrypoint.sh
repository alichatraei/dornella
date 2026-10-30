#!/bin/sh
set -e
# اعمال تغییرات پایگاه داده قبل از بالا آمدن سرور
npx prisma migrate deploy
exec node dist/main.js
