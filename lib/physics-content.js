export const PHYSICS_VIEW_MODES = [
  {
    id: "playground",
    label: "実験する",
    title: "Playground",
    body: "まず現象を動かし、波や回転や乱れの手触りを先に掴む入口です。"
  },
  {
    id: "law",
    label: "法則で見る",
    title: "Law View",
    body: "同じ scene の上に、保存量、波面、位相、時空図、確率密度を重ねて読みます。"
  },
  {
    id: "emergence",
    label: "秩序を見る",
    title: "Emergence",
    body: "単純な更新則から、相、不可逆性、カオス、量子化が立ち上がる流れを見ます。"
  }
];

export const PHYSICS_HOME_CATEGORIES = [
  {
    id: "rotate",
    label: "回る",
    title: "Rigid Motion",
    body: "形と質量分布が運動を変える。質点では見えなかった自由度が現れます。"
  },
  {
    id: "flow",
    label: "流れる",
    title: "Continuum Flow",
    body: "粒ではなく連続体として世界を見ると、流れ場と圧力差が見えてきます。"
  },
  {
    id: "wave",
    label: "伝わる",
    title: "Wave Transport",
    body: "媒質と境界で、波の速さ、反射、屈折がどう変わるかを追います。"
  },
  {
    id: "disorder",
    label: "乱れる",
    title: "Irreversibility",
    body: "拡散と初期値依存性から、世界が戻りにくくなる感覚をつかみます。"
  },
  {
    id: "transition",
    label: "切り替わる",
    title: "Phase Change",
    body: "秩序変数が突然立ち上がる相の切り替わりを、図と状態で見ます。"
  },
  {
    id: "spacetime",
    label: "歪む",
    title: "Space-Time",
    body: "ローレンツ変換で、同じ出来事の座標が観測者ごとに変わる様子を見ます。"
  },
  {
    id: "quantum",
    label: "量子になる",
    title: "Quantum Emergence",
    body: "古典が破れ、離散性と波動性が必要になる流れを段階的にたどります。"
  }
];

