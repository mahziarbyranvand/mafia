'use strict';
/* ============================================================
   MAFIA ARENA — موتور بازی سمت سرور (فقط بازیکن واقعی، بدون ربات)
   سرور تنها مرجع است: نقش‌ها، رأی‌ها و اکشن‌های شب فقط اینجا نگه‌داری می‌شوند
   و هر بازیکن فقط اطلاعاتی را می‌گیرد که حق دیدنش را دارد.
   ============================================================ */

const RL = {
  lord:{t:'mafia',a:'kill',n:'ارباب تیرد'},
  detective:{t:'town',a:'inq',n:'کاراگاه'},
  gladiator:{t:'town',n:'گلادیاتور'},
  executioner:{t:'solo',a:'link4',n:'جلاد'},
  armor:{t:'town',n:'زره‌پوش'},
  sniper:{t:'town',a:'shot',once:1,n:'تک‌تیرانداز'},
  charmer:{t:'mafia',a:'charm',n:'افسونگر'},
  knight:{t:'town',a:'gun',n:'شوالیه‌ساز'},
  shadow:{t:'mafia',a:'duel1',once:1,n:'گلادیاتور سایه'},
  oracle:{t:'town',a:'link',n:'پیشگو'},
  traitor:{t:'mafia',a:'steal',n:'خیانت‌کار'},
  smafia:{t:'mafia',n:'مافیای ساده'},
  citizen:{t:'town',n:'شهروند ساده'}
};
const LB = {kill:'شلیک',inq:'استعلام',link4:'لینک ۴ نفر',shot:'شلیک',charm:'افسون',gun:'دادن گان',duel1:'دوئل سایه',link:'بیدار کردن',steal:'دزدیدن نقش'};

