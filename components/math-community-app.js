"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MathActionRow,
  MathKpi,
  MathLegendRow,
  MathMissionCard,
  MathModeTabs,
  MathNumberField,
  MathPlayPauseResetBar,
  MathPlaygroundHeader,
  MathPlaygroundLayout,
  MathPresetRow,
  MathSliderField,
  MathStatusMessage,
  MathStoryCard,
  MathToggleField,
  MathValueMeter
} from "@/components/math-community/math-playground-ui";
import {
  drawCanvasMessage,
  drawFunctionCurve,
  drawGraphGrid,
  eventToCanvasPoint,
  linearScreenToWorld,
  linearWorldToScreen,
  paintMathBackground,
  screenToWorldY,
  screenToWorldX,
  worldToScreenX,
  worldToScreenY
} from "@/lib/math-community/math-canvas";
import { WaveLab } from "@/components/math-community/wave-lab";

const APP_TABS = [
  { id: "wave", label: "Wave Lab" },
  { id: "graph", label: "関数グラフ" },
  { id: "derivative", label: "微分" },
  { id: "integral", label: "積分" },
  { id: "linear", label: "線形代数" },
  { id: "probability", label: "確率・基本分布" },
  { id: "limit", label: "極限・連続性" },
  { id: "newton", label: "ニュートン法" },
  { id: "regression", label: "回帰分析" },
  { id: "taylor", label: "テイラー展開" },
  { id: "eigen", label: "固有値・固有ベクトル" },
  { id: "geometry", label: "幾何" },
  { id: "space", label: "空間図形" },
  { id: "cas", label: "数式処理(CAS)" },
  { id: "calculator", label: "科学計算電卓" }
];

const TAB_SECTIONS = [
  {
    id: "waves",
    label: "波と分解",
    tabs: ["wave"]
  },
  {
    id: "hidden-order",
    label: "見えにくい秩序を見抜く",
    tabs: ["regression", "taylor", "eigen"]
  },
  {
    id: "play-labs",
    label: "観察して学ぶ",
    tabs: ["probability", "limit", "newton"]
  },
  {
    id: "core-labs",
    label: "変化を見る",
    tabs: ["graph", "derivative", "integral", "linear"]
  },
  {
    id: "math-tools",
    label: "図形と計算",
    tabs: ["geometry", "space", "cas", "calculator"]
  }
];

const TAB_MAP = Object.fromEntries(APP_TABS.map((tab) => [tab.id, tab]));

const PLAYGROUND_MODES = [
  { id: "play", label: "あそぶ" },
  { id: "edit", label: "いじる" },
  { id: "mission", label: "ミッション" }
];

const GRAPH_PRESETS = [
  "sin(x)",
  "cos(x) * x / 3",
  "x^3 / 20 - x",
  "sqrt(abs(x))",
  "exp(-x^2 / 12) * 6"
];

const SURFACE_PRESETS = [
  "sin(sqrt(x^2 + y^2))",
  "cos(x) + sin(y)",
  "(x^2 - y^2) / 8",
  "sin(x) * cos(y) * 2"
];

const DERIVATIVE_PRESETS = [
  {
    id: "parabola",
    label: "やわらか山",
    expression: "x^2 - 2",
    xRange: 5,
    yRange: 8,
    pointX: -2.2,
    h: 1.2,
    mission: {
      title: "平らな場所を見つける",
      description: "傾きが 0 に近い場所へ点を運ぶとクリアです。",
      type: "zero"
    }
  },
  {
    id: "sine",
    label: "波うちライン",
    expression: "sin(x) * 2.8",
    xRange: 7,
    yRange: 4,
    pointX: -1.2,
    h: 0.9,
    mission: {
      title: "下り坂から上り坂へ",
      description: "傾きが 0 をまたぐ山や谷の近くを探してみます。",
      type: "zero"
    }
  },
  {
    id: "cubic",
    label: "くねくね坂",
    expression: "x^3 / 4 - x",
    xRange: 4,
    yRange: 4,
    pointX: 1.8,
    h: 0.8,
    mission: {
      title: "ちょうどよい上り坂",
      description: "傾きが 2 くらいになる場所を探します。",
      type: "target",
      target: 2
    }
  },
  {
    id: "kink",
    label: "カクッ曲線",
    expression: "abs(x)",
    xRange: 5,
    yRange: 5,
    pointX: 1.2,
    h: 0.8,
    mission: {
      title: "接線が決まらない点を見つける",
      description: "折れ曲がりの真ん中では、接線がうまく 1 本に決まりません。",
      type: "nondiff"
    }
  }
];

const DERIVATIVE_MISSIONS = [
  {
    id: "flat",
    label: "平らを探す",
    title: "平らな場所を見つける",
    description: "傾きが 0 に近い場所へ点を運ぶとクリアです。",
    type: "zero"
  },
  {
    id: "steep",
    label: "急な上り",
    title: "強い上り坂を見つける",
    description: "傾きが 2 くらいになる場所を探します。",
    type: "target",
    target: 2
  },
  {
    id: "kink",
    label: "カクッを探す",
    title: "接線が決まりにくい点を見つける",
    description: "折れ曲がりの真ん中へ点を持っていきます。",
    type: "nondiff"
  }
];

const INTEGRAL_PRESETS = [
  {
    id: "wave",
    label: "打ち消しウェーブ",
    expression: "sin(x)",
    xRange: 7,
    yRange: 4,
    interval: [-3.14, 3.14],
    mission: {
      title: "ためた面積を 0 に近づける",
      description: "正の面積と負の面積がつり合う区間を探します。",
      type: "zero"
    }
  },
  {
    id: "tank",
    label: "ため池カーブ",
    expression: "1.6 + cos(x)",
    xRange: 5,
    yRange: 4,
    interval: [-3, 0.2],
    mission: {
      title: "タンクを 5 くらいまでためる",
      description: "区間を動かして、面積メーターを 5 付近まで持っていきます。",
      type: "target",
      target: 5
    }
  },
  {
    id: "swing",
    label: "行ったり来たり",
    expression: "x^3 / 4 - x",
    xRange: 4,
    yRange: 4,
    interval: [-2.4, 2.4],
    mission: {
      title: "正負がちょうど打ち消し合う",
      description: "左と右のたまり方をそろえると、合計が 0 に近づきます。",
      type: "zero"
    }
  }
];

const INTEGRAL_MISSIONS = [
  {
    id: "balance",
    label: "0 を狙う",
    title: "ためた面積を 0 に近づける",
    description: "正の面積と負の面積がつり合う区間を探します。",
    type: "zero"
  },
  {
    id: "fill-two",
    label: "2 を狙う",
    title: "面積を 2 くらいまでためる",
    description: "区間を動かして、面積メーターを 2 付近まで持っていきます。",
    type: "target",
    target: 2
  },
  {
    id: "negative",
    label: "下側を勝たせる",
    title: "下向きのたまりを強くする",
    description: "x軸より下の面積が勝つ区間を探します。",
    type: "negative"
  }
];

const LINEAR_PRESETS = [
  {
    id: "identity",
    label: "まっすぐ",
    basis: [
      [1, 0],
      [0, 1]
    ]
  },
  {
    id: "stretch",
    label: "ぐいっと伸ばす",
    basis: [
      [2, 0],
      [0, 1]
    ]
  },
  {
    id: "rotate",
    label: "くるっと回す",
    basis: [
      [0.71, 0.71],
      [-0.71, 0.71]
    ]
  },
  {
    id: "shear",
    label: "ずらして傾ける",
    basis: [
      [1, 0],
      [1, 1]
    ]
  },
  {
    id: "flip",
    label: "ひっくり返す",
    basis: [
      [-1, 0],
      [0, 1]
    ]
  }
];

const LINEAR_SHAPES = [
  { id: "square", label: "正方形" },
  { id: "circle", label: "円" },
  { id: "triangle", label: "三角形" }
];

const LINEAR_MISSIONS = [
  {
    id: "double",
    label: "2倍にする",
    title: "面積を 2 倍にする",
    description: "赤と青の矢印を動かして、図形の面積を 2 倍に近づけます。",
    type: "double"
  },
  {
    id: "flip",
    label: "反転させる",
    title: "向きをひっくり返す",
    description: "左右どちらかの矢印を軸の向こう側へ越えて、向きを反転させます。",
    type: "flip"
  },
  {
    id: "rotate",
    label: "回す",
    title: "面積を保ったまま回してみる",
    description: "広がりをほぼ 1 倍のまま、平面を回転に近い形へ近づけます。",
    type: "rotate"
  }
];

const PROBABILITY_PRESETS = [
  {
    id: "coin",
    label: "コイン",
    kind: "coin",
    title: "公平コイン",
    hint: "短い目線では偏って見えることがあります。",
    bias: 0.5
  },
  {
    id: "die",
    label: "サイコロ",
    kind: "die",
    title: "1個のサイコロ",
    hint: "高い目寄り、低い目寄りを少しずつ変えられます。",
    bias: 0.5
  },
  {
    id: "two-dice",
    label: "2個の和",
    kind: "two-dice",
    title: "サイコロ2個の和",
    hint: "真ん中の数が出やすい形が見えてきます。",
    bias: 0.5
  }
];

const PROBABILITY_MISSIONS = [
  {
    id: "swing",
    label: "偏る瞬間",
    title: "公平なのに偏る瞬間を見つける",
    description: "公平なコインでも、少ない回数ではかなり偏ることがあります。",
    type: "swing"
  },
  {
    id: "shape",
    label: "形を見る",
    title: "一番出やすい結果を見抜く",
    description: "2個のサイコロの和で、真ん中の数がふくらみやすい形を見つけます。",
    type: "mode"
  },
  {
    id: "bias",
    label: "偏りをつくる",
    title: "偏りを変えて形の違いを見る",
    description: "同じゲームでも、偏りを加えると棒の並び方が変わります。",
    type: "bias"
  }
];

const LIMIT_PRESETS = [
  {
    id: "continuous",
    label: "そのまま続く",
    title: "連続カーブ",
    pointX: 1.4,
    xRange: 5,
    yRange: 5,
    startDistance: 2.6,
    fn: (x) => 0.22 * x * x - 1.2,
    pointValue: (x) => 0.22 * x * x - 1.2,
    ghostY: null
  },
  {
    id: "hole",
    label: "穴があく",
    title: "穴のあるカーブ",
    pointX: 1,
    xRange: 5,
    yRange: 5,
    startDistance: 2.3,
    fn: (x) => (Math.abs(x - 1) < 1e-6 ? Number.NaN : x + 1),
    pointValue: () => -1.2,
    ghostY: () => 2
  },
  {
    id: "jump",
    label: "飛びこえる",
    title: "飛びがある",
    pointX: 0,
    xRange: 4.5,
    yRange: 3.5,
    startDistance: 2.1,
    fn: (x) => (x < 0 ? -1.35 : 1.15),
    pointValue: () => 0,
    ghostY: null
  },
  {
    id: "wall",
    label: "壁がある",
    title: "近づけない壁",
    pointX: 0,
    xRange: 5,
    yRange: 6,
    startDistance: 2.8,
    fn: (x) => (Math.abs(x) < 1e-4 ? Number.NaN : 1 / x),
    pointValue: () => null,
    ghostY: null
  }
];

const LIMIT_MISSIONS = [
  {
    id: "same",
    label: "左右が同じ",
    title: "左右が同じ場所に近づくか見抜く",
    description: "左右から来る点の行き先がそろうかを見ます。",
    type: "same"
  },
  {
    id: "point",
    label: "点がズレる",
    title: "点の値と近づいた先がズレる例を探す",
    description: "真ん中の点だけ別の場所に置かれている例を見つけます。",
    type: "point-mismatch"
  },
  {
    id: "split",
    label: "左右で別",
    title: "左右で行き先が分かれる例を探す",
    description: "左と右で別々の高さに行くと、ひとつの答えにまとまりません。",
    type: "split"
  }
];

const NEWTON_PRESETS = [
  {
    id: "quadratic",
    label: "まっすぐ着地",
    expression: "x^2 - 2",
    xRange: 4.5,
    yRange: 5,
    startX: 1.8,
    title: "きれいに収束する"
  },
  {
    id: "multi-root",
    label: "分かれ道",
    expression: "x^3 - x",
    xRange: 3.5,
    yRange: 3,
    startX: 0.72,
    title: "別の根へ吸い寄せられる"
  },
  {
    id: "cosine",
    label: "じわっと追う",
    expression: "cos(x) - x",
    xRange: 3.2,
    yRange: 2.5,
    startX: 1.6,
    title: "少しずつ着地する"
  },
  {
    id: "unstable",
    label: "不安定",
    expression: "x^3 - 2*x + 2",
    xRange: 3.5,
    yRange: 5,
    startX: 0.2,
    title: "うまくいかない出発点もある"
  }
];

const NEWTON_MISSIONS = [
  {
    id: "quick",
    label: "3手で着地",
    title: "3手以内で根にたどり着く",
    description: "よい出発点を選ぶと、少ない手数で着地できます。",
    type: "quick"
  },
  {
    id: "other-root",
    label: "別の根へ",
    title: "ちがう出発点から別の根へ行く",
    description: "同じルールでも、出発点しだいで別の答えへ向かいます。",
    type: "other-root"
  },
  {
    id: "unstable",
    label: "不安定探し",
    title: "不安定な出発点を見つける",
    description: "接線が危ない向きになると、答えから遠ざかることがあります。",
    type: "unstable"
  }
];

const REGRESSION_PRESETS = [
  {
    id: "positive",
    label: "右上がり",
    title: "ゆるく右上がりの群れ",
    slope: 0.72,
    intercept: -0.8,
    noise: 0.68,
    pointCount: 18,
    xRange: 5,
    yRange: 5
  },
  {
    id: "negative",
    label: "右下がり",
    title: "右下がりの気配",
    slope: -0.82,
    intercept: 1.2,
    noise: 0.72,
    pointCount: 18,
    xRange: 5,
    yRange: 5
  },
  {
    id: "flat",
    label: "ほぼ水平",
    title: "平たい傾向",
    slope: 0.18,
    intercept: 0.15,
    noise: 0.55,
    pointCount: 16,
    xRange: 5,
    yRange: 4
  }
];

const REGRESSION_MISSIONS = [
  {
    id: "fit",
    label: "ぴったり線",
    title: "ズレが少ない線を探す",
    description: "線を引っぱって、点から線までのズレをできるだけ小さくします。",
    type: "fit"
  },
  {
    id: "outlier",
    label: "外れ値観察",
    title: "外れ値が線を引っぱる瞬間を見る",
    description: "外れ値をオンにして、全体の傾向がどれくらいゆがむかを見ます。",
    type: "outlier"
  },
  {
    id: "trend",
    label: "傾向を見抜く",
    title: "隠れた傾向の向きを見抜く",
    description: "点のばらつきにまどわされず、全体の向きを読み当てます。",
    type: "trend"
  }
];

const TAYLOR_DEGREES = [
  { id: "1", label: "1次", value: 1 },
  { id: "2", label: "2次", value: 2 },
  { id: "3", label: "3次", value: 3 },
  { id: "5", label: "5次", value: 5 }
];

const TAYLOR_PRESETS = [
  {
    id: "sin",
    label: "sin(x)",
    title: "波を近くでコピーする",
    xRange: 7,
    yRange: 2.7,
    center: 0,
    minCenter: -5.4,
    maxCenter: 5.4,
    fn: (x) => Math.sin(x),
    derivativeAt: (x, order) => sinDerivativeAt(x, order)
  },
  {
    id: "cos",
    label: "cos(x)",
    title: "山の近くを偽装する",
    xRange: 7,
    yRange: 2.7,
    center: 0,
    minCenter: -5.4,
    maxCenter: 5.4,
    fn: (x) => Math.cos(x),
    derivativeAt: (x, order) => cosDerivativeAt(x, order)
  },
  {
    id: "exp",
    label: "exp(x)",
    title: "伸びる曲線のコピー",
    xRange: 3.2,
    yRange: 8,
    center: 0,
    minCenter: -2.2,
    maxCenter: 2.2,
    fn: (x) => Math.exp(x),
    derivativeAt: (x) => Math.exp(x)
  },
  {
    id: "log1p",
    label: "ln(1+x)",
    title: "壁の近くをまねる",
    xRange: 3.1,
    yRange: 3.4,
    center: 0.2,
    minCenter: -0.75,
    maxCenter: 2.4,
    fn: (x) => (x <= -1 ? Number.NaN : Math.log(1 + x)),
    derivativeAt: (x, order) => logOnePlusDerivativeAt(x, order)
  }
];

const TAYLOR_MISSIONS = [
  {
    id: "local",
    label: "近くでそっくり",
    title: "近い範囲をそっくりにする",
    description: "中心の近くで、元の曲線とコピーが重なる場所を作ります。",
    type: "local"
  },
  {
    id: "widen",
    label: "範囲を広げる",
    title: "似ている範囲を広げる",
    description: "次数を上げて、コピーがばれにくい範囲を広げます。",
    type: "widen"
  },
  {
    id: "center",
    label: "中心探し",
    title: "一番うまくコピーできる中心を探す",
    description: "中心点をずらしながら、一番自然に重なる場所を見つけます。",
    type: "center"
  }
];

const EIGEN_PRESETS = [
  {
    id: "stretch",
    label: "伸ばす",
    title: "伸びる方向がはっきりある",
    basis: {
      u: { x: 2.1, y: 0 },
      v: { x: 0, y: 0.75 }
    },
    start: { x: 1.7, y: 0.9 },
    range: 4.6
  },
  {
    id: "shear",
    label: "せん断",
    title: "片方だけぶれにくい",
    basis: {
      u: { x: 1.35, y: 0 },
      v: { x: 0.95, y: 1 }
    },
    start: { x: 1.3, y: 1.1 },
    range: 4.8
  },
  {
    id: "reflect",
    label: "反転",
    title: "向きを保つ軸と、裏返る軸がある",
    basis: {
      u: { x: -1.2, y: 0 },
      v: { x: 0, y: 1.45 }
    },
    start: { x: 1.5, y: 0.8 },
    range: 4.8
  },
  {
    id: "mixed",
    label: "斜めの軸",
    title: "隠れた軸を見つける",
    basis: {
      u: { x: 1.55, y: 0.42 },
      v: { x: 0.52, y: 1.08 }
    },
    start: { x: 1.2, y: 1.4 },
    range: 4.8
  },
  {
    id: "swirl",
    label: "見つけにくい",
    title: "ぶれない向きが見つけにくい",
    basis: {
      u: { x: 0.42, y: 1.08 },
      v: { x: -1.08, y: 0.42 }
    },
    start: { x: 1.6, y: 0.1 },
    range: 4.8
  }
];

const EIGEN_MISSIONS = [
  {
    id: "one",
    label: "1本探す",
    title: "ぶれない向きを 1 本見つける",
    description: "向きを変えて、変形してもほぼ同じ線上に残る方向を探します。",
    type: "one"
  },
  {
    id: "two",
    label: "2本探す",
    title: "特別な向きを 2 本見つける",
    description: "伸ばす・反転のプリセットでは、2本見つかることがあります。",
    type: "two"
  },
  {
    id: "largest",
    label: "一番伸びる",
    title: "一番大きく伸びる向きを探す",
    description: "ぶれない向きの中でも、一番ぐいっと伸びる軸を探します。",
    type: "largest"
  }
];

const GEOMETRY_TOOLS = [
  { id: "point", label: "点" },
  { id: "segment", label: "線分" },
  { id: "polygon", label: "多角形" },
  { id: "circle", label: "円" }
];

const CALCULATOR_KEYS = [
  ["7", "8", "9", "/", "sqrt("],
  ["4", "5", "6", "*", "^"],
  ["1", "2", "3", "-", "("],
  ["0", ".", "pi", "+", ")"],
  ["sin(", "cos(", "tan(", "log(", "exp("]
];

const SAFE_FUNCTIONS = new Set([
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "sqrt",
  "abs",
  "exp",
  "log",
  "log10",
  "pow",
  "min",
  "max",
  "floor",
  "ceil",
  "round",
  "ln"
]);