export const PHYSICS_SCENES = [
  {
    id: "rigid",
    categoryId: "rotate",
    title: "剛体回転",
    academicTitle: "剛体の力学",
    difficulty: "初級",
    parameterCount: 5,
    status: "P0",
    summary: "円盤と輪の転がりを比べて、慣性モーメントが速度配分をどう変えるかを見る scene です。",
    missionTitle: "最速の形を探す",
    missionBody: "斜面と慣性係数を調整し、終端速度 6.5 m/s 以上を狙います。",
    lawNotes: ["並進エネルギー", "回転エネルギー", "慣性モーメント", "角速度", "角運動量"],
    overlays: ["trajectory", "vectors", "energy", "phase", "graph"],
    defaultOverlays: ["vectors", "energy", "trajectory"],
    connections: ["chaos", "oscillator"],
    emergenceNote: "質量分布が変わるだけで、同じ斜面でも世界の進み方が変わります。"
  },
  {
    id: "fluid",
    categoryId: "flow",
    title: "流れと障害物",
    academicTitle: "流体力学の基礎",
    difficulty: "中級",
    parameterCount: 4,
    status: "P1",
    summary: "障害物のまわりを流れる場を簡易 stream line で描き、粘性と流速で wake が変わる様子を見ます。",
    missionTitle: "wake を細く保つ",
    missionBody: "粘性と障害物半径を調整し、圧力損失を 0.6 未満に抑えます。",
    lawNotes: ["流速", "粘性", "圧力差", "レイノルズ数", "stream line"],
    overlays: ["vectors", "heatmap", "graph"],
    defaultOverlays: ["vectors", "heatmap"],
    connections: ["wave", "entropy"],
    emergenceNote: "粒ではなく流れとして見ると、局所速度の差から場の構造が立ち上がります。"
  },
  {
    id: "wave",
    categoryId: "wave",
    title: "波の反射と屈折",
    academicTitle: "電磁波の伝搬",
    difficulty: "初級",
    parameterCount: 4,
    status: "P0",
    summary: "境界をまたぐ波を簡易表示し、反射率、透過率、媒質中の波長変化を同時に見ます。",
    missionTitle: "透過を最大化する",
    missionBody: "屈折率差を抑えて、透過率 85% 以上を達成します。",
    lawNotes: ["波長", "周波数", "位相速度", "反射率", "透過率"],
    overlays: ["wave", "vectors", "energy", "graph"],
    defaultOverlays: ["wave", "vectors"],
    connections: ["relativity", "prequantum"],
    emergenceNote: "波は境界に出会うと、進むだけでなく跳ね返り、媒質側で別の顔を見せます。"
  },
  {
    id: "entropy",
    categoryId: "disorder",
    title: "拡散と混合",
    academicTitle: "熱力学第二・第三法則",
    difficulty: "中級",
    parameterCount: 4,
    status: "P1",
    summary: "左右に分かれた粒子が混ざる様子から、不可逆性と低温で自由度が凍る感覚を見ます。",
    missionTitle: "高エントロピー状態へ進める",
    missionBody: "開口と温度を上げ、混合度を 80% 以上にします。",
    lawNotes: ["混合度", "エントロピー指標", "不可逆性", "低温での自由度減少"],
    overlays: ["heatmap", "phase", "graph"],
    defaultOverlays: ["heatmap", "graph"],
    connections: ["phase", "chaos"],
    emergenceNote: "粒子の局所的な衝突を追わなくても、マクロには戻りにくい方向が見えてきます。"
  },
  {
    id: "phase",
    categoryId: "transition",
    title: "相図と相転移",
    academicTitle: "相平衡と相転移",
    difficulty: "中級",
    parameterCount: 3,
    status: "P1",
    summary: "温度と圧力の点を相図に置き、秩序変数が立ち上がる領域を見ます。",
    missionTitle: "臨界近傍へ寄せる",
    missionBody: "温度と圧力を調整し、criticality を 70% 以上にします。",
    lawNotes: ["温度", "圧力", "秩序変数", "臨界近傍", "相の境界"],
    overlays: ["heatmap", "phase", "graph"],
    defaultOverlays: ["heatmap", "phase"],
    connections: ["entropy", "oscillator"],
    emergenceNote: "少しずつ動かした制御変数が、ある境目で世界の相そのものを切り替えます。"
  },
  {
    id: "relativity",
    categoryId: "spacetime",
    title: "ローレンツ変換",
    academicTitle: "ローレンツ変換とミンコフスキー時空",
    difficulty: "中級",
    parameterCount: 3,
    status: "P0",
    summary: "時空図の傾きと同時線を変え、同じ event の座標が観測者でどうずれるかを見ます。",
    missionTitle: "gamma を 1.7 まで上げる",
    missionBody: "速度を上げて、time dilation が 1.7 倍以上になる領域に入ります。",
    lawNotes: ["ローレンツ因子", "同時線", "世界線", "固有時間", "x' と ct'"],
    overlays: ["spacetime", "vectors", "graph"],
    defaultOverlays: ["spacetime", "vectors"],
    connections: ["wave", "quantum1d"],
    emergenceNote: "空間と時間を別々に持っていた直感が、変換ひとつで崩れ、幾何として読み直されます。"
  },
  {
    id: "prequantum",
    categoryId: "quantum",
    title: "前期量子論",
    academicTitle: "光電効果とボーア模型",
    difficulty: "中級",
    parameterCount: 4,
    status: "P1",
    summary: "連続に見えていたエネルギーが threshold と離散軌道で切られる、量子への橋渡し scene です。",
    missionTitle: "電子放出を起こす",
    missionBody: "仕事関数を超える周波数を与え、運動エネルギー 1.5 eV 以上の電子を出します。",
    lawNotes: ["光子エネルギー", "仕事関数", "電子放出", "離散軌道", "スペクトル線"],
    overlays: ["energy", "eigen", "graph"],
    defaultOverlays: ["energy", "eigen"],
    connections: ["quantum1d", "oscillator"],
    emergenceNote: "古典では連続だったはずの世界に、threshold と離散準位が入り込みます。"
  },
  {
    id: "quantum1d",
    categoryId: "quantum",
    title: "1D量子井戸とトンネル",
    academicTitle: "一次元系の量子力学",
    difficulty: "上級",
    parameterCount: 4,
    status: "P2",
    summary: "ポテンシャル障壁と井戸の両方を持つ 1D scene で、反射・透過・束縛準位を見ます。",
    missionTitle: "透過率 35% 前後へ合わせる",
    missionBody: "障壁高さと幅を調整し、transmission を 25% から 45% の間へ入れます。",
    lawNotes: ["ポテンシャル障壁", "透過率", "反射率", "束縛準位", "確率密度"],
    overlays: ["probability", "energy", "graph"],
    defaultOverlays: ["probability", "energy"],
    connections: ["prequantum", "oscillator"],
    emergenceNote: "粒子の経路ではなく、状態と境界条件で結果が決まる世界へ移ります。"
  },
  {
    id: "oscillator",
    categoryId: "quantum",
    title: "量子調和振動子",
    academicTitle: "調和振動子の量子化",
    difficulty: "上級",
    parameterCount: 4,
    status: "P2",
    summary: "放物型ポテンシャルの上に離散準位と確率密度を重ね、古典振動子との違いを見ます。",
    missionTitle: "高い準位でも束縛する",
    missionBody: "準位 n を上げつつ、確率密度が井戸内へ十分残る状態を保ちます。",
    lawNotes: ["調和ポテンシャル", "固有準位", "確率密度", "古典的 turning point"],
    overlays: ["probability", "eigen", "graph"],
    defaultOverlays: ["probability", "eigen"],
    connections: ["rigid", "quantum1d"],
    emergenceNote: "古典のばね運動が、そのまま量子化されると離散準位の塔になります。"
  },
  {
    id: "chaos",
    categoryId: "disorder",
    title: "ロジスティック写像とカオス",
    academicTitle: "非線形力学とカオス",
    difficulty: "中級",
    parameterCount: 4,
    status: "P0",
    summary: "単純な 1 次の更新則から、分岐図と初期値敏感性が立ち上がる様子を見ます。",
    missionTitle: "カオス領域に入る",
    missionBody: "非線形パラメータ r を上げ、lyapunov 指標を正にします。",
    lawNotes: ["ロジスティック写像", "分岐図", "初期値依存性", "lyapunov 指標"],
    overlays: ["branching", "phase", "graph"],
    defaultOverlays: ["branching", "graph"],
    connections: ["rigid", "entropy"],
    emergenceNote: "決定論的な式でも、少しの差が指数的に拡大して予測を壊します。"
  }
];

