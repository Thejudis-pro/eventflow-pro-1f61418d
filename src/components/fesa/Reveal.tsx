import { useEffect, useRef, useState } from "react";

/** Subtle fade-in + slide-up when an element enters the viewport. Returns a
 * ref to attach and a className to append — no wrapper element needed, so it
 * drops onto an existing element without changing DOM structure. Attach it to
 * an inner content wrapper, never to an element that also carries a section
 * background color: fading a background to 0 opacity makes the whole band
 * vanish rather than just revealing its content.
 *
 * Skips the animation for prefers-reduced-motion, and includes a timeout
 * fallback so content is never left invisible for good — e.g. for crawlers,
 * full-page screenshot tools, or a print view that never scrolls the element
 * into the observed viewport. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    const fallback = window.setTimeout(() => setVisible(true), 1200);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return {
    ref,
    className: `transition-all duration-700 ease-out ${
      visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
    }`,
  };
}
