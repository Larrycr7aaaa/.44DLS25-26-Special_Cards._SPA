(() => {
"use strict";
const $ = id => document.getElementById(id);
const canvas = $("gameCanvas"), ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;
let allPlayers = [], filteredPlayers = [], page = 0, pageSize = 8;
let raf = 0, lastFrame = 0, running = false, paused = false, matchOver = false;
let matchSeconds = 180, timeLeft = 180, lastSecond = 0, mode = "1P";
let score1 = 0, score2 = 0, keys = Object.create(null), prevKeys = Object.create(null);
let lastStatus = "Selecciona el modo y comienza el partido.";
const audio = $("audioTrack");
const badge1 = new Image(), badge2 = new Image();
let pitchImage = new Image(); pitchImage.src = "FUT.jpg";
badge1.src = $("p1BadgeSelect").value; badge2.src = $("cpuBadgeSelect").value;

function posClass(pos) {
  pos = (pos || "").toUpperCase();
  if (["GK","POR"].includes(pos)) return "pos-gk";
  if (["DC","SD","EI","ED","DEL"].includes(pos)) return "pos-del";
  if (["DFC","LD","LI","DF"].includes(pos)) return "pos-def";
  if (["MC","CAI","CAD","MCO","MCD","MED"].includes(pos)) return "pos-med";
  return "pos-default";
}
function statColor(n) { return n < 60 ? "#ff6464" : n < 70 ? "#ffad55" : n < 80 ? "#f4d65e" : n < 90 ? "#7ee39b" : "#6dd5ff"; }
function safeNumber(n, fallback=0) { n=Number(n); return Number.isFinite(n) ? n : fallback; }

function initCards(data) {
  allPlayers = Array.isArray(data) ? data : (data.players || []);
  const playlist = data && data.playlist;
  if (Array.isArray(playlist) && playlist.length) {
    $("trackSelect").innerHTML = '<option value="">Selecciona música (si existe)</option>';
    playlist.forEach(track => {
      const o=document.createElement("option"); o.value=track.file; o.textContent=track.title; $("trackSelect").appendChild(o);
    });
    $("musicNote").textContent="La música requiere que sus archivos estén en la carpeta.";
  }
  filteredPlayers = allPlayers.slice();
  populatePlayerSelects();
  renderPage();
}
function populatePlayerSelects() {
  ["playerSelect","player2Select"].forEach(id => {
    const sel=$(id); sel.innerHTML="";
    allPlayers.forEach((p,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent=`${p.country?.flag||""} ${p.name} (${p.rating ?? "?"} OVR · ${p.position||"?"})`;sel.appendChild(o);});
  });
  if ($("player2Select").options.length > 1) $("player2Select").selectedIndex=1;
}
function renderPage() {
  const box=$("playerContainer"); box.innerHTML="";
  $("playerCounter").textContent=`${filteredPlayers.length} jugadores`;
  const pages=Math.max(1,Math.ceil(filteredPlayers.length/pageSize)); page=Math.min(page,pages-1);
  $("pageLabel").textContent=`Página ${page+1} / ${pages}`;
  $("previousBtn").disabled=page===0; $("nextBtn").disabled=page>=pages-1;
  const list=filteredPlayers.slice(page*pageSize,(page+1)*pageSize);
  if (!list.length) {box.innerHTML='<p class="muted">No se encontraron jugadores.</p>';return;}
  list.forEach(p=>{
    const card=document.createElement("article");card.className="card";
    const wrap=document.createElement("div");wrap.className="card-img-wrapper";
    const img=document.createElement("img");img.className="player-img";img.alt=p.name||"Jugador";img.loading="lazy";img.src=p.image||"";
    img.onerror=()=>{img.onerror=null;img.style.opacity="0";wrap.textContent="⚽";wrap.style.fontSize="3rem";};wrap.appendChild(img);
    const body=document.createElement("div");body.className="card-body";
    const id=document.createElement("span");id.className="id";id.textContent=`#${p.year||""} · ${p.country?.flag||""}`;
    const name=document.createElement("h3");name.textContent=p.name||"Jugador";
    const team=document.createElement("p");team.textContent=p.team||"Equipo no indicado";
    const badges=document.createElement("div");
    const position=document.createElement("span");position.className=`tipo ${posClass(p.position)}`;position.textContent=p.position||"N/A";
    const rating=document.createElement("span");rating.className="tipo dark";rating.textContent=`${p.rating??"?"} OVR`;
    const btn=document.createElement("button");btn.className="btn-info";btn.textContent="Ver información";btn.addEventListener("click",()=>showDetails(p));
    badges.append(position,rating);body.append(id,name,team,badges,btn);card.append(wrap,body);box.appendChild(card);
  });
}
function showDetails(p) {
  const detail=$("detailContainer");detail.innerHTML="";
  const wrap=document.createElement("div");wrap.className="detail-img-wrapper";
  const img=document.createElement("img");img.className="detail-player-img";img.alt=p.name||"Jugador";img.src=p.image||"";img.onerror=()=>{img.style.opacity="0";wrap.textContent="⚽";wrap.style.fontSize="3rem";};wrap.appendChild(img);
  const h=document.createElement("h2");h.textContent=`${p.name||"Jugador"} ${p.country?.flag||""}`;
  const intro=document.createElement("p");intro.innerHTML="";intro.textContent=`${p.position||"N/A"} · ${p.rating??"?"} OVR · ${p.team||"Equipo desconocido"}`;
  detail.append(wrap,h,intro);
  const rows=[];
  if(p.stats?.physical) rows.push(["Velocidad",p.stats.physical.speed],["Aceleración",p.stats.physical.acceleration],["Resistencia",p.stats.physical.stamina],["Fuerza",p.stats.physical.strength]);
  if(p.stats?.technical) rows.push(["Control",p.stats.technical.control],["Pases",p.stats.technical.passing],["Tiro",p.stats.technical.shooting],["Entrada",p.stats.technical.tackling]);
  if(p.stats?.goalkeeping) rows.push(["Reflejos",p.stats.goalkeeping.reflexes],["Paradas",p.stats.goalkeeping.handling]);
  if(rows.length){const section=document.createElement("div");section.className="stats";const title=document.createElement("h3");title.textContent="Atributos";section.appendChild(title);
    rows.forEach(([label,val])=>{if(val===undefined)return;const n=Math.max(0,Math.min(100,safeNumber(val)));const stat=document.createElement("div");stat.className="stat";const head=document.createElement("div");head.className="stat-header";const a=document.createElement("span");a.textContent=label;const b=document.createElement("span");b.textContent=String(val);b.style.color=statColor(n);head.append(a,b);const bar=document.createElement("div");bar.className="progress";const fill=document.createElement("span");fill.style.width=n+"%";fill.style.background=statColor(n);bar.appendChild(fill);stat.append(head,bar);section.appendChild(stat);});detail.appendChild(section);}
  const more=document.createElement("p");more.textContent=`País: ${p.country?.name||"N/A"} · Tipo: ${p.cardType||"Estándar"} · Pie: ${p.preferredFoot||"N/A"}${p.heightCm?` · Altura: ${p.heightCm} cm`:""}`;detail.appendChild(more);
}
function searchPlayers(){const q=$("searchInput").value.trim().toLocaleLowerCase();filteredPlayers=allPlayers.filter(p=>[p.name,p.team,p.country?.name,p.position,p.cardType,p.rating].some(v=>String(v??"").toLocaleLowerCase().includes(q)));page=0;renderPage();}
$("searchButton").addEventListener("click",searchPlayers);$("searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")searchPlayers();});$("searchInput").addEventListener("input",searchPlayers);
$("previousBtn").addEventListener("click",()=>{page=Math.max(0,page-1);renderPage();});$("nextBtn").addEventListener("click",()=>{page++;renderPage();});
$("playPauseBtn").addEventListener("click",async()=>{if(!audio.src){setStatus("Añade los MP3 de la lista a la carpeta del proyecto para escuchar música.");return;}try{if(audio.paused){await audio.play();$("playPauseBtn").textContent="Ⅱ";}else{audio.pause();$("playPauseBtn").textContent="▶";}}catch{setStatus("El archivo de música no está disponible. El juego funciona sin música.");}});
$("trackSelect").addEventListener("change",async()=>{if(!$("trackSelect").value)return;audio.src=$("trackSelect").value;try{await audio.play();$("playPauseBtn").textContent="Ⅱ";$("trackTitle").textContent="🎵 "+$("trackSelect").selectedOptions[0].textContent;}catch{$("trackTitle").textContent="🎵 Archivo no encontrado";}});
audio.addEventListener("ended",()=>{$("playPauseBtn").textContent="▶";});

