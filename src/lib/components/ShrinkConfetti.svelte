<!--
  ShrinkConfetti — a one-shot emoji burst for big wins.
  Hand-rolled canvas particles (Josh Comeau's save/translate/rotate pattern):
  polar launch velocity, gravity, angular air-resistance, opacity decay.
  No deps. Honors prefers-reduced-motion. Call `burst(x, y)` to fire.
-->
<script>
  import { onDestroy } from "svelte";
  import { browser } from "$app/environment";

  let canvas;
  let ctx;
  let raf = null;
  let last = 0;
  let particles = [];

  // Shrinking-themed glyphs — boxes, puffs of squeezed-out air, sparkle.
  const GLYPHS = ["📦", "💨", "✨", "⚡", "🎉"];
  const GRAVITY = 1100; // px/s² — a touch heavy so it falls satisfyingly
  const AIR = 1.1; // angular + horizontal decay factor

  const reduceMotion = () =>
    browser &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  /** Fire a burst of `count` particles outward+up from page point (x, y). */
  export function burst(x, y, count = 26) {
    if (!browser || reduceMotion()) return;
    ensureCanvas();
    if (!ctx) return;
    for (let i = 0; i < count; i++) {
      // mostly upward fan (270° ± 55°), converted polar → cartesian
      const angle = ((270 + rand(-55, 55)) * Math.PI) / 180;
      const speed = rand(260, 560);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: rand(0, Math.PI * 2),
        vr: rand(-Math.PI * 4, Math.PI * 4), // up to ±2 spins/sec
        size: rand(16, 30),
        glyph: GLYPHS[(Math.random() * GLYPHS.length) | 0],
        opacity: 1,
      });
    }
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(draw);
    }
  }

  function ensureCanvas() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
    }
    if (!ctx) ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
  }

  function draw(now) {
    const dt = Math.min(now - last, 250) / 1000; // cap to avoid refocus blowups
    last = now;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const p of particles) {
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.vr *= 1 - AIR * dt; // spins fast, settles naturally
      p.vx *= 1 - AIR * 0.4 * dt;
      if (p.vy > 0) p.opacity *= Math.pow(0.5, dt * 1.3); // fade once falling

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.font = `${p.size}px serif`;
      ctx.fillText(p.glyph, 0, 0);
      ctx.restore();
    }

    // cull the dead + the off-screen
    particles = particles.filter(
      (p) => p.opacity > 0.04 && p.y < window.innerHeight + 60,
    );

    if (particles.length) {
      raf = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      raf = null;
    }
  }

  onDestroy(() => {
    if (raf) cancelAnimationFrame(raf);
  });
</script>

<canvas bind:this={canvas} class="confetti-canvas" aria-hidden="true"></canvas>

<style>
  .confetti-canvas {
    position: fixed;
    inset: 0;
    z-index: 60;
    pointer-events: none;
  }
</style>
