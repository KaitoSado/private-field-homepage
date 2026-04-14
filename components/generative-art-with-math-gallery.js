"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TWO_PI = Math.PI * 2;
const STEP = TWO_PI * 0.01;
const SPEED = STEP * 0.72;
const MAX_THETA = TWO_PI * 18;
const CONTROL_POINT_NUM = 9;
const BEZIER_SEGMENTS = 132;
const CONTROL_POINT_GAP = STEP * 18;
const BEZIER_TRAIL_GAP = STEP * 34;
const START_THETA = CONTROL_POINT_GAP * (CONTROL_POINT_NUM + 5);

const INITIAL_SETTINGS = {
  symmetry: 10,
  trails: 4,
  tempo: 1
};

const galleryItems = [
  {
    id: "spiral-polygon",
    chapter: "Ch16",
    title: "Spiral Polygon",
    line: "Processing render / Canvas preview"
  }
];

const spiralPolygonCredits = [
  "Created by Kaito Sado.",
  "Based on GenerativeArtWithMath-p5.js Samples by Tetsunori NAKAYAMA, MIT License.",
  'Inspired by "Generative Art with Math" by Tatsuki HAYAMA.'
];

function pointOnFermat(angle, width, height, scale) {
  const radius = 20 * Math.sqrt(Math.max(0, angle)) * scale;

  return {
    x: width * 0.5 + radius * Math.cos(angle),
    y: height * 0.5 + radius * Math.sin(angle)
  };
}

function getAxisControlPoints(headTheta, width, height, scale) {
  return Array.from({ length: CONTROL_POINT_NUM }, (_, index) => {
    const angle = Math.max(0, headTheta - (CONTROL_POINT_NUM - 1 - index) * CONTROL_POINT_GAP);
    return pointOnFermat(angle, width, height, scale);
  });
}

function rotatePoint(point, angle, width, height) {
  const x = point.x - width * 0.5;
  const y = point.y - height * 0.5;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: width * 0.5 + x * cos - y * sin,
    y: height * 0.5 + x * sin + y * cos
  };
}

function rotatePoints(points, angle, width, height) {
  return points.map((point) => rotatePoint(point, angle, width, height));
}

function lerpPoint(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  };
}

function bezierPointByDeCasteljau(points, t) {
  let current = points.map((point) => ({ ...point }));

  while (current.length > 1) {
    current = current.slice(0, -1).map((point, index) => lerpPoint(point, current[index + 1], t));
  }

  return current[0];
}

function drawBezierPolyline(context, points) {
  context.beginPath();

  for (let index = 0; index <= BEZIER_SEGMENTS; index += 1) {
    const t = index / BEZIER_SEGMENTS;
    const point = bezierPointByDeCasteljau(points, t);

    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  }

  context.stroke();
}

function drawPaperGrid(context, width, height) {
  context.fillStyle = "#fbfcf8";
  context.fillRect(0, 0, width, height);

  context.save();
  context.strokeStyle = "rgba(17, 19, 15, 0.055)";
  context.lineWidth = 1;

  for (let x = 0; x <= width; x += 36) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }

  for (let y = 0; y <= height; y += 36) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.restore();
}

function drawFermatAxis(context, endTheta, width, height, scale) {
  context.save();
  context.strokeStyle = "rgba(18, 19, 16, 0.48)";
  context.lineWidth = 1.15;
  context.lineCap = "round";
  context.beginPath();

  for (let angle = 0; angle <= endTheta; angle += STEP) {
    const point = pointOnFermat(angle, width, height, scale);

    if (angle === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  }

  context.stroke();
  context.restore();
}

function drawSymmetricHigherBezier(context, points, alphaScale, symmetry, width, height) {
  for (let index = 0; index < symmetry; index += 1) {
    const angle = (index * TWO_PI) / symmetry;
    const hue = (index * 360) / symmetry;
    const rotated = rotatePoints(points, angle, width, height);

    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";

    context.strokeStyle = `hsla(${hue}, 82%, 58%, ${0.2 * alphaScale})`;
    context.lineWidth = 5;
    drawBezierPolyline(context, rotated);

    context.strokeStyle = `hsla(${hue}, 86%, 27%, ${0.88 * alphaScale})`;
    context.lineWidth = 1.45;
    drawBezierPolyline(context, rotated);

    context.restore();
  }
}

function drawControlPolygon(context, points) {
  context.save();
  context.strokeStyle = "rgba(220, 79, 58, 0.42)";
  context.lineWidth = 1;
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });
  context.stroke();
  context.restore();
}

