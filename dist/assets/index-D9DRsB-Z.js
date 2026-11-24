(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const a of i)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&s(r)}).observe(document,{childList:!0,subtree:!0});function t(i){const a={};return i.integrity&&(a.integrity=i.integrity),i.referrerPolicy&&(a.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?a.credentials="include":i.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function s(i){if(i.ep)return;i.ep=!0;const a=t(i);fetch(i.href,a)}})();function L(){const n=window.location.hash.replace(/^#\/?/,""),[e,t]=n.split("?"),s=new URLSearchParams(t??"");switch(e){case"trial":return{name:"trial",debug:s.get("debug")==="1"};case"results":return{name:"results"};case"select":default:return{name:"select"}}}function u(n){window.location.hash=n}function O(n){const e=()=>n(L());return window.addEventListener("hashchange",e),()=>window.removeEventListener("hashchange",e)}const m=[{id:"green-pasture",name:"青坡牧场",description:"缓坡直道，三道门一字排开，障碍少。适合第一次下口令。",width:1200,height:800,handler:{x:110,y:400},hill:{center:{x:1030,y:400},radius:95},gates:[{id:0,a:{x:800,y:330},b:{x:800,y:470},approach:{x:900,y:400}},{id:1,a:{x:560,y:330},b:{x:560,y:470},approach:{x:680,y:400}},{id:2,a:{x:320,y:330},b:{x:320,y:470},approach:{x:440,y:400}}],pen:{center:{x:140,y:400},radius:78,opening:56,openingAngle:Math.PI},grass:[{center:{x:1030,y:400},radius:110,strength:1},{center:{x:690,y:180},radius:80,strength:.7},{center:{x:430,y:630},radius:85,strength:.75}],obstacles:[{center:{x:680,y:620},radius:34},{center:{x:700,y:180},radius:28}],timeLimit:240},{id:"winding-valley",name:"蜿蜒谷地",description:"S 形门线，树丛与岩石夹道，羊群容易在弯道被草地吸偏。",width:1200,height:800,handler:{x:100,y:690},hill:{center:{x:1050,y:150},radius:90},gates:[{id:0,a:{x:880,y:150},b:{x:980,y:250},approach:{x:1e3,y:120}},{id:1,a:{x:700,y:430},b:{x:820,y:470},approach:{x:850,y:330}},{id:2,a:{x:430,y:560},b:{x:470,y:680},approach:{x:560,y:640}},{id:3,a:{x:240,y:560},b:{x:200,y:450},approach:{x:330,y:520}}],obstacles:[{center:{x:840,y:350},radius:40},{center:{x:600,y:250},radius:36},{center:{x:560,y:500},radius:30},{center:{x:300,y:280},radius:42},{center:{x:950,y:550},radius:32}],pen:{center:{x:130,y:470},radius:72,opening:54,openingAngle:.35},grass:[{center:{x:1050,y:150},radius:100,strength:1},{center:{x:700,y:200},radius:75,strength:.8},{center:{x:380,y:720},radius:80,strength:.85},{center:{x:180,y:180},radius:70,strength:.65}],timeLimit:300},{id:"high-moor",name:"高寒荒原",description:"大风荒原，门线长、草地稀疏，脾性躁的羊在开阔地更容易脱群。",width:1200,height:800,handler:{x:600,y:720},hill:{center:{x:600,y:110},radius:100},gates:[{id:0,a:{x:380,y:260},b:{x:500,y:230},approach:{x:520,y:150}},{id:1,a:{x:840,y:360},b:{x:800,y:480},approach:{x:760,y:330}},{id:2,a:{x:560,y:540},b:{x:450,y:580},approach:{x:600,y:470}}],obstacles:[{center:{x:240,y:400},radius:44},{center:{x:960,y:180},radius:38},{center:{x:900,y:640},radius:46},{center:{x:180,y:640},radius:30}],pen:{center:{x:600,y:660},radius:76,opening:58,openingAngle:-Math.PI/2},grass:[{center:{x:600,y:110},radius:105,strength:.9},{center:{x:1050,y:300},radius:70,strength:.6},{center:{x:250,y:520},radius:70,strength:.6}],timeLimit:270}],g={steady:{id:"steady",name:"沉稳群羊",description:"怕狗但不慌，抱团紧、恢复快，适合新手熟悉口令。",fleeWeight:1,cohesionWeight:1,alignWeight:.8,grassWeight:.55,noise:.18,speedFactor:.95,calmFactor:1.15,strayFactor:.8},skittish:{id:"skittish",name:"惊弓群羊",description:"一点压力就炸群，脱群多、恢复慢，狗必须保持距离。",fleeWeight:1.45,cohesionWeight:.8,alignWeight:.7,grassWeight:.4,noise:.4,speedFactor:1.15,calmFactor:.7,strayFactor:1.6},stubborn:{id:"stubborn",name:"倔头群羊",description:"不怕狗、恋草地，推力弱时纹丝不动，但一旦走动方向很稳。",fleeWeight:.65,cohesionWeight:1.1,alignWeight:.9,grassWeight:.95,noise:.15,speedFactor:.8,calmFactor:1.3,strayFactor:.6},flighty:{id:"flighty",name:"躁进群羊",description:"跑得快、转向急，头羊一动全队跟风，稍不留神就冲过头。",fleeWeight:1.15,cohesionWeight:.9,alignWeight:1.25,grassWeight:.45,noise:.3,speedFactor:1.3,calmFactor:.9,strayFactor:1.25}},D=[g.steady,g.skittish,g.stubborn,g.flighty],q={fleeWeight:1,cohesionWeight:1,alignWeight:.8,grassWeight:.55,fleeRadius:300,pressureDecay:.85,strayRadius:2.4,leaderInfluence:.7,dogMaxSpeed:300,dogAccel:520,dogTurnRate:4.2,noise:.32},P="sheepdog-trial-session",E="sheepdog-trial-history";function H(n){sessionStorage.setItem(P,JSON.stringify(n));const e=x();e.unshift(n),sessionStorage.setItem(E,JSON.stringify(e.slice(0,20)))}function _(){const n=sessionStorage.getItem(P);return n?JSON.parse(n):null}function x(){const n=sessionStorage.getItem(E);return n?JSON.parse(n):[]}const M="sheepdog-trial-selection",b={courseId:m[0].id,temperament:"steady",sheepCount:8};function v(){try{const n=localStorage.getItem(M);return n?{...b,...JSON.parse(n)}:b}catch{return b}}function N(n){const e=v(),t=x();n.innerHTML=`
    <div class="section-title">① 选择赛场</div>
    <div class="card-grid" id="course-grid">
      ${m.map(a=>`
        <div class="card selectable ${a.id===e.courseId?"selected":""}" data-course="${a.id}">
          <h3>${a.name}</h3>
          <p>${a.description}</p>
          <p>
            <span class="tag">${a.gates.length} 道门</span>
            <span class="tag">时限 ${a.timeLimit}s</span>
            <span class="tag">${a.obstacles.length} 处障碍</span>
          </p>
        </div>`).join("")}
    </div>

    <div class="section-title">② 选择羊群脾性</div>
    <div class="card-grid" id="temp-grid">
      ${D.map(a=>`
        <div class="card selectable ${a.id===e.temperament?"selected":""}" data-temp="${a.id}">
          <h3>${a.name}</h3>
          <p>${a.description}</p>
          <p>
            <span class="tag">怕狗 ×${a.fleeWeight}</span>
            <span class="tag">抱团 ×${a.cohesionWeight}</span>
            <span class="tag">速度 ×${a.speedFactor}</span>
          </p>
        </div>`).join("")}
    </div>

    <div class="section-title">③ 羊只数量</div>
    <div class="card">
      <div class="row wrap">
        ${[5,8,12].map(a=>`
          <button data-count="${a}" class="${a===e.sheepCount?"active":""}">${a} 只</button>`).join("")}
        <span class="muted">羊越多，过门与入圈的完整度考核越难。</span>
      </div>
    </div>

    <div class="section-title">评分规则（对齐 ISDS 国际牧羊犬协会百分制）</div>
    <div class="card">
      <p class="muted">
        Outrun 围跑 20 分 · Lift 起步 10 分 · Fetch 赶回 20 分 · Drive 驱赶 30 分 · Pen 入圈 10 分 ·
        Shed 群羊完整度 10 分（本游戏无分羊环节，按脱群/压迫失误考核）。
        每道门漏一只羊扣 1 分，门序错误扣 2 分，脱群满 2 秒扣 1 分，贴脸压迫每秒扣 0.5 分；
        超时每秒另扣 0.5 分。
      </p>
    </div>

    <div class="section-title">开始</div>
    <div class="row wrap" style="margin-bottom:24px">
      <button class="primary" id="start-btn">开始比赛</button>
      <button id="debug-btn">进入羊群行为调试页</button>
      <button id="results-btn">查看历史成绩</button>
    </div>

    ${t.length>0?`<div class="section-title">最近成绩</div>
           <div class="card">
             <table class="score">
               <thead><tr><th>赛场</th><th>脾性</th><th class="num">得分</th><th class="num">用时</th><th>结果</th></tr></thead>
               <tbody>
                 ${t.slice(0,5).map(a=>`
                   <tr>
                     <td>${a.course.name}</td>
                     <td>${a.temperament}</td>
                     <td class="num">${a.score.total}</td>
                     <td class="num">${a.score.timeUsed.toFixed(0)}s</td>
                     <td>${a.score.finished?'<span class="pill good">全部入圈</span>':'<span class="pill bad">未完成</span>'}</td>
                   </tr>`).join("")}
               </tbody>
             </table>
           </div>`:""}
  `;const s={...e},i=()=>localStorage.setItem(M,JSON.stringify(s));n.querySelectorAll("[data-course]").forEach(a=>{a.addEventListener("click",()=>{s.courseId=a.dataset.course,n.querySelectorAll("[data-course]").forEach(r=>r.classList.toggle("selected",r===a)),i()})}),n.querySelectorAll("[data-temp]").forEach(a=>{a.addEventListener("click",()=>{s.temperament=a.dataset.temp,n.querySelectorAll("[data-temp]").forEach(r=>r.classList.toggle("selected",r===a)),i()})}),n.querySelectorAll("[data-count]").forEach(a=>{a.addEventListener("click",()=>{s.sheepCount=Number(a.dataset.count),n.querySelectorAll("[data-count]").forEach(r=>r.classList.toggle("active",r===a)),i()})}),n.querySelector("#start-btn")?.addEventListener("click",()=>{i(),u("#/trial")}),n.querySelector("#debug-btn")?.addEventListener("click",()=>{i(),u("#/trial?debug=1")}),n.querySelector("#results-btn")?.addEventListener("click",()=>{u("#/results")})}function j(){const n=v();return m.find(e=>e.id===n.courseId)??m[0]}function U(){return v()}const G=(n,e)=>Math.hypot(n.x-e.x,n.y-e.y),Y="#f5f1e6",z="#e8a33d",J="#c9d8b8",S="#5b4636",K="#d9534f",$="#5cb85c";class B{constructor(e,t){this.canvas=e,this.course=t;const s=e.getContext("2d");if(!s)throw new Error("Canvas 2D context unavailable");this.ctx=s,this.resize()}ctx;scale=1;offsetX=0;offsetY=0;resize(){const e=this.canvas.parentElement;if(!e)return;const t=e.getBoundingClientRect(),s=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.max(320,t.width*s),this.canvas.height=Math.max(240,t.height*s),this.canvas.style.width=`${t.width}px`,this.canvas.style.height=`${t.height}px`,this.scale=Math.min(this.canvas.width/this.course.width,this.canvas.height/this.course.height),this.offsetX=(this.canvas.width-this.course.width*this.scale)/2,this.offsetY=(this.canvas.height-this.course.height*this.scale)/2}render(e,t){const{ctx:s}=this;s.clearRect(0,0,this.canvas.width,this.canvas.height),s.save(),s.translate(this.offsetX,this.offsetY),s.scale(this.scale,this.scale),this.drawField(),this.drawGrass(),this.drawPen(),this.drawGates(e.sheep),this.drawObstacles(),this.drawHill(),t.debug&&this.drawDebugOverlays(e,t),this.drawSheep(e.sheep),this.drawDog(e.dog),this.drawHandler(e.handler),t.debug&&this.drawStats(e.stats),s.restore()}drawField(){const{ctx:e,course:t}=this;e.fillStyle="#7d9c5a",e.fillRect(0,0,t.width,t.height),e.strokeStyle="rgba(60, 90, 40, 0.18)",e.lineWidth=1;for(let s=30;s<t.width;s+=46)e.beginPath(),e.moveTo(s,0),e.lineTo(s-120,t.height),e.stroke();e.strokeStyle="rgba(255,255,255,0.5)",e.lineWidth=4,e.strokeRect(2,2,t.width-4,t.height-4)}drawHill(){const{ctx:e,course:t}=this,s=t.hill,i=e.createRadialGradient(s.center.x,s.center.y,10,s.center.x,s.center.y,s.radius+30);i.addColorStop(0,"rgba(120, 95, 60, 0.35)"),i.addColorStop(1,"rgba(120, 95, 60, 0)"),e.fillStyle=i,e.beginPath(),e.arc(s.center.x,s.center.y,s.radius+30,0,Math.PI*2),e.fill(),e.fillStyle="rgba(80, 60, 35, 0.55)",e.font="16px system-ui",e.textAlign="center",e.fillText("山坡",s.center.x,s.center.y-s.radius-12)}drawGrass(){const{ctx:e,course:t}=this;for(const s of t.grass)e.fillStyle=`rgba(95, 145, 60, ${.16+s.strength*.12})`,e.beginPath(),e.arc(s.center.x,s.center.y,s.radius,0,Math.PI*2),e.fill(),e.strokeStyle="rgba(60, 100, 40, 0.35)",e.setLineDash([6,6]),e.stroke(),e.setLineDash([])}drawObstacles(){const{ctx:e,course:t}=this;for(const s of t.obstacles)e.fillStyle="#6e6257",e.beginPath(),e.arc(s.center.x,s.center.y,s.radius,0,Math.PI*2),e.fill(),e.fillStyle="rgba(255,255,255,0.12)",e.beginPath(),e.arc(s.center.x-s.radius*.3,s.center.y-s.radius*.3,s.radius*.45,0,Math.PI*2),e.fill()}drawGates(e){const{ctx:t,course:s}=this;s.gates.forEach((i,a)=>{const r=e.filter(o=>o.gatesPassed.includes(i.id)).length,c=r===e.length;t.strokeStyle=c?$:K,t.lineWidth=5,t.beginPath(),t.moveTo(i.a.x,i.a.y),t.lineTo(i.b.x,i.b.y),t.stroke(),t.fillStyle=c?$:"#8c2f2c";for(const o of[i.a,i.b])t.beginPath(),t.arc(o.x,o.y,7,0,Math.PI*2),t.fill();const h={x:(i.a.x+i.b.x)/2,y:(i.a.y+i.b.y)/2};t.fillStyle="rgba(30,30,30,0.8)",t.font="bold 15px system-ui",t.textAlign="center",t.fillText(`${a+1}  ${r}/${e.length}`,h.x,h.y-14)})}drawPen(){const{ctx:e,course:t}=this,s=t.pen;e.save(),e.translate(s.center.x,s.center.y),e.rotate(s.openingAngle);const i=s.opening/2;e.strokeStyle="#8a6d3b",e.lineWidth=7,e.beginPath(),e.arc(0,0,s.radius,i,Math.PI*2-i),e.stroke(),e.fillStyle="#6b532b";for(const a of[i,Math.PI*2-i])e.beginPath(),e.arc(Math.cos(a)*s.radius,Math.sin(a)*s.radius,6,0,Math.PI*2),e.fill();e.restore(),e.fillStyle="rgba(120, 90, 40, 0.55)",e.font="15px system-ui",e.textAlign="center",e.fillText("羊圈",s.center.x,s.center.y)}drawSheep(e){const{ctx:t}=this;for(const s of e){const i=s.penned?J:s.stray?z:Y;s.pressure>.05&&(t.strokeStyle=`rgba(220, 60, 60, ${s.pressure*.7})`,t.lineWidth=2,t.beginPath(),t.arc(s.pos.x,s.pos.y,12+s.pressure*10,0,Math.PI*2),t.stroke()),t.fillStyle=i,t.beginPath(),t.ellipse(s.pos.x,s.pos.y,9,7,Math.atan2(s.vel.y,s.vel.x),0,Math.PI*2),t.fill(),t.strokeStyle="rgba(0,0,0,0.25)",t.lineWidth=1,t.stroke();const a=Math.atan2(s.vel.y,s.vel.x),r=s.pos.x+Math.cos(a)*8,c=s.pos.y+Math.sin(a)*8;t.fillStyle="#3d342b",t.beginPath(),t.arc(r,c,3.4,0,Math.PI*2),t.fill()}}drawDog(e){const{ctx:t}=this;t.save(),t.translate(e.pos.x,e.pos.y),t.rotate(e.heading),t.fillStyle=S,t.beginPath(),t.ellipse(0,0,13,8,0,0,Math.PI*2),t.fill(),t.fillStyle="#45362a",t.beginPath(),t.arc(11,0,5.5,0,Math.PI*2),t.fill(),t.strokeStyle=S,t.lineWidth=3,t.beginPath(),t.moveTo(-11,0),t.lineTo(-18,-4),t.stroke(),t.restore(),e.target&&(t.strokeStyle="rgba(40, 90, 200, 0.6)",t.setLineDash([4,4]),t.lineWidth=1.5,t.beginPath(),t.moveTo(e.pos.x,e.pos.y),t.lineTo(e.target.x,e.target.y),t.stroke(),t.setLineDash([]),t.fillStyle="rgba(40, 90, 200, 0.7)",t.beginPath(),t.arc(e.target.x,e.target.y,4,0,Math.PI*2),t.fill())}drawHandler(e){const{ctx:t}=this;t.fillStyle="#2f4a6b",t.beginPath(),t.arc(e.x,e.y,10,0,Math.PI*2),t.fill(),t.fillStyle="#e8d9bf",t.beginPath(),t.arc(e.x,e.y-3,4.5,0,Math.PI*2),t.fill(),t.fillStyle="rgba(30,30,30,0.7)",t.font="13px system-ui",t.textAlign="center",t.fillText("指挥位",e.x,e.y+26)}drawDebugOverlays(e,t){const{ctx:s,course:i}=this;if(t.showCentroid){const a=e.stats.centroid;s.strokeStyle="rgba(255, 255, 255, 0.9)",s.lineWidth=2,s.beginPath(),s.arc(a.x,a.y,14,0,Math.PI*2),s.stroke(),s.beginPath(),s.moveTo(a.x-20,a.y),s.lineTo(a.x+20,a.y),s.moveTo(a.x,a.y-20),s.lineTo(a.x,a.y+20),s.stroke()}if(t.showFleeRadius&&t.params&&(s.strokeStyle="rgba(220, 60, 60, 0.4)",s.setLineDash([8,8]),s.lineWidth=1.5,s.beginPath(),s.arc(e.dog.pos.x,e.dog.pos.y,t.params.fleeRadius,0,Math.PI*2),s.stroke(),s.setLineDash([])),t.showForces){const a=e.stats.centroid;s.strokeStyle="rgba(255, 80, 80, 0.8)",s.lineWidth=2,s.beginPath(),s.moveTo(a.x,a.y),s.lineTo(e.dog.pos.x,e.dog.pos.y),s.stroke();const r={x:a.x-e.dog.pos.x,y:a.y-e.dog.pos.y},c=Math.hypot(r.x,r.y)||1;s.strokeStyle="rgba(80, 200, 255, 0.9)",s.beginPath(),s.moveTo(a.x,a.y),s.lineTo(a.x+r.x/c*60,a.y+r.y/c*60),s.stroke()}}drawStats(e){const{ctx:t}=this,s=[`平均压力 ${e.avgPressure.toFixed(2)}  最大 ${e.maxPressure.toFixed(2)}`,`脱群 ${e.strayCount} 只  均速 ${e.avgSpeed.toFixed(0)} px/s`,e.driveAngleDeg===null?"驱向夹角 —":`驱向夹角 ${e.driveAngleDeg.toFixed(1)}°`,`门 ${e.gatesCleared}/${e.gateProgress.length}  入圈 ${e.pennedCount}`];t.font="13px ui-monospace, monospace",t.textAlign="left",s.forEach((i,a)=>{t.fillStyle="rgba(20, 30, 20, 0.72)";const r=22+a*19;t.fillRect(10,r-13,t.measureText(i).width+14,17),t.fillStyle="#eaf3df",t.fillText(i,17,r)})}screenToWorld(e,t){const s=this.canvas.getBoundingClientRect(),i=e-s.left,a=t-s.top,r=Math.min(window.devicePixelRatio||1,2);return{x:(i*r-this.offsetX)/this.scale,y:(a*r-this.offsetY)/this.scale}}distanceToDog(e,t){return G(e.dog.pos,t)}}class X{worker=null;snapshotListeners=new Set;finishListeners=new Set;constructor(){this.spawn()}spawn(){this.worker=new Worker(new URL(""+new URL("simWorker-DQrK7P-i.js",import.meta.url).href,import.meta.url),{type:"module"}),this.worker.onmessage=e=>{const t=e.data;t.type==="snapshot"?this.snapshotListeners.forEach(s=>s(t.snapshot)):t.type==="finished"&&(this.snapshotListeners.forEach(s=>s(t.snapshot)),this.finishListeners.forEach(s=>s(t.snapshot,t.score)))},this.worker.onerror=e=>{console.error("Sim worker error:",e)}}init(e){this.send({type:"init",config:e})}command(e){this.send({type:"command",command:e})}pause(e){this.send({type:"pause",paused:e})}speed(e){this.send({type:"speed",multiplier:e})}updateParams(e){this.send({type:"params",params:e})}reset(){this.send({type:"reset"})}onSnapshot(e){return this.snapshotListeners.add(e),()=>this.snapshotListeners.delete(e)}onFinished(e){return this.finishListeners.add(e),()=>this.finishListeners.delete(e)}send(e){this.worker?.postMessage(e)}dispose(){this.worker?.terminate(),this.worker=null,this.snapshotListeners.clear(),this.finishListeners.clear()}}const k=[{cmd:"come-by",label:"绕左",en:"Come-by",key:"Q",hint:"顺时针包抄羊群左侧"},{cmd:"away-to-me",label:"绕右",en:"Away to me",key:"E",hint:"逆时针包抄羊群右侧"},{cmd:"walk-on",label:"靠近",en:"Walk on",key:"W",hint:"从正后方缓步压迫推进"},{cmd:"lie-down",label:"停",en:"Lie down",key:"S",hint:"原地趴下，让羊群冷静"},{cmd:"recall",label:"召回",en:"That'll do",key:"R",hint:"回到指挥位"}];function Q(n,e){n.innerHTML=`
    <div class="whistle-grid">
      ${k.map(i=>`
        <button data-cmd="${i.cmd}" title="${i.hint}（快捷键 ${i.key}）">
          ${i.label}<span class="cmd-en">${i.en} · <span class="kbd">${i.key}</span></span>
        </button>`).join("")}
    </div>
    <p class="muted" style="margin-top:8px">
      狗听到哨音后按自身速度、加速度和转向极限跑过去，连按新哨音会立即改变意图。
    </p>
  `;const t=new Map;n.querySelectorAll("[data-cmd]").forEach(i=>{const a=i.dataset.cmd;t.set(a,i),i.addEventListener("click",()=>e.command(a))});const s=i=>{if(i.target instanceof HTMLInputElement)return;const a=k.find(r=>r.key===i.key.toUpperCase());a&&(i.preventDefault(),e.command(a.cmd),t.get(a.cmd)?.classList.add("active"),window.setTimeout(()=>t.get(a.cmd)?.classList.remove("active"),180))};return window.addEventListener("keydown",s),{setActive(i){t.forEach((a,r)=>a.classList.toggle("active",r===i))},destroy(){window.removeEventListener("keydown",s),n.innerHTML=""}}}function V(n,e){const t=U(),s=j(),i={course:s,temperament:t.temperament,sheepCount:t.sheepCount,dt:1/60,seed:20261124};n.innerHTML=`
    <div class="topbar" style="margin-bottom:12px">
      <h1>${e?"羊群行为调试":"牧羊犬比赛"} · ${s.name}</h1>
      <span class="pill">脾性：${t.temperament}</span>
      <span class="pill">${t.sheepCount} 只羊</span>
      <span style="flex:1"></span>
      <a href="#/select">← 返回选择</a>
      ${e?"":'<a href="#/results">成绩页</a>'}
    </div>
    <div class="layout">
      <div class="canvas-wrap"><canvas id="trial-canvas"></canvas></div>
      <div class="side">
        <div class="panel" id="hud-panel">
          <h4>赛场数据</h4>
          <div class="hud" id="hud"></div>
        </div>
        <div class="panel">
          <h4>哨音指挥</h4>
          <div id="command-bar"></div>
        </div>
        <div class="panel">
          <h4>回放控制</h4>
          <div class="row wrap">
            <button id="pause-btn">暂停</button>
            <button id="reset-btn">重开</button>
            <select id="speed-select" style="background:var(--panel-2);color:var(--fg);border:1px solid var(--border);border-radius:8px;padding:8px">
              <option value="0.5">0.5×</option>
              <option value="1" selected>1×</option>
              <option value="2">2×</option>
            </select>
          </div>
        </div>
        <div class="panel" id="debug-panel" ${e?"":"hidden"}>
          <h4>行为参数（实时）</h4>
          <div id="sliders"></div>
          <label class="check-row"><input type="checkbox" id="chk-flee" checked> 狗的逃逸影响圈</label>
          <label class="check-row"><input type="checkbox" id="chk-forces" checked> 压力/推力方向</label>
          <label class="check-row"><input type="checkbox" id="chk-centroid" checked> 羊群质心</label>
        </div>
      </div>
    </div>
  `;const a=n.querySelector("#trial-canvas"),r=new B(a,s),c=new X,h=Q(n.querySelector("#command-bar"),c),o={debug:e,params:{...q},showFleeRadius:!0,showForces:!0,showCentroid:!0};let p=!1;const C=c.onSnapshot(l=>{r.render(l,o),A(l),h.setActive(l.dog.command)}),F=c.onFinished((l,y)=>{e||(H({course:s,temperament:t.temperament,sheepCount:t.sheepCount,score:y,debugMode:e,endedAt:Date.now()}),window.setTimeout(()=>u("#/results"),400))});function A(l){const y=Math.max(0,s.timeLimit-l.time),W=Math.floor(y/60),I=Math.floor(y%60),R=n.querySelector("#hud");R.innerHTML=`
      <div class="metric">剩余时间<b>${W}:${I.toString().padStart(2,"0")}</b></div>
      <div class="metric">平均压力<b>${l.stats.avgPressure.toFixed(2)}</b></div>
      <div class="metric">脱群<b>${l.stats.strayCount} 只</b></div>
      <div class="metric">入圈<b>${l.stats.pennedCount}/${t.sheepCount}</b></div>
      <div class="metric">已过门<b>${l.stats.gatesCleared}/${s.gates.length}</b></div>
      <div class="metric">驱向夹角<b>${l.stats.driveAngleDeg===null?"—":`${l.stats.driveAngleDeg.toFixed(0)}°`}</b></div>
    `}e&&Z(n,c,o);const f=n.querySelector("#pause-btn");f.addEventListener("click",()=>{p=!p,c.pause(p),f.textContent=p?"继续":"暂停"}),n.querySelector("#reset-btn")?.addEventListener("click",()=>{c.reset(),p=!1,f.textContent="暂停"}),n.querySelector("#speed-select")?.addEventListener("change",l=>{c.speed(Number(l.target.value))});const w=()=>r.resize();window.addEventListener("resize",w),c.init(i),n.__cleanup=()=>{C(),F(),h.destroy(),window.removeEventListener("resize",w),c.dispose()}}function Z(n,e,t){const s=[{key:"fleeWeight",label:"逃逸权重",min:0,max:2.5,step:.05},{key:"cohesionWeight",label:"抱团权重",min:0,max:2.5,step:.05},{key:"alignWeight",label:"对齐权重",min:0,max:2.5,step:.05},{key:"grassWeight",label:"吃草权重",min:0,max:2,step:.05},{key:"fleeRadius",label:"逃逸半径",min:80,max:420,step:10},{key:"pressureDecay",label:"冷静速率",min:.05,max:2,step:.05},{key:"strayRadius",label:"脱群距离",min:1.2,max:4,step:.1},{key:"leaderInfluence",label:"头羊影响",min:0,max:1.5,step:.05},{key:"dogMaxSpeed",label:"狗速度",min:120,max:480,step:10},{key:"dogAccel",label:"狗加速度",min:150,max:1e3,step:20},{key:"dogTurnRate",label:"狗转向",min:1.5,max:8,step:.1},{key:"noise",label:"个体噪声",min:0,max:.8,step:.02}],i=n.querySelector("#sliders");i.innerHTML=s.map(a=>`
    <div class="slider-row">
      <span>${a.label}</span>
      <input type="range" data-key="${a.key}" min="${a.min}" max="${a.max}" step="${a.step}" value="${t.params[a.key]}">
      <span class="val" id="val-${a.key}">${t.params[a.key].toFixed(2)}</span>
    </div>`).join(""),i.querySelectorAll("input[type=range]").forEach(a=>{a.addEventListener("input",()=>{const r=a.dataset.key,c=Number(a.value);t.params&&(t.params[r]=c),n.querySelector(`#val-${r}`).textContent=c.toFixed(2),e.updateParams({[r]:c})})}),n.querySelector("#chk-flee").addEventListener("change",a=>t.showFleeRadius=a.target.checked),n.querySelector("#chk-forces").addEventListener("change",a=>t.showForces=a.target.checked),n.querySelector("#chk-centroid").addEventListener("change",a=>t.showCentroid=a.target.checked)}function ee(n){const e=_(),t=x();if(!e){n.innerHTML=`
      <div class="card" style="margin-top:40px;text-align:center">
        <h3>还没有完成的比赛</h3>
        <p class="muted">先去赛场选择页开始一场比赛吧。</p>
        <p style="margin-top:16px"><button class="primary" id="go-select">去选择赛场</button></p>
      </div>`,n.querySelector("#go-select")?.addEventListener("click",()=>u("#/select"));return}const s=e.score,i=Math.floor(s.timeUsed/60),a=(s.timeUsed%60).toFixed(0).padStart(2,"0");n.innerHTML=`
    <div class="topbar" style="margin-bottom:12px">
      <h1>比赛成绩 · ${e.course.name}</h1>
      <span class="pill">脾性：${e.temperament}</span>
      <span class="pill">${e.sheepCount} 只羊</span>
      <span style="flex:1"></span>
      <a href="#/select">再赛一场</a>
      <a href="#/trial?debug=1">调试页</a>
    </div>

    <div class="layout">
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="row" style="justify-content:space-between;align-items:flex-start">
            <div>
              <h3 style="margin-top:0">总分</h3>
              <div class="big-score">${s.total}</div>
              <p class="muted" style="margin-top:8px">
                ${s.finished?'<span class="pill good">全部羊只入圈</span>':'<span class="pill bad">时限内未全部入圈</span>'}
                <span class="pill">用时 ${i}:${a} / 限 ${s.timeLimit}s</span>
                ${s.overtime>0?`<span class="pill bad">超时 ${s.overtime}s，罚 ${s.timePenalty} 分</span>`:""}
              </p>
            </div>
            <div style="text-align:right" class="muted">
              入圈 ${s.pennedCount}/${s.sheepCount}<br>
              过门 ${s.gatesCleared}/${s.gateCount}<br>
              失误 ${s.faults.length} 笔
            </div>
          </div>
        </div>

        <div class="card">
          <h3>ISDS 百分制分项</h3>
          <table class="score">
            <thead>
              <tr><th>环节</th><th class="num">满分</th><th class="num">扣分</th><th class="num">得分</th></tr>
            </thead>
            <tbody>
              ${s.phases.map(r=>`
                <tr>
                  <td>${r.name}</td>
                  <td class="num">${r.max}</td>
                  <td class="num" style="color:var(--danger)">${r.deductions.toFixed(1)}</td>
                  <td class="num"><b>${r.score.toFixed(1)}</b></td>
                </tr>`).join("")}
              <tr>
                <td>时间罚分</td>
                <td class="num">—</td>
                <td class="num" style="color:var(--danger)">${s.timePenalty.toFixed(1)}</td>
                <td class="num">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <h4>失误明细（ISDS fault 记账）</h4>
        ${s.faults.length===0?'<p class="muted">零失误，漂亮的一场！</p>':`<ul class="fault-list" style="margin:0;padding:0">
                ${s.faults.map(r=>`
                  <li>
                    <span class="pts">-${r.points.toFixed(1)}</span>
                    <b>${r.phase}</b> · ${r.time.toFixed(1)}s<br>
                    ${r.detail}
                  </li>`).join("")}
              </ul>`}
      </div>
    </div>

    ${t.length>1?`<div class="section-title">历史成绩（最近 20 场）</div>
           <div class="card">
             <table class="score">
               <thead><tr><th>时间</th><th>赛场</th><th>脾性</th><th class="num">得分</th><th class="num">用时</th><th>结果</th></tr></thead>
               <tbody>
                 ${t.map(r=>`
                     <tr>
                       <td>${new Date(r.endedAt).toLocaleString()}</td>
                       <td>${r.course.name}</td>
                       <td>${r.temperament}</td>
                       <td class="num">${r.score.total}</td>
                       <td class="num">${r.score.timeUsed.toFixed(0)}s</td>
                       <td>${r.score.finished?'<span class="pill good">完成</span>':'<span class="pill bad">未完成</span>'}</td>
                     </tr>`).join("")}
               </tbody>
             </table>
           </div>`:""}
  `}const d=document.querySelector("#app");function T(n){const e=d.__cleanup;switch(e&&(e(),delete d.__cleanup),d.innerHTML="",n.name){case"trial":V(d,n.debug??!1);break;case"results":ee(d);break;case"select":default:N(d);break}document.querySelectorAll(".topbar nav a").forEach(t=>{const s=t;s.classList.toggle("active",s.getAttribute("href")===window.location.hash)})}window.location.hash||(window.location.hash="#/select");T(L());O(T);
//# sourceMappingURL=index-D9DRsB-Z.js.map
