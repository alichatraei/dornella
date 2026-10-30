#!/bin/sh
# هر ۶ ساعت nginx دوباره بارگذاری می‌شود تا گواهی تمدیدشده را بخواند
( while :; do sleep 6h; nginx -s reload; done ) &
