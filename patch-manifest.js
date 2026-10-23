// بعد از "cap add android" اجرا می‌شه: مجوز میکروفون (برای چت صوتی بازی) رو اضافه می‌کنه
const fs = require('fs');
const p = 'android/app/src/main/AndroidManifest.xml';
let s = fs.readFileSync(p, 'utf8');
const perms = [
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS'
];
for (const perm of perms) {
  if (!s.includes(perm)) {
    s = s.replace('</manifest>', `    <uses-permission android:name="${perm}" />\n</manifest>`);
  }
}
fs.writeFileSync(p, s);
console.log('Manifest patched');
