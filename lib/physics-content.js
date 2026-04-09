export const PHYSICS_VIEW_MODES = [
  { id: "sandbox", label: "遊ぶ" },
  { id: "lab", label: "学ぶ" },
  { id: "atlas", label: "地図で見る" }
];

export const PHYSICS_LABS = [
  {
    id: "projectile",
    title: "放物運動",
    eyebrow: "Mechanics",
    summary: "角度、初速、重力、抵抗を動かしながら、軌道とエネルギーの変化をその場で見ます。",
    missionTitle: "月面で最も遠くへ飛ばす",
    missionBody: "重力と空気抵抗を下げ、角度と初速を探ると最長到達距離が見えてきます。",
    equations: ["x = v0 cos(theta) t", "y = v0 sin(theta) t - 0.5 g t^2", "E = K + U"],
    observations: [
      "同じ初速でも角度で滞空時間と射程が変わる",
      "抵抗を入れると軌道は左右対称でなくなる",
      "重力を変えると射程だけでなく頂点の高さも変わる"
    ]
  },
  {
    id: "spring",
    title: "バネ振動",
    eyebrow: "Oscillation",
    summary: "質量、バネ定数、振幅、減衰を調整して、位置とエネルギーの行き来を観察します。",
    missionTitle: "周期をゆっくりにする",
    missionBody: "重い質量と柔らかいバネを選ぶと、振動はゆっくり長く続きます。",
    equations: ["omega = sqrt(k / m)", "x(t) = A exp(-gamma t) cos(omega t)", "E = 0.5 k x^2 + 0.5 m v^2"],
    observations: [
      "質量を増やすと周期が長くなる",
      "減衰を上げると振幅だけが先に削れていく",
      "位置エネルギーと運動エネルギーが交互に主役になる"
    ]
  },
  {
    id: "field",
    title: "電場と電荷",
    eyebrow: "Electromagnetism",
    summary: "2つの電荷と観測点を動かし、電場ベクトルと電位がどこで強くなるかを可視化します。",
    missionTitle: "引力と斥力の境目を探す",
    missionBody: "電荷の大きさと観測点をずらすと、電場が弱まる帯と鋭く曲がる帯が見えます。",
    equations: ["E = k q / r^2", "V = k q / r", "F = q E"],
    observations: [
      "同符号同士は中間で打ち消しやすい",
      "異符号にするとベクトルは橋のように流れる",
      "電位は距離だけでなく符号の組み合わせでも反転する"
    ]
  },
  {
    id: "optics",
    title: "幾何光学",
    eyebrow: "Optics",
    summary: "焦点距離と物体距離を動かし、像の位置、向き、倍率をレンズ図で追いかけます。",
    missionTitle: "実像と虚像の境界を越える",
    missionBody: "物体を焦点の内外で動かすと、像の向きと出る側が切り替わります。",
    equations: ["1 / f = 1 / do + 1 / di", "m = -di / do", "image height = m x object height"],
    observations: [
      "焦点より外に置くと実像ができる",
      "焦点の内側では像は虚像になってこちら側へ返る",
      "物体距離を焦点へ近づけると倍率が急激に増える"
    ]
  }
];

export const PHYSICS_PRESETS = {
  projectile: [
    { id: "earth", label: "地球の定番", values: { speed: 28, angleDeg: 46, gravity: 9.8, drag: 0.05, launchHeight: 1.2 } },
    { id: "moon", label: "月面遠投", values: { speed: 24, angleDeg: 42, gravity: 1.62, drag: 0.0, launchHeight: 1.4 } },
    { id: "jupiter", label: "木星で低空", values: { speed: 34, angleDeg: 55, gravity: 24.79, drag: 0.08, launchHeight: 1.0 } }
  ],
  spring: [
    { id: "soft", label: "柔らかバネ", values: { mass: 1.6, springConstant: 5.2, amplitude: 1.8, damping: 0.08 } },
    { id: "sharp", label: "鋭い振動", values: { mass: 0.8, springConstant: 16, amplitude: 1.1, damping: 0.03 } },
    { id: "heavy", label: "重くて遅い", values: { mass: 2.4, springConstant: 7.2, amplitude: 1.4, damping: 0.14 } }
  ],
  field: [
    { id: "dipole", label: "双極子", values: { chargeA: 4, chargeB: -4, distance: 6, probeX: 0, probeY: 2 } },
    { id: "repel", label: "同符号", values: { chargeA: 3, chargeB: 5, distance: 5, probeX: 0, probeY: 2.5 } },
    { id: "asymmetry", label: "非対称", values: { chargeA: 6, chargeB: -2, distance: 7, probeX: 1.2, probeY: 1.5 } }
  ],
  optics: [
    { id: "camera", label: "カメラ距離", values: { focalLength: 3.2, objectDistance: 8, objectHeight: 2.4 } },
    { id: "magnifier", label: "虫めがね", values: { focalLength: 4.2, objectDistance: 2.6, objectHeight: 2.2 } },
    { id: "projector", label: "投影", values: { focalLength: 2.4, objectDistance: 4.4, objectHeight: 1.6 } }
  ]
};

