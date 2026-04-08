"use client";

import { Fragment, useEffect, useRef, useState } from "react";

const DEFAULT_COLLAPSED_HEIGHT = 360;

export function ExpandableArticleBody({
  body,
  className = "article-body",
  collapsedHeight = DEFAULT_COLLAPSED_HEIGHT
}) {
  const contentRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [collapsible, setCollapsible] = useState(false);

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return undefined;

    const measure = () => {
      const nextHeight = node.scrollHeight;
      setContentHeight(nextHeight);
      setCollapsible(nextHeight > collapsedHeight + 12);
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [body, collapsedHeight]);

  useEffect(() => {
    if (!collapsible && expanded) {
      setExpanded(false);
    }
  }, [collapsible, expanded]);

  const maxHeight = collapsible ? (expanded ? `${contentHeight}px` : `${collapsedHeight}px`) : undefined;

  return (
    <div className={`expandable-article-shell ${collapsible ? "is-collapsible" : ""} ${expanded ? "is-expanded" : ""}`}>
      <div ref={contentRef} className={`${className} expandable-article-content`} style={maxHeight ? { maxHeight } : undefined}>
        {renderParagraphs(body)}
      </div>

      {collapsible && !expanded ? <div className="expandable-article-fade" aria-hidden="true" /> : null}

      {collapsible ? (
        <button type="button" className="signature-inline-toggle expandable-article-toggle" onClick={() => setExpanded((current) => !current)}>
          {expanded ? "たたむ" : "続きを読む"}
        </button>
      ) : null}
    </div>
  );
}

function renderParagraphs(body) {
  if (!body) {
    return <p>本文はまだありません。</p>;
  }

  return body.split(/\n{2,}/).map((paragraph, index) => (
    <p key={index}>
      {paragraph.split("\n").map((line, lineIndex) => (
        <Fragment key={`${index}-${lineIndex}`}>
          {lineIndex ? <br /> : null}
          {line}
        </Fragment>
      ))}
    </p>
  ));
}