function drawControlPoints(context, points) {
  context.save();

  points.forEach((point, index) => {
    const hue = (index * 360) / points.length;
    context.fillStyle = `hsla(${hue}, 78%, 58%, 0.36)`;
    context.beginPath();
    context.arc(point.x, point.y, 8, 0, TWO_PI);
    context.fill();

    context.fillStyle = "rgba(17, 19, 15, 0.94)";
    context.beginPath();
    context.arc(point.x, point.y, 2.2, 0, TWO_PI);
    context.fill();
  });

  context.restore();
}

function drawCanvasLabel(context, width, height) {
  context.save();
  context.fillStyle = "rgba(17, 19, 15, 0.72)";
  context.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.fillText("r = 20 sqrt(theta)", 14, height - 32);
  context.fillText("Bezier(Fermat control points) x rotation symmetry", 14, height - 14);
  context.restore();
}

function drawSpiralPolygon(context, theta, settings, width, height) {
  const scale = Math.min(width, height) / 500;

  drawPaperGrid(context, width, height);
  drawFermatAxis(context, theta, width, height, scale);

  for (let index = settings.trails - 1; index >= 0; index -= 1) {
    const trailTheta = Math.max(START_THETA, theta - index * BEZIER_TRAIL_GAP);
    const alphaScale = settings.trails === 1 ? 1 : 1 - (index / (settings.trails - 1)) * 0.58;
    const points = getAxisControlPoints(trailTheta, width, height, scale);
    drawSymmetricHigherBezier(context, points, alphaScale, settings.symmetry, width, height);
  }

  const points = getAxisControlPoints(theta, width, height, scale);
  drawControlPolygon(context, points);
  drawControlPoints(context, points);
  drawCanvasLabel(context, width, height);
}

