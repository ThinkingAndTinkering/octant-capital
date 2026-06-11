// Octant hero — celestial sphere: fibonacci star field, graticule,
// great-circle arcs pulsing between financial centers.
import * as THREE from 'three';

const TAU = Math.PI * 2;

const CITIES = {
  newYork: [40.7128, -74.006],
  london: [51.5072, -0.1276],
  singapore: [1.3521, 103.8198],
  geneva: [46.2044, 6.1432],
  tokyo: [35.6762, 139.6503],
  hongKong: [22.3193, 114.1694],
  sanFrancisco: [37.7749, -122.4194],
  dubai: [25.2048, 55.2708],
  saoPaulo: [-23.5505, -46.6333],
  sydney: [-33.8688, 151.2093],
};

const ROUTES = [
  ['newYork', 'london'], ['london', 'geneva'], ['newYork', 'sanFrancisco'],
  ['london', 'dubai'], ['singapore', 'tokyo'], ['singapore', 'hongKong'],
  ['newYork', 'saoPaulo'], ['tokyo', 'sanFrancisco'], ['london', 'singapore'],
  ['hongKong', 'sydney'], ['geneva', 'dubai'], ['newYork', 'singapore'],
];

const R = 2.35;

function latLonToVec3(lat, lon, r) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

const STAR_VERT = /* glsl */`
  attribute float aSize;
  attribute float aPhase;
  attribute float aGold;
  uniform float uTime;
  uniform float uScale;
  varying float vTwinkle;
  varying float vGold;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vTwinkle = 0.72 + 0.38 * sin(uTime * 1.35 + aPhase);
    vGold = aGold;
    gl_PointSize = max(aSize * uScale / -mv.z, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const STAR_FRAG = /* glsl */`
  precision mediump float;
  uniform float uOpacity;
  varying float vTwinkle;
  varying float vGold;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.12, d) * vTwinkle * uOpacity;
    vec3 ivory = vec3(0.925, 0.906, 0.855);
    vec3 gold = vec3(0.910, 0.760, 0.510);
    vec3 col = mix(ivory, gold, vGold);
    gl_FragColor = vec4(col, a * (0.5 + 0.5 * vGold));
  }
