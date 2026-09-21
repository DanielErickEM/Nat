import * as T from './assets/three-engine.js';

// Real curved surfaces, with a central rib, narrow veins and translucent-looking edges.
function petalGeometry(kind, detail = 14) {
  const positions = [], colors = [], uv = [], indices = [];
  const across = 6;
  for (let j = 0; j <= detail; j++) {
    const u = j / detail;
    for (let k = 0; k <= across; k++) {
      const v = k / across * 2 - 1;
      let width, y, z;
      if (kind === 'rose') {
        width = .46 * Math.pow(Math.sin(Math.PI * u), .52);
        y = .18 + u * .67;
        z = .12 + .70 * u * u - .22 * Math.pow(u, 8) + .12 * v * v * Math.sin(Math.PI * u) + .055 * Math.sin(v * 3.2) * u;
      } else if (kind === 'tulip') {
        width = .40 * Math.pow(Math.sin(Math.PI * u), .55);
        y = .14 + u * .55;
        z = .04 + .9 * u - .12 * u * u;
      } else {
        width = (kind === 'daisy' ? .13 : .16) * Math.pow(Math.sin(Math.PI * u), .68);
        y = .25 + u * (kind === 'daisy' ? .87 : 1.13);
        z = .045 + .16 * Math.sin(Math.PI * u) - .18 * u * u + .095 * v * v * Math.sin(Math.PI * u);
        z += .004 * Math.cos(v * 18) * Math.sin(Math.PI * u);
      }
      positions.push(v * width, y, z);
      const c = new T.Color().setHSL(.101 + u * .027, .95 - u * .11, .25 + u * .24 + .025 * Math.cos(v * 15));
      colors.push(c.r, c.g, c.b); uv.push(k / across, u);
      if (j < detail && k < across) {
        const a = j * (across + 1) + k, b = a + across + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(indices); g.computeVertexNormals();
  return g;
}

export function makeFlowers(specs, { detailed = false } = {}) {
  const group = new T.Group();
  const batches = { sunflower: [], daisy: [], rose: [], tulip: [], centers: [], seeds: [], stems: [], leaves: [] };
  const dummy = new T.Object3D(), parent = new T.Object3D(), matrix = new T.Matrix4();
  const petalMat = new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: .57, metalness: .015, emissive: '#6a3505', emissiveIntensity: .035 });
  const seedMat = new T.MeshStandardMaterial({ color: '#4b2d0d', roughness: .94 });
  const centerMat = new T.MeshStandardMaterial({ color: '#35210f', roughness: .9 });
  const stemMat = new T.MeshStandardMaterial({ color: '#3b6430', roughness: .8 });
  const leafMat = new T.MeshStandardMaterial({ color: '#507b35', roughness: .67, side: T.DoubleSide });
  function add(batch, p, r, s, color) {
    dummy.position.set(...p); dummy.rotation.set(...r); dummy.scale.set(...s); dummy.updateMatrix();
    matrix.multiplyMatrices(parent.matrix, dummy.matrix);
    batch.push({ matrix: matrix.clone(), color });
  }
  for (const spec of specs) {
    const kind = spec.kind;
    parent.position.set(...spec.position); parent.rotation.set(...spec.rotation); parent.scale.setScalar(spec.scale); parent.updateMatrix();
    const n = kind === 'sunflower' ? (detailed ? 26 : 20) : kind === 'daisy' ? 15 : kind === 'rose' ? 9 : 6;
    const layers = kind === 'rose' ? 4 : kind === 'sunflower' ? 3 : kind === 'tulip' ? 1 : 2;
    for (let layer = 0; layer < layers; layer++) {
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + layer * .135;
        const scale = kind === 'rose' ? 1 - layer * .20 : 1 - layer * .075;
        add(batches[kind], [0, 0, layer * .065], [kind === 'rose' ? layer * .12 + Math.sin(i * 2.4) * .08 : 0, 0, a], [scale, scale * (1 + Math.sin(i * 2.4) * .06), scale]);
      }
    }
    if (kind === 'sunflower' || kind === 'daisy') {
      const r = kind === 'sunflower' ? .40 : .19;
      add(batches.centers, [0, 0, .12], [0, 0, 0], [r, r, .13]);
      const count = detailed ? 480 : kind === 'sunflower' ? 55 : 22;
      for (let i = 0; i < count; i++) {
        const a = i * 2.399963, sr = Math.sqrt((i + .5) / count) * r;
        const z = .12 + Math.sqrt(Math.max(0, 1 - (sr / r) ** 2)) * .125;
        const s = detailed ? .011 + Math.sqrt(i / count) * .010 : .023;
        const color = new T.Color().setHSL(.085, .55, .13 + (i % 5) * .028);
        add(batches.seeds, [Math.cos(a) * sr, Math.sin(a) * sr, z], [0, 0, a], [s, s * .8, s * 1.5], color);
      }
    }
    if (spec.stem) {
      add(batches.stems, [0, -.9, -.13], [0, 0, -.09], [.035, 1.8, .035]);
      add(batches.leaves, [-.22, -1.08, -.1], [0, .4, -.65], [.3, .56, .065]);
      add(batches.leaves, [.25, -1.55, -.11], [0, -.3, .73], [.31, .58, .065]);
    }
  }
  const geometries = {
    sunflower: petalGeometry('sunflower', detailed ? 26 : 11),
    daisy: petalGeometry('daisy', 11), rose: petalGeometry('rose', 13), tulip: petalGeometry('tulip', 14),
    centers: new T.SphereGeometry(1, detailed ? 30 : 12, detailed ? 16 : 8),
    seeds: new T.IcosahedronGeometry(1, 0), stems: new T.CylinderGeometry(1, 1, 1, 6),
    leaves: new T.SphereGeometry(1, 10, 6)
  };
  for (const [kind, entries] of Object.entries(batches)) {
    if (!entries.length) { geometries[kind].dispose(); continue; }
    const material = kind === 'seeds' ? seedMat : kind === 'centers' ? centerMat : kind === 'stems' ? stemMat : kind === 'leaves' ? leafMat : petalMat;
    const mesh = new T.InstancedMesh(geometries[kind], material, entries.length);
    entries.forEach((entry, i) => { mesh.setMatrixAt(i, entry.matrix); if (entry.color) mesh.setColorAt(i, entry.color); });
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); group.add(mesh);
  }
  return group;
}