export function GenerativeArtWithMathGallery() {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const thetaRef = useRef(START_THETA);
  const settingsRef = useRef(INITIAL_SETTINGS);
  const isPlayingRef = useRef(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [stageSize, setStageSize] = useState({ width: 900, height: 620 });

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(320, Math.floor(entry.contentRect.width));
      const height = Math.max(360, Math.floor(entry.contentRect.height));
      setStageSize({ width, height });
    });

    observer.observe(stage);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return undefined;
    }

    let animationFrame = 0;
    let previousTime = performance.now();

    const render = (time) => {
      const width = stageSize.width;
      const height = stageSize.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.floor(width * dpr);
      const pixelHeight = Math.floor(height * dpr);

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const delta = Math.min(48, time - previousTime);
      previousTime = time;

      if (isPlayingRef.current) {
        thetaRef.current += SPEED * settingsRef.current.tempo * (delta / 16.67);
      }

      if (thetaRef.current > MAX_THETA) {
        thetaRef.current = START_THETA;
      }

      drawSpiralPolygon(context, thetaRef.current, settingsRef.current, width, height);
      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationFrame);
  }, [stageSize]);

  const updateSetting = useCallback((key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  }, []);

  const resetArtwork = useCallback(() => {
    thetaRef.current = START_THETA;
  }, []);

  const exportArtwork = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "generative-art-with-math-spiral-polygon.png";
      anchor.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, []);

  return (
    <section className="gen-art-shell">
      <header className="gen-art-hero">
        <div>
          <p className="gen-art-kicker">GenerativeArtWithMath</p>
          <h1>数学で線を育てるギャラリー</h1>
          <p className="gen-art-lead">Processing で作品を書き出し、Web では出力と live preview を並べる。</p>
        </div>
        <span className="gen-art-route-pill">Processing {"->"} Web Gallery</span>
      </header>

      <div className="gen-art-layout">
        <aside className="gen-art-gallery" aria-label="GenerativeArtWithMath gallery">
          <p className="gen-art-section-label">Gallery</p>
          {galleryItems.map((item) => (
            <button key={item.id} type="button" className="gen-art-piece is-active">
              <span className="gen-art-piece-thumb" aria-hidden="true">
                <span />
              </span>
              <span className="gen-art-piece-copy">
                <small>{item.chapter}</small>
                <strong>{item.title}</strong>
                <em>{item.line}</em>
              </span>
            </button>
          ))}
        </aside>

        <article className="gen-art-stage" aria-label="Spiral Polygon Processing output and canvas preview">
          <div className="gen-art-stage-head">
            <div>
              <p>Processing Output</p>
              <h2>SpiralPolygonRender.pde</h2>
            </div>
            <div className="gen-art-action-row">
              <button type="button" className="button button-secondary gen-art-button" onClick={() => setIsPlaying((current) => !current)}>
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button type="button" className="button button-secondary gen-art-button" onClick={resetArtwork}>
                Reset
              </button>
              <button type="button" className="button button-primary gen-art-button" onClick={exportArtwork}>
                Export Live PNG
              </button>
            </div>
          </div>

          <figure className="gen-art-processing-output">
            <img
              src="/generative-art-with-math/spiral-polygon/spiral-polygon-processing.png"
              alt="Processing render of Spiral Polygon"
            />
            <figcaption>
              <span>Generated with Processing CLI from scripts/processing/SpiralPolygonRender.</span>
              <span className="gen-art-credit">
                {spiralPolygonCredits.map((credit) => (
                  <span key={credit}>{credit}</span>
                ))}
              </span>
            </figcaption>
          </figure>

          <div className="gen-art-live-head">
            <p>Live Preview</p>
            <span>Canvas 2D port for parameter play</span>
          </div>
          <div ref={stageRef} className="gen-art-canvas-wrap">
            <canvas ref={canvasRef} className="gen-art-canvas" aria-label="Animated Spiral Polygon artwork" />
          </div>
        </article>

        <aside className="gen-art-controls" aria-label="Spiral Polygon controls">
          <div className="gen-art-controls-head">
            <p>Processing Source</p>
            <h2>Spiral Polygon</h2>
          </div>

          <div className="gen-art-source-card">
            <span>Sketch</span>
            <strong>scripts/processing/SpiralPolygonRender</strong>
          </div>

          <div className="gen-art-source-card gen-art-credit-card">
            <span>Credits</span>
            {spiralPolygonCredits.map((credit) => (
              <strong key={credit}>{credit}</strong>
            ))}
          </div>

          <label className="gen-art-slider">
            <span>
              Symmetry
              <strong>{settings.symmetry}</strong>
            </span>
            <input
              type="range"
              min="5"
              max="16"
              value={settings.symmetry}
              onChange={(event) => updateSetting("symmetry", Number(event.target.value))}
            />
          </label>

          <label className="gen-art-slider">
            <span>
              Trails
              <strong>{settings.trails}</strong>
            </span>
            <input
              type="range"
              min="1"
              max="7"
              value={settings.trails}
              onChange={(event) => updateSetting("trails", Number(event.target.value))}
            />
          </label>

          <label className="gen-art-slider">
            <span>
              Tempo
              <strong>{settings.tempo.toFixed(1)}</strong>
            </span>
            <input
              type="range"
              min="0.4"
              max="2.2"
              step="0.1"
              value={settings.tempo}
              onChange={(event) => updateSetting("tempo", Number(event.target.value))}
            />
          </label>

          <div className="gen-art-stat-grid">
            <div>
              <span>Runtime</span>
              <strong>Processing 4</strong>
            </div>
            <div>
              <span>Curve</span>
              <strong>Bezier</strong>
            </div>
            <div>
              <span>Points</span>
              <strong>{CONTROL_POINT_NUM}</strong>
            </div>
            <div>
              <span>Segments</span>
              <strong>{BEZIER_SEGMENTS}</strong>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
