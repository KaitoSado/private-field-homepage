"use client";

import { useEffect, useRef, useState } from "react";
import { SignaturePageAmbient } from "@/components/signature-page-ambient";

let pageRippleSeed = 0;

export function SignaturePageShell({ children }) {
  const shellRef = useRef(null);
  const [ripples, setRipples] = useState([]);

  useEffect(() => {
    const node = shellRef.current;
    if (!node) return undefined;

    let animationFrame = 0;

    function updateProgress() {
      const rect = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const total = Math.max(node.offsetHeight - viewportHeight, 1);
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const progress = scrolled / total;

      node.style.setProperty("--page-progress", progress.toFixed(3));
      node.style.setProperty("--page-shift", `${progress * 48}px`);
    }

    function onScroll() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateProgress);
    }

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  function handleClick(event) {
    const node = shellRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = pageRippleSeed++;

    setRipples((current) => [...current, { id, x, y }]);

    window.setTimeout(() => {
      setRipples((current) => current.filter((ripple) => ripple.id !== id));
    }, 1300);
  }

  return (
    <main ref={shellRef} className="signature-page signature-page-shell" onClick={handleClick}>
      <div className="signature-page-depth-glow" aria-hidden="true" />
      <div className="signature-page-ambient-shell" aria-hidden="true">
        <SignaturePageAmbient />
      </div>
      <div className="signature-page-ripple-layer" aria-hidden="true">
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="signature-page-ripple"
            style={{
              left: ripple.x,
              top: ripple.y
            }}
          />
        ))}
      </div>
      {children}
    </main>
  );
}