const rnd = a => a[Math.floor(Math.random() * a.length)];
const shuf = a => a.map(x => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map(x => x[1]);

function compose(n) {
  const M = n === 16 ? ['lord','charmer','shadow','traitor','smafia'] : ['lord', ...shuf(['charmer','shadow','traitor','smafia']).slice(0, 2)];
  const S = ['detective','gladiator','executioner','armor','sniper','knight','oracle'];
  const o = n === 16 ? [...S,'citizen','citizen','citizen','citizen']
    : ['detective','knight', ...shuf(['gladiator','executioner','armor','sniper','oracle','citizen','citizen']).slice(0, 5)];
  return shuf([...M, ...o]);
}

class Game {
  /* seats: [{pid,name,avatar,frame}] به ترتیب صندلی ؛ room: برای ارسال پیام */
  constructor(room, seats, mode, fast) {
    this.room = room; this.mode = mode; this.n = seats.length; this.fast = !!fast;
    const f = this.fast;
    this.D = { deal:f?3:8, speak:f?3:30, sword:f?2:20, vote:f?5:15, night:f?6:25, nightIdle:f?2:5, swordpick:f?3:12, k:f?0.2:1 };
    const roles = compose(this.n);
    this.p = seats.map((s, i) => ({ id:i, pid:s.pid, name:s.name, avatar:s.avatar, frame:s.frame, role:roles[i], alive:true, talking:false, online:true }));
    this.phase = 'deal'; this.day = 1; this.t = this.D.deal; this.cur = -1;
    this.queue = []; this.guns = []; this.used = {}; this.link = []; this.jlink = []; this.sword = null; this.holder = null;
    this.charmed = null; this.charmNow = null; this.lastSteal = null; this.votes = {}; this.picks = []; this.ns = [];
    this.likeCd = {}; this.over = false; this.gen = 0;
    this.iv = setInterval(() => this.tick(), 1000);
  }

  /* ---------- ابزار ---------- */
  T(p) { return RL[p.role].t; }
  al() { return this.p.filter(p => p.alive); }
  knows(v, p) { return this.T(v) === 'mafia' && this.T(p) === 'mafia' && (v.id === p.id || v.role !== 'traitor'); }
  later(fn, ms) { const g = this.gen; setTimeout(() => { if (!this.over && this.gen === g) fn(); }, ms * this.D.k); }
  sendSeat(i, msg) { const p = this.p[i]; if (p && p.online) this.room.sendPid(p.pid, msg); }
  all(msg) { this.p.forEach(p => p.online && this.room.sendPid(p.pid, msg)); }
  say(text, to) { this.chat('', text, { sys:true, to }); }      // پیام سیستمی (to: آرایه‌ی صندلی‌ها یا همه)
  chat(from, text, o = {}) {
    const m = { from, text, sys:!!o.sys, mafia:!!o.mafia };
    if (o.to) o.to.forEach(i => this.sendSeat(i, { t:'chat', m })); else this.all({ t:'chat', m });
  }
  fx(msg) { this.all({ t:'fx', ...msg }); }
  hostSeat() { const r = this.room; if (!r.private) return -1; return this.p.findIndex(p => p.pid === r.hostPid); }

  view(i) {
    const me = this.p[i], ended = this.phase === 'end', night = this.phase === 'night';
    return {
      phase:this.phase, day:this.day, t:this.t, cur:this.cur, me:i, role:me.role, charmNow:this.charmNow,
      players:this.p.map(p => ({ id:p.id, name:p.name, avatar:p.avatar, frame:p.frame, alive:p.alive, talking:p.talking, online:p.online,
        mate:p.id !== i && this.knows(me, p), role:(ended || p.id === i) ? p.role : undefined })),
      link:this.link.includes(i) ? this.link.slice() : [],
      jlink:['sword','swordpick'].includes(this.phase) ? this.jlink.slice() : [],
      isHolder:this.phase === 'swordpick' && this.holder === i,
      hasGun:this.guns.includes(i), usedDuel:!!this.used.duel,
      steps:night && me.alive ? this.ns[i].list : [], stepI:night && me.alive ? this.ns[i].i : 0,
      voted:this.votes[i] !== undefined,
      canKick:this.hostSeat() === i
    };
  }
  push() { this.p.forEach(p => p.online && this.room.sendPid(p.pid, { t:'state', v:this.view(p.id) })); }

  begin() {
    this.p.forEach(p => {
      if (this.T(p) === 'mafia') {
        this.sendSeat(p.id, { t:'chat', m:{ sys:true, from:'', text: p.role === 'traitor' ? 'همه‌ی مافیاها تو را می‌شناسند، اما تو آن‌ها را نمی‌شناسی.'
          : 'هم‌تیمی‌ها: ' + this.p.filter(q => q.id !== p.id && this.T(q) === 'mafia').map(q => q.name).join('، ') } });
      }
    });
    this.say('بازی شروع شد! کارت نقش خود را ببینید.');
    this.push();
  }

  tick() {
    if (this.over) return;
    switch (this.phase) {
      case 'deal': if (--this.t <= 0) this.startDay(); break;
      case 'day': case 'sword': {
        if (this.cur === -1) break;           // منتظر شروع نفر بعدی
        const sp = this.p[this.cur];
        if (sp && !sp.online && this.t > 2) this.t = 2;
        if (--this.t <= 0) this.nextSpeaker();
        break;
      }
      case 'voting': if (--this.t <= 0) this.finishVoting(); break;
      case 'night': if (--this.t <= 0) this.resolveNight(); break;
      case 'swordpick': if (--this.t <= 0) { const c = this.jlink.filter(i => this.p[i].alive && i !== this.holder); this.swordResolve(c.length ? rnd(c) : this.holder); } break;
    }
    if (!this.over) this.push();
  }

  /* ---------- مرگ و برخورد ---------- */
  die(id) {
    const p = this.p[id]; if (!p.alive) return;
    p.alive = false; p.talking = false;
    this.guns = this.guns.filter(x => x !== id); this.queue = this.queue.filter(x => x !== id); this.link = this.link.filter(x => x !== id);
    if (this.cur === id && ['day','sword'].includes(this.phase)) this.later(() => { if (this.cur === id) this.nextSpeaker(); }, 1200);
  }
  hit(id, src) {
    const p = this.p[id]; if (!p.alive) return false;
    if (src === 'shot' && p.role === 'armor' && !this.used.armor) { this.used.armor = 1; this.say('🛡️ کسی از شلیک جان سالم به در برد!'); return false; }
    this.die(id); return true;
  }

  /* ---------- روز ---------- */
  startDay() {
    this.gen++; this.phase = 'day'; this.votes = {}; this.charmNow = this.charmed; this.charmed = null;
    this.fx({ k:'banner', text:`روز ${this.day}`, e:'☀️', c:'db' }); this.say(`روز ${this.day} آغاز شد.`);
    if (this.charmNow != null) this.say(`🪄 ${this.p[this.charmNow].name} افسون شده و امروز ساکت است.`);
    this.queue = this.al().filter(p => p.id !== this.charmNow).map(p => p.id);
    this.cur = -1; this.t = 2; this.push(); this.later(() => this.nextSpeaker(), 1800);
  }
  nextSpeaker() {
    this.p.forEach(p => p.talking = false);
    let id = null;
    while (this.queue.length) { const c = this.queue.shift(); if (this.p[c].alive) { id = c; break; } }
    if (id == null) { this.cur = -1; return this.phase === 'sword' ? this.revealSword() : this.startVoting(); }
    this.cur = id; this.p[id].talking = true; this.t = this.phase === 'sword' ? this.D.sword : this.D.speak;
    this.push();
  }
  skip(seat) {
    if (!['day','sword'].includes(this.phase)) return;
    if (seat === this.cur || seat === this.hostSeat()) this.nextSpeaker();
  }
  gun(seat, tgt) {
    const p = this.p[seat], t = this.p[tgt];
    if (this.phase !== 'day' || this.cur !== seat || !p.alive) return this.err(seat, 'فقط در نوبت صحبت خودت');
    if (!this.guns.includes(seat)) return this.err(seat, 'گان نداری');
    if (!t || !t.alive || tgt === seat) return this.err(seat, 'هدف نامعتبر');
    this.guns = this.guns.filter(x => x !== seat);
    this.fx({ k:'gun', by:seat, to:tgt }); this.say(`🔫 ${p.name} با گان به ${t.name} شلیک کرد!`); this.push();
    this.later(() => { this.hit(tgt, 'shot'); this.push(); this.later(() => this.checkWin(), 1500); }, 900);
  }
  duel(seat, tgt) {
    const p = this.p[seat], t = this.p[tgt];
    if (this.phase !== 'day' || this.cur !== seat || !p.alive) return this.err(seat, 'فقط در نوبت صحبت خودت');
    if (p.role !== 'gladiator' || this.used.duel) return this.err(seat, 'دوئل ممکن نیست');
    if (!t || !t.alive || tgt === seat) return this.err(seat, 'هدف نامعتبر');
    this.used.duel = 1;
    this.say(`⚔️ ${p.name} ${t.name} را به دوئل کشید!`); this.fx({ k:'emoji', id:seat, e:'⚔️' }); this.fx({ k:'emoji', id:tgt, e:'⚔️' }); this.push();
    this.later(() => {
      const l = this.T(t) === 'mafia' ? tgt : seat; this.die(l);
      this.say(`${this.p[l].name} در دوئل حذف شد!`); this.push(); this.later(() => this.checkWin(), 1500);
    }, 1000);
  }
  err(seat, m) { this.sendSeat(seat, { t:'err', m }); }

  /* ---------- رأی‌گیری ---------- */
  voters() { return this.al().filter(p => p.id !== this.charmNow); }
  startVoting() {
    this.gen++; this.phase = 'voting'; this.votes = {}; this.t = this.D.vote; this.cur = -1;
    this.fx({ k:'banner', text:'رأی‌گیری', e:'🗳️', c:'db' }); this.say('زمان رأی‌گیری! روی یک بازیکن کلیک کنید و رأی را تأیید کنید.'); this.push();
  }
  vote(seat, tgt) {
    const p = this.p[seat], t = this.p[tgt];
    if (this.phase !== 'voting' || !p.alive || seat === this.charmNow) return;
    if (this.votes[seat] !== undefined) return;
    if (!t || !t.alive || tgt === seat) return this.err(seat, 'هدف نامعتبر');
    this.votes[seat] = tgt; this.say(`شما به ${t.name} رأی دادید.`, [seat]); this.push();
    if (this.voters().filter(v => v.online).every(v => this.votes[v.id] !== undefined)) this.later(() => this.finishVoting(), 700);
  }
  finishVoting() {
    if (this.phase !== 'voting') return; this.gen++;
    const cnt = {}; Object.values(this.votes).forEach(v => cnt[v] = (cnt[v] || 0) + 1);
    const mx = Math.max(0, ...Object.values(cnt)), top = Object.keys(cnt).filter(k => cnt[k] === mx && this.p[+k].alive);
    this.phase = 'result';
    if (top.length === 1 && mx > 0) { this.die(+top[0]); this.say(`${this.p[+top[0]].name} با رأی اکثریت اعدام شد! (${mx} رأی)`); }
    else this.say('آرا مساوی بود؛ کسی اعدام نشد.');
    this.push(); this.later(() => { if (!this.checkWin()) this.startNight(); }, 3500);
  }

  /* ---------- شب ---------- */
  shooterOf() { return ['lord','smafia','charmer','shadow','traitor'].map(r => this.al().find(p => p.role === r)).find(Boolean); }
  needOf(a) { return a === 'link4' ? Math.max(1, Math.min(4, this.al().length - 1)) : 1; }
  mkSteps(p) {
    const r = RL[p.role], S = []; if (!p.alive) return S;
    if (r.a && r.a !== 'kill' && !(r.once && this.used[p.role])) S.push({ a:r.a, need:this.needOf(r.a) });
    if (this.shooterOf() === p) S.push({ a:'kill', need:1 });
    return S;
  }
  startNight() {
    this.gen++; this.phase = 'night'; this.votes = {}; this.picks = []; this.jlink = []; this.sword = null; this.cur = -1;
    this.ns = this.p.map(p => ({ list:this.mkSteps(p), i:0 }));
    this.t = this.ns.some((s, i) => this.p[i].online && s.list.length) ? this.D.night : this.D.nightIdle;
    this.fx({ k:'banner', text:'شب فرا می‌رسد', e:'🌙', c:'nb' }); this.say('🌙 شب شد!');
    this.p.forEach(p => {
      if (!p.alive) return; const s = this.ns[p.id].list[0];
      this.say(s ? `🌙 ${LB[s.a]}: هدف را انتخاب و تأیید کن.` : '🌙 امشب کاری نداری.', [p.id]);
      if (this.link.includes(p.id) && this.link.length > 1) this.say('🔗 لینک شبانه: ' + this.link.map(i => this.p[i].name).join('، '), [p.id]);
    });
    this.push();
  }
  valid(a, seat, id) {
    const me = this.p[seat], t = this.p[id];
    if (!t || !t.alive) return 'هدف نامعتبر';
    if (id === seat) return 'خودت را نمی‌توانی انتخاب کنی';
    if ((a === 'kill' || a === 'duel1') && this.knows(me, t)) return 'هم‌تیمی است';
    if (a === 'steal' && this.lastSteal === id) return 'دو شب پشت‌سرهم از یک نفر نمی‌شود';
    if (a === 'link' && this.link.includes(id)) return 'قبلاً در لینک است';
    if (a === 'gun' && this.guns.includes(id)) return 'قبلاً گان دارد';
    return true;
  }
  nightAct(seat, targets) {
    const p = this.p[seat]; if (this.phase !== 'night' || !p.alive) return;
    const st = this.ns[seat], s = st.list[st.i]; if (!s) return;
    if (!Array.isArray(targets) || targets.length !== s.need || new Set(targets).size !== s.need) return this.err(seat, `باید ${s.need} نفر انتخاب کنی`);
    for (const id of targets) { const v = this.valid(s.a, seat, +id); if (v !== true) return this.err(seat, v); }
    targets = targets.map(Number);
    this.picks.push({ a:s.a, t:targets, by:seat });
    if (s.a === 'steal') {
      const t = this.p[targets[0]], na = RL[t.role].a; this.lastSteal = t.id;
      this.say(`🐍 نقش ${t.name} را دزدیدی: ${RL[t.role].n}`, [seat]);
      if (na && na !== 'steal') st.list.splice(st.i + 1, 0, { a:na, need:this.needOf(na) });
    }
    st.i++;
    if (st.i >= st.list.length) this.say('انتخاب ثبت شد.', [seat]);
    this.checkNightDone(); this.push();
  }
  checkNightDone() {
    if (this.phase !== 'night') return;
    const done = this.p.every((p, i) => !p.alive || !p.online || this.ns[i].i >= this.ns[i].list.length);
    if (done) this.t = Math.min(this.t, 2);
  }
  resolveNight() {
    if (this.phase !== 'night') return; this.gen++;
    const pk = [...this.picks], dead = [];
    const by = a => pk.filter(k => k.a === a);
    by('charm').forEach(k => this.charmed = k.t[0]);
    by('gun').forEach(k => { this.guns.push(k.t[0]); this.say('🔫 شوالیه‌ساز در شب به تو گان داد! در نوبت خودت می‌توانی شلیک کنی.', [k.t[0]]); });
    by('link4').forEach(k => { this.jlink = k.t; this.sword = rnd(k.t); });
    by('inq').forEach(k => { const t = this.p[k.t[0]]; this.say(`🔍 استعلام ${t.name}: ${this.T(t) === 'mafia' && t.role !== 'lord' ? 'مافیا' : 'شهروند'}`, [k.by]); });
    by('link').forEach(k => {
      const o = this.p[k.by], t = this.p[k.t[0]];
      if (!this.link.includes(o.id)) this.link.push(o.id);
      if (this.T(t) === 'mafia') { this.link.forEach(i => { if (this.p[i].alive) { this.die(i); dead.push(i); } }); this.link = []; }
      else this.link.push(t.id);
    });
    if (this.link.length > 1) this.link.forEach(i => this.say('🔗 لینک شبانه: ' + this.link.map(j => this.p[j].name).join('، '), [i]));
    [...new Set(pk.filter(k => ['kill','shot','duel1'].includes(k.a)).map(k => { if (RL[this.p[k.by].role].once && k.a !== 'kill') this.used[this.p[k.by].role] = 1; return k.t[0]; }))]
      .forEach(id => { if (this.hit(id, 'shot')) dead.push(id); });
    this.say(dead.length ? `☀️ صبح شد؛ ${[...new Set(dead)].map(i => this.p[i].name).join(' و ')} کشته شد.` : '☀️ صبح شد؛ کسی کشته نشد.');
    this.day++; this.phase = 'result'; this.push();
    this.later(() => { if (this.checkWin()) return; this.jlink.some(i => this.p[i].alive) && this.al().some(p => p.role === 'executioner') ? this.startSword() : this.startDay(); }, 3200);
  }

  /* ---------- شمشیر جلاد ---------- */
  startSword() {
    const L = this.jlink.filter(i => this.p[i].alive); if (!L.length) return this.startDay();
    this.gen++; this.phase = 'sword'; this.queue = [...L]; this.cur = -1; this.holder = null;
    this.fx({ k:'banner', text:'شمشیر جلاد', e:'⚔️', c:'db' });
    this.say(`⛓️ جلاد این ${L.length} نفر را لینک کرد: ${L.map(i => this.p[i].name).join('، ')}. فقط آن‌ها صحبت می‌کنند؛ شمشیر دست یکی‌شان است.`);
    this.push(); this.later(() => this.nextSpeaker(), 1800);
  }
  revealSword() {
    this.p.forEach(p => p.talking = false);
    const L = this.jlink.filter(i => this.p[i].alive); if (!L.length) return this.startDay();
    this.holder = this.p[this.sword].alive ? this.sword : rnd(L);
    const h = this.p[this.holder], tg = L.filter(i => i !== this.holder);
    this.say(`🗡️ شمشیر دست ${h.name} بود!`);
    if (!tg.length) { this.push(); return this.later(() => this.startDay(), 2500); }
    if (h.online) { this.phase = 'swordpick'; this.t = this.D.swordpick; this.push(); }
    else { this.push(); this.later(() => this.swordResolve(rnd(tg)), 2200); }
  }
  swordPick(seat, tgt) {
    if (this.phase !== 'swordpick' || seat !== this.holder) return;
    if (!this.jlink.includes(tgt) || tgt === seat || !this.p[tgt].alive) return this.err(seat, 'هدف نامعتبر');
    this.swordResolve(tgt);
  }
  swordResolve(id) {
    if (!['swordpick','sword'].includes(this.phase)) return; this.gen++;
    this.phase = 'result'; this.fx({ k:'emoji', id, e:'⚔️' }); this.die(id);
    this.say(`⚔️ ${this.p[this.holder].name} با شمشیر ${this.p[id].name} را حذف کرد!`); this.push();
    this.later(() => { if (!this.checkWin()) this.startDay(); }, 2800);
  }

  /* ---------- چت و ریکشن ---------- */
  sendChat(seat, text) {
    const p = this.p[seat]; text = String(text || '').trim().slice(0, 200); if (!text) return;
    if (!p.alive) return this.err(seat, 'تماشاچی نمی‌تواند چت کند');
    const ph = this.phase;
    if (this.charmNow === seat && ph !== 'night') return this.err(seat, 'افسون شده‌ای و ساکتی');
    if (ph === 'sword' && !this.jlink.includes(seat)) return this.err(seat, 'فقط افراد لینک‌شده صحبت می‌کنند');
    if (ph === 'night') {
      if (!(this.T(p) === 'mafia' || this.link.includes(seat))) return this.err(seat, 'شب است؛ همه خواب‌اند');
      const to = this.p.filter(q => this.T(q) === 'mafia' || this.link.includes(q.id)).map(q => q.id);
      return this.chat(p.name, text, { mafia:true, to });
    }
    this.chat(p.name, text);
  }
  like(seat, tgt, v) {
    const p = this.p[seat], t = this.p[tgt];
    if (this.phase !== 'day' || !p.alive || !t || !t.alive || this.charmNow === seat) return;
    const k = `${seat}_${tgt}_${v}`, n = Date.now();
    if (this.likeCd[k] && n - this.likeCd[k] < 10000) return this.err(seat, 'صبر کنید');
    this.likeCd[k] = n; this.fx({ k:'emoji', id:tgt, e:v === 1 ? '👍' : '👎' });
  }
  kick(seat, tgt) {
    if (seat !== this.hostSeat() || this.phase !== 'day') return this.err(seat, 'فقط سازنده‌ی لابی و فقط در روز');
    const t = this.p[tgt]; if (!t || !t.alive || tgt === seat) return;
    this.die(tgt); this.say(`${t.name} توسط هاست اخراج شد.`); this.sendSeat(tgt, { t:'err', m:'از بازی اخراج شدید' });
    this.push(); if (!this.checkWin() && this.cur === tgt) this.nextSpeaker();
  }

  /* ---------- خروج بازیکن ---------- */
  playerLeft(seat) {
    const p = this.p[seat]; if (!p || !p.online) return;
    p.online = false; p.talking = false;
    this.say(`${p.name} از بازی خارج شد.`);
    if (!this.p.some(q => q.online)) return this.destroy();
    if (this.cur === seat && ['day','sword'].includes(this.phase)) this.t = 1;
    if (this.phase === 'voting' && this.voters().filter(v => v.online).every(v => this.votes[v.id] !== undefined)) this.later(() => this.finishVoting(), 500);
    this.checkNightDone(); this.push();
  }

  /* ---------- پایان ---------- */
  checkWin() {
    if (this.over || this.phase === 'end') return true;
    const A = this.al(), m = A.filter(p => this.T(p) === 'mafia').length, s = A.filter(p => this.T(p) === 'solo').length, t = A.length - m - s;
    if (s && A.length === 1) return this.end('solo'), true;
    if (!m && !s) return this.end('town'), true;
    if (m && m >= A.length - m) return this.end('mafia'), true;
    if (!m && s && t <= 1) return this.end('solo'), true;
    return false;
  }
  end(w) {
    this.gen++; this.phase = 'end'; this.cur = -1; this.p.forEach(p => p.talking = false);
    this.push();
    this.all({ t:'end', w, roles:this.p.map(p => ({ id:p.id, role:p.role })) });
    clearInterval(this.iv); this.over = true;
    this.room.gameEnded();
  }
  destroy() { this.over = true; clearInterval(this.iv); this.room.gameEnded(); }
}

module.exports = { Game, RL };
