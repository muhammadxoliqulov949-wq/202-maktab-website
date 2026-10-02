"use client";

import { useEffect, useRef, useState } from "react";
import type { Material, Mesh } from "three";

/**
 * Hero3D — "Bilim yadrosi" (knowledge core).
 *
 * Hero matni yonidagi bo'sh joyda aylanadigan haqiqiy WebGL (three.js) sahna:
 *  - shishasimon ikosaedr yadro + emerald simli qobiq,
 *  - atrofida aylanadigan "fan" tugunlari (tetraedr/oktaedr/kub/torus),
 *  - orbital halqalar va zarrachalar maydoni,
 *  - sichqoncha parallaksi + scroll bilan bog'langan aylanish.
 *
 * Muhim:
 *  - three faqat brauzerda va faqat kerak bo'lganda (dynamic import) yuklanadi,
 *    shu sababli SSR/bundle'ga ta'sir qilmaydi.
 *  - `prefers-reduced-motion`, WebGL yo'qligi yoki saqlash rejimida CSS 3D
 *    zaxira (fallback) ko'rsatiladi — "wow" effekt saqlanadi, lekin harakat yo'q.
 *  - Sahna ekrandan chiqsa yoki tab yashirinsa — render to'xtatiladi (batareya/CPU).
 */

type Mode = "pending" | "webgl" | "fallback";

