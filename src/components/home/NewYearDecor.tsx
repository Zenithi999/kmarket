'use client';

import { useEffect, useRef, useState } from 'react';

// Deterministic PRNG so the light layout is stable between renders/resizes.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize((s) => (Math.abs(s.w - width) < 1 && Math.abs(s.h - height) < 1 ? s : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

const SWAG_COLORS = ['#ff3b3b', '#ffc43d', '#3ddc84', '#4aa8ff', '#ff7ad9'];

/* ───────────────────────── Curtain lights ───────────────────────── */

export function CurtainLights() {
  const [ref, { w, h }] = useSize<HTMLDivElement>();

  let content = null;
  if (w > 0 && h > 0) {
    const mobile = w < 640;
    const rand = rng(2027);
    const segments = Math.max(3, Math.round(w / (mobile ? 130 : 210)));
    const segW = w / segments;
    const sag = Math.min(26, Math.max(10, w * 0.018));
    const swagY = (x: number) => {
      const t = (x % segW) / segW;
      return 4 * sag * t * (1 - t);
    };

    // Wire path: one quadratic swag per segment (control point at 2×sag → apex at sag).
    let d = 'M0,0';
    for (let i = 0; i < segments; i++) d += ` Q${(i + 0.5) * segW},${2 * sag} ${(i + 1) * segW},0`;

    // Coloured C9-style bulbs along the swag wire.
    const swagBulbs: { x: number; y: number; c: string }[] = [];
    const perSeg = mobile ? 4 : 6;
    for (let i = 0; i < segments; i++)
      for (let k = 0; k < perSeg; k++) {
        const x = (i + (k + 0.5) / perSeg) * segW;
        swagBulbs.push({ x, y: swagY(x), c: SWAG_COLORS[(i * perSeg + k) % SWAG_COLORS.length] });
      }

    // Icicle-style curtain strands hanging from the wire.
    const spacing = mobile ? 20 : 24;
    const strandCount = Math.floor(w / spacing);
    const pattern = [0.55, 1, 0.75, 0.4, 0.9, 0.65];
    const maxLen = h * (mobile ? 0.26 : 0.3);
    const strands = Array.from({ length: strandCount }, (_, i) => {
      const x = (i + 0.5) * spacing + (w - strandCount * spacing) / 2;
      const len = maxLen * (pattern[i % pattern.length] * 0.75 + rand() * 0.25);
      const gap = mobile ? 13 : 15;
      const bulbs = Math.max(2, Math.floor(len / gap));
      return { x, y: swagY(x), len, gap, bulbs, swayDur: 4 + rand() * 3, swayDelay: -rand() * 6 };
    });

    content = (
      <>
        {strands.map((s, i) => (
          <div
            key={i}
            className="ny-strand absolute top-0"
            style={{
              left: s.x,
              top: s.y,
              height: s.len,
              animationDelay: `${(s.x / w) * 900}ms, ${s.swayDelay}s`,
              animationDuration: `900ms, ${s.swayDur}s`,
            }}
          >
            <span className="absolute left-0 top-0 h-full w-px -translate-x-1/2 bg-[#2b3a2f]/35" />
            {Array.from({ length: s.bulbs }, (_, b) => {
              const tw = (i * 7 + b * 3) % 4 === 0;
              return (
                <span
                  key={b}
                  className={`ny-dot absolute left-0 ${tw ? 'ny-twinkle' : ''}`}
                  style={{
                    top: (b + 1) * s.gap - 4,
                    animationDelay: `${300 + (s.x / w) * 1400 + b * 40}ms${tw ? `, ${((i * 13 + b * 29) % 37) / 10}s` : ''}`,
                  }}
                />
              );
            })}
          </div>
        ))}

        <svg className="absolute left-0 top-0 overflow-visible" width={w} height={sag * 2 + 4} aria-hidden>
          <path d={d} pathLength={1} fill="none" stroke="#24331f" strokeOpacity="0.55" strokeWidth="1.6" className="ny-wire" />
        </svg>

        {swagBulbs.map((b, i) => (
          <span
            key={i}
            className="ny-bulb absolute"
            style={
              {
                left: b.x,
                top: b.y,
                '--c': b.c,
                animationDelay: `${200 + (b.x / w) * 1200}ms, ${(i % 7) * 0.45}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </>
    );
  }

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {content}
    </div>
  );
}

/* ───────────────────────── Hanging ornaments ───────────────────────── */

const ORNAMENTS = [
  { left: '4%', len: 70, size: 34, c1: '#ff6b6b', c2: '#b3121f', dur: 5.2, mobile: true },
  { left: '10.5%', len: 120, size: 26, c1: '#ffe08a', c2: '#c48a12', dur: 6.1, mobile: false },
  { left: '86%', len: 105, size: 28, c1: '#ffe08a', c2: '#c48a12', dur: 5.6, mobile: false },
  { left: '93.5%', len: 62, size: 36, c1: '#ff6b6b', c2: '#b3121f', dur: 4.8, mobile: true },
];

export function HangingOrnaments() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[21] overflow-hidden">
      {ORNAMENTS.map((o, i) => (
        <div
          key={i}
          className={`ny-ornament absolute top-0 ${o.mobile ? '' : 'hidden sm:block'}`}
          style={{ left: o.left, animationDuration: `1.1s, ${o.dur}s`, animationDelay: `${400 + i * 150}ms, ${-i * 1.3}s` }}
        >
          <span className="block w-px mx-auto bg-[#7a5a1c]/60" style={{ height: o.len * 0.6 }} />
          <svg
            viewBox="0 0 40 46"
            className="-mt-px block w-[calc(var(--s)*0.7)] sm:w-[var(--s)]"
            style={{ '--s': `${o.size}px` } as React.CSSProperties}
          >
            <defs>
              <radialGradient id={`ny-orn-${i}`} cx="35%" cy="40%" r="70%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
                <stop offset="18%" stopColor={o.c1} />
                <stop offset="100%" stopColor={o.c2} />
              </radialGradient>
              <linearGradient id={`ny-cap-${i}`} x1="0" x2="1">
                <stop offset="0%" stopColor="#8a6a1f" />
                <stop offset="50%" stopColor="#f4d27a" />
                <stop offset="100%" stopColor="#8a6a1f" />
              </linearGradient>
            </defs>
            <circle cx="20" cy="4" r="3" fill="none" stroke="#b08a2e" strokeWidth="1.4" />
            <rect x="14" y="6" width="12" height="6" rx="1.5" fill={`url(#ny-cap-${i})`} />
            <circle cx="20" cy="28" r="17" fill={`url(#ny-orn-${i})`} />
            <path d="M5 25 Q20 31 35 25" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" fill="none" />
            <path d="M6 31 Q20 37 34 31" stroke="#fff" strokeOpacity="0.2" strokeWidth="1" fill="none" />
          </svg>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Snowfall (canvas) ───────────────────────── */

const SPRITE = 96; // sprite resolution in px; flakes are drawn scaled down from this

// Six-armed crystal: each arm has a spine plus a few V-shaped branches. Variants
// change branch positions/lengths so neighbouring flakes don't look identical.
const CRYSTALS: { at: number; len: number; tip?: boolean }[][] = [
  [{ at: 0.38, len: 0.22 }, { at: 0.64, len: 0.16 }, { at: 0.84, len: 0.08 }],
  [{ at: 0.3, len: 0.12 }, { at: 0.55, len: 0.26 }, { at: 0.8, len: 0.12, tip: true }],
  [{ at: 0.45, len: 0.3 }, { at: 0.75, len: 0.14 }],
  [{ at: 0.25, len: 0.1 }, { at: 0.5, len: 0.18 }, { at: 0.7, len: 0.2 }, { at: 0.88, len: 0.07 }],
];

function crystalSprite(branches: (typeof CRYSTALS)[number], hexCore: boolean) {
  const c = document.createElement('canvas');
  c.width = c.height = SPRITE;
  const g = c.getContext('2d')!;
  const R = SPRITE * 0.42;
  g.translate(SPRITE / 2, SPRITE / 2);
  g.lineCap = 'round';
  g.lineJoin = 'round';

  const arms = () => {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const ux = Math.cos(a);
      const uy = Math.sin(a);
      g.moveTo(0, 0);
      g.lineTo(ux * R, uy * R);
      for (const b of branches) {
        const bx = ux * R * b.at;
        const by = uy * R * b.at;
        for (const s of [-1, 1]) {
          const ba = a + (s * Math.PI) / 3.4;
          g.moveTo(bx, by);
          g.lineTo(bx + Math.cos(ba) * R * b.len, by + Math.sin(ba) * R * b.len);
        }
      }
      if (branches.some((b) => b.tip)) {
        g.moveTo(ux * R * 0.92 + uy * 3, uy * R * 0.92 - ux * 3);
        g.lineTo(ux * R * 0.92 - uy * 3, uy * R * 0.92 + ux * 3);
      }
    }
    if (hexCore) {
      for (let i = 0; i <= 6; i++) {
        const a = (i * Math.PI) / 3 + Math.PI / 6;
        const r = R * 0.16;
        if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
    }
  };

  // Soft warm outline underneath so white crystals still read on pale banners,
  // then a frosty glow and the crisp white crystal on top.
  arms();
  g.strokeStyle = 'rgba(120, 85, 60, 0.22)';
  g.lineWidth = SPRITE * 0.06;
  g.stroke();
  arms();
  g.shadowColor = 'rgba(255,255,255,0.9)';
  g.shadowBlur = SPRITE * 0.05;
  g.strokeStyle = '#ffffff';
  g.lineWidth = SPRITE * 0.032;
  g.stroke();
  g.shadowBlur = 0;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(0, 0, SPRITE * 0.035, 0, Math.PI * 2);
  g.fill();
  return c;
}

function softDotSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.7, 'rgba(160,130,110,0.18)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return c;
}

export function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const crystals = CRYSTALS.flatMap((b, i) => [crystalSprite(b, i % 2 === 0), crystalSprite(b, i % 2 === 1)]);
    const dot = softDotSprite();

    // z = depth (0 far … 1 near). Far flakes are small soft dots; nearer ones are
    // full crystals that fall faster, spin, and are bigger.
    type Flake = {
      x: number; y: number; z: number; size: number; vy: number; drift: number;
      phase: number; rot: number; spin: number; a: number; sprite: HTMLCanvasElement;
    };
    let flakes: Flake[] = [];
    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let visible = true;
    let last = performance.now();
    const born = last;

    const make = (initial: boolean): Flake => {
      const z = Math.random();
      const crystal = z > 0.3;
      const size = crystal ? 9 + z * z * 17 : 3 + z * 6;
      return {
        x: Math.random() * w,
        // On first paint the flakes start above the banner so the snow "arrives".
        y: initial ? -Math.random() * h * 1.2 - size : -size,
        z,
        size,
        vy: 14 + z * 42 + Math.random() * 10,
        drift: 6 + Math.random() * 16 + z * 8,
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * (0.6 + z * 1.4),
        a: crystal ? 0.75 + z * 0.25 : 0.55 + Math.random() * 0.3,
        sprite: crystal ? crystals[(Math.random() * crystals.length) | 0] : dot,
      };
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const target = Math.round(Math.min(130, (w * h) / 8000));
      if (flakes.length === 0) flakes = Array.from({ length: target }, () => make(true));
      else if (flakes.length < target) flakes.push(...Array.from({ length: target - flakes.length }, () => make(false)));
      else flakes.length = target;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Heavier snowfall for the first few seconds, then it settles to a gentle drift.
      const boost = 1 + Math.max(0, 1 - (now - born) / 4000) * 0.8;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const f of flakes) {
        f.phase += dt * 0.9;
        f.rot += f.spin * dt;
        f.y += f.vy * dt * boost;
        f.x += Math.sin(f.phase) * f.drift * dt + 6 * dt;
        if (f.y - f.size > h) Object.assign(f, make(false));
        if (f.x > w + f.size) f.x = -f.size;
        // Tumbling: squash one axis a little so crystals look like they turn in the air.
        const tilt = 0.75 + 0.25 * Math.cos(f.phase * 1.3);
        const cos = Math.cos(f.rot) * dpr;
        const sin = Math.sin(f.rot) * dpr;
        ctx.setTransform(cos, sin, -sin * tilt, cos * tilt, f.x * dpr, f.y * dpr);
        ctx.globalAlpha = f.a;
        ctx.drawImage(f.sprite, -f.size / 2, -f.size / 2, f.size, f.size);
      }
      ctx.globalAlpha = 1;
      if (visible) raf = requestAnimationFrame(tick);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting && !document.hidden;
      if (visible && !was) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    });
    io.observe(canvas);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[22] h-full w-full"
    />
  );
}

/* ───────────────────────── Snow drift & caps ───────────────────────── */

export function SnowDrift() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 40"
      preserveAspectRatio="none"
      className="ny-drift pointer-events-none absolute inset-x-0 bottom-0 z-[23] h-3 w-full sm:h-5"
    >
      <path
        d="M0 40 V22 C60 12 110 26 170 18 S280 6 350 16 S470 28 540 17 S660 4 740 15 S860 27 930 16 S1060 6 1120 15 S1180 22 1200 18 V40 Z"
        fill="#fff"
      />
      <path
        d="M0 22 C60 12 110 26 170 18 S280 6 350 16 S470 28 540 17 S660 4 740 15 S860 27 930 16 S1060 6 1120 15 S1180 22 1200 18"
        fill="none"
        stroke="#dfe8f2"
        strokeWidth="2"
      />
    </svg>
  );
}

export function SnowCap() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 26"
      preserveAspectRatio="none"
      className="pointer-events-none absolute -top-[6px] left-1/2 z-10 h-[15px] w-[106%] -translate-x-1/2 drop-shadow-[0_1.5px_1.5px_rgba(40,60,90,0.22)] sm:h-[18px]"
    >
      <path
        d="M4 14 C4 6 10 2 20 2 H80 C90 2 96 6 96 14 C93 15 91 19 88 19 C85 19 84 15 80 15 C76 15 75 22 70 22 C65 22 64 16 60 16 C55 16 55 20 50 20 C45 20 44 14 39 14 C34 14 33 21 28 21 C23 21 22 16 18 16 C13 16 12 19 9 19 C6 19 5 16 4 14 Z"
        fill="#fff"
        stroke="#cfdbe8"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      {/* faint blue shading along the drip edge so the cap reads as snow on a white page */}
      <path
        d="M6 15 C8 17 10 18 12 17 M22 18 C25 20 29 20 32 17 M43 16 C46 19 50 19 53 17 M64 18 C67 21 71 21 74 18 M84 17 C87 18 90 17 93 15"
        stroke="#e2ebf4"
        strokeWidth="1.5"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