export const PHYSICS_OVERLAY_OPTIONS = [
  { id: "trajectory", label: "軌跡", hint: "運動の跡を残す" },
  { id: "vectors", label: "ベクトル", hint: "速度や流れの向きを重ねる" },
  { id: "energy", label: "エネルギー", hint: "分配や threshold を見る" },
  { id: "heatmap", label: "密度 / 圧力", hint: "場や混合度を色で見る" },
  { id: "wave", label: "波面", hint: "伝搬と境界条件を可視化する" },
  { id: "spacetime", label: "時空図", hint: "世界線と同時線を読む" },
  { id: "probability", label: "確率密度", hint: "量子状態の濃淡を見る" },
  { id: "eigen", label: "固有状態", hint: "離散準位や固有関数を重ねる" },
  { id: "branching", label: "分岐図", hint: "非線形の枝分かれを出す" },
  { id: "phase", label: "位相 / 秩序", hint: "角度、秩序変数、phase portrait を見る" },
  { id: "graph", label: "グラフ", hint: "下部の log や系列を開く" }
];

export const PHYSICS_DEFAULTS = {
  rigid: { mass: 1.5, radius: 0.62, slopeDeg: 24, inertiaFactor: 0.5, height: 4.8 },
  fluid: { flowSpeed: 2.8, viscosity: 0.9, obstacleSize: 1.0, density: 1.0 },
  wave: { amplitude: 1.0, frequency: 1.3, wavelength: 1.4, refractiveIndex: 1.45 },
  entropy: { particleCount: 64, temperature: 48, opening: 0.58, cooling: 0.2 },
  phase: { temperature: 46, pressure: 4.6, coupling: 1.0 },
  relativity: { beta: 0.72, eventX: 5.4, eventT: 3.2 },
  prequantum: { frequency: 1.1, intensity: 0.9, workFunction: 2.4, orbitLevel: 4 },
  quantum1d: { energy: 2.7, barrierHeight: 4.8, barrierWidth: 1.4, wellDepth: 5.6 },
  oscillator: { level: 2, stiffness: 1.3, mass: 1.0, stretch: 1.1 },
  chaos: { r: 3.72, seedA: 0.232, seedB: 0.233, iterations: 42 }
};

