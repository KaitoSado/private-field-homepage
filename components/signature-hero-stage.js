"use client";

import { useRef } from "react";

export function SignatureHeroStage({ children }) {
  const stageRef = useRef(null);

  function updateStage(clientX, clientY) {
    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 10;
    const rotateX = (0.5 - y) * 8;

    stage.style.setProperty("--hero-pointer-x", `${(x * 100).toFixed(2)}%`);
    stage.style.setProperty("--hero-pointer-y", `${(y * 100).toFixed(2)}%`);
    stage.style.setProperty("--hero-rotate-x", `${rotateX.toFixed(2)}deg`);
    stage.style.setProperty("--hero-rotate-y", `${rotateY.toFixed(2)}deg`);
    stage.dataset.interacting = "true";
  }

  function handlePointerMove(event) {
    updateStage(event.clientX, event.clientY);
  }

  function handlePointerLeave() {
    const stage = stageRef.current;
    if (!stage) return;

    stage.style.setProperty("--hero-pointer-x", "50%");
    stage.style.setProperty("--hero-pointer-y", "42%");
    stage.style.setProperty("--hero-rotate-x", "0deg");
    stage.style.setProperty("--hero-rotate-y", "0deg");
    stage.dataset.interacting = "false";
  }

  return (
    <section
      ref={stageRef}
      className="signature-hero"
      data-interacting="false"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {children}
    </section>
  );
}
