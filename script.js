'use strict';
const $ = s => document.querySelector(s);
const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = motionQuery.matches, paused = reducedMotion;
const canvas = $('#cosmos'), ctx = canvas.getContext('2d');
const backdrop = document.createElement('canvas'), back = backdrop.getContext('2d');
let w=0,h=0,base=0,dpr=1,raf=null,lastTime=0,clock=0,boost=0;
let yaw=.25,tilt=.62,roll=-.20,zoom=1;
let dragging=false,moved=false,lastX=0,lastY=0;
const pointers=new Map(); let pinchDistance=0;
const photos=[
 ['assets/nataly-1.webp','Tu luz, incluso en blanco y negro.'],
 ['assets/nataly-2.webp','Esa mirada que me encanta.'],
 ['assets/nataly-3.webp','Tan tú. Tan bonita.'],
 ['assets/nataly-4.webp','Mi forma favorita de alegrar el día.'],
 ['assets/nataly-5.webp','Un poquito de sol hecho persona.']
];
const photoButtons=photos.map((photo,i)=>{
 const button=document.createElement('button');button.className='orbit-photo';button.dataset.photo=i;
 button.setAttribute('aria-label',`Ampliar foto ${i+1} de Nataly`);
 const img=document.createElement('img');img.src=photo[0];img.alt=photo[1];img.draggable=false;
 button.append(img);$('#orbit-photos').append(button);
 button.addEventListener('click',()=>{showPhoto(i);openDialog($('#photo-dialog'),button)});
 return button;
});