export function MathCommunityApp() {
  const [activeTab, setActiveTab] = useState("graph");

  return (
    <div className="dashboard-layout math-app-shell">
      <section className="section-grid section-head">
        <div className="section-copy">
          <h1 className="page-title">数学コンテンツ</h1>
        </div>
      </section>

      <section className="section-grid">
        <div className="math-tab-sections">
          {TAB_SECTIONS.map((section) => (
            <div key={section.id} className="math-tab-section">
              <span className="math-tab-section-label">{section.label}</span>
              <div className="arcade-tab-row math-tab-row">
                {section.tabs.map((tabId) => {
                  const tab = TAB_MAP[tabId];
                  if (!tab) return null;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={`signature-filter-chip ${activeTab === tab.id ? "is-active" : ""}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {activeTab === "wave" ? <WaveLab /> : null}
        {activeTab === "graph" ? <FunctionGraphPanel /> : null}
        {activeTab === "derivative" ? <DerivativePlaygroundPanel /> : null}
        {activeTab === "integral" ? <IntegralPlaygroundPanel /> : null}
        {activeTab === "linear" ? <LinearAlgebraPlaygroundPanel /> : null}
        {activeTab === "probability" ? <ProbabilityPlaygroundPanel /> : null}
        {activeTab === "limit" ? <LimitPlaygroundPanel /> : null}
        {activeTab === "newton" ? <NewtonPlaygroundPanel /> : null}
        {activeTab === "regression" ? <RegressionPlaygroundPanel /> : null}
        {activeTab === "taylor" ? <TaylorPlaygroundPanel /> : null}
        {activeTab === "eigen" ? <EigenPlaygroundPanel /> : null}
        {activeTab === "geometry" ? <GeometryPanel /> : null}
        {activeTab === "space" ? <SpaceGeometryPanel /> : null}
        {activeTab === "cas" ? <CasPanel /> : null}
        {activeTab === "calculator" ? <CalculatorPanel /> : null}
      </section>
    </div>
  );
}

function FunctionGraphPanel() {
  const canvasRef = useRef(null);
  const [expression, setExpression] = useState("sin(x)");
  const [xRange, setXRange] = useState(10);
  const [yRange, setYRange] = useState(10);
  const [hoverPoint, setHoverPoint] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const compiled = useMemo(() => compileMathExpression(expression, ["x"]), [expression]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    drawGraphScene(context, {
      expression,
      compiled,
      xRange,
      yRange,
      hoverPoint
    });
  }, [compiled, expression, hoverPoint, xRange, yRange]);

  function handleMove(event) {
    const canvas = canvasRef.current;
    if (!canvas || !compiled.fn) {
      setHoverPoint(null);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const worldX = screenToWorldX(x, canvas.width, xRange);
    const worldY = compiled.fn(worldX);

    if (!Number.isFinite(worldY)) {
      setHoverPoint(null);
      return;
    }

    setHoverPoint({
      x: worldX,
      y: worldY
    });
  }

  return (
    <div className="math-panel-grid">
      <div className="surface math-workspace-card">
        <canvas
          ref={canvasRef}
          width={960}
          height={480}
          className="math-canvas"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverPoint(null)}
        />
      </div>

      <div className="surface math-side-card">
        <div className="math-control-stack">
          <label className="field">
            <span>f(x)</span>
            <input value={expression} onChange={(event) => setExpression(event.target.value)} placeholder="sin(x)" />
          </label>

          <div className="math-mini-grid">
            <label className="field">
              <span>x 範囲</span>
              <input
                type="number"
                min="2"
                max="50"
                step="1"
                value={xRange}
                onChange={(event) => setXRange(clampNumber(event.target.value, 2, 50, 10))}
              />
            </label>
            <label className="field">
              <span>y 範囲</span>
              <input
                type="number"
                min="2"
                max="50"
                step="1"
                value={yRange}
                onChange={(event) => setYRange(clampNumber(event.target.value, 2, 50, 10))}
              />
            </label>
          </div>

          <div className="math-chip-row">
            {GRAPH_PRESETS.map((preset) => (
              <button key={preset} type="button" className="button button-ghost button-small" onClick={() => setExpression(preset)}>
                {preset}
              </button>
            ))}
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className={`button ${guideOpen ? "button-primary" : "button-secondary"}`}
              onClick={() => setGuideOpen((current) => !current)}
            >
              関数グラフガイド
            </button>
          </div>

          <div className="math-readout">
            <strong>{compiled.error ? "式を確認してください" : "グラフを描画中"}</strong>
            <span>{compiled.error || "カーソルを重ねると座標を表示します。"}</span>
          </div>

          <div className="math-readout">
            <strong>読み取り</strong>
            <span>
              {hoverPoint
                ? `x = ${formatNumber(hoverPoint.x)}, y = ${formatNumber(hoverPoint.y)}`
                : "グラフ上にカーソルを置いてください。"}
            </span>
          </div>

          {guideOpen ? (
            <div className="math-guide-card">
              <div className="math-guide-section">
                <h3>関数グラフって何？</h3>
                <p>
                  関数グラフは、<strong>x を動かしたときに y がどう変わるか</strong>を線で見えるようにしたものです。
                  たとえば <code>y = x^2</code> なら、x が大きくなるほど y も大きくなり、放物線が描かれます。
                </p>
              </div>

              <div className="math-guide-section">
                <h3>このアプリでやること</h3>
                <p>
                  右上の <code>f(x)</code> に式を書くと、左のキャンバスにグラフが出ます。まずは
                  <code>sin(x)</code> や <code>x^2</code> を入れると動きが分かりやすいです。
                </p>
              </div>

              <div className="math-guide-section">
                <h3>どう遊ぶ？</h3>
                <ul className="math-guide-list">
                  <li>
                    <strong>式を書く</strong>
                    : 例 <code>sin(x)</code>, <code>x^2 - 4</code>, <code>sqrt(abs(x))</code>
                  </li>
                  <li>
                    <strong>x 範囲 / y 範囲を変える</strong>
                    : 拡大・縮小する感覚です
                  </li>
                  <li>
                    <strong>グラフにカーソルを重ねる</strong>
                    : その場所の <code>x</code> と <code>y</code> を読めます
                  </li>
                  <li>
                    <strong>プリセットを押す</strong>
                    : まずは形を眺めながら違いを見ます
                  </li>
                </ul>
              </div>

              <div className="math-guide-section">
                <h3>入力のコツ</h3>
                <ul className="math-guide-list">
                  <li>
                    掛け算は <code>2*x</code> のように <code>*</code> を書きます
                  </li>
                  <li>
                    べき乗は <code>x^2</code>
                  </li>
                  <li>
                    円周率は <code>pi</code>
                  </li>
                  <li>
                    使いやすい関数: <code>sin</code>, <code>cos</code>, <code>sqrt</code>, <code>abs</code>, <code>exp</code>, <code>log</code>
                  </li>
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DerivativePlaygroundPanel() {
  const canvasRef = useRef(null);
  const dragRef = useRef(false);
  const autoplayRef = useRef(null);
  const [presetId, setPresetId] = useState(DERIVATIVE_PRESETS[0].id);
  const [mode, setMode] = useState("play");
  const [missionId, setMissionId] = useState(DERIVATIVE_MISSIONS[0].id);
  const preset = DERIVATIVE_PRESETS.find((item) => item.id === presetId) || DERIVATIVE_PRESETS[0];
  const activeMission = DERIVATIVE_MISSIONS.find((item) => item.id === missionId) || DERIVATIVE_MISSIONS[0];
  const [pointX, setPointX] = useState(preset.pointX);
  const [h, setH] = useState(preset.h);
  const [showSecant, setShowSecant] = useState(true);
  const [showTangent, setShowTangent] = useState(true);
  const [viewScale, setViewScale] = useState(1);
  const [autoPlay, setAutoPlay] = useState(false);
  const viewXRange = preset.xRange * viewScale;
  const viewYRange = preset.yRange * viewScale;

  const compiled = useMemo(() => compileMathExpression(preset.expression, ["x"]), [preset.expression]);
  const snapshot = useMemo(() => {
    if (!compiled.fn) return null;
    return buildDerivativeSnapshot(compiled.fn, pointX, h);
  }, [compiled, pointX, h]);
  const mission = useMemo(() => buildDerivativeMissionState(activeMission, snapshot), [activeMission, snapshot]);
  const slopeLabel = useMemo(() => describeSlope(snapshot?.tangentSlope ?? snapshot?.secantSlope), [snapshot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    drawDerivativeScene(context, {
      compiled,
      xRange: viewXRange,
      yRange: viewYRange,
      snapshot,
      showSecant,
      showTangent
    });
  }, [compiled, showSecant, showTangent, snapshot, viewXRange, viewYRange]);

  useEffect(() => {
    if (!autoPlay) {
      if (autoplayRef.current) cancelAnimationFrame(autoplayRef.current);
      return;
    }

    const startedAt = performance.now();
    function frame(now) {
      const phase = ((now - startedAt) / 2200) % 2;
      const progress = phase <= 1 ? phase : 2 - phase;
      const swing = -preset.xRange + progress * preset.xRange * 2;
      setPointX(swing);
      autoplayRef.current = requestAnimationFrame(frame);
    }

    autoplayRef.current = requestAnimationFrame(frame);
    return () => {
      if (autoplayRef.current) cancelAnimationFrame(autoplayRef.current);
    };
  }, [autoPlay, preset.xRange]);

  function updatePointFromEvent(event) {
    const canvas = canvasRef.current;
    if (!canvas || !compiled.fn) return;
    const point = eventToCanvasPoint(event, canvas);
    setPointX(clampFloat(screenToWorldX(point.x, canvas.width, viewXRange), -preset.xRange, preset.xRange, pointX));
  }

  function applyPreset(id) {
    const nextPreset = DERIVATIVE_PRESETS.find((item) => item.id === id);
    if (!nextPreset) return;
    setPresetId(id);
    setPointX(nextPreset.pointX);
    setH(nextPreset.h);
    setViewScale(1);
    setShowSecant(true);
    setShowTangent(true);
    setAutoPlay(false);
  }

  function resetScene() {
    applyPreset(preset.id);
  }

  function randomizeScene() {
    setPointX(clampFloat((Math.random() * 2 - 1) * preset.xRange * 0.92, -preset.xRange, preset.xRange, preset.pointX));
    setH(clampFloat(0.15 + Math.random() * 1.8, 0.08, 2.2, preset.h));
    setViewScale(clampFloat(0.7 + Math.random() * 0.7, 0.65, 1.45, 1));
    setShowSecant(Math.random() > 0.2);
    setShowTangent(true);
  }

  return (
    <MathPlaygroundLayout
      workspace={
        <canvas
          ref={canvasRef}
          width={960}
          height={480}
          className="math-canvas is-draggable"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            dragRef.current = true;
            updatePointFromEvent(event);
          }}
          onPointerMove={(event) => {
            if (dragRef.current) updatePointFromEvent(event);
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
            dragRef.current = false;
          }}
          onPointerLeave={() => {
            dragRef.current = false;
          }}
          onPointerCancel={(event) => {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
            dragRef.current = false;
          }}
        />
      }
      caption="点を左右にドラッグすると、その場所の坂のきつさが変わります。オレンジの割線と紫の接線を見比べてください。"
      controls={
        <>
          <MathPlaygroundHeader title="坂道ハンター" starter="まずは点を動かす" />
          <MathModeTabs activeId={mode} onSelect={setMode} items={PLAYGROUND_MODES} />

          {mode === "play" ? (
            <>
              <MathPresetRow options={DERIVATIVE_PRESETS} activeId={presetId} onSelect={applyPreset} />
              <MathActionRow>
                <button type="button" className="button button-ghost button-small" onClick={randomizeScene}>おまかせ</button>
                <button type="button" className="button button-ghost button-small" onClick={resetScene}>リセット</button>
                <button type="button" className="button button-ghost button-small" onClick={() => setAutoPlay((current) => !current)}>
                  {autoPlay ? "再生を止める" : "点を流す"}
                </button>
              </MathActionRow>
              <MathStoryCard title="いま見ている曲線">
                <span>{preset.expression}</span>
                <span>上り・下り・平らな場所が続けて見つかります。</span>
              </MathStoryCard>
            </>
          ) : null}

          {mode === "edit" ? (
            <>
              <MathPresetRow options={DERIVATIVE_PRESETS} activeId={presetId} onSelect={applyPreset} />
              <MathSliderField label="見る場所を動かす" min={-preset.xRange} max={preset.xRange} step="0.01" value={pointX} onChange={setPointX} />
              <div className="math-number-grid">
                <MathNumberField label="x の位置" value={formatNumber(pointX)} min={-preset.xRange} max={preset.xRange} step="0.1" onChange={(value) => setPointX(clampFloat(value, -preset.xRange, preset.xRange, pointX))} />
                <MathNumberField label="h の大きさ" value={formatNumber(h)} min={0.08} max={2.2} step="0.05" onChange={(value) => setH(clampFloat(value, 0.08, 2.2, h))} />
              </div>
              <MathSliderField label="h を小さくする" min="0.08" max="2.2" step="0.01" value={h} onChange={setH} />
              <MathSliderField label="ズーム" min="0.65" max="1.45" step="0.01" value={viewScale} onChange={setViewScale} />
              <div className="math-toggle-grid">
                <MathToggleField label="割線を表示" checked={showSecant} onChange={setShowSecant} />
                <MathToggleField label="接線を表示" checked={showTangent} onChange={setShowTangent} />
              </div>
            </>
          ) : null}

          {mode === "mission" ? (
            <>
              <MathPresetRow options={DERIVATIVE_MISSIONS} activeId={missionId} onSelect={setMissionId} />
              <MathStoryCard title="今回のねらい">
                {activeMission.description}
              </MathStoryCard>
              <MathActionRow>
                <button type="button" className="button button-ghost button-small" onClick={() => setAutoPlay((current) => !current)}>
                  {autoPlay ? "観察を止める" : "観察を始める"}
                </button>
                <button type="button" className="button button-ghost button-small" onClick={resetScene}>やり直す</button>
              </MathActionRow>
            </>
          ) : null}

          <div className="math-kpi-grid">
            <MathKpi label="x の位置" value={formatNumber(pointX)} />
            <MathKpi label="割線の傾き" value={snapshot ? formatNumber(snapshot.secantSlope) : "—"} />
            <MathKpi label="接線の傾き" value={snapshot?.differentiable ? formatNumber(snapshot.tangentSlope) : "カクッ"} />
            <MathKpi label="坂の感じ" value={describeSlope(snapshot?.tangentSlope ?? snapshot?.secantSlope)} />
          </div>

          <MathValueMeter
            label="傾きメーター"
            value={snapshot?.differentiable ? snapshot.tangentSlope : snapshot?.secantSlope || 0}
            min={-4}
            max={4}
            accentClass={snapshot?.differentiable ? derivativeMeterTone(snapshot?.tangentSlope) : "is-warm"}
            valueLabel={snapshot?.differentiable ? `${formatNumber(snapshot?.tangentSlope)} / その場の勢い` : "接線が決まりにくい点"}
            displayValue={snapshot?.differentiable ? formatNumber(snapshot?.tangentSlope) : formatNumber(snapshot?.secantSlope || 0)}
          />

          <MathLegendRow
            items={[
              { tone: "is-orange", label: "割線" },
              { tone: "is-purple", label: "接線" },
              { tone: "is-dark", label: "いまの点" }
            ]}
          />
        </>
      }
      footer={
        <>
          <div className="math-footer-note">
            <strong>いま何が起きている？</strong>
            <p>
              いまの点は <strong>{slopeLabel}</strong> です。{snapshot?.differentiable
                ? " h を小さくすると、オレンジの割線が紫の接線にだんだん重なっていきます。"
                : " 折れ曲がりの近くでは、左右の坂がそろわず、接線が 1 本に決まりにくくなります。"}
            </p>
          </div>
          <MathMissionCard mission={mission} />
        </>
      }
    />
  );
}

function IntegralPlaygroundPanel() {
  const canvasRef = useRef(null);
  const dragHandleRef = useRef(null);
  const animationRef = useRef(null);
  const autoSweepRef = useRef(null);
  const [presetId, setPresetId] = useState(INTEGRAL_PRESETS[0].id);
  const [mode, setMode] = useState("play");
  const [missionId, setMissionId] = useState(INTEGRAL_MISSIONS[0].id);
  const preset = INTEGRAL_PRESETS.find((item) => item.id === presetId) || INTEGRAL_PRESETS[0];
  const activeMission = INTEGRAL_MISSIONS.find((item) => item.id === missionId) || INTEGRAL_MISSIONS[0];
  const [interval, setIntervalRange] = useState({ a: preset.interval[0], b: preset.interval[1] });
  const [partitions, setPartitions] = useState(12);
  const [fillProgress, setFillProgress] = useState(1);
  const [showRiemann, setShowRiemann] = useState(true);
  const [riemannMode, setRiemannMode] = useState("midpoint");
  const [autoSweep, setAutoSweep] = useState(false);

  useEffect(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const startedAt = performance.now();

    function frame(now) {
      const progress = Math.min(1, (now - startedAt) / 520);
      setFillProgress(progress);
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(frame);
      }
    }

    setFillProgress(0);
    animationRef.current = requestAnimationFrame(frame);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [interval.a, interval.b, partitions, preset.id]);

  useEffect(() => {
    if (!autoSweep) {
      if (autoSweepRef.current) cancelAnimationFrame(autoSweepRef.current);
      return;
    }

    const startedAt = performance.now();
    const startA = interval.a;
    const endB = preset.xRange;

    function frame(now) {
      const progress = Math.min(1, (now - startedAt) / 2800);
      const nextB = startA + (endB - startA) * progress;
      setIntervalRange((current) => ({ a: current.a, b: Math.max(current.a + 0.2, nextB) }));
      if (progress < 1) {
        autoSweepRef.current = requestAnimationFrame(frame);
      } else {
        setAutoSweep(false);
      }
    }

    autoSweepRef.current = requestAnimationFrame(frame);
    return () => {
      if (autoSweepRef.current) cancelAnimationFrame(autoSweepRef.current);
    };
  }, [autoSweep, interval.a, preset.xRange]);

  const compiled = useMemo(() => compileMathExpression(preset.expression, ["x"]), [preset.expression]);
  const exactArea = useMemo(() => {
    if (!compiled.fn) return Number.NaN;
    return simpsonIntegral(compiled.fn, interval.a, interval.b);
  }, [compiled, interval.a, interval.b]);
  const riemannArea = useMemo(() => {
    if (!compiled.fn) return Number.NaN;
    return riemannSum(compiled.fn, interval.a, interval.b, partitions, riemannMode);
  }, [compiled, interval.a, interval.b, partitions, riemannMode]);
  const mission = useMemo(() => buildIntegralMissionState(activeMission, exactArea), [activeMission, exactArea]);
  const animatedEnd = interval.a + (interval.b - interval.a) * fillProgress;
  const integralTone = exactArea < -0.15 ? "is-warm" : exactArea > 0.15 ? "is-positive" : "is-soft";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    drawIntegralScene(context, {
      compiled,
      preset,
      interval,
      animatedEnd,
      partitions,
      showRiemann,
      riemannMode
    });
  }, [animatedEnd, compiled, interval, partitions, preset, riemannMode, showRiemann]);

  function updateBoundaryFromEvent(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = eventToCanvasPoint(event, canvas);
    const worldX = clampFloat(screenToWorldX(point.x, canvas.width, preset.xRange), -preset.xRange, preset.xRange, 0);
    const target = dragHandleRef.current;
    if (target === "a") {
      setIntervalRange((current) => ({ a: Math.min(worldX, current.b - 0.2), b: current.b }));
    } else if (target === "b") {
      setIntervalRange((current) => ({ a: current.a, b: Math.max(worldX, current.a + 0.2) }));
    }
  }

  function selectHandle(event) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const point = eventToCanvasPoint(event, canvas);
    const aX = worldToScreenX(interval.a, canvas.width, preset.xRange);
    const bX = worldToScreenX(interval.b, canvas.width, preset.xRange);
    return Math.abs(point.x - aX) <= Math.abs(point.x - bX) ? "a" : "b";
  }

  function applyPreset(id) {
    const nextPreset = INTEGRAL_PRESETS.find((item) => item.id === id);
    if (!nextPreset) return;
    setPresetId(id);
    setIntervalRange({ a: nextPreset.interval[0], b: nextPreset.interval[1] });
    setPartitions(12);
    setShowRiemann(true);
    setRiemannMode("midpoint");
    setAutoSweep(false);
  }

  function resetScene() {
    applyPreset(preset.id);
  }

  function randomizeScene() {
    const span = preset.xRange * 1.45;
    const left = clampFloat((Math.random() * 2 - 1) * span * 0.45, -span, span, preset.interval[0]);
    const right = clampFloat(left + 0.8 + Math.random() * span * 0.55, left + 0.2, span, preset.interval[1]);
    setIntervalRange({ a: left, b: right });
    setPartitions(4 + Math.floor(Math.random() * 28));
    setShowRiemann(Math.random() > 0.18);
    setRiemannMode(["left", "midpoint", "right"][Math.floor(Math.random() * 3)]);
  }

  const tankFill = Math.min(100, (Math.abs(exactArea) / 12) * 100);

  return (
    <MathPlaygroundLayout
      workspace={
        <canvas
          ref={canvasRef}
          width={960}
          height={480}
          className="math-canvas is-draggable"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            dragHandleRef.current = selectHandle(event);
            updateBoundaryFromEvent(event);
          }}
          onPointerMove={(event) => {
            if (dragHandleRef.current) updateBoundaryFromEvent(event);
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
            dragHandleRef.current = null;
          }}
          onPointerLeave={() => {
            dragHandleRef.current = null;
          }}
          onPointerCancel={(event) => {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
            dragHandleRef.current = null;
          }}
        />
      }
      caption="水色の区間をドラッグして面積をためます。左から右へ、少しずつタンクに流れ込む感覚で見てください。"
      controls={
        <>
          <MathPlaygroundHeader title="面積タンク" starter="まずは区間を動かす" />
          <MathModeTabs activeId={mode} onSelect={setMode} items={PLAYGROUND_MODES} />

          {mode === "play" ? (
            <>
              <MathPresetRow options={INTEGRAL_PRESETS} activeId={presetId} onSelect={applyPreset} />
              <MathActionRow>
                <button type="button" className="button button-ghost button-small" onClick={randomizeScene}>おまかせ</button>
                <button type="button" className="button button-ghost button-small" onClick={resetScene}>リセット</button>
                <button type="button" className="button button-ghost button-small" onClick={() => setAutoSweep((current) => !current)}>
                  {autoSweep ? "ためるのを止める" : "左からためる"}
                </button>
              </MathActionRow>
              <MathStoryCard title="いま見ている曲線">
                <span>{preset.expression}</span>
                <span>区間を動かすと、上と下のたまり方がすぐ変わります。</span>
              </MathStoryCard>
            </>
          ) : null}

          {mode === "edit" ? (
            <>
              <MathPresetRow options={INTEGRAL_PRESETS} activeId={presetId} onSelect={applyPreset} />
              <MathSliderField label="分け方を細かくする" min="4" max="48" step="1" value={partitions} onChange={setPartitions} />
              <div className="math-number-grid">
                <MathNumberField label="左端 a" value={formatNumber(interval.a)} min={-preset.xRange} max={preset.xRange} step="0.1" onChange={(value) => setIntervalRange((current) => ({ a: Math.min(clampFloat(value, -preset.xRange, preset.xRange, current.a), current.b - 0.2), b: current.b }))} />
                <MathNumberField label="右端 b" value={formatNumber(interval.b)} min={-preset.xRange} max={preset.xRange} step="0.1" onChange={(value) => setIntervalRange((current) => ({ a: current.a, b: Math.max(clampFloat(value, -preset.xRange, preset.xRange, current.b), current.a + 0.2) }))} />
              </div>
              <MathPresetRow
                options={[
                  { id: "left", label: "左リーマン" },
                  { id: "midpoint", label: "中点" },
                  { id: "right", label: "右リーマン" }
                ]}
                activeId={riemannMode}
                onSelect={setRiemannMode}
              />
              <div className="math-toggle-grid">
                <MathToggleField label="近似の長方形" checked={showRiemann} onChange={setShowRiemann} />
                <MathToggleField label="左から自動でためる" checked={autoSweep} onChange={setAutoSweep} />
              </div>
            </>
          ) : null}

          {mode === "mission" ? (
            <>
              <MathPresetRow options={INTEGRAL_MISSIONS} activeId={missionId} onSelect={setMissionId} />
              <MathStoryCard title="今回のねらい">
                {activeMission.description}
              </MathStoryCard>
              <MathActionRow>
                <button type="button" className="button button-ghost button-small" onClick={resetScene}>やり直す</button>
                <button type="button" className="button button-ghost button-small" onClick={() => setAutoSweep((current) => !current)}>
                  {autoSweep ? "観察を止める" : "観察を始める"}
                </button>
              </MathActionRow>
            </>
          ) : null}

          <div className="math-kpi-grid">
            <MathKpi label="区間の左端" value={formatNumber(interval.a)} />
            <MathKpi label="区間の右端" value={formatNumber(interval.b)} />
            <MathKpi label="近似の合計" value={formatNumber(riemannArea)} />
            <MathKpi label="積分値" value={formatNumber(exactArea)} />
          </div>

          <div className="math-tank-card">
            <div className="math-tank">
              <div className={`math-tank-fill ${exactArea < 0 ? "is-negative" : ""}`} style={{ height: `${tankFill}%` }} />
              <div className="math-tank-centerline" />
            </div>
            <div className="math-tank-copy">
              <strong>面積メーター</strong>
              <span>{exactArea >= 0 ? "たまっている" : "下向きにたまっている"}</span>
              <strong>{formatNumber(exactArea)}</strong>
            </div>
          </div>

          <MathValueMeter
            label="面積メーター"
            value={exactArea}
            displayValue={formatNumber(exactArea)}
            min={-8}
            max={8}
            accentClass={integralTone}
            valueLabel={exactArea > 0.15 ? "x軸より上のたまりが優勢です" : exactArea < -0.15 ? "x軸より下のたまりが優勢です" : "上と下がつり合いはじめています"}
          />

          <MathLegendRow
            items={[
              { tone: "is-cyan", label: "プラスの面積" },
              { tone: "is-pink", label: "マイナスの面積" },
              { tone: "is-orange", label: "近似の長方形" }
            ]}
          />
        </>
      }
      footer={
        <>
          <div className="math-footer-note">
            <strong>いま何が起きている？</strong>
            <p>
              積分は、今いる点の情報ではなく、区間の左から右までを <strong>ためた合計</strong> です。
              {exactArea > 0.15
                ? " 上側の面積が多いので、タンクが上にたまっています。"
                : exactArea < -0.15
                  ? " 下側の面積が多いので、タンクが下向きにたまっています。"
                  : " 上と下がほぼ打ち消し合って、タンクが 0 に近づいています。"}
            </p>
          </div>
          <MathMissionCard mission={mission} />
        </>
      }
    />
  );
}

function LinearAlgebraPlaygroundPanel() {
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const linearRange = 5.5;
  const [mode, setMode] = useState("play");
  const [missionId, setMissionId] = useState(LINEAR_MISSIONS[0].id);
  const [showBaseGrid, setShowBaseGrid] = useState(true);
  const [presetId, setPresetId] = useState("identity");
  const [shapeMode, setShapeMode] = useState("square");
  const [basis, setBasis] = useState({
    u: { x: 1, y: 0 },
    v: { x: 0, y: 1 }
  });

  const activeMission = LINEAR_MISSIONS.find((item) => item.id === missionId) || LINEAR_MISSIONS[0];
  const shapeLabel = LINEAR_SHAPES.find((item) => item.id === shapeMode)?.label || "図形";
  const determinant = useMemo(() => basis.u.x * basis.v.y - basis.u.y * basis.v.x, [basis]);
  const areaScale = Math.abs(determinant);
  const dotProduct = basis.u.x * basis.v.x + basis.u.y * basis.v.y;
  const uLength = Math.hypot(basis.u.x, basis.u.y);
  const vLength = Math.hypot(basis.v.x, basis.v.y);
  const orientation = determinant > 0.08 ? "そのまま" : determinant < -0.08 ? "反転" : "ぺたんこに近い";
  const reflected = determinant < -0.08;
  const transformationLabel = areaScale < 0.2
    ? "かなり押しつぶされています"
    : reflected
      ? "ひっくり返りながら、平面がゆがんでいます"
      : areaScale > 1.15
        ? "平面が広がりながら、形が変わっています"
        : areaScale < 0.85
        ? "平面が縮みながら、形が変わっています"
        : "面積をほぼ保ったまま、形だけが変わっています";
  const mission = useMemo(() => {
    const areaDone = Math.abs(areaScale - 2) < 0.18;
    const flipDone = determinant < -0.85 && areaScale > 0.6;
    const rotateDone =
      Math.abs(areaScale - 1) < 0.12 &&
      !reflected &&
      Math.abs(dotProduct) < 0.18 &&
      Math.abs(uLength - 1) < 0.18 &&
      Math.abs(vLength - 1) < 0.18 &&
      (Math.abs(basis.u.x - 1) > 0.15 || Math.abs(basis.v.y - 1) > 0.15);

    if (activeMission.type === "flip") {
      return {
        ...activeMission,
        done: flipDone,
        statusText: flipDone
          ? "向きが反転しました。空間が裏返っています。"
          : `まだ向きは ${orientation} です。赤か青の矢印を軸の向こう側へ越えると反転が起きやすいです。`
      };
    }

    if (activeMission.type === "rotate") {
      return {
        ...activeMission,
        done: rotateDone,
        statusText: rotateDone
          ? "面積を保ったまま回転に近い変換になりました。"
          : `面積は ${formatNumber(areaScale)} 倍、矢印どうしの角度は ${formatNumber(Math.acos(clampFloat(dotProduct / (uLength * vLength || 1), -1, 1, 0)) * 180 / Math.PI)}° です。`
      };
    }

    return {
      ...activeMission,
      done: areaDone,
      statusText: areaDone ? "2 倍の変形に到達しました。" : `いまは ${formatNumber(areaScale)} 倍です。2 倍に近づけてみましょう。`
    };
  }, [activeMission, areaScale, basis.u.x, basis.v.y, determinant, dotProduct, orientation, reflected, uLength, vLength]);
  const matrixTone = reflected ? "is-warm" : areaScale > 1.15 ? "is-positive" : areaScale < 0.85 ? "is-cool" : "is-soft";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    drawLinearAlgebraScene(context, basis, { showBaseGrid, range: linearRange, shapeMode });
  }, [basis, shapeMode, showBaseGrid]);

  function applyPreset(id) {
    const preset = LINEAR_PRESETS.find((item) => item.id === id);
    if (!preset) return;
    setPresetId(id);
    setBasis({
      u: { x: preset.basis[0][0], y: preset.basis[0][1] },
      v: { x: preset.basis[1][0], y: preset.basis[1][1] }
    });
  }

  function updateBasisComponent(vectorKey, axis, value) {
    setPresetId(null);
    setBasis((current) => ({
      ...current,
      [vectorKey]: {
        ...current[vectorKey],
        [axis]: clampFloat(value, -3.2, 3.2, current[vectorKey][axis])
      }
    }));
  }

  function resetScene() {
    applyPreset("identity");
    setShapeMode("square");
    setShowBaseGrid(true);
  }

  function randomizeTransform() {
    let next = null;
    for (let index = 0; index < 20; index += 1) {
      const candidate = {
        u: { x: clampFloat((Math.random() * 2 - 1) * 2.4, -3.2, 3.2, 1), y: clampFloat((Math.random() * 2 - 1) * 2.4, -3.2, 3.2, 0) },
        v: { x: clampFloat((Math.random() * 2 - 1) * 2.4, -3.2, 3.2, 0), y: clampFloat((Math.random() * 2 - 1) * 2.4, -3.2, 3.2, 1) }
      };
      const candidateDet = candidate.u.x * candidate.v.y - candidate.u.y * candidate.v.x;
      if (Math.abs(candidateDet) > 0.35 && Math.abs(candidateDet) < 3.4) {
        next = candidate;
        break;
      }
    }
    if (!next) return;
    setPresetId(null);
    setBasis(next);
  }

  function updateHandleFromEvent(event) {
    const canvas = canvasRef.current;
    if (!canvas || !dragRef.current) return;
    const point = eventToCanvasPoint(event, canvas);
    const world = linearScreenToWorld(point.x, point.y, canvas.width, canvas.height, linearRange);
    const next = {
      x: clampFloat(world.x, -3.2, 3.2, 0),
      y: clampFloat(world.y, -3.2, 3.2, 0)
    };
    setPresetId(null);
    setBasis((current) => ({
      ...current,
      [dragRef.current]: next
    }));
  }

  function pickHandle(event) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const point = eventToCanvasPoint(event, canvas);
    const uTip = linearWorldToScreen(basis.u.x, basis.u.y, canvas.width, canvas.height, linearRange);
    const vTip = linearWorldToScreen(basis.v.x, basis.v.y, canvas.width, canvas.height, linearRange);
    const uDistance = Math.hypot(point.x - uTip.x, point.y - uTip.y);
    const vDistance = Math.hypot(point.x - vTip.x, point.y - vTip.y);
    if (Math.min(uDistance, vDistance) > 28) return null;
    return uDistance <= vDistance ? "u" : "v";
  }

  return (
    <MathPlaygroundLayout
      workspace={
        <canvas
          ref={canvasRef}
          width={960}
          height={480}
          className="math-canvas is-draggable"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            dragRef.current = pickHandle(event);
            if (dragRef.current) updateHandleFromEvent(event);
          }}
          onPointerMove={(event) => {
            if (dragRef.current) updateHandleFromEvent(event);
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
            dragRef.current = null;
          }}
          onPointerLeave={() => {
            dragRef.current = null;
          }}
          onPointerCancel={(event) => {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
            dragRef.current = null;
          }}
        />
      }
      caption="赤と青の矢印をドラッグすると、格子全体が同じルールで変形します。数字より先に、平面がどうゆがむかを見てください。"
      controls={
        <>
          <MathPlaygroundHeader title="平面ゆがみ工房" starter="まずは矢印を引っぱる" />
          <MathModeTabs activeId={mode} onSelect={setMode} items={PLAYGROUND_MODES} />

          {mode === "play" ? (
            <>
              <MathPresetRow options={LINEAR_PRESETS} activeId={presetId} onSelect={applyPreset} />
              <MathActionRow>
                <button type="button" className="button button-ghost button-small" onClick={randomizeTransform}>おまかせ</button>
                <button type="button" className="button button-ghost button-small" onClick={resetScene}>リセット</button>
              </MathActionRow>
              <MathStoryCard title="いま見ている図形">
                <span>{shapeLabel} を、空間ごと変形しています。</span>
                <span>格子まで一緒にゆがむのが、行列の面白さです。</span>
              </MathStoryCard>
            </>
          ) : null}

          {mode === "edit" ? (
            <>
              <MathPresetRow options={LINEAR_PRESETS} activeId={presetId} onSelect={applyPreset} />
              <MathPresetRow options={LINEAR_SHAPES} activeId={shapeMode} onSelect={setShapeMode} />
              <div className="math-toggle-grid">
                <MathToggleField label="元の格子も表示" checked={showBaseGrid} onChange={setShowBaseGrid} />
              </div>
              <div className="math-number-grid">
                <MathNumberField label="u の x" value={formatNumber(basis.u.x)} min={-3.2} max={3.2} step="0.1" onChange={(value) => updateBasisComponent("u", "x", value)} />
                <MathNumberField label="u の y" value={formatNumber(basis.u.y)} min={-3.2} max={3.2} step="0.1" onChange={(value) => updateBasisComponent("u", "y", value)} />
                <MathNumberField label="v の x" value={formatNumber(basis.v.x)} min={-3.2} max={3.2} step="0.1" onChange={(value) => updateBasisComponent("v", "x", value)} />
                <MathNumberField label="v の y" value={formatNumber(basis.v.y)} min={-3.2} max={3.2} step="0.1" onChange={(value) => updateBasisComponent("v", "y", value)} />
              </div>
            </>
          ) : null}

          {mode === "mission" ? (
            <>
              <MathPresetRow options={LINEAR_MISSIONS} activeId={missionId} onSelect={setMissionId} />
              <MathStoryCard title="今回のねらい">
                {activeMission.description}
              </MathStoryCard>
              <MathActionRow>
                <button type="button" className="button button-ghost button-small" onClick={randomizeTransform}>変形を変える</button>
                <button type="button" className="button button-ghost button-small" onClick={resetScene}>やり直す</button>
              </MathActionRow>
            </>
          ) : null}

          <div className="math-kpi-grid">
            <MathKpi label="赤い矢印" value={`${formatNumber(basis.u.x)}, ${formatNumber(basis.u.y)}`} />
            <MathKpi label="青い矢印" value={`${formatNumber(basis.v.x)}, ${formatNumber(basis.v.y)}`} />
            <MathKpi label="面積の広がり" value={`${formatNumber(areaScale)} 倍`} />
            <MathKpi label="向き" value={orientation} />
          </div>

          <MathValueMeter
            label="面積の変わり方"
            value={areaScale}
            min={0}
            max={4}
            accentClass={matrixTone}
            valueLabel={reflected ? "向きが反転しています" : "1 を超えると広がり、1 未満だと縮みます"}
          />

          <div className="math-linear-preview-grid">
            <LinearSnapshotCard title="もとの空間" shapeMode={shapeMode} note="基準の格子と図形" />
            <LinearSnapshotCard
              title="いまの空間"
              basis={basis}
              shapeMode={shapeMode}
              note={reflected ? "向きが反転しています" : `${formatNumber(areaScale)} 倍に広がっています`}
              accentClass={matrixTone}
            />
          </div>

          <MathStoryCard title="いまの変形" className="math-state-card">
            <span>
              {transformationLabel} いま選んでいる{shapeLabel}の広がりは <strong>{formatNumber(areaScale)}</strong> 倍、向きは <strong>{orientation}</strong> です。
            </span>
            <div className="math-inline-matrix" aria-label="いまの変換ルール">
              <span className="math-inline-matrix-bracket">[</span>
              <div className="math-inline-matrix-grid">
                <span>{formatNumber(basis.u.x)}</span>
                <span>{formatNumber(basis.v.x)}</span>
                <span>{formatNumber(basis.u.y)}</span>
                <span>{formatNumber(basis.v.y)}</span>
              </div>
              <span className="math-inline-matrix-bracket">]</span>
            </div>
          </MathStoryCard>

          <MathStoryCard title="3Dに広げると">
            <span>いまは 2 本の矢印で「床の広がり」を見ています。</span>
            <span>3D では 3 本目の矢印が増えて、面積の代わりに <strong>体積</strong> の変化が主役になります。</span>
          </MathStoryCard>

          <MathLegendRow
            items={[
              { tone: "is-dark", label: "元の空間" },
              { tone: "is-cyan", label: "変形した格子" },
              { tone: "is-purple", label: `変形した${shapeLabel}` },
              { tone: "is-orange", label: `元の${shapeLabel}` }
            ]}
          />
        </>
      }
      footer={
        <>
          <div className="math-footer-note">
            <strong>いま何が起きている？</strong>
            <p>
              赤と青の 2 本の矢印は、平面の新しいものさしです。2 本を動かすと、選んだ図形だけでなく
              <strong> 格子ごと空間全体 </strong>
              が変わります。面積が大きくなるほど広がり、マイナスになると向きがひっくり返ります。
            </p>
          </div>
          <MathMissionCard mission={mission} />
        </>
      }
    />
  );
}

function LinearSnapshotCard({ title, basis, shapeMode, note, accentClass = "" }) {
  const width = 168;
  const height = 124;
  const range = 2.2;
  const activeBasis = basis || { u: { x: 1, y: 0 }, v: { x: 0, y: 1 } };
  const determinant = activeBasis.u.x * activeBasis.v.y - activeBasis.u.y * activeBasis.v.x;
  const samplePoints = getLinearShapePoints(shapeMode).map((point) => applyBasisTransform(point, activeBasis));
  const uTip = linearWorldToScreen(activeBasis.u.x, activeBasis.u.y, width, height, range);
  const vTip = linearWorldToScreen(activeBasis.v.x, activeBasis.v.y, width, height, range);

  return (
    <div className={`math-linear-preview-card ${accentClass}`.trim()}>
      <div className="math-linear-preview-head">
        <strong>{title}</strong>
        {note ? <span>{note}</span> : null}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="math-linear-preview-svg" aria-hidden="true">
        {[-2, -1, 0, 1, 2].map((tick) => (
          <g key={`grid-${tick}`}>
            <line
              x1={linearWorldToScreen(-range, tick, width, height, range).x}
              y1={linearWorldToScreen(-range, tick, width, height, range).y}
              x2={linearWorldToScreen(range, tick, width, height, range).x}
              y2={linearWorldToScreen(range, tick, width, height, range).y}
            />
            <line
              x1={linearWorldToScreen(tick, -range, width, height, range).x}
              y1={linearWorldToScreen(tick, -range, width, height, range).y}
              x2={linearWorldToScreen(tick, range, width, height, range).x}
              y2={linearWorldToScreen(tick, range, width, height, range).y}
            />
          </g>
        ))}
        <line
          className="math-linear-preview-axis"
          x1={linearWorldToScreen(-range, 0, width, height, range).x}
          y1={linearWorldToScreen(-range, 0, width, height, range).y}
          x2={linearWorldToScreen(range, 0, width, height, range).x}
          y2={linearWorldToScreen(range, 0, width, height, range).y}
        />
        <line
          className="math-linear-preview-axis"
          x1={linearWorldToScreen(0, -range, width, height, range).x}
          y1={linearWorldToScreen(0, -range, width, height, range).y}
          x2={linearWorldToScreen(0, range, width, height, range).x}
          y2={linearWorldToScreen(0, range, width, height, range).y}
        />
        <polygon
          className={determinant < 0 ? "is-reflected" : ""}
          points={samplePoints
            .map((point) => {
              const screen = linearWorldToScreen(point.x, point.y, width, height, range);
              return `${screen.x},${screen.y}`;
            })
            .join(" ")}
        />
        <line
          className="math-linear-preview-u"
          x1={linearWorldToScreen(0, 0, width, height, range).x}
          y1={linearWorldToScreen(0, 0, width, height, range).y}
          x2={uTip.x}
          y2={uTip.y}
        />
        <line
          className="math-linear-preview-v"
          x1={linearWorldToScreen(0, 0, width, height, range).x}
          y1={linearWorldToScreen(0, 0, width, height, range).y}
          x2={vTip.x}
          y2={vTip.y}
        />
        <circle className="math-linear-preview-u-dot" cx={uTip.x} cy={uTip.y} r="5" />
        <circle className="math-linear-preview-v-dot" cx={vTip.x} cy={vTip.y} r="5" />
      </svg>
    </div>
  );
}

function ProbabilityPlaygroundPanel() {
  const canvasRef = useRef(null);
  const autoRunRef = useRef(null);
  const [mode, setMode] = useState("play");
  const [presetId, setPresetId] = useState(PROBABILITY_PRESETS[0].id);
  const [missionId, setMissionId] = useState(PROBABILITY_MISSIONS[0].id);
  const preset = PROBABILITY_PRESETS.find((item) => item.id === presetId) || PROBABILITY_PRESETS[0];
  const [bias, setBias] = useState(preset.bias);
  const [counts, setCounts] = useState([]);
  const [totalTrials, setTotalTrials] = useState(0);
  const [lastIndex, setLastIndex] = useState(null);
  const [autoRun, setAutoRun] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [showExpectation, setShowExpectation] = useState(true);
  const [runSpeed, setRunSpeed] = useState(140);

  const probabilitySpec = useMemo(() => buildProbabilitySpec(preset, bias), [preset, bias]);
  const activeMission = PROBABILITY_MISSIONS.find((item) => item.id === missionId) || PROBABILITY_MISSIONS[0];
  const maxCount = counts.length ? Math.max(...counts, 0) : 0;
  const leadingIndex = counts.length ? counts.findIndex((count) => count === maxCount) : -1;
  const mission = useMemo(
    () => buildProbabilityMissionState(activeMission, preset, probabilitySpec, counts, totalTrials),
    [activeMission, counts, preset, probabilitySpec, totalTrials]
  );
  const stability = useMemo(() => {
    if (totalTrials === 0) return 0;
    return Math.min(100, totalTrials / 2.2);
  }, [totalTrials]);
  const statusText = useMemo(() => describeProbabilityStatus(preset, probabilitySpec, counts, totalTrials), [counts, preset, probabilitySpec, totalTrials]);

  useEffect(() => {
    setBias(preset.bias);
    setCounts(new Array(buildProbabilitySpec(preset, preset.bias).labels.length).fill(0));
    setTotalTrials(0);
    setLastIndex(null);
    setAutoRun(false);
  }, [preset.id, preset.bias]);

  useEffect(() => {
    if (counts.length === probabilitySpec.labels.length) return;
    setCounts(new Array(probabilitySpec.labels.length).fill(0));
    setTotalTrials(0);
    setLastIndex(null);
  }, [counts.length, probabilitySpec.labels.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    drawProbabilityScene(context, {
      labels: probabilitySpec.labels,
      counts,
      expected: probabilitySpec.probabilities,
      totalTrials,
      lastIndex,
      title: preset.title,
      showExpectation
    });
  }, [counts, lastIndex, preset.title, probabilitySpec, showExpectation, totalTrials]);

  useEffect(() => {
    if (!autoRun) {
      if (autoRunRef.current) window.clearInterval(autoRunRef.current);
      return;
    }

    autoRunRef.current = window.setInterval(() => {
      runProbabilityTrials(1);
    }, runSpeed);

    return () => {
      if (autoRunRef.current) window.clearInterval(autoRunRef.current);
    };
  }, [autoRun, runSpeed, probabilitySpec]);

  function runProbabilityTrials(amount) {
    setCounts((current) => {
      const next = current.length ? [...current] : new Array(probabilitySpec.labels.length).fill(0);
      let latest = null;
      for (let index = 0; index < amount; index += 1) {
        latest = sampleProbabilityIndex(probabilitySpec);
        next[latest] += 1;
      }
      setLastIndex(latest);
      return next;
    });
    setTotalTrials((current) => current + amount);
  }

  function resetScene() {
    setCounts(new Array(probabilitySpec.labels.length).fill(0));
    setTotalTrials(0);
    setLastIndex(null);
    setAutoRun(false);
  }

  function randomizeBias() {
    setBias(clampFloat(0.12 + Math.random() * 0.76, 0.05, 0.95, preset.bias));
    resetScene();
  }

  return (
    <MathPlaygroundLayout
      workspace={<canvas ref={canvasRef} width={960} height={480} className="math-canvas" />}
      caption="ボタンを押すたびに棒グラフが育ちます。偏りを変えると、期待される形と実際の揺れ方が一緒に見えてきます。"
      controls={
        <>
          <MathPlaygroundHeader title="確率・基本分布" starter="まずは 10 回押す" />
          <MathModeTabs activeId={mode} onSelect={setMode} items={PLAYGROUND_MODES} />

          {mode === "play" ? (
            <>
              <MathPresetRow options={PROBABILITY_PRESETS} activeId={presetId} onSelect={setPresetId} />
              <MathActionRow>
                <button type="button" className="button button-ghost button-small" onClick={() => runProbabilityTrials(1)}>1回</button>
                <button type="button" className="button button-ghost button-small" onClick={() => runProbabilityTrials(10)}>10回</button>
                <button type="button" className="button button-ghost button-small" onClick={() => runProbabilityTrials(100)}>100回</button>
              </MathActionRow>
              <MathPlayPauseResetBar
                isRunning={autoRun}
                onToggleRun={() => setAutoRun((current) => !current)}
                onReset={resetScene}
                onRandom={randomizeBias}
                runLabel="自動で観測"
                stopLabel="観測を止める"
                randomLabel="偏りをゆらす"
              />
              <MathSliderField label="偏り" min="0.05" max="0.95" step="0.01" value={bias} onChange={setBias} />
              <MathStoryCard title="いまの観測">
                <span>{preset.hint}</span>
                <span>公平でも短い目線では偏って見えます。回数が増えるほど、棒の形に傾向が出てきます。</span>
              </MathStoryCard>
            </>
          ) : null}

          {mode === "edit" ? (
            <>
              <MathPresetRow options={PROBABILITY_PRESETS} activeId={presetId} onSelect={setPresetId} />
              <MathSliderField label="偏り" min="0.05" max="0.95" step="0.01" value={bias} onChange={setBias} />
              <div className="math-number-grid">
                <MathNumberField
                  label="偏りの数値"
                  value={formatNumber(bias)}
                  min={0.05}
                  max={0.95}
                  step="0.01"
                  onChange={(value) => setBias(clampFloat(value, 0.05, 0.95, bias))}
                />
                <MathNumberField
                  label="自動の速さ(ms)"
                  value={runSpeed}
                  min={50}
                  max={400}
                  step="10"
                  onChange={(value) => setRunSpeed(clampNumber(value, 50, 400, runSpeed))}
                />
              </div>
              <div className="math-toggle-grid">
                <MathToggleField label="期待の形も表示" checked={showExpectation} onChange={setShowExpectation} />
                <MathToggleField label="短いヒントを表示" checked={showGuide} onChange={setShowGuide} />
              </div>
              <MathActionRow>
                <button type="button" className="button button-ghost button-small" onClick={() => runProbabilityTrials(25)}>25回追加</button>
                <button type="button" className="button button-ghost button-small" onClick={resetScene}>まっさらに戻す</button>
              </MathActionRow>
            </>
          ) : null}

          {mode === "mission" ? (
            <>
              <MathPresetRow options={PROBABILITY_MISSIONS} activeId={missionId} onSelect={setMissionId} />
              <MathStatusMessage title="今回のねらい">{activeMission.description}</MathStatusMessage>
              <MathActionRow>
                <button type="button" className="button button-ghost button-small" onClick={() => runProbabilityTrials(10)}>10回観測</button>
                <button type="button" className="button button-ghost button-small" onClick={() => runProbabilityTrials(100)}>100回観測</button>
                <button type="button" className="button button-ghost button-small" onClick={resetScene}>やり直す</button>
              </MathActionRow>
            </>
          ) : null}

          <div className="math-kpi-grid">
            <MathKpi label="観測した回数" value={totalTrials} />
            <MathKpi label="最後の結果" value={lastIndex == null ? "—" : probabilitySpec.labels[lastIndex]} />
            <MathKpi label="一番高い棒" value={leadingIndex >= 0 ? probabilitySpec.labels[leadingIndex] : "—"} />
            <MathKpi label="偏りの目安" value={formatProbabilityBias(preset, bias)} />
          </div>

          <MathValueMeter
            label="形の安定感"
            value={stability}
            min={0}
            max={100}
            displayValue={`${Math.round(stability)}%`}
            accentClass={stability > 70 ? "is-positive" : stability > 35 ? "is-soft" : "is-cool"}
            valueLabel={totalTrials < 20 ? "まだかなり揺れています" : totalTrials < 80 ? "少しずつ形が見えてきました" : "かなり形が安定してきました"}
          />

          {showGuide ? <MathStatusMessage title="状態メッセージ">{statusText}</MathStatusMessage> : null}

          <MathLegendRow
            items={[
              { tone: "is-cyan", label: "観測された高さ" },
              { tone: "is-purple", label: "期待される形" },
              { tone: "is-orange", label: "いま増えた棒" }
            ]}
          />
        </>
      }
      footer={
        <>
          <div className="math-footer-note">
            <strong>いま何が起きている？</strong>
            <p>
              ランダムでも、回数を重ねると <strong>形</strong> が見えてきます。公平でも短い目線では大きく偏り、
              長い目線になるとだんだん落ち着いていきます。
            </p>
          </div>
          <MathMissionCard mission={mission} />
        </>
      }
    />
  );
}

function LimitPlaygroundPanel() {
  const canvasRef = useRef(null);
  const autoRef = useRef(null);
  const [mode, setMode] = useState("play");
  const [presetId, setPresetId] = useState(LIMIT_PRESETS[0].id);
  const [missionId, setMissionId] = useState(LIMIT_MISSIONS[0].id);
  const preset = LIMIT_PRESETS.find((item) => item.id === presetId) || LIMIT_PRESETS[0];
  const activeMission = LIMIT_MISSIONS.find((item) => item.id === missionId) || LIMIT_MISSIONS[0];
  const [progress, setProgress] = useState(0.12);
  const [zoom, setZoom] = useState(1);
  const [autoApproach, setAutoApproach] = useState(false);
  const [showValue, setShowValue] = useState(true);
  const [showGuide, setShowGuide] = useState(true);

  const snapshot = useMemo(() => buildLimitSnapshot(preset, progress), [preset, progress]);
  const mission = useMemo(() => buildLimitMissionState(activeMission, snapshot), [activeMission, snapshot]);
  const statusText = useMemo(() => describeLimitStatus(snapshot), [snapshot]);
  const viewXRange = preset.xRange * zoom;
  const viewYRange = preset.yRange * zoom;

  useEffect(() => {
    setProgress(0.12);
    setZoom(1);
    setAutoApproach(false);
    setShowValue(true);
  }, [preset.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    drawLimitScene(context, {
      preset,
      snapshot,
      xRange: viewXRange,
      yRange: viewYRange,
      showValue
    });
  }, [preset, showValue, snapshot, viewXRange, viewYRange]);

  useEffect(() => {
    if (!autoApproach) {
      if (autoRef.current) cancelAnimationFrame(autoRef.current);
      return;
    }

    const startedAt = performance.now();
    function frame(now) {
      const phase = Math.min(1, (now - startedAt) / 2200);
      setProgress(phase);
      if (phase < 1) {
        autoRef.current = requestAnimationFrame(frame);
      } else {
        setAutoApproach(false);
      }
    }

    autoRef.current = requestAnimationFrame(frame);
    return () => {
      if (autoRef.current) cancelAnimationFrame(autoRef.current);
    };
  }, [autoApproach, preset.id]);

  function resetScene() {
    setProgress(0.12);
    setZoom(1);
    setAutoApproach(false);
  }

  function randomizeProgress() {
    setProgress(clampFloat(0.08 + Math.random() * 0.88, 0, 1, progress));
    setZoom(clampFloat(0.7 + Math.random() * 0.8, 0.65, 1.5, zoom));
  }

  return (
    <MathPlaygroundLayout
      workspace={<canvas ref={canvasRef} width={960} height={480} className="math-canvas" />}
      caption="左と右の点が問題の点へ近づきます。真ん中の値と、近づいた先が同じとは限らないところを見てください。"
      controls={
        <>
          <MathPlaygroundHeader title="極限・連続性" starter="まずは近づける" />
          <MathModeTabs activeId={mode} onSelect={setMode} items={PLAYGROUND_MODES} />

          {mode === "play" ? (
            <>
              <MathPresetRow options={LIMIT_PRESETS} activeId={presetId} onSelect={setPresetId} />
              <MathPlayPauseResetBar
                isRunning={autoApproach}
                onToggleRun={() => setAutoApproach((current) => !current)}
                onReset={resetScene}
                onRandom={randomizeProgress}
                runLabel="左右から近づく"
                stopLabel="近づくのを止める"
                randomLabel="おまかせ"
              />
              <MathSliderField label="近づき具合" min="0" max="1" step="0.01" value={progress} onChange={setProgress} />
              <MathStoryCard title="いま見ている現象">
                <span>{preset.title}</span>
                <span>左右から来る点と、真ん中に置かれた点は、別々のふるまいをすることがあります。</span>
              </MathStoryCard>
            </>
          ) : null}

          {mode === "edit" ? (
            <>
              <MathPresetRow options={LIMIT_PRESETS} activeId={presetId} onSelect={setPresetId} />
              <MathSliderField label="近づき具合" min="0" max="1" step="0.01" value={progress} onChange={setProgress} />
              <MathSliderField label="ズーム" min="0.65" max="1.5" step="0.01" value={zoom} onChange={setZoom} />
              <div className="math-toggle-grid">
                <MathToggleField label="真ん中の値も見る" checked={showValue} onChange={setShowValue} />
                <MathToggleField label="短いヒントを表示" checked={showGuide} onChange={setShowGuide} />
              </div>
            </>
          ) : null}

          {mode === "mission" ? (
            <>
              <MathPresetRow options={LIMIT_MISSIONS} activeId={missionId} onSelect={setMissionId} />
              <MathStatusMessage title="今回のねらい">{activeMission.description}</MathStatusMessage>
              <MathActionRow>
                <button type="button" className="button button-ghost button-small" onClick={() => setProgress(1)}>いっきに近づく</button>
                <button type="button" className="button button-ghost button-small" onClick={resetScene}>やり直す</button>
              </MathActionRow>
            </>
          ) : null}

          <div className="math-kpi-grid">
            <MathKpi label="左の行き先" value={formatNumber(snapshot.leftY)} />
            <MathKpi label="右の行き先" value={formatNumber(snapshot.rightY)} />
            <MathKpi label="真ん中の値" value={snapshot.pointValue == null ? "—" : formatNumber(snapshot.pointValue)} />
            <MathKpi label="判定" value={snapshot.kindLabel} />
          </div>

          <MathValueMeter
            label="左右のズレ"
            value={snapshot.sideGap}
            min={0}
            max={6}
            displayValue={formatNumber(snapshot.sideGap)}
            accentClass={snapshot.sideGap < 0.18 ? "is-positive" : snapshot.sideGap < 0.8 ? "is-soft" : "is-warm"}
            valueLabel={snapshot.sideGap < 0.18 ? "左右はかなり近いです" : snapshot.sideGap < 0.8 ? "左右はまだ少しズレています" : "左右の行き先がはっきり違います"}
          />

          {showGuide ? <MathStatusMessage title="状態メッセージ">{statusText}</MathStatusMessage> : null}

          <MathLegendRow
            items={[
              { tone: "is-orange", label: "左から近づく点" },
              { tone: "is-cool", label: "右から近づく点" },
              { tone: "is-dark", label: "真ん中の値" }
            ]}
          />
        </>
      }
      footer={
        <>
          <div className="math-footer-note">
            <strong>いま何が起きている？</strong>
            <p>
              極限は、<strong>その点に置いてある値</strong> ではなく、左右から近づいたときにどこへ向かうかを見る遊びです。
              同じ場所へ向かえば落ち着き、左右で分かれれば答えはひとつにまとまりません。
            </p>
          </div>
          <MathMissionCard mission={mission} />
        </>
      }
    />
  );
}

function NewtonPlaygroundPanel() {
  const canvasRef = useRef(null);
  const dragRef = useRef(false);
  const autoRef = useRef(null);
  const [mode, setMode] = useState("play");
  const [presetId, setPresetId] = useState(NEWTON_PRESETS[0].id);
  const [missionId, setMissionId] = useState(NEWTON_MISSIONS[0].id);
  const preset = NEWTON_PRESETS.find((item) => item.id === presetId) || NEWTON_PRESETS[0];
  const activeMission = NEWTON_MISSIONS.find((item) => item.id === missionId) || NEWTON_MISSIONS[0];
  const compiled = useMemo(() => compileMathExpression(preset.expression, ["x"]), [preset.expression]);
  const [startX, setStartX] = useState(preset.startX);
  const [stepCount, setStepCount] = useState(0);
  const [autoRun, setAutoRun] = useState(false);
  const [showTrail, setShowTrail] = useState(true);
  const [showRoots, setShowRoots] = useState(true);

  const roots = useMemo(() => (compiled.fn ? solveEquationRoots(compiled.fn, -preset.xRange, preset.xRange) : []), [compiled, preset.xRange]);
  const journey = useMemo(() => {
    if (!compiled.fn) return null;
    return buildNewtonJourney(compiled.fn, startX, stepCount, 8);
  }, [compiled, startX, stepCount]);
  const mission = useMemo(() => buildNewtonMissionState(activeMission, journey, roots), [activeMission, journey, roots]);
  const statusText = useMemo(() => describeNewtonStatus(journey), [journey]);

  useEffect(() => {
    setStartX(preset.startX);
    setStepCount(0);
    setAutoRun(false);
  }, [preset.id, preset.startX]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !journey) return;
    const context = canvas.getContext("2d");
    drawNewtonScene(context, {
      compiled,
      preset,
      journey,
      roots,
      showTrail,
      showRoots
    });
  }, [compiled, journey, preset, roots, showRoots, showTrail]);

  useEffect(() => {
    if (!autoRun || !journey || journey.status !== "running" || stepCount >= 8) {
      if (autoRef.current) window.clearTimeout(autoRef.current);
      return;
    }

    autoRef.current = window.setTimeout(() => {
      setStepCount((current) => current + 1);
    }, 700);

    return () => {
      if (autoRef.current) window.clearTimeout(autoRef.current);
    };
  }, [autoRun, journey, stepCount]);

  function resetScene() {
    setStartX(preset.startX);
    setStepCount(0);
    setAutoRun(false);
  }

  function randomStart() {
    setStartX(clampFloat((Math.random() * 2 - 1) * preset.xRange * 0.9, -preset.xRange, preset.xRange, preset.startX));
    setStepCount(0);
    setAutoRun(false);
  }

  function stepOnce() {
    setStepCount((current) => Math.min(8, current + 1));
  }

  function updateStartFromEvent(event) {
    const canvas = canvasRef.current;
    if (!canvas || !compiled.fn) return;
    const point = eventToCanvasPoint(event, canvas);
    setStartX(clampFloat(screenToWorldX(point.x, canvas.width, preset.xRange), -preset.xRange, preset.xRange, startX));
    setStepCount(0);
    setAutoRun(false);
  }

  return (
    <MathPlaygroundLayout
      workspace={
        <canvas
          ref={canvasRef}
          width={960}
          height={480}
          className="math-canvas is-draggable"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            dragRef.current = true;
            updateStartFromEvent(event);
          }}
          onPointerMove={(event) => {
            if (dragRef.current) updateStartFromEvent(event);
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
            dragRef.current = false;
          }}
          onPointerLeave={() => {
            dragRef.current = false;
          }}
          onPointerCancel={(event) => {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
            dragRef.current = false;
          }}
        />
      }
      caption="白い出発点を左右に動かすと、接線の飛び方が変わります。接線で x 軸に飛び、そこからまた登るリズムを見てください。"
      controls={
        <>
          <MathPlaygroundHeader title="ニュートン法" starter="まずは出発点を動かす" />
          <MathModeTabs activeId={mode} onSelect={setMode} items={PLAYGROUND_MODES} />

          {mode === "play" ? (
            <>
              <MathPresetRow options={NEWTON_PRESETS} activeId={presetId} onSelect={setPresetId} />
              <MathActionRow>
                <button type="button" className="button button-ghost button-small" onClick={stepOnce}>1手進める</button>
                <button type="button" className="button button-ghost button-small" onClick={() => setAutoRun((current) => !current)}>
                  {autoRun ? "追跡を止める" : "自動で追う"}
                </button>
                <button type="button" className="button button-ghost button-small" onClick={resetScene}>リセット</button>
                <button type="button" className="button button-ghost button-small" onClick={randomStart}>おまかせ</button>
              </MathActionRow>
              <MathStoryCard title="いま見ている曲線">
                <span>{preset.title}</span>
                <span>接線を引いて x 軸に飛ぶたび、答えへ近づくことも、遠ざかることもあります。</span>
              </MathStoryCard>
            </>
          ) : null}

          {mode === "edit" ? (
            <>
              <MathPresetRow options={NEWTON_PRESETS} activeId={presetId} onSelect={setPresetId} />
              <MathSliderField label="出発点" min={-preset.xRange} max={preset.xRange} step="0.01" value={startX} onChange={(value) => {
                setStartX(value);
                setStepCount(0);
                setAutoRun(false);
              }} />
              <div className="math-number-grid">
                <MathNumberField
                  label="x の出発点"
                  value={formatNumber(startX)}
                  min={-preset.xRange}
                  max={preset.xRange}
                  step="0.1"
                  onChange={(value) => {
                    setStartX(clampFloat(value, -preset.xRange, preset.xRange, startX));
                    setStepCount(0);
                  }}
                />
                <MathNumberField
                  label="手数"
                  value={stepCount}
                  min={0}
                  max={8}
                  step="1"
                  onChange={(value) => setStepCount(clampNumber(value, 0, 8, stepCount))}
                />
              </div>
              <div className="math-toggle-grid">
                <MathToggleField label="軌跡を表示" checked={showTrail} onChange={setShowTrail} />
                <MathToggleField label="根の候補を表示" checked={showRoots} onChange={setShowRoots} />
              </div>
            </>
          ) : null}

          {mode === "mission" ? (
            <>
              <MathPresetRow options={NEWTON_MISSIONS} activeId={missionId} onSelect={setMissionId} />
              <MathStatusMessage title="今回のねらい">{activeMission.description}</MathStatusMessage>
              <MathActionRow>
                <button type="button" className="button button-ghost button-small" onClick={stepOnce}>1手進める</button>
                <button type="button" className="button button-ghost button-small" onClick={randomStart}>出発点を変える</button>
                <button type="button" className="button button-ghost button-small" onClick={resetScene}>やり直す</button>
              </MathActionRow>
            </>
          ) : null}

          <div className="math-kpi-grid">
            <MathKpi label="出発点" value={formatNumber(startX)} />
            <MathKpi label="いまの x" value={journey ? formatNumber(journey.currentX) : "—"} />
            <MathKpi label="いまの高さ" value={journey ? formatNumber(journey.currentY) : "—"} />
            <MathKpi label="反復回数" value={journey ? journey.steps.length : 0} />
          </div>

          <MathValueMeter
            label="着地メーター"
            value={journey ? Math.max(0, 1 - Math.min(1, Math.abs(journey.currentY) / 4)) * 100 : 0}
            min={0}
            max={100}
            displayValue={journey?.status === "success" ? "着地" : `${journey ? Math.round(Math.max(0, 1 - Math.min(1, Math.abs(journey.currentY) / 4)) * 100) : 0}%`}
            accentClass={journey?.status === "success" ? "is-positive" : journey?.status === "failed" ? "is-warm" : "is-soft"}
            valueLabel={journey?.status === "success" ? "かなり良い出発点でした" : journey?.status === "failed" ? "この出発点は不安定です" : "接線を使って少しずつ根へ向かいます"}
          />

          <MathStatusMessage title="状態メッセージ">{statusText}</MathStatusMessage>

          <MathLegendRow
            items={[
              { tone: "is-purple", label: "接線のジャンプ" },
              { tone: "is-orange", label: "いま見ている接線" },
              { tone: "is-dark", label: "出発点" }
            ]}
          />
        </>
      }
      footer={
        <>
          <div className="math-footer-note">
            <strong>いま何が起きている？</strong>
            <p>
              ニュートン法は、いまの場所で引いた接線を使って <strong>x軸に着地する場所</strong> を予想し、
              それを次の出発点にする遊びです。同じルールでも、出発点しだいで着き方が変わります。
            </p>
          </div>
          <MathMissionCard mission={mission} />
        </>
      }
    />
  );
}

function RegressionPlaygroundPanel() {
  const canvasRef = useRef(null);
  const dragRef = useRef({ type: null, lastWorldY: 0 });
  const [mode, setMode] = useState("play");
  const [presetId, setPresetId] = useState(REGRESSION_PRESETS[0].id);
  const [missionId, setMissionId] = useState(REGRESSION_MISSIONS[0].id);
  const preset = REGRESSION_PRESETS.find((item) => item.id === presetId) || REGRESSION_PRESETS[0];
  const activeMission = REGRESSION_MISSIONS.find((item) => item.id === missionId) || REGRESSION_MISSIONS[0];
  const [noise, setNoise] = useState(preset.noise);
  const [pointCount, setPointCount] = useState(preset.pointCount);
  const [showOutlier, setShowOutlier] = useState(false);
  const [showResiduals, setShowResiduals] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [lineLeftY, setLineLeftY] = useState(0);
  const [lineRightY, setLineRightY] = useState(0);

  const dataset = useMemo(
    () => buildRegressionDataset(preset, noise, pointCount, showOutlier),
    [noise, pointCount, preset, showOutlier]
  );
  const bestFit = useMemo(() => computeRegressionLine(dataset.points), [dataset.points]);
  const outlierFreeFit = useMemo(() => computeRegressionLine(dataset.points.filter((point) => !point.isOutlier)), [dataset.points]);
  const currentLine = useMemo(
    () => buildLineModelFromEdges(-preset.xRange, lineLeftY, preset.xRange, lineRightY),
    [lineLeftY, lineRightY, preset.xRange]
  );
  const currentScore = useMemo(() => computeRegressionScore(dataset.points, currentLine), [currentLine, dataset.points]);
  const bestScore = useMemo(() => computeRegressionScore(dataset.points, bestFit), [bestFit, dataset.points]);
  const fitPercent = useMemo(() => {
    if (!Number.isFinite(currentScore.meanSquared) || !Number.isFinite(bestScore.meanSquared)) return 0;
    return Math.max(0, Math.min(100, 100 - ((currentScore.meanSquared - bestScore.meanSquared) / (bestScore.meanSquared + 0.18)) * 100));
  }, [bestScore.meanSquared, currentScore.meanSquared]);
  const mission = useMemo(
    () => buildRegressionMissionState(activeMission, currentLine, currentScore, bestFit, bestScore, outlierFreeFit, showOutlier),
    [activeMission, bestFit, bestScore, currentLine, currentScore, outlierFreeFit, showOutlier]
  );
  const statusText = useMemo(
    () => describeRegressionStatus(currentLine, currentScore, bestFit, bestScore, showOutlier, outlierFreeFit),
    [bestFit, bestScore, currentLine, currentScore, outlierFreeFit, showOutlier]
  );

  useEffect(() => {
    setNoise(preset.noise);
    setPointCount(preset.pointCount);
    setShowOutlier(false);
    setShowAnswer(false);
  }, [preset.id, preset.noise, preset.pointCount]);

  useEffect(() => {
    const seeded = makeRegressionSeedLine(preset, bestFit);
    setLineLeftY(seeded.leftY);
    setLineRightY(seeded.rightY);
  }, [bestFit, pointCount, preset, showOutlier, noise]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    drawRegressionScene(context, {
      preset,
      dataset,
      currentLine,
      bestFit,
      showAnswer,
      showResiduals
    });
  }, [bestFit, currentLine, dataset, preset, showAnswer, showResiduals]);

  function resetLine() {
    const seeded = makeRegressionSeedLine(preset, bestFit);
    setLineLeftY(seeded.leftY);
    setLineRightY(seeded.rightY);
    setShowAnswer(false);
  }

  function rerollNoise() {
    setNoise(clampFloat(0.25 + Math.random() * 1.45, 0.1, 2.2, preset.noise));
  }

  function updateLineFromPointer(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = eventToCanvasPoint(event, canvas);
    const worldY = screenToWorldY(point.y, canvas.height, preset.yRange);
    const dragState = dragRef.current;
    if (dragState.type === "left") {
      setLineLeftY(clampFloat(worldY, -preset.yRange * 1.3, preset.yRange * 1.3, lineLeftY));
      return;
    }
    if (dragState.type === "right") {
      setLineRightY(clampFloat(worldY, -preset.yRange * 1.3, preset.yRange * 1.3, lineRightY));
      return;
    }
    if (dragState.type === "line") {
      const delta = worldY - dragState.lastWorldY;
      dragState.lastWorldY = worldY;
      setLineLeftY((current) => clampFloat(current + delta, -preset.yRange * 1.3, preset.yRange * 1.3, current));
      setLineRightY((current) => clampFloat(current + delta, -preset.yRange * 1.3, preset.yRange * 1.3, current));
    }
  }

  function handlePointerDown(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = eventToCanvasPoint(event, canvas);
    const leftHandle = {
      x: worldToScreenX(-preset.xRange, canvas.width, preset.xRange),
      y: worldToScreenY(lineLeftY, canvas.height, preset.yRange)
    };
    const rightHandle = {
      x: worldToScreenX(preset.xRange, canvas.width, preset.xRange),
      y: worldToScreenY(lineRightY, canvas.height, preset.yRange)
    };
    const pointerWorld = {
      x: screenToWorldX(point.x, canvas.width, preset.xRange),
      y: screenToWorldY(point.y, canvas.height, preset.yRange)
    };
    const lineY = predictRegressionY(currentLine, pointerWorld.x);
    const linePoint = {
      x: point.x,
      y: worldToScreenY(lineY, canvas.height, preset.yRange)
    };
    let type = null;
    if (distanceBetween(point, leftHandle) < 18) type = "left";
    else if (distanceBetween(point, rightHandle) < 18) type = "right";
    else if (distanceBetween(point, linePoint) < 16) type = "line";
    if (!type) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      type,
      lastWorldY: pointerWorld.y
    };
    updateLineFromPointer(event);
  }

  function clearDrag(event) {
    event?.currentTarget?.releasePointerCapture?.(event.pointerId);
    dragRef.current = { type: null, lastWorldY: 0 };
  }

  return (
    <MathPlaygroundLayout
      workspace={
        <canvas
          ref={canvasRef}
          width={960}
          height={480}
          className="math-canvas is-draggable"
          onPointerDown={handlePointerDown}
          onPointerMove={(event) => {
            if (dragRef.current.type) updateLineFromPointer(event);
          }}
          onPointerUp={clearDrag}
          onPointerLeave={() => {
            dragRef.current = { type: null, lastWorldY: 0 };
          }}
          onPointerCancel={clearDrag}
        />
      }
      caption="線の端を引っぱると、点とのズレがすぐ変わります。残差の線が短くなるほど、隠れた傾向に寄っていきます。"
      controls={
        <>
          <MathPlaygroundHeader title="ぴったり線さがし" starter="まずは線を引っぱる" />
          <MathModeTabs activeId={mode} onSelect={setMode} items={PLAYGROUND_MODES} />

          {mode === "play" ? (
            <>
              <MathPresetRow options={REGRESSION_PRESETS} activeId={presetId} onSelect={setPresetId} />
              <MathActionRow>
                <button type="button" className="button button-ghost button-small" onClick={rerollNoise}>点をふり直す</button>
                <button type="button" className="button button-ghost button-small" onClick={resetLine}>線を戻す</button>
                <button
                  type="button"
                  className="button button-ghost button-small"
                  onClick={() => setShowAnswer((current) => !current)}
                >
                  {showAnswer ? "答えを隠す" : "答えを見る"}
                </button>
              </MathActionRow>
              <MathSliderField label="ノイズ量" min="0.1" max="2.2" step="0.01" value={noise} onChange={setNoise} />
              <MathStoryCard title="いま見ている点群">
                <span>{preset.title}</span>
                <span>少し動かすだけで、残差の長さが大きく変わります。ぴったりの線は、点の真ん中をまっすぐ通ることが多いです。</span>
              </MathStoryCard>
            </>
          ) : null}

          {mode === "edit" ? (
            <>
              <MathPresetRow options={REGRESSION_PRESETS} activeId={presetId} onSelect={setPresetId} />
              <div className="math-number-grid">
                <MathNumberField
                  label="左端の高さ"
                  value={formatNumber(lineLeftY)}
                  min={-preset.yRange * 1.3}
                  max={preset.yRange * 1.3}
                  step="0.1"
                  onChange={(value) => setLineLeftY(clampFloat(value, -preset.yRange * 1.3, preset.yRange * 1.3, lineLeftY))}
                />
                <MathNumberField
                  label="右端の高さ"
                  value={formatNumber(lineRightY)}
                  min={-preset.yRange * 1.3}
                  max={preset.yRange * 1.3}
                  step="0.1"
                  onChange={(value) => setLineRightY(clampFloat(value, -preset.yRange * 1.3, preset.yRange * 1.3, lineRightY))}
                />
              </div>
              <MathSliderField label="点の数" min="8" max="34" step="1" value={pointCount} onChange={setPointCount} />
              <MathSliderField label="ノイズ量" min="0.1" max="2.2" step="0.01" value={noise} onChange={setNoise} />
              <div className="math-toggle-grid">
                <MathToggleField label="残差を表示" checked={showResiduals} onChange={setShowResiduals} />
                <MathToggleField label="外れ値を入れる" checked={showOutlier} onChange={setShowOutlier} />
              </div>
            </>
          ) : null}

          {mode === "mission" ? (
            <>
              <MathPresetRow options={REGRESSION_MISSIONS} activeId={missionId} onSelect={setMissionId} />
              <MathStatusMessage title="今回のねらい">{activeMission.description}</MathStatusMessage>
              <MathActionRow>
                <button type="button" className="button button-ghost button-small" onClick={resetLine}>線を戻す</button>
                <button type="button" className="button button-ghost button-small" onClick={() => setShowOutlier((current) => !current)}>
                  {showOutlier ? "外れ値を外す" : "外れ値を入れる"}
                </button>
                <button type="button" className="button button-ghost button-small" onClick={() => setShowAnswer((current) => !current)}>
                  {showAnswer ? "答えを隠す" : "答えを見る"}
                </button>
              </MathActionRow>
            </>
          ) : null}

          <div className="math-kpi-grid">
            <MathKpi label="点の数" value={dataset.points.length} />
            <MathKpi label="いまの傾き" value={formatNumber(currentLine.slope)} />
            <MathKpi label="ズレ合計" value={formatNumber(currentScore.meanSquared)} />
            <MathKpi label="最適との差" value={formatNumber(Math.abs(currentLine.slope - bestFit.slope))} />
          </div>

          <MathValueMeter
            label="ズレメーター"
            value={fitPercent}
            min={0}
            max={100}
            displayValue={`${Math.round(fitPercent)}%`}
            accentClass={fitPercent > 80 ? "is-positive" : fitPercent > 55 ? "is-soft" : "is-warm"}
            valueLabel={fitPercent > 80 ? "かなりそれっぽい線です" : fitPercent > 55 ? "だいぶ傾向をつかめています" : "まだズレが大きいです"}
          />

          <MathStatusMessage title="状態メッセージ">{statusText}</MathStatusMessage>

          <MathLegendRow
            items={[
              { tone: "is-dark", label: "散布図" },
              { tone: "is-orange", label: "今の線" },
              { tone: "is-purple", label: "答えの線" },
              { tone: "is-cool", label: "残差" }
            ]}
          />
        </>
      }
      footer={
        <>
          <div className="math-footer-note">
            <strong>いま何が起きている？</strong>
            <p>
              回帰分析は、ばらついた点の中から <strong>一番それっぽい流れ</strong> を見抜く遊びです。線を少し動かすだけで、
              ずれの総量がぐっと変わります。
            </p>
          </div>
          <MathMissionCard mission={mission} />
        </>
      }
    />
  );
}

function TaylorPlaygroundPanel() {
  const canvasRef = useRef(null);
  const dragRef = useRef(false);
  const [mode, setMode] = useState("play");
  const [presetId, setPresetId] = useState(TAYLOR_PRESETS[0].id);
  const [missionId, setMissionId] = useState(TAYLOR_MISSIONS[0].id);
  const [degreeId, setDegreeId] = useState(TAYLOR_DEGREES[1].id);
  const preset = TAYLOR_PRESETS.find((item) => item.id === presetId) || TAYLOR_PRESETS[0];
  const activeMission = TAYLOR_MISSIONS.find((item) => item.id === missionId) || TAYLOR_MISSIONS[0];
  const degree = Number(TAYLOR_DEGREES.find((item) => item.id === degreeId)?.value || 2);
  const [centerX, setCenterX] = useState(preset.center);
  const [windowRadius, setWindowRadius] = useState(1.15);
  const [showErrorBand, setShowErrorBand] = useState(true);
  const [showOriginal, setShowOriginal] = useState(true);

  const approximation = useMemo(() => buildTaylorApproximation(preset, centerX, degree), [centerX, degree, preset]);
  const localError = useMemo(
    () => measureTaylorError(preset.fn, approximation.fn, centerX, windowRadius, preset.minCenter, preset.maxCenter),
    [approximation.fn, centerX, preset, windowRadius]
  );
  const globalError = useMemo(
    () => measureTaylorError(preset.fn, approximation.fn, centerX, windowRadius * 2.4, preset.minCenter, preset.maxCenter),
    [approximation.fn, centerX, preset, windowRadius]
  );
  const mission = useMemo(
    () => buildTaylorMissionState(activeMission, centerX, degree, windowRadius, localError),
    [activeMission, centerX, degree, localError, windowRadius]
  );
  const statusText = useMemo(
    () => describeTaylorStatus(localError, globalError, degree, centerX, preset),
    [centerX, degree, globalError, localError, preset]
  );
  const similarity = Math.max(0, Math.min(100, 100 - localError * 180));

  useEffect(() => {
    setCenterX(preset.center);
    setWindowRadius(1.15);
    setDegreeId(TAYLOR_DEGREES[1].id);
  }, [preset.center, preset.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    drawTaylorScene(context, {
      preset,
      approximation,
      centerX,
      windowRadius,
      degree,
      showErrorBand,
      showOriginal
    });
  }, [approximation, centerX, degree, preset, showErrorBand, showOriginal, windowRadius]);

  function resetScene() {
    setCenterX(preset.center);
    setWindowRadius(1.15);
    setDegreeId(TAYLOR_DEGREES[1].id);
  }

  function randomCenter() {
    setCenterX(clampFloat(preset.minCenter + Math.random() * (preset.maxCenter - preset.minCenter), preset.minCenter, preset.maxCenter, preset.center));
  }

  function updateCenterFromEvent(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = eventToCanvasPoint(event, canvas);
    setCenterX(clampFloat(screenToWorldX(point.x, canvas.width, preset.xRange), preset.minCenter, preset.maxCenter, centerX));
  }

  return (
    <MathPlaygroundLayout
      workspace={
        <canvas
          ref={canvasRef}
          width={960}
          height={480}
          className="math-canvas is-draggable"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            dragRef.current = true;
            updateCenterFromEvent(event);
          }}
          onPointerMove={(event) => {
            if (dragRef.current) updateCenterFromEvent(event);
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
            dragRef.current = false;
          }}
          onPointerLeave={() => {
            dragRef.current = false;
          }}
          onPointerCancel={(event) => {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
            dragRef.current = false;
          }}
        />
      }
      caption="中心点を動かすと、近似が得意な場所が変わります。次数を上げると、近く限定のコピーが少しずつうまくなります。"
      controls={
        <>
          <MathPlaygroundHeader title="近く限定コピー機" starter="まずは中心を動かす" />
          <MathModeTabs activeId={mode} onSelect={setMode} items={PLAYGROUND_MODES} />

          {mode === "play" ? (
            <>
              <MathPresetRow options={TAYLOR_PRESETS} activeId={presetId} onSelect={setPresetId} />
              <MathPresetRow options={TAYLOR_DEGREES} activeId={degreeId} onSelect={setDegreeId} />
              <MathActionRow>
                <button type="button" className="button button-ghost button-small" onClick={randomCenter}>中心をずらす</button>
                <button type="button" className="button button-ghost button-small" onClick={resetScene}>リセット</button>
              </MathActionRow>
              <MathSliderField label="観察範囲" min="0.4" max="2.4" step="0.01" value={windowRadius} onChange={setWindowRadius} />
              <MathStoryCard title="いま見ているコピー">
                <span>{preset.title}</span>
                <span>近くではそっくりでも、少し離れると正体がばれます。次数を上げるとコピーが育ちます。</span>
              </MathStoryCard>
            </>
          ) : null}

          {mode === "edit" ? (
            <>
              <MathPresetRow options={TAYLOR_PRESETS} activeId={presetId} onSelect={setPresetId} />
              <MathPresetRow options={TAYLOR_DEGREES} activeId={degreeId} onSelect={setDegreeId} />
              <div className="math-number-grid">
                <MathNumberField
                  label="中心"
                  value={formatNumber(centerX)}
                  min={preset.minCenter}
                  max={preset.maxCenter}
                  step="0.1"
                  onChange={(value) => setCenterX(clampFloat(value, preset.minCenter, preset.maxCenter, centerX))}
                />
                <MathNumberField
                  label="観察範囲"
                  value={formatNumber(windowRadius)}
                  min={0.4}
                  max={2.4}
                  step="0.1"
                  onChange={(value) => setWindowRadius(clampFloat(value, 0.4, 2.4, windowRadius))}
                />
              </div>
              <div className="math-toggle-grid">
                <MathToggleField label="元の曲線を表示" checked={showOriginal} onChange={setShowOriginal} />
                <MathToggleField label="誤差の帯を表示" checked={showErrorBand} onChange={setShowErrorBand} />
              </div>
            </>
          ) : null}

          {mode === "mission" ? (
            <>
              <MathPresetRow options={TAYLOR_MISSIONS} activeId={missionId} onSelect={setMissionId} />
              <MathStatusMessage title="今回のねらい">{activeMission.description}</MathStatusMessage>
              <MathActionRow>
                <button type="button" className="button button-ghost button-small" onClick={() => setDegreeId(TAYLOR_DEGREES[Math.min(TAYLOR_DEGREES.length - 1, TAYLOR_DEGREES.findIndex((item) => item.id === degreeId) + 1)].id)}>
                  次数を上げる
                </button>
                <button type="button" className="button button-ghost button-small" onClick={randomCenter}>中心をずらす</button>
                <button type="button" className="button button-ghost button-small" onClick={resetScene}>やり直す</button>
              </MathActionRow>
            </>
          ) : null}

          <div className="math-kpi-grid">
            <MathKpi label="中心" value={formatNumber(centerX)} />
            <MathKpi label="次数" value={`${degree}次`} />
            <MathKpi label="近くの誤差" value={formatNumber(localError)} />
            <MathKpi label="広めの誤差" value={formatNumber(globalError)} />
          </div>

          <MathValueMeter
            label="そっくり度"
            value={similarity}
            min={0}
            max={100}
            displayValue={`${Math.round(similarity)}%`}
            accentClass={similarity > 82 ? "is-positive" : similarity > 55 ? "is-soft" : "is-warm"}
            valueLabel={similarity > 82 ? "この近くではかなりそっくりです" : similarity > 55 ? "少し離れると正体がばれます" : "まだかなりズレています"}
          />

          <MathStatusMessage title="状態メッセージ">{statusText}</MathStatusMessage>

          <MathLegendRow
            items={[
              { tone: "is-dark", label: "元の曲線" },
              { tone: "is-purple", label: "近似曲線" },
              { tone: "is-orange", label: "観察範囲" }
            ]}
          />
        </>
      }
      footer={
        <>
          <div className="math-footer-note">
            <strong>いま何が起きている？</strong>
            <p>
              テイラー展開は、複雑な曲線を <strong>その場の近く限定でまねる</strong> 遊びです。中心を変えると似る場所が変わり、
              次数を上げるとコピーの精度が育っていきます。
            </p>
          </div>
          <MathMissionCard mission={mission} />
        </>
      }
    />
  );
}

function EigenPlaygroundPanel() {
  const canvasRef = useRef(null);
  const dragRef = useRef(false);
  const [mode, setMode] = useState("play");
  const [presetId, setPresetId] = useState(EIGEN_PRESETS[0].id);
  const [missionId, setMissionId] = useState(EIGEN_MISSIONS[0].id);
  const preset = EIGEN_PRESETS.find((item) => item.id === presetId) || EIGEN_PRESETS[0];
  const activeMission = EIGEN_MISSIONS.find((item) => item.id === missionId) || EIGEN_MISSIONS[0];
  const [vector, setVector] = useState(preset.start);
  const [showBaseGrid, setShowBaseGrid] = useState(true);
  const [showAxesHint, setShowAxesHint] = useState(false);
  const [foundAxes, setFoundAxes] = useState([]);

  const transformed = useMemo(() => applyBasisTransform(vector, preset.basis), [preset.basis, vector]);
  const eigenData = useMemo(() => computeEigenDirections(preset.basis), [preset.basis]);
  const axisInfo = useMemo(() => analyzeEigenDirection(vector, transformed, eigenData), [eigenData, transformed, vector]);
  const mission = useMemo(
    () => buildEigenMissionState(activeMission, axisInfo, eigenData, foundAxes),
    [activeMission, axisInfo, eigenData, foundAxes]
  );
  const statusText = useMemo(() => describeEigenStatus(axisInfo, eigenData), [axisInfo, eigenData]);

  useEffect(() => {
    setVector(preset.start);
    setFoundAxes([]);
  }, [preset.id, preset.start]);

  useEffect(() => {
    if (!axisInfo.matchId) return;
    setFoundAxes((current) => (current.includes(axisInfo.matchId) ? current : [...current, axisInfo.matchId]));
  }, [axisInfo.matchId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    drawEigenScene(context, {
      preset,
      vector,
      transformed,
      eigenData,
      axisInfo,
      showBaseGrid,
      showAxesHint
    });
  }, [axisInfo, eigenData, preset, showAxesHint, showBaseGrid, transformed, vector]);

  function resetScene() {
    setVector(preset.start);
    setFoundAxes([]);
  }

  function randomVector() {
    const angle = Math.random() * Math.PI * 2;
    const length = 0.9 + Math.random() * 2.2;
    setVector({
      x: Math.cos(angle) * length,
      y: Math.sin(angle) * length
    });
  }

  function updateVectorFromEvent(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = eventToCanvasPoint(event, canvas);
    const world = linearScreenToWorld(point.x, point.y, canvas.width, canvas.height, preset.range);
    setVector(clampVectorMagnitude(world, preset.range * 0.92));
  }

  return (
    <MathPlaygroundLayout
      workspace={
        <canvas
          ref={canvasRef}
          width={960}
          height={480}
          className="math-canvas is-draggable"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            dragRef.current = true;
            updateVectorFromEvent(event);
          }}
          onPointerMove={(event) => {
            if (dragRef.current) updateVectorFromEvent(event);
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
            dragRef.current = false;
          }}
          onPointerLeave={() => {
            dragRef.current = false;
          }}
          onPointerCancel={(event) => {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
            dragRef.current = false;
          }}
        />
      }
      caption="黒い矢印を動かすと、変換後のオレンジの矢印がどうぶれるかが見えます。向きがほとんど変わらない瞬間が、特別な軸です。"
      controls={
        <>
          <MathPlaygroundHeader title="ぶれない向き探し" starter="まずは矢印を回す" />
          <MathModeTabs activeId={mode} onSelect={setMode} items={PLAYGROUND_MODES} />

          {mode === "play" ? (
            <>
              <MathPresetRow options={EIGEN_PRESETS} activeId={presetId} onSelect={setPresetId} />
              <MathActionRow>
                <button type="button" className="button button-ghost button-small" onClick={randomVector}>向きを変える</button>
                <button type="button" className="button button-ghost button-small" onClick={resetScene}>リセット</button>
              </MathActionRow>
              <MathStoryCard title="いま見ている変形">
                <span>{preset.title}</span>
                <span>ほとんどの向きはぶれますが、一部だけ向きを保ったまま伸び縮みします。それが特別な軸です。</span>
              </MathStoryCard>
            </>
          ) : null}

          {mode === "edit" ? (
            <>
              <MathPresetRow options={EIGEN_PRESETS} activeId={presetId} onSelect={setPresetId} />
              <div className="math-number-grid">
                <MathNumberField
                  label="x"
                  value={formatNumber(vector.x)}
                  min={-preset.range}
                  max={preset.range}
                  step="0.1"
                  onChange={(value) => setVector((current) => clampVectorMagnitude({ ...current, x: value }, preset.range * 0.92))}
                />
                <MathNumberField
                  label="y"
                  value={formatNumber(vector.y)}
                  min={-preset.range}
                  max={preset.range}
                  step="0.1"
                  onChange={(value) => setVector((current) => clampVectorMagnitude({ ...current, y: value }, preset.range * 0.92))}
                />
              </div>
              <div className="math-toggle-grid">
                <MathToggleField label="もとの格子を表示" checked={showBaseGrid} onChange={setShowBaseGrid} />
                <MathToggleField label="特別な軸のヒント" checked={showAxesHint} onChange={setShowAxesHint} />
              </div>
            </>
          ) : null}

          {mode === "mission" ? (
            <>
              <MathPresetRow options={EIGEN_MISSIONS} activeId={missionId} onSelect={setMissionId} />
              <MathStatusMessage title="今回のねらい">{activeMission.description}</MathStatusMessage>
              <MathActionRow>
                <button type="button" className="button button-ghost button-small" onClick={randomVector}>別の向きを試す</button>
                <button type="button" className="button button-ghost button-small" onClick={resetScene}>やり直す</button>
              </MathActionRow>
            </>
          ) : null}

          <div className="math-kpi-grid">
            <MathKpi label="ズレ角" value={`${formatNumber(axisInfo.axisDriftDeg)}°`} />
            <MathKpi label="倍率" value={formatNumber(axisInfo.scale)} />
            <MathKpi label="見つけた軸" value={foundAxes.length} />
            <MathKpi label="向き" value={axisInfo.reversed ? "反転あり" : "そのまま"} />
          </div>

          <MathValueMeter
            label="ぶれなさメーター"
            value={Math.max(0, 100 - axisInfo.axisDriftDeg * 8)}
            min={0}
            max={100}
            displayValue={`${Math.round(Math.max(0, 100 - axisInfo.axisDriftDeg * 8))}%`}
            accentClass={axisInfo.isEigenLike ? "is-positive" : axisInfo.axisDriftDeg < 18 ? "is-soft" : "is-cool"}
            valueLabel={axisInfo.isEigenLike ? "特別な向きを見つけました" : axisInfo.axisDriftDeg < 18 ? "かなり近い向きです" : "この向きはかなりぶれます"}
          />

          <MathStatusMessage title="状態メッセージ">{statusText}</MathStatusMessage>

          <MathLegendRow
            items={[
              { tone: "is-dark", label: "入力ベクトル" },
              { tone: "is-orange", label: "変換後ベクトル" },
              { tone: "is-purple", label: "特別な軸" }
            ]}
          />
        </>
      }
      footer={
        <>
          <div className="math-footer-note">
            <strong>いま何が起きている？</strong>
            <p>
              固有値・固有ベクトルは、変形しても <strong>向きがぶれない特別な方向</strong> を見つける遊びです。
              その方向だけ、向きを保ったまま伸び縮みします。
            </p>
          </div>
          <MathMissionCard mission={mission} />
        </>
      }
    />
  );
}

function GeometryPanel() {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("point");
  const [points, setPoints] = useState([]);
  const [segments, setSegments] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const [circles, setCircles] = useState([]);
  const [segmentDraft, setSegmentDraft] = useState(null);
  const [polygonDraft, setPolygonDraft] = useState([]);
  const [circleDraft, setCircleDraft] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    drawGeometryScene(context, {
      points,
      segments,
      polygons,
      circles,
      polygonDraft,
      segmentDraft,
      circleDraft
    });
  }, [circleDraft, circles, points, polygonDraft, polygons, segmentDraft, segments]);

  function handleCanvasClick(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    const world = geometryScreenToWorld(x, y, canvas.width, canvas.height);

    if (tool === "point") {
      setPoints((current) => [...current, { ...world, label: nextPointLabel(current.length) }]);
      return;
    }

    if (tool === "segment") {
      if (!segmentDraft) {
        setSegmentDraft(world);
      } else {
        setSegments((current) => [...current, { start: segmentDraft, end: world }]);
        setSegmentDraft(null);
      }
      return;
    }

    if (tool === "polygon") {
      setPolygonDraft((current) => [...current, world]);
      return;
    }

    if (tool === "circle") {
      if (!circleDraft) {
        setCircleDraft(world);
      } else {
        setCircles((current) => [
          ...current,
          {
            center: circleDraft,
            radius: distanceBetween(circleDraft, world)
          }
        ]);
        setCircleDraft(null);
      }
    }
  }

  function clearAll() {
    setPoints([]);
    setSegments([]);
    setPolygons([]);
    setCircles([]);
    setSegmentDraft(null);
    setPolygonDraft([]);
    setCircleDraft(null);
  }

  function closePolygon() {
    if (polygonDraft.length < 3) return;
    setPolygons((current) => [...current, polygonDraft]);
    setPolygonDraft([]);
  }

  return (
    <div className="math-panel-grid">
      <div className="surface math-workspace-card">
        <canvas ref={canvasRef} width={960} height={480} className="math-canvas" onClick={handleCanvasClick} />
      </div>

      <div className="surface math-side-card">
        <div className="math-control-stack">
          <div className="math-chip-row">
            {GEOMETRY_TOOLS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`button button-ghost button-small ${tool === item.id ? "is-active" : ""}`}
                onClick={() => setTool(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="math-readout">
            <strong>{toolLabel(tool)}</strong>
            <span>{geometryHint(tool, segmentDraft, polygonDraft, circleDraft)}</span>
          </div>

          <div className="math-kpi-grid">
            <div className="math-kpi">
              <strong>{points.length}</strong>
              <span>点</span>
            </div>
            <div className="math-kpi">
              <strong>{segments.length}</strong>
              <span>線分</span>
            </div>
            <div className="math-kpi">
              <strong>{polygons.length}</strong>
              <span>多角形</span>
            </div>
            <div className="math-kpi">
              <strong>{circles.length}</strong>
              <span>円</span>
            </div>
          </div>

          <div className="hero-actions">
            <button type="button" className="button button-secondary" onClick={closePolygon} disabled={polygonDraft.length < 3}>
              多角形を閉じる
            </button>
            <button type="button" className="button button-ghost" onClick={clearAll}>
              クリア
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpaceGeometryPanel() {
  const canvasRef = useRef(null);
  const [expression, setExpression] = useState("sin(sqrt(x^2 + y^2))");
  const [rotationX, setRotationX] = useState(0.85);
  const [rotationY, setRotationY] = useState(-0.8);
  const [zoom, setZoom] = useState(34);
  const [zScale, setZScale] = useState(1.7);
  const [gridRange, setGridRange] = useState(5);

  const compiled = useMemo(() => compileMathExpression(expression, ["x", "y"]), [expression]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    drawSurfaceScene(context, {
      compiled,
      expression,
      rotationX,
      rotationY,
      zoom,
      zScale,
      gridRange
    });
  }, [compiled, expression, gridRange, rotationX, rotationY, zScale, zoom]);

  return (
    <div className="math-panel-grid">
      <div className="surface math-workspace-card">
        <canvas ref={canvasRef} width={960} height={480} className="math-canvas" />
      </div>

      <div className="surface math-side-card">
        <div className="math-control-stack">
          <label className="field">
            <span>z = f(x, y)</span>
            <input value={expression} onChange={(event) => setExpression(event.target.value)} placeholder="sin(sqrt(x^2+y^2))" />
          </label>

          <div className="math-chip-row">
            {SURFACE_PRESETS.map((preset) => (
              <button key={preset} type="button" className="button button-ghost button-small" onClick={() => setExpression(preset)}>
                {preset}
              </button>
            ))}
          </div>

          <label className="field">
            <span>回転 X</span>
            <input
              type="range"
              min="-1.57"
              max="1.57"
              step="0.01"
              value={rotationX}
              onChange={(event) => setRotationX(Number(event.target.value))}
            />
          </label>

          <label className="field">
            <span>回転 Y</span>
            <input
              type="range"
              min="-3.14"
              max="3.14"
              step="0.01"
              value={rotationY}
              onChange={(event) => setRotationY(Number(event.target.value))}
            />
          </label>

          <div className="math-mini-grid">
            <label className="field">
              <span>ズーム</span>
              <input
                type="number"
                min="12"
                max="60"
                step="1"
                value={zoom}
                onChange={(event) => setZoom(clampNumber(event.target.value, 12, 60, 34))}
              />
            </label>
            <label className="field">
              <span>高さ倍率</span>
              <input
                type="number"
                min="0.5"
                max="5"
                step="0.1"
                value={zScale}
                onChange={(event) => setZScale(clampFloat(event.target.value, 0.5, 5, 1.7))}
              />
            </label>
            <label className="field">
              <span>範囲</span>
              <input
                type="number"
                min="3"
                max="8"
                step="1"
                value={gridRange}
                onChange={(event) => setGridRange(clampNumber(event.target.value, 3, 8, 5))}
              />
            </label>
          </div>

          <div className="math-readout">
            <strong>{compiled.error ? "式を確認してください" : "ワイヤーフレームを表示中"}</strong>
            <span>{compiled.error || "曲面の山や谷を見たい位置まで回転してください。"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CasPanel() {
  const [polyInput, setPolyInput] = useState("(x + 2) * (x - 1) * (x - 3)");
  const [equationInput, setEquationInput] = useState("x^3 - x - 2 = 0");
  const [solveMin, setSolveMin] = useState(-10);
  const [solveMax, setSolveMax] = useState(10);
  const [analysisExpr, setAnalysisExpr] = useState("sin(x)");
  const [derivativePoint, setDerivativePoint] = useState(1);
  const [integralA, setIntegralA] = useState(0);
  const [integralB, setIntegralB] = useState(3.14);

  const polynomialResult = useMemo(() => {
    try {
      const polynomial = parsePolynomial(polyInput);
      return {
        expanded: formatPolynomial(polynomial),
        factorized: factorPolynomial(polynomial),
        derivative: formatPolynomial(derivePolynomial(polynomial))
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }, [polyInput]);

  const solverResult = useMemo(() => {
    try {
      const solveFn = compileEquation(equationInput);
      return {
        roots: solveEquationRoots(solveFn, solveMin, solveMax)
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }, [equationInput, solveMax, solveMin]);

  const calculusResult = useMemo(() => {
    try {
      const compiled = compileMathExpression(analysisExpr, ["x"]);
      if (compiled.error) {
        throw new Error(compiled.error);
      }

      return {
        slope: numericDerivative(compiled.fn, derivativePoint),
        area: simpsonIntegral(compiled.fn, integralA, integralB)
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }, [analysisExpr, derivativePoint, integralA, integralB]);

  return (
    <div className="math-panel-grid math-panel-grid-stacked">
      <div className="surface math-card">
        <div className="math-card-head">
          <h2>多項式</h2>
        </div>
        <div className="math-mini-grid">
          <label className="field">
            <span>式</span>
            <input value={polyInput} onChange={(event) => setPolyInput(event.target.value)} placeholder="(x + 1) * (x - 2)" />
          </label>
          <div className="math-results-list">
            <div className="math-readout">
              <strong>展開</strong>
              <span>{polynomialResult.error || polynomialResult.expanded}</span>
            </div>
            <div className="math-readout">
              <strong>因数分解</strong>
              <span>{polynomialResult.error || polynomialResult.factorized}</span>
            </div>
            <div className="math-readout">
              <strong>微分</strong>
              <span>{polynomialResult.error || polynomialResult.derivative}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="surface math-card">
        <div className="math-card-head">
          <h2>方程式を解く</h2>
        </div>
        <div className="math-mini-grid math-mini-grid-wide">
          <label className="field">
            <span>方程式</span>
            <input value={equationInput} onChange={(event) => setEquationInput(event.target.value)} placeholder="x^2 - 4 = 0" />
          </label>
          <label className="field">
            <span>範囲 min</span>
            <input type="number" value={solveMin} onChange={(event) => setSolveMin(Number(event.target.value))} />
          </label>
          <label className="field">
            <span>範囲 max</span>
            <input type="number" value={solveMax} onChange={(event) => setSolveMax(Number(event.target.value))} />
          </label>
        </div>
        <div className="math-readout">
          <strong>解</strong>
          <span>
            {solverResult.error
              ? solverResult.error
              : solverResult.roots.length
                ? solverResult.roots.map((root) => `x ≈ ${formatNumber(root)}`).join(" / ")
                : "範囲内で解を見つけられませんでした。"}
          </span>
        </div>
      </div>

      <div className="surface math-card">
        <div className="math-card-head">
          <h2>微分 / 積分</h2>
        </div>
        <div className="math-mini-grid math-mini-grid-wide">
          <label className="field">
            <span>f(x)</span>
            <input value={analysisExpr} onChange={(event) => setAnalysisExpr(event.target.value)} placeholder="sin(x)" />
          </label>
          <label className="field">
            <span>微分する点</span>
            <input
              type="number"
              value={derivativePoint}
              onChange={(event) => setDerivativePoint(Number(event.target.value))}
            />
          </label>
          <label className="field">
            <span>積分 a</span>
            <input type="number" value={integralA} onChange={(event) => setIntegralA(Number(event.target.value))} />
          </label>
          <label className="field">
            <span>積分 b</span>
            <input type="number" value={integralB} onChange={(event) => setIntegralB(Number(event.target.value))} />
          </label>
        </div>
        <div className="math-results-list">
          <div className="math-readout">
            <strong>微分係数</strong>
            <span>{calculusResult.error ? calculusResult.error : formatNumber(calculusResult.slope)}</span>
          </div>
          <div className="math-readout">
            <strong>定積分</strong>
            <span>{calculusResult.error ? calculusResult.error : formatNumber(calculusResult.area)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalculatorPanel() {
  const [expression, setExpression] = useState("sin(pi / 4) + 2^3");
  const [statsInput, setStatsInput] = useState("3, 5, 7, 11");

  const calculation = useMemo(() => {
    if (!expression.trim()) return { value: "0" };
    const compiled = compileMathExpression(expression, []);
    if (compiled.error) return { error: compiled.error };

    try {
      const value = compiled.fn();
      return { value: formatNumber(value) };
    } catch (error) {
      return { error: error.message };
    }
  }, [expression]);

  const stats = useMemo(() => {
    const values = statsInput
      .split(/[\n, ]+/)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (!values.length) return null;

    const sorted = [...values].sort((left, right) => left - right);
    const sum = values.reduce((total, value) => total + value, 0);
    const mean = sum / values.length;
    const median =
      sorted.length % 2 === 1
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;

    return {
      count: values.length,
      sum,
      mean,
      median,
      std: Math.sqrt(variance),
      min: sorted[0],
      max: sorted[sorted.length - 1]
    };
  }, [statsInput]);

  function appendValue(value) {
    setExpression((current) => `${current}${value}`);
  }

  return (
    <div className="math-panel-grid">
      <div className="surface math-workspace-card math-calculator-card">
        <div className="math-calc-display">
          <div className="math-calc-expression">{expression || "0"}</div>
          <strong className="math-calc-result">{calculation.error ? calculation.error : calculation.value}</strong>
        </div>

        <div className="math-calculator-keypad">
          {CALCULATOR_KEYS.flat().map((key) => (
            <button key={key} type="button" className="button button-ghost math-key" onClick={() => appendValue(key)}>
              {key}
            </button>
          ))}
          <button type="button" className="button button-secondary math-key" onClick={() => setExpression("")}>
            AC
          </button>
          <button type="button" className="button button-ghost math-key" onClick={() => setExpression((current) => current.slice(0, -1))}>
            ⌫
          </button>
          <button type="button" className="button button-primary math-key" onClick={() => setExpression((current) => `${current}`)}>
            =
          </button>
        </div>
      </div>

      <div className="surface math-side-card">
        <div className="math-control-stack">
          <label className="field">
            <span>式</span>
            <input value={expression} onChange={(event) => setExpression(event.target.value)} placeholder="sin(pi / 4) + 2^3" />
          </label>

          <label className="field">
            <span>統計データ</span>
            <textarea
              rows={6}
              value={statsInput}
              onChange={(event) => setStatsInput(event.target.value)}
              placeholder="3, 5, 7, 11"
            />
          </label>

          {stats ? (
            <div className="math-stats-grid">
              <MathStat label="件数" value={stats.count} />
              <MathStat label="合計" value={formatNumber(stats.sum)} />
              <MathStat label="平均" value={formatNumber(stats.mean)} />
              <MathStat label="中央値" value={formatNumber(stats.median)} />
              <MathStat label="標準偏差" value={formatNumber(stats.std)} />
              <MathStat label="最小 / 最大" value={`${formatNumber(stats.min)} / ${formatNumber(stats.max)}`} />
            </div>
          ) : (
            <div className="math-readout">
              <strong>統計</strong>
              <span>数値をカンマ区切りで入れると、基本統計を表示します。</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MathStat({ label, value }) {
  return (
    <div className="math-kpi">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function compileEquation(input) {
  const source = `${input || ""}`.trim();
  if (!source) {
    throw new Error("方程式を入力してください。");
  }

  if (source.includes("=")) {
    const [left, right] = source.split("=");
    const leftCompiled = compileMathExpression(left, ["x"]);
    const rightCompiled = compileMathExpression(right, ["x"]);

    if (leftCompiled.error) throw new Error(leftCompiled.error);
    if (rightCompiled.error) throw new Error(rightCompiled.error);

    return (x) => leftCompiled.fn(x) - rightCompiled.fn(x);
  }

  const compiled = compileMathExpression(source, ["x"]);
  if (compiled.error) throw new Error(compiled.error);
  return compiled.fn;
}

function solveEquationRoots(fn, min, max) {
  const roots = [];
  const steps = 280;
  let previousX = min;
  let previousY = safeEvaluate(fn, previousX);

  for (let index = 1; index <= steps; index += 1) {
    const currentX = min + ((max - min) * index) / steps;
    const currentY = safeEvaluate(fn, currentX);

    if (Number.isFinite(previousY) && Math.abs(previousY) < 1e-6) {
      pushUnique(roots, previousX);
    }

    if (Number.isFinite(previousY) && Number.isFinite(currentY) && previousY * currentY < 0) {
      pushUnique(roots, bisectRoot(fn, previousX, currentX));
    }

    previousX = currentX;
    previousY = currentY;
  }

  return roots.sort((left, right) => left - right);
}

function bisectRoot(fn, left, right) {
  let min = left;
  let max = right;
  let minValue = safeEvaluate(fn, min);
  let maxValue = safeEvaluate(fn, max);

  for (let index = 0; index < 40; index += 1) {
    const middle = (min + max) / 2;
    const middleValue = safeEvaluate(fn, middle);

    if (!Number.isFinite(middleValue) || Math.abs(middleValue) < 1e-7) {
      return middle;
    }

    if (minValue * middleValue <= 0) {
      max = middle;
      maxValue = middleValue;
    } else {
      min = middle;
      minValue = middleValue;
    }
  }

  return (min + max) / 2;
}

function numericDerivative(fn, x) {
  const step = 1e-4;
  return (safeEvaluate(fn, x + step) - safeEvaluate(fn, x - step)) / (2 * step);
}

function simpsonIntegral(fn, left, right) {
  const steps = 240;
  if (left === right) return 0;

  let a = left;
  let b = right;
  let sign = 1;

  if (a > b) {
    a = right;
    b = left;
    sign = -1;
  }

  const width = (b - a) / steps;
  let total = safeEvaluate(fn, a) + safeEvaluate(fn, b);

  for (let index = 1; index < steps; index += 1) {
    const x = a + width * index;
    total += safeEvaluate(fn, x) * (index % 2 === 0 ? 2 : 4);
  }

  return sign * (total * width) / 3;
}

function compileMathExpression(expression, variables = []) {
  const source = `${expression || ""}`.trim();
  if (!source) {
    return { error: "式を入力してください。" };
  }

  const normalized = source.replace(/π/g, "pi").replace(/\^/g, "**");
  const invalidCharacter = normalized.match(/[^0-9A-Za-z_+\-*/()., <>=!&|%]/);

  if (invalidCharacter) {
    return { error: `使えない文字があります: ${invalidCharacter[0]}` };
  }

  const identifiers = normalized.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
  for (const identifier of identifiers) {
    if (!variables.includes(identifier) && !SAFE_FUNCTIONS.has(identifier) && !["pi", "PI", "e", "E"].includes(identifier)) {
      return { error: `未対応の識別子です: ${identifier}` };
    }
  }

  try {
    const fn = new Function(
      ...variables,
      `"use strict";
      const { sin, cos, tan, asin, acos, atan, sqrt, abs, exp, log, log10, pow, min, max, floor, ceil, round } = Math;
      const ln = Math.log;
      const pi = Math.PI;
      const PI = Math.PI;
      const e = Math.E;
      const E = Math.E;
      return (${normalized});`
    );

    return {
      fn: (...args) => {
        const value = fn(...args);
        return Number.isFinite(value) ? value : Number.NaN;
      }
    };
  } catch (error) {
    return { error: "式を解釈できませんでした。" };
  }
}

function drawGraphScene(context, config) {
  const { canvas } = context;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintMathBackground(context, canvas.width, canvas.height);
  drawGraphGrid(context, canvas.width, canvas.height, config.xRange, config.yRange);

  if (!config.compiled.fn) {
    drawCanvasMessage(context, canvas.width, canvas.height, config.compiled.error || "式を入力してください。");
    return;
  }

  context.save();
  context.lineWidth = 3;
  context.strokeStyle = "#0f766e";
  context.beginPath();

  let open = false;
  for (let pixel = 0; pixel <= canvas.width; pixel += 1) {
    const x = screenToWorldX(pixel, canvas.width, config.xRange);
    const y = config.compiled.fn(x);
    if (!Number.isFinite(y) || Math.abs(y) > config.yRange * 4) {
      open = false;
      continue;
    }

    const screenY = worldToScreenY(y, canvas.height, config.yRange);
    if (!open) {
      context.moveTo(pixel, screenY);
      open = true;
    } else {
      context.lineTo(pixel, screenY);
    }
  }
  context.stroke();
  context.restore();

  if (config.hoverPoint && Number.isFinite(config.hoverPoint.y)) {
    const screenX = worldToScreenX(config.hoverPoint.x, canvas.width, config.xRange);
    const screenY = worldToScreenY(config.hoverPoint.y, canvas.height, config.yRange);

    context.save();
    context.strokeStyle = "rgba(14, 116, 144, 0.25)";
    context.setLineDash([8, 8]);
    context.beginPath();
    context.moveTo(screenX, 0);
    context.lineTo(screenX, canvas.height);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "#111827";
    context.beginPath();
    context.arc(screenX, screenY, 5, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function drawDerivativeScene(context, config) {
  const { canvas } = context;
  const xRange = config.xRange ?? config.preset?.xRange ?? 5;
  const yRange = config.yRange ?? config.preset?.yRange ?? 5;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintMathBackground(context, canvas.width, canvas.height);
  drawGraphGrid(context, canvas.width, canvas.height, xRange, yRange);

  if (!config.compiled.fn || !config.snapshot) {
    drawCanvasMessage(context, canvas.width, canvas.height, config.compiled.error || "式を入力してください。");
    return;
  }

  drawFunctionCurve(context, config.compiled.fn, xRange, yRange, {
    strokeStyle: "#0f766e",
    lineWidth: 3
  });

  const point = {
    x: worldToScreenX(config.snapshot.x, canvas.width, xRange),
    y: worldToScreenY(config.snapshot.y, canvas.height, yRange)
  };
  const secantPoint = {
    x: worldToScreenX(config.snapshot.x + config.snapshot.h, canvas.width, xRange),
    y: worldToScreenY(config.snapshot.secantY, canvas.height, yRange)
  };

  context.save();
  if (config.showSecant) {
    context.strokeStyle = "#ea580c";
    context.lineWidth = 2.2;
    context.setLineDash([10, 8]);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineTo(secantPoint.x, secantPoint.y);
    context.stroke();
    context.setLineDash([]);
  }

  if (config.showTangent && config.snapshot.differentiable) {
    drawSlopeLine(
      context,
      config.snapshot.x,
      config.snapshot.y,
      config.snapshot.tangentSlope,
      xRange,
      yRange,
      derivativeLineColor(config.snapshot.tangentSlope)
    );
  }

  context.strokeStyle = "rgba(15, 23, 42, 0.18)";
  context.beginPath();
  context.moveTo(point.x, 0);
  context.lineTo(point.x, canvas.height);
  context.stroke();

  context.fillStyle = "#111827";
  context.beginPath();
  context.arc(point.x, point.y, 7, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#ea580c";
  context.beginPath();
  context.arc(secantPoint.x, secantPoint.y, 5.5, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawIntegralScene(context, config) {
  const { canvas } = context;
  const xRange = config.xRange ?? config.preset?.xRange ?? 5;
  const yRange = config.yRange ?? config.preset?.yRange ?? 5;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintMathBackground(context, canvas.width, canvas.height);
  drawGraphGrid(context, canvas.width, canvas.height, xRange, yRange);

  if (!config.compiled.fn) {
    drawCanvasMessage(context, canvas.width, canvas.height, config.compiled.error || "式を入力してください。");
    return;
  }

  const axisY = worldToScreenY(0, canvas.height, yRange);
  drawFunctionCurve(context, config.compiled.fn, xRange, yRange, {
    strokeStyle: "#0f766e",
    lineWidth: 3
  });

  drawIntegralFill(context, config.compiled.fn, config.interval.a, config.animatedEnd, xRange, yRange);
  if (config.showRiemann) {
    drawRiemannBars(context, config.compiled.fn, config.interval.a, config.interval.b, config.partitions, xRange, yRange, config.riemannMode);
  }

  context.save();
  const handleColors = {
    a: "#0f766e",
    b: "#1d4ed8"
  };
  for (const [key, xValue] of Object.entries({ a: config.interval.a, b: config.interval.b })) {
    const screenX = worldToScreenX(xValue, canvas.width, xRange);
    context.strokeStyle = handleColors[key];
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(screenX, 0);
    context.lineTo(screenX, canvas.height);
    context.stroke();
    context.fillStyle = handleColors[key];
    context.beginPath();
    context.arc(screenX, axisY, 7, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawLinearAlgebraScene(context, basis, options = {}) {
  const { canvas } = context;
  const range = options.range ?? 5.5;
  const shapeMode = options.shapeMode ?? "square";
  const determinant = basis.u.x * basis.v.y - basis.u.y * basis.v.x;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintMathBackground(context, canvas.width, canvas.height);

  if (options.showBaseGrid) {
    drawLinearGrid(context, canvas.width, canvas.height, range, null, "rgba(148, 163, 184, 0.26)", 1.05);
  }
  drawLinearAxes(context, canvas.width, canvas.height, range);
  drawLinearGrid(context, canvas.width, canvas.height, range, basis, "rgba(15, 118, 110, 0.32)", 1.35);
  drawLinearSampleShape(context, canvas.width, canvas.height, range, null, shapeMode, {
    determinant: 1,
    strokeStyle: "rgba(17, 24, 39, 0.18)",
    fillStyle: "rgba(255, 255, 255, 0.18)",
    dashed: true
  });
  drawLinearSampleShape(context, canvas.width, canvas.height, range, basis, shapeMode, {
    determinant
  });
  drawLinearVector(context, canvas.width, canvas.height, range, basis.u, "#dc2626", "u");
  drawLinearVector(context, canvas.width, canvas.height, range, basis.v, "#2563eb", "v");
}

function drawSlopeLine(context, x, y, slope, xRange, yRange, color) {
  const { canvas } = context;
  const leftX = -xRange;
  const rightX = xRange;
  const leftY = y + slope * (leftX - x);
  const rightY = y + slope * (rightX - x);
  context.save();
  context.strokeStyle = color;
  context.lineWidth = 2.2;
  context.beginPath();
  context.moveTo(worldToScreenX(leftX, canvas.width, xRange), worldToScreenY(leftY, canvas.height, yRange));
  context.lineTo(worldToScreenX(rightX, canvas.width, xRange), worldToScreenY(rightY, canvas.height, yRange));
  context.stroke();
  context.restore();
}

function drawIntegralFill(context, fn, left, right, xRange, yRange) {
  const { canvas } = context;
  if (!Number.isFinite(left) || !Number.isFinite(right) || Math.abs(right - left) < 1e-4) return;
  const a = Math.min(left, right);
  const b = Math.max(left, right);
  const axisY = worldToScreenY(0, canvas.height, yRange);
  const positiveFill = "rgba(34, 211, 238, 0.24)";
  const negativeFill = "rgba(244, 114, 182, 0.22)";
  const steps = 180;

  context.save();
  for (let index = 0; index < steps; index += 1) {
    const x1 = a + ((b - a) * index) / steps;
    const x2 = a + ((b - a) * (index + 1)) / steps;
    const y1 = safeEvaluate(fn, x1);
    const y2 = safeEvaluate(fn, x2);
    if (!Number.isFinite(y1) || !Number.isFinite(y2)) continue;

    const sx1 = worldToScreenX(x1, canvas.width, xRange);
    const sx2 = worldToScreenX(x2, canvas.width, xRange);
    const sy1 = worldToScreenY(y1, canvas.height, yRange);
    const sy2 = worldToScreenY(y2, canvas.height, yRange);

    const fillStrip = (startX, endX, startY, endY, fillStyle) => {
      context.fillStyle = fillStyle;
      context.beginPath();
      context.moveTo(startX, axisY);
      context.lineTo(startX, startY);
      context.lineTo(endX, endY);
      context.lineTo(endX, axisY);
      context.closePath();
      context.fill();
    };

    if ((y1 >= 0 && y2 >= 0) || (y1 <= 0 && y2 <= 0)) {
      fillStrip(sx1, sx2, sy1, sy2, y1 >= 0 ? positiveFill : negativeFill);
      continue;
    }

    const ratio = Math.abs(y1) / (Math.abs(y1) + Math.abs(y2));
    const crossX = x1 + (x2 - x1) * ratio;
    const crossScreenX = worldToScreenX(crossX, canvas.width, xRange);
    fillStrip(sx1, crossScreenX, sy1, axisY, y1 >= 0 ? positiveFill : negativeFill);
    fillStrip(crossScreenX, sx2, axisY, sy2, y2 >= 0 ? positiveFill : negativeFill);
  }
  context.restore();
}

function drawRiemannBars(context, fn, left, right, partitions, xRange, yRange, mode = "midpoint") {
  const { canvas } = context;
  const steps = Math.max(1, partitions);
  const width = (right - left) / steps;
  const axisY = worldToScreenY(0, canvas.height, yRange);

  context.save();
  context.fillStyle = "rgba(249, 115, 22, 0.12)";
  context.strokeStyle = "rgba(249, 115, 22, 0.42)";
  context.lineWidth = 1;

  for (let index = 0; index < steps; index += 1) {
    const x = left + width * index;
    const sampleX = mode === "left" ? x : mode === "right" ? x + width : x + width / 2;
    const y = safeEvaluate(fn, sampleX);
    if (!Number.isFinite(y)) continue;
    const screenX = worldToScreenX(x, canvas.width, xRange);
    const screenWidth = Math.abs(worldToScreenX(x + width, canvas.width, xRange) - screenX);
    const screenY = worldToScreenY(y, canvas.height, yRange);
    const rectTop = Math.min(axisY, screenY);
    const rectHeight = Math.abs(axisY - screenY);
    context.fillStyle = y >= 0 ? "rgba(249, 115, 22, 0.14)" : "rgba(236, 72, 153, 0.14)";
    context.strokeStyle = y >= 0 ? "rgba(249, 115, 22, 0.42)" : "rgba(236, 72, 153, 0.4)";
    context.fillRect(screenX, rectTop, screenWidth, rectHeight);
    context.strokeRect(screenX, rectTop, screenWidth, rectHeight);
  }
  context.restore();
}

function drawLinearGrid(context, width, height, range, basis, strokeStyle, lineWidth) {
  context.save();
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;

  for (let tick = -5; tick <= 5; tick += 1) {
    context.beginPath();
    for (let y = -5; y <= 5; y += 0.25) {
      const point = basis ? applyBasisTransform({ x: tick, y }, basis) : { x: tick, y };
      const screen = linearWorldToScreen(point.x, point.y, width, height, range);
      if (y === -5) context.moveTo(screen.x, screen.y);
      else context.lineTo(screen.x, screen.y);
    }
    context.stroke();

    context.beginPath();
    for (let x = -5; x <= 5; x += 0.25) {
      const point = basis ? applyBasisTransform({ x, y: tick }, basis) : { x, y: tick };
      const screen = linearWorldToScreen(point.x, point.y, width, height, range);
      if (x === -5) context.moveTo(screen.x, screen.y);
      else context.lineTo(screen.x, screen.y);
    }
    context.stroke();
  }
  context.restore();
}

function drawLinearAxes(context, width, height, range) {
  context.save();
  context.strokeStyle = "rgba(15, 23, 42, 0.34)";
  context.lineWidth = 2;
  const originLeft = linearWorldToScreen(-range, 0, width, height, range);
  const originRight = linearWorldToScreen(range, 0, width, height, range);
  const originTop = linearWorldToScreen(0, range, width, height, range);
  const originBottom = linearWorldToScreen(0, -range, width, height, range);
  context.beginPath();
  context.moveTo(originLeft.x, originLeft.y);
  context.lineTo(originRight.x, originRight.y);
  context.moveTo(originTop.x, originTop.y);
  context.lineTo(originBottom.x, originBottom.y);
  context.stroke();
  context.restore();
}

function drawLinearUnitCircle(context, width, height, range, basis, options = {}) {
  const sampleCount = 80;
  context.save();
  context.strokeStyle = options.strokeStyle || "rgba(124, 58, 237, 0.74)";
  context.fillStyle = options.fillStyle || "rgba(124, 58, 237, 0.12)";
  context.lineWidth = 2;
  if (options.dashed) context.setLineDash([8, 8]);
  context.beginPath();
  for (let index = 0; index <= sampleCount; index += 1) {
    const theta = (Math.PI * 2 * index) / sampleCount;
    const point = {
      x: Math.cos(theta),
      y: Math.sin(theta)
    };
    const transformed = basis ? applyBasisTransform(point, basis) : point;
    const screen = linearWorldToScreen(transformed.x, transformed.y, width, height, range);
    if (index === 0) context.moveTo(screen.x, screen.y);
    else context.lineTo(screen.x, screen.y);
  }
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function drawLinearSampleShape(context, width, height, range, basis, shapeMode, options = {}) {
  if (shapeMode === "circle") {
    drawLinearUnitCircle(context, width, height, range, basis, {
      strokeStyle:
        options.strokeStyle ||
        (options.determinant < 0 ? "rgba(236, 72, 153, 0.72)" : "rgba(124, 58, 237, 0.74)"),
      fillStyle:
        options.fillStyle ||
        (options.determinant < 0 ? "rgba(244, 114, 182, 0.14)" : "rgba(124, 58, 237, 0.12)"),
      dashed: options.dashed
    });
    return;
  }

  const originalPoints = getLinearShapePoints(shapeMode);
  const points = basis ? originalPoints.map((point) => applyBasisTransform(point, basis)) : originalPoints;

  context.save();
  context.fillStyle =
    options.fillStyle || (options.determinant < 0 ? "rgba(251, 113, 133, 0.24)" : "rgba(253, 224, 71, 0.32)");
  context.strokeStyle =
    options.strokeStyle || (options.determinant < 0 ? "rgba(225, 29, 72, 0.82)" : "rgba(202, 138, 4, 0.82)");
  context.lineWidth = 2;
  if (options.dashed) context.setLineDash([8, 8]);
  context.beginPath();
  points.forEach((point, index) => {
    const screen = linearWorldToScreen(point.x, point.y, width, height, range);
    if (index === 0) context.moveTo(screen.x, screen.y);
    else context.lineTo(screen.x, screen.y);
  });
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function getLinearShapePoints(shapeMode) {
  if (shapeMode === "triangle") {
    return [
      { x: 0, y: 0 },
      { x: 1.18, y: 0.14 },
      { x: 0.26, y: 1.05 }
    ];
  }

  return [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ];
}

function drawLinearVector(context, width, height, range, vector, color, label) {
  const origin = linearWorldToScreen(0, 0, width, height, range);
  const tip = linearWorldToScreen(vector.x, vector.y, width, height, range);
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(origin.x, origin.y);
  context.lineTo(tip.x, tip.y);
  context.stroke();
  context.beginPath();
  context.arc(tip.x, tip.y, 9, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#0f172a";
  context.font = "600 15px var(--font-sans, sans-serif)";
  context.fillText(label, tip.x + 12, tip.y - 10);
  context.restore();
}

function buildRegressionDataset(preset, noise, pointCount, includeOutlier) {
  const random = createSeededRandom(`${preset.id}:${noise.toFixed(3)}:${pointCount}:${includeOutlier ? "1" : "0"}`);
  const points = [];
  const minX = -preset.xRange * 0.84;
  const maxX = preset.xRange * 0.84;

  for (let index = 0; index < pointCount; index += 1) {
    const ratio = pointCount <= 1 ? 0.5 : index / (pointCount - 1);
    const x = minX + (maxX - minX) * ratio + (random() - 0.5) * 0.55;
    const y = preset.slope * x + preset.intercept + randomNormal(random) * noise;
    points.push({ x, y, isOutlier: false });
  }

  if (includeOutlier) {
    const outlierX = preset.xRange * 0.76;
    const outlierY = preset.slope * outlierX + preset.intercept + noise * 3.8 + 2.4;
    points.push({ x: outlierX, y: outlierY, isOutlier: true });
  }

  return { points };
}

function createSeededRandom(seedText) {
  let seed = 1779033703 ^ seedText.length;
  for (let index = 0; index < seedText.length; index += 1) {
    seed = Math.imul(seed ^ seedText.charCodeAt(index), 3432918353);
    seed = (seed << 13) | (seed >>> 19);
  }
  return function next() {
    seed = Math.imul(seed ^ (seed >>> 16), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    seed ^= seed >>> 16;
    return (seed >>> 0) / 4294967296;
  };
}

function randomNormal(random) {
  const u1 = Math.max(1e-9, random());
  const u2 = Math.max(1e-9, random());
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2);
}

function computeRegressionLine(points) {
  if (!points.length) return { slope: 0, intercept: 0 };
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const numerator = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
  const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  const slope = Math.abs(denominator) < 1e-9 ? 0 : numerator / denominator;
  return {
    slope,
    intercept: meanY - slope * meanX
  };
}

function buildLineModelFromEdges(leftX, leftY, rightX, rightY) {
  const dx = rightX - leftX;
  const slope = Math.abs(dx) < 1e-9 ? 0 : (rightY - leftY) / dx;
  return {
    slope,
    intercept: leftY - slope * leftX,
    leftX,
    leftY,
    rightX,
    rightY
  };
}

function predictRegressionY(line, x) {
  return line.slope * x + line.intercept;
}

function computeRegressionScore(points, line) {
  if (!points.length) return { meanSquared: 0, meanAbsolute: 0 };
  let squared = 0;
  let absolute = 0;
  points.forEach((point) => {
    const residual = point.y - predictRegressionY(line, point.x);
    squared += residual * residual;
    absolute += Math.abs(residual);
  });
  return {
    meanSquared: squared / points.length,
    meanAbsolute: absolute / points.length
  };
}

function makeRegressionSeedLine(preset, bestFit) {
  const leftX = -preset.xRange;
  const rightX = preset.xRange;
  return {
    leftY: predictRegressionY(bestFit, leftX) + 0.9,
    rightY: predictRegressionY(bestFit, rightX) - 0.7
  };
}

function buildRegressionMissionState(mission, currentLine, currentScore, bestFit, bestScore, outlierFreeFit, showOutlier) {
  if (mission.type === "fit") {
    const done = currentScore.meanSquared <= bestScore.meanSquared * 1.25 + 0.08;
    return {
      ...mission,
      done,
      statusText: done ? "かなりズレの少ない線です。" : "線を少しずつ寄せて、残差が短くなる位置を探しましょう。"
    };
  }

  if (mission.type === "outlier") {
    const pull = Math.abs(bestFit.slope - outlierFreeFit.slope);
    const done = showOutlier && pull > 0.18;
    return {
      ...mission,
      done,
      statusText: done ? "外れ値 1 つで線の傾きがかなり変わりました。" : "外れ値を入れて、答えの線がどれだけ引っぱられるか見てみましょう。"
    };
  }

  const sameSign = Math.sign(currentLine.slope || 0) === Math.sign(bestFit.slope || 0);
  const done = sameSign && currentScore.meanSquared <= bestScore.meanSquared * 1.8 + 0.16;
  return {
    ...mission,
    done,
    statusText: done ? "ばらつきの中から全体の向きを読み当てました。" : "まずは右上がりか右下がりか、大まかな流れを見抜いてみましょう。"
  };
}

function describeRegressionStatus(currentLine, currentScore, bestFit, bestScore, showOutlier, outlierFreeFit) {
  if (currentScore.meanSquared <= bestScore.meanSquared * 1.18 + 0.06) return "かなりそれっぽい線です。点群の芯にうまく乗っています。";
  if (showOutlier && Math.abs(bestFit.slope - outlierFreeFit.slope) > 0.18) return "外れ値 1 つが全体を引っぱっています。答えの線も大きく傾きます。";
  if (Math.sign(currentLine.slope || 0) !== Math.sign(bestFit.slope || 0)) return "傾向の向きが逆です。点のかたまり全体の流れを見てみましょう。";
  return "まだズレが大きいです。点から線までの残差が短くなるように寄せてみてください。";
}

function drawRegressionScene(context, config) {
  const { canvas } = context;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintMathBackground(context, canvas.width, canvas.height);
  drawGraphGrid(context, canvas.width, canvas.height, config.preset.xRange, config.preset.yRange);

  const points = config.dataset.points;
  const currentLine = config.currentLine;
  const bestFit = config.bestFit;
  const leftHandle = {
    x: worldToScreenX(-config.preset.xRange, canvas.width, config.preset.xRange),
    y: worldToScreenY(predictRegressionY(currentLine, -config.preset.xRange), canvas.height, config.preset.yRange)
  };
  const rightHandle = {
    x: worldToScreenX(config.preset.xRange, canvas.width, config.preset.xRange),
    y: worldToScreenY(predictRegressionY(currentLine, config.preset.xRange), canvas.height, config.preset.yRange)
  };

  if (config.showResiduals) {
    context.save();
    context.strokeStyle = "rgba(14, 165, 233, 0.32)";
    context.lineWidth = 1.8;
    points.forEach((point) => {
      const x = worldToScreenX(point.x, canvas.width, config.preset.xRange);
      const y = worldToScreenY(point.y, canvas.height, config.preset.yRange);
      const lineY = worldToScreenY(predictRegressionY(currentLine, point.x), canvas.height, config.preset.yRange);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x, lineY);
      context.stroke();
    });
    context.restore();
  }

  drawRegressionLine(context, bestFit, config.preset.xRange, config.preset.yRange, "rgba(124, 58, 237, 0.78)", config.showAnswer ? [] : [10, 8]);
  drawRegressionLine(context, currentLine, config.preset.xRange, config.preset.yRange, "#f97316", []);

  context.save();
  points.forEach((point) => {
    const screen = {
      x: worldToScreenX(point.x, canvas.width, config.preset.xRange),
      y: worldToScreenY(point.y, canvas.height, config.preset.yRange)
    };
    context.fillStyle = point.isOutlier ? "#ef4444" : "#111827";
    context.beginPath();
    context.arc(screen.x, screen.y, point.isOutlier ? 6.5 : 5.5, 0, Math.PI * 2);
    context.fill();
  });

  context.fillStyle = "#f97316";
  [leftHandle, rightHandle].forEach((handle) => {
    context.beginPath();
    context.arc(handle.x, handle.y, 8, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

function drawRegressionLine(context, line, xRange, yRange, strokeStyle, dash = []) {
  const { canvas } = context;
  context.save();
  context.strokeStyle = strokeStyle;
  context.lineWidth = 3;
  if (dash.length) context.setLineDash(dash);
  const leftY = predictRegressionY(line, -xRange);
  const rightY = predictRegressionY(line, xRange);
  context.beginPath();
  context.moveTo(worldToScreenX(-xRange, canvas.width, xRange), worldToScreenY(leftY, canvas.height, yRange));
  context.lineTo(worldToScreenX(xRange, canvas.width, xRange), worldToScreenY(rightY, canvas.height, yRange));
  context.stroke();
  context.restore();
}

function sinDerivativeAt(x, order) {
  const cycle = [Math.sin(x), Math.cos(x), -Math.sin(x), -Math.cos(x)];
  return cycle[order % 4];
}

function cosDerivativeAt(x, order) {
  const cycle = [Math.cos(x), -Math.sin(x), -Math.cos(x), Math.sin(x)];
  return cycle[order % 4];
}

function logOnePlusDerivativeAt(x, order) {
  if (x <= -1) return Number.NaN;
  if (order === 0) return Math.log(1 + x);
  const sign = order % 2 === 0 ? -1 : 1;
  return (sign * factorial(order - 1)) / (1 + x) ** order;
}

function factorial(value) {
  let total = 1;
  for (let index = 2; index <= value; index += 1) total *= index;
  return total;
}

function buildTaylorApproximation(preset, centerX, degree) {
  const coefficients = [];
  for (let order = 0; order <= degree; order += 1) {
    const derivative = preset.derivativeAt(centerX, order);
    coefficients.push(Number.isFinite(derivative) ? derivative / factorial(order) : 0);
  }

  return {
    coefficients,
    fn: (x) => {
      if (x < preset.minCenter - 1.2 || x > preset.maxCenter + 1.2) return Number.NaN;
      const dx = x - centerX;
      return coefficients.reduce((sum, coefficient, order) => sum + coefficient * dx ** order, 0);
    }
  };
}

function measureTaylorError(fn, approxFn, centerX, radius, minX, maxX) {
  const left = Math.max(minX, centerX - radius);
  const right = Math.min(maxX, centerX + radius);
  const samples = 80;
  let total = 0;
  let count = 0;
  for (let index = 0; index <= samples; index += 1) {
    const x = left + ((right - left) * index) / samples;
    const actual = safeEvaluate(fn, x);
    const approx = safeEvaluate(approxFn, x);
    if (!Number.isFinite(actual) || !Number.isFinite(approx)) continue;
    total += Math.abs(actual - approx);
    count += 1;
  }
  return count ? total / count : Number.POSITIVE_INFINITY;
}

function buildTaylorMissionState(mission, centerX, degree, windowRadius, localError) {
  if (mission.type === "local") {
    const done = localError < 0.12;
    return {
      ...mission,
      done,
      statusText: done ? "この近くではかなりそっくりです。" : "中心の近くで、2本の曲線が重なる場所を探してみましょう。"
    };
  }
  if (mission.type === "widen") {
    const done = degree >= 3 && windowRadius >= 1.4 && localError < 0.18;
    return {
      ...mission,
      done,
      statusText: done ? "似ている範囲がかなり広がりました。" : "次数を上げて、観察範囲を少しずつ広げてみましょう。"
    };
  }
  const done = Math.abs(centerX) > 0.25 && localError < 0.16;
  return {
    ...mission,
    done,
    statusText: done ? "中心を動かして、一番よく重なる場所を見つけました。" : "中心点を左右に動かすと、どこが得意かが変わります。"
  };
}

function describeTaylorStatus(localError, globalError, degree, centerX, preset) {
  if (!Number.isFinite(localError)) return "この中心ではコピーが不安定です。別の場所を試してみてください。";
  if (localError < 0.1 && globalError > localError * 2.6) return "この近くではかなりそっくりです。少し離れると正体がバレます。";
  if (degree >= 3 && localError < 0.16) return "次数を上げたので、コピーの精度が育っています。";
  if (Math.abs(centerX - preset.center) > 0.45) return "中心を変えると、似る場所も一緒に移動します。";
  return "近く限定ならかなり似せられます。コピーの得意な範囲を探してみましょう。";
}

function drawTaylorScene(context, config) {
  const { canvas } = context;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintMathBackground(context, canvas.width, canvas.height);
  drawGraphGrid(context, canvas.width, canvas.height, config.preset.xRange, config.preset.yRange);

  const left = Math.max(config.preset.minCenter, config.centerX - config.windowRadius);
  const right = Math.min(config.preset.maxCenter, config.centerX + config.windowRadius);
  const leftScreen = worldToScreenX(left, canvas.width, config.preset.xRange);
  const rightScreen = worldToScreenX(right, canvas.width, config.preset.xRange);

  context.save();
  context.fillStyle = "rgba(249, 115, 22, 0.08)";
  context.fillRect(leftScreen, 0, rightScreen - leftScreen, canvas.height);
  context.restore();

  if (config.showErrorBand) {
    drawTaylorErrorBand(context, config.preset.fn, config.approximation.fn, left, right, config.preset.xRange, config.preset.yRange);
  }

  if (config.showOriginal) {
    drawFunctionCurve(context, config.preset.fn, config.preset.xRange, config.preset.yRange, {
      strokeStyle: "#111827",
      lineWidth: 3
    });
  }

  drawFunctionCurve(context, config.approximation.fn, config.preset.xRange, config.preset.yRange, {
    strokeStyle: "#7c3aed",
    lineWidth: 3
  });

  context.save();
  context.setLineDash([8, 8]);
  context.strokeStyle = "rgba(249, 115, 22, 0.45)";
  context.lineWidth = 2;
  [left, config.centerX, right].forEach((value, index) => {
    const x = worldToScreenX(value, canvas.width, config.preset.xRange);
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
    if (index === 1) {
      const y = safeEvaluate(config.preset.fn, config.centerX);
      if (Number.isFinite(y)) {
        drawFilledPoint(context, x, worldToScreenY(y, canvas.height, config.preset.yRange), "#f97316");
      }
    }
  });
  context.restore();
}

function drawTaylorErrorBand(context, originalFn, approxFn, left, right, xRange, yRange) {
  const { canvas } = context;
  const steps = 120;
  context.save();
  context.fillStyle = "rgba(124, 58, 237, 0.08)";
  for (let index = 0; index < steps; index += 1) {
    const x1 = left + ((right - left) * index) / steps;
    const x2 = left + ((right - left) * (index + 1)) / steps;
    const y1 = safeEvaluate(originalFn, x1);
    const y2 = safeEvaluate(approxFn, x1);
    const y3 = safeEvaluate(approxFn, x2);
    const y4 = safeEvaluate(originalFn, x2);
    if (![y1, y2, y3, y4].every(Number.isFinite)) continue;
    context.beginPath();
    context.moveTo(worldToScreenX(x1, canvas.width, xRange), worldToScreenY(y1, canvas.height, yRange));
    context.lineTo(worldToScreenX(x1, canvas.width, xRange), worldToScreenY(y2, canvas.height, yRange));
    context.lineTo(worldToScreenX(x2, canvas.width, xRange), worldToScreenY(y3, canvas.height, yRange));
    context.lineTo(worldToScreenX(x2, canvas.width, xRange), worldToScreenY(y4, canvas.height, yRange));
    context.closePath();
    context.fill();
  }
  context.restore();
}

function normalizeVector(vector) {
  const length = Math.hypot(vector.x, vector.y);
  if (length < 1e-9) return null;
  return {
    x: vector.x / length,
    y: vector.y / length
  };
}

function clampVectorMagnitude(vector, maxMagnitude) {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= maxMagnitude || length < 1e-9) return vector;
  return {
    x: (vector.x / length) * maxMagnitude,
    y: (vector.y / length) * maxMagnitude
  };
}

function computeEigenDirections(basis) {
  const a = basis.u.x;
  const b = basis.v.x;
  const c = basis.u.y;
  const d = basis.v.y;
  const trace = a + d;
  const determinant = a * d - b * c;
  const discriminant = trace * trace - 4 * determinant;
  if (discriminant < -1e-9) return [];
  const safeDisc = Math.max(0, discriminant);
  const sqrtDisc = Math.sqrt(safeDisc);
  const values = [(trace + sqrtDisc) / 2, (trace - sqrtDisc) / 2];
  const directions = [];

  values.forEach((value, index) => {
    let vector = Math.abs(b) > Math.abs(c)
      ? { x: value - d, y: b }
      : { x: c, y: value - a };
    if (Math.hypot(vector.x, vector.y) < 1e-9) {
      vector = Math.abs(a - value) > Math.abs(d - value) ? { x: b, y: value - a } : { x: value - d, y: c };
    }
    const normalized = normalizeVector(vector);
    if (!normalized) return;
    const exists = directions.some((direction) => axisAngleDifference(direction.vector, normalized) < 0.02);
    if (!exists) {
      directions.push({
        id: `eig-${index}`,
        value,
        vector: normalized
      });
    }
  });

  return directions;
}

function axisAngleDifference(left, right) {
  const leftNorm = normalizeVector(left);
  const rightNorm = normalizeVector(right);
  if (!leftNorm || !rightNorm) return 180;
  const dot = Math.max(-1, Math.min(1, leftNorm.x * rightNorm.x + leftNorm.y * rightNorm.y));
  const absoluteDot = Math.min(1, Math.abs(dot));
  return (Math.acos(absoluteDot) * 180) / Math.PI;
}

function analyzeEigenDirection(vector, transformed, eigenData) {
  const inputNorm = normalizeVector(vector);
  const transformedNorm = normalizeVector(transformed);
  const axisDriftDeg = inputNorm && transformedNorm ? axisAngleDifference(inputNorm, transformedNorm) : 180;
  const scale = Math.hypot(vector.x, vector.y) < 1e-9 ? 0 : ((transformed.x * vector.x + transformed.y * vector.y) / (vector.x * vector.x + vector.y * vector.y));
  const reversed = inputNorm && transformedNorm ? inputNorm.x * transformedNorm.x + inputNorm.y * transformedNorm.y < 0 : false;
  let matchId = null;
  let matchValue = null;
  let strongestValue = null;

  if (eigenData.length) {
    const closest = eigenData.reduce((best, direction) => {
      const drift = axisAngleDifference(vector, direction.vector);
      if (!best || drift < best.drift) return { direction, drift };
      return best;
    }, null);
    if (closest) {
      strongestValue = eigenData.reduce((best, direction) => (!best || Math.abs(direction.value) > Math.abs(best.value) ? direction : best), null)?.value ?? null;
      if (closest.drift < 7.5) {
        matchId = closest.direction.id;
        matchValue = closest.direction.value;
      }
    }
  }

  return {
    axisDriftDeg,
    scale,
    reversed,
    matchId,
    matchValue,
    strongestValue,
    isEigenLike: axisDriftDeg < 7.5
  };
}

function buildEigenMissionState(mission, axisInfo, eigenData, foundAxes) {
  if (mission.type === "one") {
    const done = axisInfo.isEigenLike;
    return {
      ...mission,
      done,
      statusText: done ? "ぶれない向きを 1 本見つけました。" : "向きのズレ角が小さくなる場所を探してみましょう。"
    };
  }
  if (mission.type === "two") {
    const done = foundAxes.length >= 2;
    return {
      ...mission,
      done,
      statusText: done ? "特別な向きを 2 本見つけました。" : eigenData.length < 2 ? "この変形は 2 本見つけにくいです。別のプリセットも試してみましょう。" : "別の向きでも、ぶれない軸が見つかるか探してみましょう。"
    };
  }
  const strongest = eigenData.reduce((best, direction) => (!best || Math.abs(direction.value) > Math.abs(best.value) ? direction : best), null);
  const done = Boolean(strongest && axisInfo.matchId === strongest.id && axisInfo.isEigenLike);
  return {
    ...mission,
    done,
    statusText: done ? "一番大きく伸びる軸を見つけました。" : "ぶれない向きの中でも、倍率が一番大きい軸を探してみましょう。"
  };
}

function describeEigenStatus(axisInfo, eigenData) {
  if (!eigenData.length) return "この変形では、ぶれない向きが見つかりにくいです。向きがくるくる回ります。";
  if (axisInfo.isEigenLike) return axisInfo.reversed ? "方向は線上に残っています。反転しながら伸び縮みしています。" : "方向がほとんど変わっていません。特別な向きを見つけました。";
  if (axisInfo.axisDriftDeg < 16) return "かなり近いです。あと少しで、ぶれない軸に乗れます。";
  return "この向きはかなりぶれます。変形しても同じ線上に残る方向を探してみましょう。";
}

function drawEigenScene(context, config) {
  const { canvas } = context;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintMathBackground(context, canvas.width, canvas.height);
  if (config.showBaseGrid) {
    drawLinearGrid(context, canvas.width, canvas.height, config.preset.range, null, "rgba(148, 163, 184, 0.18)", 1);
  }
  drawLinearAxes(context, canvas.width, canvas.height, config.preset.range);
  drawLinearGrid(context, canvas.width, canvas.height, config.preset.range, config.preset.basis, "rgba(15, 118, 110, 0.26)", 1.25);
  drawLinearUnitCircle(context, canvas.width, canvas.height, config.preset.range, null, {
    strokeStyle: "rgba(15, 23, 42, 0.2)",
    fillStyle: "rgba(255, 255, 255, 0.12)",
    dashed: true
  });
  drawLinearUnitCircle(context, canvas.width, canvas.height, config.preset.range, config.preset.basis, {
    strokeStyle: "rgba(124, 58, 237, 0.72)",
    fillStyle: "rgba(124, 58, 237, 0.08)"
  });

  if (config.showAxesHint) {
    context.save();
    context.setLineDash([10, 8]);
    context.strokeStyle = "rgba(124, 58, 237, 0.4)";
    context.lineWidth = 2;
    config.eigenData.forEach((direction) => {
      const left = linearWorldToScreen(-direction.vector.x * config.preset.range, -direction.vector.y * config.preset.range, canvas.width, canvas.height, config.preset.range);
      const right = linearWorldToScreen(direction.vector.x * config.preset.range, direction.vector.y * config.preset.range, canvas.width, canvas.height, config.preset.range);
      context.beginPath();
      context.moveTo(left.x, left.y);
      context.lineTo(right.x, right.y);
      context.stroke();
    });
    context.restore();
  }

  const inputLabel = "v";
  const outputLabel = config.axisInfo.isEigenLike ? "A(v) ★" : "A(v)";
  drawLinearVector(context, canvas.width, canvas.height, config.preset.range, config.vector, "#111827", inputLabel);
  drawLinearVector(context, canvas.width, canvas.height, config.preset.range, config.transformed, "#f97316", outputLabel);

  if (config.axisInfo.isEigenLike) {
    const tip = linearWorldToScreen(config.transformed.x, config.transformed.y, canvas.width, canvas.height, config.preset.range);
    context.save();
    context.strokeStyle = "rgba(250, 204, 21, 0.88)";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(tip.x, tip.y, 16, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
}

function buildProbabilitySpec(preset, bias) {
  if (preset.kind === "coin") {
    return {
      labels: ["表", "裏"],
      probabilities: [bias, 1 - bias]
    };
  }

  if (preset.kind === "die") {
    const probabilities = buildBiasedDieProbabilities(bias);
    return {
      labels: ["1", "2", "3", "4", "5", "6"],
      probabilities
    };
  }

  if (preset.kind === "two-dice") {
    const dieProbabilities = buildBiasedDieProbabilities(bias);
    const probabilities = new Array(11).fill(0);
    for (let left = 0; left < 6; left += 1) {
      for (let right = 0; right < 6; right += 1) {
        probabilities[left + right] += dieProbabilities[left] * dieProbabilities[right];
      }
    }
    return {
      labels: ["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
      probabilities
    };
  }

  return {
    labels: ["A", "B"],
    probabilities: [0.5, 0.5]
  };
}

function buildBiasedDieProbabilities(bias) {
  const center = 2.5;
  const tilt = (bias - 0.5) * 1.35;
  const weights = new Array(6).fill(null).map((_, index) => {
    const centered = index - center;
    return Math.max(0.12, 1 + centered * tilt);
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  return weights.map((value) => value / total);
}

function sampleProbabilityIndex(spec) {
  const roll = Math.random();
  let cumulative = 0;
  for (let index = 0; index < spec.probabilities.length; index += 1) {
    cumulative += spec.probabilities[index];
    if (roll <= cumulative) return index;
  }
  return spec.probabilities.length - 1;
}

function drawProbabilityScene(context, config) {
  const { canvas } = context;
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);
  paintMathBackground(context, width, height);

  const labels = config.labels || [];
  const counts = config.counts || [];
  const total = config.totalTrials || 0;
  const maxCount = Math.max(...counts, 1);
  const chart = {
    left: 72,
    right: width - 42,
    top: 52,
    bottom: height - 72
  };
  const barAreaWidth = chart.right - chart.left;
  const barAreaHeight = chart.bottom - chart.top;
  const barWidth = labels.length ? barAreaWidth / labels.length : barAreaWidth;

  context.save();
  context.fillStyle = "#16202a";
  context.font = "700 22px var(--font-sans, sans-serif)";
  context.fillText(config.title || "確率・基本分布", chart.left, 30);
  context.fillStyle = "rgba(31, 41, 55, 0.64)";
  context.font = "500 13px var(--font-sans, sans-serif)";
  context.fillText(total ? `${total}回観測` : "まだ観測していません", chart.right - 120, 30);
  context.restore();

  context.save();
  context.strokeStyle = "rgba(15, 23, 42, 0.08)";
  context.lineWidth = 1;
  for (let line = 0; line <= 4; line += 1) {
    const y = chart.bottom - (barAreaHeight * line) / 4;
    context.beginPath();
    context.moveTo(chart.left, y);
    context.lineTo(chart.right, y);
    context.stroke();
  }
  context.strokeStyle = "rgba(15, 23, 42, 0.28)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(chart.left, chart.bottom);
  context.lineTo(chart.right, chart.bottom);
  context.stroke();
  context.restore();

  if (config.showExpectation && total > 0) {
    context.save();
    context.strokeStyle = "rgba(124, 58, 237, 0.72)";
    context.setLineDash([6, 6]);
    context.lineWidth = 2;
    config.expected.forEach((probability, index) => {
      const expectedHeight = (probability * total / maxCount) * barAreaHeight;
      const centerX = chart.left + index * barWidth + barWidth / 2;
      const y = chart.bottom - expectedHeight;
      context.beginPath();
      context.moveTo(centerX - barWidth * 0.28, y);
      context.lineTo(centerX + barWidth * 0.28, y);
      context.stroke();
    });
    context.restore();
  }

  labels.forEach((label, index) => {
    const count = counts[index] || 0;
    const x = chart.left + index * barWidth + 8;
    const widthValue = Math.max(18, barWidth - 16);
    const heightValue = maxCount === 0 ? 0 : (count / maxCount) * (barAreaHeight - 8);
    const y = chart.bottom - heightValue;
    const isLatest = config.lastIndex === index;

    context.save();
    context.fillStyle = isLatest
      ? "rgba(249, 115, 22, 0.9)"
      : "rgba(34, 211, 238, 0.76)";
    context.strokeStyle = isLatest ? "rgba(234, 88, 12, 0.9)" : "rgba(14, 116, 144, 0.42)";
    context.lineWidth = 1.5;
    roundRect(context, x, y, widthValue, heightValue, 18);
    context.fill();
    context.stroke();

    context.fillStyle = "#1f2937";
    context.font = "600 13px var(--font-sans, sans-serif)";
    context.textAlign = "center";
    context.fillText(label, x + widthValue / 2, chart.bottom + 24);
    context.fillText(String(count), x + widthValue / 2, y - 10);
    context.restore();
  });
}

function buildProbabilityMissionState(mission, preset, spec, counts, totalTrials) {
  const maxCount = counts.length ? Math.max(...counts, 0) : 0;
  const leadingIndex = counts.length ? counts.findIndex((count) => count === maxCount) : -1;
  const leadingRatio = totalTrials > 0 ? maxCount / totalTrials : 0;

  if (mission.type === "swing") {
    const done = preset.kind === "coin" && totalTrials >= 12 && leadingRatio > 0.68;
    return {
      ...mission,
      done,
      statusText: done
        ? "公平でもかなり偏って見える瞬間が出ました。"
        : "コインをもう少し観測すると、短期の偏りが見えやすくなります。"
    };
  }

  if (mission.type === "mode") {
    const sevenIndex = spec.labels.indexOf("7");
    const done = preset.kind === "two-dice" && totalTrials >= 20 && leadingIndex === sevenIndex;
    return {
      ...mission,
      done,
      statusText: done
        ? "7 が一番高くなりました。真ん中がふくらむ形が見えています。"
        : "2個の和を観測して、どの棒が一番高くなるか見てみましょう。"
    };
  }

  const done = Math.abs(preset.bias - 0.5) > 0.18 || Math.abs(spec.probabilities[0] - 0.5) > 0.18;
  return {
    ...mission,
    done,
    statusText: done
      ? "偏りを動かして、形の変わり方が見えてきました。"
      : "偏りスライダーを公平から少し外すと、形の変化がはっきりします。"
  };
}

function describeProbabilityStatus(preset, spec, counts, totalTrials) {
  if (!totalTrials) return "まだ観測が空です。まずは 10 回くらい押して、棒が育つ様子を見てみましょう。";
  if (totalTrials < 12) return "まだかなり揺れています。公平でも短い目線だと偏って見えます。";
  if (preset.kind === "two-dice") {
    const sevenIndex = spec.labels.indexOf("7");
    const leadingIndex = counts.findIndex((count) => count === Math.max(...counts));
    if (leadingIndex === sevenIndex) return "真ん中の和が少しずつ目立ってきました。";
  }
  if (Math.abs(spec.probabilities[0] - 0.5) > 0.18) return "偏りをかけたので、棒の形が片側へ寄りやすくなっています。";
  if (totalTrials < 70) return "少しずつ形が安定してきました。まだ揺れも残っています。";
  return "かなり形が安定してきました。同じルールでも、短い観測と長い観測で印象が変わります。";
}

function formatProbabilityBias(preset, bias) {
  if (preset.kind === "coin") {
    return bias > 0.54 ? "表より" : bias < 0.46 ? "裏より" : "ほぼ公平";
  }
  if (preset.kind === "two-dice" || preset.kind === "die") {
    return bias > 0.54 ? "高い数より" : bias < 0.46 ? "低い数より" : "ほぼ公平";
  }
  return "ふつう";
}

function buildLimitSnapshot(preset, progress) {
  const distance = Math.max(0.03, preset.startDistance * (1 - progress) + 0.03);
  const leftX = preset.pointX - distance;
  const rightX = preset.pointX + distance;
  const leftY = safeEvaluate(preset.fn, leftX);
  const rightY = safeEvaluate(preset.fn, rightX);
  const pointValue = preset.pointValue?.(preset.pointX);
  const ghostY = preset.ghostY?.(preset.pointX) ?? null;
  const sideGap = Number.isFinite(leftY) && Number.isFinite(rightY) ? Math.abs(leftY - rightY) : Number.POSITIVE_INFINITY;
  let kindLabel = "まだ観察中";

  if (!Number.isFinite(leftY) || !Number.isFinite(rightY)) {
    kindLabel = "壁に近い";
  } else if (sideGap < 0.16 && (pointValue == null || !Number.isFinite(pointValue) || Math.abs(leftY - pointValue) < 0.2)) {
    kindLabel = "ほぼ連続";
  } else if (sideGap < 0.16) {
    kindLabel = "穴やズレ";
  } else {
    kindLabel = "左右で別";
  }

  return {
    pointX: preset.pointX,
    leftX,
    rightX,
    leftY,
    rightY,
    pointValue,
    ghostY,
    sideGap,
    kindLabel
  };
}

function drawLimitScene(context, config) {
  const { canvas } = context;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintMathBackground(context, canvas.width, canvas.height);
  drawGraphGrid(context, canvas.width, canvas.height, config.xRange, config.yRange);

  context.save();
  context.strokeStyle = "#0f766e";
  context.lineWidth = 3;
  context.beginPath();
  let open = false;

  for (let pixel = 0; pixel <= canvas.width; pixel += 1) {
    const x = screenToWorldX(pixel, canvas.width, config.xRange);
    const y = config.preset.fn(x);
    if (!Number.isFinite(y) || Math.abs(y) > config.yRange * 4) {
      open = false;
      continue;
    }

    const screenY = worldToScreenY(y, canvas.height, config.yRange);
    if (!open) {
      context.moveTo(pixel, screenY);
      open = true;
    } else {
      context.lineTo(pixel, screenY);
    }
  }
  context.stroke();
  context.restore();

  const leftPoint = {
    x: worldToScreenX(config.snapshot.leftX, canvas.width, config.xRange),
    y: worldToScreenY(config.snapshot.leftY, canvas.height, config.yRange)
  };
  const rightPoint = {
    x: worldToScreenX(config.snapshot.rightX, canvas.width, config.xRange),
    y: worldToScreenY(config.snapshot.rightY, canvas.height, config.yRange)
  };
  const targetX = worldToScreenX(config.snapshot.pointX, canvas.width, config.xRange);

  context.save();
  context.setLineDash([8, 8]);
  context.strokeStyle = "rgba(15, 23, 42, 0.22)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(targetX, 0);
  context.lineTo(targetX, canvas.height);
  context.stroke();
  context.setLineDash([]);
  context.restore();

  if (Number.isFinite(config.snapshot.ghostY)) {
    drawOpenPoint(
      context,
      targetX,
      worldToScreenY(config.snapshot.ghostY, canvas.height, config.yRange),
      "rgba(124, 58, 237, 0.82)"
    );
  }

  if (config.showValue && config.snapshot.pointValue != null && Number.isFinite(config.snapshot.pointValue)) {
    context.save();
    context.fillStyle = "#111827";
    context.beginPath();
    context.arc(targetX, worldToScreenY(config.snapshot.pointValue, canvas.height, config.yRange), 7, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  drawFilledPoint(context, leftPoint.x, leftPoint.y, "rgba(249, 115, 22, 0.95)");
  drawFilledPoint(context, rightPoint.x, rightPoint.y, "rgba(59, 130, 246, 0.95)");
}

function drawOpenPoint(context, x, y, strokeStyle) {
  context.save();
  context.fillStyle = "rgba(255, 255, 255, 0.96)";
  context.strokeStyle = strokeStyle;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(x, y, 8, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function drawFilledPoint(context, x, y, fillStyle) {
  context.save();
  context.fillStyle = fillStyle;
  context.beginPath();
  context.arc(x, y, 7, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function buildLimitMissionState(mission, snapshot) {
  if (mission.type === "same") {
    const done = snapshot.sideGap < 0.18 && Number.isFinite(snapshot.leftY) && Number.isFinite(snapshot.rightY);
    return {
      ...mission,
      done,
      statusText: done ? "左右はほぼ同じ場所に近づいています。" : "左右の行き先をもっと近づけてみましょう。"
    };
  }

  if (mission.type === "point-mismatch") {
    const done =
      snapshot.sideGap < 0.18 &&
      snapshot.pointValue != null &&
      Number.isFinite(snapshot.pointValue) &&
      Number.isFinite(snapshot.leftY) &&
      Math.abs(snapshot.leftY - snapshot.pointValue) > 0.6;
    return {
      ...mission,
      done,
      statusText: done ? "真ん中の値と、近づいた先がズレています。" : "穴のある例や、点だけズラした例を選ぶと見つけやすいです。"
    };
  }

  const done = snapshot.sideGap > 0.9;
  return {
    ...mission,
    done,
    statusText: done ? "左右で行き先がはっきり分かれました。" : "飛びや壁のプリセットを選ぶと、左右の違いが見えやすくなります。"
  };
}

function describeLimitStatus(snapshot) {
  if (!Number.isFinite(snapshot.leftY) || !Number.isFinite(snapshot.rightY)) {
    return "そこには近づけません。壁の近くでは、点がどんどん遠くへ飛んでいきます。";
  }
  if (snapshot.sideGap < 0.18 && snapshot.pointValue != null && Number.isFinite(snapshot.pointValue) && Math.abs(snapshot.leftY - snapshot.pointValue) > 0.45) {
    return "左右は同じ場所に近づいていますが、その点の値は別の場所に置かれています。";
  }
  if (snapshot.sideGap < 0.18) {
    return "左右は同じ場所に近づいています。";
  }
  return "左右で行き先が一致していません。ひとつの答えに落ち着きません。";
}

function buildNewtonJourney(fn, startX, requestedSteps, maxSteps = 8) {
  const points = [{ x: startX, y: safeEvaluate(fn, startX) }];
  const steps = [];
  let status = "running";
  let reason = "まだ探索中です。";
  let currentX = startX;
  let currentY = safeEvaluate(fn, currentX);

  if (!Number.isFinite(currentY)) {
    return {
      points,
      steps,
      currentX,
      currentY,
      status: "failed",
      reason: "その出発点では高さを読めません。"
    };
  }

  for (let index = 0; index < Math.min(requestedSteps, maxSteps); index += 1) {
    const slope = numericDerivative(fn, currentX);
    if (!Number.isFinite(slope) || Math.abs(slope) < 0.04) {
      status = "failed";
      reason = "接線が寝すぎていて、次の一手が決めにくいです。";
      break;
    }

    const nextX = currentX - currentY / slope;
    const nextY = safeEvaluate(fn, nextX);
    steps.push({
      fromX: currentX,
      fromY: currentY,
      slope,
      nextX,
      nextY
    });
    points.push({ x: nextX, y: nextY });
    currentX = nextX;
    currentY = nextY;

    if (!Number.isFinite(nextY) || Math.abs(nextX) > 20) {
      status = "failed";
      reason = "この出発点は不安定です。かなり遠くへ飛びました。";
      break;
    }

    if (Math.abs(nextY) < 0.02) {
      status = "success";
      reason = "かなり根に近づきました。";
      break;
    }
  }

  if (status === "running" && requestedSteps >= maxSteps) {
    status = "failed";
    reason = "まだ着地しきれません。別の出発点を試すと変わります。";
  }

  return {
    points,
    steps,
    currentX,
    currentY,
    status,
    reason
  };
}

function drawNewtonScene(context, config) {
  const { canvas } = context;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintMathBackground(context, canvas.width, canvas.height);
  drawGraphGrid(context, canvas.width, canvas.height, config.preset.xRange, config.preset.yRange);

  if (!config.compiled.fn || !config.journey) {
    drawCanvasMessage(context, canvas.width, canvas.height, config.compiled.error || "式を入力してください。");
    return;
  }

  drawFunctionCurve(context, config.compiled.fn, config.preset.xRange, config.preset.yRange, {
    strokeStyle: "#0f766e",
    lineWidth: 3
  });

  if (config.showRoots) {
    context.save();
    context.fillStyle = "rgba(17, 24, 39, 0.4)";
    config.roots.forEach((root) => {
      const x = worldToScreenX(root, canvas.width, config.preset.xRange);
      const y = worldToScreenY(0, canvas.height, config.preset.yRange);
      context.beginPath();
      context.arc(x, y, 4.5, 0, Math.PI * 2);
      context.fill();
    });
    context.restore();
  }

  context.save();
  const axisY = worldToScreenY(0, canvas.height, config.preset.yRange);
  config.journey.steps.forEach((step, index) => {
    const fromX = worldToScreenX(step.fromX, canvas.width, config.preset.xRange);
    const fromY = worldToScreenY(step.fromY, canvas.height, config.preset.yRange);
    const nextX = worldToScreenX(step.nextX, canvas.width, config.preset.xRange);
    const nextY = worldToScreenY(step.nextY, canvas.height, config.preset.yRange);
    const isLatest = index === config.journey.steps.length - 1;

    if (config.showTrail) {
      context.strokeStyle = isLatest ? "rgba(249, 115, 22, 0.9)" : "rgba(124, 58, 237, 0.38)";
      context.lineWidth = isLatest ? 3 : 2;
      context.beginPath();
      context.moveTo(fromX, fromY);
      context.lineTo(nextX, axisY);
      context.lineTo(nextX, nextY);
      context.stroke();
    }

    if (isLatest) {
      drawSlopeLine(
        context,
        step.fromX,
        step.fromY,
        step.slope,
        config.preset.xRange,
        config.preset.yRange,
        "#f97316"
      );
    }
  });
  context.restore();

  const startMarkerX = worldToScreenX(config.journey.points[0].x, canvas.width, config.preset.xRange);
  const startMarkerY = axisY;
  drawOpenPoint(context, startMarkerX, startMarkerY, "rgba(17, 24, 39, 0.82)");

  const currentPoint = config.journey.points[config.journey.points.length - 1];
  drawFilledPoint(
    context,
    worldToScreenX(currentPoint.x, canvas.width, config.preset.xRange),
    worldToScreenY(currentPoint.y, canvas.height, config.preset.yRange),
    config.journey.status === "success" ? "rgba(34, 197, 94, 0.94)" : "rgba(17, 24, 39, 0.92)"
  );
}

function buildNewtonMissionState(mission, journey, roots) {
  if (!journey) {
    return {
      ...mission,
      done: false,
      statusText: "まず出発点を決めてください。"
    };
  }

  if (mission.type === "quick") {
    const done = journey.status === "success" && journey.steps.length <= 3;
    return {
      ...mission,
      done,
      statusText: done ? "3手以内で着地できました。" : "よい出発点を選ぶと、少ない手数で着地できます。"
    };
  }

  if (mission.type === "other-root") {
    const rightmostRoot = roots.length ? Math.max(...roots) : null;
    const done = journey.status === "success" && rightmostRoot != null && Math.abs(journey.currentX - rightmostRoot) < 0.18;
    return {
      ...mission,
      done,
      statusText: done ? "右側の別の根へ着地しました。" : "出発点を変えると、別の根へ吸い寄せられることがあります。"
    };
  }

  const done = journey.status === "failed";
  return {
    ...mission,
    done,
    statusText: done ? "不安定な出発点が見つかりました。" : "不安定なプリセットで、根から遠ざかる出発点を探してみましょう。"
  };
}

function describeNewtonStatus(journey) {
  if (!journey) return "まず出発点を置いてみてください。";
  if (journey.status === "success") return "かなり良い出発点です。あと少しで着地です。";
  if (journey.status === "failed") return journey.reason;
  if (!journey.steps.length) return "接線をまだ引いていません。まずは 1 手進めてみましょう。";
  return "外しながら当てにいっています。接線がどこへ飛ぶかを見てみましょう。";
}

function roundRect(context, x, y, width, height, radius) {
  if (height <= 0 || width <= 0) return;
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function buildDerivativeSnapshot(fn, x, h) {
  const safeH = Math.max(0.04, Math.abs(h));
  const y = safeEvaluate(fn, x);
  const secantY = safeEvaluate(fn, x + safeH);
  const leftY = safeEvaluate(fn, x - safeH);
  const secantSlope = Number.isFinite(y) && Number.isFinite(secantY) ? (secantY - y) / safeH : Number.NaN;
  const leftSlope = Number.isFinite(leftY) && Number.isFinite(y) ? (y - leftY) / safeH : Number.NaN;
  const rightSlope = secantSlope;
  const tangentSlope = numericDerivative(fn, x);
  const differentiable =
    Number.isFinite(leftSlope) &&
    Number.isFinite(rightSlope) &&
    Math.abs(leftSlope - rightSlope) < Math.max(0.3, Math.abs(leftSlope) * 0.18 + Math.abs(rightSlope) * 0.18);

  return {
    x,
    y,
    h: safeH,
    secantY,
    secantSlope,
    tangentSlope,
    leftSlope,
    rightSlope,
    differentiable
  };
}

function buildDerivativeMissionState(mission, snapshot) {
  if (!snapshot) {
    return {
      ...mission,
      done: false,
      statusText: "まず点を動かしてみてください。"
    };
  }

  let done = false;
  let statusText = "";

  if (mission.type === "zero") {
    const slope = snapshot.differentiable ? snapshot.tangentSlope : snapshot.secantSlope;
    done = Number.isFinite(slope) && Math.abs(slope) < 0.18;
    statusText = done ? "ほとんど平らです。山や谷の近くに来ました。" : `いまの傾きは ${formatNumber(slope)}。まだ坂が残っています。`;
  } else if (mission.type === "target") {
    const slope = snapshot.differentiable ? snapshot.tangentSlope : snapshot.secantSlope;
    done = Number.isFinite(slope) && Math.abs(slope - mission.target) < 0.2;
    statusText = done
      ? `${mission.target} くらいの上り坂を見つけました。`
      : `いまの傾きは ${formatNumber(slope)}。${mission.target} に近づけてみましょう。`;
  } else if (mission.type === "nondiff") {
    done = !snapshot.differentiable && Math.abs(snapshot.x) < 0.18;
    statusText = done
      ? "左右の坂がちがうので、接線が 1 本に定まりません。"
      : "折れ曲がりの真ん中へ点を持っていくと、接線が決めにくくなります。";
  }

  return {
    ...mission,
    done,
    statusText
  };
}

function buildIntegralMissionState(mission, area) {
  let done = false;
  let statusText = "";

  if (mission.type === "zero") {
    done = Number.isFinite(area) && Math.abs(area) < 0.35;
    statusText = done ? "正と負がほぼつり合いました。" : `いまの合計は ${formatNumber(area)}。0 に近づけてみましょう。`;
  } else if (mission.type === "target") {
    done = Number.isFinite(area) && Math.abs(area - mission.target) < 0.35;
    statusText = done
      ? `${mission.target} 付近までためられました。`
      : `いまは ${formatNumber(area)}。${mission.target} を目安に区間を動かします。`;
  } else if (mission.type === "negative") {
    done = Number.isFinite(area) && area < -0.8;
    statusText = done
      ? "下向きのたまりが優勢になりました。"
      : `いまの合計は ${formatNumber(area)}。x軸より下の面積が勝つ区間を探してみましょう。`;
  }

  return {
    ...mission,
    done,
    statusText
  };
}

function describeSlope(value) {
  if (!Number.isFinite(value)) return "つかみにくい";
  if (Math.abs(value) < 0.18) return "ほぼ平ら";
  if (value > 2) return "かなり急";
  if (value > 0) return "上り坂";
  if (value < -2) return "かなり急な下り";
  return "下り坂";
}

function derivativeLineColor(value) {
  if (!Number.isFinite(value)) return "#7c3aed";
  if (Math.abs(value) < 0.18) return "#f59e0b";
  if (value > 0) return "#16a34a";
  return "#2563eb";
}

function derivativeMeterTone(value) {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) < 0.18) return "is-soft";
  if (value > 0) return "is-positive";
  return "is-cool";
}

function riemannSum(fn, left, right, partitions, mode = "midpoint") {
  const steps = Math.max(1, partitions);
  const width = (right - left) / steps;
  let total = 0;
  for (let index = 0; index < steps; index += 1) {
    const x = left + width * index;
    const sampleX = mode === "left" ? x : mode === "right" ? x + width : x + width * 0.5;
    total += safeEvaluate(fn, sampleX) * width;
  }
  return total;
}

function applyBasisTransform(point, basis) {
  return {
    x: point.x * basis.u.x + point.y * basis.v.x,
    y: point.x * basis.u.y + point.y * basis.v.y
  };
}

function drawGeometryScene(context, scene) {
  const { canvas } = context;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintMathBackground(context, canvas.width, canvas.height);
  drawGraphGrid(context, canvas.width, canvas.height, 10, 10);

  context.save();
  context.lineWidth = 2.5;
  context.strokeStyle = "#1f2937";
  for (const segment of scene.segments) {
    drawGeometrySegment(context, segment.start, segment.end);
  }

  for (const polygon of scene.polygons) {
    drawGeometryPolygon(context, polygon, "rgba(59, 130, 246, 0.18)");
  }

  if (scene.polygonDraft.length > 1) {
    drawGeometryPolygon(context, scene.polygonDraft, "rgba(14, 165, 233, 0.12)", false);
  }

  for (const circle of scene.circles) {
    const center = worldToGeometryScreen(circle.center.x, circle.center.y, canvas.width, canvas.height);
    context.fillStyle = "rgba(168, 85, 247, 0.12)";
    context.strokeStyle = "#7c3aed";
    context.beginPath();
    context.arc(center.x, center.y, circle.radius * geometryScaleX(canvas.width), 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }

  if (scene.segmentDraft) {
    const center = worldToGeometryScreen(scene.segmentDraft.x, scene.segmentDraft.y, canvas.width, canvas.height);
    context.fillStyle = "#f97316";
    context.beginPath();
    context.arc(center.x, center.y, 6, 0, Math.PI * 2);
    context.fill();
  }

  if (scene.circleDraft) {
    const center = worldToGeometryScreen(scene.circleDraft.x, scene.circleDraft.y, canvas.width, canvas.height);
    context.fillStyle = "#a855f7";
    context.beginPath();
    context.arc(center.x, center.y, 6, 0, Math.PI * 2);
    context.fill();
  }

  for (const point of scene.points) {
    const screen = worldToGeometryScreen(point.x, point.y, canvas.width, canvas.height);
    context.fillStyle = "#0f172a";
    context.beginPath();
    context.arc(screen.x, screen.y, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#475569";
    context.font = "15px var(--font-sans, sans-serif)";
    context.fillText(point.label, screen.x + 10, screen.y - 10);
  }
  context.restore();
}

function drawGeometrySegment(context, start, end) {
  const canvas = context.canvas;
  const a = worldToGeometryScreen(start.x, start.y, canvas.width, canvas.height);
  const b = worldToGeometryScreen(end.x, end.y, canvas.width, canvas.height);
  context.beginPath();
  context.moveTo(a.x, a.y);
  context.lineTo(b.x, b.y);
  context.stroke();
  context.fillStyle = "#2563eb";
  context.beginPath();
  context.arc(a.x, a.y, 4, 0, Math.PI * 2);
  context.arc(b.x, b.y, 4, 0, Math.PI * 2);
  context.fill();
}

function drawGeometryPolygon(context, polygon, fill, closed = true) {
  const canvas = context.canvas;
  context.beginPath();
  polygon.forEach((point, index) => {
    const screen = worldToGeometryScreen(point.x, point.y, canvas.width, canvas.height);
    if (index === 0) {
      context.moveTo(screen.x, screen.y);
    } else {
      context.lineTo(screen.x, screen.y);
    }
  });
  if (closed) {
    context.closePath();
    context.fillStyle = fill;
    context.fill();
  }
  context.strokeStyle = "#2563eb";
  context.stroke();
}

function drawSurfaceScene(context, config) {
  const { canvas } = context;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintMathBackground(context, canvas.width, canvas.height);

  if (!config.compiled.fn) {
    drawCanvasMessage(context, canvas.width, canvas.height, config.compiled.error || "式を入力してください。");
    return;
  }

  const points = [];
  const steps = 24;
  const range = config.gridRange;

  for (let yIndex = 0; yIndex <= steps; yIndex += 1) {
    const row = [];
    const worldY = -range + (2 * range * yIndex) / steps;
    for (let xIndex = 0; xIndex <= steps; xIndex += 1) {
      const worldX = -range + (2 * range * xIndex) / steps;
      const z = config.compiled.fn(worldX, worldY);
      row.push({
        x: worldX,
        y: worldY,
        z: Number.isFinite(z) ? z : 0
      });
    }
    points.push(row);
  }

  context.save();
  context.strokeStyle = "rgba(15, 118, 110, 0.82)";
  context.lineWidth = 1.4;

  for (let rowIndex = 0; rowIndex <= steps; rowIndex += 1) {
    context.beginPath();
    for (let columnIndex = 0; columnIndex <= steps; columnIndex += 1) {
      const projected = projectSurfacePoint(points[rowIndex][columnIndex], config, canvas);
      if (columnIndex === 0) context.moveTo(projected.x, projected.y);
      else context.lineTo(projected.x, projected.y);
    }
    context.stroke();
  }

  context.strokeStyle = "rgba(59, 130, 246, 0.55)";
  for (let columnIndex = 0; columnIndex <= steps; columnIndex += 1) {
    context.beginPath();
    for (let rowIndex = 0; rowIndex <= steps; rowIndex += 1) {
      const projected = projectSurfacePoint(points[rowIndex][columnIndex], config, canvas);
      if (rowIndex === 0) context.moveTo(projected.x, projected.y);
      else context.lineTo(projected.x, projected.y);
    }
    context.stroke();
  }

  context.restore();
}

function projectSurfacePoint(point, config, canvas) {
  const scaledX = point.x;
  const scaledY = point.y;
  const scaledZ = point.z * config.zScale;

  const cosY = Math.cos(config.rotationY);
  const sinY = Math.sin(config.rotationY);
  const cosX = Math.cos(config.rotationX);
  const sinX = Math.sin(config.rotationX);

  const x1 = scaledX * cosY + scaledZ * sinY;
  const z1 = -scaledX * sinY + scaledZ * cosY;
  const y1 = scaledY * cosX - z1 * sinX;

  return {
    x: canvas.width / 2 + x1 * config.zoom,
    y: canvas.height / 2 + y1 * config.zoom
  };
}

function geometryScreenToWorld(x, y, width, height) {
  return {
    x: ((x / width) * 20 - 10).toFixed(2) * 1,
    y: (10 - (y / height) * 20).toFixed(2) * 1
  };
}

function worldToGeometryScreen(x, y, width, height) {
  return {
    x: ((x + 10) / 20) * width,
    y: ((10 - y) / 20) * height
  };
}

function geometryScaleX(width) {
  return width / 20;
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nextPointLabel(index) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index < alphabet.length) return alphabet[index];
  return `P${index + 1}`;
}

function toolLabel(tool) {
  return GEOMETRY_TOOLS.find((item) => item.id === tool)?.label || "幾何";
}

function geometryHint(tool, segmentDraft, polygonDraft, circleDraft) {
  if (tool === "point") return "キャンバスをクリックして点を置きます。";
  if (tool === "segment") {
    return segmentDraft ? "2点目をクリックすると線分が確定します。" : "始点と終点を順にクリックします。";
  }
  if (tool === "polygon") {
    return polygonDraft.length ? "頂点を追加して「多角形を閉じる」を押します。" : "頂点を順にクリックして多角形を作ります。";
  }
  if (tool === "circle") {
    return circleDraft ? "半径を決める点をクリックします。" : "中心をクリックしてから円周上の点をクリックします。";
  }
  return "";
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function clampFloat(value, min, max, fallback) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.abs(value) > 9999 ? value.toExponential(3) : value.toFixed(4);
  return rounded.replace(/\.?0+$/, "");
}

function safeEvaluate(fn, ...args) {
  try {
    const value = fn(...args);
    return Number.isFinite(value) ? value : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

function pushUnique(values, candidate) {
  if (!Number.isFinite(candidate)) return;
  if (values.some((value) => Math.abs(value - candidate) < 1e-3)) return;
  values.push(candidate);
}

function parsePolynomial(input) {
  const tokens = tokenizePolynomial(input);
  let position = 0;

  function peek() {
    return tokens[position];
  }

  function consume(expected) {
    const token = tokens[position];
    if (!token || (expected && token.value !== expected)) {
      throw new Error("多項式を解釈できませんでした。掛け算は * で入力してください。");
    }
    position += 1;
    return token;
  }

  function parseExpression() {
    let value = parseTerm();
    while (peek() && (peek().value === "+" || peek().value === "-")) {
      const operator = consume().value;
      const right = parseTerm();
      value = operator === "+" ? addPolynomial(value, right) : subtractPolynomial(value, right);
    }
    return value;
  }

  function parseTerm() {
    let value = parseFactor();
    while (peek() && peek().value === "*") {
      consume("*");
      value = multiplyPolynomial(value, parseFactor());
    }
    return value;
  }

  function parseFactor() {
    let value = parseUnary();
    while (peek() && peek().value === "^") {
      consume("^");
      const exponentPoly = parseUnary();
      if (polynomialDegree(exponentPoly) !== 0) {
        throw new Error("指数には整数を指定してください。");
      }
      const exponent = exponentPoly[0];
      if (!Number.isInteger(exponent) || exponent < 0 || exponent > 12) {
        throw new Error("指数は 0 以上 12 以下の整数で入力してください。");
      }
      value = powerPolynomial(value, exponent);
    }
    return value;
  }

  function parseUnary() {
    if (peek()?.value === "+") {
      consume("+");
      return parseUnary();
    }
    if (peek()?.value === "-") {
      consume("-");
      return negatePolynomial(parseUnary());
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const token = peek();
    if (!token) throw new Error("多項式が空です。");

    if (token.type === "number") {
      consume();
      return [token.numeric];
    }

    if (token.type === "variable") {
      consume();
      return [0, 1];
    }

    if (token.value === "(") {
      consume("(");
      const value = parseExpression();
      consume(")");
      return value;
    }

    throw new Error("多項式を解釈できませんでした。");
  }

  const polynomial = trimPolynomial(parseExpression());
  if (position !== tokens.length) {
    throw new Error("多項式の末尾を解釈できませんでした。");
  }

  return polynomial;
}

function tokenizePolynomial(input) {
  const source = `${input || ""}`.replace(/\s+/g, "");
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    if ("+-*^()".includes(char)) {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }

    if (char === "x" || char === "X") {
      tokens.push({ type: "variable", value: "x" });
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let end = index + 1;
      while (end < source.length && /[0-9.]/.test(source[end])) {
        end += 1;
      }
      const slice = source.slice(index, end);
      const numeric = Number(slice);
      if (!Number.isFinite(numeric)) {
        throw new Error("数値を解釈できませんでした。");
      }
      tokens.push({ type: "number", value: slice, numeric });
      index = end;
      continue;
    }

    throw new Error(`未対応の文字があります: ${char}`);
  }

  return tokens;
}

function trimPolynomial(coeffs) {
  const next = [...coeffs];
  while (next.length > 1 && Math.abs(next[next.length - 1]) < 1e-9) {
    next.pop();
  }
  return next;
}

function polynomialDegree(coeffs) {
  return trimPolynomial(coeffs).length - 1;
}

function addPolynomial(left, right) {
  const length = Math.max(left.length, right.length);
  const result = Array.from({ length }, (_, index) => (left[index] || 0) + (right[index] || 0));
  return trimPolynomial(result);
}

function subtractPolynomial(left, right) {
  const length = Math.max(left.length, right.length);
  const result = Array.from({ length }, (_, index) => (left[index] || 0) - (right[index] || 0));
  return trimPolynomial(result);
}

function negatePolynomial(value) {
  return value.map((coefficient) => -coefficient);
}

function multiplyPolynomial(left, right) {
  const result = Array.from({ length: left.length + right.length - 1 }, () => 0);
  left.forEach((leftCoefficient, leftIndex) => {
    right.forEach((rightCoefficient, rightIndex) => {
      result[leftIndex + rightIndex] += leftCoefficient * rightCoefficient;
    });
  });
  return trimPolynomial(result);
}

function powerPolynomial(base, exponent) {
  let result = [1];
  for (let index = 0; index < exponent; index += 1) {
    result = multiplyPolynomial(result, base);
  }
  return result;
}

function derivePolynomial(coeffs) {
  if (coeffs.length <= 1) return [0];
  return trimPolynomial(coeffs.slice(1).map((coefficient, index) => coefficient * (index + 1)));
}

function evaluatePolynomial(coeffs, x) {
  return coeffs.reduce((total, coefficient, index) => total + coefficient * x ** index, 0);
}

function formatPolynomial(coeffs) {
  const normalized = trimPolynomial(coeffs);
  if (normalized.length === 1 && Math.abs(normalized[0]) < 1e-9) return "0";

  const parts = [];
  for (let exponent = normalized.length - 1; exponent >= 0; exponent -= 1) {
    const coefficient = normalized[exponent];
    if (Math.abs(coefficient) < 1e-9) continue;

    const sign = coefficient < 0 ? "-" : "+";
    const absCoefficient = Math.abs(coefficient);

    let body = "";
    if (exponent === 0) {
      body = formatNumber(absCoefficient);
    } else if (exponent === 1) {
      body = absCoefficient === 1 ? "x" : `${formatNumber(absCoefficient)}*x`;
    } else {
      body = absCoefficient === 1 ? `x^${exponent}` : `${formatNumber(absCoefficient)}*x^${exponent}`;
    }

    parts.push(`${sign} ${body}`);
  }

  return parts.join(" ").replace(/^\+\s/, "");
}

function factorPolynomial(coeffs) {
  let polynomial = trimPolynomial(coeffs);
  if (polynomial.length === 1) return formatPolynomial(polynomial);

  const factors = [];
  const scalar = extractPolynomialScalar(polynomial);
  if (Math.abs(scalar) > 1e-9 && Math.abs(scalar - 1) > 1e-9) {
    factors.push(formatNumber(scalar));
    polynomial = polynomial.map((coefficient) => coefficient / scalar);
  }

  let guard = 0;
  while (polynomialDegree(polynomial) > 1 && guard < 12) {
    guard += 1;
    const root = findRationalRoot(polynomial);
    if (root == null) break;
    factors.push(formatLinearFactor(root));
    polynomial = syntheticDivide(polynomial, root);
  }

  if (polynomialDegree(polynomial) === 2) {
    const [c, b, a] = polynomial;
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      const sqrt = Math.sqrt(discriminant);
      if (Number.isFinite(sqrt)) {
        const root1 = (-b + sqrt) / (2 * a);
        const root2 = (-b - sqrt) / (2 * a);
        if (Math.abs(root1 - root2) < 1e-9) {
          factors.push(formatLinearFactor(root1));
          factors.push(formatLinearFactor(root2));
          polynomial = [1];
        } else if (Number.isFinite(root1) && Number.isFinite(root2)) {
          factors.push(formatLinearFactor(root1));
          factors.push(formatLinearFactor(root2));
          polynomial = [1];
        }
      }
    }
  } else if (polynomialDegree(polynomial) === 1) {
    factors.push(formatLinearPolynomial(polynomial));
    polynomial = [1];
  }

  if (!(polynomial.length === 1 && Math.abs(polynomial[0] - 1) < 1e-9)) {
    factors.push(`(${formatPolynomial(polynomial)})`);
  }

  return factors.join(" × ");
}

function extractPolynomialScalar(coeffs) {
  const integers = coeffs.every((coefficient) => Math.abs(coefficient - Math.round(coefficient)) < 1e-9);
  if (!integers) {
    if (coeffs[coeffs.length - 1] < 0) return -1;
    return 1;
  }

  const gcd = coeffs.reduce((current, coefficient) => gcdIntegers(current, Math.round(coefficient)), 0);
  if (gcd === 0) return 1;
  return coeffs[coeffs.length - 1] < 0 ? -Math.abs(gcd) : Math.abs(gcd);
}

function gcdIntegers(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  if (a === 0) return b;
  if (b === 0) return a;
  while (b) {
    const temp = a % b;
    a = b;
    b = temp;
  }
  return a;
}

function findRationalRoot(coeffs) {
  const normalized = coeffs.map((coefficient) => Math.round(coefficient));
  const constant = normalized[0];
  const leading = normalized[normalized.length - 1];
  if (constant === 0) return 0;

  const numerators = divisors(Math.abs(constant));
  const denominators = divisors(Math.abs(leading));
  for (const numerator of numerators) {
    for (const denominator of denominators) {
      const candidate = numerator / denominator;
      const possibilities = [candidate, -candidate];
      for (const value of possibilities) {
        if (Math.abs(evaluatePolynomial(coeffs, value)) < 1e-6) {
          return value;
        }
      }
    }
  }
  return null;
}

function divisors(value) {
  const result = [];
  for (let current = 1; current <= value; current += 1) {
    if (value % current === 0) result.push(current);
  }
  return result;
}

function syntheticDivide(coeffs, root) {
  const degree = polynomialDegree(coeffs);
  const descending = [...coeffs].reverse();
  const result = [descending[0]];

  for (let index = 1; index < descending.length; index += 1) {
    result[index] = descending[index] + result[index - 1] * root;
  }

  const quotientDescending = result.slice(0, degree);
  return trimPolynomial(quotientDescending.reverse());
}

function formatLinearFactor(root) {
  if (Math.abs(root) < 1e-9) return "(x)";
  if (root > 0) return `(x - ${formatNumber(root)})`;
  return `(x + ${formatNumber(Math.abs(root))})`;
}

function formatLinearPolynomial(coeffs) {
  const [constant, linear] = coeffs;
  return `(${formatPolynomial([constant, linear])})`;
}
