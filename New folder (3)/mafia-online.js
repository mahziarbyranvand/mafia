/* ============================================================
   MAFIA ARENA — کلاینت آنلاین (جایگزین mafia-pro.js)
   بازیکن واقعی + ویس چت. باید بعد از اسکریپت اصلی لود شود.
   ============================================================ */
(() => {
/* نقشه‌ی کارت‌ها — c = شماره‌ی فایل عکس کارت (card-<c>.png)
   1 ارباب تیرد | 2 کاراگاه | 3 گلادیاتور | 4 جلاد | 5 زره‌پوش | 6 تک‌تیرانداز | 7 افسونگر
   8 شوالیه‌ساز | 9 گلادیاتور سایه | 10 پیشگو | 11 خیانت‌کار | 12 مافیای ساده
   13 تا 16 شهروند ساده (چهار طرح؛ پایین‌تر CITIZEN_CARDS را ببین)
   اگر شماره‌ی کارتی با نقشش نمی‌خواند، فقط عدد c همان نقش را عوض کن. */
const RL = {
  lord:{c:1,e:'👑',t:'mafia',n:'ارباب تیرد',d:'رهبر مافیا؛ هر شب شلیک می‌کنی. استعلامت «شهروند» است.'},
  detective:{c:2,e:'🕵️',t:'town',n:'کاراگاه',d:'هر شب یک نفر را استعلام می‌کنی.'},
  gladiator:{c:3,e:'⚔️',t:'town',n:'گلادیاتور',d:'یک بار در ترن خودت دوئل می‌دهی؛ اگر هدف مافیا باشد حذف می‌شود، وگرنه خودت.'},
  executioner:{c:4,e:'🪓',t:'solo',n:'جلاد',d:'تک‌نفره. هر شب ۴ نفر را لینک می‌کنی؛ صبح شمشیر به یکی‌شان می‌رسد. هدف: آخرین نفر زنده.'},
  armor:{c:5,e:'🛡️',t:'town',n:'زره‌پوش',d:'یک بار از شلیک جان سالم به در می‌بری.'},
  sniper:{c:6,e:'🎯',t:'town',n:'تک‌تیرانداز',d:'یک بار شلیک شبانه.'},
  charmer:{c:7,e:'🪄',t:'mafia',n:'افسونگر',d:'هر شب یک نفر را افسون می‌کنی؛ فردا نه حرف می‌زند نه رأی می‌دهد.'},
  knight:{c:8,e:'🗡️',t:'town',n:'شوالیه‌ساز',d:'هر شب به یک نفر گان می‌دهی.'},
  shadow:{c:9,e:'🌑',t:'mafia',n:'گلادیاتور سایه',d:'یک بار شبانه هدفی را در دوئل سایه حذف می‌کنی.'},
  oracle:{c:10,e:'🔮',t:'town',n:'پیشگو',d:'هر شب یک نفر را بیدار می‌کنی؛ شهروند وارد لینک شبانه می‌شود، مافیا یعنی مرگ همه‌ی لینک.'},
  traitor:{c:11,e:'🐍',t:'mafia',n:'خیانت‌کار',d:'هم‌تیمی‌هایت تو را می‌شناسند، تو آن‌ها را نه. هر شب نقش یک نفر را می‌دزدی (دو شب پشت‌سرهم از یک نفر نه).'},
  smafia:{c:12,e:'😈',t:'mafia',n:'مافیای ساده',d:'توانایی ویژه نداری؛ با تیم هماهنگ باش.'},
  citizen:{c:13,e:'🏺',t:'town',n:'شهروند ساده',d:'توانایی ویژه نداری؛ با منطق و رأی از شهر دفاع کن.'}
};
const LB = {kill:'شلیک',inq:'استعلام',link4:'لینک ۴ نفر',shot:'شلیک',charm:'افسون',gun:'دادن گان',duel1:'دوئل سایه',link:'بیدار کردن',steal:'دزدیدن نقش'};
const TN = {mafia:'تیم مافیا',town:'تیم شهر',solo:'تک‌نفره'};
window.MF_RL = RL; window.MF_TN = TN;
const CITIZEN_CARDS = [13,14,15,16];
const cardNo = p => p.role === 'citizen' ? CITIZEN_CARDS[p.id % CITIZEN_CARDS.length] : RL[p.role].c;
const P = i => G.players[i];
const al = () => G.players.filter(p => p.alive);
const pos = i => seatXY(G.n, i);
const tag = p => (p.mate ? '😈 ' : '') + (p.id !== G.me && G.link.includes(G.me) && G.link.includes(p.id) ? '🔗 ' : '') + (['sword','swordpick'].includes(G.phase) && G.jlink.includes(p.id) ? '⛓️ ' : '');
const toast = (m, t) => showToast(m, t || 'error');

/* ============================================================
   ۱) اتصال به سرور
   ============================================================ */
let PID = null, LOBBY = null, COST = 1, PICK = {};
const WS = {
  ws:null, ready:null,
  connect() {
    if (this.ws && this.ws.readyState === 1) return Promise.resolve();
    if (this.ready) return this.ready;
    this.ready = new Promise((res, rej) => {
      const url = window.MF_WS || ((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
      let ws; try { ws = new WebSocket(url); } catch (e) { this.ready = null; return rej(e); }
      ws.onopen = () => res();
      ws.onerror = () => { this.ready = null; rej(new Error('ws')); };
      ws.onmessage = e => { try { onMsg(JSON.parse(e.data)); } catch (err) { console.error(err); } };
      ws.onclose = () => { this.ready = null; this.ws = null; onClose(); };
      this.ws = ws;
    });
    return this.ready;
  },
  send(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
};
const profile = () => ({ name:cfg.name || 'Player', avatar:AVATARS[cfg.char - 1] || AVATARS[0], frame:FRAMES[cfg.frame]?.img || '' });

function notice(title, text) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="modal-content" style="text-align:center"><h3>${title}</h3><p style="line-height:1.9;color:#ddd">${text}</p><button class="gb" style="width:100%">باشه</button></div>`;
  m.querySelector('button').onclick = () => m.remove(); document.body.appendChild(m);
}
function connectFail() {
  notice('⚠️ اتصال به سرور بازی ممکن نیست',
    'این نسخه برای بازیکن واقعی به سرور نیاز دارد.<br>در پوشه‌ی بازی دستور <b dir="ltr">npm install</b> و بعد <b dir="ltr">node server.js</b> را اجرا کنید و بازی را از <b dir="ltr">http://localhost:3000</b> باز کنید (نه با Live Server).');
}
async function ensure() { try { await WS.connect(); return true; } catch (e) { connectFail(); return false; } }

const Online = {
  async quick(mode) {
    COST = mode === 'vip' ? 3 : 1; if (cfg.tokens < COST) return toast('توکن کافی نیست');
    if (!(await ensure())) return; WS.send({ t:'quick', mode, ...profile() });
  },
  async create(n, mode, pass) {
    COST = mode === 'vip' ? 3 : 1; if (cfg.tokens < COST) return toast('توکن کافی نیست');
    if (!(await ensure())) return; WS.send({ t:'create', n, mode, pass, ...profile() });
  },
  async join(code, pass) {
    if (cfg.tokens < 1) return toast('توکن کافی نیست');
    if (!(await ensure())) return; COST = 1; WS.send({ t:'join', code, pass, ...profile() });
  }
};
window.Online = Online;
window.startGame = mode => Online.quick(mode === 'vip' ? 'vip' : 'normal');

function onClose() {
  const inside = G || LOBBY;
  Voice.stop(); G = null; LOBBY = null; PID = null;
  if (inside) { document.body.classList.remove('in-room'); showLobby(); notice('اتصال قطع شد', 'ارتباط با سرور بازی قطع شد.'); }
}

function onMsg(m) {
  switch (m.t) {
    case 'hi': PID = m.pid; break;
    case 'joined': Voice.begin(); break;
    case 'lobby': LOBBY = m; LOBBY.at = Date.now(); if (!G) { renderWaiting(); Voice.sync(); } break;
    case 'prepare': if (LOBBY) { LOBBY.state = 'prepare'; renderWaiting(); Voice.check(); } break;
    case 'unprepare': if (LOBBY) { LOBBY.state = 'waiting'; renderWaiting(); } break;
    case 'removed': removed(m.reason); break;
    case 'start': beginGame(m); break;
    case 'state': applyState(m.v); break;
    case 'chat': if (G) { G.chat.push(m.m); updateRoom(); } break;
    case 'fx': fxMsg(m); break;
    case 'end': showEnd(m); break;
    case 'sig': Voice.onSignal(m.from, m.data); break;
    case 'err': toast(m.m); break;
  }
}

function removed(reason) {
  Voice.stop(); LOBBY = null; G = null; document.body.classList.remove('in-room'); showLobby();
  const T = {
    mic_timeout:['⏱️ زمان تمام شد', 'در ۱۵ ثانیه اجازه‌ی میکروفن را ندادید؛ از اتاق بازی حذف شدید. برای ورود دوباره باید میکروفن را تأیید کنید.'],
    mic_denied:['🎤 دسترسی میکروفن داده نشد', 'ویس‌چت در این بازی اجباری است؛ بدون میکروفن نمی‌توانید در اتاق بمانید. اجازه‌ی میکروفن را در مرورگر بدهید و دوباره وارد شوید.'],
    mic_insecure:['🔒 میکروفن در دسترس نیست', 'مرورگر روی این آدرس اجازه‌ی میکروفن نمی‌دهد. بازی باید با <b>https</b> یا <b>localhost</b> باز شود.']
  }[reason] || ['خارج شدید', 'از اتاق خارج شدید.'];
  notice(T[0], T[1]);
}

/* ============================================================
   ۲) ویس چت (WebRTC) — هر بازیکن با همه‌ی بازیکن‌ها وصل می‌شود
   ============================================================ */
const Voice = {
  stream:null, pcs:{}, auds:{}, micOn:true, ac:null, an:null, buf:null, meshSent:false, myTurn:false,
  ice() { return window.MF_ICE || [{ urls:'stun:stun.l.google.com:19302' }, { urls:'stun:stun1.l.google.com:19302' }]; },

  /* ورود به لابی ← درخواست میکروفن؛ جواب را به سرور می‌گوید (سرور ۱۵ ثانیه صبر می‌کند) */
  async begin() {
    this.stop(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw 'insecure';
      const s = await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:true, noiseSuppression:true, autoGainControl:true }, video:false });
      const t = s.getAudioTracks()[0]; if (!t || t.readyState !== 'live') throw 'nomic';
      t.enabled = false; this.stream = s;
      t.onended = () => { if (G) toast('میکروفن شما قطع شد'); };
      try {
        this.ac = new (window.AudioContext || window.webkitAudioContext)(); this.an = this.ac.createAnalyser(); this.an.fftSize = 256;
        this.ac.createMediaStreamSource(s).connect(this.an); this.buf = new Uint8Array(this.an.frequencyBinCount);
      } catch (e) {}
      WS.send({ t:'mic_ok' }); this.sync();
    } catch (e) { WS.send({ t:'mic_fail', why:e === 'insecure' ? 'insecure' : 'denied' }); }
  },
  sync() {
    if (!this.stream || !LOBBY) return;
    LOBBY.players.forEach(p => { if (p.pid !== PID && p.mic && !this.pcs[p.pid]) this.open(p.pid, PID < p.pid); });
    Object.keys(this.pcs).forEach(id => { if (!LOBBY.players.some(p => p.pid === id)) this.close(id); });
    this.check();
  },
  open(id, initiator) {
    const pc = new RTCPeerConnection({ iceServers:this.ice() }); this.pcs[id] = pc; pc.cands = []; pc.remote = false;
    this.stream.getTracks().forEach(t => pc.addTrack(t, this.stream));
    pc.onicecandidate = e => e.candidate && WS.send({ t:'sig', to:id, data:{ c:e.candidate } });
    pc.ontrack = e => {
      let a = this.auds[id]; if (!a) { a = new Audio(); a.autoplay = true; a.playsInline = true; this.auds[id] = a; document.body.appendChild(a); }
      a.srcObject = e.streams[0]; a.play().catch(() => {});
    };
    pc.onconnectionstatechange = () => this.check();
    if (initiator) pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => WS.send({ t:'sig', to:id, data:{ d:pc.localDescription } })).catch(() => {});
    return pc;
  },
  async onSignal(from, data) {
    if (!this.stream || !data) return;
    let pc = this.pcs[from];
    try {
      if (data.d) {
        if (!pc) pc = this.open(from, false);
        await pc.setRemoteDescription(data.d); pc.remote = true;
        for (const c of pc.cands.splice(0)) await pc.addIceCandidate(c).catch(() => {});
        if (data.d.type === 'offer') { const a = await pc.createAnswer(); await pc.setLocalDescription(a); WS.send({ t:'sig', to:from, data:{ d:pc.localDescription } }); }
      } else if (data.c && pc) { if (pc.remote) await pc.addIceCandidate(data.c).catch(() => {}); else pc.cands.push(data.c); }
    } catch (e) { console.warn('signal', e); }
  },
  /* وقتی با همه وصل شد به سرور خبر می‌دهد تا بازی با کیفیت ویس کامل شروع شود */
  check() {
    if (!LOBBY || this.meshSent || LOBBY.state !== 'prepare') return;
    const need = LOBBY.players.length - 1;
    const ok = Object.values(this.pcs).filter(pc => pc.connectionState === 'connected').length;
    if (ok >= need) { this.meshSent = true; WS.send({ t:'mesh_ready' }); }
  },
  close(id) { try { this.pcs[id]?.close(); } catch (e) {} delete this.pcs[id]; const a = this.auds[id]; if (a) { a.srcObject = null; a.remove(); delete this.auds[id]; } },
  stop(keepMesh) {
    Object.keys(this.pcs).forEach(id => this.close(id));
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    try { this.ac?.close(); } catch (e) {} this.ac = this.an = this.buf = null; this.meshSent = false; this.myTurn = false;
  },
  /* فقط در نوبت صحبت خودم میکروفن باز است (مگر اینکه بی‌صدا کرده باشم) */
  gate() {
    if (!this.stream || !G) return;
    const me = P(G.me), turn = ['day','sword'].includes(G.phase) && G.cur === G.me && me.alive;
    this.myTurn = turn; this.stream.getAudioTracks().forEach(t => t.enabled = turn && this.micOn);
  },
  level() { if (!this.an) return 0; this.an.getByteFrequencyData(this.buf); return this.buf.reduce((a, b) => a + b, 0) / this.buf.length; }
};
window.MF_Voice = Voice;
window.toggleMic = () => {
  if (!G) return; Voice.micOn = !Voice.micOn; Voice.gate();
  const b = $('micBtn'); if (b) { b.textContent = Voice.micOn ? '🎤' : '🔇'; b.style.background = Voice.micOn ? 'var(--green)' : ''; }
  showToast(Voice.micOn ? 'میکروفن فعال شد (در نوبت خودت صحبت کن)' : 'میکروفن بی‌صدا شد');
};
setInterval(() => {
  if (!G || !Voice.stream) return;
  document.querySelector(`.seat[data-id="${G.me}"] .avatar-wrap`)?.classList.toggle('voice', Voice.myTurn && Voice.micOn && Voice.level() > 20);
}, 150);

/* ============================================================
   ۳) لابی انتظار — تا پر شدن اتاق و تأیید ویس همه
   ============================================================ */
function renderWaiting() {
  if (!LOBBY || G) return;
  const L = LOBBY, meP = L.players.find(p => p.pid === PID), ok = L.players.filter(p => p.mic).length;
  const slots = Array.from({ length:L.n }, (_, i) => {
    const p = L.players[i];
    if (!p) return `<div class="wslot empty"><div class="wav">?</div><b>منتظر بازیکن…</b><span class="wst">—</span></div>`;
    const fr = p.frame ? `<img class="frm" src="${esc(p.frame)}" onerror="this.remove()">` : '';
    const st = p.mic ? `<span class="wst ok">🎤 ویس تأیید شد</span>` : `<span class="wst wait">⏳ تأیید میکروفن… <b class="cdn" data-left="${p.left}">${Math.ceil(p.left / 1000)}</b>ث</span>`;
    return `<div class="wslot ${p.pid === PID ? 'me' : ''} ${p.mic ? 'good' : ''}"><div class="wav"><img src="${esc(p.avatar)}" onerror="this.style.visibility='hidden'">${fr}</div><b>${esc(p.name)}${p.pid === L.host && L.private ? ' 👑' : ''}</b>${st}</div>`;
  }).join('');
  const msg = L.state === 'prepare' ? '✅ همه‌ی ویس‌ها تأیید شد — در حال برقراری ارتباط صوتی؛ چند لحظه‌ی دیگر بازی شروع می‌شود…'
    : L.players.length < L.n ? `منتظر ${L.n - L.players.length} بازیکن دیگر… (بازی فقط با ${L.n} نفر کامل شروع می‌شود)`
    : 'اتاق پر شد؛ منتظر تأیید میکروفن همه‌ی بازیکن‌ها…';
  const mine = meP && !meP.mic ? `<div class="wnote warn">🎤 مرورگر از شما اجازه‌ی میکروفن می‌خواهد؛ «Allow» را بزنید. فقط <b class="cdn" data-left="${meP.left}">${Math.ceil(meP.left / 1000)}</b> ثانیه فرصت دارید وگرنه از اتاق حذف می‌شوید.</div>` : '';
  render(`
    <div class="home wait">
      <div class="wbox">
        <h2 class="gt" style="text-align:center;margin:0">${L.private ? `لابی خصوصی — کد <span class="wcode">${esc(L.code)}</span>` : (L.mode === 'vip' ? '👑 روم VIP' : '⚔️ روم عادی')}</h2>
        <p class="wcount">${L.players.length}/${L.n} بازیکن • 🎤 ${ok}/${L.n} ویس تأیید شده</p>
        <div class="wbar"><i style="width:${L.players.length / L.n * 100}%"></i></div>
        <p class="wmsg">${msg}</p>
        ${mine}
        <div class="wgrid">${slots}</div>
        <p class="wrule">قانون: ویس چت اجباری است. هر بازیکن ۱۵ ثانیه بعد از ورود برای تأیید میکروفن فرصت دارد؛ در غیر این صورت از اتاق حذف می‌شود. بازی فقط وقتی شروع می‌شود که اتاق پر باشد و ویس همه تأیید شده باشد.</p>
        <button class="ghost" style="width:100%" onclick="exitGame()">خروج از لابی</button>
      </div>
    </div>`);
}
setInterval(() => {
  if (!LOBBY || G) return;
  const dt = Date.now() - LOBBY.at;
  document.querySelectorAll('.cdn').forEach(e => e.textContent = Math.max(0, Math.ceil((+e.dataset.left - dt) / 1000)));
}, 250);

/* ============================================================
   ۴) شروع بازی و دریافت وضعیت از سرور
   ============================================================ */
function beginGame(m) {
  if (cfg.tokens >= COST) { cfg.tokens -= COST; syncUser(); saveCfg(); }
  LOBBY = null;
  G = { gid:Date.now(), mode:m.mode, n:m.n, me:m.me, roomCode:m.code, phase:'deal', day:1, t:0, cur:-1, role:null, charmNow:null,
    players:m.players.map(p => ({ ...p, alive:true, talking:false, online:true, mate:false })),
    link:[], jlink:[], steps:[], stepI:0, voted:false, hasGun:false, usedDuel:false, isHolder:false, canKick:false,
    sel:[], chat:[], shown:0, sig:'', fresh:[], rev:0, carded:false };
  buildRoom();
  $('micBtn').textContent = Voice.micOn ? '🎤' : '🔇';
}

function applyState(v) {
  if (!G) return;
  const old = G.players, selKey = G.phase + ':' + G.day + ':' + G.stepI;
  v.players.forEach((p, i) => { if (old[i] && old[i].alive && !p.alive) { G.fresh.push(i); setTimeout(() => { if (G) { G.fresh = G.fresh.filter(x => x !== i); G.rev++; updateRoom(); } }, 2300); } });
  const prevPhase = G.phase;
  Object.assign(G, v);
  if (selKey !== G.phase + ':' + G.day + ':' + G.stepI) G.sel = [];
  if (!G.carded && G.role) { G.carded = true; showCard(); }
  if (prevPhase === 'deal' && G.phase !== 'deal') document.querySelector('.cardov')?.remove();
  updateRoom(); Voice.gate();
}

function fxMsg(m) {
  if (!G) return;
  if (m.k === 'banner') banner(m.text, m.e, m.c);
  else if (m.k === 'gun') gunFx(m.by, m.to);
  else if (m.k === 'emoji') emoji(m.id, m.e);
}

/* ============================================================
   ۵) نمایش اتاق بازی (همان ظاهر قبلی)
   ============================================================ */
function showCard() {
  if (!G || !G.role) return;
  const me = P(G.me), r = RL[me.role], o = document.createElement('div'); o.className = 'cardov';
  o.innerHTML = `<div class="cscene"><div class="card3d"><div class="cf cback">🏛️</div><div class="cf cfront">${cardImg(cardNo(me), r.e, r.n)}</div></div><h2 class="gt">${r.n}</h2><p class="ct ${r.t}">${TN[r.t]}</p><p class="cd">${r.d}</p><button class="gb" id="cok">متوجه شدم</button></div>`;
  document.querySelector('.stage').appendChild(o); setTimeout(() => o.classList.add('flip'), 700);
  o.querySelector('#cok').onclick = () => o.remove();
}
window.showCard = () => G && G.role && showCard();

function banner(t, e, c) {
  const s = document.querySelector('.stage'); if (!s) return;
  try { playSfx(c === 'nb' ? 'night' : e === '🗳️' ? 'vote' : 'day'); } catch (_) {}
  const b = document.createElement('div'); b.className = 'ban ' + c + ((e === '🌙' || e === '☀️') ? ' dnb' : '');
  b.innerHTML = (e === '🌙' || e === '☀️')
    ? `<div class="dn ${e === '🌙' ? 'n' : 'd'}"><div class="dnw"><img src="daynight.jpg" alt="" onerror="this.outerHTML='<span>${e}</span>'"><i></i></div><b class="gt">${t}</b></div>`
    : `<div><span>${e}</span><b class="gt">${t}</b></div>`;
  s.appendChild(b); setTimeout(() => b.remove(), 2200);
}

window.buildRoom = function () {
  document.body.classList.add('in-room');
  app.innerHTML = `<div class="stage ${G.mode === 'vip' ? 'vip' : ''} ${G.n > 10 ? 'n16' : ''}">
  <div class="panel plhead"><span>👥 PLAYERS</span><span id="plcount"></span></div><div class="panel plist" id="plist"></div>
  <div class="topbtns"><button class="ghost" id="micBtn" onclick="toggleMic()">🎤</button><button class="ghost" id="sndBtn" onclick="toggleSound(!cfg.soundEnabled)">${cfg.soundEnabled ? '🔊' : '🔇'}</button><button class="ghost" onclick="toggleFull()">⛶</button><button class="ghost" onclick="showReportModal()">🚨</button><button class="ghost" onclick="confirm('خروج از بازی؟')&&exitGame()">✖</button></div>
  <div class="panel phase"><div style="font-size:calc(var(--u)*2)">⏳</div><div class="big" id="dayN"></div><div class="tm" id="tm"></div><div id="phs"></div></div>
  <div id="seats"></div><div id="fx"></div><div class="roles" id="roles" onclick="showCard()"></div><div class="spec" id="spec">👁️ تماشاچی</div>
  <div class="panel chat"><div class="chat-box" id="chatbox"></div><div class="sticker-bar">${['😂','😡','🤔','👍','👎','🎯'].map(s => `<span onclick="sendSticker('${s}')">${s}</span>`).join('')}</div><form onsubmit="sendMsg();return false"><input id="msgIn" autocomplete="off" placeholder="پیام..."><button class="gb">➤</button></form></div>
  <div class="acts" id="acts"></div></div>`;
  updateRoom();
};

window.updateRoom = function () {
  if (!G || !$('seats')) return;
  const me = P(G.me), ph = G.phase, st = document.querySelector('.stage');
  st.classList.toggle('night', ph === 'night'); st.classList.toggle('spectator', !me.alive); $('spec').style.display = me.alive ? 'none' : 'block';
  const sig = JSON.stringify([G.players.map(p => [p.talking, p.alive, p.online, p.mate]), G.sel, ph, G.day, G.voted, G.rev, G.cur, G.stepI, G.steps.length, G.hasGun, G.charmNow, G.link, G.jlink, G.canKick, G.isHolder, G.usedDuel, me.role]);
  if (sig !== G.sig) {
    G.sig = sig;
    $('plcount').textContent = `${al().length}/${G.n}`; $('dayN').textContent = `DAY ${G.day}`;
    $('plist').innerHTML = G.players.map(p => `<div class="pl ${G.canKick ? 'is-host' : ''} ${p.talking ? 'tk' : ''} ${G.sel.includes(p.id) ? 'sel' : ''} ${p.alive ? '' : 'dead'}" onclick="selectPlayer(${p.id})"><span class="av"><img src="${esc(p.avatar)}" onerror="this.style.visibility='hidden'"></span><span>${String(p.id + 1).padStart(2, '0')} ${tag(p)}${esc(p.name)}${p.online ? '' : ' 📴'}</span>${p.talking ? '<i>👑</i>' : ''}${G.canKick && p.id !== G.me && p.alive ? `<span class="host-kick" onclick="event.stopPropagation();confirm('این بازیکن از بازی حذف شود؟')&&kickPlayer(${p.id})">❌</span>` : ''}</div>`).join('');
    const lkOk = ph === 'day' && me.alive && G.charmNow !== G.me;
    $('seats').innerHTML = G.players.map(p => {
      const [x, y] = pos(p.id), lk = lkOk && p.alive && p.id !== G.me ? '' : 'disabled';
      return `<div class="seat ${p.id === G.me ? 'me' : ''} ${G.sel.includes(p.id) ? 'sel' : ''}" data-id="${p.id}" style="left:${x}%;top:${y}%" onclick="selectPlayer(${p.id})"><div class="avatar-wrap ${p.talking ? 'talking' : ''} ${p.alive ? '' : 'dead'} ${p.online ? '' : 'off'} ${G.fresh.includes(p.id) ? 'fresh' : ''}"><img src="${esc(p.avatar)}" onerror="this.style.visibility='hidden'">${p.frame ? `<img class="frm" src="${esc(p.frame)}" onerror="this.remove()">` : ''}<div class="mic-icon ${p.talking ? 'on' : ''}">🎤</div></div><div class="seat-name"><b class="snum">${p.id + 1}</b>${tag(p)}${esc(p.name)}</div><div class="interaction-bar"><button ${lk} onclick="event.stopPropagation();giveLike(${p.id},1)">👍</button><button ${lk} onclick="event.stopPropagation();giveLike(${p.id},-1)">👎</button></div></div>`;
    }).join('');
    const hl = { night:'night', day:'day', sword:'day', swordpick:'day', voting:'voting', result:'result', deal:'day' }[ph];
    $('phs').innerHTML = PHASES.map(([k, e, n]) => `<div class="ph ${hl === k ? 'on' : ''}">${e} ${n}</div>`).join('');
    if (me.role) { const r = RL[me.role]; $('roles').innerHTML = `<div class="mytile">${cardImg(cardNo(me), r.e, r.n)}<div><b>${r.e} ${r.n}</b><small>${TN[r.t]}</small></div></div>`; }
    const A = [], s = G.steps[G.stepI], myTurn = G.cur === G.me && me.alive;
    if (ph === 'voting') A.push(['🗳️ رأی', 'castVote()', !(me.alive && !G.voted && G.sel.length === 1 && G.charmNow !== G.me)]);
    if (ph === 'night' && me.alive) A.push([s ? `🌙 ${LB[s.a]}${s.need > 1 ? ` (${G.sel.length}/${s.need})` : ''}` : '🌙 منتظر سپیده‌دم...', 'nightAct()', !(s && G.sel.length === s.need)]);
    if (ph === 'swordpick' && G.isHolder) A.push(['⚔️ حذف با شمشیر', 'swordPick()', G.sel.length !== 1]);
    if (ph === 'day' && myTurn) { if (G.hasGun) A.push(['🔫 شلیک با گان', 'useGun()', G.sel.length !== 1]); if (me.role === 'gladiator' && !G.usedDuel) A.push(['⚔️ دوئل', 'useDuel()', G.sel.length !== 1]); }
    if ((ph === 'day' || ph === 'sword') && (myTurn || G.canKick)) A.push(['⏭️ رد کردن نوبت', 'skipTurn()', false]);
    $('acts').innerHTML = A.map(([t, f, d], i) => `<button class="${i ? 'ghost' : 'gb'}" onclick="${f}" ${d ? 'disabled' : ''}>${t}</button>`).join('');
  }
  const timed = ['deal','day','sword','voting','night','swordpick'].includes(ph) && !(['day','sword'].includes(ph) && G.cur === -1);
  $('tm').textContent = timed ? `00:${String(Math.max(0, G.t)).padStart(2, '0')}` : '--:--';
  if (G.shown !== G.chat.length) {
    G.shown = G.chat.length; const b = $('chatbox');
    b.innerHTML = G.chat.map(m => `<div class="msg ${m.sys ? 'sys' : ''} ${m.mafia ? 'mafia' : ''}">${m.sys || m.mafia ? '' : `<b>${esc(m.from)}:</b> `}${m.mafia ? `<b>${esc(m.from)}:</b> ` : ''}${esc(m.text)}</div>`).join('');
    b.scrollTop = b.scrollHeight;
  }
};

/* ---------- افکت‌ها ---------- */
function gunFx(a, b) {
  const s = document.querySelector('.stage'), f = $('fx'); if (!s || !f) return;
  const [x1, y1] = pos(a), [x2, y2] = pos(b), ang = Math.atan2((y2 - y1) * s.clientHeight, (x2 - x1) * s.clientWidth) * 180 / Math.PI + 25;
  const g = document.createElement('div'); g.className = 'gunfx'; g.style.cssText = `left:${x1 + (x2 - x1) * .3}%;top:${y1 + (y2 - y1) * .3}%;--r:${ang}deg`;
  g.innerHTML = '<img src="gun.png" onerror="this.outerHTML=\'🔫\'"><i></i>'; f.appendChild(g); setTimeout(() => g.remove(), 1500);
  setTimeout(() => { s.classList.add('shake'); const h = document.createElement('div'); h.className = 'hitfx'; h.style.cssText = `left:${x2}%;top:${y2}%`; f.appendChild(h); setTimeout(() => { h.remove(); s.classList.remove('shake'); }, 800); }, 750);
}
function emoji(id, e) { const [x, y] = pos(id), d = document.createElement('div'); d.className = 'fl'; d.textContent = e; d.style.cssText = `left:${x}%;top:${y - 5}%`; $('fx')?.appendChild(d); setTimeout(() => d.remove(), 2000); }

/* ---------- اکشن‌های بازیکن (همه از طریق سرور) ---------- */
window.selectPlayer = function (id) {
  if (!G) return; const me = P(G.me), p = P(id), ph = G.phase; if (!me.alive || !p.alive) return;
  let need = 1;
  if (ph === 'night') {
    const s = G.steps[G.stepI]; if (!s) return; need = s.need;
    if (id === G.me) return toast('خودت را نمی‌توانی انتخاب کنی');
    if ((s.a === 'kill' || s.a === 'duel1') && p.mate) return toast('هم‌تیمی است');
  } else if (ph === 'voting') {
    if (id === G.me) return toast('به خودت رأی نده'); if (G.voted || G.charmNow === G.me) return;
  } else if (ph === 'swordpick') { if (!G.isHolder || !G.jlink.includes(id) || id === G.me) return; }
  else if (ph === 'day') { if (id === G.me) return; }
  else return;
  const i = G.sel.indexOf(id); if (i >= 0) G.sel.splice(i, 1); else { if (G.sel.length >= need) G.sel.shift(); G.sel.push(id); }
  G.rev++; updateRoom();
};
window.castVote = function () { if (!G || G.phase !== 'voting' || G.voted) return; if (G.sel.length !== 1) return toast('یک بازیکن انتخاب کنید'); WS.send({ t:'vote', target:G.sel[0] }); G.voted = true; G.sel = []; G.rev++; updateRoom(); };
window.nightAct = function () { const s = G.steps[G.stepI]; if (G.phase !== 'night' || !s || G.sel.length !== s.need) return; WS.send({ t:'night', targets:[...G.sel] }); G.sel = []; G.rev++; updateRoom(); };
window.useGun = function () { if (G.sel.length !== 1) return; WS.send({ t:'gun', target:G.sel[0] }); G.sel = []; G.rev++; updateRoom(); };
window.useDuel = function () { if (G.sel.length !== 1) return; WS.send({ t:'duel', target:G.sel[0] }); G.sel = []; G.rev++; updateRoom(); };
window.swordPick = function () { if (G.sel.length !== 1) return; WS.send({ t:'swordpick', target:G.sel[0] }); G.sel = []; G.rev++; updateRoom(); };
window.skipTurn = function () { WS.send({ t:'skip' }); };
window.kickPlayer = id => WS.send({ t:'kick', target:id });
window.giveLike = (id, v) => { if (G && G.phase === 'day') WS.send({ t:'like', target:id, v }); };
window.sendMsg = function () { const i = $('msgIn'), t = i.value.trim(); if (!t || !G) return; WS.send({ t:'chat', text:t }); i.value = ''; };
window.sendSticker = s => G && WS.send({ t:'chat', text:s });

window.exitGame = function () {
  WS.send({ t:'leave' }); Voice.stop(); G = null; LOBBY = null;
  document.body.classList.remove('in-room'); showLobby();
};

/* ---------- پایان بازی ---------- */
function showEnd(m) {
  if (!G) return; const me = P(G.me); G.phase = 'ended';
  const roles = {}; m.roles.forEach(r => roles[r.id] = r.role); G.players.forEach(p => p.role = roles[p.id]);
  const won = RL[roles[G.me]].t === m.w;
  cfg.games++; if (won) { cfg.wins++; cfg.coins += 100; }
  (cfg.history = cfg.history || []).push({ t:Date.now(), role:RL[roles[G.me]].n, won, w:m.w, n:G.n, mode:G.mode }); cfg.history = cfg.history.slice(-30);
  syncUser(); saveCfg();
  const o = document.createElement('div'); o.className = 'end';
  o.innerHTML = `<div><h2 class="gt">${{ mafia:'مافیا برنده شد', town:'شهر برنده شد', solo:'جلاد برنده شد' }[m.w]}</h2><p style="color:var(--gold)">${won ? '🏆 پیروز شدید! (+۱۰۰ سکه)' : '💀 باختید'}</p><div class="rv">${G.players.map(p => `<span class="${RL[p.role].t}">${p.id + 1}. ${esc(p.name)}: ${RL[p.role].n}</span>`).join('')}</div><button class="gb" onclick="exitGame()">بازگشت به لابی</button></div>`;
  document.querySelector('.stage')?.appendChild(o);
}

/* ============================================================
   ۶) لابی / پروفایل / ساخت و ورود با کد
   ============================================================ */
const _sl = window.showLobby;
window.showLobby = function () {
  window.ROOM_N = 10; _sl();
  const g = document.querySelector('.gift-bar');
  if (g) { const n = g.nextElementSibling; if (n && !n.classList.contains('gift-bar') && /کد دعوت/.test(n.textContent)) n.remove(); g.remove(); }
  document.querySelector('.home h1.gt')?.insertAdjacentHTML('beforebegin', '<img src="logo.png" class="lobolo" onerror="this.remove()">');
};
const _sp = window.showProfile;
window.showProfile = function () {
  _sp(); const h = [...document.querySelectorAll('.home h3')].find(x => /آواتار/.test(x.textContent));
  h?.insertAdjacentHTML('beforebegin', cfg.referredBy ? `<div class="refdone">✅ کد دعوت قبلاً استفاده شده (${esc(cfg.referredBy)})</div>`
    : `<div class="gift-bar" style="margin-bottom:12px"><span>🎁 کد دعوت:</span><input type="text" id="refCode" placeholder="ID دوست خود را وارد کنید" autocomplete="off"><button class="gb" onclick="applyReferral()">دریافت ۵۰۰ سکه</button></div>`);
};
const _ar = window.applyReferral;
window.applyReferral = function () { const had = cfg.referredBy; _ar(); if (!had && cfg.referredBy) showProfile(); };

window.showCreateRoom = function () {
  window.ROOM_N = 10;
  render(`
    <div class="home" style="justify-content:center;align-items:center">
      <div class="settings-card" style="max-width:400px;width:100%;text-align:center">
        <h2 class="gt">ساخت لابی</h2>
        <p style="color:var(--mute);margin:6px 0;font-size:.85rem">کد اتاق بعد از ساخت نمایش داده می‌شود؛ آن را برای دوستانتان بفرستید. شما سازنده‌ی لابی هستید و فقط شما می‌توانید بازیکنی را از بازی حذف کنید.</p>
        <div class="szrow"><button class="gb" id="n10" onclick="ROOM_N=10;this.className='gb';n16.className='ghost'">۱۰ نفره</button><button class="ghost" id="n16" onclick="ROOM_N=16;this.className='gb';n10.className='ghost'">۱۶ نفره</button></div>
        <input type="text" id="roomPass" placeholder="رمز (اختیاری)" maxlength="12" style="width:100%;margin:8px 0">
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <button class="gb" style="flex:1" onclick="Online.create(ROOM_N,'normal',$('roomPass').value)">عادی<br><small>(۱ توکن)</small></button>
          <button class="gb" style="flex:1;background:linear-gradient(180deg,#e8c46a,#8b1e1e);color:#fff" onclick="Online.create(ROOM_N,'vip',$('roomPass').value)">VIP<br><small>(۳ توکن)</small></button>
        </div>
        <button class="ghost" style="width:100%" onclick="showLobby()">بازگشت</button>
      </div>
    </div>`);
};
window.showJoinRoom = function () {
  render(`
    <div class="home" style="justify-content:center;align-items:center">
      <div class="settings-card" style="max-width:380px;width:100%;text-align:center">
        <h2 class="gt">ورود به لابی</h2>
        <input type="text" id="joinCode" placeholder="کد ۴ رقمی" maxlength="4" inputmode="numeric" style="width:100%;margin:8px 0;text-align:center;font-size:1.4rem;letter-spacing:6px">
        <input type="text" id="joinPass" placeholder="رمز (در صورت وجود)" maxlength="12" style="width:100%;margin:8px 0">
        <button class="gb" style="width:100%" onclick="joinGame()">ورود</button>
        <button class="ghost" style="width:100%;margin-top:8px" onclick="showLobby()">بازگشت</button>
      </div>
    </div>`);
};
window.joinGame = function () {
  const code = $('joinCode').value.trim();
  if (!/^\d{4}$/.test(code)) return toast('کد باید ۴ رقم باشد');
  Online.join(code, $('joinPass').value);
};
})();