const makePlayer=(x,y,team)=>({x,y,vx:0,vy:0,r:17,team,dirX:team===1?1:-1,dirY:0,stamina:100,kickLock:0,tackle:0,stun:0});
let p1=makePlayer(270,H/2,1), p2=makePlayer(W-270,H/2,2);
let ball={x:W/2,y:H/2,vx:0,vy:0,r:8,owner:null,lastTouch:0};
const goal={top:H/2-82,bottom:H/2+82,depth:22};
let aiThink=0, aiTarget={x:W-200,y:H/2}, kickoffTicks=0;
const DIFF={facil:{speed:2.45,reaction:.22,accuracy:.65,press:0.48},media:{speed:3.05,reaction:.12,accuracy:.82,press:.7},dificil:{speed:3.65,reaction:.045,accuracy:.96,press:.95}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const norm=(x,y)=>{const l=Math.hypot(x,y)||1;return{x:x/l,y:y/l};};
function setStatus(s){lastStatus=s;$("gameStatus").textContent=s;}
function drawField(){
  ctx.clearRect(0,0,W,H);
  for(let i=0;i<10;i++){ctx.fillStyle=i%2?"#207c36":"#26863b";ctx.fillRect(i*W/10,0,W/10,H);}
  ctx.strokeStyle="#e6f4e4";ctx.lineWidth=3;ctx.strokeRect(25,24,W-50,H-48);
  ctx.beginPath();ctx.moveTo(W/2,24);ctx.lineTo(W/2,H-24);ctx.stroke();
  ctx.beginPath();ctx.arc(W/2,H/2,72,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(W/2,H/2,4,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();
  ctx.strokeRect(25,H/2-130,145,260);ctx.strokeRect(25,H/2-70,58,140);
  ctx.strokeRect(W-170,H/2-130,145,260);ctx.strokeRect(W-83,H/2-70,58,140);
  ctx.beginPath();ctx.arc(115,H/2,3,0,Math.PI*2);ctx.arc(W-115,H/2,3,0,Math.PI*2);ctx.fill();
  ctx.strokeRect(3,H/2-48,24,96);ctx.strokeRect(W-27,H/2-48,24,96);
  ctx.strokeStyle="#ffffff88";ctx.lineWidth=2;ctx.beginPath();ctx.arc(115,H/2,50,-.95,.95);ctx.stroke();ctx.beginPath();ctx.arc(W-115,H/2,50,Math.PI-.95,Math.PI+.95);ctx.stroke();
}
function drawPlayer(p,badge,label){
  ctx.save();
  ctx.shadowColor="#001c0a99";ctx.shadowBlur=10;ctx.shadowOffsetY=4;
  ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=p.team===1?"#218bff":"#f04452";ctx.fill();
  ctx.lineWidth=3;ctx.strokeStyle="#fff";ctx.stroke();ctx.shadowColor="transparent";ctx.shadowOffsetY=0;
  ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+p.dirX*15,p.y+p.dirY*15);ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.stroke();
  if(badge?.complete&&badge.naturalWidth>0){ctx.beginPath();ctx.arc(p.x,p.y-p.r-12,10,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();ctx.save();ctx.beginPath();ctx.arc(p.x,p.y-p.r-12,9,0,Math.PI*2);ctx.clip();ctx.drawImage(badge,p.x-9,p.y-p.r-21,18,18);ctx.restore();}
  ctx.fillStyle="#fff";ctx.font="bold 11px Poppins, sans-serif";ctx.textAlign="center";ctx.shadowColor="#001";ctx.shadowBlur=3;ctx.fillText(label,p.x,p.y+p.r+15);
  if(p.stamina<99){ctx.shadowBlur=0;ctx.fillStyle="#082215";ctx.fillRect(p.x-17,p.y+p.r+20,34,4);ctx.fillStyle="#b8f6ca";ctx.fillRect(p.x-17,p.y+p.r+20,34*p.stamina/100,4);}
  ctx.restore();
}
function drawBall(){ctx.save();ctx.shadowColor="#001";ctx.shadowBlur=8;ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle="#27372d";ctx.lineWidth=1.4;ctx.stroke();ctx.beginPath();ctx.arc(ball.x,ball.y,3,0,Math.PI*2);ctx.fillStyle="#17251b";ctx.fill();ctx.restore();}
function drawGame(){
  drawField();
  // Goal nets
  ctx.fillStyle="#dce9dc33";ctx.fillRect(2,goal.top,23,goal.bottom-goal.top);ctx.fillRect(W-25,goal.top,23,goal.bottom-goal.top);
  drawPlayer(p1,badge1,$("scoreName1").textContent);drawPlayer(p2,badge2,$("scoreName2").textContent);
  drawBall();
  if(!running){ctx.fillStyle="#fff9";ctx.font="bold 16px Poppins";ctx.textAlign="center";ctx.fillText("PULSA INICIAR PARTIDO",W/2,H-38);}
}
function nearest(p){return Math.hypot(ball.x-p.x,ball.y-p.y);}
function getMovement(p, up, down, left, right, sprint){
  let dx=(keys[right]?1:0)-(keys[left]?1:0),dy=(keys[down]?1:0)-(keys[up]?1:0);
  const d=norm(dx,dy);if(dx||dy){p.dirX=d.x;p.dirY=d.y;}
  const boost=keys[sprint]&&p.stamina>1?1.38:1;
  if(boost>1)p.stamina=Math.max(0,p.stamina-.65);else p.stamina=Math.min(100,p.stamina+.18);
  return {x:d.x,y:d.y,speed:(3.0+(getRating(p.team)/100)*1.3)*boost};
}
function getRating(team){const idx=team===1?Number($("playerSelect").value):Number($("player2Select").value);return clamp(safeNumber(allPlayers[idx]?.rating,80),40,100);}
function moveHuman(p,controls,dt){
  const m=getMovement(p,...controls);p.vx=m.x*m.speed;p.vy=m.y*m.speed;
  p.x=clamp(p.x+p.vx*dt,42,W-42);p.y=clamp(p.y+p.vy*dt,42,H-42);
}
function cpuMove(dt){
  const d=DIFF[$("difficultySelect").value]||DIFF.media;
  aiThink-=dt;
  if(aiThink<=0){
    aiThink=d.reaction*60;
    const ownDist=nearest(p2);
    if(ball.owner===2 || ownDist<85){
      // Carry toward the left goal, occasionally change lane to avoid a direct route.
      aiTarget={x:clamp(ball.x-100,120,W-125),y:clamp(ball.y+(Math.random()-.5)*95,70,H-70)};
    }else if(ball.owner===1){
      aiTarget={x:ball.x+28,y:ball.y};
    }else{
      aiTarget={x:ball.x+8,y:ball.y};
    }
  }
  const dir=norm(aiTarget.x-p2.x,aiTarget.y-p2.y), speed=d.speed+(getRating(2)-80)*.012;
  p2.dirX=dir.x;p2.dirY=dir.y;p2.vx=dir.x*speed;p2.vy=dir.y*speed;
  p2.x=clamp(p2.x+p2.vx*dt,42,W-42);p2.y=clamp(p2.y+p2.vy*dt,42,H-42);
  if(nearest(p2)<p2.r+ball.r+9 && ball.owner!==2){
    if(Math.random()<d.press*dt*2.2) ball.owner=2;
  }
  if(ball.owner===2){
    const distGoal=Math.hypot(ball.x-50,ball.y-H/2);
    if(distGoal<320 && Math.random()<d.accuracy*dt*.65) shoot(p2, true);
    else if(nearest(p2)<p2.r+ball.r+10 && Math.random()<dt*1.8) passBall(p2,true);
  }
  if(ball.owner===1 && nearest(p2)<48 && Math.random()<d.press*dt*1.6) tackle(p2);
}
function moveBall(dt){
  if(ball.owner){
    const p=ball.owner===1?p1:p2;
    ball.x=p.x+p.dirX*(p.r+ball.r+2);ball.y=p.y+p.dirY*(p.r+ball.r+2);
    ball.vx=p.vx*.7;ball.vy=p.vy*.7;
  }else{
    ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
    const drag=Math.pow(.986,dt);ball.vx*=drag;ball.vy*=drag;
    if(Math.hypot(ball.vx,ball.vy)<.14){ball.vx=0;ball.vy=0;}
  }
  if(ball.y<34){ball.y=34;ball.vy=Math.abs(ball.vy)*.72;}
  if(ball.y>H-34){ball.y=H-34;ball.vy=-Math.abs(ball.vy)*.72;}
  // Side boundaries only open inside the goal mouth.
  if(ball.x<28 && !(ball.y>goal.top&&ball.y<goal.bottom)){ball.x=28;ball.vx=Math.abs(ball.vx)*.72;}
  if(ball.x>W-28 && !(ball.y>goal.top&&ball.y<goal.bottom)){ball.x=W-28;ball.vx=-Math.abs(ball.vx)*.72;}
  if(ball.x<12 && ball.y>goal.top&&ball.y<goal.bottom){goalScored(2);return;}
  if(ball.x>W-12 && ball.y>goal.top&&ball.y<goal.bottom){goalScored(1);return;}
  if(!ball.owner){
    for(const p of [p1,p2]){
      if(Math.hypot(ball.x-p.x,ball.y-p.y)<p.r+ball.r+2){ball.owner=p.team;ball.lastTouch=p.team;setStatus((p.team===1?$("scoreName1").textContent:$("scoreName2").textContent)+" controla el balón.");break;}
    }
  }
}
function shoot(p,power=false){
  if(!running||paused||matchOver)return;
  if(ball.owner!==p.team && nearest(p)>p.r+ball.r+16)return;
  const direction=norm(p.dirX|| (p.team===1?1:-1),p.dirY||0);
  ball.owner=null;ball.lastTouch=p.team;
  const rating=getRating(p.team), speed=(power?14:10)+(rating/100)*2.5;
  ball.vx=direction.x*speed;ball.vy=direction.y*speed;
  p.kickLock=18;
  setStatus(power?"¡Tiro potente!":"¡Disparo!");
}
function passBall(p,cpu=false){
  if(!running||paused||matchOver)return;
  if(ball.owner!==p.team && nearest(p)>p.r+ball.r+14)return;
  const target=cpu?{x:W/2-70,y:H/2+(Math.random()-.5)*140}: {x:p.x+p.dirX*230,y:p.y+p.dirY*230};
  const d=norm(target.x-p.x,target.y-p.y);ball.owner=null;ball.lastTouch=p.team;ball.vx=d.x*7.6;ball.vy=d.y*7.6;p.kickLock=12;setStatus("Pase en juego.");
}
function tackle(p){
  if(!running||paused||matchOver)return;
  p.tackle=16;
  const opponent=p.team===1?p2:p1, dist=Math.hypot(opponent.x-p.x,opponent.y-p.y);
  if(dist< p.r+opponent.r+19 && ball.owner===opponent.team){ball.owner=p.team;ball.vx=0;ball.vy=0;setStatus("¡Entrada limpia! Recuperaste el balón.");}
  else if(!ball.owner && nearest(p)<p.r+ball.r+20){ball.vx=p.dirX*5.5;ball.vy=p.dirY*5.5;ball.lastTouch=p.team;setStatus("Despeje defensivo.");}
}
function goalScored(team){
  if(matchOver)return;
  if(team===1)score1++;else score2++;
  updateScore();setStatus("⚽ ¡GOOOL de "+(team===1?$("scoreName1").textContent:$("scoreName2").textContent)+"!");
  $("gameOverlay").classList.remove("hidden");
  $("gameOverlay").innerHTML=`<div class="overlay-card"><div class="overlay-ball">⚽</div><h3>¡GOOOOL!</h3><p>${$("scoreName1").textContent} ${score1} — ${score2} ${$("scoreName2").textContent}</p><p class="overlay-small">El partido continúa en un instante…</p></div>`;
  resetPositions();kickoffTicks=55;
}
function updateScore(){$("scoreP1").textContent=score1;$("scoreP2").textContent=score2;}
function resetPositions(){p1.x=270;p1.y=H/2;p1.vx=p1.vy=0;p1.dirX=1;p1.dirY=0;p2.x=W-270;p2.y=H/2;p2.vx=p2.vy=0;p2.dirX=-1;p2.dirY=0;ball.x=W/2;ball.y=H/2;ball.vx=ball.vy=0;ball.owner=null;aiThink=0;}
function endMatch(){running=false;matchOver=true;paused=false;$("pauseGameBtn").disabled=true;$("pauseGameBtn").textContent="Ⅱ Pausar";$("gameOverlay").classList.remove("hidden");const draw=score1===score2;const winner=score1>score2?$("scoreName1").textContent:$("scoreName2").textContent;$("gameOverlay").innerHTML=`<div class="overlay-card"><div class="overlay-ball">${draw?"🤝":"🏆"}</div><h3>${draw?"¡Empate!":"¡Final del partido!"}</h3><p>${$("scoreName1").textContent} ${score1} — ${score2} ${$("scoreName2").textContent}</p><p>${draw?"Buen partido para ambos equipos.":"Ganador: "+winner}</p><p class="overlay-small">Pulsa Iniciar partido para jugar otra vez.</p></div>`;setStatus("Partido finalizado.");drawGame();}
function updateTimer(now){if(now-lastSecond>=1000){lastSecond=now;timeLeft=Math.max(0,timeLeft-1);const m=Math.floor(timeLeft/60),s=timeLeft%60;$("gameTimer").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;if(timeLeft<=0)endMatch();}}
function justPressed(k){return !!keys[k]&&!prevKeys[k];}
function update(dt,now){
  if(!running||paused||matchOver)return;
  if(kickoffTicks>0){kickoffTicks--;if(kickoffTicks===0)$("gameOverlay").classList.add("hidden");}
  moveHuman(p1,["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","q"],dt);
  if(mode==="2P")moveHuman(p2,["w","s","a","d","e"],dt);else cpuMove(dt);
  if(justPressed(" ")||justPressed("Space"))shoot(p1,false);
  if(justPressed("Shift"))passBall(p1);
  if(justPressed("z"))shoot(p1,true);
  if(justPressed("x"))tackle(p1);
  if(mode==="2P"){
    if(justPressed("f"))shoot(p2,false);
    if(justPressed("g"))passBall(p2);
    if(justPressed("t"))shoot(p2,true);
    if(justPressed("r"))tackle(p2);
  }else{
    // CPU can attempt a shot or tackle when in range.
    if(ball.owner===2 && nearest(p2)<p2.r+ball.r+10 && Math.random()<.025)shoot(p2,false);
  }
  if(p1.kickLock>0)p1.kickLock--;if(p2.kickLock>0)p2.kickLock--;
  if(p1.tackle>0)p1.tackle--;if(p2.tackle>0)p2.tackle--;
  // Player-to-player contact prevents overlap.
  const dx=p2.x-p1.x,dy=p2.y-p1.y,dist=Math.hypot(dx,dy),min=p1.r+p2.r+1;
  if(dist<min){const n=norm(dx,dy),push=(min-dist)/2;p1.x-=n.x*push;p1.y-=n.y*push;p2.x+=n.x*push;p2.y+=n.y*push;}
  moveBall(dt);updateTimer(now);
}
function loop(now){
  const dt=clamp((now-lastFrame)/16.67||1,.2,2.2);lastFrame=now;
  update(dt,now);drawGame();prevKeys={...keys};
  raf=requestAnimationFrame(loop);
}
function startMatch(){
  if(raf)cancelAnimationFrame(raf);
  mode=$("gameModeSelect").value;matchSeconds=Number($("durationSelect").value)||180;timeLeft=matchSeconds;lastSecond=performance.now();score1=score2=0;updateScore();matchOver=false;paused=false;running=true;
  badge1.src=$("p1BadgeSelect").value;badge2.src=$("cpuBadgeSelect").value;
  const a=allPlayers[Number($("playerSelect").value)]||{name:"Jugador 1",rating:80};
  const b=mode==="2P"?(allPlayers[Number($("player2Select").value)]||{name:"Jugador 2",rating:80}):null;
  $("scoreName1").textContent=(a.name||"Jugador 1").toLocaleUpperCase().slice(0,20);
  $("scoreName2").textContent=mode==="2P"?(b.name||"Jugador 2").toLocaleUpperCase().slice(0,20):"CPU";
  $("scoreBadge1").src=$("p1BadgeSelect").value;$("scoreBadge2").src=$("cpuBadgeSelect").value;
  $("gameTimer").textContent=`${String(Math.floor(timeLeft/60)).padStart(2,"0")}:${String(timeLeft%60).padStart(2,"0")}`;
  $("pauseGameBtn").disabled=false;$("pauseGameBtn").textContent="Ⅱ Pausar";$("gameOverlay").classList.add("hidden");
  p1=makePlayer(270,H/2,1);p2=makePlayer(W-270,H/2,2);resetPositions();keys=Object.create(null);prevKeys=Object.create(null);
  setStatus(mode==="2P"?"Partido local iniciado. ¡Que gane el mejor!":"Partido iniciado. La CPU ajustará su presión según la dificultad.");
  lastFrame=performance.now();raf=requestAnimationFrame(loop);
}
$("startGameBtn").addEventListener("click",startMatch);
$("pauseGameBtn").addEventListener("click",()=>{
  if(!running||matchOver)return;paused=!paused;
  if(paused){$("pauseGameBtn").textContent="▶ Reanudar";$("gameOverlay").classList.remove("hidden");$("gameOverlay").innerHTML='<div class="overlay-card"><div class="overlay-ball">Ⅱ</div><h3>Partido pausado</h3><p>Pulsa Reanudar para continuar.</p></div>';setStatus("Partido pausado.");}
  else{$("pauseGameBtn").textContent="Ⅱ Pausar";$("gameOverlay").classList.add("hidden");lastFrame=performance.now();lastSecond=performance.now();setStatus("Partido reanudado.");}
});
$("gameModeSelect").addEventListener("change",()=>{const two=$("gameModeSelect").value==="2P";$("p2PlayerGroup").classList.toggle("hidden",!two);$("difficultyGroup").classList.toggle("hidden",two);});
window.addEventListener("keydown",e=>{
  const key=e.key===" "?" ":e.key.length===1?e.key.toLowerCase():e.key;
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();
  keys[key]=true;
});
window.addEventListener("keyup",e=>{const key=e.key===" "?" ":e.key.length===1?e.key.toLowerCase():e.key;keys[key]=false;});
window.addEventListener("blur",()=>{keys=Object.create(null);});
$("p1BadgeSelect").addEventListener("change",()=>{badge1.src=$("p1BadgeSelect").value;$("scoreBadge1").src=badge1.src;drawGame();});
$("cpuBadgeSelect").addEventListener("change",()=>{badge2.src=$("cpuBadgeSelect").value;$("scoreBadge2").src=badge2.src;drawGame();});
$("difficultySelect").addEventListener("change",()=>setStatus("Dificultad CPU: "+$("difficultySelect").selectedOptions[0].textContent+". Se aplica al siguiente movimiento."));
fetch("dls26-cards.json").then(r=>{if(!r.ok)throw new Error("No se pudo cargar dls26-cards.json");return r.json();}).then(initCards).catch(()=>{$("errorMessage").classList.remove("hidden");$("errorMessage").textContent="No se pudo cargar la base de cartas. Comprueba que dls26-cards.json esté en la misma carpeta y abre el proyecto mediante GitHub Pages o un servidor local.";allPlayers=[];populatePlayerSelects();});
drawGame();
})();