"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Group, Material, Mesh, Object3D } from "three";
import { HERO_QUOTES } from "@/data/quotes";

/**
 * HeroBook3D — hero'dagi haqiqiy WebGL (three.js) 3D kitob.
 *
 *  * Yopilgan/ochilgan kitob: qattiq muqova, umurtqa va varaqlar to‘plami.
 *  * Har bir varaqda bitta hikmatli gap (canvas tekstura orqali chiziladi).
 *  * Varaqni **almashtirish mumkin**: kitobga bosish yoki «Keyingi hikmat»
 *    tugmasi; sahifalar umurtqa atrofida haqiqiy 3D burilish bilan aylanadi.
 *  * Avtomatik almashinuv (5.6s) — kursor kitob ustida bo‘lsa yoki tab
 *    yashirinsa to‘xtaydi.
 *  * Sichqoncha parallaksi + scroll bilan bog‘langan harakat.
 *
 * Zaxira variantlar: WebGL yo‘q / `prefers-reduced-motion` / Save-Data bo‘lsa —
 * CSS 3D kitob ko‘rsatiladi (varaqlash tugmalari ishlaydi).
 */

const PAGE_W = 1.52;
const PAGE_H = 2.04;
const PAPER = "#fdf6ea";
const INK = "#26364f";
const FLAME = "#ff6a00";
const FLAME_SOFT = "#ff9a45";
const NAVY = "#16243f";

type Mode = "pending" | "webgl" | "fallback";

