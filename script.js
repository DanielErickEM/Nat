'use strict';

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = motionQuery.matches;
const $ = (selector) => document.querySelector(selector);

// Each flower is drawn locally: no image libraries or external animation dependencies.
const flower = (x, y, radius, tilt, delay) => {
  let petals = '';
  for (let i = 0; i < 16; i++) {
    petals += `<ellipse cx="0" cy="-${radius * .7}" rx="${radius * .18}" ry="${radius * .56}" transform="rotate(${i * 22.5})" fill="url(#petal-back)"/>`;
  }
  for (let i = 0; i < 13; i++) {
    petals += `<ellipse cx="0" cy="-${radius * .57}" rx="${radius * .17}" ry="${radius * .47}" transform="rotate(${i * 360 / 13 + 8})" fill="url(#petal-front)"/><path d="M0 -${radius * .25} Q-2 -${radius * .65} 0 -${radius * .95}" transform="rotate(${i * 360 / 13 + 8})" stroke="#bd8429" stroke-opacity=".2" fill="none"/>`;
  }
  let seeds = '';
  for (let i = 0; i < 64; i++) {
    const a = i * 2.39996, r = Math.sqrt(i / 64) * radius * .29;
    seeds += `<circle cx="${Math.cos(a) * r}" cy="${Math.sin(a) * r}" r="${radius * .022}" fill="${i % 2 ? '#b48a40' : '#66552b'}"/>`;
  }
  return `<g class="flower-sway" style="animation-delay:${delay}s"><path d="M280 557 Q${x - 35} 390 ${x} ${y}" fill="none" stroke="url(#stem)" stroke-width="5"/><path d="M${(x + 280) / 2} 400 Q${x - 95} 308 ${x - 110} 355 Q${x - 65} 425 ${(x + 280) / 2} 400" fill="url(#leaf)"/><path d="M${(x + 280) / 2} 440 Q${x + 95} 343 ${x + 83} 393 Q${x + 50} 460 ${(x + 280) / 2} 440" fill="url(#leaf)"/><g transform="translate(${x} ${y}) rotate(${tilt})"><g class="flower-head" style="animation-delay:${delay * .1}s">${petals}<circle r="${radius * .34}" fill="url(#heart)"/><circle r="${radius * .28}" fill="#514522"/>${seeds}</g></g></g>`;
};

$('#garden-art').innerHTML = `<svg viewBox="0 0 560 600" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="petal-back" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#bc871d"/><stop offset=".5" stop-color="#e6ba36"/><stop offset="1" stop-color="#ffde72"/></linearGradient><linearGradient id="petal-front" x1="0" y1="1" x2=".3" y2="0"><stop stop-color="#b78725"/><stop offset=".5" stop-color="#f2c948"/><stop offset="1" stop-color="#ffe797"/></linearGradient><linearGradient id="stem"><stop stop-color="#2d5131"/><stop offset=".5" stop-color="#72904a"/><stop offset="1" stop-color="#405f33"/></linearGradient><linearGradient id="leaf" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#233d28"/><stop offset=".6" stop-color="#4b6a35"/><stop offset="1" stop-color="#899448"/></linearGradient><radialGradient id="heart"><stop stop-color="#4a3c22"/><stop offset=".8" stop-color="#7c5c27"/><stop offset="1" stop-color="#b38c37"/></radialGradient></defs><g opacity=".7" fill="none" stroke="#6d8446" stroke-width="2"><path d="M279 551Q124 411 109 271M274 553Q397 386 444 268M281 544Q210 430 206 224"/><path d="M128 355Q60 306 76 278Q121 292 128 355M148 399Q73 367 90 343Q133 354 148 399M419 324Q465 267 479 292Q477 326 419 324M391 382Q449 331 459 358Q435 391 391 382" fill="#486638"/></g>${flower(190,265,62,-20,-2)}${flower(362,241,66,15,-4)}${flower(276,170,79,-7,0)}${flower(280,332,67,5,-1)}<path d="M253 507Q282 521 306 504M257 516Q280 526 302 515" fill="none" stroke="#d6bc71" stroke-width="4"/><path d="M280 518Q221 469 223 511Q235 539 280 518Q330 474 334 510Q325 536 280 518L263 558M280 518L307 552" fill="none" stroke="#d8bf7e" stroke-width="2"/></svg>`;

