'use strict';
const $=s=>document.querySelector(s);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion=motionQuery.matches,paused=false;
const canvas=$('#cosmos'),ctx=canvas.getContext('2d');
const backdrop=document.createElement('canvas'),back=backdrop.getContext('2d');
let w=0,h=0,base=0,dpr=1,raf=null,lastTime=0,clock=0,boost=0;
let yaw=.25,tilt=.75,roll=-.20,zoom=1;
const memories=[
 ['assets/nataly-1.webp','Tu luz, incluso en blanco y negro.'],
 ['assets/nataly-2.webp','Esa mirada que me encanta.'],
 ['assets/nataly-3.webp','Tan tú. Tan bonita.'],
 ['assets/nataly-4.webp','Mi forma favorita de alegrar el día.'],
 ['assets/nataly-5.webp','Un poquito de sol hecho persona.'],
 ['assets/nataly.mp4','Tu sonrisa hace más bonito mi universo.']
];
let video;
const orbitMemories=memories.map(([src,description],i)=>{
 const figure=document.createElement('figure');figure.className='orbit-memory';
 let media;
 if(i===5){
  media=document.createElement('video');media.id='memory-video';media.muted=true;media.defaultMuted=true;media.autoplay=true;media.loop=true;media.playsInline=true;media.preload='auto';media.poster='assets/video-poster.webp';
  media.setAttribute('muted','');media.setAttribute('autoplay','');media.setAttribute('playsinline','');media.setAttribute('loop','');media.setAttribute('aria-label',description);figure.classList.add('video-memory');video=media;
 }else{media=document.createElement('img');media.alt=description;media.draggable=false}
 media.src=src;figure.append(media);$('#orbit-photos').append(figure);return figure;
});
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
const dust=Array.from({length:2100},()=>({a:Math.random()*Math.PI*2,r:.55+Math.random()*1.18,y:(Math.random()-.5)*.13,size:Math.random()*1.5+.3,phase:Math.random()*6}));
const flowers=Array.from({length:220},(_,i)=>({a:Math.random()*Math.PI*2,r:.67+Math.random()*1.02,y:(Math.random()-.5)*.2,size:12+Math.random()*21,type:i%4,rot:Math.random()*6}));
const floatingFlowers=Array.from({length:16},(_,i)=>({x:Math.random(),y:Math.random(),size:14+Math.random()*25,speed:.008+Math.random()*.012,type:i%4,phase:Math.random()*6}));
const wishes=[
 ['Todas las flores del universo,','hoy son para ti.'],
 ['Entre millones de estrellas,','mi sol siempre eres tú.'],
 ['Tu sonrisa hace florecer','hasta mis días más grises.'],
 ['Girasoles, rosas y mil flores…','ninguna tan bonita como tú.'],
 ['Ojalá la vida te cuide','tan bonito como mereces.'],
 ['En esta galaxia y en todas,','te elegiría a ti.'],
 ['Que nunca te falten flores,','ni motivos para sonreír.'],
 ['Feliz 21 de septiembre,','mi bonita Nataly. ♡']
];
let currentWish=0;
function randomNormal(){return Math.sqrt(-2*Math.log(Math.max(.0001,Math.random())))*Math.cos(2*Math.PI*Math.random())}
function resize(){
 const rect=canvas.getBoundingClientRect();w=rect.width;h=rect.height;dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
 backdrop.width=w*dpr;backdrop.height=h*dpr;back.setTransform(dpr,0,0,dpr,0,0);
 base=Math.min(w*.30,h*.34);
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
 return{x:w*.5+xx*base*zoom*p,y:h*.44+yyy*base*zoom*p,z:zz,p};
}
function drawSun(){
 const x=w*.5,y=h*.44,r=clamp(base*.25,37,82)*Math.sqrt(zoom);
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
 const pulse=1+Math.sin(clock*.7)*.08;
 const glow=ctx.createRadialGradient(w*.5,h*.44,0,w*.5,h*.44,base*1.9*pulse);
 glow.addColorStop(0,'#b9871920');glow.addColorStop(.5,'#af74100d');glow.addColorStop(1,'#ac862000');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 for(const r of [.64,.98,1.31,1.7]){ctx.beginPath();for(let i=0;i<=128;i++){const p=project(i/128*Math.PI*2,r);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)}ctx.strokeStyle='#d3b04c24';ctx.lineWidth=.6;ctx.stroke()}
 for(const d of dust){const p=project(d.a,d.r,d.y),alpha=clamp(.42+Math.sin(clock*.7+d.phase)*.16-p.z*.09,.08,.9);ctx.fillStyle=`rgba(255,${190+Math.floor(d.r*28)},100,${alpha})`;const size=d.size*p.p;ctx.fillRect(p.x,p.y,size,size)}
 const sorted=flowers.map(f=>({f,p:project(f.a,f.r,f.y)})).sort((a,b)=>b.p.z-a.p.z);
 for(const o of sorted)if(o.p.z>=0)drawFlower(o.f,o.p);
 drawSun();
 for(const o of sorted)if(o.p.z<0)drawFlower(o.f,o.p);
 // Every memory, including the muted looping video, is already in the scene.
 orbitMemories.forEach((figure,i)=>{
  const p=project(i/6*Math.PI*2+.15,1.4,i%2===0?.26:-.18);
  const size=(w<600?58:83)*clamp(p.p,.82,1.3),fh=size*1.3;
  const px=clamp(p.x,size/2+9,w-size/2-9),py=clamp(p.y,fh/2+75,h*.73-fh/2);
  figure.style.width=`${size}px`;figure.style.height=`${fh}px`;
  figure.style.transform=`translate3d(${px-size/2}px,${py-fh/2}px,0) rotate(${Math.sin(i*2+clock*.09)*7}deg)`;
  figure.style.zIndex=String(Math.round(20-p.z*5));figure.style.opacity=String(clamp(.94-p.z*.10,.68,1));
 });
 for(const f of floatingFlowers){
  const y=((f.y-clock*f.speed*(reducedMotion?.3:1))%1+1)%1;
  const x=f.x*w+Math.sin(clock*.16+f.phase)*18;
  ctx.save();ctx.translate(x,y*h);ctx.rotate(f.phase+clock*.12);ctx.globalAlpha=.14+Math.sin(y*Math.PI)*.22;const size=f.size*(w<600?.72:1);ctx.drawImage(sprites[f.type],-size/2,-size/2,size,size);ctx.restore();
 }
 if(!reducedMotion){const period=clock%14;if(period>10&&period<11.1){const t=(period-10)/1.1,x=w*(.1+t*.6),y=h*(.1+t*.2);const g=ctx.createLinearGradient(x-80,y-30,x,y);g.addColorStop(0,'#fff0cc00');g.addColorStop(1,'#fff0ccbb');ctx.strokeStyle=g;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-80,y-30);ctx.lineTo(x,y);ctx.stroke()}}
}
function updateMessage(){
 const index=Math.floor(clock/9)%wishes.length,phase=clock%9;
 const el=$('#wish');
 // Fade out before the next thought, then display it without a click or a new page.
 el.classList.toggle('fading',phase>7.8);
 if(index!==currentWish){currentWish=index;el.replaceChildren(document.createTextNode(wishes[index][0]),document.createElement('br'));const em=document.createElement('em');em.textContent=wishes[index][1];el.append(em)}
}
function frame(time){
 const dt=lastTime?Math.min((time-lastTime)/1000,.05):0;lastTime=time;
 clock+=dt;yaw+=dt*(reducedMotion?.045:.105);
 tilt=.75+Math.sin(clock*.065)*(reducedMotion?.035:.16);
 roll=-.20+Math.sin(clock*.045)*(reducedMotion?.025:.09);
 boost=.25+Math.sin(clock*.6)*.25;
 render();updateMessage();raf=requestAnimationFrame(frame);
}
async function playVideo(){try{await video.play()}catch{/* Some battery-saving modes block even muted autoplay; the poster stays visible. */}}
function restart(){
 if(raf!==null)cancelAnimationFrame(raf);raf=null;lastTime=0;
 if(!document.hidden&&!paused){raf=requestAnimationFrame(frame);playVideo()}else{video.pause();render()}
}
$('#pause-motion').addEventListener('click',()=>{
 paused=!paused;const button=$('#pause-motion');button.setAttribute('aria-pressed',String(paused));button.setAttribute('aria-label',paused?'Reanudar animación':'Pausar animación');button.textContent=paused?'▷':'Ⅱ';restart();
});
window.addEventListener('resize',resize);
motionQuery.addEventListener('change',e=>{reducedMotion=e.matches});
// Automatic from the first frame. Reduced-motion devices get a gentler orbit.
resize();restart();
document.addEventListener('pointerdown',()=>{if(!paused&&video.paused)playVideo()},{once:true});
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
    musicPlaying = true; musicStep(); musicTimer = setInterval(musicStep, 610);
    $('#sound-toggle').setAttribute('aria-pressed', 'true'); $('#sound-toggle').setAttribute('aria-label', 'Pausar música'); $('#sound-label').textContent = 'Pausar';
  } catch { $('#sound-label').textContent = 'Sin audio'; $('#sound-toggle').setAttribute('aria-label', 'Audio no disponible en este navegador'); }
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMusic();restart()});
