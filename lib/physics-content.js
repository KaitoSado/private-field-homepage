export const PHYSICS_VIEW_MODES = [
  {
    id: "sandbox",
    label: "自由に触る",
    title: "Sandbox",
    body: "まず scene を動かし、パラメータを崩して、現象の手触りを掴む入口です。"
  },
  {
    id: "guided",
    label: "導線で学ぶ",
    title: "Guided Lab",
    body: "観察ポイントと軽い課題を付けて、何に注目すればよいかを絞ります。"
  },
  {
    id: "math",
    label: "式とつなぐ",
    title: "Math Link",
    body: "同じ画面の上で、数式と現象を対応づけて読みます。"
  },
  {
    id: "theory",
    label: "地図で見る",
    title: "Theory Map",
    body: "各実験がどの理論へ伸びるかを、単元の地図としてつなぎます。"
  }
];

export const PHYSICS_HOME_CATEGORIES = [
  {
    id: "motion",
    label: "動く",
    title: "Motion",
    body: "放物運動と単振動から、力学の基本的な時間発展を触ります。"
  },
  {
    id: "impact",
    label: "ぶつかる",
    title: "Collision",
    body: "衝突前後を並べて、運動量とエネルギーの出入りを比較します。"
  },
  {
    id: "thermal",
    label: "あたたまる",
    title: "Thermal",
    body: "多数粒子から、温度、圧力、分布がどう立ち上がるかを見ます。"
  },
  {
    id: "wave",
    label: "伝わる",
    title: "Wave",
    body: "境界での反射と屈折を通じて、波としての世界の見え方を掴みます。"
  },
  {
    id: "spacetime",
    label: "歪む",
    title: "Space-Time",
    body: "ローレンツ変換で、出来事の座標が観測者ごとに変わる感覚をつかみます。"
  },
  {
    id: "quantum",
    label: "量子になる",
    title: "Quantum",
    body: "古典の直感が破れる場所から、1D量子井戸の状態へ橋を架けます。"
  }
];

export const PHYSICS_OVERLAY_OPTIONS = [
  { id: "vectors", label: "ベクトル", hint: "速度や力の向きを重ねる" },
  { id: "energy", label: "エネルギー", hint: "保存量の出入りを見る" },
  { id: "momentum", label: "運動量", hint: "衝突前後の比較を出す" },
  { id: "trajectory", label: "軌跡", hint: "位置の履歴を残す" },
  { id: "histogram", label: "ヒストグラム", hint: "分布をまとめて見る" },
  { id: "wave", label: "波面", hint: "波の伝わり方を重ねる" },
  { id: "spacetime", label: "時空図", hint: "世界線と同時線を表示する" },
  { id: "probability", label: "確率密度", hint: "量子状態の濃淡を見る" },
  { id: "phase", label: "位相", hint: "振動や phase portrait を見る" },
  { id: "graph", label: "グラフ", hint: "下部ログと系列を開く" }
];

function projectileFormulaList() {
  return [
    {
      id: "trajectory",
      label: "軌道",
      expression: "y(t) = v0 sin(theta)t - 0.5 g t^2",
      meaning: "高さは、初速の上向き成分と重力による落下の差で決まります。",
      recommendedOverlays: ["trajectory", "vectors", "graph"],
      getQuantities: (model, params) => [
        { label: "v0", value: `${formatPhysicsNumber(params.speed, 1)} m/s` },
        { label: "theta", value: `${formatPhysicsNumber(params.angleDeg, 0)} deg` },
        { label: "g", value: `${formatPhysicsNumber(params.gravity, 1)} m/s^2` },
        { label: "peak", value: `${formatPhysicsNumber(model.metrics.peakHeight, 2)} m` }
      ]
    },
    {
      id: "range",
      label: "到達距離",
      expression: "R approx v0^2 sin(2theta) / g",
      meaning: "空気抵抗を弱く見れば、到達距離は初速の二乗と角度で大まかに決まります。",
      recommendedOverlays: ["trajectory", "graph"],
      getQuantities: (model) => [
        { label: "range", value: `${formatPhysicsNumber(model.metrics.range, 2)} m` },
        { label: "flight", value: `${formatPhysicsNumber(model.metrics.timeOfFlight, 2)} s` }
      ]
    },
    {
      id: "energy",
      label: "力学的エネルギー",
      expression: "E = 0.5 m v^2 + m g h",
      meaning: "位置と速度が変わっても、損失を除けば同じ量を別の形で持っています。",
      recommendedOverlays: ["energy", "graph"],
      getQuantities: (model, params) => [
        { label: "m", value: `${formatPhysicsNumber(params.mass, 1)} kg` },
        { label: "K", value: `${formatPhysicsNumber(model.kinetic, 2)} J` },
        { label: "U", value: `${formatPhysicsNumber(model.potential, 2)} J` }
      ]
    }
  ];
}