// A restrained field of moving stars; suspend drawing when the page is hidden.
const canvas = $('#starlight');
const ctx = canvas.getContext('2d');
let stars = [], animationFrame = null, width = 0, height = 0;
const pointer = { x: -1000, y: -1000 };
function resizeCanvas() {
  width = window.innerWidth; height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * dpr; canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  stars = Array.from({ length: Math.min(85, Math.round(width / 15)) }, () => ({ x: Math.random() * width, y: Math.random() * height, r: Math.random() * 1.1 + .3, phase: Math.random() * Math.PI * 2 }));
  if (reducedMotion) drawStars(0);
}
function drawStars(time) {
  ctx.clearRect(0, 0, width, height);
  for (const s of stars) {
    const glow = .2 + (Math.sin(time * .0007 + s.phase) + 1) * .18;
    const near = Math.hypot(s.x - pointer.x, s.y - pointer.y) < 100;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r + (near ? .5 : 0), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(243,218,127,${near ? .8 : glow})`; ctx.fill();
    if (!reducedMotion) { s.y -= .055; if (s.y < 0) s.y = height; }
  }
}
function animate(time) { drawStars(time); animationFrame = requestAnimationFrame(animate); }
function syncAnimation() {
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  animationFrame = null;
  if (!document.hidden && !reducedMotion) animationFrame = requestAnimationFrame(animate);
  else drawStars(0);
}
resizeCanvas(); syncAnimation();
window.addEventListener('resize', resizeCanvas);
window.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
motionQuery.addEventListener('change', e => { reducedMotion = e.matches; syncAnimation(); });

function petals(count = 32) {
  if (reducedMotion) return;
  for (let i = 0; i < count; i++) {
    const petal = document.createElement('span'); petal.className = 'petal'; petal.setAttribute('aria-hidden', 'true');
    petal.style.cssText = `--x:${Math.random() * 100}vw;--y:${Math.random() * 25 - 10}vh;--drift:${Math.random() * 250 - 125}px;--duration:${3 + Math.random() * 3}s;animation-delay:${Math.random() * .6}s`;
    document.body.append(petal); petal.addEventListener('animationend', () => petal.remove(), { once: true });
    setTimeout(() => petal.remove(), 7500);
  }
}
const bloomPhrases = ['Que nunca te falten flores, Nataly. ♡', 'Tú haces que todo florezca.', 'Un rayito de sol, solo para ti.', 'Hoy el jardín lleva tu nombre.'];
let blooms = 0, bloomTimer;
$('#bloom-button').addEventListener('click', () => {
  const scene = $('#garden-scene'); scene.classList.remove('bloomed');
  void scene.offsetWidth; scene.classList.add('bloomed');
  $('#bloom-message').textContent = bloomPhrases[blooms++ % bloomPhrases.length];
  $('#bloom-button span').textContent = 'Hacer florecer otra vez';
  petals();
  if (window.innerWidth <= 700) scene.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'center' });
  clearTimeout(bloomTimer); bloomTimer = setTimeout(() => { $('#bloom-message').textContent = ''; }, 6500);
});

// Native dialogs provide focus trapping and keyboard Escape handling.
const photos = [
  ['assets/nataly-1.webp', 'Tu luz, incluso en blanco y negro.'],
  ['assets/nataly-2.webp', 'Esa mirada que me encanta.'],
  ['assets/nataly-3.webp', 'Tan tú. Tan bonita.'],
  ['assets/nataly-4.webp', 'Mi forma favorita de alegrar el día.'],
  ['assets/nataly-5.webp', 'Un poquito de sol hecho persona.']
];
let photoIndex = 0, dialogOpener;
function showPhoto(index) {
  photoIndex = (index + photos.length) % photos.length;
  $('#lightbox-image').src = photos[photoIndex][0]; $('#lightbox-image').alt = `Nataly. ${photos[photoIndex][1]}`;
  $('#lightbox-caption').textContent = photos[photoIndex][1]; $('#photo-count').textContent = `${photoIndex + 1} / ${photos.length}`;
}
function openDialog(dialog, trigger) { dialogOpener = trigger; dialog.showModal(); document.body.style.overflow = 'hidden'; }
document.querySelectorAll('[data-photo]').forEach(button => button.addEventListener('click', () => { showPhoto(Number(button.dataset.photo)); openDialog($('#photo-dialog'), button); }));
$('#lightbox-prev').addEventListener('click', () => showPhoto(photoIndex - 1));
$('#lightbox-next').addEventListener('click', () => showPhoto(photoIndex + 1));
$('#photo-dialog').addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); showPhoto(photoIndex + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); showPhoto(photoIndex - 1); } });
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; dialogOpener?.focus({ preventScroll: true }); });
});
for (const selector of ['#open-letter', '#open-letter-text']) $(selector).addEventListener('click', e => { openDialog($('#letter-dialog'), e.currentTarget); petals(16); });
const strip = $('.photo-strip');
function galleryState() { $('#photos-prev').disabled = strip.scrollLeft < 2; $('#photos-next').disabled = strip.scrollLeft >= strip.scrollWidth - strip.clientWidth - 3; }
$('#photos-prev').addEventListener('click', () => strip.scrollBy({ left: -strip.clientWidth * .8, behavior: reducedMotion ? 'instant' : 'smooth' }));
$('#photos-next').addEventListener('click', () => strip.scrollBy({ left: strip.clientWidth * .8, behavior: reducedMotion ? 'instant' : 'smooth' }));
strip.addEventListener('scroll', galleryState, { passive: true }); window.addEventListener('resize', galleryState); galleryState();

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
const video = $('#memory-video');
$('#play-memory').addEventListener('click', async () => { video.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'center' }); try { await video.play(); } catch { video.focus(); } });
video.addEventListener('play', () => { if (musicPlaying) stopMusic(); $('#play-memory').innerHTML = 'Volver al video <span aria-hidden="true">▷</span>'; });
document.addEventListener('visibilitychange', () => { syncAnimation(); if (document.hidden) { stopMusic(); video.pause(); } });

if ('IntersectionObserver' in window) {
  document.body.classList.add('js-enabled');
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .1 });
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
}
