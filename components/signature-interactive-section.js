"use client";

import { useEffect, useRef, useState } from "react";

let rippleSeed = 0;

export function SignatureInteractiveSection({ id, className = "", children }) {
  const sectionRef = useRef(null);
  const [ripples, setRipples] = useState([]);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return undefined;

    let animationFrame = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            node.classList.add("is-visible");
          }
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px"
      }
    );

    function updateProgress() {
      const rect = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const progress = 1 - Math.min(Math.max(rect.top / viewportHeight, 0), 1);
      const clamped = Math.max(0, Math.min(progress, 1.2));

      node.style.setProperty("--section-progress", clamped.toFixed(3));
      node.style.setProperty("--section-shift", `${(1 - clamped) * 42}px`);
      node.style.setProperty("--section-tilt", `${(clamped - 0.5) * 3.5}deg`);
    }

    function onScroll() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateProgress);
    }

    observer.observe(node);
    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  function handleClick(event) {
    const node = sectionRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = rippleSeed++;

    setRipples((current) => [...current, { id, x, y }]);

    window.setTimeout(() => {
      setRipples((current) => current.filter((ripple) => ripple.id !== id));
    }, 1100);
  }

  return (
    <section
      id={id}
      ref={sectionRef}
      className={`signature-section signature-interactive-section ${className}`.trim()}
      onClick={handleClick}
    >
      <div className="signature-section-aurora" aria-hidden="true" />
      <div className="signature-section-ripple-layer" aria-hidden="true">
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="signature-click-ripple"
            style={{
              left: ripple.x,
              top: ripple.y
            }}
          />
        ))}
      </div>
      {children}
    </section>
  );
}