function collisionFormulaList() {
  return [
    {
      id: "momentum",
      label: "運動量保存",
      expression: "m1 v1 + m2 v2 = m1 v1' + m2 v2'",
      meaning: "見た目が変わっても、外から強く押されていなければ全運動量は保たれます。",
      recommendedOverlays: ["momentum", "vectors", "graph"],
      getQuantities: (model) => [
        { label: "before", value: formatPhysicsNumber(model.beforeMomentum, 2) },
        { label: "after", value: formatPhysicsNumber(model.afterMomentum, 2) },
        { label: "cm", value: `${formatPhysicsNumber(model.centerVelocity, 2)} m/s` }
      ]
    },
    {
      id: "restitution",
      label: "反発係数",
      expression: "e = -(v2' - v1') / (v2 - v1)",
      meaning: "衝突の弾みやすさを 0 から 1 の範囲でまとめる量です。",
      recommendedOverlays: ["vectors", "graph"],
      getQuantities: (model, params) => [
        { label: "e", value: formatPhysicsNumber(params.restitution, 2) },
        { label: "lost", value: `${formatPhysicsNumber(model.lostEnergy, 2)} J` }
      ]
    }
  ];
}

function oscillatorFormulaList() {
  return [
    {
      id: "hooke",
      label: "フックの法則",
      expression: "F = -k x",
      meaning: "ずれが大きいほど戻そうとする力が大きくなるので、振動が生まれます。",
      recommendedOverlays: ["vectors", "phase"],
      getQuantities: (model, params) => [
        { label: "x", value: `${formatPhysicsNumber(model.position, 2)} m` },
        { label: "k", value: `${formatPhysicsNumber(params.spring, 1)} N/m` },
        { label: "F", value: `${formatPhysicsNumber(model.force, 2)} N` }
      ]
    },
    {
      id: "period",
      label: "周期",
      expression: "T = 2pi sqrt(m / k)",
      meaning: "重いほど遅く、ばねが強いほど速く振動する、という関係をまとめています。",
      recommendedOverlays: ["graph", "phase"],
      getQuantities: (model) => [
        { label: "T", value: `${formatPhysicsNumber(model.metrics.period, 2)} s` },
        { label: "omega", value: `${formatPhysicsNumber(model.metrics.omega, 2)} rad/s` }
      ]
    },
    {
      id: "energy",
      label: "全エネルギー",
      expression: "E = 0.5 m v^2 + 0.5 k x^2",
      meaning: "質点の速さとばねの伸びが、運動エネルギーと弾性エネルギーをやり取りします。",
      recommendedOverlays: ["energy", "graph"],
      getQuantities: (model) => [
        { label: "K", value: `${formatPhysicsNumber(model.kinetic, 2)} J` },
        { label: "U", value: `${formatPhysicsNumber(model.springEnergy, 2)} J` }
      ]
    }
  ];
}

function gasFormulaList() {
  return [
    {
      id: "ideal",
      label: "理想気体則",
      expression: "P V approx N T",
      meaning: "ここでは定数を吸収して、粒子数、温度、体積で圧力の傾向を見る簡易版にしています。",
      recommendedOverlays: ["graph", "histogram"],
      getQuantities: (model, params) => [
        { label: "P", value: formatPhysicsNumber(model.metrics.pressure, 2) },
        { label: "T", value: formatPhysicsNumber(params.temperature, 0) },
        { label: "V", value: formatPhysicsNumber(params.volume, 2) }
      ]
    },
    {
      id: "distribution",
      label: "速度分布",
      expression: "f(v) shifts right as T increases",
      meaning: "温度を上げると、速い粒子の比率が増えてヒストグラムが右へ広がります。",
      recommendedOverlays: ["histogram", "graph"],
      getQuantities: (model) => [
        { label: "mean v", value: `${formatPhysicsNumber(model.metrics.averageSpeed, 2)} u` },
        { label: "density", value: formatPhysicsNumber(model.metrics.density, 2) }
      ]
    }
  ];
}

