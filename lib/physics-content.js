export const PHYSICS_VIEW_MODES = [
  {
    id: "playground",
    label: "実験する",
    title: "Playground",
    body: "まず世界を触り、速度や質量や温度を変える。現象の手触りを先に掴む入口です。"
  },
  {
    id: "law",
    label: "法則で見る",
    title: "Law View",
    body: "同じ現象の上に、エネルギー、運動量、世界線、確率密度などの見方を重ねます。"
  },
  {
    id: "shift",
    label: "見方をずらす",
    title: "World Shift",
    body: "同じ出来事を、古典、統計、相対論、量子へと見直し、理論で世界の見え方が変わることを体感します。"
  }
];

export const PHYSICS_MODULES = [
  {
    id: "motion",
    chapter: "Motion",
    title: "仕事とエネルギー",
    status: "P0",
    summary: "斜面を滑る球を使って、位置エネルギーが運動エネルギーへ移り、摩擦が熱へ逃がす流れを見ます。",
    missionTitle: "最速で滑り下ろす条件を探す",
    missionBody: "摩擦を抑え、斜面角と高さを調整して、到達速度を 12 m/s 以上にします。",
    lawNotes: ["位置エネルギー", "運動エネルギー", "摩擦損失", "速度ベクトル"],
    overlays: ["vectors", "energy", "trajectory", "graph"],
    worldShift: {
      from: "見えているのは 1 つの球の運動",
      to: "保存量を見ると、運動の説明は力からエネルギーへ移る"
    }
  },
  {
    id: "collision",
    chapter: "Motion",
    title: "運動量保存",
    status: "P0",
    summary: "2 物体衝突で、弾性 / 非弾性を切り替えつつ、運動量保存とエネルギー損失を同じ画面で見ます。",
    missionTitle: "衝突後に青ブロックを止める",
    missionBody: "質量比と反発係数を調整し、青ブロックの衝突後速度を 0 に近づけます。",
    lawNotes: ["全運動量", "反発係数", "重心系", "エネルギー損失"],
    overlays: ["vectors", "momentum", "energy", "graph"],
    worldShift: {
      from: "見えているのは 2 つの塊の衝突",
      to: "保存則を見ると、見た目が変わっても残る量があると分かる"
    }
  },
  {
    id: "rotation",
    chapter: "Rotation",
    title: "剛体",
    status: "P0",
    summary: "同じ斜面でも、円盤と輪では回転エネルギーの取り分が変わる。形が運動を変える章です。",
    missionTitle: "一番早い形を見つける",
    missionBody: "慣性モーメントを切り替えて、どの形が最も速く下るか比べます。",
    lawNotes: ["並進エネルギー", "回転エネルギー", "慣性モーメント", "角速度"],
    overlays: ["vectors", "energy", "momentum", "graph"],
    worldShift: {
      from: "質点では同じだったはずの運動",
      to: "形と質量分布が入ると、世界は回転の自由度を持つ"
    }
  },
  {
    id: "gas",
    chapter: "Many",
    title: "理想気体",
    status: "P1",
    summary: "箱の中の多数粒子から、圧力や温度や速度分布が立ち上がる様子を見ます。",
    missionTitle: "温度を上げて圧力を増やす",
    missionBody: "粒子数と温度を上げて、壁への衝突頻度を増やし圧力を 1.2 以上にします。",
    lawNotes: ["温度", "圧力", "速度分布", "粒子数"],
    overlays: ["vectors", "energy", "histogram", "graph"],
    worldShift: {
      from: "1 個の粒子ではなく、たくさんの粒子",
      to: "マクロ量は多数のミクロな衝突の統計として立ち上がる"
    }
  },
  {
    id: "relativity",
    chapter: "Relativity",
    title: "特殊相対論とミンコフスキー時空",
    status: "P2",
    summary: "列車と光時計を使って、同時性のずれ、時間の遅れ、世界線をひとつの画面で見ます。",
    missionTitle: "gamma を 1.5 以上にする",
    missionBody: "列車速度を上げて、地上系と列車系で時間の進み方がどこまでずれるか確かめます。",
    lawNotes: ["ローレンツ因子", "固有時間", "同時性", "世界線"],
    overlays: ["vectors", "spacetime", "graph"],
    worldShift: {
      from: "地上から見た 1 つの出来事",
      to: "観測者を変えると、同じ出来事の時間と距離の意味が変わる"
    }
  },
  {
    id: "quantum",
    chapter: "Quantum",
    title: "1D量子",
    status: "P2",
    summary: "波束とポテンシャル障壁を使って、反射、透過、確率密度を古典の直感と並べます。",
    missionTitle: "透過率を 30% 付近へ合わせる",
    missionBody: "障壁の高さと幅、粒子エネルギーを変え、透過率を 30% 前後に調整します。",
    lawNotes: ["確率密度", "ポテンシャル障壁", "透過率", "波束"],
    overlays: ["wave", "graph"],
    worldShift: {
      from: "粒子の軌跡で見ていた世界",
      to: "量子では軌跡より状態と確率密度が主役になる"
    }
  }
];

