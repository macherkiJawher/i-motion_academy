import { useEffect, useRef, useState } from "react";

/** Custom animated cursor: soft dot + magnetic glow ring. Desktop only. */
export function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [hot, setHot] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { ...pos };
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      const el = e.target as HTMLElement | null;
      setHot(Boolean(el?.closest("a,button,[data-cursor-hot],input,textarea,select")));
    };

    const loop = () => {
      ringPos.x += (pos.x - ringPos.x) * 0.14;
      ringPos.y += (pos.y - ringPos.y) * 0.14;
      if (dot.current) dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[9999] hidden md:block">
      <div
        ref={ring}
        className="absolute -ml-5 -mt-5 h-10 w-10 rounded-full border border-electric/60 transition-[width,height,opacity,margin] duration-300"
        style={{
          opacity: hot ? 1 : 0.55,
          boxShadow: hot ? "0 0 40px 2px color-mix(in oklab, var(--electric) 55%, transparent)" : "none",
          scale: hot ? "1.5" : "1",
        }}
      />
      <div className="absolute -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-cyan" ref={dot} />
    </div>
  );
}