function waveFormulaList() {
  return [
    {
      id: "velocity",
      label: "波の速さ",
      expression: "v = f lambda",
      meaning: "同じ周波数でも媒質が変わると波長が変わり、見え方が変わります。",
      recommendedOverlays: ["wave", "graph"],
      getQuantities: (model, params) => [
        { label: "f", value: `${formatPhysicsNumber(params.frequency, 2)} Hz*` },
        { label: "lambda", value: `${formatPhysicsNumber(params.wavelength, 2)} m*` },
        { label: "v2", value: formatPhysicsNumber(model.metrics.phaseVelocity, 2) }
      ]
    },
    {
      id: "boundary",
      label: "境界条件",
      expression: "R + T approx 1",
      meaning: "ここではエネルギー流の簡易比として、反射と透過の割合を並べています。",
      recommendedOverlays: ["wave", "energy", "graph"],
      getQuantities: (model) => [
        { label: "R", value: `${formatPhysicsNumber(model.metrics.reflection, 1)}%` },
        { label: "T", value: `${formatPhysicsNumber(model.metrics.transmission, 1)}%` }
      ]
    }
  ];
}

function relativityFormulaList() {
  return [
    {
      id: "gamma",
      label: "ローレンツ因子",
      expression: "gamma = 1 / sqrt(1 - beta^2)",
      meaning: "速度が光速に近づくほど、時間の遅れと長さの収縮が強くなります。",
      recommendedOverlays: ["spacetime", "graph"],
      getQuantities: (model, params) => [
        { label: "beta", value: `${formatPhysicsNumber(params.beta, 2)} c` },
        { label: "gamma", value: formatPhysicsNumber(model.metrics.gamma, 2) },
        { label: "L/L0", value: formatPhysicsNumber(model.metrics.contraction, 2) }
      ]
    },
    {
      id: "transform",
      label: "ローレンツ変換",
      expression: "x' = gamma(x - beta ct), ct' = gamma(ct - beta x)",
      meaning: "同じ出来事でも、観測者ごとに x と ct の座標がずれます。",
      recommendedOverlays: ["spacetime", "vectors", "graph"],
      getQuantities: (model) => [
        { label: "x'", value: formatPhysicsNumber(model.metrics.xPrime, 2) },
        { label: "ct'", value: formatPhysicsNumber(model.metrics.tPrime, 2) }
      ]
    }
  ];
}

function quantumFormulaList() {
  return [
    {
      id: "schrodinger",
      label: "定常波の発想",
      expression: "[-(hbar^2 / 2m)d^2/dx^2 + V(x)] psi = E psi",
      meaning: "粒子ではなく状態を解き、その形から許されるエネルギーと密度を読みます。",
      recommendedOverlays: ["probability", "graph"],
      getQuantities: (model, params) => [
        { label: "E", value: formatPhysicsNumber(params.energy, 2) },
        { label: "V0", value: formatPhysicsNumber(params.barrierHeight, 2) },
        { label: "a", value: formatPhysicsNumber(params.barrierWidth, 2) }
      ]
    },
    {
      id: "tunneling",
      label: "トンネル効果",
      expression: "T approx exp(-2 kappa a)",
      meaning: "障壁が高く広いほど透過は急に小さくなる、という傾向を簡易式で表します。",
      recommendedOverlays: ["probability", "energy", "graph"],
      getQuantities: (model) => [
        { label: "T", value: `${formatPhysicsNumber(model.metrics.transmission, 1)}%` },
        { label: "R", value: `${formatPhysicsNumber(model.metrics.reflection, 1)}%` },
        { label: "bound", value: `${model.metrics.boundLevels}` }
      ]
    }
  ];
}