export const PHYSICS_PRESETS = {
  rigid: [
    { id: "disc", label: "円盤", values: { mass: 1.5, radius: 0.62, slopeDeg: 24, inertiaFactor: 0.5, height: 4.8 } },
    { id: "hoop", label: "輪", values: { mass: 1.5, radius: 0.62, slopeDeg: 24, inertiaFactor: 1.0, height: 4.8 } },
    { id: "steep", label: "急斜面", values: { mass: 1.5, radius: 0.54, slopeDeg: 36, inertiaFactor: 0.45, height: 5.5 } }
  ],
  fluid: [
    { id: "laminar", label: "穏やかな流れ", values: { flowSpeed: 2.0, viscosity: 1.3, obstacleSize: 0.8, density: 1.0 } },
    { id: "wake", label: "大きい wake", values: { flowSpeed: 3.8, viscosity: 0.5, obstacleSize: 1.2, density: 1.0 } },
    { id: "dense", label: "密な媒質", values: { flowSpeed: 2.8, viscosity: 0.9, obstacleSize: 1.0, density: 1.4 } }
  ],
  wave: [
    { id: "matched", label: "近い媒質", values: { amplitude: 1.0, frequency: 1.2, wavelength: 1.5, refractiveIndex: 1.12 } },
    { id: "glass", label: "ガラス境界", values: { amplitude: 1.0, frequency: 1.4, wavelength: 1.3, refractiveIndex: 1.52 } },
    { id: "strong", label: "高周波", values: { amplitude: 1.2, frequency: 2.0, wavelength: 0.9, refractiveIndex: 1.38 } }
  ],
  entropy: [
    { id: "closed", label: "狭い開口", values: { particleCount: 64, temperature: 32, opening: 0.18, cooling: 0.2 } },
    { id: "mixing", label: "よく混ざる", values: { particleCount: 72, temperature: 56, opening: 0.82, cooling: 0.1 } },
    { id: "cold", label: "極低温寄り", values: { particleCount: 48, temperature: 10, opening: 0.35, cooling: 0.8 } }
  ],
  phase: [
    { id: "solid", label: "固体寄り", values: { temperature: 18, pressure: 5.2, coupling: 1.2 } },
    { id: "liquid", label: "液体寄り", values: { temperature: 46, pressure: 4.6, coupling: 1.0 } },
    { id: "critical", label: "臨界近傍", values: { temperature: 76, pressure: 7.4, coupling: 0.92 } }
  ],
  relativity: [
    { id: "slow", label: "低速", values: { beta: 0.24, eventX: 4.4, eventT: 3.2 } },
    { id: "fast", label: "高速", values: { beta: 0.72, eventX: 5.4, eventT: 3.2 } },
    { id: "extreme", label: "極端", values: { beta: 0.9, eventX: 6.2, eventT: 3.6 } }
  ],
  prequantum: [
    { id: "threshold", label: "しきい値付近", values: { frequency: 0.82, intensity: 0.9, workFunction: 2.9, orbitLevel: 4 } },
    { id: "emit", label: "放出あり", values: { frequency: 1.22, intensity: 1.1, workFunction: 2.3, orbitLevel: 5 } },
    { id: "spectral", label: "スペクトル重視", values: { frequency: 1.08, intensity: 0.7, workFunction: 2.0, orbitLevel: 6 } }
  ],
  quantum1d: [
    { id: "tunnel", label: "トンネル", values: { energy: 2.7, barrierHeight: 4.8, barrierWidth: 1.4, wellDepth: 5.6 } },
    { id: "thin", label: "薄い障壁", values: { energy: 2.4, barrierHeight: 4.6, barrierWidth: 0.8, wellDepth: 5.2 } },
    { id: "deep", label: "深い井戸", values: { energy: 1.8, barrierHeight: 5.0, barrierWidth: 1.7, wellDepth: 7.2 } }
  ],
  oscillator: [
    { id: "ground", label: "基底状態", values: { level: 0, stiffness: 1.2, mass: 1.0, stretch: 1.0 } },
    { id: "excited", label: "励起状態", values: { level: 2, stiffness: 1.3, mass: 1.0, stretch: 1.1 } },
    { id: "high", label: "高準位", values: { level: 4, stiffness: 1.6, mass: 0.9, stretch: 1.15 } }
  ],
  chaos: [
    { id: "periodic", label: "周期", values: { r: 3.18, seedA: 0.23, seedB: 0.231, iterations: 36 } },
    { id: "edge", label: "境界", values: { r: 3.56, seedA: 0.23, seedB: 0.231, iterations: 40 } },
    { id: "chaotic", label: "カオス", values: { r: 3.88, seedA: 0.232, seedB: 0.233, iterations: 48 } }
  ]
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / Math.max(edge1 - edge0, 0.0001), 0, 1);
  return t * t * (3 - 2 * t);
}

function seededUnit(seed) {
  const raw = Math.sin(seed * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
}

function histogram(values, bucketCount, maxValue) {
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    label: `${Math.round((maxValue / bucketCount) * index)}-${Math.round((maxValue / bucketCount) * (index + 1))}`,
    count: 0
  }));

  for (const value of values) {
    const index = clamp(Math.floor((value / Math.max(maxValue, 0.001)) * bucketCount), 0, bucketCount - 1);
    buckets[index].count += 1;
  }

  return buckets;
}

function logisticNext(r, x) {
  return r * x * (1 - x);
}

function hermitePolynomial(level, x) {
  if (level === 0) return 1;
  if (level === 1) return 2 * x;
  if (level === 2) return 4 * x * x - 2;
  if (level === 3) return 8 * x * x * x - 12 * x;
  if (level === 4) return 16 * x ** 4 - 48 * x * x + 12;
  return 32 * x ** 5 - 160 * x ** 3 + 120 * x;
}

function normalizeSamples(samples, key = "y") {
  const maxValue = Math.max(...samples.map((sample) => Math.abs(sample[key])), 0.001);
  return samples.map((sample) => ({ ...sample, [key]: sample[key] / maxValue }));
}

export function formatPhysicsNumber(value, digits = 2, fallback = "--") {
  const rounded = round(value, digits);
  return rounded === null ? fallback : rounded.toLocaleString("ja-JP", { maximumFractionDigits: digits });
}