// Small reusable canvas sprites: sunflower, daisy, rose and tulip, all golden.
function flowerSprite(type){
 const sprite=document.createElement('canvas');sprite.width=sprite.height=160;
 const c=sprite.getContext('2d');c.translate(80,80);
 if(type===3){
  c.strokeStyle='#6b8536';c.lineWidth=5;c.beginPath();c.moveTo(0,57);c.quadraticCurveTo(5,25,0,0);c.stroke();
  c.fillStyle='#7b9340';c.beginPath();c.moveTo(0,43);c.quadraticCurveTo(-32,23,-27,5);c.quadraticCurveTo(1,15,0,43);c.fill();
  const g=c.createLinearGradient(-30,-50,30,20);g.addColorStop(0,'#c48a17');g.addColorStop(.45,'#fff090');g.addColorStop(1,'#edb32d');c.fillStyle=g;
  c.beginPath();c.moveTo(0,20);c.bezierCurveTo(-45,10,-36,-27,-31,-48);c.lineTo(-12,-31);c.lineTo(0,-58);c.lineTo(15,-30);c.lineTo(32,-49);c.bezierCurveTo(39,-18,38,13,0,20);c.fill();
  c.strokeStyle='#be821f';c.lineWidth=1;c.beginPath();c.moveTo(-12,-31);c.quadraticCurveTo(-15,0,0,20);c.moveTo(15,-30);c.quadraticCurveTo(19,0,0,20);c.stroke();
 }else if(type===2){
  for(let ring=3;ring>=0;ring--){const n=7-ring;for(let j=0;j<n;j++){c.save();c.rotate(j*Math.PI*2/n+ring*.7);const g=c.createRadialGradient(0,0,2,0,-17,53);g.addColorStop(0,'#9d5a0b');g.addColorStop(.5,'#e5ad24');g.addColorStop(1,'#fff2a0');c.fillStyle=g;c.beginPath();c.ellipse(0,-12-ring*6,12+ring*6,15+ring*8,0,0,Math.PI*2);c.fill();c.restore()}}
  c.fillStyle='#d9971c';c.beginPath();c.arc(0,0,8,0,7);c.fill();
 }else{
  const n=type===0?18:12;
  for(let layer=0;layer<2;layer++)for(let j=0;j<n;j++){
   c.save();c.rotate(j*Math.PI*2/n+layer*.15);
   const g=c.createLinearGradient(0,-67,0,-12);g.addColorStop(0,type===0?'#ffec8e':'#fff2a1');g.addColorStop(.55,'#f4cb41');g.addColorStop(1,'#c48319');
   c.fillStyle=g;c.beginPath();c.ellipse(0,-39+layer*4,type===0?10:9,29-layer*3,0,0,7);c.fill();c.restore();
  }
  const g=c.createRadialGradient(-5,-7,0,0,0,type===0?24:15);g.addColorStop(0,type===0?'#806029':'#ce8d13');g.addColorStop(1,type===0?'#352b19':'#976516');c.fillStyle=g;c.beginPath();c.arc(0,0,type===0?24:15,0,7);c.fill();
  for(let j=0;j<65;j++){let a=j*2.39996,r=Math.sqrt(j/65)*(type===0?22:13);c.fillStyle=j%2?'#d2a34a':'#5c4421';c.beginPath();c.arc(Math.cos(a)*r,Math.sin(a)*r,1.15,0,7);c.fill()}
 }
 return sprite;
}
const sprites=[0,1,2,3].map(flowerSprite);
const spriteURLs=sprites.map(s=>s.toDataURL());
const dust=Array.from({length:1700},()=>({a:Math.random()*Math.PI*2,r:.56+Math.random()*1.13,y:(Math.random()-.5)*.11,size:Math.random()*1.4+.3,phase:Math.random()*6}));
const flowers=Array.from({length:180},(_,i)=>({a:Math.random()*Math.PI*2,r:.67+Math.random()*.98,y:(Math.random()-.5)*.20,size:9+Math.random()*18,type:i%4,rot:Math.random()*6}));
const wishes=['En cualquier universo, te elegiría a ti. ♡','Todas estas flores son para ti, Nataly.','Eres mi sol entre millones de estrellas.','Que nunca te falten flores ni motivos para sonreír.','Mi universo florece contigo.','Feliz 21 de septiembre, mi bonita.'];
let wishIndex=0,wishTimer,photoIndex=0,dialogOpener;
function randomNormal(){return Math.sqrt(-2*Math.log(Math.max(.0001,Math.random())))*Math.cos(2*Math.PI*Math.random())}
function resize(){
 const rect=canvas.getBoundingClientRect();w=rect.width;h=rect.height;dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
 backdrop.width=w*dpr;backdrop.height=h*dpr;back.setTransform(dpr,0,0,dpr,0,0);
 base=Math.min(w*.32,h*.41);
 // A diagonal nebula and distant stars are baked once, not regenerated each frame.
 back.clearRect(0,0,w,h);
 back.save();back.translate(w*.5,h*.46);back.rotate(-.85);
 for(let i=0;i<1900;i++){
  const x=(Math.random()-.5)*Math.max(w,h)*1.6,y=randomNormal()*Math.min(w,h)*.057;
  const r=Math.random()*1.8+.15;back.fillStyle=`rgba(${150+Math.random()*70},${65+Math.random()*35},${140+Math.random()*65},${Math.random()*.14})`;
  back.beginPath();back.arc(x,y,r,0,7);back.fill();
 }
 back.restore();
 for(let i=0;i<Math.min(1000,w*h/600);i++){
  const x=Math.random()*w,y=Math.random()*h,r=Math.random();back.fillStyle=`rgba(225,223,244,${.15+Math.random()*.6})`;back.beginPath();back.arc(x,y,r<.97?.3+r*.7:1.4,0,7);back.fill();
  if(r>.99){back.strokeStyle='#dacffa66';back.lineWidth=.5;back.beginPath();back.moveTo(x-4,y);back.lineTo(x+4,y);back.moveTo(x,y-4);back.lineTo(x,y+4);back.stroke()}
 }
 render();
}
function project(a,r,y=0){
 const x=Math.cos(a+yaw)*r,z=Math.sin(a+yaw)*r;
 const yy=y*Math.cos(tilt)-z*Math.sin(tilt),zz=y*Math.sin(tilt)+z*Math.cos(tilt);
 const xx=x*Math.cos(roll)-yy*Math.sin(roll),yyy=x*Math.sin(roll)+yy*Math.cos(roll);
 const p=4.7/(4.7+zz);
 return{x:w*.5+xx*base*zoom*p,y:h*.49+yyy*base*zoom*p,z:zz,p};
}
function drawSun(){
 const x=w*.5,y=h*.49,r=clamp(base*.25,37,82)*Math.sqrt(zoom);
 let g=ctx.createRadialGradient(x,y,r*.2,x,y,r*3.6);g.addColorStop(0,'#ffd15640');g.addColorStop(.35,'#ed9f241c');g.addColorStop(1,'#ffc93400');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*3.6,0,7);ctx.fill();
 ctx.save();ctx.translate(x,y);ctx.rotate(clock*.025);ctx.globalAlpha=.8;ctx.drawImage(sprites[0],-r*1.55,-r*1.55,r*3.1,r*3.1);ctx.restore();
 g=ctx.createRadialGradient(x-r*.3,y-r*.3,0,x,y,r*.82);g.addColorStop(0,'#9e762cee');g.addColorStop(.65,'#684510ed');g.addColorStop(1,'#c39532cc');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*.82,0,7);ctx.fill();
 ctx.strokeStyle='#ffe9a363';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,r*.86,0,7);ctx.stroke();
}
function drawFlower(f,p){
 const size=f.size*(w<600?.8:1)*p.p*Math.sqrt(zoom)*(1+boost*.15);
 ctx.save();ctx.globalAlpha=clamp(.7-p.z*.16,.35,1);ctx.translate(p.x,p.y);ctx.rotate(f.rot+clock*.05);ctx.drawImage(sprites[f.type],-size/2,-size/2,size,size);ctx.restore();
}
function render(){
 ctx.clearRect(0,0,w,h);ctx.drawImage(backdrop,0,0,w,h);
 const glow=ctx.createRadialGradient(w*.5,h*.49,0,w*.5,h*.49,base*1.9);glow.addColorStop(0,'#b9871910');glow.addColorStop(.5,`rgba(175,116,20,${.035+boost*.025})`);glow.addColorStop(1,'#ac862000');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 for(const r of [.64,.98,1.31,1.68]){ctx.beginPath();for(let i=0;i<=160;i++){const p=project(i/160*Math.PI*2,r);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)}ctx.strokeStyle='#d3b04c1c';ctx.lineWidth=.65;ctx.stroke()}
 for(const d of dust){const p=project(d.a,d.r,d.y);const alpha=clamp((.35+Math.sin(clock*.7+d.phase)*.13-p.z*.09)+boost*.16,.08,.9);ctx.fillStyle=`rgba(255,${190+Math.floor(d.r*28)},100,${alpha})`;const size=d.size*p.p;ctx.fillRect(p.x,p.y,size,size)}
 const sorted=flowers.map(f=>({f,p:project(f.a,f.r,f.y)})).sort((a,b)=>b.p.z-a.p.z);
 for(const o of sorted)if(o.p.z>=0)drawFlower(o.f,o.p);
 drawSun();
 for(const o of sorted)if(o.p.z<0)drawFlower(o.f,o.p);
 // Photos travel along a wider orbit and remain real, keyboard-accessible buttons.
 photoButtons.forEach((button,i)=>{
  const p=project(i/5*Math.PI*2+.15,1.35,i%2===0?.25:-.14);
  const size=(w<600?53:76)*clamp(p.p,.8,1.2)*Math.sqrt(zoom),bh=size*1.27;
  const px=clamp(p.x, size/2+10,w-size/2-10),py=clamp(p.y,bh/2+145,h-bh/2-145);
  button.style.width=`${size}px`;button.style.height=`${bh}px`;
  button.style.transform=`translate3d(${px-size/2}px,${py-bh/2}px,0) rotate(${Math.sin(i*2+clock*.07)*9}deg)`;
  button.style.zIndex=String(Math.round(20-p.z*5));button.style.opacity=String(clamp(.92-p.z*.12,.6,1));
 });
 if(!reducedMotion&&!paused){const period=clock%13;if(period<1.15){const t=period/1.15,x=w*(.2+t*.6),y=h*(.1+t*.2);const g=ctx.createLinearGradient(x-75,y-35,x,y);g.addColorStop(0,'#fff0cc00');g.addColorStop(1,'#fff0ccaa');ctx.strokeStyle=g;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-75,y-35);ctx.lineTo(x,y);ctx.stroke()}}
}
function frame(time){
 const dt=lastTime?Math.min((time-lastTime)/1000,.04):0;lastTime=time;
 if(!paused&&!reducedMotion&&!dragging&&!document.querySelector('dialog[open]')&&!document.querySelector('.orbit-photo:focus-visible')&&!document.querySelector('.orbit-photo:hover')){clock+=dt;yaw+=dt*.045}
 boost=Math.max(0,boost-dt*.42);render();raf=requestAnimationFrame(frame);
}
function restart(){if(raf!==null)cancelAnimationFrame(raf);raf=null;lastTime=0;if(!document.hidden&&!paused&&!reducedMotion)raf=requestAnimationFrame(frame);else render()}
function updatePause(){const b=$('#pause-motion');b.setAttribute('aria-pressed',String(paused));b.setAttribute('aria-label',paused?'Reanudar movimiento':'Pausar movimiento');b.textContent=paused?'▷':'Ⅱ';restart()}
function setZoom(value){zoom=clamp(value,.65,1.7);$('#zoom-in').disabled=zoom>=1.7;$('#zoom-out').disabled=zoom<=.65;render()}
$('#zoom-in').addEventListener('click',()=>setZoom(zoom+.15));$('#zoom-out').addEventListener('click',()=>setZoom(zoom-.15));
$('#reset-view').addEventListener('click',()=>{yaw=.25;tilt=.62;roll=-.20;setZoom(1)});
$('#pause-motion').addEventListener('click',()=>{paused=!paused;if(!paused)reducedMotion=false;updatePause()});
canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);dragging=true;moved=false;lastX=e.clientX;lastY=e.clientY;if(pointers.size===2){const p=[...pointers.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinchDistance>0)setZoom(zoom*distance/pinchDistance);pinchDistance=distance;moved=true}else{const dx=e.clientX-lastX,dy=e.clientY-lastY;if(Math.abs(dx)+Math.abs(dy)>2)moved=true;yaw+=dx*.005;tilt=clamp(tilt+dy*.005,.12,1.5);lastX=e.clientX;lastY=e.clientY;render()}});
function releasePointer(e,cancelled=false){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(!moved&&!cancelled&&pointers.size===0){burst(e.clientX,e.clientY,12);showWish()}dragging=pointers.size>0;if(dragging){const p=[...pointers.values()][0];lastX=p.x;lastY=p.y}}
canvas.addEventListener('pointerup',e=>releasePointer(e));canvas.addEventListener('pointercancel',e=>releasePointer(e,true));
canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')yaw-=.13;if(e.key==='ArrowRight')yaw+=.13;if(e.key==='ArrowUp')tilt=clamp(tilt+.1,.12,1.5);if(e.key==='ArrowDown')tilt=clamp(tilt-.1,.12,1.5);render()}});
canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom-e.deltaY*.0006)},{passive:false});
function showWish(){const el=$('#wish');el.textContent=wishes[wishIndex++%wishes.length];el.classList.add('visible');clearTimeout(wishTimer);wishTimer=setTimeout(()=>el.classList.remove('visible'),5500)}
function burst(x=w/2,y=h*.49,count=36){
 if(reducedMotion)return;boost=1.5;
 for(let i=0;i<count;i++){const el=document.createElement('img');el.src=spriteURLs[i%4];el.alt='';el.className='burst-flower';const a=Math.random()*Math.PI*2,r=70+Math.random()*Math.min(w,h)*.55;el.style.cssText=`--x:${x}px;--y:${y}px;--size:${20+Math.random()*24}px;--dx:${Math.cos(a)*r}px;--dy:${Math.sin(a)*r}px;--turn:${Math.random()*360}deg`;document.body.append(el);el.addEventListener('animationend',()=>el.remove(),{once:true});setTimeout(()=>el.remove(),3200)}
 render();
}
$('#bloom-button').addEventListener('click',()=>{burst();showWish()});
function showPhoto(index){photoIndex=(index+photos.length)%photos.length;$('#lightbox-image').src=photos[photoIndex][0];$('#lightbox-image').alt=`Nataly. ${photos[photoIndex][1]}`;$('#lightbox-caption').textContent=photos[photoIndex][1];$('#photo-count').textContent=`${photoIndex+1} / 5`}
function openDialog(dialog,trigger){dialogOpener=trigger;dialog.showModal()}
$('#lightbox-prev').addEventListener('click',()=>showPhoto(photoIndex-1));$('#lightbox-next').addEventListener('click',()=>showPhoto(photoIndex+1));
$('#photo-dialog').addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();showPhoto(photoIndex+1)}if(e.key==='ArrowLeft'){e.preventDefault();showPhoto(photoIndex-1)}});
$('#open-letter').addEventListener('click',e=>openDialog($('#letter-dialog'),e.currentTarget));
const video=$('#memory-video');
$('#open-video').addEventListener('click',async e=>{openDialog($('#video-dialog'),e.currentTarget);try{await video.play()}catch{video.focus()}});
document.querySelectorAll('dialog').forEach(dialog=>{
 dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
 dialog.addEventListener('close',()=>{video.pause();dialogOpener?.focus({preventScroll:true})});
});
window.addEventListener('resize',resize);motionQuery.addEventListener('change',e=>{reducedMotion=e.matches;paused=reducedMotion;updatePause()});
resize();updatePause();
// A soft original music-box sequence. Audio starts only after an explicit tap.
let audioContext, musicTimer, musicPlaying = false, noteIndex = 0, activeNotes = new Set();
const melody = [72, 76, 79, 83, 81, 79, 76, 74, 72, 76, 79, 86, 84, 79, 76, 74, 69, 72, 76, 81, 79, 76, 74, 72, 67, 71, 74, 79, 76, 74, 72, null];
function note(midi, duration, volume, delay = 0) {
  if (midi == null) return;
  const at = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
  oscillator.type = 'sine'; oscillator.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
  gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume, at + .025); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
  oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(at); oscillator.stop(at + duration);
  activeNotes.add(oscillator); oscillator.onended = () => { activeNotes.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
}
function musicStep() { note(melody[noteIndex % melody.length], 2.4, .09); if (noteIndex % 4 === 0) { const bass = [48, 53, 57, 55][Math.floor(noteIndex / 8) % 4]; note(bass, 3.5, .06); note(bass + 7, 3, .035, .13); } noteIndex++; }
function stopMusic() {
  clearInterval(musicTimer); musicPlaying = false;
  for (const oscillator of activeNotes) { try { oscillator.stop(); } catch {} }
  activeNotes.clear(); $('#sound-toggle').setAttribute('aria-pressed', 'false'); $('#sound-toggle').setAttribute('aria-label', 'Activar música'); $('#sound-label').textContent = 'Música';
}
$('#sound-toggle').addEventListener('click', async () => {
  if (musicPlaying) { stopMusic(); return; }
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)(); await audioContext.resume();
    $('#memory-video').pause(); musicPlaying = true; musicStep(); musicTimer = setInterval(musicStep, 610);
    $('#sound-toggle').setAttribute('aria-pressed', 'true'); $('#sound-toggle').setAttribute('aria-label', 'Pausar música'); $('#sound-label').textContent = 'Pausar';
  } catch { $('#sound-label').textContent = 'Sin audio'; $('#sound-toggle').setAttribute('aria-label', 'Audio no disponible en este navegador'); }
});
video.addEventListener('play',()=>{if(musicPlaying)stopMusic()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopMusic();video.pause()}restart()});