export const PHYSICS_SCENES = [
  {
    id: "projectile",
    categoryId: "motion",
    title: "放物運動",
    academicTitle: "Projectile Motion",
    difficulty: "初級",
    parameterCount: 5,
    status: "P0",
    summary: "投げる角度、初速、重力を変えて、軌道とエネルギーの読み方を切り替える導入 scene です。",
    missionTitle: "最も遠くへ飛ばす",
    missionBody: "角度と初速を調整して、到達距離 18 m 以上を狙います。",
    observationPoints: [
      "角度を変えると、軌道の高さと到達距離がどう入れ替わるか",
      "エネルギー表示を ON にしたとき、K と U がどう交換されるか",
      "drag を増やすと range がどう崩れるか"
    ],
    overlays: ["vectors", "energy", "trajectory", "graph"],
    defaultOverlays: ["vectors", "trajectory"],
    formulas: projectileFormulaList(),
    theoryMap: {
      bridge: "力学 -> 保存則 -> 数値計算",
      next: ["collision", "oscillator", "gas"]
    }
  },
  {
    id: "collision",
    categoryId: "impact",
    title: "衝突と運動量保存",
    academicTitle: "Collision",
    difficulty: "初級",
    parameterCount: 5,
    status: "P0",
    summary: "2 物体の前後を並べ、保存される量と失われる量を同じ画面で比較します。",
    missionTitle: "相手を止める",
    missionBody: "質量比と反発係数を調整して、青ブロックの衝突後速度を 0 に近づけます。",
    observationPoints: [
      "momentum overlay を ON にして、before/after の差を比べる",
      "e を下げたとき、何が保たれ何が減るかを見る"
    ],
    overlays: ["vectors", "momentum", "energy", "graph"],
    defaultOverlays: ["vectors", "momentum"],
    formulas: collisionFormulaList(),
    theoryMap: {
      bridge: "力学 -> 保存則 -> 統計力学",
      next: ["gas", "projectile"]
    }
  },
  {
    id: "oscillator",
    categoryId: "motion",
    title: "単振動",
    academicTitle: "Harmonic Oscillation",
    difficulty: "初級",
    parameterCount: 5,
    status: "P0",
    summary: "ばねと質点で、位置・速度・位相・エネルギーが周期的に入れ替わる様子を見ます。",
    missionTitle: "周期を合わせる",
    missionBody: "質量とばね定数を調整して、周期 2.4 s 前後に揃えます。",
    observationPoints: [
      "position と velocity の位相差を見る",
      "phase overlay を ON にして、同じ運動を別の見方で読む",
      "damping を入れたとき、振幅がどう減るか確認する"
    ],
    overlays: ["vectors", "energy", "phase", "graph"],
    defaultOverlays: ["vectors", "phase"],
    formulas: oscillatorFormulaList(),
    theoryMap: {
      bridge: "力学 -> フーリエ -> 量子調和振動子",
      next: ["wave", "quantum1d"]
    }
  },
  {
    id: "gas",
    categoryId: "thermal",
    title: "理想気体",
    academicTitle: "Ideal Gas",
    difficulty: "初級",
    parameterCount: 4,
    status: "P0",
    summary: "粒子を箱の中へ入れ、温度と体積を変えながら圧力と速度分布を読む scene です。",
    missionTitle: "圧力を上げる",
    missionBody: "粒子数と温度を調整して、pressure 1.4 以上を達成します。",
    observationPoints: [
      "温度を上げると histogram がどう右へ広がるか",
      "volume を下げると壁との衝突頻度がどう変わるか"
    ],
    overlays: ["vectors", "histogram", "graph"],
    defaultOverlays: ["histogram", "vectors"],
    formulas: gasFormulaList(),
    theoryMap: {
      bridge: "衝突 -> 分布 -> 統計力学",
      next: ["wave", "quantum1d"]
    }
  },
  {
    id: "wave",
    categoryId: "wave",
    title: "波の反射・屈折",
    academicTitle: "Reflection / Refraction",
    difficulty: "中級",
    parameterCount: 4,
    status: "P0",
    summary: "媒質境界で反射と透過が同時に起こり、波長と速さの見え方が変わることを確認します。",
    missionTitle: "透過を最大化する",
    missionBody: "屈折率差を抑えて、透過率 85% 以上を狙います。",
    observationPoints: [
      "媒質 B 側で波長がどう変わるか",
      "boundary で反射波がどう残るか"
    ],
    overlays: ["wave", "vectors", "energy", "graph"],
    defaultOverlays: ["wave", "vectors"],
    formulas: waveFormulaList(),
    theoryMap: {
      bridge: "波動 -> 電磁気 -> 量子光学",
      next: ["relativity", "quantum1d"]
    }
  },
  {
    id: "relativity",
    categoryId: "spacetime",
    title: "ローレンツ変換",
    academicTitle: "Lorentz Transform",
    difficulty: "中級",
    parameterCount: 4,
    status: "P0",
    summary: "同じ event を別の慣性系から見ると、x と ct の座標がどう変わるかを時空図で表示します。",
    missionTitle: "gamma を上げる",
    missionBody: "beta を上げて、gamma 1.6 以上の領域へ入ります。",
    observationPoints: [
      "spacetime overlay を ON にして、同時線の傾きを見る",
      "beta を上げたとき、x' と ct' がどう変わるか読む"
    ],
    overlays: ["spacetime", "vectors", "graph"],
    defaultOverlays: ["spacetime", "vectors"],
    formulas: relativityFormulaList(),
    theoryMap: {
      bridge: "古典力学 -> 特殊相対論 -> 場の理論",
      next: ["wave", "quantum1d"]
    }
  },
  {
    id: "quantum1d",
    categoryId: "quantum",
    title: "1D量子井戸",
    academicTitle: "1D Quantum Well / Tunneling",
    difficulty: "上級",
    parameterCount: 4,
    status: "P0",
    summary: "ポテンシャル障壁と井戸を置き、粒子の軌跡ではなく状態と確率密度で読む量子の導入です。",
    missionTitle: "透過率を合わせる",
    missionBody: "障壁高さと幅を変えて、透過率 30% 前後へ調整します。",
    observationPoints: [
      "probability overlay を ON にして、障壁の向こうに密度が残ることを見る",
      "energy line を ON にして、古典直感と量子結果がどうずれるか確認する"
    ],
    overlays: ["probability", "energy", "graph"],
    defaultOverlays: ["probability", "energy"],
    formulas: quantumFormulaList(),
    theoryMap: {
      bridge: "波動 -> シュレディンガー方程式 -> 固有状態",
      next: ["oscillator", "wave"]
    }
  }
];

