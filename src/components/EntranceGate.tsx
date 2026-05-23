"use client";

// Cinematic smoke veil — port of the prototype's entrance.jsx.
// Renders a full-screen canvas with rising smoke particles and a
// 260px radial mouse-repulsion field. Clicking "Enter" plays an
// exit animation then calls onEnter.

import { useEffect, useRef, useState } from "react";

export default function EntranceGate({
  onEnter,
  replayKey = 0,
}: {
  onEnter: () => void;
  replayKey?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ exiting: false, exitT: 0 });
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const [exiting, setExiting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setExiting(false);
    setReady(false);
    stateRef.current = { exiting: false, exitT: 0 };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      r: number; rg: number;
      age: number; life: number;
      peak: number;
      angle: number; rot: number;
      seedA: number; seedB: number;
      sprite: number; aspect: number;
    };
    let particles: Particle[] = [];
    let raf = 0;
    let lastT = performance.now();
    let lastSpawn = 0;

    const SPRITE_SIZE = 256;
    const SPRITE_COUNT = 8;
    const sprites: HTMLCanvasElement[] = [];
    for (let s = 0; s < SPRITE_COUNT; s++) {
      const sc = document.createElement("canvas");
      sc.width = SPRITE_SIZE;
      sc.height = SPRITE_SIZE;
      const sctx = sc.getContext("2d")!;
      const c = SPRITE_SIZE / 2;
      const blobs = 22 + Math.floor(Math.random() * 8);
      for (let i = 0; i < blobs; i++) {
        const isCenter = i === 0;
        const ang = Math.random() * Math.PI * 2;
        const distNorm = isCenter
          ? 0
          : i < 6
          ? Math.pow(Math.random(), 1.4) * 0.35
          : Math.pow(Math.random(), 0.5) * 0.65;
        const dist = distNorm * c;
        const bx = c + Math.cos(ang) * dist;
        const by = c + Math.sin(ang) * dist;
        const br = isCenter ? c * 0.5 : 8 + Math.random() * c * 0.32;
        const a = isCenter ? 0.58 : 0.05 + Math.random() * 0.18;
        const g = sctx.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0, `rgba(255,255,255,${a})`);
        g.addColorStop(0.4, `rgba(255,255,255,${a * 0.35})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        sctx.fillStyle = g;
        sctx.beginPath();
        sctx.arc(bx, by, br, 0, Math.PI * 2);
        sctx.fill();
      }
      sprites.push(sc);
    }

    let vents: { x: number; spread: number }[] = [];
    const recalcVents = () => {
      const w = window.innerWidth;
      vents = [
        { x: w * 0.28, spread: 100 },
        { x: w * 0.50, spread: 180 },
        { x: w * 0.72, spread: 100 },
      ];
    };

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      recalcVents();
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = (count: number, seedScreen = false) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      for (let i = 0; i < count; i++) {
        const v = vents[Math.floor(Math.random() * vents.length)];
        const x = v.x + (Math.random() - 0.5) * v.spread;
        const y = seedScreen
          ? Math.random() * h * 0.95 + h * 0.025
          : h + Math.random() * 20 - 5;
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 0.06,
          vy: -(Math.random() * 0.1 + 0.06),
          r: 22 + Math.random() * 30,
          rg: 0.020 + Math.random() * 0.030,
          age: seedScreen ? Math.random() * 7000 : 0,
          life: 10000 + Math.random() * 9000,
          peak: 0.08 + Math.random() * 0.10,
          angle: Math.random() * Math.PI * 2,
          rot: (Math.random() - 0.5) * 0.0006,
          seedA: Math.random() * 1000,
          seedB: Math.random() * 1000,
          sprite: Math.floor(Math.random() * SPRITE_COUNT),
          aspect: 0.80 + Math.random() * 0.50,
        });
      }
      void w;
    };
    spawn(160, true);

    const REPEL_RADIUS = 260;
    const REPEL_STRENGTH = 0.18;

    const tick = (now: number) => {
      const dt = Math.min(40, now - lastT);
      lastT = now;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const s = stateRef.current;
      void h;

      if (now - lastSpawn > 55) {
        lastSpawn = now;
        spawn(s.exiting ? 7 : 4);
      }

      const exitBoost = s.exiting ? Math.min(1, s.exitT / 800) : 0;
      if (s.exiting) s.exitT += dt;

      ctx.clearRect(0, 0, w, window.innerHeight);
      ctx.globalCompositeOperation = "screen";

      const m = mouseRef.current;
      const mActive = m.active && !s.exiting;
      const R2 = REPEL_RADIUS * REPEL_RADIUS;

      const next: Particle[] = [];
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.age += dt;
        const pct = p.age / p.life;
        if (pct >= 1 || p.y + p.r < -80 || p.x + p.r < -200 || p.x - p.r > w + 200) continue;

        const t = p.age * 0.001;
        const nx = Math.sin(p.x * 0.0040 + t * 0.9 + p.seedA) * 0.70
                 + Math.sin(p.y * 0.0030 + t * 0.7 + p.seedB) * 0.55;
        const ny = Math.cos(p.x * 0.0034 + t * 0.8 + p.seedB) * 0.40
                 + Math.cos(p.y * 0.0026 + t * 0.5 + p.seedA) * 0.20;
        p.vx += nx * dt * 0.00050;
        p.vy += ny * dt * 0.00020;

        if (mActive) {
          const dx = p.x - m.x;
          const dy = p.y - m.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const t01 = 1 - d / REPEL_RADIUS;
            const force = REPEL_STRENGTH * t01 * t01;
            p.vx += (dx / d) * force * dt;
            p.vy += (dy / d) * force * dt;
          }
        }

        p.vy -= dt * 0.000030;
        p.vx *= 0.985;
        p.vy *= 0.992;

        const speedMul = 1 + exitBoost * 8;
        p.x += p.vx * dt * speedMul;
        p.y += (p.vy - exitBoost * 0.45) * dt;
        p.r += p.rg * dt;
        p.angle += p.rot * dt;

        let a;
        if (pct < 0.22) a = (pct / 0.22) * p.peak;
        else if (pct < 0.55) a = p.peak;
        else a = (1 - (pct - 0.55) / 0.45) * p.peak;
        a *= 1 - exitBoost * 0.4;
        if (a <= 0) { next.push(p); continue; }

        const size = p.r * 2;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.scale(p.aspect, 1 / p.aspect);
        ctx.globalAlpha = a;
        ctx.drawImage(sprites[p.sprite], -p.r, -p.r, size, size);
        ctx.restore();

        next.push(p);
      }
      particles = next.length > 700 ? next.slice(next.length - 700) : next;

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onPointerMove = (e: PointerEvent) => {
      const m = mouseRef.current;
      m.x = e.clientX;
      m.y = e.clientY;
      m.active = true;
    };
    const onPointerLeave = () => { mouseRef.current.active = false; };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("mouseleave", onPointerLeave);

    const readyTimer = setTimeout(() => setReady(true), 250);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("mouseleave", onPointerLeave);
      clearTimeout(readyTimer);
    };
  }, [replayKey]);

  const enter = () => {
    if (stateRef.current.exiting) return;
    stateRef.current.exiting = true;
    setExiting(true);
    setTimeout(onEnter, 1500);
  };

  return (
    <div
      className={"gate" + (exiting ? " gate-exiting" : "") + (ready ? " gate-ready" : "")}
      role="dialog"
      aria-label="Entrance"
    >
      <canvas ref={canvasRef} className="gate-canvas" />
      <div className="gate-vignette" />
      <div className="gate-content">
        <div className="gate-eyebrow">
          <span className="gate-line" />
          <span>An Invitation</span>
          <span className="gate-line" />
        </div>
        <h1 className="gate-mark">Divinity</h1>
        <div className="gate-sub">
          <span>Performances like no other</span>
        </div>
        <button className="gate-enter" onClick={enter} disabled={exiting}>
          <span className="gate-enter-bg" />
          <span className="gate-enter-label">{exiting ? "Entering" : "Enter"}</span>
          <span className="gate-enter-arr">→</span>
        </button>
        <div className="gate-foot">Las Vegas · 21+ · Couples & single women only</div>
      </div>
    </div>
  );
}
