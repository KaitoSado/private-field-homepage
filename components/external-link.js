"use client";

export function ExternalLink({ href, className, children }) {
  function handleClick(event) {
    event.stopPropagation();

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();

    const opened = window.open(href, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.assign(href);
    }
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
