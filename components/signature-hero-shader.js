"use client";

import { useEffect, useRef } from "react";

const PARTICLE_COUNT = 34;
const FIELD_LINE_COUNT = 8;

export function SignatureHeroShader() {
  const canvasRef = useRef(null);
  const pointerRef = useRef({ x: 0.5, y: 0.42, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d");
    if (!context) return undefined;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const particles = createParticles();
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let devicePixelRatio = 1;
    let lastFrameTime = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(width * devicePixelRatio);
      canvas.height = Math.round(height * devicePixelRatio);
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    function render(now) {
      if (!width || !height) {
        animationFrame = window.requestAnimationFrame(render);
        return;
      }

      const elapsed = (now - lastFrameTime) / 1000 || 0;
      lastFrameTime = now;
      const time = now * 0.001;
      const motionScale = mediaQuery.matches ? 0.18 : 1;

      context.clearRect(0, 0, width, height);

      drawFieldLines(context, width, height, time, pointerRef.current, motionScale);
      drawRipples(context, width, height, time, pointerRef.current, motionScale);
      drawParticles(context, width, height, particles, elapsed, pointerRef.current, motionScale);

      animationFrame = window.requestAnimationFrame(render);
    }

    function handlePointerMove(event) {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
        active: true
      };
    }

    function handlePointerLeave() {
      pointerRef.current = {
        x: 0.5,
        y: 0.42,
        active: false
      };
    }

    resize();
    animationFrame = window.requestAnimationFrame(render);

    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <div className="signature-shader-shell" aria-hidden="true">
      <canvas ref={canvasRef} className="signature-shader-canvas" />
      <div className="signature-shader-meta">
        <span>Quiet ripples</span>
        <span>Drift particles</span>
        <span>Field lines</span>
      </div>
    </div>
  );
}

function createParticles() {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    radius: 0.8 + Math.random() * 2.6,
    speedX: (Math.random() - 0.5) * 0.012,
    speedY: (Math.random() - 0.5) * 0.01,
    phase: Math.random() * Math.PI * 2
  }));
}

function drawFieldLines(context, width, height, time, pointer, motionScale) {
  const pointerInfluence = pointer.active ? (pointer.x - 0.5) * 32 : 0;

  for (let index = 0; index < FIELD_LINE_COUNT; index += 1) {
    const ratio = index / Math.max(FIELD_LINE_COUNT - 1, 1);
    const baseY = height * (0.2 + ratio * 0.62);
    const hue = index % 2 === 0 ? "168, 215, 218" : "178, 149, 94";
    const alpha = index % 2 === 0 ? 0.22 : 0.15;

    context.beginPath();

    for (let x = 0; x <= width; x += 8) {
      const wave =
        Math.sin(x * 0.011 + time * (0.5 + ratio * 0.22) * motionScale + index) * (8 + ratio * 12) +
        Math.cos(x * 0.005 + time * 0.27 * motionScale + index * 0.5) * 6;
      const pull = pointerInfluence * Math.exp(-Math.abs(x - width * pointer.x) / 240);
      const y = baseY + wave + pull;

      if (x === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }

    context.strokeStyle = `rgba(${hue}, ${alpha})`;
    context.lineWidth = index % 3 === 0 ? 1.4 : 1;
    context.stroke();
  }
}

function drawRipples(context, width, height, time, pointer, motionScale) {
  const rippleCenters = [
    { x: width * 0.26, y: height * 0.32, color: "178, 149, 94" },
    {
      x: width * (pointer.active ? pointer.x : 0.72),
      y: height * (pointer.active ? pointer.y : 0.58),
      color: "168, 215, 218"
    }
  ];

  rippleCenters.forEach((center, centerIndex) => {
    for (let ring = 0; ring < 3; ring += 1) {
      const radius =
        42 +
        ring * 38 +
        Math.sin(time * (0.55 + centerIndex * 0.2) * motionScale + ring) * 9;

      context.beginPath();
      context.arc(center.x, center.y, radius, 0, Math.PI * 2);
      context.strokeStyle = `rgba(${center.color}, ${0.09 - ring * 0.018})`;
      context.lineWidth = 1;
      context.stroke();
    }
  });
}

function drawParticles(context, width, height, particles, elapsed, pointer, motionScale) {
  particles.forEach((particle, index) => {
    particle.x += particle.speedX * elapsed * 60 * motionScale;
    particle.y += particle.speedY * elapsed * 60 * motionScale;

    if (particle.x < -0.04) particle.x = 1.04;
    if (particle.x > 1.04) particle.x = -0.04;
    if (particle.y < -0.04) particle.y = 1.04;
    if (particle.y > 1.04) particle.y = -0.04;

    const px = particle.x * width;
    const py = particle.y * height;
    const distance = Math.hypot(px - width * pointer.x, py - height * pointer.y);
    const glow = pointer.active ? Math.max(0, 1 - distance / 220) : 0;
    const opacity = 0.16 + ((Math.sin(index + particle.phase) + 1) * 0.5 + glow * 0.6) * 0.18;
    const radius = particle.radius + glow * 1.8;

    context.beginPath();
    context.arc(px, py, radius, 0, Math.PI * 2);
    context.fillStyle = index % 3 === 0 ? `rgba(178, 149, 94, ${opacity})` : `rgba(168, 215, 218, ${opacity})`;
    context.fill();
  });
}