/* ---------- varaq teksturasi: hikmat + bezak ---------- */

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function pageTexture(THREE: typeof import("three"), quoteIndex: number, total: number): import("three").CanvasTexture {
  const W = 620;
  const H = 820;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // qog‘oz
  const paper = ctx.createLinearGradient(0, 0, W, H);
  paper.addColorStop(0, "#fffdf7");
  paper.addColorStop(0.55, PAPER);
  paper.addColorStop(1, "#f6ead6");
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);

  // chekka chizig‘i + issiq nur
  const glow = ctx.createRadialGradient(W * 0.82, H * 0.12, 20, W * 0.82, H * 0.12, W * 0.9);
  glow.addColorStop(0, "rgba(255,122,26,0.22)");
  glow.addColorStop(1, "rgba(255,122,26,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(38,54,79,0.12)";
  ctx.lineWidth = 2;
  ctx.strokeRect(26, 26, W - 52, H - 52);

  // olovrang ustki chiziq
  const bar = ctx.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, FLAME);
  bar.addColorStop(1, FLAME_SOFT);
  ctx.fillStyle = bar;
  ctx.fillRect(26, 26, W - 52, 7);

  // katta qo‘shtirnoq belgisi
  ctx.fillStyle = "rgba(255,106,0,0.22)";
  ctx.font = "800 190px 'Space Grotesk', 'Manrope', Georgia, serif";
  ctx.textBaseline = "top";
  ctx.fillText("\u201C", 46, 66);

  // hikmat matni
  const quote = HERO_QUOTES[quoteIndex % HERO_QUOTES.length];
  ctx.font = "600 40px 'Manrope', system-ui, -apple-system, sans-serif";
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  const lines = wrapText(ctx, quote.text, W - 150);
  const lineHeight = 56;
  const blockHeight = lines.length * lineHeight;
  let y = Math.max(210, (H - blockHeight) / 2 - 20);
  for (const line of lines) {
    ctx.fillText(line, 74, y);
    y += lineHeight;
  }

  // manba
  ctx.font = "700 24px 'Manrope', system-ui, sans-serif";
  ctx.fillStyle = FLAME;
  ctx.fillText(`— ${quote.source}`, 74, y + 18);

  // sahifa raqami
  ctx.font = "700 22px 'Manrope', system-ui, sans-serif";
  ctx.fillStyle = "rgba(38,54,79,0.45)";
  ctx.textAlign = "center";
  ctx.fillText(`${String(quoteIndex + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, W / 2, H - 62);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Varaqning orqa tomoni — nozik chiziqli qog‘oz. */
function backTexture(THREE: typeof import("three")): import("three").CanvasTexture {
  const W = 512;
  const H = 680;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f7efe0";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(38,54,79,0.09)";
  ctx.lineWidth = 2;
  for (let y = 70; y < H - 70; y += 34) {
    ctx.beginPath();
    ctx.moveTo(56, y);
    ctx.lineTo(W - 56, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Muqova teksturasi — to‘q ko‘k + olovrang naqsh. */
function coverTexture(THREE: typeof import("three"), title: string, subtitle: string): import("three").CanvasTexture {
  const W = 620;
  const H = 820;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#1d2f52");
  grad.addColorStop(1, NAVY);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255,154,69,0.55)";
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, W - 60, H - 60);

  const bar = ctx.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, FLAME);
  bar.addColorStop(1, FLAME_SOFT);
  ctx.fillStyle = bar;
  ctx.fillRect(30, 30, W - 60, 8);

  ctx.fillStyle = "#ffb066";
  ctx.font = "800 26px 'Manrope', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("202-MAKTAB", W / 2, 140);

  ctx.fillStyle = "#f6f8fc";
  ctx.font = "800 78px 'Space Grotesk', 'Manrope', system-ui, sans-serif";
  ctx.fillText(title, W / 2, H / 2 - 10);

  ctx.fillStyle = "rgba(246,248,252,0.7)";
  ctx.font = "600 30px 'Manrope', system-ui, sans-serif";
  ctx.fillText(subtitle, W / 2, H / 2 + 52);

  // olovrang halqa bezagi
  ctx.strokeStyle = "rgba(255,106,0,0.6)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(W / 2, H - 180, 62, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function HeroBook3D({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const nextRef = useRef<() => void>(() => {});
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("pending");

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % HERO_QUOTES.length);
    nextRef.current();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conn = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const saveData = conn?.saveData === true;
    const slow = conn?.effectiveType ? /(^|-)2g$/.test(conn.effectiveType) : false;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const probe = document.createElement("canvas");
    const hasWebgl = Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));

    if (reduced || saveData || slow || !hasWebgl) {
      setMode("fallback");
      return;
    }

    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const width = () => host.clientWidth || 1;
      const height = () => host.clientHeight || 1;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width(), height(), false);
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      renderer.domElement.style.cursor = "pointer";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, width() / height(), 0.1, 100);
      camera.position.set(0, 0.25, 6.4);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 1.15));
      const keyLight = new THREE.DirectionalLight(0xfff1e0, 2.5);
      keyLight.position.set(3.2, 4.4, 5.4);
      const flameLight = new THREE.DirectionalLight(0xff7a1a, 1.9);
      flameLight.position.set(-4, -1.6, -3);
      const pointLight = new THREE.PointLight(0xff9a45, 1.5, 9);
      pointLight.position.set(1.4, 1.2, 2.6);
      scene.add(keyLight, flameLight, pointLight);

      const book = new THREE.Group();
      book.rotation.y = -0.46;
      book.rotation.x = 0.1;
      book.scale.setScalar(0.96);
      scene.add(book);

      const total = HERO_QUOTES.length;
      const pageTextures = HERO_QUOTES.map((_, i) => pageTexture(THREE, i, total));
      const backTex = backTexture(THREE);

      /* ---- muqovalar ---- */
      const coverMat = [
        new THREE.MeshStandardMaterial({ color: 0x16243f, metalness: 0.35, roughness: 0.45 }),
        new THREE.MeshStandardMaterial({ color: 0x16243f, metalness: 0.35, roughness: 0.45 }),
        new THREE.MeshStandardMaterial({ color: 0x1d2f52, metalness: 0.35, roughness: 0.45 }),
        new THREE.MeshStandardMaterial({ color: 0x1d2f52, metalness: 0.35, roughness: 0.45 }),
        new THREE.MeshStandardMaterial({ map: coverTexture(THREE, "Hikmatlar", "kitobi"), metalness: 0.3, roughness: 0.5 }),
        new THREE.MeshStandardMaterial({ color: 0x101a2c, metalness: 0.35, roughness: 0.5 }),
      ];
      const rightCover = new THREE.Mesh(new THREE.BoxGeometry(PAGE_W + 0.1, PAGE_H + 0.1, 0.11), coverMat);
      rightCover.position.set((PAGE_W + 0.1) / 2, 0, -0.075);
      rightCover.rotation.y = -Math.PI;
      book.add(rightCover);

      const leftCover = new THREE.Mesh(
        new THREE.BoxGeometry(PAGE_W + 0.1, PAGE_H + 0.1, 0.11),
        new THREE.MeshStandardMaterial({ color: 0x16243f, metalness: 0.35, roughness: 0.45 })
      );
      leftCover.position.set(-(PAGE_W + 0.1) / 2, 0, -0.075);
      book.add(leftCover);

      // umurtqa
      const spine = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, PAGE_H + 0.1, 18, 1, false, 0, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0x101a2c, metalness: 0.3, roughness: 0.5 })
      );
      spine.rotation.z = Math.PI / 2;
      spine.rotation.y = Math.PI / 2;
      spine.position.set(0, 0, -0.075);
      book.add(spine);

      /* ---- varaqlar ---- */
      type Page = { pivot: Group; mesh: Mesh; flipped: boolean };
      const pages: Page[] = [];
      const pageGeo = new THREE.BoxGeometry(PAGE_W, PAGE_H, 0.012);
      for (let i = 0; i < total; i++) {
        const front = new THREE.MeshStandardMaterial({ map: pageTextures[i], roughness: 0.72, metalness: 0.05 });
        const back = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.72, metalness: 0.05 });
        const edge = new THREE.MeshStandardMaterial({ color: 0xf3e7d3, roughness: 0.8 });
        const mesh = new THREE.Mesh(pageGeo, [edge, edge, edge, edge, front, back]);
        mesh.position.set(PAGE_W / 2, 0, i * -0.004);
        const pivot = new THREE.Group();
        pivot.position.set(0, (i - total / 2) * 0.0016, i * -0.006 + 0.004);
        pivot.add(mesh);
        book.add(pivot);
        pages.push({ pivot, mesh, flipped: false });
      }

      /* ---- aura halqasi + chang ---- */
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(2.5, 0.008, 8, 220),
        new THREE.MeshBasicMaterial({ color: 0xff8a2b, transparent: true, opacity: 0.32 })
      );
      halo.rotation.x = Math.PI / 2 - 0.3;
      scene.add(halo);

      const dustCount = 260;
      const positions = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i++) {
        const r = 2.4 + Math.random() * 3;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.cos(phi) * 0.7;
        positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      }
      const dustGeo = new THREE.BufferGeometry();
      dustGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const dust = new THREE.Points(
        dustGeo,
        new THREE.PointsMaterial({ size: 0.032, color: 0xffd7b0, transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      scene.add(dust);

      /* ---- varaq almashish logikasi ---- */
      const state = { current: 0 };
      const EASE = (t: number) => 1 - Math.pow(1 - t, 3);

      const startFlip = (pageIndex: number) => {
        const page = pages[pageIndex];
        if (!page) return;
        const forward = !page.flipped;
        const from = page.pivot.rotation.y;
        const to = forward ? -Math.PI : 0;
        const dur = forward ? 900 : 420;
        const t0 = performance.now();
        const step = () => {
          const t = Math.min(1, (performance.now() - t0) / dur);
          page.pivot.rotation.y = from + (to - from) * EASE(t);
          if (t < 1) requestAnimationFrame(step);
          else page.flipped = forward;
        };
        step();
      };

      const flipNext = () => {
        if (state.current < total) {
          startFlip(state.current);
          state.current += 1;
        } else {
          // kitob oxiriga yetdi — boshidan varaqlab qaytamiz
          for (let i = 0; i < total; i++) {
            const page = pages[total - 1 - i];
            if (page.flipped) page.flipped = false;
            setTimeout(() => {
              const f = page.pivot.rotation.y;
              const t0 = performance.now();
              const step = () => {
                const t = Math.min(1, (performance.now() - t0) / 320);
                page.pivot.rotation.y = f * (1 - EASE(t));
                if (t < 1) requestAnimationFrame(step);
              };
              step();
            }, i * 90);
          }
          state.current = 1;
          setTimeout(() => startFlip(0), 120);
        }
      };
      nextRef.current = flipNext;

      /* avtomatik varaqlash */
      let auto = window.setInterval(() => flipNext(), 5600);
      const onEnter = () => window.clearInterval(auto);
      const onLeave = () => {
        window.clearInterval(auto);
        auto = window.setInterval(() => flipNext(), 5600);
      };
      const onClick = () => flipNext();
      host.addEventListener("pointerenter", onEnter);
      host.addEventListener("pointerleave", onLeave);
      host.addEventListener("click", onClick);

      /* ---- harakat ---- */
      const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
      let scrollP = 0;
      let visible = true;
      const clock = new THREE.Clock();
      let raf = 0;

      const onPointerMove = (e: PointerEvent) => {
        pointer.tx = (e.clientX / (window.innerWidth || 1)) * 2 - 1;
        pointer.ty = (e.clientY / (window.innerHeight || 1)) * 2 - 1;
      };
      const onScroll = () => {
        scrollP = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight || 1)));
      };

      const render = () => {
        if (!visible || document.hidden) {
          raf = requestAnimationFrame(render);
          return;
        }
        const t = clock.getElapsedTime();
        pointer.x += (pointer.tx - pointer.x) * 0.05;
        pointer.y += (pointer.ty - pointer.y) * 0.05;

        book.position.y = Math.sin(t * 0.7) * 0.07 - scrollP * 0.3;
        book.rotation.y = -0.46 + pointer.x * 0.42 + Math.sin(t * 0.24) * 0.05 + scrollP * 0.5;
        book.rotation.x = 0.1 - pointer.y * 0.24 + Math.sin(t * 0.33) * 0.03;
        book.scale.setScalar(0.96 * (1 - scrollP * 0.1));

        halo.rotation.z = t * 0.12;
        pointLight.intensity = 1.35 + Math.sin(t * 1.6) * 0.25;
        dust.rotation.y = t * 0.03;
        dust.rotation.x = Math.sin(t * 0.07) * 0.07;

        renderer.render(scene, camera);
        raf = requestAnimationFrame(render);
      };

      const io = new IntersectionObserver((entries) => {
        visible = entries.some((e) => e.isIntersecting);
      });
      io.observe(host);

      const ro = new ResizeObserver(() => {
        const w = width();
        const h = height();
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      });
      ro.observe(host);

      window.addEventListener("scroll", onScroll, { passive: true });
      if (fine) window.addEventListener("pointermove", onPointerMove, { passive: true });
      onScroll();
      render();
      setMode("webgl");

      cleanup = () => {
        window.clearInterval(auto);
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        host.removeEventListener("pointerenter", onEnter);
        host.removeEventListener("pointerleave", onLeave);
        host.removeEventListener("click", onClick);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("pointermove", onPointerMove);
        scene.traverse((obj: Object3D) => {
          const mesh = obj as Mesh;
          mesh.geometry?.dispose?.();
          const mat = mesh.material as Material | Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose?.();
        });
        pageTextures.forEach((tex) => tex.dispose());
        backTex.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch(() => {
      if (!disposed) setMode("fallback");
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  const quote = HERO_QUOTES[index % HERO_QUOTES.length];

  return (
    <div className={`herobook ${className ?? ""}`} data-mode={mode}>
      <div ref={hostRef} className="herobook-stage" aria-hidden="true">
        {mode === "fallback" ? (
          <div className="herobook-fallback">
            <div className="herobook-fallback-inner">
              <span className="herobook-mark" aria-hidden="true">
                &ldquo;
              </span>
              <p className="herobook-fallback-text">{quote.text}</p>
              <span className="herobook-fallback-src">— {quote.source}</span>
            </div>
            <span className="herobook-fallback-lines" aria-hidden="true" />
          </div>
        ) : null}
      </div>

      {/* Ekran o‘quvchi va kichik ekranlar uchun matn + boshqaruv */}
      <div className="herobook-caption">
        <p className="herobook-quote" aria-live="polite">
          {quote.text}
        </p>
        <div className="herobook-controls">
          <span className="herobook-src">— {quote.source}</span>
          <button type="button" className="herobook-next" onClick={next} aria-label="Keyingi hikmat sahifasi">
            Keyingi hikmat
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
