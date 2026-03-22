"use client";

import { useEffect, useRef } from "react";

const PARTICLE_COUNT = 96;
const FIELD_LINE_COUNT = 14;

export function SignaturePageAmbient() {
  const canvasRef = useRef(null);
  const pointerRef = useRef({ x: 0.5, y: 0.32, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d");
    if (!context) return undefined;

    const particles = createParticles();
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const resizeObserver = new ResizeObserver(resize);
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let devicePixelRatio = 1;
    let lastFrameTime = 0;

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = parent.scrollHeight;
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(width * devicePixelRatio);
      canvas.height = Math.round(height * devicePixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
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
      const motionScale = mediaQuery.matches ? 0.2 : 1;

      context.clearRect(0, 0, width, height);
      drawSweep(context, width, height, time, motionScale);
      drawFieldLines(context, width, height, time, pointerRef.current, motionScale);
      drawParticles(context, width, height, particles, elapsed, pointerRef.current, motionScale);
      drawConnections(context, width, height, particles, pointerRef.current);

      animationFrame = window.requestAnimationFrame(render);
    }

    function handlePointerMove(event) {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: (event.clientX - rect.left) / Math.max(rect.width, 1),
        y: (event.clientY - rect.top) / Math.max(rect.height, 1),
        active: true
      };
    }

    function handlePointerLeave() {
      pointerRef.current = {
        x: 0.5,
        y: 0.32,
        active: false
      };
    }

    resize();
    resizeObserver.observe(canvas.parentElement);
    animationFrame = window.requestAnimationFrame(render);

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="signature-page-ambient-canvas" aria-hidden="true" />;
}

function createParticles() {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    radius: 0.7 + Math.random() * 2.2,
    speedX: (Math.random() - 0.5) * 0.012,
    speedY: (Math.random() - 0.5) * 0.015,
    phase: Math.random() * Math.PI * 2
  }));
}

function drawSweep(context, width, height, time, motionScale) {
  const sweepY = ((Math.sin(time * 0.16 * motionScale) + 1) * 0.5) * height;
  const gradient = context.createLinearGradient(0, sweepY - 260, width, sweepY + 260);
  gradient.addColorStop(0, "rgba(168, 215, 218, 0)");
  gradient.addColorStop(0.44, "rgba(168, 215, 218, 0.035)");
  gradient.addColorStop(0.54, "rgba(178, 149, 94, 0.06)");
  gradient.addColorStop(1, "rgba(178, 149, 94, 0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawFieldLines(context, width, height, time, pointer, motionScale) {
  const pointerInfluence = pointer.active ? (pointer.x - 0.5) * 18 : 0;

  for (let index = 0; index < FIELD_LINE_COUNT; index += 1) {
    const ratio = index / Math.max(FIELD_LINE_COUNT - 1, 1);
    const baseY = height * (0.06 + ratio * 0.88);
    const hue = index % 2 === 0 ? "168, 215, 218" : "178, 149, 94";
    const alpha = index % 3 === 0 ? 0.12 : 0.08;

    context.beginPath();

    for (let x = 0; x <= width; x += 10) {
      const wave =
        Math.sin(x * 0.008 + time * (0.46 + ratio * 0.12) * motionScale + index) * (8 + ratio * 22) +
        Math.cos(x * 0.004 + time * 0.22 * motionScale + index * 0.35) * 6;
      const pull = pointerInfluence * Math.exp(-Math.abs(x - width * pointer.x) / 220);
      const y = baseY + wave + pull;

      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }

    context.strokeStyle = `rgba(${hue}, ${alpha})`;
    context.lineWidth = index % 4 === 0 ? 1.4 : 0.9;
    context.stroke();
  }
}

function drawParticles(context, width, height, particles, elapsed, pointer, motionScale) {
  particles.forEach((particle, index) => {
    particle.x += particle.speedX * elapsed * 60 * motionScale;
    particle.y += particle.speedY * elapsed * 60 * motionScale;

    if (particle.x < -0.05) particle.x = 1.05;
    if (particle.x > 1.05) particle.x = -0.05;
    if (particle.y < -0.05) particle.y = 1.05;
    if (particle.y > 1.05) particle.y = -0.05;

    const px = particle.x * width;
    const py = particle.y * height;
    const distance = Math.hypot(px - width * pointer.x, py - height * pointer.y);
    const glow = pointer.active ? Math.max(0, 1 - distance / 220) : 0;
    const pulse = (Math.sin(index + particle.phase + elapsed * 12) + 1) * 0.5;
    const opacity = 0.08 + (pulse + glow * 1.12) * 0.12;
    const radius = particle.radius + glow * 2.4;

    context.beginPath();
    context.arc(px, py, radius, 0, Math.PI * 2);
    context.fillStyle = index % 3 === 0 ? `rgba(178, 149, 94, ${opacity})` : `rgba(168, 215, 218, ${opacity})`;
    context.fill();
  });
}

function drawConnections(context, width, height, particles, pointer) {
  const maxDistance = pointer.active ? 138 : 104;

  for (let index = 0; index < particles.length; index += 1) {
    const left = particles[index];
    const leftX = left.x * width;
    const leftY = left.y * height;

    for (let inner = index + 1; inner < particles.length; inner += 1) {
      const right = particles[inner];
      const rightX = right.x * width;
      const rightY = right.y * height;
      const distance = Math.hypot(leftX - rightX, leftY - rightY);

      if (distance > maxDistance) continue;

      const alpha = (1 - distance / maxDistance) * (pointer.active ? 0.1 : 0.045);
      context.beginPath();
      context.moveTo(leftX, leftY);
      context.lineTo(rightX, rightY);
      context.strokeStyle = inner % 2 === 0 ? `rgba(168, 215, 218, ${alpha})` : `rgba(178, 149, 94, ${alpha})`;
      context.lineWidth = 0.7;
      context.stroke();
    }
  }
}