`;

export function createHeroScene(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true, powerPreference: 'high-performance',
    });
  } catch (e) {
    return null;
  }

  const coarse = matchMedia('(pointer: coarse)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.6 : 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(0, 0, 7.2);

  const world = new THREE.Group();   // layout (breakpoint offset) + parallax
  const globe = new THREE.Group();   // slow spin
  world.add(globe);
  scene.add(world);
  globe.rotation.z = -0.38;

  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: reduced ? 0.9 : 0 },
    uScale: { value: 600 },
  };

  // ---- star field (fibonacci sphere)
  const N = coarse ? 1500 : 2600;
  {
    const pos = new Float32Array(N * 3);
    const size = new Float32Array(N);
    const phase = new Float32Array(N);
    const goldf = new Float32Array(N);
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = ga * i;
      const r = R * (1 + (Math.random() - 0.5) * 0.05);
      pos[i * 3] = Math.cos(th) * rad * r;
      pos[i * 3 + 1] = y * r;
      pos[i * 3 + 2] = Math.sin(th) * rad * r;
      const isGold = Math.random() < 0.045;
      goldf[i] = isGold ? 1 : 0;
      size[i] = (0.011 + Math.pow(Math.random(), 3) * 0.02) * (isGold ? 1.7 : 1);
      phase[i] = Math.random() * TAU;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    geo.setAttribute('aGold', new THREE.BufferAttribute(goldf, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms, vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    globe.add(new THREE.Points(geo, mat));

    // city markers reuse the same material
    const cityKeys = Object.keys(CITIES);
    const cpos = new Float32Array(cityKeys.length * 3);
    const csize = new Float32Array(cityKeys.length);
    const cphase = new Float32Array(cityKeys.length);
    const cgold = new Float32Array(cityKeys.length);
    cityKeys.forEach((k, i) => {
      const v = latLonToVec3(CITIES[k][0], CITIES[k][1], R * 1.002);
      cpos[i * 3] = v.x; cpos[i * 3 + 1] = v.y; cpos[i * 3 + 2] = v.z;
      csize[i] = 0.030;
      cphase[i] = Math.random() * TAU;
      cgold[i] = 1;
    });
    const cgeo = new THREE.BufferGeometry();
    cgeo.setAttribute('position', new THREE.BufferAttribute(cpos, 3));
    cgeo.setAttribute('aSize', new THREE.BufferAttribute(csize, 1));
    cgeo.setAttribute('aPhase', new THREE.BufferAttribute(cphase, 1));
    cgeo.setAttribute('aGold', new THREE.BufferAttribute(cgold, 1));
    globe.add(new THREE.Points(cgeo, mat));
  }

  // ---- graticule (faded line work, opacity driven by master)
  const fadeMats = []; // {mat, base}
  function ring(points, base, color) {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0 });
    fadeMats.push({ mat, base });
    const line = new THREE.LineLoop(geo, mat);
    globe.add(line);
    return line;
  }
  {
    const SEG = 128;
    // meridians every 30°
    for (let m = 0; m < 6; m++) {
      const rot = (m / 6) * Math.PI;
      const pts = [];
      for (let i = 0; i < SEG; i++) {
        const a = (i / SEG) * TAU;
        const p = new THREE.Vector3(Math.sin(a) * R, Math.cos(a) * R, 0);
        p.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
        pts.push(p);
      }
      ring(pts, 0.05, 0xece7da);
    }
    // parallels
    [-60, -30, 0, 30, 60].forEach((lat) => {
      const r = R * Math.cos(lat * Math.PI / 180);
      const y = R * Math.sin(lat * Math.PI / 180);
      const pts = [];
      for (let i = 0; i < SEG; i++) {
        const a = (i / SEG) * TAU;
        pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
      }
      ring(pts, lat === 0 ? 0.085 : 0.05, lat === 0 ? 0xc4a265 : 0xece7da);
    });
  }

  // ---- great-circle arcs (comet draw via drawRange)
  const SEG = 128;
  const routePts = ROUTES.map(([a, b]) => {
    const va = latLonToVec3(CITIES[a][0], CITIES[a][1], 1);
    const vb = latLonToVec3(CITIES[b][0], CITIES[b][1], 1);
    const omega = Math.acos(THREE.MathUtils.clamp(va.dot(vb), -1, 1));
    const lift = 0.045 + 0.17 * (omega / Math.PI);
    const arr = new Float32Array((SEG + 1) * 3);
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      const s = Math.sin(omega);
      const p = va.clone().multiplyScalar(Math.sin((1 - t) * omega) / s)
        .add(vb.clone().multiplyScalar(Math.sin(t * omega) / s));
      p.multiplyScalar(R * (1 + lift * Math.sin(Math.PI * t)));
      arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z;
    }
    return arr;
  });

  const POOL = coarse ? 3 : 4;
  const flights = [];
  for (let i = 0; i < POOL; i++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEG + 1) * 3), 3));
    geo.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({
      color: 0xd9b87a, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    globe.add(line);
    flights.push({ line, active: false, t: 0, dur: 3, wait: 1.2 + i * 1.4, route: -1 });
  }

  function spawn(f) {
    let idx;
    do { idx = Math.floor(Math.random() * routePts.length); }
    while (flights.some((o) => o !== f && o.active && o.route === idx));
    f.route = idx;
    f.line.geometry.attributes.position.array.set(routePts[idx]);
    f.line.geometry.attributes.position.needsUpdate = true;
    f.t = 0;
    f.dur = 2.8 + Math.random() * 1.6;
    f.active = true;
  }

  let master = reduced ? 1 : 0; // global fade for lines/arcs
  function updateFlights(dt) {
    for (const f of flights) {
      if (!f.active) {
        f.wait -= dt;
        if (f.wait <= 0) spawn(f);
        continue;
      }
      f.t += dt / f.dur;
      const p = f.t;
      const head = Math.floor(THREE.MathUtils.clamp(p * 1.45, 0, 1) * SEG);
      const tail = Math.floor(THREE.MathUtils.clamp(p * 1.45 - 0.45, 0, 1) * SEG);
      f.line.geometry.setDrawRange(tail, Math.max(head - tail, 0) + 1);
      const env = Math.pow(Math.sin(Math.PI * THREE.MathUtils.clamp(p, 0, 1)), 0.6);
      f.line.material.opacity = env * 0.75 * master;
      if (p >= 1) {
        f.active = false;
        f.line.material.opacity = 0;
        f.line.geometry.setDrawRange(0, 0);
        f.wait = 0.6 + Math.random() * 2.2;
      }
    }
  }

  function applyMaster() {
    for (const { mat, base } of fadeMats) mat.opacity = base * master;
  }

  // ---- layout / resize
  let w = 1, h = 1;
  function layout() {
    w = canvas.clientWidth || canvas.parentElement.clientWidth || 1;
    h = canvas.clientHeight || canvas.parentElement.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const fovScale = (h * renderer.getPixelRatio() * 0.5) / Math.tan((camera.fov / 2) * Math.PI / 180);
    uniforms.uScale.value = fovScale;
    if (w < 820) {
      world.position.set(0, -1.72, 0);
      world.scale.setScalar(1.0);
      camera.position.z = 7.5;
    } else {
      world.position.set(1.75, -0.25, 0);
      world.scale.setScalar(1.0);
      camera.position.z = 7.2;
    }
    camera.updateProjectionMatrix();
  }
  layout();
  window.addEventListener('resize', () => { layout(); if (!running) renderer.render(scene, camera); });

  // ---- pointer parallax
  let tx = 0, ty = 0, px = 0, py = 0;
  if (!coarse && !reduced) {
    window.addEventListener('pointermove', (e) => {
      tx = (e.clientX / window.innerWidth - 0.5);
      ty = (e.clientY / window.innerHeight - 0.5);
    }, { passive: true });
  }

  // ---- loop
  const clock = new THREE.Clock();
  let running = false;
  let inView = true;
  let visible = !document.hidden;
  let raf = 0;

  function tick() {
    raf = 0;
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    uniforms.uTime.value += dt;
    globe.rotation.y += dt * 0.05;
    px += (tx - px) * 0.04;
    py += (ty - py) * 0.04;
    world.rotation.y = px * 0.22;
    world.rotation.x = py * 0.14;
    updateFlights(dt);
    applyMaster();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }

  function syncRunning() {
    const should = inView && visible && !reduced;
    if (should && !running) {
      running = true;
      clock.getDelta();
      if (!raf) raf = requestAnimationFrame(tick);
    } else if (!should && running) {
      running = false;
    }
  }

  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    syncRunning();
  });

  if (reduced) {
    // static frame
    applyMaster();
    renderer.render(scene, camera);
  } else {
    syncRunning();
  }

  return {
    canvas,
    globe,
    world,
    uniforms,
    setInView(v) { inView = v; syncRunning(); },
    setMaster(k) { master = k; },
    getMaster() { return master; },
  };
}
