'use strict';
/* ============================================================
   MAFIA ARENA — سرور آنلاین
   اجرا:   npm install   ←   node server.js   ←   http://localhost:3000
   وظایف: سرو فایل‌های بازی، ساخت/پیدا کردن اتاق، تأیید میکروفن (۱۵ ثانیه)،
          شروع بازی فقط وقتی اتاق پر باشد و همه ویس‌شان تأیید شده باشد،
          رله‌ی سیگنال WebRTC برای ویس چت، و اجرای موتور بازی (game.js)
   ============================================================ */
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const { Game } = require('./game');

const PORT = +process.env.PORT || 3000;
const ROOT = __dirname;
const FAST = !!process.env.MAFIA_FAST;                       // فقط برای تست: زمان‌ها کوتاه می‌شوند
const MIC_TIMEOUT = FAST ? +(process.env.MIC_TIMEOUT || 15000) : 15000;   // ۱۵ ثانیه فرصت تأیید میکروفن
const MESH_WAIT = FAST ? 4000 : 12000;                       // حداکثر صبر برای وصل شدن ویس‌ها قبل از شروع
const SIZES = [10, 16];
const QUICK_N = FAST && process.env.QUICK_N ? +process.env.QUICK_N : 10;   // فقط برای تست

/* ---------------- فایل‌های استاتیک ---------------- */
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.mp4':'video/mp4', '.mp3':'audio/mpeg',
  '.ogg':'audio/ogg', '.wav':'audio/wav', '.json':'application/json', '.ico':'image/x-icon' };
const BLOCK = /^(server\.js|game\.js|package(-lock)?\.json|node_modules)(\/|$)/i;

const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/' || p === '') p = '/mafia.html';
  const f = path.normalize(path.join(ROOT, p));
  if (!f.startsWith(ROOT) || BLOCK.test(path.relative(ROOT, f))) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(f, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    const type = MIME[path.extname(f).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;
    if (range) {                                              // پشتیبانی از Range برای ویدیو
      const m = /bytes=(\d*)-(\d*)/.exec(range); let s = m[1] ? +m[1] : 0, en = m[2] ? +m[2] : st.size - 1;
      if (s > en || s >= st.size) { res.writeHead(416); return res.end(); }
      res.writeHead(206, { 'Content-Type':type, 'Content-Range':`bytes ${s}-${en}/${st.size}`, 'Accept-Ranges':'bytes', 'Content-Length':en - s + 1 });
      return fs.createReadStream(f, { start:s, end:en }).pipe(res);
    }
    res.writeHead(200, { 'Content-Type':type, 'Content-Length':st.size, 'Accept-Ranges':'bytes', 'Cache-Control':'no-cache' });
    fs.createReadStream(f).pipe(res);
  });
});

/* ---------------- اتاق‌ها ---------------- */
const rooms = new Map();            // code → Room
const clients = new Map();          // pid → client
let pidSeq = 0;

const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const okFile = s => (/^[\w\-]+\.(png|jpe?g|webp)$/i.test(String(s || '')) ? String(s) : '');

class Room {
  constructor(code, n, mode, pass, priv, hostPid) {
    this.code = code; this.n = n; this.mode = mode; this.pass = pass || ''; this.private = priv; this.hostPid = hostPid;
    this.players = []; this.state = 'waiting'; this.game = null; this.prepAt = 0;
  }
  sendPid(pid, msg) { const c = clients.get(pid); if (c && c.ws.readyState === 1) c.ws.send(JSON.stringify(msg)); }
  broadcast(msg) { this.players.forEach(p => this.sendPid(p.pid, msg)); }
  info() {
    const now = Date.now();
    return { t:'lobby', code:this.code, n:this.n, mode:this.mode, private:this.private, host:this.hostPid, state:this.state, hasPass:!!this.pass,
      players:this.players.map(p => ({ pid:p.pid, name:p.name, avatar:p.avatar, frame:p.frame, mic:p.mic,
        left:p.mic ? 0 : Math.max(0, MIC_TIMEOUT - (now - p.joinedAt)) })) };
  }
  lobby() { this.broadcast(this.info()); }

