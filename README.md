# Mafia Arena → APK

بازی داخل پوشه‌ی `www/` هست (index.html همون mafia.html هست).
PeerJS و فونت‌ها داخل پروژه ذخیره شدن و دیگه از اینترنت لود نمی‌شن
(خود بازی چندنفره هنوز برای اتصال بین بازیکن‌ها اینترنت می‌خواد).

## روش ۱: ساخت APK آنلاین با GitHub (بدون نصب چیزی)
1. یک ریپوی جدید توی GitHub بساز و همین پوشه رو کامل آپلود کن
   (پوشه‌ی `.github` هم باید باشه).
2. برو تب Actions → «Build APK» → Run workflow.
3. وقتی تموم شد، از قسمت Artifacts فایل `mafia-arena-apk` رو دانلود کن.
   داخلش `app-debug.apk` هست؛ مستقیم روی گوشی نصب می‌شه.

## روش ۲: ساخت روی کامپیوتر خودت
نیازمندی‌ها: Node.js 18+، JDK 17، Android Studio (یا Android SDK)

    npm install
    npx cap add android
    npm run patch
    npx cap sync android
    npm run apk

خروجی: `android/app/build/outputs/apk/debug/app-debug.apk`

## بعد از هر تغییر توی بازی
فایل‌ها رو توی `www/` عوض کن، بعد `npx cap sync android` و دوباره `npm run apk`.
برای انتشار توی مارکت‌ها باید نسخه‌ی release با کلید امضای خودت ساخته بشه.