export function getPhysicsCategory(categoryId) {
  return PHYSICS_HOME_CATEGORIES.find((category) => category.id === categoryId) || PHYSICS_HOME_CATEGORIES[0];
}

export function getScenesForCategory(categoryId) {
  return PHYSICS_SCENES.filter((scene) => scene.categoryId === categoryId);
}

export function getPhysicsScene(sceneId) {
  return PHYSICS_SCENES.find((scene) => scene.id === sceneId) || PHYSICS_SCENES[0];
}

export function getPhysicsOverlayState(sceneId, previousState = {}) {
  const scene = getPhysicsScene(sceneId);
  const nextState = {};

  for (const overlay of PHYSICS_OVERLAY_OPTIONS) {
    if (scene.overlays.includes(overlay.id)) {
      nextState[overlay.id] = previousState[overlay.id] ?? scene.defaultOverlays.includes(overlay.id);
    } else {
      nextState[overlay.id] = false;
    }
  }

  return nextState;
}

export function buildRigidModel({ mass, radius, slopeDeg, inertiaFactor, height }, sim = { time: 0 }) {
  const radians = (slopeDeg * Math.PI) / 180;
  const slopeLength = height / Math.max(Math.sin(radians), 0.18);
  const acceleration = (9.8 * Math.sin(radians)) / (1 + inertiaFactor);
  const travelTime = Math.sqrt((2 * slopeLength) / Math.max(acceleration, 0.01));
  const progress = clamp((sim.time % (travelTime * 1.2)) / Math.max(travelTime, 0.001), 0, 1);
  const easedProgress = smoothstep(0, 1, progress);
  const totalEnergy = mass * 9.8 * height;
  const terminalVelocity = Math.sqrt((2 * totalEnergy) / Math.max(mass * (1 + inertiaFactor), 0.2));
  const velocity = terminalVelocity * easedProgress;
  const translational = 0.5 * mass * velocity * velocity;
  const rotational = translational * inertiaFactor;
  const angularVelocity = velocity / Math.max(radius, 0.2);
  const angularMomentum = mass * radius * velocity * (1 + inertiaFactor);

  return {
    radians,
    slopeLength,
    progress,
    translational,
    rotational,
    velocity,
    angularVelocity,
    angularMomentum,
    terminalVelocity,
    totalEnergy,
    phaseAngle: sim.time * angularVelocity,
    metrics: {
      terminalVelocity,
      velocity,
      angularVelocity,
      angularMomentum,
      translationalShare: totalEnergy > 0 ? (translational / totalEnergy) * 100 : 0
    }
  };
}

export function buildFluidModel({ flowSpeed, viscosity, obstacleSize, density }, sim = { time: 0 }) {
  const streamLines = Array.from({ length: 7 }, (_, rowIndex) => {
    const yBase = 0.16 + rowIndex * 0.11;
    const points = Array.from({ length: 24 }, (_, pointIndex) => {
      const x = pointIndex / 23;
      const dx = x - 0.52;
      const dy = yBase - 0.5;
      const radial = Math.sqrt(dx * dx + dy * dy);
      const swirl = Math.sin(sim.time * 1.3 + x * 6 + rowIndex * 0.4) * 0.012 * flowSpeed;
      const deflection = radial < 0.28 + obstacleSize * 0.06
        ? -(dy / Math.max(radial, 0.08)) * (0.06 + obstacleSize * 0.04)
        : 0;
      return {
        x,
        y: clamp(yBase + deflection + swirl / (1.2 + viscosity), 0.08, 0.92)
      };
    });
    return { id: rowIndex, points };
  });

  const field = Array.from({ length: 12 }, (_, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const x = 0.18 + column * 0.18;
    const y = 0.22 + row * 0.18;
    const dx = x - 0.52;
    const dy = y - 0.5;
    const radial = Math.sqrt(dx * dx + dy * dy);
    const localSpeed = flowSpeed * (1.15 - Math.exp(-(radial * radial) * 14) * 0.58) / Math.max(0.65 + viscosity * 0.4, 0.35);
    const bend = radial < 0.32 ? -dy * 1.8 : 0;
    return {
      x,
      y,
      vx: 0.045 * localSpeed,
      vy: 0.018 * bend
    };
  });

  const heatCells = Array.from({ length: 36 }, (_, index) => {
    const column = index % 6;
    const row = Math.floor(index / 6);
    const x = column / 6;
    const y = row / 6;
    const dx = x + 0.08 - 0.52;
    const dy = y + 0.08 - 0.5;
    const radial = Math.sqrt(dx * dx + dy * dy);
    const pressure = clamp(density * flowSpeed * flowSpeed * Math.exp(-radial * 4.5) / (8 + viscosity * 2.5), 0, 1);
    return { index, intensity: pressure };
  });

  const reynolds = (flowSpeed * obstacleSize * 140) / Math.max(viscosity, 0.15);
  const pressureDrop = clamp((density * flowSpeed * flowSpeed * obstacleSize * (1 + viscosity * 0.2)) / 20, 0, 2.2);
  const wakeWidth = clamp(obstacleSize * (0.32 + flowSpeed * 0.08) / Math.max(viscosity, 0.3), 0.2, 1.6);

  return {
    streamLines,
    field,
    heatCells,
    metrics: {
      reynolds,
      pressureDrop,
      wakeWidth,
      viscosity
    }
  };
}

