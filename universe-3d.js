import * as T from './assets/three-engine.js';
import { makeFlowers } from './flowers.js?v=cinema-5';

export async function startUniverse() {
  const $ = s => document.querySelector(s);
  const canvas = $('#cosmos');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const mobile = matchMedia('(max-width: 600px)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.35 : 1.6));
  renderer.setClearColor(0x030309, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .92;
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene();
  scene.fog = new T.FogExp2('#060713', .009);
  const camera = new T.PerspectiveCamera(40, 1, .1, 110);
  const world = new T.Group(); scene.add(world);
  const galaxy = new T.Group(); world.add(galaxy);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motion.matches, paused = false, elapsed = 0, last = 0, raf = null;
  let width = 0, height = 0, distance = 19, qualityReduced = false;
  let slowFrames = 0, frameSamples = 0, contextLost = false;
  const mouse = new T.Vector2(), smoothMouse = new T.Vector2();
  const clockPosition = new T.Vector3(), target = new T.Vector3();

  scene.add(new T.HemisphereLight('#d6e3ff', '#332411', 1.15));
  const key = new T.DirectionalLight('#fff0c7', 2.3); key.position.set(-4, 7, 9); scene.add(key);
  const rim = new T.DirectionalLight('#9fafff', 1.65); rim.position.set(4, 2, -6); scene.add(rim);
  const warm = new T.PointLight('#ffd06a', 7, 19, 1.4); warm.position.set(0, 1, 2); scene.add(warm);
  const fill = new T.DirectionalLight('#f7bd57', .8); fill.position.set(-8, -3, 2); scene.add(fill);

  // Filmic bloom affects only bright particles and light, preserving petal detail.
  const composer = new T.EffectComposer(renderer);
  composer.addPass(new T.RenderPass(scene, camera));
  const bloom = new T.UnrealBloomPass(new T.Vector2(1, 1), .34, .52, 1.2);
  composer.addPass(bloom); composer.addPass(new T.OutputPass());

  let seed = 210926;
  function rand() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  const range = (a, b) => a + rand() * (b - a);

  function glowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.09, '#fff5d9'); g.addColorStop(.23, '#ffe1a388'); g.addColorStop(.52, '#ffba4520'); g.addColorStop(1, '#ffb13a00');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new T.CanvasTexture(c);
  }
  const softGlow = glowTexture();
  const halo = new T.Sprite(new T.SpriteMaterial({ map: softGlow, color: '#ffd372', transparent: true, opacity: .42, depthWrite: false, blending: T.AdditiveBlending }));
  halo.scale.set(6.4, 6.4, 1); halo.position.z = -.6; world.add(halo);

  // A genuine spherical sun with slowly moving granulation and a luminous atmosphere.
  const core = new T.Mesh(new T.SphereGeometry(.92, 56, 36), new T.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vNormal; varying vec3 vPosition; varying vec3 vView;
      void main(){vNormal=normalize(normalMatrix*normal);vPosition=position;vec4 mv=modelViewMatrix*vec4(position,1.);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uTime;varying vec3 vNormal;varying vec3 vPosition;varying vec3 vView;
      float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){vec3 p=vPosition*7.+vec3(0,uTime*.04,0);float n=noise(p)*.55+noise(p*3.1)*.30+noise(p*9.)*.15;
      float rim=pow(1.-max(dot(normalize(vNormal),normalize(vView)),0.),2.);
      vec3 dark=vec3(.26,.115,.022),gold=vec3(1.35,.76,.21);vec3 col=mix(dark,gold,n*.85)+rim*vec3(1.9,.93,.25);gl_FragColor=vec4(col,1.);}`
  }));
  world.add(core);
  const corona = new T.Mesh(new T.SphereGeometry(.985, 40, 24), new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    vertexShader: 'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader: 'varying vec3 n;varying vec3 v;void main(){float f=pow(1.-abs(dot(n,v)),3.5);gl_FragColor=vec4(1.9,1.05,.36,f*.58);}'
  })); world.add(corona);

  // Hero flowers retain hundreds of physical seeds and densely curved petals.
  const heroes = [
    { kind: 'sunflower', position: [-3.8, -.85, 1.3], rotation: [.16, -.28, -.42], scale: .79, stem: true },
    { kind: 'sunflower', position: [3.65, .7, .1], rotation: [-.19, .32, .38], scale: .64, stem: true },
    { kind: 'rose', position: [2.25, -2.15, 1.7], rotation: [-.3, -.15, .7], scale: .61, stem: true },
    { kind: 'tulip', position: [-2.45, 2.1, -.4], rotation: [.25, -.1, -.6], scale: .60, stem: true },
    { kind: 'daisy', position: [.5, 2.55, -.7], rotation: [.12, .2, -.2], scale: .39, stem: false }
  ].map(spec => {
    const flower = makeFlowers([{ ...spec, position: [0, 0, 0], rotation: [0, 0, 0] }], { detailed: spec.kind === 'sunflower' });
    flower.position.set(...spec.position); flower.rotation.set(...spec.rotation); world.add(flower);
    return { flower, initial: new T.Vector3(...spec.position), rotation: new T.Euler(...spec.rotation) };
  });
  const specs = Array.from({ length: mobile ? 78 : 120 }, (_, i) => {
    const a = range(0, Math.PI * 2), r = range(2.1, 6.0);
    return { kind: ['sunflower', 'daisy', 'rose', 'tulip'][i % 4], position: [Math.cos(a) * r, range(-.17, .17), Math.sin(a) * r], rotation: [-Math.PI / 2 + range(-.45, .45), range(-.5, .5), range(0, 6.28)], scale: range(.08, .21), stem: i % 7 === 0 };
  });
  galaxy.add(makeFlowers(specs)); galaxy.rotation.set(.66, .1, -.19);

  // Spiral arms and thousands of points inhabit actual 3D space.
  function particles(count, distribution, size, color, opacity, additive = true) {
    const pos = new Float32Array(count * 3), colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const p = distribution(i); pos.set(p, i * 3);
      const c = new T.Color(color).multiplyScalar(range(.45, 1.8)); colors.set([c.r, c.g, c.b], i * 3);
    }
    const g = new T.BufferGeometry();g.setAttribute('position', new T.BufferAttribute(pos, 3));g.setAttribute('color', new T.BufferAttribute(colors, 3));
    const m = new T.PointsMaterial({ map: softGlow, size, color: '#ffffff', vertexColors: true, transparent: true, opacity, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending });
    return new T.Points(g, m);
  }
  const stardust = particles(mobile ? 3400 : 6000, i => {
    const r = range(1.3, 6.3), a = r * 1.32 + i % 3 * Math.PI * 2 / 3 + range(-.42, .42);
    return [Math.cos(a) * r, range(-.13, .13), Math.sin(a) * r];
  }, .065, '#ffce64', .85); galaxy.add(stardust);
  const stars = particles(mobile ? 1600 : 2600, () => [range(-35, 35), range(-23, 23), range(-50, -9)], .13, '#d8e3ff', 1.0); scene.add(stars);
  const fireflies = particles(180, () => [range(-9, 9), range(-5, 5), range(-3, 6)], .085, '#ffcc69', .7); world.add(fireflies);
  const nebula = particles(75, () => { const x = range(-22, 22); return [x, x * .45 + range(-3, 3), range(-24, -16)]; }, 7.5, '#79519c', .10);
  scene.add(nebula);
  for (const radius of [2.0, 3.5, 5.2, 6.2]) {
    const points = Array.from({ length: 160 }, (_, i) => { const a = i / 160 * Math.PI * 2; return new T.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius); });
    const ring = new T.LineLoop(new T.BufferGeometry().setFromPoints(points), new T.LineBasicMaterial({ color: '#bd9148', transparent: true, opacity: .14 })); galaxy.add(ring);
  }

  // A few drifting petals cross the foreground, with perspective and real lighting.
  const petalGroup = new T.Group(); world.add(petalGroup);
  const petalGeo = new T.SphereGeometry(1, 10, 6);
  const petalMat = new T.MeshStandardMaterial({ color: '#efbb38', roughness: .46, metalness: .02 });
  const loosePetals = Array.from({ length: mobile ? 18 : 32 }, () => {
    const mesh = new T.Mesh(petalGeo, petalMat); mesh.scale.set(range(.03, .065), range(.085, .15), .012);
    mesh.position.set(range(-8, 8), range(-5, 6), range(-2, 5)); mesh.rotation.set(range(0, 6), range(0, 6), range(0, 6)); petalGroup.add(mesh);
    return { mesh, x: mesh.position.x, y: mesh.position.y, speed: range(.05, .16), phase: range(0, 6) };
  });

  // Two tiny golden butterflies drift between the flowers, flapping curved wings.
  const wingShape = new T.Shape();
  wingShape.moveTo(0, 0); wingShape.bezierCurveTo(.11, .32, .50, .33, .40, .10);
  wingShape.bezierCurveTo(.30, -.03, .39, -.22, .16, -.20); wingShape.quadraticCurveTo(.03, -.13, 0, 0);
  const wingGeometry = new T.ShapeGeometry(wingShape, 12);
  const wingMat = new T.MeshStandardMaterial({ color: '#ffcd55', emissive: '#6f3511', emissiveIntensity: .10, side: T.DoubleSide, roughness: .44 });
  const butterflies = [0, 1].map(i => {
    const group = new T.Group(), left = new T.Group(), right = new T.Group();
    const a = new T.Mesh(wingGeometry, wingMat), b = new T.Mesh(wingGeometry, wingMat); b.scale.x = -1;
    left.add(a); right.add(b); group.add(left, right);
    const body = new T.Mesh(new T.SphereGeometry(.025, 6, 5), seedBodyMaterial()); body.scale.y = 5; group.add(body);
    group.scale.setScalar(.55 + i * .12); world.add(group); return { group, left, right, phase: i * Math.PI };
  });
  function seedBodyMaterial() { return new T.MeshStandardMaterial({ color: '#563b17', roughness: .7 }); }

  const loader = new T.TextureLoader();
  const mediaRoot = $('#orbit-photos'); mediaRoot.classList.add('media-accessible');
  let video = document.createElement('video'); video.id = 'memory-video'; video.muted = true; video.defaultMuted = true; video.autoplay = true; video.loop = true; video.playsInline = true; video.preload = 'auto';
  video.setAttribute('muted', ''); video.setAttribute('playsinline', ''); video.setAttribute('autoplay', ''); video.setAttribute('loop', '');
  video.setAttribute('aria-label', 'Nataly, sonriendo al aire libre'); video.poster = 'assets/video-poster.webp'; video.src = 'assets/nataly.mp4'; mediaRoot.append(video);
  const frameMaterial = new T.MeshStandardMaterial({ color: '#bba36b', metalness: .78, roughness: .27 });
  const backMaterial = new T.MeshStandardMaterial({ color: '#272134', metalness: .3, roughness: .5 });
  const cards = [];
  function cropTexture(texture, imageAspect) {
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const targetAspect = .76;
    if (imageAspect > targetAspect) { texture.repeat.x = targetAspect / imageAspect; texture.offset.x = (1 - texture.repeat.x) / 2; }
    else { texture.repeat.y = imageAspect / targetAspect; texture.offset.y = (1 - texture.repeat.y) / 2; }
  }
  const mediaPromises = [];
  for (let i = 0; i < 6; i++) {
    const card = new T.Group();
    const body = new T.Mesh(new T.BoxGeometry(1.0, 1.31, .05), backMaterial); card.add(body);
    const frontMaterial = new T.MeshBasicMaterial({ color: '#f2e9dd', toneMapped: false });
    const front = new T.Mesh(new T.PlaneGeometry(.94, 1.235), frontMaterial); front.position.z = .03; card.add(front);
    for (const [x, y, sx, sy] of [[-.49, 0, .025, 1.31], [.49, 0, .025, 1.31], [0, -.65, .99, .025], [0, .65, .99, .025]]) {
      const bar = new T.Mesh(new T.BoxGeometry(sx, sy, .075), frameMaterial); bar.position.set(x, y, .025); card.add(bar);
    }
    const imageUrl = i === 5 ? 'assets/video-poster.webp' : `assets/nataly-${i + 1}.webp`;
    mediaPromises.push(loader.loadAsync(imageUrl).then(texture => { cropTexture(texture, texture.image.width / texture.image.height); frontMaterial.map = texture; frontMaterial.needsUpdate = true; }).catch(() => { frontMaterial.color.set('#8d7240'); }));
    if (i === 5) {
      video.addEventListener('loadeddata', () => { const texture = new T.VideoTexture(video); cropTexture(texture, video.videoWidth / video.videoHeight); frontMaterial.map?.dispose(); frontMaterial.map = texture; frontMaterial.needsUpdate = true; }, { once: true });
    } else {
      const accessibleImage = document.createElement('img'); accessibleImage.src = imageUrl; accessibleImage.alt = `Recuerdo ${i + 1} de Nataly`; mediaRoot.append(accessibleImage);
    }
    world.add(card); cards.push({ card, phase: i / 6 * Math.PI * 2 + .33 });
  }
  // Keep the first rendered frame complete, even before the video is ready.
  await Promise.all(mediaPromises);

  const wishes = [
    ['En todas mis galaxias,', 'mi sol siempre eres tú.'],
    ['Todas las flores del universo,', 'hoy son para ti.'],
    ['Tu sonrisa hace florecer', 'hasta mis días más grises.'],
    ['Si el cariño tuviera un color,', 'sería este amarillo contigo.'],
    ['Entre millones de estrellas,', 'te volvería a elegir.'],
    ['Que nunca te falten flores,', 'ni motivos para sonreír.'],
    ['Feliz 21 de septiembre,', 'mi bonita Nataly. ♡']
  ];
  let wishIndex = -1;
  function updateMessage() {
    const index = Math.floor(elapsed / 10) % wishes.length, phase = elapsed % 10, el = $('#wish');
    el.classList.toggle('fading', phase > 8.8);
    if (index !== wishIndex) { wishIndex = index; el.replaceChildren(document.createTextNode(wishes[index][0]), document.createElement('br')); const em = document.createElement('em'); em.textContent = wishes[index][1]; el.append(em); }
  }
  function resize() {
    width = canvas.clientWidth; height = canvas.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height; camera.updateProjectionMatrix();
    // Fit the entire galaxy in portrait, keeping the upper title and lower messages clear.
    distance = camera.aspect < .85 ? 13.8 / camera.aspect : camera.aspect > 1.8 ? 18 : 20;
    renderer.setSize(width, height, false); composer.setSize(width, height);
    updateScene(0); render();
  }
  function updateScene(dt) {
    const t = elapsed, motionFactor = reducedMotion ? .25 : 1;
    const portrait = width / height < .85;
    smoothMouse.lerp(mouse, 1 - Math.exp(-dt * 2));
    const orbit = t * .045 * motionFactor;
    camera.position.set(Math.sin(t * .052) * .85 * motionFactor + smoothMouse.x * .6, 1.15 + Math.sin(t * .07) * .32 * motionFactor + smoothMouse.y * .35, distance + Math.sin(t * .09) * .45 * motionFactor);
    target.set(0, -1.15, 0); camera.lookAt(target);
    galaxy.rotation.z = portrait ? .82 : -.19;
    galaxy.rotation.y = orbit; galaxy.rotation.x = .64 + Math.sin(t * .08) * .08 * motionFactor;
    core.rotation.y = t * .055; core.material.uniforms.uTime.value = t;
    halo.material.opacity = .36 + Math.sin(t * .8) * .035; halo.scale.setScalar(6.5 + Math.sin(t * .5) * .2);
    fireflies.rotation.y = -t * .016; fireflies.rotation.z = Math.sin(t * .05) * .035;
    stardust.material.opacity = .75 + Math.sin(t * .7) * .10;
    stars.rotation.z = t * .0008; nebula.rotation.z = Math.sin(t * .01) * .06;
    heroes.forEach(({ flower, initial, rotation }, i) => {
      flower.position.copy(initial); if (portrait) { flower.position.x *= .78; flower.position.y *= 1.5; } flower.position.y += Math.sin(t * .42 + i * 1.8) * .16 * motionFactor;
      flower.rotation.set(rotation.x + Math.sin(t * .23 + i) * .12, rotation.y + Math.sin(t * .18 + i * 2) * .22, rotation.z + Math.sin(t * .3 + i) * .065);
    });
    cards.forEach(({ card, phase }, i) => {
      const a = phase + t * .052 * motionFactor;
      card.position.set(Math.cos(a) * (portrait ? 3.4 : 4.7), Math.sin(a) * (portrait ? 3.1 : 2.05) + .2, Math.sin(a * 1.7 + i) * 1.35 + .9);
      card.quaternion.copy(camera.quaternion); card.rotateY(Math.sin(t * .24 + i) * .16); card.rotateZ(Math.sin(t * .22 + i * 2) * .065);
      card.scale.setScalar((i === 5 ? 1.05 : .9) * (portrait ? 1.12 : 1));
    });
    loosePetals.forEach(({ mesh, x, y, speed, phase }) => {
      mesh.position.y = ((y - t * speed * motionFactor + 50) % 11) - 5.5;
      mesh.position.x = x + Math.sin(t * .34 + phase) * .45;
      mesh.rotation.x = t * .4 + phase; mesh.rotation.y = t * .3 + phase;
    });
    butterflies.forEach(({ group, left, right, phase }) => {
      const a = t * .22 * motionFactor + phase;
      group.position.set(Math.cos(a) * 3.5, Math.sin(a * 1.8) * 1.8 + .7, 2 + Math.sin(a) * .7);
      group.rotation.set(.1, Math.sin(a) * .35, Math.sin(a * 2) * .3);
      const flap = Math.sin(t * (reducedMotion ? 3 : 9) + phase) * .65;
      left.rotation.y = flap; right.rotation.y = -flap;
    });
    camera.updateMatrixWorld();
    clockPosition.set(0, 0, .92).project(camera);
    const title = $('.sun-name'); title.style.left = `${(clockPosition.x * .5 + .5) * width}px`; title.style.top = `${(-clockPosition.y * .5 + .5) * height}px`;
    const titleScale = Math.min(1, Math.max(.59, width / distance / 43)); title.style.setProperty('--title-scale', titleScale);
    updateMessage();
  }
  function render() { if (!contextLost) composer.render(); }
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, .065) : 0; last = now;
    elapsed += dt; updateScene(dt); render();
    if (!qualityReduced && dt > .003) {
      frameSamples++; if (dt > .040) slowFrames++;
      if (frameSamples === 150 && slowFrames > 65) { qualityReduced = true; renderer.setPixelRatio(1); bloom.enabled = false; composer.setPixelRatio(1); resize(); }
    }
    raf = requestAnimationFrame(tick);
  }
  async function playVideo() { try { await video.play(); } catch { /* The still poster remains when autoplay is unavailable. */ } }
  function restart() {
    if (raf !== null) cancelAnimationFrame(raf); raf = null; last = 0;
    if (!paused && !document.hidden && !contextLost) { playVideo(); raf = requestAnimationFrame(tick); } else { video.pause(); render(); }
  }
  $('#pause-motion').addEventListener('click', () => { paused = !paused; const b = $('#pause-motion'); b.setAttribute('aria-pressed', String(paused)); b.setAttribute('aria-label', paused ? 'Reanudar animación' : 'Pausar animación'); b.textContent = paused ? '▷' : 'Ⅱ'; restart(); });
  addEventListener('pointermove', e => { mouse.set((e.clientX / innerWidth - .5) * 2, (.5 - e.clientY / innerHeight) * 2); }, { passive: true });
  document.addEventListener('pointerdown', () => { if (!paused && video.paused) playVideo(); }, { once: true });
  addEventListener('resize', resize);
  motion.addEventListener('change', e => { reducedMotion = e.matches; });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); contextLost = true; restart(); });
  canvas.addEventListener('webglcontextrestored', () => { contextLost = false; restart(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopMusic(); restart(); });
  document.body.classList.add('is-3d'); canvas.dataset.renderer = 'webgl-3d';
  resize(); restart();

  // Soft instrumental sound remains opt-in, and never interrupts the silent video.
  let audioContext, musicTimer, musicPlaying = false, noteIndex = 0;
  const activeNotes = new Set();
  const melody = [72, 76, 79, 83, 81, 79, 76, 74, 72, 76, 79, 86, 84, 79, 76, 74, 69, 72, 76, 81, 79, 76, 74, 72, 67, 71, 74, 79, 76, 74, 72, null];
  function note(midi, duration, volume, delay = 0) {
    if (midi == null) return;
    const at = audioContext.currentTime + delay, osc = audioContext.createOscillator(), gain = audioContext.createGain();
    osc.type = 'sine'; osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume, at + .035); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    osc.connect(gain); gain.connect(audioContext.destination); osc.start(at); osc.stop(at + duration);
    activeNotes.add(osc); osc.onended = () => { activeNotes.delete(osc); osc.disconnect(); gain.disconnect(); };
  }
  function musicStep() { note(melody[noteIndex % melody.length], 2.8, .07); if (noteIndex % 4 === 0) { const bass = [48, 53, 57, 55][Math.floor(noteIndex / 8) % 4]; note(bass, 3.7, .04); note(bass + 7, 3, .025, .15); } noteIndex++; }
  function stopMusic() { clearInterval(musicTimer); musicPlaying = false; for (const osc of activeNotes) { try { osc.stop(); } catch {} } activeNotes.clear(); $('#sound-toggle').setAttribute('aria-pressed', 'false'); $('#sound-toggle').setAttribute('aria-label', 'Activar música'); $('#sound-label').textContent = 'Música'; }
  $('#sound-toggle').addEventListener('click', async () => {
    if (musicPlaying) { stopMusic(); return; }
    try { audioContext ??= new (window.AudioContext || window.webkitAudioContext)(); await audioContext.resume(); musicPlaying = true; musicStep(); musicTimer = setInterval(musicStep, 680); $('#sound-toggle').setAttribute('aria-pressed', 'true'); $('#sound-toggle').setAttribute('aria-label', 'Pausar música'); $('#sound-label').textContent = 'Pausar'; }
    catch { $('#sound-label').textContent = 'Sin audio'; }
  });
}
