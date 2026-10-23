/* لابی جدید + صفحات (نقشه: lobby → rules/honors/rank/history/settings/support/gift/tut/bp/vip/notif | tabs: clan/missions/shop/profile) */
(function(){
const U=Object.assign({hist:[],cl:{},done:{},bp:{},nread:0},JSON.parse(localStorage.getItem('mf_ui')||'{}'));
const sv=()=>localStorage.setItem('mf_ui',JSON.stringify(U));
const fa=n=>Number(n).toLocaleString('fa-IR'), day=()=>new Date().toDateString();
const lvl=()=>Math.floor((cfg.xp||0)/100)+1, xpp=()=>(cfg.xp||0)%100;
const NAV=[['clan','⚔️','کلن'],['missions','📜','مأموریت‌ها'],['lobby','🏛️','خانه'],['shop','🛒','فروشگاه'],['profile','🛡️','پروفایل']];
const nav=a=>`<nav class="nv">${NAV.map(([k,i,t])=>`<button class="${k==a?'on':''}" onclick="go('${k}')"><i>${i}</i>${t}</button>`).join('')}</nav>`;
function pg(title,body,tab){currentTab=tab||title;render(`<div class="home pg"><div class="ph2"><button class="bk" onclick="showLobby()">➜</button><b class="gt">${title}</b><span style="width:38px"></span></div><div class="pb">${body}</div>${tab?nav(tab):''}</div>`)}
function mdl(h){const d=document.createElement('div');d.className='mdl';d.innerHTML=`<div>${h}<p><button class="gb" style="padding:8px 22px" onclick="this.closest('.mdl').remove()">بستن</button></p></div>`;document.body.appendChild(d)}
function give(o){for(const k in o)if((cfg[k]||0)+o[k]<0){showToast('موجودی کافی نیست');return false}for(const k in o)cfg[k]=(cfg[k]||0)+o[k];save();sv();return true}
const R=o=>Object.entries(o).map(([k,v])=>({coins:'🪙',gems:'💎',tokens:'🎟️',xp:'⭐'}[k])+fa(v)).join(' ');
const row=(t,s,btn)=>`<div class="cd"><div><b>${t}</b><small>${s||''}</small></div>${btn||''}</div>`;
const gb=(t,f,dis)=>`<button class="gb" ${dis?'disabled':''} onclick="${f}">${t}</button>`;

window.showLobby=function(){currentTab='lobby';
 const fr=FRAMES[cfg.frame]?.img||'';
 const T=(k,n,t)=>`<button class="tl" onclick="go('${k}')"><img src="ui/ic_${n}.png"><span>${t}</span></button>`;
 render(`<div class="home lb">
 <div class="top"><div class="me2" onclick="go('profile')"><div class="av"><img class="a" src="${AVATARS[cfg.char-1]||AVATARS[0]}">${fr?`<div class="frame-overlay" style="background-image:url('${fr}')"></div>`:'<img class="rg" src="ui/avring.png">'}</div>
 <div><b>${esc(cfg.name||'Player')}</b><div class="xp"><u>${lvl()}</u><s><i style="width:${xpp()}%"></i></s></div><small>${fa(xpp())} / ۱۰۰ XP</small></div></div>
 <div class="cur"><button class="bl" onclick="go('notif')"><img src="ui/bell.png">${U.nread?'':'<em></em>'}</button><button class="pill gm" onclick="go('shop')">💎 ${fa(cfg.gems)}</button><button class="pill" onclick="go('shop')">🪙 ${fa(cfg.coins)}</button></div></div>
 <div class="mid"><div class="col">${T('rules','rules','قوانین')}${T('honors','honors','افتخارات')}${T('rank','rank','رده‌بندی')}</div>
 <div class="ctr"><h1 class="gt">MAFIA</h1><p>ROMAN ARENA</p>
 <div class="bp" onclick="go('bp')"><img src="ui/battlepass.png"><img src="ui/vip.png" onclick="event.stopPropagation();go('vip')"></div>
 <div class="rd"><button onclick="go('gift')"><img src="ui/gift.png"><br><span>هدیه روزانه</span></button><button onclick="go('tut')"><img src="ui/tutorial.png"><br><span>آموزش</span></button></div></div>
 <div class="col">${T('history','history','تاریخچه')}${T('settings','settings','تنظیمات')}${T('support','support','پشتیبانی')}</div></div>
 <div class="go"><button onclick="startGame('normal')"><img src="ui/btn_purple.png"><small>روم عادی · ۱ 🎟️</small></button><button onclick="startGame('vip')"><img src="ui/btn_red.png"><small>روم VIP · ۳ 🎟️</small></button></div>${nav('lobby')}</div>`)};

const P={
lobby:()=>showLobby(), profile:()=>showProfile(), settings:()=>showSettings(),
rules:()=>pg('قوانین',['شهروندان با رأی‌گیری روزانه مافیا را پیدا می‌کنند.','مافیا هر شب یک نفر را حذف می‌کند.','دکتر هر شب می‌تواند یک نفر را نجات دهد.','کارآگاه هر شب هویت یک نفر را استعلام می‌کند.','بازی وقتی تمام می‌شود که مافیا یا شهروندان همه حذف شوند.','در فاز روز هر بازیکن ۳۰ ثانیه صحبت می‌کند.'].map((t,i)=>row(fa(i+1)+'. '+t)).join('')),
honors:()=>{const A=[['اولین بازی','۱ بازی',cfg.games,1],['بازیکن فعال','۱۰ بازی',cfg.games,10],['برنده','۱ برد',cfg.wins,1],['فاتح روم','۱۰ برد',cfg.wins,10],['سطح ۵','رسیدن به سطح ۵',lvl(),5]];
 pg('افتخارات',A.map(([t,s,v,n])=>row((v>=n?'🏅 ':'🔒 ')+t,s+' — '+fa(Math.min(v,n))+'/'+fa(n),`<div class="bar" style="width:70px"><i style="width:${Math.min(100,v/n*100)}%"></i></div>`)).join(''))},
rank:()=>{const L=[['Caesar',48],['Brutus',41],['Livia',33],['Nero',27],['Cato',19],['Julia',12],[cfg.name||'You',cfg.wins*4+lvl()]].sort((a,b)=>b[1]-a[1]);
 pg('رده‌بندی',L.map((x,i)=>row((i<3?['🥇','🥈','🥉'][i]:fa(i+1))+' '+esc(x[0]),'',`<b>${fa(x[1])}</b>`)).join(''))},
history:()=>pg('تاریخچه',`${row('بازی‌ها',fa(cfg.games||0))}${row('برد‌ها',fa(cfg.wins||0))}`+(U.hist.length?U.hist.map(h=>row(h.w,new Date(h.t).toLocaleString('fa-IR'))).join(''):row('هنوز بازی‌ای ثبت نشده','اولین بازی‌ات را شروع کن!'))),
support:()=>pg('پشتیبانی',`<details><summary>چطور بازی را شروع کنم؟</summary><p>از لابی یکی از دکمه‌های «شروع بازی» را بزن.</p></details><details><summary>توکن چیست؟</summary><p>برای ورود به روم لازم است؛ از فروشگاه یا هدیه روزانه می‌گیری.</p></details><details><summary>VIP چه مزیتی دارد؟</summary><p>ورود به روم VIP و جایزه‌های ویژه.</p></details><textarea id="sm" placeholder="پیام خود را بنویس..."></textarea>${gb('ارسال پیام',"document.getElementById('sm').value.trim()?(document.getElementById('sm').value='',showToast('پیام ارسال شد')):showToast('پیام خالی است')")}`),
gift:()=>{const ok=U.gift!==day();mdl(`<h2 class="gt">🎁 هدیه روزانه</h2><p>${R({coins:100,tokens:1})}</p>${ok?gb('دریافت',"claimGift(this)"):'<p style="color:#aaa">امروز دریافت کردی. فردا برگرد!</p>'}`)},
notif:()=>{U.nread=1;sv();mdl('<h3 class="gt">🔔 اعلان‌ها</h3>'+['به MAFIA ARENA خوش آمدی!','هدیه روزانه‌ات آماده است.','مأموریت‌های جدید را ببین.'].map(t=>row(t)).join('')); P.lobby()},
tut:()=>tut(0),
bp:()=>{pg('Battle Pass',row('MAFIA ROMAN PASS','سطح فعلی: '+fa(lvl()))+Array.from({length:10},(_,i)=>{const n=i+1,o=n%5?{coins:n*50}:{gems:n*2},c=U.bp[n];return row('سطح '+fa(n),R(o),gb(c?'✔':lvl()>=n?'دریافت':'🔒',`bpClaim(${n})`,c||lvl()<n))}).join(''))},
vip:()=>{const on=U.vip>Date.now();pg('حساب VIP',row('VIP ۱ ماهه',on?'فعال تا '+new Date(U.vip).toLocaleDateString('fa-IR'):'ورود به روم VIP + پاداش ویژه',gb(on?'فعال':'خرید ۲۰ 💎',"buyVip()",on))+row('پاداش روزانه VIP','۵۰ 🪙 اضافه'))},
shop:()=>pg('فروشگاه',[['🎟️ ۱ توکن','۱۰۰ 🪙',{coins:-100,tokens:1}],['🎟️ ۳ توکن','۵ 💎',{gems:-5,tokens:3}],['🪙 ۵۰۰ سکه','۱۰ 💎',{gems:-10,coins:500}]].map((x,i)=>row(x[0],'قیمت: '+x[1],gb('خرید',`shopBuy(${i})`))).join('')+row('قاب‌های پروفایل','تاج، مرمر، گلادیاتور و ...',gb('مشاهده','go(\'profile\')')),'shop'),
missions:()=>{const M=[['d1','یک بازی انجام بده',cfg.games,1,{coins:50,xp:20},1],['d2','۳ بازی انجام بده',cfg.games,3,{coins:100,xp:30},1],['d3','یک بازی ببر',cfg.wins,1,{tokens:1,xp:40},1],['w1','۱۰ برد در هفته',cfg.wins,10,{gems:5,xp:100},0]];window._M=M;
 pg('مأموریت‌ها',M.map(([id,t,v,n,r,d],i)=>{const c=U.done[id]===(d?day():'x');return row((d?'☀️ ':'📆 ')+t,R(r)+'<div class="bar"><i style="width:'+Math.min(100,(v||0)/n*100)+'%"></i></div>',gb(c?'✔':'دریافت',`mClaim(${i})`,c||(v||0)<n))}).join(''),'missions')},
clan:()=>{const c=U.cl.name;pg('کلن',c?row('⚔️ '+esc(c),'سطح ۱ · ۱ عضو')+['Caesar (رهبر)','Brutus','Livia'].map(m=>row(m)).join('')+row('مأموریت کلن','به‌زودی',gb('ترک کلن',"clanLeave()")):['Legio X','Spartans','Rome Elite'].map(n=>row('⚔️ '+n,'۲۰ عضو',gb('عضویت',`clanJoin('${n}')`))).join('')+`<div class="cd"><input id="cn" placeholder="نام کلن جدید" style="flex:1">${gb('ساخت ۵۰۰ 🪙',"clanNew()")}</div>`,'clan')}
};
function tut(i){const S=['به روم وارد شو و نقشت را ببین.','شب: نقش‌های ویژه عمل می‌کنند.','روز: گفتگو کن و مشکوک‌ها را پیدا کن.','رأی بده و برنده شو!'];
 document.querySelector('.mdl')?.remove();mdl(`<h3 class="gt">آموزش ${fa(i+1)}/${fa(S.length)}</h3><p>${S[i]}</p><p>${i?gb('قبلی',`tutGo(${i-1})`):''} ${i<S.length-1?gb('بعدی',`tutGo(${i+1})`):''}</p>`)}
Object.assign(window,{tutGo:tut,
 go:k=>(P[k]||P.lobby)(),
 claimGift(b){U.gift=day();give({coins:100,tokens:1});b.closest('.mdl').remove();showToast('هدیه دریافت شد 🎁');showLobby()},
 bpClaim(n){const o=n%5?{coins:n*50}:{gems:n*2};U.bp[n]=1;give(o);P.bp()},
 buyVip(){if(give({gems:-20})){U.vip=Date.now()+30*864e5;sv();P.vip()}},
 shopBuy(i){give([{coins:-100,tokens:1},{gems:-5,tokens:3},{gems:-10,coins:500}][i])&&(showToast('خرید انجام شد'),P.shop())},
 mClaim(i){const m=_M[i];U.done[m[0]]=m[5]?day():'x';give(m[4]);P.missions()},
 clanJoin(n){U.cl.name=n;sv();P.clan()},clanLeave(){U.cl={};sv();P.clan()},
 clanNew(){const n=document.getElementById('cn').value.trim();if(!n)return showToast('نام کلن را بنویس');give({coins:-500})&&(U.cl.name=n,sv(),P.clan())}});
if(typeof endMatch=='function'){const e=endMatch;window.endMatch=function(w){try{U.hist.unshift({w:String(w),t:Date.now()});U.hist=U.hist.slice(0,30);sv()}catch(x){}return e.apply(this,arguments)}}
})();
/* ===== کارت نقش (رندوم برای هر بازیکن، نمایش با چرخش برای بازیکن) ===== */
(function(){
const POOL={mafia:[4,9,11,12,1],doctor:[5,8],detective:[10,6],citizen:[13,14,15,16,2,3]};
const INFO={mafia:['مافیا','هر شب یک نفر را حذف کن','#e33'],doctor:['دکتر','هر شب یک نفر را نجات بده','#3c6'],detective:['کارآگاه','هر شب هویت یک نفر را بپرس','#4af'],citizen:['شهروند','با رأی روزانه مافیا را پیدا کن','#e8c46a']};
const shuf=a=>a.slice().sort(()=>Math.random()-.5);
function reveal(p){
 const [n,d,c]=INFO[p.role],card=p.card;
 const o=document.createElement('div');o.className='rv';o.style.setProperty('--rg',c);
 o.innerHTML=`<div class="rc"><div class="ri"><div class="rb2"><div>⚜<b>MAFIA</b></div></div><div class="rf"><img src="cards/card-${card}.png" alt="${n}"></div></div></div><div class="rl" style="position:absolute;bottom:8%"><h2>نقش شما: ${n}</h2><p>${d}</p></div>`;
 document.body.appendChild(o);
 let closed=false;const close=()=>{if(closed)return;closed=true;o.classList.add('gone');setTimeout(()=>o.remove(),800)};
 setTimeout(()=>o.classList.add('open'),1300);
 setTimeout(close,5200);o.addEventListener('click',()=>{if(o.classList.contains('open'))close()});
}
const sg=window.startGame;
window.startGame=function(m){const old=G&&G.gid;sg(m);
 if(!G||G.gid===old||!G.players)return;
 const used={};G.players.forEach(p=>{const l=used[p.role]=used[p.role]||shuf(POOL[p.role]);p.card=l.length?l.pop():POOL[p.role][0]});
 reveal(G.players[0])};
})();