export function buildWaveModel({ amplitude, frequency, wavelength, refractiveIndex }, sim = { time: 0 }) {
  const reflection = clamp((((refractiveIndex - 1) / (refractiveIndex + 1)) ** 2) * 100, 0, 100);
  const transmission = 100 - reflection;
  const refractedWavelength = wavelength / Math.max(refractiveIndex, 0.4);
  const left = normalizeSamples(
    Array.from({ length: 48 }, (_, index) => {
      const x = -1 + (2 * index) / 47;
      const incident = amplitude * Math.sin((2 * Math.PI * x) / wavelength - sim.time * frequency * 2.4);
      const reflected = amplitude * (reflection / 100) * Math.sin((-2 * Math.PI * x) / wavelength - sim.time * frequency * 2.4);
      return { x, y: incident + reflected };
    })
  );
  const right = normalizeSamples(
    Array.from({ length: 48 }, (_, index) => {
      const x = (2 * index) / 47;
      const transmitted = amplitude * (transmission / 100) * Math.sin((2 * Math.PI * x) / refractedWavelength - sim.time * frequency * 2.4);
      return { x, y: transmitted };
    })
  );

  return {
    left,
    right,
    reflection,
    transmission,
    refractedWavelength,
    phaseVelocity: 1 / Math.max(refractiveIndex, 0.2),
    metrics: {
      reflection,
      transmission,
      refractedWavelength,
      phaseVelocity: 1 / Math.max(refractiveIndex, 0.2)
    }
  };
}

export function buildEntropyModel({ particleCount, temperature, opening, cooling }, sim = { time: 0 }) {
  const effectiveMix = clamp(1 - Math.exp(-(sim.time * (0.55 + opening) + opening * 2.6) / Math.max(1.4 - cooling * 0.4, 0.4)), 0, 1);
  const frozenRatio = clamp(((18 - temperature) / 18) * (0.35 + cooling * 0.65), 0, 0.92);
  const entropy = clamp(0.12 + effectiveMix * 0.72 + temperature / 150 - frozenRatio * 0.22, 0, 1);
  const mixedness = clamp(effectiveMix * (1 - frozenRatio * 0.4), 0, 1);
  const renderCount = Math.min(particleCount, 72);
  const cells = Array.from({ length: 20 }, () => 0);
  const particles = Array.from({ length: renderCount }, (_, index) => {
    const species = index < renderCount / 2 ? "a" : "b";
    const originSide = species === "a" ? 0.26 : 0.74;
    const targetSide = species === "a" ? 0.74 : 0.26;
    const x = clamp(
      originSide * (1 - mixedness) + targetSide * mixedness + (seededUnit(index + 14) - 0.5) * 0.34,
      0.1,
      0.9
    );
    const y = 0.12 + seededUnit(index + 73) * 0.76;
    const cellIndex = clamp(Math.floor(x * 5) + Math.floor(y * 4) * 5, 0, cells.length - 1);
    cells[cellIndex] += 1;
    return { x, y, species, frozen: frozenRatio > 0.5 && seededUnit(index + 115) < frozenRatio * 0.5 };
  });

  return {
    particles,
    cells,
    metrics: {
      entropy: entropy * 100,
      mixedness: mixedness * 100,
      frozenRatio: frozenRatio * 100
    }
  };
}

export function buildPhaseModel({ temperature, pressure, coupling }, sim = { time: 0 }) {
  const tempNorm = clamp(temperature / 100, 0, 1.2);
  const pressureNorm = clamp(pressure / 10, 0, 1.2);
  const meltBoundary = 0.18 + pressureNorm * 0.18 * coupling;
  const boilBoundary = 0.52 + pressureNorm * 0.22 - coupling * 0.05;
  const criticality = clamp(1 - Math.sqrt((tempNorm - 0.78) ** 2 + (pressureNorm - 0.74) ** 2) * 2.8, 0, 1);

  let phase = "solid";
  if (tempNorm >= meltBoundary && tempNorm < boilBoundary) phase = "liquid";
  if (tempNorm >= boilBoundary) phase = "gas";

  const orderParameter =
    phase === "solid"
      ? clamp(1 - tempNorm * 0.7, 0.45, 1)
      : phase === "liquid"
        ? clamp(0.62 - Math.abs(tempNorm - 0.48) * 0.5, 0.22, 0.68)
        : clamp(0.12 + criticality * 0.22, 0.08, 0.34);

  const cells = Array.from({ length: 40 }, (_, index) => {
    const column = index % 8;
    const row = Math.floor(index / 8);
    const cellTemp = (column / 7) * 1.1;
    const cellPressure = (4 - row) / 4;
    const cellMelt = 0.18 + cellPressure * 0.18 * coupling;
    const cellBoil = 0.52 + cellPressure * 0.22 - coupling * 0.05;
    const cellPhase = cellTemp < cellMelt ? "solid" : cellTemp < cellBoil ? "liquid" : "gas";
    return { index, phase: cellPhase };
  });

  return {
    phase,
    cells,
    point: { x: tempNorm, y: pressureNorm },
    orderParameter,
    metrics: {
      phase,
      orderParameter: orderParameter * 100,
      criticality: criticality * 100,
      latentIndex: clamp((1 - Math.abs(tempNorm - boilBoundary) * 3.4) * 100, 0, 100)
    }
  };
}

