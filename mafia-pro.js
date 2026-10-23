/* MAFIA ARENA — Pro layer. Load AFTER the main <script>:  <script src="mafia-pro.js"></script> */
(()=>{
/* نقشه‌ی کارت‌ها — c = شماره‌ی فایل عکس کارت (card-<c>.png)
   1 ارباب تیرد | 2 کاراگاه | 3 گلادیاتور | 4 جلاد | 5 زره‌پوش | 6 تک‌تیرانداز | 7 افسونگر
   8 شوالیه‌ساز | 9 گلادیاتور سایه | 10 پیشگو | 11 خیانت‌کار | 12 مافیای ساده
   13 تا 16 شهروند ساده (چهار طرح؛ پایین‌تر CITIZEN_CARDS را ببین)
   اگر شماره‌ی کارتی با نقشش نمی‌خواند، فقط عدد c همان نقش را عوض کن. */
const RL={
lord:{c:1,e:'👑',t:'mafia',n:'ارباب تیرد',d:'رهبر مافیا؛ هر شب شلیک می‌کنی. استعلامت «شهروند» است.',a:'kill'},
detective:{c:2,e:'🕵️',t:'town',n:'کاراگاه',d:'هر شب یک نفر را استعلام می‌کنی.',a:'inq'},
gladiator:{c:3,e:'⚔️',t:'town',n:'گلادیاتور',d:'یک بار در ترن خودت دوئل می‌دهی؛ اگر هدف مافیا باشد حذف می‌شود، وگرنه خودت.'},
executioner:{c:4,e:'🪓',t:'solo',n:'جلاد',d:'تک‌نفره. هر شب ۴ نفر را لینک می‌کنی؛ صبح شمشیر به یکی‌شان می‌رسد. هدف: آخرین نفر زنده.',a:'link4'},
armor:{c:5,e:'🛡️',t:'town',n:'زره‌پوش',d:'یک بار از شلیک جان سالم به در می‌بری.'},
sniper:{c:6,e:'🎯',t:'town',n:'تک‌تیرانداز',d:'یک بار شلیک شبانه.',a:'shot',once:1},
charmer:{c:7,e:'🪄',t:'mafia',n:'افسونگر',d:'هر شب یک نفر را افسون می‌کنی؛ فردا نه حرف می‌زند نه رأی می‌دهد.',a:'charm'},
knight:{c:8,e:'🗡️',t:'town',n:'شوالیه‌ساز',d:'هر شب به یک نفر گان می‌دهی.',a:'gun'},
shadow:{c:9,e:'🌑',t:'mafia',n:'گلادیاتور سایه',d:'یک بار شبانه هدفی را در دوئل سایه حذف می‌کنی.',a:'duel1',once:1},
oracle:{c:10,e:'🔮',t:'town',n:'پیشگو',d:'هر شب یک نفر را بیدار می‌کنی؛ شهروند وارد لینک شبانه می‌شود، مافیا یعنی مرگ همه‌ی لینک.',a:'link'},
traitor:{c:11,e:'🐍',t:'mafia',n:'خیانت‌کار',d:'هم‌تیمی‌هایت تو را می‌شناسند، تو آن‌ها را نه. هر شب نقش یک نفر را می‌دزدی (دو شب پشت‌سرهم از یک نفر نه).',a:'steal'},
smafia:{c:12,e:'😈',t:'mafia',n:'مافیای ساده',d:'توانایی ویژه نداری؛ با تیم هماهنگ باش.'},
citizen:{c:13,e:'🏺',t:'town',n:'شهروند ساده',d:'توانایی ویژه نداری؛ با منطق و رأی از شهر دفاع کن.'}};
const LB={kill:'شلیک',inq:'استعلام',link4:'لینک ۴ نفر',shot:'شلیک',charm:'افسون',gun:'دادن گان',duel1:'دوئل سایه',link:'بیدار کردن',steal:'دزدیدن نقش'};
const TN={mafia:'تیم مافیا',town:'تیم شهر',solo:'تک‌نفره'};window.MF_RL=RL;window.MF_TN=TN;
const T=p=>RL[p.role].t,al=()=>G.players.filter(p=>p.alive),P=i=>G.players[i],rnd=a=>a[Math.floor(Math.random()*a.length)];
const shuf=a=>a.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const CITIZEN_CARDS=[13,14,15,16]; // شهروند ساده: چهار طرح کارت (card-13 تا card-16)
const cardNo=p=>p.role==='citizen'?CITIZEN_CARDS[p.id%CITIZEN_CARDS.length]:RL[p.role].c;
const knows=(v,p)=>T(v)==='mafia'&&T(p)==='mafia'&&(v.id===p.id||v.role!=='traitor');
const pos=i=>seatXY(G.n,i);
const tag=p=>(p.id&&knows(P(0),p)?'😈 ':'')+(p.id&&G.link.includes(0)&&G.link.includes(p.id)?'🔗 ':'')+(['sword','swordpick'].includes(G.phase)&&G.jlink.includes(p.id)?'⛓️ ':'');
const touch=()=>{G.rev++;updateRoom()};
const shooterOf=()=>['lord','smafia','charmer','shadow','traitor'].map(r=>al().find(p=>p.role===r)).find(Boolean);
const needOf=a=>a==='link4'?Math.max(1,Math.min(4,al().length-1)):1;

function compose(n){
 const M=n===16?['lord','charmer','shadow','traitor','smafia']:['lord',...shuf(['charmer','shadow','traitor','smafia']).slice(0,2)];
 const S=['detective','gladiator','executioner','armor','sniper','knight','oracle'];
 const o=n===16?[...S,'citizen','citizen','citizen','citizen']:['detective','knight',...shuf(['gladiator','executioner','armor','sniper','oracle','citizen','citizen']).slice(0,5)];
 return shuf([...M,...o]);}

window.startGame=function(mode,code=null,pass=null,isHost=true){
 if(!cfg.id||!USERS[cfg.id])registerUser();
 if(USERS[cfg.id]?.banned)return showToast('شما بن هستید','error');
 const n=window.ROOM_N===16?16:10,cost=mode==='vip'?3:1;
 if(isHost&&cfg.tokens<cost)return showToast('توکن کافی نیست','error');
 if(isHost){cfg.tokens-=cost;syncUser();saveCfg();}
 const names=shuf(['King','Shadow','Wolf','Luna','Phoenix','Viper','Nox','Reaper','Zoro','Atlas','Nero','Vega','Orion','Kai','Rex']),roles=compose(n),avs=shuf(AVATARS.filter(a=>a!==AVATARS[cfg.char-1]));
 G={gid:Date.now(),mode,n,roomCode:code||String(1000+Math.floor(Math.random()*9000)),roomPass:pass,isHost,canKick:!!(isHost&&code),phase:'day',day:1,queue:[],cur:0,iv:null,vtime:0,sig:'',shown:0,rev:0,sel:[],voted:false,votes:{},guns:[],used:{},link:[],jlink:[],sword:null,holder:null,charmed:null,charmNow:null,lastSteal:null,lastStealBot:null,steps:[],stepI:0,picks:[],fresh:[],
  players:Array.from({length:n},(_,i)=>({id:i,frame:i?'':(FRAMES[cfg.frame]?.img||''),name:i?names[i-1]:(cfg.name||'You'),role:roles[i],avatar:i?avs[i%avs.length]:AVATARS[cfg.char-1],alive:true,talking:false,micTime:30})),
  chat:[{sender:'System',text:'بازی شروع شد!',sys:true}]};
 buildRoom();const me=P(0);
 if(T(me)==='mafia'){addChat('System',me.role==='traitor'?'همه‌ی مافیاها تو را می‌شناسند، اما تو آن‌ها را نمی‌شناسی.':'هم‌تیمی‌ها: '+G.players.filter(p=>p.id&&T(p)==='mafia').map(p=>p.name).join('، '),true);}
 showCard(true);};

function showCard(first){
 const me=P(0),r=RL[me.role],o=document.createElement('div');o.className='cardov';
 o.innerHTML=`<div class="cscene"><div class="card3d"><div class="cf cback">🏛️</div><div class="cf cfront">${cardImg(cardNo(me),r.e,r.n)}</div></div><h2 class="gt">${r.n}</h2><p class="ct ${r.t}">${TN[r.t]}</p><p class="cd">${r.d}</p><button class="gb" id="cok">متوجه شدم</button></div>`;
 document.querySelector('.stage').appendChild(o);setTimeout(()=>o.classList.add('flip'),700);
 o.querySelector('#cok').onclick=()=>{o.remove();if(first)startDay();};}
window.showCard=()=>G&&showCard(false);

function banner(t,e,c){const s=document.querySelector('.stage');if(!s)return;try{playSfx(c==='nb'?'night':e==='🗳️'?'vote':'day')}catch(_){}const b=document.createElement('div');b.className='ban '+c+((e==='🌙'||e==='☀️')?' dnb':'');b.innerHTML=(e==='🌙'||e==='☀️')?`<div class="dn ${e==='🌙'?'n':'d'}"><div class="dnw"><img src="daynight.jpg" alt="" onerror="this.outerHTML='<span>${e}</span>'"><i></i></div><b class="gt">${t}</b></div>`:`<div><span>${e}</span><b class="gt">${t}</b></div>`;s.appendChild(b);setTimeout(()=>b.remove(),2200);}

window.buildRoom=function(){
 document.body.classList.add('in-room');
 app.innerHTML=`<div class="stage ${G.mode==='vip'?'vip':''} ${G.n>10?'n16':''}">
 <div class="panel plhead"><span>👥 PLAYERS</span><span id="plcount"></span></div><div class="panel plist" id="plist"></div>
 <div class="topbtns"><button class="ghost" id="micBtn" onclick="toggleMic()">🔇</button><button class="ghost" id="sndBtn" onclick="toggleSound(!cfg.soundEnabled)">${cfg.soundEnabled?'🔊':'🔇'}</button><button class="ghost" onclick="toggleFull()">⛶</button><button class="ghost" onclick="showReportModal()">🚨</button><button class="ghost" onclick="confirm('خروج از بازی؟')&&exitGame()">✖</button></div>
 <div class="panel phase"><div style="font-size:calc(var(--u)*2)">⏳</div><div class="big" id="dayN"></div><div class="tm" id="tm"></div><div id="phs"></div></div>
 <div id="seats"></div><div id="fx"></div><div class="roles" id="roles" onclick="showCard()"></div><div class="spec" id="spec">👁️ تماشاچی</div>
 <div class="panel chat"><div class="chat-box" id="chatbox"></div><div class="sticker-bar">${['😂','😡','🤔','👍','👎','🎯'].map(s=>`<span onclick="sendSticker('${s}')">${s}</span>`).join('')}</div><form onsubmit="sendMsg();return false"><input id="msgIn" autocomplete="off" placeholder="پیام..."><button class="gb">➤</button></form></div>
 <div class="acts" id="acts"></div></div>`;
 updateRoom();};

window.updateRoom=function(){
 if(!G||!$('seats'))return;
 const me=P(0),ph=G.phase,st=document.querySelector('.stage');
 st.classList.toggle('night',ph==='night');st.classList.toggle('spectator',!me.alive);$('spec').style.display=me.alive?'none':'block';
 const sig=JSON.stringify([G.players.map(p=>[p.talking,p.alive]),G.sel,ph,G.day,G.voted,G.rev,G.cur]);
 if(sig!==G.sig){G.sig=sig;
  $('plcount').textContent=`${al().length}/${G.n}`;$('dayN').textContent=`DAY ${G.day}`;
  $('plist').innerHTML=G.players.map(p=>`<div class="pl ${G.canKick?'is-host':''} ${p.talking?'tk':''} ${G.sel.includes(p.id)?'sel':''} ${p.alive?'':'dead'}" onclick="selectPlayer(${p.id})"><span class="av"><img src="${p.avatar}" onerror="this.style.visibility='hidden'"></span><span>${String(p.id+1).padStart(2,'0')} ${tag(p)}${esc(p.name)}</span>${p.talking?'<i>👑</i>':''}${G.canKick&&p.id&&p.alive?`<span class="host-kick" onclick="event.stopPropagation();confirm('این بازیکن از بازی حذف شود؟')&&kickPlayer(${p.id})">❌</span>`:''}</div>`).join('');
  const lkOk=ph==='day'&&me.alive&&G.charmNow!==0;
  $('seats').innerHTML=G.players.map(p=>{const[x,y]=pos(p.id);const lk=lkOk&&p.alive&&p.id?'':'disabled';return `<div class="seat ${G.sel.includes(p.id)?'sel':''}" data-id="${p.id}" style="left:${x}%;top:${y}%" onclick="selectPlayer(${p.id})"><div class="avatar-wrap ${p.talking?'talking':''} ${p.alive?'':'dead'} ${G.fresh.includes(p.id)?'fresh':''}"><img src="${p.avatar}" onerror="this.style.visibility='hidden'">${p.frame?`<img class="frm" src="${p.frame}" onerror="this.remove()">`:''}<div class="mic-icon ${p.talking?'on':''}">🎤</div></div><div class="seat-name"><b class="snum">${p.id+1}</b>${tag(p)}${esc(p.name)}</div><div class="interaction-bar"><button ${lk} onclick="event.stopPropagation();giveLike(${p.id},1)">👍</button><button ${lk} onclick="event.stopPropagation();giveLike(${p.id},-1)">👎</button></div></div>`}).join('');
  const hl={night:'night',day:'day',sword:'day',swordpick:'day',voting:'voting',result:'result'}[ph];
  $('phs').innerHTML=PHASES.map(([k,e,n])=>`<div class="ph ${hl===k?'on':''}">${e} ${n}</div>`).join('');
  const r=RL[me.role];$('roles').innerHTML=`<div class="mytile">${cardImg(cardNo(me),r.e,r.n)}<div><b>${r.e} ${r.n}</b><small>${TN[r.t]}</small></div></div>`;
  const A=[],s=G.steps[G.stepI],myTurn=G.cur===0&&me.alive;
  if(ph==='voting')A.push(['🗳️ رأی','castVote()',!(me.alive&&!G.voted&&G.sel.length===1&&G.charmNow!==0)]);
  if(ph==='night')A.push([s?`🌙 ${LB[s.a]}${s.need>1?` (${G.sel.length}/${s.need})`:''}`:'🌙 منتظر سپیده‌دم...','nightAct()',!(s&&G.sel.length===s.need)]);
  if(ph==='swordpick')A.push(['⚔️ حذف با شمشیر','swordPick()',G.sel.length!==1]);
  if(ph==='day'&&myTurn){if(G.guns.includes(0))A.push(['🔫 شلیک با گان','useGun()',G.sel.length!==1]);if(me.role==='gladiator'&&!G.used.duel)A.push(['⚔️ دوئل','useDuel()',G.sel.length!==1]);}
  if(ph==='day'||ph==='sword')A.push(['⏭️ رد کردن نوبت','skipTurn()',!(G.isHost||myTurn)]);
  $('acts').innerHTML=A.map(([t,f,d],i)=>`<button class="${i?'ghost':'gb'}" onclick="${f}" ${d?'disabled':''}>${t}</button>`).join('');}
 const t=ph==='day'||ph==='sword'?P(G.cur).micTime:['voting','night','swordpick'].includes(ph)?G.vtime:null;
 $('tm').textContent=t===null?'--:--':`00:${String(Math.max(0,t)).padStart(2,'0')}`;
 if(G.shown!==G.chat.length){G.shown=G.chat.length;const b=$('chatbox');b.innerHTML=G.chat.map(m=>`<div class="msg ${m.sys?'sys':''} ${m.mafia?'mafia':''}">${m.sys||m.mafia?'':`<b>${esc(m.sender)}:</b> `}${esc(m.text)}</div>`).join('');b.scrollTop=b.scrollHeight;}};

/* ---------- helpers: death, hits, effects ---------- */
function die(id){const p=P(id);if(!p.alive)return;p.alive=false;p.talking=false;G.fresh.push(id);setTimeout(()=>{if(G){G.fresh=G.fresh.filter(x=>x!==id);G.rev++;updateRoom();}},2300);G.guns=G.guns.filter(x=>x!==id);G.queue=G.queue.filter(x=>x!==id);G.link=G.link.filter(x=>x!==id);}
function hit(id,src){const p=P(id);if(!p.alive)return false;if(src==='shot'&&p.role==='armor'&&!G.used.armor){G.used.armor=1;addChat('System','🛡️ کسی از شلیک جان سالم به در برد!',true);return false;}die(id);return true;}
function gunFx(a,b){const s=document.querySelector('.stage'),f=$('fx');if(!s||!f)return;const[x1,y1]=pos(a),[x2,y2]=pos(b),ang=Math.atan2((y2-y1)*s.clientHeight,(x2-x1)*s.clientWidth)*180/Math.PI+25;
 const g=document.createElement('div');g.className='gunfx';g.style.cssText=`left:${x1+(x2-x1)*.3}%;top:${y1+(y2-y1)*.3}%;--r:${ang}deg`;g.innerHTML='<img src="gun.png" onerror="this.outerHTML=\'🔫\'"><i></i>';f.appendChild(g);setTimeout(()=>g.remove(),1500);
 setTimeout(()=>{s.classList.add('shake');const h=document.createElement('div');h.className='hitfx';h.style.cssText=`left:${x2}%;top:${y2}%`;f.appendChild(h);setTimeout(()=>{h.remove();s.classList.remove('shake')},800)},750);}
function emoji(id,e){const[x,y]=pos(id),d=document.createElement('div');d.className='fl';d.textContent=e;d.style.cssText=`left:${x}%;top:${y-5}%`;$('fx')?.appendChild(d);setTimeout(()=>d.remove(),2000);}

/* ---------- day ---------- */
function startDay(){clearInterval(G.iv);setPhase('day');G.sel=[];G.voted=false;G.charmNow=G.charmed;G.charmed=null;
 banner(`روز ${G.day}`,'☀️','db');addChat('System',`روز ${G.day} آغاز شد.`,true);
 if(G.charmNow!=null)addChat('System',`🪄 ${P(G.charmNow).name} افسون شده و امروز ساکت است.`,true);
 G.queue=al().filter(p=>p.id!==G.charmNow).map(p=>p.id);touch();later(nextSpeaker,1800);}
const LINES=['من شهروندم!','به نظرم روی ساکت‌ها دقت کنیم','این رفتار مشکوک بود','با دلیل رأی بدیم','به من شک نکنید'];
function nextSpeaker(){clearInterval(G.iv);G.players.forEach(p=>p.talking=false);
 let id=null;while(G.queue.length){id=G.queue.shift();if(P(id).alive)break;id=null;}
 if(id==null)return G.phase==='sword'?revealSword():startVoting();
 const p=P(id);G.cur=id;p.talking=true;p.micTime=G.phase==='sword'?20:30;
 if(id&&G.phase==='day'){addChat(p.name,rnd(LINES));
  setTimeout(()=>{if(!G||G.cur!==id||G.phase!=='day'||!p.alive)return;
   if(G.guns.includes(id)&&Math.random()<.35)shoot(id,rnd(al().filter(x=>x.id!==id&&(T(p)!=='mafia'||T(x)!=='mafia'))).id);
   else if(p.role==='gladiator'&&!G.used.duel&&Math.random()<.15){G.used.duel=1;duel(id,rnd(al().filter(x=>x.id!==id)).id);}},2500);}
 touch();G.iv=setInterval(()=>{if(--p.micTime<=0)nextSpeaker();else updateRoom();},1000);}
window.skipTurn=function(){if(G&&(G.phase==='day'||G.phase==='sword')&&(G.isHost||G.cur===0))nextSpeaker();};
function shoot(by,id){if(!G.guns.includes(by)||!P(id)?.alive)return;G.guns=G.guns.filter(x=>x!==by);gunFx(by,id);addChat('System',`🔫 ${P(by).name} با گان به ${P(id).name} شلیک کرد!`,true);touch();
 setTimeout(()=>{if(!G)return;hit(id,'shot');touch();later(checkWin,1500);},900);}
function duel(by,id){addChat('System',`⚔️ ${P(by).name} ${P(id).name} را به دوئل کشید!`,true);emoji(by,'⚔️');emoji(id,'⚔️');touch();
 setTimeout(()=>{if(!G)return;const l=T(P(id))==='mafia'?id:by;die(l);addChat('System',`${P(l).name} در دوئل حذف شد!`,true);touch();later(checkWin,1500);},1000);}
window.useGun=function(){if(G.phase!=='day'||G.cur!==0||G.sel.length!==1)return;const t=G.sel[0];G.sel=[];shoot(0,t);};
window.useDuel=function(){if(G.phase!=='day'||G.cur!==0||G.sel.length!==1||G.used.duel)return;G.used.duel=1;const t=G.sel[0];G.sel=[];duel(0,t);};

/* ---------- voting ---------- */
function startVoting(){clearInterval(G.iv);setPhase('voting');G.sel=[];G.voted=false;G.votes={};G.vtime=15;banner('رأی‌گیری','🗳️','db');addChat('System','زمان رأی‌گیری! روی یک بازیکن کلیک کنید.',true);touch();G.iv=setInterval(()=>{if(--G.vtime<=0)finishVoting();else updateRoom();},1000);}
window.castVote=function(){const me=P(0);if(G.phase!=='voting'||G.voted||!me.alive||G.charmNow===0)return;if(G.sel.length!==1)return showToast('یک بازیکن انتخاب کنید','error');G.voted=true;G.votes[G.sel[0]]=(G.votes[G.sel[0]]||0)+1;addChat('System',`شما به ${P(G.sel[0]).name} رأی دادید.`,true);finishVoting();};
function finishVoting(){if(G.phase!=='voting')return;clearInterval(G.iv);const A=al();
 A.filter(b=>b.id&&b.id!==G.charmNow).forEach(b=>{let o=A.filter(p=>p.id!==b.id&&!knows(b,p));if(T(b)!=='mafia'&&Math.random()<.25){const m=o.filter(p=>T(p)==='mafia');if(m.length)o=m;}if(o.length){const v=rnd(o).id;G.votes[v]=(G.votes[v]||0)+1;}});
 const mx=Math.max(0,...Object.values(G.votes)),top=Object.keys(G.votes).filter(k=>G.votes[k]===mx&&P(+k).alive);
 setPhase('result');G.sel=[];
 if(top.length===1&&mx>0){die(+top[0]);addChat('System',`${P(+top[0]).name} با رأی اکثریت اعدام شد!`,true);}else addChat('System','آرا مساوی بود؛ کسی اعدام نشد.',true);
 touch();later(()=>{if(!checkWin())startNight();},3500);}

/* ---------- night ---------- */
const valid=(a,id)=>{const me=P(0),t=P(id);
 if(id===0&&a!=='x')return 'خودت را نمی‌توانی انتخاب کنی';
 if((a==='kill'||a==='duel1')&&knows(me,t))return 'هم‌تیمی است';
 if(a==='steal'&&G.lastSteal===id)return 'دو شب پشت‌سرهم از یک نفر نمی‌شود';
 if(a==='link'&&G.link.includes(id))return 'قبلاً در لینک است';
 if(a==='gun'&&G.guns.includes(id))return 'قبلاً گان دارد';return true;};
function mkSteps(){const me=P(0),r=RL[me.role],S=[];if(!me.alive)return S;
 if(r.a&&r.a!=='kill'&&!(r.once&&G.used[me.role]))S.push({a:r.a,need:needOf(r.a)});
 if(shooterOf()===me)S.push({a:'kill',need:1});return S;}
function startNight(){clearInterval(G.iv);setPhase('night');banner('شب فرا می‌رسد','🌙','nb');addChat('System','🌙 شب شد!',true);
 G.sel=[];G.picks=[];G.jlink=[];G.sword=null;G.steps=mkSteps();G.stepI=0;G.vtime=G.steps.length?20:6;
 const s=G.steps[0];addChat('System',s?`🌙 ${LB[s.a]}: هدف را انتخاب و تأیید کن.`:'🌙 امشب کاری نداری.',true);
 if(G.link.includes(0)&&G.link.length>1)addChat('System','🔗 لینک شبانه: '+G.link.map(i=>P(i).name).join('، '),true);
 touch();G.iv=setInterval(()=>{if(--G.vtime<=0)resolveNight();else updateRoom();},1000);}
window.nightAct=function(){const s=G.steps[G.stepI];if(G.phase!=='night'||!s||G.sel.length!==s.need)return;
 G.picks.push({a:s.a,t:[...G.sel],by:0});
 if(s.a==='steal'){const t=P(G.sel[0]),na=RL[t.role].a;G.lastSteal=t.id;addChat('System',`🐍 نقش ${t.name} را دزدیدی: ${RL[t.role].n}`,true);if(na&&na!=='steal')G.steps.splice(G.stepI+1,0,{a:na,need:needOf(na)});}
 G.stepI++;G.sel=[];if(G.stepI>=G.steps.length){addChat('System','انتخاب ثبت شد.',true);G.vtime=Math.min(G.vtime,2);}touch();};
function bp(a,p){const f={kill:x=>T(x)!=='mafia',duel1:x=>T(x)!=='mafia',charm:x=>T(x)!=='mafia',gun:x=>!G.guns.includes(x.id),link:x=>!G.link.includes(x.id)}[a]||(()=>1);
 const c=shuf(al().filter(x=>x.id!==p.id&&f(x)));if(!c.length)return null;return{a,t:a==='link4'?c.slice(0,4).map(x=>x.id):[c[0].id],by:p.id};}
function resolveNight(){if(G.phase!=='night')return;clearInterval(G.iv);
 const pk=[...G.picks],sh=shooterOf(),dead=[];
 al().filter(p=>p.id&&p.role!=='detective').forEach(p=>{const r=RL[p.role],acts=[];
  if(r.a&&r.a!=='kill'&&!(r.once&&G.used[p.role])&&!(r.a==='shot'&&Math.random()>.4))acts.push(r.a);
  if(sh===p)acts.push('kill');
  acts.forEach(a=>{const k=bp(a,p);if(!k)return;pk.push(k);
   if(a==='steal'){G.lastStealBot=k.t[0];const na=RL[P(k.t[0]).role].a;if(na&&na!=='steal'&&na!=='inq'){const k2=bp(na,p);if(k2)pk.push(k2);}}});});
 const by=a=>pk.filter(k=>k.a===a);
 by('charm').forEach(k=>G.charmed=k.t[0]);
 by('gun').forEach(k=>{G.guns.push(k.t[0]);if(k.t[0]===0)addChat('System','🔫 شوالیه‌ساز در شب به تو گان داد! در ترن خودت می‌توانی شلیک کنی.',true);});
 by('link4').forEach(k=>{G.jlink=k.t;G.sword=rnd(k.t);});
 by('inq').forEach(k=>{if(k.by===0){const t=P(k.t[0]);addChat('System',`🔍 استعلام ${t.name}: ${T(t)==='mafia'&&t.role!=='lord'?'مافیا':'شهروند'}`,true);}});
 by('link').forEach(k=>{const o=P(k.by),t=P(k.t[0]);if(!G.link.includes(o.id))G.link.push(o.id);
  if(T(t)==='mafia'){G.link.forEach(i=>{if(P(i).alive){die(i);dead.push(i);}});G.link=[];}else G.link.push(t.id);});
 if(G.link.includes(0)&&G.link.length>1)addChat('System','🔗 لینک شبانه: '+G.link.map(i=>P(i).name).join('، '),true);
 [...new Set(pk.filter(k=>['kill','shot','duel1'].includes(k.a)).map(k=>{if(RL[P(k.by).role].once&&k.a!=='kill')G.used[P(k.by).role]=1;return k.t[0];}))].forEach(id=>{if(hit(id,'shot'))dead.push(id);});
 addChat('System',dead.length?`☀️ صبح شد؛ ${dead.map(i=>P(i).name).join(' و ')} کشته شد.`:'☀️ صبح شد؛ کسی کشته نشد.',true);
 G.day++;touch();later(()=>{if(checkWin())return;G.jlink.some(i=>P(i).alive)&&al().some(p=>p.role==='executioner')?startSword():startDay();},3200);}

/* ---------- executioner sword ---------- */
function startSword(){const L=G.jlink.filter(i=>P(i).alive);if(!L.length)return startDay();clearInterval(G.iv);setPhase('sword');G.sel=[];G.queue=[...L];
 banner('شمشیر جلاد','⚔️','db');addChat('System',`⛓️ جلاد این ۴ نفر را لینک کرد: ${L.map(i=>P(i).name).join('، ')}. فقط آن‌ها صحبت می‌کنند؛ شمشیر دست یکی‌شان است.`,true);touch();later(nextSpeaker,1800);}
function revealSword(){clearInterval(G.iv);G.players.forEach(p=>p.talking=false);const L=G.jlink.filter(i=>P(i).alive);if(!L.length)return startDay();
 G.holder=P(G.sword).alive?G.sword:rnd(L);const h=P(G.holder),tg=L.filter(i=>i!==G.holder);addChat('System',`🗡️ شمشیر دست ${h.name} بود!`,true);
 if(!tg.length)return later(startDay,2500);
 if(G.holder===0){setPhase('swordpick');G.sel=[];G.vtime=12;touch();G.iv=setInterval(()=>{if(--G.vtime<=0)swordResolve(rnd(tg));else updateRoom();},1000);}
 else{touch();later(()=>swordResolve(rnd(tg)),2200);}}
function swordResolve(id){clearInterval(G.iv);setPhase('result');G.sel=[];emoji(id,'⚔️');die(id);addChat('System',`⚔️ ${P(G.holder).name} با شمشیر ${P(id).name} را حذف کرد!`,true);touch();later(()=>{if(!checkWin())startDay();},2800);}
window.swordPick=function(){if(G.phase==='swordpick'&&G.sel.length===1)swordResolve(G.sel[0]);};

/* ---------- selection, chat, reactions ---------- */
window.selectPlayer=function(id){if(!G)return;const me=P(0),p=P(id),ph=G.phase;if(!me.alive||!p.alive)return;let need=1;
 if(ph==='night'){const s=G.steps[G.stepI];if(!s)return;need=s.need;const v=valid(s.a,id);if(v!==true)return showToast(v,'error');}
 else if(ph==='voting'){if(id===0)return showToast('به خودت رأی نده','error');if(G.voted||G.charmNow===0)return;}
 else if(ph==='swordpick'){if(!G.jlink.includes(id)||id===0)return;}
 else if(ph!=='day')return;
 const i=G.sel.indexOf(id);if(i>=0)G.sel.splice(i,1);else{if(G.sel.length>=need)G.sel.shift();G.sel.push(id);}touch();};
function blocked(){const me=P(0),ph=G.phase;if(!me.alive)return 'تماشاچی نمی‌تواند چت کند';if(G.charmNow===0&&ph!=='night')return 'افسون شده‌ای و ساکتی';
 if(ph==='sword'&&!G.jlink.includes(0))return 'فقط ۴ نفر لینک‌شده صحبت می‌کنند';if(ph==='night'&&!(T(me)==='mafia'||G.link.includes(0)))return 'شب است؛ همه خواب‌اند';return 0;}
function say(t){const e=blocked();if(e)return showToast(e,'error');addChat(P(0).name,t,false,G.phase==='night');updateRoom();}
window.sendMsg=function(){const i=$('msgIn'),t=i.value.trim();if(!t)return;say(t);if(!blocked())i.value='';};
window.sendSticker=s=>G&&say(s);
window.giveLike=function(id,v){if(!G||G.phase!=='day')return;if(!P(0).alive)return showToast('تماشاچی نمی‌تواند ریکشن بدهد','error');if(G.charmNow===0)return showToast('افسون شده‌ای','error');
 const k=`${G.gid}_${id}_${v}`,n=Date.now();if(cooldowns[k]&&n-cooldowns[k]<10000)return showToast('صبر کنید','error');cooldowns[k]=n;emoji(id,v===1?'👍':'👎');};

/* ---------- win ---------- */
function checkWin(){if(!G||G.phase==='end')return true;const A=al(),m=A.filter(p=>T(p)==='mafia').length,s=A.filter(p=>T(p)==='solo').length,t=A.length-m-s;
 if(s&&A.length===1)return end('solo'),true;if(!m&&!s)return end('town'),true;if(m&&m>=A.length-m)return end('mafia'),true;if(!m&&s&&t<=1)return end('solo'),true;return false;}
window.checkWin=checkWin;
function end(w){clearInterval(G.iv);G.phase='end';const me=P(0),won=T(me)===w;cfg.games++;if(won){cfg.wins++;cfg.coins+=100;}(cfg.history=cfg.history||[]).push({t:Date.now(),role:RL[me.role].n,won,w,n:G.n,mode:G.mode});cfg.history=cfg.history.slice(-30);syncUser();saveCfg();
 const o=document.createElement('div');o.className='end';
 o.innerHTML=`<div><h2 class="gt">${{mafia:'مافیا برنده شد',town:'شهر برنده شد',solo:'جلاد برنده شد'}[w]}</h2><p style="color:var(--gold)">${won?'🏆 پیروز شدید! (+۱۰۰ سکه)':'💀 باختید'}</p><div class="rv">${G.players.map(p=>`<span class="${T(p)}">${esc(p.name)}: ${RL[p.role].n}</span>`).join('')}</div><button class="gb" onclick="exitGame()">بازگشت به لابی</button></div>`;
 document.querySelector('.stage')?.appendChild(o);}

/* ---------- lobby / profile / create-room tweaks ---------- */
const _sl=window.showLobby;window.showLobby=function(){window.ROOM_N=10;_sl();
 const g=document.querySelector('.gift-bar');if(g){const n=g.nextElementSibling;if(n&&!n.classList.contains('gift-bar')&&/کد دعوت/.test(n.textContent))n.remove();g.remove();}
 document.querySelector('.home h1.gt')?.insertAdjacentHTML('beforebegin','<img src="logo.png" class="lobolo" onerror="this.remove()">');};
const _sp=window.showProfile;window.showProfile=function(){_sp();const h=[...document.querySelectorAll('.home h3')].find(x=>/آواتار/.test(x.textContent));
 h?.insertAdjacentHTML('beforebegin',cfg.referredBy?`<div class="refdone">✅ کد دعوت قبلاً استفاده شده (${esc(cfg.referredBy)})</div>`:`<div class="gift-bar" style="margin-bottom:12px"><span>🎁 کد دعوت:</span><input type="text" id="refCode" placeholder="ID دوست خود را وارد کنید" autocomplete="off"><button class="gb" onclick="applyReferral()">دریافت ۵۰۰ سکه</button></div>`);};
const _ar=window.applyReferral;window.applyReferral=function(){const had=cfg.referredBy;_ar();if(!had&&cfg.referredBy)showProfile();};
const _cr=window.showCreateRoom;window.showCreateRoom=function(){window.ROOM_N=10;_cr();
 document.querySelector('#roomPass')?.insertAdjacentHTML('beforebegin',`<div class="szrow"><button class="gb" id="n10" onclick="ROOM_N=10;this.className='gb';n16.className='ghost'">۱۰ نفره</button><button class="ghost" id="n16" onclick="ROOM_N=16;this.className='gb';n10.className='ghost'">۱۶ نفره</button></div>`);};
})();