export const PHYSICS_OVERLAY_OPTIONS = [
  { id: "vectors", label: "ベクトル", hint: "速度や力の向きを重ねる" },
  { id: "energy", label: "エネルギー", hint: "運動・位置・損失を分解する" },
  { id: "momentum", label: "運動量", hint: "前後の保存量を比較する" },
  { id: "trajectory", label: "軌跡", hint: "移動の跡を残す" },
  { id: "graph", label: "グラフ", hint: "x-t / v-t / E-t などを見る" },
  { id: "histogram", label: "ヒストグラム", hint: "速度分布をまとめる" },
  { id: "spacetime", label: "世界線", hint: "時空図で事象を見る" },
  { id: "wave", label: "波動関数", hint: "確率密度を重ねる" }
];

export const PHYSICS_PRESETS = {
  motion: [
    { id: "smooth", label: "摩擦なし", values: { mass: 1.2, height: 5.2, slopeDeg: 34, friction: 0.02, kick: 0.4 } },
    { id: "steep", label: "急斜面", values: { mass: 1.2, height: 4.4, slopeDeg: 52, friction: 0.08, kick: 0.2 } },
    { id: "rough", label: "ざらつく面", values: { mass: 1.2, height: 5.6, slopeDeg: 30, friction: 0.22, kick: 0.3 } }
  ],
  collision: [
    { id: "elastic", label: "弾性衝突", values: { massA: 1.2, massB: 1.2, velocityA: 5.2, velocityB: -1.2, restitution: 1 } },
    { id: "sticky", label: "かなり非弾性", values: { massA: 1.4, massB: 1.8, velocityA: 4.6, velocityB: -0.6, restitution: 0.2 } },
    { id: "target-stop", label: "停止を狙う", values: { massA: 1.8, massB: 1.2, velocityA: 3.2, velocityB: -2.0, restitution: 1 } }
  ],
  rotation: [
    { id: "disc", label: "円盤", values: { mass: 1.4, radius: 0.6, height: 4.6, slopeDeg: 26, inertiaFactor: 0.5 } },
    { id: "hoop", label: "輪", values: { mass: 1.4, radius: 0.6, height: 4.6, slopeDeg: 26, inertiaFactor: 1 } },
    { id: "sphere", label: "球に近い", values: { mass: 1.4, radius: 0.55, height: 4.0, slopeDeg: 24, inertiaFactor: 0.4 } }
  ],
  gas: [
    { id: "cool", label: "低温", values: { particleCount: 40, temperature: 32, volume: 1.2 } },
    { id: "dense", label: "高密度", values: { particleCount: 70, temperature: 42, volume: 0.8 } },
    { id: "hot", label: "高温", values: { particleCount: 52, temperature: 78, volume: 1 } }
  ],
  relativity: [
    { id: "slow", label: "低速列車", values: { beta: 0.2, properLength: 7, eventGap: 3 } },
    { id: "fast", label: "高速列車", values: { beta: 0.72, properLength: 7, eventGap: 3 } },
    { id: "extreme", label: "極端ケース", values: { beta: 0.86, properLength: 8, eventGap: 4 } }
  ],
  quantum: [
    { id: "tunnel", label: "トンネル", values: { energy: 2.2, barrierHeight: 4.6, barrierWidth: 1.4, packetWidth: 1.1 } },
    { id: "almost-classical", label: "高エネルギー", values: { energy: 5.6, barrierHeight: 4.8, barrierWidth: 1.1, packetWidth: 0.9 } },
    { id: "tight", label: "広い障壁", values: { energy: 2.0, barrierHeight: 5.0, barrierWidth: 2.0, packetWidth: 1.3 } }
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

function magnitude(x, y) {
  return Math.sqrt(x * x + y * y);
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
    const index = clamp(Math.floor((value / maxValue) * bucketCount), 0, bucketCount - 1);
    buckets[index].count += 1;
  }

  return buckets;
}

export function formatPhysicsNumber(value, digits = 2, fallback = "--") {
  const rounded = round(value, digits);
  return rounded === null ? fallback : rounded.toLocaleString("ja-JP", { maximumFractionDigits: digits });
}

export function getPhysicsModule(moduleId) {
  return PHYSICS_MODULES.find((module) => module.id === moduleId) || PHYSICS_MODULES[0];
}

export function getPhysicsOverlayState(moduleId, previousState = {}) {
  const module = getPhysicsModule(moduleId);
  const nextState = {};

  for (const overlay of PHYSICS_OVERLAY_OPTIONS) {
    if (module.overlays.includes(overlay.id)) {
      nextState[overlay.id] = previousState[overlay.id] ?? ["energy", "vectors"].includes(overlay.id);
    } else {
      nextState[overlay.id] = false;
    }
  }

  if (moduleId === "collision" && previousState.momentum === undefined) nextState.momentum = true;
  if (moduleId === "motion" && previousState.trajectory === undefined) nextState.trajectory = true;
  if (moduleId === "gas" && previousState.histogram === undefined) nextState.histogram = true;
  if (moduleId === "relativity" && previousState.spacetime === undefined) nextState.spacetime = true;
  if (moduleId === "quantum" && previousState.wave === undefined) nextState.wave = true;

  return nextState;
}

export function buildMotionModel({ mass, height, slopeDeg, friction, kick }) {
  const radians = (slopeDeg * Math.PI) / 180;
  const slopeLength = height / Math.max(Math.sin(radians), 0.18);
  const potential = mass * 9.8 * height;
  const springEnergy = 0.5 * 40 * kick * kick;
  const frictionLoss = clamp(friction * mass * 9.8 * Math.cos(radians) * slopeLength, 0, potential + springEnergy);
  const kinetic = Math.max(potential + springEnergy - frictionLoss, 0);
  const velocity = Math.sqrt((2 * kinetic) / Math.max(mass, 0.2));
  const acceleration = Math.max(9.8 * (Math.sin(radians) - friction * Math.cos(radians)), 0);
  const travelTime = acceleration > 0 ? Math.sqrt((2 * slopeLength) / acceleration) : null;
  const momentum = mass * velocity;
  const trajectory = [
    { x: 0.6, y: 0.8 },
    { x: 3.1, y: 0.8 + Math.tan(radians) * 1.8 },
    { x: 5.2, y: 0.8 + Math.tan(radians) * 3.7 }
  ];

  return {
    slopeLength,
    angleRad: radians,
    potential,
    springEnergy,
    frictionLoss,
    kinetic,
    velocity,
    acceleration,
    travelTime,
    momentum,
    heat: frictionLoss,
    trajectory,
    metrics: {
      velocity,
      momentum,
      travelTime,
      totalEnergy: potential + springEnergy,
      efficiency: potential + springEnergy > 0 ? (kinetic / (potential + springEnergy)) * 100 : 0
    }
  };
}

export function buildCollisionModel({ massA, massB, velocityA, velocityB, restitution }) {
  const totalMass = massA + massB;
  const nextVelocityA =
    (massA * velocityA + massB * velocityB - massB * restitution * (velocityA - velocityB)) / totalMass;
  const nextVelocityB =
    (massA * velocityA + massB * velocityB + massA * restitution * (velocityA - velocityB)) / totalMass;

  const beforeMomentum = massA * velocityA + massB * velocityB;
  const afterMomentum = massA * nextVelocityA + massB * nextVelocityB;
  const beforeEnergy = 0.5 * massA * velocityA * velocityA + 0.5 * massB * velocityB * velocityB;
  const afterEnergy = 0.5 * massA * nextVelocityA * nextVelocityA + 0.5 * massB * nextVelocityB * nextVelocityB;
  const centerVelocity = beforeMomentum / totalMass;

  return {
    nextVelocityA,
    nextVelocityB,
    beforeMomentum,
    afterMomentum,
    beforeEnergy,
    afterEnergy,
    lostEnergy: Math.max(beforeEnergy - afterEnergy, 0),
    centerVelocity,
    metrics: {
      beforeMomentum,
      afterMomentum,
      beforeEnergy,
      afterEnergy,
      centerVelocity
    }
  };
}

export function buildRotationModel({ mass, radius, height, slopeDeg, inertiaFactor }) {
  const radians = (slopeDeg * Math.PI) / 180;
  const totalEnergy = mass * 9.8 * height;
  const translational = totalEnergy / (1 + inertiaFactor);
  const rotational = totalEnergy - translational;
  const velocity = Math.sqrt((2 * translational) / Math.max(mass, 0.2));
  const angularVelocity = velocity / Math.max(radius, 0.2);
  const angularMomentum = mass * radius * velocity * (1 + inertiaFactor);
  const slopeLength = height / Math.max(Math.sin(radians), 0.18);
  const acceleration = 9.8 * Math.sin(radians) / (1 + inertiaFactor);
  const travelTime = Math.sqrt((2 * slopeLength) / Math.max(acceleration, 0.01));

  return {
    translational,
    rotational,
    velocity,
    angularVelocity,
    angularMomentum,
    travelTime,
    metrics: {
      velocity,
      angularVelocity,
      angularMomentum,
      translationalShare: totalEnergy > 0 ? (translational / totalEnergy) * 100 : 0
    }
  };
}

export function buildGasModel({ particleCount, temperature, volume }) {
  const renderCount = Math.min(particleCount, 72);
  const positions = [];
  const speeds = [];

  for (let index = 0; index < renderCount; index += 1) {
    const x = 0.08 + seededUnit(index + 1) * 0.84;
    const y = 0.1 + seededUnit(index + 31) * 0.8;
    const speed = 0.5 + Math.sqrt(temperature / 12) * (0.7 + seededUnit(index + 83) * 1.8);
    const angle = seededUnit(index + 121) * Math.PI * 2;
    positions.push({
      x,
      y,
      speed,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed
    });
    speeds.push(speed);
  }

  const averageSpeed = speeds.reduce((sum, value) => sum + value, 0) / Math.max(speeds.length, 1);
  const pressure = (particleCount * temperature) / Math.max(volume * 3200, 1);

  return {
    particles: positions,
    histogram: histogram(speeds, 7, Math.max(...speeds, 1)),
    averageSpeed,
    pressure,
    metrics: {
      pressure,
      averageSpeed,
      density: particleCount / volume
    }
  };
}

export function buildRelativityModel({ beta, properLength, eventGap }) {
  const clampedBeta = clamp(beta, 0.02, 0.96);
  const gamma = 1 / Math.sqrt(1 - clampedBeta * clampedBeta);
  const contractedLength = properLength / gamma;
  const backEventTrainTime = gamma * clampedBeta * eventGap * 0.5;
  const frontEventTrainTime = -gamma * clampedBeta * eventGap * 0.5;

  return {
    beta: clampedBeta,
    gamma,
    contractedLength,
    backEventTrainTime,
    frontEventTrainTime,
    metrics: {
      gamma,
      contractedLength,
      timeDilation: gamma,
      simultaneityGap: Math.abs(backEventTrainTime - frontEventTrainTime)
    }
  };
}

export function buildQuantumModel({ energy, barrierHeight, barrierWidth, packetWidth }) {
  const gap = Math.max(barrierHeight - energy, 0);
  const transmission =
    energy >= barrierHeight
      ? clamp(68 + (energy - barrierHeight) * 8 - barrierWidth * 6, 8, 96)
      : clamp(Math.exp(-1.35 * barrierWidth * Math.sqrt(gap + 0.2)) * 100, 2, 88);
  const reflection = 100 - transmission;
  const density = Array.from({ length: 64 }, (_, index) => {
    const x = -6 + (12 * index) / 63;
    const leftWave = Math.exp(-((x + 3.3) ** 2) / Math.max(packetWidth * 3.1, 0.8));
    const barrierDamp = x > -barrierWidth / 2 && x < barrierWidth / 2 ? 1 - transmission / 100 : 1;
    const transmittedWave = Math.exp(-((x - 3.4) ** 2) / Math.max(packetWidth * 2.4, 0.7)) * (transmission / 100);
    const amplitude = clamp(leftWave * barrierDamp + transmittedWave, 0, 1);
    return { x, amplitude };
  });

  return {
    transmission,
    reflection,
    density,
    metrics: {
      transmission,
      reflection,
      tunnelingGap: gap
    }
  };
}

export function getPhysicsMissionResult(moduleId, model) {
  if (moduleId === "motion") {
    return {
      label: "到達速度",
      target: "12 m/s 以上",
      passed: model.metrics.velocity >= 12
    };
  }
  if (moduleId === "collision") {
    return {
      label: "青ブロック停止",
      target: "|v2'| < 0.2",
      passed: Math.abs(model.nextVelocityB) < 0.2
    };
  }
  if (moduleId === "rotation") {
    return {
      label: "最速の形",
      target: "v > 6.8 m/s",
      passed: model.metrics.velocity > 6.8
    };
  }
  if (moduleId === "gas") {
    return {
      label: "圧力上昇",
      target: "P > 1.2",
      passed: model.metrics.pressure > 1.2
    };
  }
  if (moduleId === "relativity") {
    return {
      label: "ローレンツ因子",
      target: "gamma > 1.5",
      passed: model.metrics.gamma > 1.5
    };
  }
  return {
    label: "透過率調整",
    target: "20% - 40%",
    passed: model.metrics.transmission >= 20 && model.metrics.transmission <= 40
  };
}