export function buildRelativityModel({ beta, eventX, eventT }) {
  const clampedBeta = clamp(beta, 0.02, 0.96);
  const gamma = 1 / Math.sqrt(1 - clampedBeta * clampedBeta);
  const xPrime = gamma * (eventX - clampedBeta * eventT);
  const tPrime = gamma * (eventT - clampedBeta * eventX);
  const contraction = 1 / gamma;

  return {
    beta: clampedBeta,
    gamma,
    xPrime,
    tPrime,
    contraction,
    metrics: {
      gamma,
      xPrime,
      tPrime,
      contraction: contraction * 100,
      simultaneityTilt: clampedBeta * 100
    }
  };
}

export function buildPreQuantumModel({ frequency, intensity, workFunction, orbitLevel }, sim = { time: 0 }) {
  const photonEnergy = 4.135 * frequency;
  const kineticEnergy = Math.max(photonEnergy - workFunction, 0);
  const electronCount = kineticEnergy > 0 ? intensity * 10 : 0;
  const transitionEnergy = 13.6 * Math.abs(1 / (2 * 2) - 1 / (orbitLevel * orbitLevel));
  const spectralWavelength = 1240 / Math.max(transitionEnergy, 0.1);
  const orbitRadius = orbitLevel * orbitLevel;
  const spectrum = [3, 4, 5, 6].map((level) => {
    const energy = 13.6 * Math.abs(1 / (2 * 2) - 1 / (level * level));
    return {
      level,
      wavelength: 1240 / Math.max(energy, 0.1),
      strength: clamp(1.1 - level * 0.12, 0.3, 0.9)
    };
  });

  return {
    photonEnergy,
    kineticEnergy,
    electronCount,
    orbitRadius,
    spectralWavelength,
    spectrum,
    phaseAngle: sim.time * 0.9,
    metrics: {
      photonEnergy,
      kineticEnergy,
      electronCount,
      spectralWavelength
    }
  };
}

export function buildQuantum1DModel({ energy, barrierHeight, barrierWidth, wellDepth }, sim = { time: 0 }) {
  const gap = Math.max(barrierHeight - energy, 0);
  const transmission =
    energy >= barrierHeight
      ? clamp(64 + (energy - barrierHeight) * 12 - barrierWidth * 8, 6, 96)
      : clamp(Math.exp(-1.38 * barrierWidth * Math.sqrt(gap + 0.2)) * 100, 2, 88);
  const reflection = 100 - transmission;
  const boundLevels = Math.max(1, Math.min(6, Math.floor(Math.sqrt(wellDepth) * 1.8)));
  const density = normalizeSamples(
    Array.from({ length: 72 }, (_, index) => {
      const x = -6 + (12 * index) / 71;
      const leftWave = Math.exp(-((x + 3.2 - sim.time * 0.2) ** 2) / 1.8) * (1 + 0.18 * Math.sin(x * 3.4));
      const barrierDamp = x > -barrierWidth / 2 && x < barrierWidth / 2 ? 1 - transmission / 100 : 1;
      const transmittedWave = Math.exp(-((x - 3.4) ** 2) / 1.5) * (transmission / 100);
      return { x, y: clamp(leftWave * barrierDamp + transmittedWave, 0, 1) };
    })
  );

  return {
    transmission,
    reflection,
    boundLevels,
    density,
    metrics: {
      transmission,
      reflection,
      boundLevels,
      gap
    }
  };
}