  add(c) {
    c.room = this; c.joinedAt = Date.now(); c.mic = false; c.mesh = false;
    this.players.push(c);
    this.sendPid(c.pid, { t:'joined', pid:c.pid, code:this.code });
    this.lobby(); this.checkStart();
  }
  remove(c, reason) {
    const i = this.players.indexOf(c); if (i < 0) return;
    if (this.state === 'playing' && this.game) this.game.playerLeft(this.game.p.findIndex(p => p.pid === c.pid));
    this.players.splice(i, 1); c.room = null;
    if (reason) this.sendPid(c.pid, { t:'removed', reason });
    if (this.state === 'playing' || this.state === 'ended') { if (!this.players.length) this.close(); return; }
    if (this.state === 'prepare') { this.state = 'waiting'; this.broadcast({ t:'unprepare' }); }
    if (!this.players.length) return this.close();
    if (this.hostPid === c.pid) this.hostPid = this.players[0].pid;
    this.lobby();
  }
  close() { if (this.game) this.game.destroy(); rooms.delete(this.code); }

  /* شروع فقط وقتی اتاق پر است و میکروفن همه تأیید شده */
  checkStart() {
    if (this.state !== 'waiting') return;
    if (this.players.length === this.n && this.players.every(p => p.mic)) {
      this.state = 'prepare'; this.prepAt = Date.now(); this.players.forEach(p => p.mesh = false);
      this.broadcast({ t:'prepare', timeout:MESH_WAIT }); this.lobby();
    }
  }
  checkPrepare() {
    if (this.state !== 'prepare') return;
    const ready = this.players.every(p => p.mesh);
    if (ready || Date.now() - this.prepAt > MESH_WAIT) this.start();
  }
  start() {
    if (this.state !== 'prepare') return;
    this.state = 'playing';
    const order = this.players.slice().sort(() => Math.random() - .5);           // صندلی‌ها تصادفی
    const seats = order.map(p => ({ pid:p.pid, name:p.name, avatar:p.avatar, frame:p.frame }));
    this.game = new Game(this, seats, this.mode, FAST);
    const pub = this.game.p.map(p => ({ id:p.id, pid:p.pid, name:p.name, avatar:p.avatar, frame:p.frame }));
    this.game.p.forEach(p => this.sendPid(p.pid, { t:'start', n:this.n, mode:this.mode, code:this.code, me:p.id, players:pub, isPrivate:this.private }));
    this.game.begin();
  }
  gameEnded() { this.state = 'ended'; }
}

function newCode() { let c; do { c = String(1000 + Math.floor(Math.random() * 9000)); } while (rooms.has(c)); return c; }

function profile(c, m) {
  c.name = clean(m.name, 16) || 'Player'; c.avatar = okFile(m.avatar); c.frame = okFile(m.frame);
}
function leave(c, reason) { if (c.room) c.room.remove(c, reason); }