export function Hero3D({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<Mode>("pending");

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
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, width() / height(), 0.1, 100);
      camera.position.set(0, 0, 7.6);

      scene.add(new THREE.AmbientLight(0xffffff, 1.05));
      const keyLight = new THREE.DirectionalLight(0xbcd8ff, 2.6);
      keyLight.position.set(3.4, 4.2, 5.2);
      const rimLight = new THREE.DirectionalLight(0x3ee0a6, 2.1);
      rimLight.position.set(-4.2, -2.4, -3.2);
      scene.add(keyLight, rimLight);

      const group = new THREE.Group();
      group.rotation.x = 0.16;
      scene.add(group);

      /* ---- yadro: shishasimon ikosaedr ---- */
      const coreGeo = new THREE.IcosahedronGeometry(1.46, 1);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x24406e,
        metalness: 0.62,
        roughness: 0.16,
        emissive: 0x0d2a4a,
        emissiveIntensity: 0.75,
        flatShading: true,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      group.add(core);

      /* ---- simli qobiq ---- */
      const shellGeo = new THREE.IcosahedronGeometry(1.98, 1);
      const shellMat = new THREE.MeshBasicMaterial({ color: 0x3ee0a6, wireframe: true, transparent: true, opacity: 0.34 });
      const shell = new THREE.Mesh(shellGeo, shellMat);
      group.add(shell);

      /* ---- ichki nur (glow) ---- */
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.66, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x86f5cb, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending })
      );
      group.add(glow);

      /* ---- orbital halqalar ---- */
      const rings: Mesh[] = [];
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(2.5 + i * 0.5, 0.011, 8, 240),
          new THREE.MeshBasicMaterial({
            color: i === 1 ? 0x6ff0c0 : 0x9dc4ff,
            transparent: true,
            opacity: 0.34 - i * 0.07,
          })
        );
        ring.rotation.x = Math.PI / 2 - i * 0.42;
        ring.rotation.y = i * 0.7;
        rings.push(ring);
        group.add(ring);
      }

      /* ---- "fan" tugunlari ---- */
      const nodeGeos = [
        new THREE.TetrahedronGeometry(0.17),
        new THREE.OctahedronGeometry(0.16),
        new THREE.BoxGeometry(0.2, 0.2, 0.2),
        new THREE.TorusGeometry(0.13, 0.052, 8, 22),
        new THREE.IcosahedronGeometry(0.15, 0),
      ];
      const nodes: Mesh[] = [];
      for (let i = 0; i < 8; i++) {
        const isAccent = i % 2 === 0;
        const node = new THREE.Mesh(
          nodeGeos[i % nodeGeos.length],
          new THREE.MeshStandardMaterial({
            color: isAccent ? 0x6ff0c0 : 0xa9caff,
            metalness: 0.42,
            roughness: 0.22,
            emissive: isAccent ? 0x1b6b50 : 0x25457d,
            emissiveIntensity: 0.9,
          })
        );
        node.userData = {
          radius: 2.62 + (i % 3) * 0.46,
          speed: 0.15 + i * 0.023,
          phase: i * 0.86,
          tilt: i % 2 ? 0.62 : 0.26,
          yOff: i % 2 ? 0.5 : -0.44,
        };
        nodes.push(node);
        group.add(node);
      }

      /* ---- zarrachalar maydoni ---- */
      const count = 420;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const r = 3.1 + Math.random() * 3.4;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.cos(phi) * 0.72;
        positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      }
      const dustGeo = new THREE.BufferGeometry();
      dustGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const dust = new THREE.Points(
        dustGeo,
        new THREE.PointsMaterial({
          size: 0.035,
          color: 0xcfe6ff,
          transparent: true,
          opacity: 0.68,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      scene.add(dust);

      /* ---- harakat holati ---- */
      const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
      let scrollP = 0;
      let visible = true;
      const clock = new THREE.Clock();
      let raf = 0;

      const onPointerMove = (e: PointerEvent) => {
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        pointer.tx = (e.clientX / w) * 2 - 1;
        pointer.ty = (e.clientY / h) * 2 - 1;
      };
      const onScroll = () => {
        const vh = window.innerHeight || 1;
        scrollP = Math.min(1, Math.max(0, window.scrollY / vh));
      };
      const render = () => {
        if (!visible || document.hidden) {
          raf = requestAnimationFrame(render);
          return;
        }
        const t = clock.getElapsedTime();

        pointer.x += (pointer.tx - pointer.x) * 0.045;
        pointer.y += (pointer.ty - pointer.y) * 0.045;

        group.rotation.y = t * 0.1 + pointer.x * 0.55 + scrollP * 0.85;
        group.rotation.x = 0.16 + Math.sin(t * 0.22) * 0.07 + pointer.y * -0.3;
        group.position.y = Math.sin(t * 0.5) * 0.075 - scrollP * 0.35;
        group.scale.setScalar(1 - scrollP * 0.12);

        core.rotation.y = -t * 0.24;
        core.rotation.x = t * 0.14;
        shell.rotation.y = t * 0.18;
        shell.rotation.z = -t * 0.11;
        shellMat.opacity = 0.26 + Math.sin(t * 1.4) * 0.09;
        glow.scale.setScalar(0.94 + Math.sin(t * 1.9) * 0.07);
        rings.forEach((ring, i) => {
          ring.rotation.z = t * (0.1 + i * 0.05) * (i % 2 ? -1 : 1);
        });

        nodes.forEach((node) => {
          const d = node.userData as { radius: number; speed: number; phase: number; tilt: number; yOff: number };
          const a = t * d.speed + d.phase;
          node.position.set(
            Math.cos(a) * d.radius,
            d.yOff + Math.sin(a * 1.35) * 0.34,
            Math.sin(a) * d.radius * Math.cos(d.tilt)
          );
          node.rotation.x = t * 0.7;
          node.rotation.y = t * 0.55;
        });

        dust.rotation.y = t * 0.028;
        dust.rotation.x = Math.sin(t * 0.06) * 0.08;

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
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("pointermove", onPointerMove);
        scene.traverse((obj) => {
          const mesh = obj as Mesh;
          mesh.geometry?.dispose?.();
          const mat = mesh.material as Material | Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose?.();
        });
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

  return (
    <div ref={hostRef} className={`hero3d ${className ?? ""}`} data-mode={mode} aria-hidden="true">
      {mode === "fallback" ? (
        <div className="hero3d-fallback">
          <span className="hero3d-ring hero3d-ring-1" />
          <span className="hero3d-ring hero3d-ring-2" />
          <span className="hero3d-ring hero3d-ring-3" />
          <span className="hero3d-core">202</span>
          <span className="hero3d-node hero3d-node-1" />
          <span className="hero3d-node hero3d-node-2" />
          <span className="hero3d-node hero3d-node-3" />
        </div>
      ) : null}
    </div>
  );
}