export const PHYSICS_DEFAULTS = {
  projectile: { speed: 14, angleDeg: 44, gravity: 9.8, drag: 0.08, mass: 1.2 },
  collision: { massA: 1.2, massB: 1.8, velocityA: 5.4, velocityB: -1.2, restitution: 0.84 },
  oscillator: { mass: 1.2, spring: 11, amplitude: 1.2, damping: 0.08, phaseDeg: 12 },
  gas: { particleCount: 56, temperature: 48, volume: 1, massScale: 1 },
  wave: { amplitude: 1, frequency: 1.3, wavelength: 1.4, refractiveIndex: 1.42 },
  relativity: { beta: 0.68, eventX: 4.6, eventT: 3.4, properLength: 7 },
  quantum1d: { energy: 2.6, barrierHeight: 4.8, barrierWidth: 1.3, packetWidth: 1.1 }
};

export const PHYSICS_PRESETS = {
  projectile: [
    { id: "earth", label: "地球", values: { speed: 14, angleDeg: 44, gravity: 9.8, drag: 0.08, mass: 1.2 } },
    { id: "moon", label: "月", values: { speed: 14, angleDeg: 44, gravity: 1.62, drag: 0.01, mass: 1.2 } },
    { id: "flat", label: "低角度", values: { speed: 18, angleDeg: 26, gravity: 9.8, drag: 0.04, mass: 1.2 } }
  ],
  collision: [
    { id: "elastic", label: "弾性衝突", values: { massA: 1.2, massB: 1.2, velocityA: 5.2, velocityB: -1.2, restitution: 1 } },
    { id: "sticky", label: "非弾性", values: { massA: 1.4, massB: 1.8, velocityA: 4.6, velocityB: -0.6, restitution: 0.2 } },
    { id: "target", label: "停止狙い", values: { massA: 1.8, massB: 1.2, velocityA: 3.2, velocityB: -2.0, restitution: 1 } }
  ],
  oscillator: [
    { id: "clean", label: "減衰なし", values: { mass: 1.2, spring: 11, amplitude: 1.2, damping: 0.01, phaseDeg: 0 } },
    { id: "soft", label: "柔らかいばね", values: { mass: 1.2, spring: 6.8, amplitude: 1.4, damping: 0.06, phaseDeg: 18 } },
    { id: "damped", label: "減衰あり", values: { mass: 1.2, spring: 11, amplitude: 1.2, damping: 0.18, phaseDeg: 0 } }
  ],
  gas: [
    { id: "cool", label: "低温", values: { particleCount: 40, temperature: 28, volume: 1.2, massScale: 1 } },
    { id: "dense", label: "高密度", values: { particleCount: 72, temperature: 42, volume: 0.8, massScale: 1 } },
    { id: "hot", label: "高温", values: { particleCount: 52, temperature: 78, volume: 1, massScale: 1 } }
  ],
  wave: [
    { id: "matched", label: "近い媒質", values: { amplitude: 1, frequency: 1.2, wavelength: 1.5, refractiveIndex: 1.08 } },
    { id: "glass", label: "ガラス", values: { amplitude: 1, frequency: 1.4, wavelength: 1.3, refractiveIndex: 1.52 } },
    { id: "high", label: "高周波", values: { amplitude: 1.2, frequency: 2, wavelength: 0.9, refractiveIndex: 1.38 } }
  ],
  relativity: [
    { id: "slow", label: "低速", values: { beta: 0.22, eventX: 4.2, eventT: 3.2, properLength: 7 } },
    { id: "fast", label: "高速", values: { beta: 0.72, eventX: 4.8, eventT: 3.4, properLength: 7 } },
    { id: "extreme", label: "極端", values: { beta: 0.9, eventX: 5.8, eventT: 3.8, properLength: 8 } }
  ],
  quantum1d: [
    { id: "tunnel", label: "トンネル", values: { energy: 2.6, barrierHeight: 4.8, barrierWidth: 1.3, packetWidth: 1.1 } },
    { id: "thin", label: "薄い障壁", values: { energy: 2.4, barrierHeight: 4.6, barrierWidth: 0.8, packetWidth: 0.9 } },
    { id: "wide", label: "広い障壁", values: { energy: 2.2, barrierHeight: 5, barrierWidth: 1.9, packetWidth: 1.3 } }
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

export function buildProjectileModel({ speed, angleDeg, gravity, drag, mass }, sim = { time: 0 }) {
  const angle = (angleDeg * Math.PI) / 180;
  const vx0 = speed * Math.cos(angle);
  const vy0 = speed * Math.sin(angle);
  const dragFactor = clamp(1 - drag * 0.12, 0.7, 1);
  const timeOfFlight = Math.max((2 * vy0) / gravity * dragFactor, 0.3);
  const loopTime = sim.time % Math.max(timeOfFlight, 0.6);
  const currentX = vx0 * loopTime * (1 - drag * 0.04 * loopTime);
  const currentY = Math.max(vy0 * loopTime - 0.5 * gravity * loopTime * loopTime, 0);
  const vx = vx0 * (1 - drag * 0.06 * loopTime);
  const vy = vy0 - gravity * loopTime;
  const kinetic = 0.5 * mass * (vx * vx + vy * vy);
  const potential = mass * gravity * currentY;
  const range = vx0 * timeOfFlight * (1 - drag * 0.05 * timeOfFlight);
  const peakHeight = (vy0 * vy0) / (2 * gravity) * dragFactor;
  const trajectory = Array.from({ length: 28 }, (_, index) => {
    const t = (timeOfFlight * index) / 27;
    return {
      x: vx0 * t * (1 - drag * 0.04 * t),
      y: Math.max(vy0 * t - 0.5 * gravity * t * t, 0)
    };
  });

  return {
    position: { x: currentX, y: currentY },
    velocity: { x: vx, y: vy },
    kinetic,
    potential,
    trajectory,
    metrics: {
      range,
      timeOfFlight,
      peakHeight,
      speed: Math.sqrt(vx * vx + vy * vy),
      totalEnergy: kinetic + potential
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

  return {
    nextVelocityA,
    nextVelocityB,
    beforeMomentum,
    afterMomentum,
    beforeEnergy,
    afterEnergy,
    lostEnergy: Math.max(beforeEnergy - afterEnergy, 0),
    centerVelocity: beforeMomentum / totalMass,
    metrics: {
      beforeMomentum,
      afterMomentum,
      beforeEnergy,
      afterEnergy,
      centerVelocity: beforeMomentum / totalMass
    }
  };
}

export function buildOscillatorModel({ mass, spring, amplitude, damping, phaseDeg }, sim = { time: 0 }) {
  const phase = (phaseDeg * Math.PI) / 180;
  const omega0 = Math.sqrt(spring / Math.max(mass, 0.2));
  const omega = omega0 * Math.sqrt(Math.max(1 - damping * damping, 0.05));
  const envelope = Math.exp(-damping * sim.time * 0.8);
  const position = amplitude * envelope * Math.cos(omega * sim.time + phase);
  const velocity =
    -amplitude * envelope * (omega * Math.sin(omega * sim.time + phase) + damping * 0.8 * Math.cos(omega * sim.time + phase));
  const force = -spring * position;
  const kinetic = 0.5 * mass * velocity * velocity;
  const springEnergy = 0.5 * spring * position * position;
  const totalEnergy = kinetic + springEnergy;
  const series = Array.from({ length: 48 }, (_, index) => {
    const t = (index / 47) * ((Math.PI * 4) / omega0);
    const localEnvelope = Math.exp(-damping * t * 0.8);
    return {
      x: t,
      y: amplitude * localEnvelope * Math.cos(omega * t + phase)
    };
  });

  return {
    position,
    velocity,
    force,
    kinetic,
    springEnergy,
    totalEnergy,
    series,
    metrics: {
      period: (2 * Math.PI) / omega0,
      omega,
      amplitude: Math.abs(position),
      totalEnergy
    }
  };
}

export function buildGasModel({ particleCount, temperature, volume, massScale }, sim = { time: 0 }) {
  const renderCount = Math.min(particleCount, 72);
  const boxWidth = 0.42 + volume * 0.32;
  const speeds = [];
  const particles = Array.from({ length: renderCount }, (_, index) => {
    const baseX = 0.1 + seededUnit(index + 7) * boxWidth;
    const baseY = 0.12 + seededUnit(index + 21) * 0.72;
    const speed = 0.4 + Math.sqrt(temperature / 14) * (0.7 + seededUnit(index + 51) * 1.6) / Math.max(massScale, 0.4);
    const angle = seededUnit(index + 92) * Math.PI * 2;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed;
    const x = 0.08 + ((baseX + dx * sim.time * 0.035) % boxWidth);
    const y = 0.12 + ((baseY + dy * sim.time * 0.045) % 0.72);
    speeds.push(speed);
    return { x, y, dx, dy };
  });

  const averageSpeed = speeds.reduce((sum, value) => sum + value, 0) / Math.max(speeds.length, 1);
  const pressure = (particleCount * temperature) / Math.max(volume * 2500, 1);

  return {
    particles,
    histogram: histogram(speeds, 7, Math.max(...speeds, 1)),
    boxWidth,
    metrics: {
      pressure,
      averageSpeed,
      density: particleCount / Math.max(volume, 0.1)
    }
  };
}

export function buildWaveModel({ amplitude, frequency, wavelength, refractiveIndex }, sim = { time: 0 }) {
  const reflection = clamp((((refractiveIndex - 1) / (refractiveIndex + 1)) ** 2) * 100, 0, 100);
  const transmission = 100 - reflection;
  const refractedWavelength = wavelength / Math.max(refractiveIndex, 0.4);
  const left = Array.from({ length: 56 }, (_, index) => {
    const x = -1 + (2 * index) / 55;
    const incident = amplitude * Math.sin((2 * Math.PI * x) / wavelength - sim.time * frequency * 2.4);
    const reflected = amplitude * (reflection / 100) * Math.sin((-2 * Math.PI * x) / wavelength - sim.time * frequency * 2.4);
    return { x, y: incident + reflected };
  });
  const right = Array.from({ length: 56 }, (_, index) => {
    const x = (2 * index) / 55;
    const transmitted = amplitude * (transmission / 100) * Math.sin((2 * Math.PI * x) / refractedWavelength - sim.time * frequency * 2.4);
    return { x, y: transmitted };
  });

  return {
    left,
    right,
    metrics: {
      reflection,
      transmission,
      refractedWavelength,
      phaseVelocity: 1 / Math.max(refractiveIndex, 0.2)
    }
  };
}

export function buildRelativityModel({ beta, eventX, eventT, properLength }) {
  const clampedBeta = clamp(beta, 0.02, 0.96);
  const gamma = 1 / Math.sqrt(1 - clampedBeta * clampedBeta);
  const xPrime = gamma * (eventX - clampedBeta * eventT);
  const tPrime = gamma * (eventT - clampedBeta * eventX);

  return {
    beta: clampedBeta,
    gamma,
    metrics: {
      gamma,
      xPrime,
      tPrime,
      contraction: properLength / gamma,
      simultaneityTilt: clampedBeta
    }
  };
}

export function buildQuantum1DModel({ energy, barrierHeight, barrierWidth, packetWidth }) {
  const gap = Math.max(barrierHeight - energy, 0);
  const transmission =
    energy >= barrierHeight
      ? clamp(68 + (energy - barrierHeight) * 10 - barrierWidth * 8, 8, 96)
      : clamp(Math.exp(-1.35 * barrierWidth * Math.sqrt(gap + 0.2)) * 100, 2, 88);
  const reflection = 100 - transmission;
  const boundLevels = Math.max(1, Math.min(5, Math.floor((barrierHeight + packetWidth) / 1.4)));
  const density = Array.from({ length: 64 }, (_, index) => {
    const x = -6 + (12 * index) / 63;
    const leftWave = Math.exp(-((x + 3.2) ** 2) / Math.max(packetWidth * 2.8, 0.8));
    const barrierDamp = x > -barrierWidth / 2 && x < barrierWidth / 2 ? 1 - transmission / 100 : 1;
    const transmittedWave = Math.exp(-((x - 3.4) ** 2) / Math.max(packetWidth * 2.2, 0.7)) * (transmission / 100);
    return { x, y: clamp(leftWave * barrierDamp + transmittedWave, 0, 1) };
  });

  return {
    density,
    metrics: {
      transmission,
      reflection,
      gap,
      boundLevels
    }
  };
}

export function buildPhysicsSceneModel(sceneId, params, sim = { time: 0 }) {
  if (sceneId === "projectile") return buildProjectileModel(params, sim);
  if (sceneId === "collision") return buildCollisionModel(params, sim);
  if (sceneId === "oscillator") return buildOscillatorModel(params, sim);
  if (sceneId === "gas") return buildGasModel(params, sim);
  if (sceneId === "wave") return buildWaveModel(params, sim);
  if (sceneId === "relativity") return buildRelativityModel(params, sim);
  return buildQuantum1DModel(params, sim);
}

export function getPhysicsMissionResult(sceneId, model) {
  if (sceneId === "projectile") {
    return {
      label: "到達距離",
      target: "18 m 以上",
      passed: model.metrics.range >= 18
    };
  }
  if (sceneId === "collision") {
    return {
      label: "相手を止める",
      target: "|v2'| < 0.2",
      passed: Math.abs(model.nextVelocityB) < 0.2
    };
  }
  if (sceneId === "oscillator") {
    return {
      label: "周期合わせ",
      target: "2.2s - 2.6s",
      passed: model.metrics.period >= 2.2 && model.metrics.period <= 2.6
    };
  }
  if (sceneId === "gas") {
    return {
      label: "圧力上昇",
      target: "P > 1.4",
      passed: model.metrics.pressure > 1.4
    };
  }
  if (sceneId === "wave") {
    return {
      label: "透過率",
      target: "85% 以上",
      passed: model.metrics.transmission >= 85
    };
  }
  if (sceneId === "relativity") {
    return {
      label: "gamma",
      target: "1.6 以上",
      passed: model.metrics.gamma >= 1.6
    };
  }
  return {
    label: "透過率調整",
    target: "25% - 45%",
    passed: model.metrics.transmission >= 25 && model.metrics.transmission <= 45
  };
}