/* ---------------- وب‌سوکت ---------------- */
const wss = new WebSocketServer({ server, maxPayload:64 * 1024 });
wss.on('connection', ws => {
  const c = { pid:'p' + (++pidSeq) + Math.random().toString(36).slice(2, 6), ws, room:null, name:'Player', avatar:'', frame:'', mic:false, mesh:false, joinedAt:0, lastMsg:0 };
  clients.set(c.pid, c); ws.isAlive = true;
  ws.on('pong', () => ws.isAlive = true);
  ws.send(JSON.stringify({ t:'hi', pid:c.pid }));

  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    const now = Date.now(); if (now - c.lastMsg < 15 && m.t === 'chat') return; if (m.t === 'chat') c.lastMsg = now;
    const r = c.room, g = r && r.game, seat = g ? g.p.findIndex(p => p.pid === c.pid) : -1;
    const err = t => ws.send(JSON.stringify({ t:'err', m:t }));

    switch (m.t) {
      case 'create': {
        if (r) return err('قبلاً در یک اتاق هستید');
        const n = SIZES.includes(+m.n) ? +m.n : 10; profile(c, m);
        const room = new Room(newCode(), n, m.mode === 'vip' ? 'vip' : 'normal', clean(m.pass, 12), true, c.pid);
        rooms.set(room.code, room); room.add(c); break;
      }
      case 'join': {
        if (r) return err('قبلاً در یک اتاق هستید'); profile(c, m);
        const room = rooms.get(clean(m.code, 4));
        if (!room) return err('اتاقی با این کد پیدا نشد');
        if (room.pass && room.pass !== clean(m.pass, 12)) return err('رمز اتاق اشتباه است');
        if (room.state !== 'waiting') return err('بازی این اتاق شروع شده یا اتاق در حال آماده‌سازی است');
        if (room.players.length >= room.n) return err('اتاق پر است');
        room.add(c); break;
      }
      case 'quick': {                                           // پیدا کردن اتاق عمومی یا ساخت اتاق تازه
        if (r) return err('قبلاً در یک اتاق هستید'); profile(c, m);
        const mode = m.mode === 'vip' ? 'vip' : 'normal';
        let room = [...rooms.values()].find(x => !x.private && x.mode === mode && x.n === QUICK_N && x.state === 'waiting' && x.players.length < x.n);
        if (!room) { room = new Room(newCode(), QUICK_N, mode, '', false, null); rooms.set(room.code, room); }
        room.add(c); break;
      }
      case 'leave': leave(c); break;
      case 'mic_ok': if (r && r.state !== 'playing' && !c.mic) { c.mic = true; r.lobby(); r.checkStart(); } break;
      case 'mic_fail': if (r && r.state !== 'playing') leave(c, m.why === 'insecure' ? 'mic_insecure' : 'mic_denied'); break;
      case 'mesh_ready': if (r && r.state === 'prepare') { c.mesh = true; r.checkPrepare(); } break;
      case 'sig': {                                             // رله‌ی WebRTC فقط بین اعضای یک اتاق
        const to = clients.get(String(m.to)); if (!r || !to || to.room !== r) return;
        r.sendPid(to.pid, { t:'sig', from:c.pid, data:m.data }); break;
      }
      /* ---- اکشن‌های بازی ---- */
      case 'skip': g && seat >= 0 && g.skip(seat); break;
      case 'gun': g && seat >= 0 && g.gun(seat, +m.target); break;
      case 'duel': g && seat >= 0 && g.duel(seat, +m.target); break;
      case 'vote': g && seat >= 0 && g.vote(seat, +m.target); break;
      case 'night': g && seat >= 0 && g.nightAct(seat, (m.targets || []).map(Number)); break;
      case 'swordpick': g && seat >= 0 && g.swordPick(seat, +m.target); break;
      case 'chat': g && seat >= 0 && g.sendChat(seat, m.text); break;
      case 'like': g && seat >= 0 && g.like(seat, +m.target, m.v === -1 ? -1 : 1); break;
      case 'kick': g && seat >= 0 && g.kick(seat, +m.target); break;
    }
  });
  ws.on('close', () => { leave(c); clients.delete(c.pid); });
  ws.on('error', () => {});
});

/* ---- زمان‌سنج ۱۵ ثانیه‌ی میکروفن + بررسی آماده‌بودن ویس ---- */
setInterval(() => {
  const now = Date.now();
  for (const room of [...rooms.values()]) {
    if (room.state === 'waiting' || room.state === 'prepare') {
      room.players.filter(p => !p.mic && now - p.joinedAt > MIC_TIMEOUT).forEach(p => room.remove(p, 'mic_timeout'));
    }
    room.checkPrepare();
  }
}, 250);
setInterval(() => wss.clients.forEach(ws => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }), 20000);

server.listen(PORT, () => console.log(`MAFIA ARENA → http://localhost:${PORT}   ${FAST ? '(FAST test mode)' : ''}`));