export const PHYSICS_ATLAS = [
  {
    id: "mechanics",
    title: "力学",
    summary: "運動、力、エネルギー、振動。古典物理の手触りが一番よく出る領域です。",
    labs: ["projectile", "spring"],
    next: ["波動", "数値計算", "解析力学"]
  },
  {
    id: "electromagnetism",
    title: "電磁気",
    summary: "電場、電位、回路、磁場の入口。見えない場を可視化すると急に理解しやすくなります。",
    labs: ["field", "optics"],
    next: ["回路", "磁場", "電磁波"]
  },
  {
    id: "waves-and-optics",
    title: "波動・光学",
    summary: "振動から波へ、そしてレンズや干渉へ。見える図にすると式の役割がはっきりします。",
    labs: ["spring", "optics"],
    next: ["干渉", "回折", "フーリエ解析"]
  },
  {
    id: "modern-bridge",
    title: "現代物理への橋",
    summary: "古典の視覚化を土台にして、相対論・量子・物性への入口をつくる層です。",
    labs: ["projectile", "field", "optics"],
    next: ["特殊相対論", "量子井戸", "バンド理論"]
  }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function safeRound(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function magnitude(x, y) {
  return Math.sqrt(x * x + y * y);
}

export function formatPhysicsNumber(value, digits = 2, fallback = "--") {
  const rounded = safeRound(value, digits);
  return rounded === null ? fallback : rounded.toLocaleString("ja-JP", { maximumFractionDigits: digits });
}

export function buildProjectileModel({ speed, angleDeg, gravity, drag, launchHeight }) {
  const radians = (angleDeg * Math.PI) / 180;
  let vx = Math.max(0.1, speed) * Math.cos(radians);
  let vy = Math.max(0.1, speed) * Math.sin(radians);
  let x = 0;
  let y = Math.max(0, launchHeight);
  let time = 0;
  const dt = 0.03;
  const points = [{ x, y, time, vx, vy }];
  let apex = { x, y, time };

  for (let step = 0; step < 480; step += 1) {
    const ax = -drag * vx;
    const ay = -gravity - drag * vy;
    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
    time += dt;

    if (y > apex.y) {
      apex = { x, y, time };
    }

    points.push({ x, y, time, vx, vy });
    if (step > 4 && y <= 0) break;
  }

  const secondLast = points[points.length - 2];
  const last = points[points.length - 1];
  if (last && secondLast && last.y < 0) {
    const ratio = secondLast.y / (secondLast.y - last.y || 1);
    const groundX = secondLast.x + (last.x - secondLast.x) * ratio;
    const groundTime = secondLast.time + (last.time - secondLast.time) * ratio;
    points[points.length - 1] = { ...last, x: groundX, y: 0, time: groundTime };
  }

  const landing = points[points.length - 1] || { x: 0, y: 0, time: 0, vx: 0, vy: 0 };
  const maxX = Math.max(12, ...points.map((point) => point.x));
  const maxY = Math.max(4, ...points.map((point) => point.y));
  const initialEnergy = 0.5 * speed * speed + gravity * launchHeight;
  const currentSpeed = magnitude(landing.vx || 0, landing.vy || 0);
  const finalEnergy = 0.5 * currentSpeed * currentSpeed;

  return {
    points,
    apex,
    landing,
    maxX,
    maxY,
    metrics: {
      range: landing.x,
      flightTime: landing.time,
      apexHeight: apex.y,
      impactSpeed: currentSpeed,
      energyRetention: initialEnergy > 0 ? (finalEnergy / initialEnergy) * 100 : 0
    }
  };
}

export function buildSpringModel({ mass, springConstant, amplitude, damping }) {
  const omega0 = Math.sqrt(Math.max(springConstant / mass, 0.01));
  const gamma = clamp(damping, 0, 0.9);
  const omegaD = Math.sqrt(Math.max(omega0 * omega0 - gamma * gamma, 0.01));
  const totalTime = Math.max(8, (Math.PI * 6) / omegaD);
  const points = [];

  for (let step = 0; step <= 240; step += 1) {
    const time = (totalTime * step) / 240;
    const displacement = amplitude * Math.exp(-gamma * time) * Math.cos(omegaD * time);
    const velocity =
      amplitude *
      Math.exp(-gamma * time) *
      (-gamma * Math.cos(omegaD * time) - omegaD * Math.sin(omegaD * time));
    const potential = 0.5 * springConstant * displacement * displacement;
    const kinetic = 0.5 * mass * velocity * velocity;

    points.push({
      time,
      displacement,
      velocity,
      potential,
      kinetic,
      total: potential + kinetic
    });
  }

  const current = points[Math.floor(points.length * 0.28)] || points[0];
  const maxDisplacement = Math.max(amplitude, ...points.map((point) => Math.abs(point.displacement)));
  const maxEnergy = Math.max(...points.map((point) => point.total));

  return {
    points,
    current,
    maxDisplacement,
    maxEnergy,
    metrics: {
      period: (2 * Math.PI) / omegaD,
      angularFrequency: omegaD,
      damping,
      totalEnergy: current.total
    }
  };
}

export function buildFieldModel({ chargeA, chargeB, distance, probeX, probeY }) {
  const charges = [
    { id: "a", x: -distance / 2, y: 0, q: chargeA },
    { id: "b", x: distance / 2, y: 0, q: chargeB }
  ];

  const fieldAt = (x, y) => {
    let ex = 0;
    let ey = 0;
    let potential = 0;

    for (const charge of charges) {
      const dx = x - charge.x;
      const dy = y - charge.y;
      const r2 = Math.max(dx * dx + dy * dy, 0.2);
      const r = Math.sqrt(r2);
      const factor = charge.q / (r2 * r);
      ex += factor * dx;
      ey += factor * dy;
      potential += charge.q / r;
    }

    return { ex, ey, potential };
  };

  const arrows = [];
  for (let gridY = -3; gridY <= 3; gridY += 1) {
    for (let gridX = -5; gridX <= 5; gridX += 1) {
      const x = gridX * 1.15;
      const y = gridY * 0.95;
      const { ex, ey } = fieldAt(x, y);
      const strength = magnitude(ex, ey);
      const scale = clamp(strength * 0.45, 0.15, 0.95);
      const angle = Math.atan2(ey, ex);
      arrows.push({
        x,
        y,
        dx: Math.cos(angle) * scale,
        dy: Math.sin(angle) * scale,
        strength
      });
    }
  }

  const probe = { x: probeX, y: probeY, ...fieldAt(probeX, probeY) };

  return {
    charges,
    arrows,
    probe,
    metrics: {
      fieldStrength: magnitude(probe.ex, probe.ey),
      potential: probe.potential,
      balance: chargeA + chargeB
    }
  };
}

export function buildOpticsModel({ focalLength, objectDistance, objectHeight }) {
  const difference = (1 / focalLength) - (1 / objectDistance);
  const imageDistance = Math.abs(difference) < 0.0001 ? null : 1 / difference;
  const magnification = imageDistance === null ? null : -imageDistance / objectDistance;
  const imageHeight = magnification === null ? null : objectHeight * magnification;
  const isVirtual = imageDistance !== null && imageDistance < 0;

  return {
    imageDistance,
    imageHeight,
    magnification,
    isVirtual,
    metrics: {
      focus: focalLength,
      imageDistance,
      magnification,
      imageHeight
    }
  };
}

export function getPhysicsLab(labId) {
  return PHYSICS_LABS.find((lab) => lab.id === labId) || PHYSICS_LABS[0];
}
