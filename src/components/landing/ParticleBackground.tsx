'use client';

import { useEffect, useRef } from 'react';

/**
 * Interactive Fluid Gradient Mesh
 *
 * A single cohesive Canvas effect: large soft metaballs that drift organically
 * and respond to mouse position as a gravity well. The blobs merge and separate,
 * creating a living, breathing gradient field behind the hero content.
 *
 * Inspired by creative agency hero sections (zuncreative, linear, stripe).
 */

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  radius: number;
  color: [number, number, number];
  phase: number;
  speed: number;
  orbitRadius: number;
}

const BLOB_CONFIGS = [
  { color: [124, 92, 252] as [number, number, number], radius: 0.35, ox: 0.25, oy: 0.3, speed: 0.3, orbit: 0.12 },
  { color: [91, 141, 239] as [number, number, number], radius: 0.3, ox: 0.75, oy: 0.25, speed: 0.25, orbit: 0.15 },
  { color: [167, 139, 250] as [number, number, number], radius: 0.28, ox: 0.5, oy: 0.7, speed: 0.35, orbit: 0.1 },
  { color: [79, 70, 229] as [number, number, number], radius: 0.25, ox: 0.8, oy: 0.65, speed: 0.2, orbit: 0.13 },
  { color: [99, 102, 241] as [number, number, number], radius: 0.22, ox: 0.15, oy: 0.6, speed: 0.28, orbit: 0.11 },
  { color: [139, 92, 246] as [number, number, number], radius: 0.2, ox: 0.6, oy: 0.15, speed: 0.32, orbit: 0.14 },
];

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let w = 0;
    let h = 0;
    let blobs: Blob[] = [];

    // Smooth mouse tracking with lerp
    const mouse = { x: 0.5, y: 0.5 }; // normalized 0-1
    const smoothMouse = { x: 0.5, y: 0.5 };

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initBlobs() {
      blobs = BLOB_CONFIGS.map((cfg, i) => ({
        x: cfg.ox * w,
        y: cfg.oy * h,
        vx: 0,
        vy: 0,
        baseX: cfg.ox * w,
        baseY: cfg.oy * h,
        radius: cfg.radius * Math.min(w, h),
        color: cfg.color,
        phase: (i / BLOB_CONFIGS.length) * Math.PI * 2,
        speed: cfg.speed,
        orbitRadius: cfg.orbit * Math.min(w, h),
      }));
    }

    // Offscreen canvas for the metaball field — render at lower res for performance
    const SCALE = 0.25; // render at 25% resolution, then upscale with blur
    let offCanvas: HTMLCanvasElement;
    let offCtx: CanvasRenderingContext2D;

    function initOffscreen() {
      offCanvas = document.createElement('canvas');
      offCanvas.width = Math.ceil(w * SCALE);
      offCanvas.height = Math.ceil(h * SCALE);
      offCtx = offCanvas.getContext('2d', { alpha: true })!;
    }

    const section = canvas.parentElement as HTMLElement | null;

    function handleMouseMove(e: MouseEvent) {
      const rect = section?.getBoundingClientRect() ?? canvas!.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) / rect.width;
      mouse.y = (e.clientY - rect.top) / rect.height;
    }

    function handleMouseLeave() {
      mouse.x = 0.5;
      mouse.y = 0.5;
    }

    function animate(time: number) {
      const t = time * 0.001;

      // Smooth mouse lerp
      smoothMouse.x += (mouse.x - smoothMouse.x) * 0.03;
      smoothMouse.y += (mouse.y - smoothMouse.y) * 0.03;

      const mx = smoothMouse.x * w;
      const my = smoothMouse.y * h;

      // Update blob positions — organic orbit + mouse gravity
      for (const blob of blobs) {
        // Organic circular drift around base position
        const orbitX = Math.sin(t * blob.speed + blob.phase) * blob.orbitRadius;
        const orbitY = Math.cos(t * blob.speed * 0.7 + blob.phase + 1) * blob.orbitRadius;

        // Target position = base + orbit
        const targetX = blob.baseX + orbitX;
        const targetY = blob.baseY + orbitY;

        // Mouse gravity — pull blobs toward cursor
        const dx = mx - blob.x;
        const dy = my - blob.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = Math.min(w, h) * 0.6;
        const gravityStrength = Math.max(0, 1 - dist / maxDist) * 0.4;

        // Blend between orbit target and mouse attraction
        const goalX = targetX + dx * gravityStrength;
        const goalY = targetY + dy * gravityStrength;

        // Spring physics toward goal
        blob.vx += (goalX - blob.x) * 0.015;
        blob.vy += (goalY - blob.y) * 0.015;
        blob.vx *= 0.92;
        blob.vy *= 0.92;
        blob.x += blob.vx;
        blob.y += blob.vy;
      }

      // Render metaball field on offscreen canvas at low res
      const ow = offCanvas.width;
      const oh = offCanvas.height;
      offCtx.clearRect(0, 0, ow, oh);

      // Draw each blob as a radial gradient circle
      offCtx.globalCompositeOperation = 'lighter';
      for (const blob of blobs) {
        const sx = blob.x * SCALE;
        const sy = blob.y * SCALE;
        const sr = blob.radius * SCALE;

        const grd = offCtx.createRadialGradient(sx, sy, 0, sx, sy, sr);
        grd.addColorStop(0, `rgba(${blob.color[0]},${blob.color[1]},${blob.color[2]},0.4)`);
        grd.addColorStop(0.4, `rgba(${blob.color[0]},${blob.color[1]},${blob.color[2]},0.15)`);
        grd.addColorStop(0.7, `rgba(${blob.color[0]},${blob.color[1]},${blob.color[2]},0.05)`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');

        offCtx.beginPath();
        offCtx.arc(sx, sy, sr, 0, Math.PI * 2);
        offCtx.fillStyle = grd;
        offCtx.fill();
      }

      // Mouse glow — subtle bright spot at cursor
      const smx = mx * SCALE;
      const smy = my * SCALE;
      const mouseGlowR = Math.min(w, h) * 0.15 * SCALE;
      const mouseGrd = offCtx.createRadialGradient(smx, smy, 0, smx, smy, mouseGlowR);
      mouseGrd.addColorStop(0, 'rgba(167,139,250,0.2)');
      mouseGrd.addColorStop(0.5, 'rgba(124,92,252,0.08)');
      mouseGrd.addColorStop(1, 'rgba(0,0,0,0)');
      offCtx.beginPath();
      offCtx.arc(smx, smy, mouseGlowR, 0, Math.PI * 2);
      offCtx.fillStyle = mouseGrd;
      offCtx.fill();

      offCtx.globalCompositeOperation = 'source-over';

      // Draw upscaled to main canvas — the low res + CSS smoothing creates natural blur
      ctx!.clearRect(0, 0, w, h);
      ctx!.imageSmoothingEnabled = true;
      ctx!.imageSmoothingQuality = 'high';
      ctx!.drawImage(offCanvas, 0, 0, ow, oh, 0, 0, w, h);

      animId = requestAnimationFrame(animate);
    }

    resize();
    initBlobs();
    initOffscreen();
    animId = requestAnimationFrame(animate);

    const onResize = () => {
      resize();
      initBlobs();
      initOffscreen();
    };

    window.addEventListener('resize', onResize);
    section?.addEventListener('mousemove', handleMouseMove);
    section?.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      section?.removeEventListener('mousemove', handleMouseMove);
      section?.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className='pointer-events-none absolute inset-0 z-0'
    />
  );
}