export function buildOscillatorModel({ level, stiffness, mass, stretch }) {
  const omega = Math.sqrt(stiffness / Math.max(mass, 0.2));
  const selectedLevel = Math.round(level);
  const levels = Array.from({ length: 5 }, (_, index) => ({
    index,
    energy: (index + 0.5) * omega
  }));
  const density = normalizeSamples(
    Array.from({ length: 72 }, (_, sampleIndex) => {
      const x = -3.8 + (7.6 * sampleIndex) / 71;
      const xi = x / Math.max(stretch, 0.4);
      const psi = hermitePolynomial(selectedLevel, xi) * Math.exp(-(xi * xi) / 2);
      return { x, y: psi * psi };
    })
  );
  const selectedEnergy = (selectedLevel + 0.5) * omega;
  const classicalAmplitude = Math.sqrt((2 * selectedEnergy) / Math.max(stiffness, 0.1));

  return {
    omega,
    levels,
    density,
    selectedLevel,
    selectedEnergy,
    classicalAmplitude,
    metrics: {
      omega,
      selectedEnergy,
      classicalAmplitude,
      nodeCount: selectedLevel
    }
  };
}

export function buildChaosModel({ r, seedA, seedB, iterations }) {
  const steps = Math.round(iterations);
  const sequenceA = [];
  const sequenceB = [];
  let currentA = clamp(seedA, 0.001, 0.999);
  let currentB = clamp(seedB, 0.001, 0.999);
  let lyapunovSum = 0;

  for (let index = 0; index < steps; index += 1) {
    currentA = logisticNext(r, currentA);
    currentB = logisticNext(r, currentB);
    sequenceA.push({ x: index, y: currentA });
    sequenceB.push({ x: index, y: currentB });
    lyapunovSum += Math.log(Math.abs(r * (1 - 2 * currentA)) + 0.0001);
  }

  const branching = [];
  for (let branchIndex = 0; branchIndex < 56; branchIndex += 1) {
    const localR = 2.7 + branchIndex * 0.023;
    let x = 0.31;
    for (let warmup = 0; warmup < 48; warmup += 1) {
      x = logisticNext(localR, x);
    }
    for (let keep = 0; keep < 10; keep += 1) {
      x = logisticNext(localR, x);
      branching.push({ x: localR, y: x });
    }
  }

  const finalGap = Math.abs(sequenceA[sequenceA.length - 1]?.y - sequenceB[sequenceB.length - 1]?.y || 0);
  const lyapunov = lyapunovSum / Math.max(steps, 1);

  return {
    sequenceA,
    sequenceB,
    branching,
    lyapunov,
    finalGap,
    metrics: {
      lyapunov,
      finalGap,
      regime: lyapunov > 0 ? "chaotic" : "periodic"
    }
  };
}

export function buildPhysicsSceneModel(sceneId, params, sim = { time: 0 }) {
  if (sceneId === "rigid") return buildRigidModel(params, sim);
  if (sceneId === "fluid") return buildFluidModel(params, sim);
  if (sceneId === "wave") return buildWaveModel(params, sim);
  if (sceneId === "entropy") return buildEntropyModel(params, sim);
  if (sceneId === "phase") return buildPhaseModel(params, sim);
  if (sceneId === "relativity") return buildRelativityModel(params, sim);
  if (sceneId === "prequantum") return buildPreQuantumModel(params, sim);
  if (sceneId === "quantum1d") return buildQuantum1DModel(params, sim);
  if (sceneId === "oscillator") return buildOscillatorModel(params, sim);
  return buildChaosModel(params, sim);
}

export function getPhysicsMissionResult(sceneId, model) {
  if (sceneId === "rigid") {
    return { label: "終端速度", target: "6.5 m/s 以上", passed: model.metrics.terminalVelocity >= 6.5 };
  }
  if (sceneId === "fluid") {
    return { label: "圧力損失", target: "0.6 未満", passed: model.metrics.pressureDrop < 0.6 };
  }
  if (sceneId === "wave") {
    return { label: "透過率", target: "85% 以上", passed: model.metrics.transmission >= 85 };
  }
  if (sceneId === "entropy") {
    return { label: "混合度", target: "80% 以上", passed: model.metrics.mixedness >= 80 };
  }
  if (sceneId === "phase") {
    return { label: "criticality", target: "70% 以上", passed: model.metrics.criticality >= 70 };
  }
  if (sceneId === "relativity") {
    return { label: "gamma", target: "1.7 以上", passed: model.metrics.gamma >= 1.7 };
  }
  if (sceneId === "prequantum") {
    return { label: "電子放出", target: "K > 1.5 eV", passed: model.metrics.kineticEnergy > 1.5 };
  }
  if (sceneId === "quantum1d") {
    return { label: "透過率調整", target: "25% - 45%", passed: model.metrics.transmission >= 25 && model.metrics.transmission <= 45 };
  }
  if (sceneId === "oscillator") {
    return { label: "高準位束縛", target: "n >= 3 かつ A < 2.8", passed: model.selectedLevel >= 3 && model.metrics.classicalAmplitude < 2.8 };
  }
  return { label: "カオス化", target: "lyapunov > 0", passed: model.metrics.lyapunov > 0 };
}
