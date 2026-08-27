import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { VRMLoaderPlugin, VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import { RefreshCw, Video, Sparkles, AlertCircle } from "lucide-react";

// Initialize RectAreaLight shader support for realistic window/screen area lighting
RectAreaLightUniformsLib.init();

export interface ThreeVRMAvatarCanvasProps {
  vrmUrl?: string;
  interviewerName?: string;
  interviewerRole?: string;
  backgroundUrl?: string;
  state?: string;
  isSpeaking?: boolean;
  speechVolume?: number;
  className?: string;
  onLoaded?: () => void;
  onError?: (err: string) => void;
  onSwitchMode?: () => void;
}

// Gaze target direction vectors (in camera space)
const GAZE_CAMERA = new THREE.Vector3(0, 0, 1);
const GAZE_LAPTOP = new THREE.Vector3(0.08, -0.28, 0.65);
const GAZE_SIDE_L = new THREE.Vector3(-0.16, -0.02, 0.85);
const GAZE_SIDE_R = new THREE.Vector3(0.14, -0.02, 0.85);

interface ExprTarget {
  happy?: number;
  surprised?: number;
  relaxed?: number;
}

function exprForState(state: string): ExprTarget {
  const s = state.toUpperCase();
  if (s === "SPEAKING") return { happy: 0.16, relaxed: 0.08 };
  if (s === "LISTENING") return { surprised: 0.08, happy: 0.05, relaxed: 0.12 };
  if (s === "THINKING" || s === "PROCESSING") return { relaxed: 0.25 };
  if (s === "COMPLETED") return { happy: 0.45, relaxed: 0.15 };
  if (s === "CONNECTED" || s === "CONNECTING") return { happy: 0.12, relaxed: 0.08 };
  return { relaxed: 0.08 };
}

// ── Helper: Add Mesh ────────────────────────────────────────────────────────
function addMesh(
  scene: THREE.Scene,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  pos: [number, number, number] | number[] = [0, 0, 0],
  rot: [number, number, number] | number[] = [0, 0, 0],
  castShadow = false,
  receiveShadow = false
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(pos[0], pos[1], pos[2]);
  m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = castShadow;
  m.receiveShadow = receiveShadow;
  scene.add(m);
  return m;
}

// ── Procedural Textures for Premium Corporate Architectural Realism ─────────

function createAcousticSlatsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Dark acoustic charcoal felt backing
  ctx.fillStyle = "#141518";
  ctx.fillRect(0, 0, 512, 512);

  // Vertical warm walnut wood slats (24px slat + 8px shadow gap = 32px pitch)
  const slatWidth = 24;
  const pitch = 32;
  const woodShades = ["#684323", "#744b28", "#5f3d1e", "#7e532e", "#5a3719", "#6e4725"];

  for (let x = 0; x < 512; x += pitch) {
    const baseColor = woodShades[Math.floor((x / pitch) % woodShades.length)];
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, 0, slatWidth, 512);

    // Beveled highlight on left edge of slat
    ctx.fillStyle = "rgba(255, 235, 205, 0.22)";
    ctx.fillRect(x, 0, 2, 512);

    // Shadow on right edge of slat
    ctx.fillStyle = "rgba(0, 0, 0, 0.40)";
    ctx.fillRect(x + slatWidth - 2, 0, 2, 512);

    // Subtle natural vertical wood grain lines
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    for (let g = 0; g < 4; g++) {
      ctx.fillRect(x + 4 + g * 5, 0, 1.5, 512);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCorporateEmblemTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Brushed graphite plaque background
  const bgGrad = ctx.createLinearGradient(0, 0, 512, 256);
  bgGrad.addColorStop(0, "#22252a");
  bgGrad.addColorStop(0.5, "#2a2d34");
  bgGrad.addColorStop(1, "#1d2024");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 256);

  // Subtle border bevel
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 240);

  // Minimalist modern tech icon (interconnected hexagon / nexus)
  ctx.save();
  ctx.translate(105, 128);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 5;
  ctx.shadowColor = "rgba(56, 189, 248, 0.45)";
  ctx.shadowBlur = 10;

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const px = Math.cos(angle) * 36;
    const py = Math.sin(angle) * 36;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  // Inner core
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Clean corporate typography
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("NEXUS CAREERS", 175, 115);

  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  ctx.font = "600 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.letterSpacing = "2.5px";
  ctx.fillText("EXECUTIVE INTERVIEW SUITE", 175, 150);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCarpetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Base warm heather charcoal
  ctx.fillStyle = "#222427";
  ctx.fillRect(0, 0, 256, 256);

  // Fine linear acoustic weave pattern
  ctx.fillStyle = "rgba(255, 255, 255, 0.035)";
  for (let y = 0; y < 256; y += 4) {
    ctx.fillRect(0, y, 256, 2);
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  for (let x = 0; x < 256; x += 4) {
    ctx.fillRect(x, 0, 2, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── 1. Premium Corporate Office Architecture & Environment ───────────────────
function buildRoom(
  scene: THREE.Scene,
  woodTex: THREE.Texture | null,
  officeBgTex: THREE.Texture | null
) {
  const wallMat = (c: number) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0.01 });

  // 1.1 Acoustic Woven Carpet Flooring
  const carpetTex = createCarpetTexture();
  const floorMat = new THREE.MeshStandardMaterial({
    map: carpetTex,
    roughness: 0.88,
    metalness: 0.01,
  });
  addMesh(scene, new THREE.PlaneGeometry(6.5, 6.5), floorMat, [0, 0, 0], [-Math.PI / 2, 0, 0], false, true);

  // 1.2 Suspended Acoustic Ceiling with Recessed Linear Light Troughs
  const ceilingMat = wallMat(0xf3f2ef);
  addMesh(scene, new THREE.PlaneGeometry(6.5, 6.5), ceilingMat, [0, 3.6, 0], [Math.PI / 2, 0, 0], false, false);

  // Linear recessed LED light fixtures in ceiling
  const ledGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xfff3db),
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });
  addMesh(scene, new THREE.BoxGeometry(0.12, 0.03, 3.2), ledGlowMat, [-0.9, 3.59, 0]);
  addMesh(scene, new THREE.BoxGeometry(0.12, 0.03, 3.2), ledGlowMat, [0.9, 3.59, 0]);

  // 1.3 Back Architectural Feature Wall (Acoustic Wood Slats + Greige Plaster)
  const greigeMat = wallMat(0xdbd6cd);
  // Left and right plaster return walls flanking the feature panel
  addMesh(scene, new THREE.PlaneGeometry(1.6, 3.6), greigeMat, [-2.2, 1.8, -2.2], [0, 0, 0], false, true);
  addMesh(scene, new THREE.PlaneGeometry(1.6, 3.6), greigeMat, [2.2, 1.8, -2.2], [0, 0, 0], false, true);

  // Luxury Vertical Acoustic Wood Slat Feature Wall (Center)
  const acousticTex = createAcousticSlatsTexture();
  const acousticMat = new THREE.MeshStandardMaterial({
    map: acousticTex,
    roughness: 0.45,
    metalness: 0.04,
  });
  addMesh(scene, new THREE.PlaneGeometry(2.6, 3.3), acousticMat, [0, 1.75, -2.18], [0, 0, 0], false, true);

  // Architectural Wood Trim Frame for Slat Panel
  const trimWoodMat = new THREE.MeshStandardMaterial({ color: 0x482d1c, roughness: 0.35, metalness: 0.05 });
  addMesh(scene, new THREE.BoxGeometry(0.04, 3.32, 0.04), trimWoodMat, [-1.31, 1.75, -2.17]);
  addMesh(scene, new THREE.BoxGeometry(0.04, 3.32, 0.04), trimWoodMat, [1.31, 1.75, -2.17]);
  addMesh(scene, new THREE.BoxGeometry(2.66, 0.04, 0.04), trimWoodMat, [0, 3.41, -2.17]);

  // Warm LED Architectural Cove Light above Acoustic Slats
  const coveLight = new THREE.RectAreaLight(0xffe2b8, 2.4, 2.6, 0.15);
  coveLight.position.set(0, 3.38, -2.14);
  coveLight.rotation.x = Math.PI / 2;
  scene.add(coveLight);

  // Subtle Corporate Tech Emblem Plaque on Right Feature Wall
  const emblemTex = createCorporateEmblemTexture();
  const emblemMat = new THREE.MeshStandardMaterial({
    map: emblemTex,
    roughness: 0.32,
    metalness: 0.25,
  });
  addMesh(scene, new THREE.PlaneGeometry(0.72, 0.36), emblemMat, [1.35, 2.38, -2.17]);
  addMesh(scene, new THREE.BoxGeometry(0.74, 0.38, 0.015), trimWoodMat, [1.35, 2.38, -2.18]);

  // Dark Bronze Architectural Baseboard Skirting
  const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x242220, roughness: 0.38, metalness: 0.65 });
  addMesh(scene, new THREE.BoxGeometry(6.5, 0.10, 0.03), baseboardMat, [0, 0.05, -2.19]);
  addMesh(scene, new THREE.BoxGeometry(0.03, 0.10, 5.5), baseboardMat, [2.99, 0.05, 0]);

  // 1.4 Floor-to-Ceiling Glass Partition with Exterior High-Rise Tech Office View (Left Side)
  const glassX = -2.8;

  // Exterior Photorealistic Office Backdrop Plane (outside the glass)
  if (officeBgTex) {
    officeBgTex.colorSpace = THREE.SRGBColorSpace;
    const bgMat = new THREE.MeshBasicMaterial({
      map: officeBgTex,
      transparent: true,
      opacity: 0.90,
    });
    addMesh(scene, new THREE.PlaneGeometry(6.2, 4.0), bgMat, [glassX - 0.5, 1.85, -0.2], [0, Math.PI / 2, 0]);
  }

  // Floor-to-Ceiling Architectural Glass Panels
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xebf3fa,
    roughness: 0.06,
    metalness: 0.12,
    transparent: true,
    opacity: 0.42,
  });
  addMesh(scene, new THREE.PlaneGeometry(4.8, 3.6), glassMat, [glassX, 1.8, 0], [0, Math.PI / 2, 0]);

  // Horizontal Frosted Glass Privacy Band across the middle
  const frostedMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.65,
    metalness: 0.02,
    transparent: true,
    opacity: 0.52,
  });
  addMesh(scene, new THREE.PlaneGeometry(4.8, 0.55), frostedMat, [glassX + 0.005, 1.40, 0], [0, Math.PI / 2, 0]);

  // Matte Black Aluminum Architectural Mullions / Window Frame
  const mullionMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35, metalness: 0.85 });
  // Horizontal frame rails
  addMesh(scene, new THREE.BoxGeometry(0.05, 0.06, 4.8), mullionMat, [glassX, 0.03, 0]);
  addMesh(scene, new THREE.BoxGeometry(0.05, 0.05, 4.8), mullionMat, [glassX, 1.12, 0]);
  addMesh(scene, new THREE.BoxGeometry(0.05, 0.05, 4.8), mullionMat, [glassX, 1.68, 0]);
  addMesh(scene, new THREE.BoxGeometry(0.05, 0.06, 4.8), mullionMat, [glassX, 3.57, 0]);
  // Vertical mullion posts
  [-2.2, -1.1, 0.0, 1.1, 2.2].forEach((z) => {
    addMesh(scene, new THREE.BoxGeometry(0.05, 3.55, 0.05), mullionMat, [glassX, 1.8, z]);
  });

  // Soft Natural Daylight Light Source Streaming from Glass Wall
  const dayWinLight = new THREE.RectAreaLight(0xfff7e8, 2.8, 3.6, 2.4);
  dayWinLight.position.set(glassX + 0.2, 2.2, 0);
  dayWinLight.lookAt(0, 1.4, 0);
  scene.add(dayWinLight);

  // 1.5 Executive Architectural Display Niche on Right Wall
  const rightWallX = 2.98;
  addMesh(scene, new THREE.PlaneGeometry(5.5, 3.6), greigeMat, [rightWallX, 1.8, 0], [0, -Math.PI / 2, 0], false, true);

  // Recessed dark wood floating shelves
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.38, metalness: 0.04 });
  for (let i = 0; i < 3; i++) {
    const sy = 1.05 + i * 0.55;
    addMesh(scene, new THREE.BoxGeometry(0.24, 0.03, 1.35), shelfMat, [rightWallX - 0.12, sy, -0.85], [0, 0, 0], true, true);
    // Subtle under-shelf warm LED strip
    addMesh(scene, new THREE.BoxGeometry(0.04, 0.008, 1.3), ledGlowMat, [rightWallX - 0.12, sy - 0.015, -0.85]);
  }

  // Curated minimalist accessories on shelves (frosted glass cube award, technical books)
  const awardMat = new THREE.MeshStandardMaterial({ color: 0x67e8f9, roughness: 0.1, transparent: true, opacity: 0.75 });
  addMesh(scene, new THREE.BoxGeometry(0.08, 0.14, 0.08), awardMat, [rightWallX - 0.12, 1.71, -1.2]);

  const bookTones = [0x1e293b, 0x0f172a, 0x334155, 0x1e3a5f, 0x27272a];
  bookTones.forEach((col, idx) => {
    addMesh(
      scene,
      new THREE.BoxGeometry(0.18, 0.24, 0.035),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 }),
      [rightWallX - 0.12, 1.18, -0.95 + idx * 0.04],
      [0, 0, 0],
      true
    );
  });

  // 1.6 Architectural Corner Indoor Plant (Snake Plant in Fluted Ceramic Planter)
  // Positioned in the far left corner near the glass window, framing the room without blocking interviewer
  const plantX = -2.25;
  const plantZ = -1.75;

  // Fluted Matte White Ceramic Planter Pot
  const potMat = new THREE.MeshStandardMaterial({ color: 0xf6f5f2, roughness: 0.35, metalness: 0.05 });
  addMesh(scene, new THREE.CylinderGeometry(0.17, 0.13, 0.44, 24), potMat, [plantX, 0.22, plantZ], [0, 0, 0], true, true);
  // Pot soil bed
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x1c140d, roughness: 0.95 });
  addMesh(scene, new THREE.CylinderGeometry(0.16, 0.16, 0.04, 16), soilMat, [plantX, 0.43, plantZ]);

  // Architectural Snake Plant (Sansevieria) sword leaves of staggered heights
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1c441f, roughness: 0.48 });
  const leafEdgeMat = new THREE.MeshStandardMaterial({ color: 0xb5a638, roughness: 0.55 });
  const leafHeights = [0.45, 0.62, 0.78, 0.54, 0.72, 0.85, 0.58, 0.68, 0.48, 0.75, 0.65, 0.52];

  for (let i = 0; i < leafHeights.length; i++) {
    const angle = (i / leafHeights.length) * Math.PI * 2;
    const rad = 0.035 + (i % 3) * 0.025;
    const lh = leafHeights[i];
    const lx = plantX + Math.cos(angle) * rad;
    const lz = plantZ + Math.sin(angle) * rad;
    const ly = 0.44 + lh / 2;
    const tilt = 0.08 + (i % 3) * 0.04;

    addMesh(
      scene,
      new THREE.BoxGeometry(0.048, lh, 0.005),
      i % 2 === 0 ? leafMat : leafEdgeMat,
      [lx, ly, lz],
      [Math.sin(angle) * tilt, angle, Math.cos(angle) * tilt],
      true
    );
  }
}

// ── 2. Premium Ergonomic Executive High-Back Chair (Behind Interviewer) ─────
function buildOfficeChair(scene: THREE.Scene, leatherTex: THREE.Texture | null) {
  const leatherMat = new THREE.MeshStandardMaterial({
    map: leatherTex || null,
    color: 0x191a1e,
    roughness: 0.45,
    metalness: 0.08,
  });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.16, metalness: 0.92 });
  const darkPlasticMat = new THREE.MeshStandardMaterial({ color: 0x121316, roughness: 0.55 });

  // Contoured high-back rest with lumbar curve
  addMesh(scene, new THREE.BoxGeometry(0.54, 0.74, 0.06), leatherMat, [0, 1.18, -0.22], [-0.08, 0, 0], true, true);
  // Ergonomic Headrest
  addMesh(scene, new THREE.BoxGeometry(0.34, 0.16, 0.055), leatherMat, [0, 1.58, -0.25], [-0.05, 0, 0], true);
  // Lumbar support cushion arch
  addMesh(scene, new THREE.BoxGeometry(0.44, 0.14, 0.04), darkPlasticMat, [0, 0.96, -0.19], [-0.08, 0, 0]);

  // Polished aluminum rear support spine
  addMesh(scene, new THREE.BoxGeometry(0.055, 0.72, 0.035), chromeMat, [0, 1.15, -0.27], [-0.08, 0, 0]);
  // Headrest support bar
  addMesh(scene, new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8), chromeMat, [0, 1.50, -0.26]);

  // Ergonomic Seat cushion with beveled waterfall front
  addMesh(scene, new THREE.BoxGeometry(0.56, 0.085, 0.52), leatherMat, [0, 0.62, -0.06], [0, 0, 0], true, true);

  // 3D Executive Armrests with soft-touch pads and polished chrome posts
  addMesh(scene, new THREE.BoxGeometry(0.07, 0.03, 0.30), darkPlasticMat, [-0.31, 0.82, -0.04]);
  addMesh(scene, new THREE.BoxGeometry(0.07, 0.03, 0.30), darkPlasticMat, [0.31, 0.82, -0.04]);
  addMesh(scene, new THREE.CylinderGeometry(0.016, 0.016, 0.22, 10), chromeMat, [-0.31, 0.71, -0.04]);
  addMesh(scene, new THREE.CylinderGeometry(0.016, 0.016, 0.22, 10), chromeMat, [0.31, 0.71, -0.04]);

  // Heavy-duty pneumatic cylinder & 5-star polished aluminum base
  addMesh(scene, new THREE.CylinderGeometry(0.032, 0.032, 0.44, 12), chromeMat, [0, 0.32, -0.06]);
  addMesh(scene, new THREE.CylinderGeometry(0.34, 0.36, 0.04, 5), chromeMat, [0, 0.08, -0.06]);

  // Caster wheels on base
  for (let c = 0; c < 5; c++) {
    const cAng = (c / 5) * Math.PI * 2;
    addMesh(
      scene,
      new THREE.SphereGeometry(0.025, 8, 8),
      darkPlasticMat,
      [Math.cos(cAng) * 0.32, 0.03, -0.06 + Math.sin(cAng) * 0.32]
    );
  }
}

// ── 3. Executive Dark Walnut Interview Desk ──────────────────────────────────
function buildDesk(scene: THREE.Scene, woodTex: THREE.Texture | null): { deskTopY: number } {
  const deskMat = new THREE.MeshStandardMaterial({
    map: woodTex || null,
    color: 0x482d1c, // Rich, sophisticated dark walnut
    roughness: 0.36,
    metalness: 0.04,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.58, metalness: 0.04 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x7c7368, roughness: 0.25, metalness: 0.82 });
  const deskTopY = 0.78;

  // Main Desktop surface (Substantial executive thickness with beveled front profile)
  addMesh(scene, new THREE.BoxGeometry(1.92, 0.048, 0.88), deskMat, [0, deskTopY - 0.024, 0.36], [0, 0, 0], true, true);

  // Brushed Gunmetal Trim along edge
  addMesh(scene, new THREE.BoxGeometry(1.94, 0.022, 0.03), trimMat, [0, deskTopY + 0.007, 0.785]);

  // Front Fascia Apron
  addMesh(scene, new THREE.BoxGeometry(1.88, 0.18, 0.04), darkMat, [0, 0.63, 0.78], [0, 0, 0], true, false);

  // Side Aprons
  addMesh(scene, new THREE.BoxGeometry(0.04, 0.18, 0.78), darkMat, [-0.93, 0.63, 0.39]);
  addMesh(scene, new THREE.BoxGeometry(0.04, 0.18, 0.78), darkMat, [0.93, 0.63, 0.39]);

  // Modesty Panel
  addMesh(scene, new THREE.BoxGeometry(1.86, 0.56, 0.76), darkMat, [0, 0.38, 0.38], [0, 0, 0], false, true);

  // Solid Architectural Column Legs with brushed metal foot caps
  const legGeo = new THREE.BoxGeometry(0.075, 0.74, 0.075);
  const footCapGeo = new THREE.BoxGeometry(0.082, 0.04, 0.082);
  [
    [-0.89, 0.37, 0.02],
    [0.89, 0.37, 0.02],
    [-0.89, 0.37, 0.74],
    [0.89, 0.37, 0.74],
  ].forEach(([x, y, z]) => {
    addMesh(scene, legGeo, darkMat, [x, y, z], [0, 0, 0], true, false);
    addMesh(scene, footCapGeo, trimMat, [x, 0.02, z]);
  });

  // Executive Stitched Black Leather Blotter Pad (where hands rest)
  const blotterMat = new THREE.MeshStandardMaterial({ color: 0x141417, roughness: 0.62, metalness: 0.05 });
  addMesh(scene, new THREE.BoxGeometry(0.98, 0.005, 0.48), blotterMat, [0, deskTopY + 0.0025, 0.28], [0, 0, 0], false, true);

  return { deskTopY };
}

// ── 4. Slim Space-Gray 13" Executive Ultrabook ──────────────────────────────
function buildLaptop(scene: THREE.Scene, deskTopY: number) {
  const alumMat = new THREE.MeshStandardMaterial({ color: 0x32353c, roughness: 0.28, metalness: 0.88 });
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x08152e,
    emissive: new THREE.Color(0x1d4ed8),
    emissiveIntensity: 0.24,
    roughness: 0.12,
    metalness: 0.05,
  });
  const keyboardMat = new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.60, metalness: 0.35 });

  const laptopBaseY = deskTopY + 0.008;
  const lx = 0.0;
  const lz = 0.15;

  // Ultrabook Base Deck (Compact profile keeping hands completely visible)
  addMesh(scene, new THREE.BoxGeometry(0.24, 0.010, 0.17), alumMat, [lx, laptopBaseY + 0.005, lz], [0, 0, 0], true, true);

  // Inset Keyboard & Glass Trackpad
  addMesh(scene, new THREE.BoxGeometry(0.21, 0.002, 0.13), keyboardMat, [lx, laptopBaseY + 0.0105, lz + 0.01]);

  // Screen Lid (Tilted at 115° facing interviewer, low profile)
  const screenAngle = -Math.PI / 2 + 0.42;
  const pivotZ = lz - 0.082;
  const pivotY = laptopBaseY + 0.005;
  const lidPos: [number, number, number] = [
    lx,
    pivotY + Math.sin(-screenAngle) * 0.070,
    pivotZ + Math.cos(-screenAngle) * 0.070,
  ];
  addMesh(scene, new THREE.BoxGeometry(0.24, 0.14, 0.006), alumMat, lidPos, [screenAngle, 0, 0], true, false);

  // Active High-Resolution Display Surface
  const dispPos: [number, number, number] = [
    lx,
    lidPos[1] + Math.sin(-screenAngle) * 0.002,
    lidPos[2] + Math.cos(-screenAngle) * 0.002,
  ];
  addMesh(scene, new THREE.BoxGeometry(0.22, 0.12, 0.002), screenMat, dispPos, [screenAngle, 0, 0]);

  // Display Screen Soft Ambient Area Glow
  const glow = new THREE.RectAreaLight(0x38bdf8, 0.32, 0.22, 0.12);
  glow.position.set(dispPos[0], dispPos[1] + 0.02, dispPos[2]);
  glow.rotation.set(screenAngle, 0, 0);
  scene.add(glow);
}

// ── 5. Contemporary Executive Desk Accessories ──────────────────────────────
function buildAccessories(scene: THREE.Scene, deskTopY: number) {
  // 5.1 Clear Crystal Water Tumbler on Right Side
  const glassTumblerMat = new THREE.MeshStandardMaterial({
    color: 0xedf7ff,
    roughness: 0.04,
    metalness: 0.08,
    transparent: true,
    opacity: 0.45,
  });
  addMesh(scene, new THREE.CylinderGeometry(0.032, 0.028, 0.082, 18), glassTumblerMat, [0.46, deskTopY + 0.041, 0.28]);

  // Water level inside glass
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.02,
    transparent: true,
    opacity: 0.65,
  });
  addMesh(scene, new THREE.CylinderGeometry(0.030, 0.026, 0.055, 18), waterMat, [0.46, deskTopY + 0.030, 0.28]);

  // Minimalist Brushed Aluminum Coaster
  const coasterMat = new THREE.MeshStandardMaterial({ color: 0x32353c, roughness: 0.3, metalness: 0.85 });
  addMesh(scene, new THREE.CylinderGeometry(0.044, 0.044, 0.004, 20), coasterMat, [0.46, deskTopY + 0.002, 0.28]);

  // 5.2 Executive Stitched Leather Notebook on Left Side
  const bookMat = new THREE.MeshStandardMaterial({ color: 0x1c2230, roughness: 0.60, metalness: 0.04 });
  const pageMat = new THREE.MeshStandardMaterial({ color: 0xf4eedd, roughness: 0.85 });
  addMesh(scene, new THREE.BoxGeometry(0.18, 0.014, 0.24), bookMat, [-0.42, deskTopY + 0.007, 0.30], [0, 0.06, 0], false, true);
  addMesh(scene, new THREE.BoxGeometry(0.174, 0.012, 0.234), pageMat, [-0.42, deskTopY + 0.007, 0.30], [0, 0.06, 0]);

  // Matte Black Titanium Ballpoint Pen
  const pen = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0035, 0.0035, 0.15, 10),
    new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.22, metalness: 0.90 })
  );
  pen.rotation.z = Math.PI / 2;
  pen.rotation.y = 0.10;
  pen.position.set(-0.42, deskTopY + 0.018, 0.21);
  scene.add(pen);
}

// ── Helper: Case-Insensitive / Fuzzy Bone Resolver ──────────────────────────
function findBone(bones: Record<string, THREE.Object3D>, name: string): THREE.Object3D | null {
  if (bones[name]) return bones[name];
  const lower = name.toLowerCase();
  for (const k of Object.keys(bones)) {
    const kLower = k.toLowerCase();
    if (kLower === lower || kLower.endsWith(lower) || kLower.endsWith(`_${lower}`)) {
      return bones[k];
    }
  }
  return null;
}

// ── Helper: Anatomical Finger Relaxation & Curl on Tabletop ──────────────────
function curlFingers(
  bones: Record<string, THREE.Object3D>,
  side: "Left" | "Right",
  curlAmount: number,
  thumbCurl: number = 0.14
) {
  const digits = ["Index", "Middle", "Ring", "Pinky"];
  for (const digit of digits) {
    for (let joint = 1; joint <= 3; joint++) {
      const bone = findBone(bones, `${side}Hand${digit}${joint}`);
      if (bone) {
        // Natural ergonomic flexion curl along X axis
        const factor = joint === 1 ? 0.6 : joint === 2 ? 0.8 : 0.5;
        bone.rotation.x = curlAmount * factor;
      }
    }
  }
  const thumb1 = findBone(bones, `${side}HandThumb1`);
  const thumb2 = findBone(bones, `${side}HandThumb2`);
  const thumb3 = findBone(bones, `${side}HandThumb3`);
  if (thumb1) thumb1.rotation.set(0.12, side === "Left" ? -0.16 : 0.16, thumbCurl * 0.4);
  if (thumb2) thumb2.rotation.x = thumbCurl * 0.6;
  if (thumb3) thumb3.rotation.x = thumbCurl * 0.4;
}

// ── Helper: Exact Anatomical Arm & Forearm Solver for Corporate Posture ──────
function poseArmExact(
  armBone: THREE.Object3D,
  foreArmBone: THREE.Object3D,
  handBone: THREE.Object3D,
  targetHand: THREE.Vector3,
  sideSign: number
) {
  if (!armBone || !foreArmBone || !handBone || !armBone.parent) return;

  if (!armBone.userData.restQuat) {
    armBone.userData.restQuat = armBone.quaternion.clone();
    foreArmBone.userData.restQuat = foreArmBone.quaternion.clone();

    const pShoulder0 = new THREE.Vector3();
    const pElbow0 = new THREE.Vector3();
    const pHand0 = new THREE.Vector3();
    armBone.getWorldPosition(pShoulder0);
    foreArmBone.getWorldPosition(pElbow0);
    handBone.getWorldPosition(pHand0);

    armBone.userData.vArmRest = new THREE.Vector3().subVectors(pElbow0, pShoulder0).normalize();
    foreArmBone.userData.vForeRest = new THREE.Vector3().subVectors(pHand0, pElbow0).normalize();
  }

  // Restore rest quaternions to compute fresh delta from true baseline
  armBone.quaternion.copy(armBone.userData.restQuat);
  foreArmBone.quaternion.copy(foreArmBone.userData.restQuat);
  armBone.updateMatrixWorld(true);

  const pShoulder = new THREE.Vector3();
  armBone.getWorldPosition(pShoulder);

  // Exact target elbow: 10–20° away from torso (~15°), moving downward and slightly forward
  const targetElbow = new THREE.Vector3(
    pShoulder.x + sideSign * 0.065,
    pShoulder.y - 0.240,
    pShoulder.z + 0.050
  );
  const vArmTarget = new THREE.Vector3().subVectors(targetElbow, pShoulder).normalize();

  const qArmWorld = new THREE.Quaternion().setFromUnitVectors(armBone.userData.vArmRest, vArmTarget);
  const parentWorldQuat = new THREE.Quaternion();
  armBone.parent.getWorldQuaternion(parentWorldQuat);
  const parentWorldQuatInv = parentWorldQuat.clone().invert();

  const qArmParent = parentWorldQuatInv.clone().multiply(qArmWorld).multiply(parentWorldQuat);
  armBone.quaternion.copy(qArmParent.multiply(armBone.userData.restQuat));
  armBone.updateMatrixWorld(true);

  const actualElbow = new THREE.Vector3();
  const pHandCurrent = new THREE.Vector3();
  foreArmBone.getWorldPosition(actualElbow);
  handBone.getWorldPosition(pHandCurrent);

  const vForeCurrent = new THREE.Vector3().subVectors(pHandCurrent, actualElbow).normalize();
  const vForeTarget = new THREE.Vector3().subVectors(targetHand, actualElbow).normalize();

  const qForeWorld = new THREE.Quaternion().setFromUnitVectors(vForeCurrent, vForeTarget);
  const armWorldQuat = new THREE.Quaternion();
  armBone.getWorldQuaternion(armWorldQuat);
  const armWorldQuatInv = armWorldQuat.clone().invert();

  const qForeLocal = armWorldQuatInv.clone().multiply(qForeWorld).multiply(armWorldQuat);
  foreArmBone.quaternion.copy(qForeLocal.multiply(foreArmBone.userData.restQuat));
  foreArmBone.updateMatrixWorld(true);
}

// ── Helper: Two-Bone Analytical Inverse Kinematics for Table Posture ─────────
function solveTwoBoneIK(
  armBone: THREE.Object3D,
  foreArmBone: THREE.Object3D,
  handBone: THREE.Object3D,
  targetPos: THREE.Vector3,
  poleDir: THREE.Vector3
) {
  if (!armBone || !foreArmBone || !handBone || !armBone.parent) return;

  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();

  armBone.getWorldPosition(p0);
  foreArmBone.getWorldPosition(p1);
  handBone.getWorldPosition(p2);

  const l1 = p0.distanceTo(p1);
  const l2 = p1.distanceTo(p2);
  const d = Math.max(0.01, Math.min(p0.distanceTo(targetPos), l1 + l2 - 0.001));

  const cosAlpha = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const alpha = Math.acos(cosAlpha);

  const dir = new THREE.Vector3().subVectors(targetPos, p0).normalize();
  const pole = poleDir.clone().normalize();
  const normal = new THREE.Vector3().crossVectors(dir, pole).normalize();
  const up = new THREE.Vector3().crossVectors(normal, dir).normalize();

  const elbowPos = new THREE.Vector3()
    .copy(p0)
    .addScaledVector(dir, Math.cos(alpha) * l1)
    .addScaledVector(up, Math.sin(alpha) * l1);

  const parentInv = new THREE.Matrix4().copy(armBone.parent.matrixWorld).invert();
  const localElbow = elbowPos.clone().applyMatrix4(parentInv);
  const localP0 = p0.clone().applyMatrix4(parentInv);
  const armDirLocal = new THREE.Vector3().subVectors(localElbow, localP0).normalize();

  armBone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), armDirLocal);
  armBone.updateMatrixWorld(true);

  const armInv = new THREE.Matrix4().copy(armBone.matrixWorld).invert();
  const localTarget = targetPos.clone().applyMatrix4(armInv);
  const localElbowInArm = elbowPos.clone().applyMatrix4(armInv);
  const foreArmDirLocal = new THREE.Vector3().subVectors(localTarget, localElbowInArm).normalize();

  foreArmBone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), foreArmDirLocal);
  foreArmBone.updateMatrixWorld(true);
}

// ── 6. Main Three.js Realistic WebGL Canvas Component ────────────────────────
export const ThreeVRMAvatarCanvas: React.FC<ThreeVRMAvatarCanvasProps> = ({
  vrmUrl = "/avatars/mpfb.glb",
  interviewerName = "Priya Sharma",
  interviewerRole = "Senior Talent Acquisition Director & Executive HR Lead",
  state = "CONNECTED",
  isSpeaking = false,
  speechVolume = 0,
  className = "",
  onLoaded,
  onError,
  onSwitchMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const vrmRef = useRef<VRM | null>(null);
  const glbRootRef = useRef<THREE.Group | null>(null);
  const bonesRef = useRef<Record<string, THREE.Object3D>>({});
  const morphMeshesRef = useRef<THREE.SkinnedMesh[]>([]);
  const isGLBRef = useRef<boolean>(true);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  const speakingRef = useRef(isSpeaking);
  const volRef = useRef(speechVolume);

  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    speakingRef.current = isSpeaking;
  }, [isSpeaking]);
  useEffect(() => {
    volRef.current = speechVolume;
  }, [speechVolume]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setIsLoading(true);
    setProgress(0);
    setLoadError(null);

    // Sanitize any legacy VRM URL to corresponding realistic GLB model
    let targetModelUrl = vrmUrl || "/avatars/mpfb.glb";
    if (targetModelUrl.includes("female-1.vrm")) targetModelUrl = "/avatars/mpfb.glb";
    else if (targetModelUrl.includes("female-2.vrm")) targetModelUrl = "/avatars/brunette.glb";
    else if (targetModelUrl.includes("male-1.vrm")) targetModelUrl = "/avatars/avaturn.glb";
    else if (targetModelUrl.includes("male-2.vrm")) targetModelUrl = "/avatars/avatarsdk.glb";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xede8e0);

    // Renderer with ACES Tone Mapping & Soft Shadows
    const W = el.clientWidth || 800;
    const H = el.clientHeight || 500;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(renderer.domElement);

    // Candidate Eye-Level Camera View (Chest/Waist-up framing showing Desk, Laptop & Both Hands)
    const camera = new THREE.PerspectiveCamera(31, W / H, 0.05, 30);
    camera.position.set(0, 1.22, 1.62);
    camera.lookAt(0, 1.05, 0.08);

    // 5-Point Cinematic Professional Corporate Lighting Rig
    scene.add(new THREE.AmbientLight(0xfffaf4, 0.68));

    // Warm Key Daylight (From glass partition direction at 45° angle)
    const key = new THREE.DirectionalLight(0xfff6e8, 1.40);
    key.position.set(2.0, 3.4, 2.0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 10;
    key.shadow.camera.left = -2.2;
    key.shadow.camera.right = 2.2;
    key.shadow.camera.top = 2.2;
    key.shadow.camera.bottom = -2.2;
    key.shadow.bias = -0.0003;
    scene.add(key);

    // Cool Soft Fill Light (From right side, keeping facial expressions flattering & clear)
    const fill = new THREE.DirectionalLight(0xe6f0fa, 0.48);
    fill.position.set(-2.4, 2.2, 1.6);
    scene.add(fill);

    // Subtle Rim / Hair Separation Light
    const rim = new THREE.DirectionalLight(0xffffff, 0.35);
    rim.position.set(0, 2.8, -2.4);
    scene.add(rim);

    // Architectural Ceiling Downlight on Desk Center
    const downlight = new THREE.SpotLight(0xfff0dd, 0.75, 7, 0.45, 0.8);
    downlight.position.set(0, 3.4, 0.35);
    downlight.target.position.set(0, 0.78, 0.25);
    scene.add(downlight);
    scene.add(downlight.target);

    // Warm Diffuse Desk Bounce Light (Natural upward bounce from walnut wood table)
    const bounce = new THREE.PointLight(0xffe2c4, 0.25, 2.2);
    bounce.position.set(0, 0.84, 0.35);
    scene.add(bounce);

    // Build Premium Corporate Room Architecture & Furniture
    const tl = new THREE.TextureLoader();
    let woodTex: THREE.Texture | null = null;
    let officeBgTex: THREE.Texture | null = null;
    let leatherTex: THREE.Texture | null = null;

    const tryBuildEnvironment = () => {
      buildRoom(scene, woodTex, officeBgTex);
      buildOfficeChair(scene, leatherTex);
      const { deskTopY } = buildDesk(scene, woodTex);
      buildLaptop(scene, deskTopY);
      buildAccessories(scene, deskTopY);
    };

    tl.load(
      "/avatars/wood_texture.jpg",
      (wTex) => {
        wTex.colorSpace = THREE.SRGBColorSpace;
        woodTex = wTex;
      },
      undefined,
      () => {}
    );

    tl.load(
      "/avatars/leather_texture.jpg",
      (lTex) => {
        lTex.colorSpace = THREE.SRGBColorSpace;
        leatherTex = lTex;
      },
      undefined,
      () => {}
    );

    tl.load(
      "/avatars/office_backdrop_2.jpg",
      (bgTex) => {
        bgTex.colorSpace = THREE.SRGBColorSpace;
        officeBgTex = bgTex;
        tryBuildEnvironment();
      },
      undefined,
      () => {
        tryBuildEnvironment();
      }
    );

    // Determine if file is GLB/GLTF or VRM
    const isVRM = targetModelUrl.toLowerCase().endsWith(".vrm");
    isGLBRef.current = !isVRM;

    const loader = new GLTFLoader();
    if (isVRM) {
      loader.register((p) => new VRMLoaderPlugin(p));
    }

    loader.load(
      targetModelUrl,
      (gltf) => {
        bonesRef.current = {};
        morphMeshesRef.current = [];

        if (isVRM && gltf.userData.vrm) {
          const vrm: VRM = gltf.userData.vrm;
          vrmRef.current = vrm;
          scene.add(vrm.scene);
          vrm.scene.rotation.y = Math.PI;
          vrm.scene.position.set(0, -0.34, -0.04);

          vrm.scene.traverse((o) => {
            if ((o as THREE.Mesh).isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
            if (o.type === "Bone" || (o as THREE.Bone).isBone) {
              if (o.name) bonesRef.current[o.name] = o;
            }
          });

          const humanoid = vrm.humanoid;
          if (humanoid) {
            const vrmBones: Record<string, string> = {
              hips: "Hips",
              spine: "Spine",
              chest: "Spine1",
              upperChest: "Spine2",
              neck: "Neck",
              head: "Head",
              leftShoulder: "LeftShoulder",
              rightShoulder: "RightShoulder",
              leftUpperArm: "LeftArm",
              rightUpperArm: "RightArm",
              leftLowerArm: "LeftForeArm",
              rightLowerArm: "RightForeArm",
              leftHand: "LeftHand",
              rightHand: "RightHand",
              leftUpperLeg: "LeftUpLeg",
              rightUpperLeg: "RightUpLeg",
              leftLowerLeg: "LeftLeg",
              rightLowerLeg: "RightLeg",
              leftFoot: "LeftFoot",
              rightFoot: "RightFoot",
            };
            for (const [boneKey, alias] of Object.entries(vrmBones)) {
              const node = humanoid.getNormalizedBoneNode(boneKey as any) || humanoid.getRawBoneNode(boneKey as any);
              if (node) {
                bonesRef.current[alias] = node;
                bonesRef.current[boneKey] = node;
              }
            }
          }
        } else {
          // Photorealistic GLB model (mpfb.glb / avaturn.glb / brunette.glb / avatarsdk.glb)
          const root = gltf.scene;
          glbRootRef.current = root;
          scene.add(root);

          // Position seated naturally in the executive high-back chair behind the desk
          const mLower = targetModelUrl.toLowerCase();
          let rootY = -0.34;
          if (mLower.includes("avaturn")) rootY = -0.46;
          else if (mLower.includes("brunette")) rootY = -0.38;
          else if (mLower.includes("avatarsdk")) rootY = -0.37;
          root.position.set(0, rootY, -0.04);
          root.rotation.set(0, 0, 0);

          // Cache bones & morph target meshes with tailored corporate coat suit PBR shading adjustments
          root.traverse((o) => {
            if ((o as THREE.Mesh).isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;

              const mesh = o as THREE.SkinnedMesh;
              if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
                morphMeshesRef.current.push(mesh);
              }

              const mat = mesh.material as THREE.MeshStandardMaterial;
              if (mat && mat.isMeshStandardMaterial) {
                const name = (mesh.name || "").toLowerCase();
                const matName = (mat.name || "").toLowerCase();

                if (name.includes("eye") || name.includes("cornea") || matName.includes("eye")) {
                  mat.roughness = 0.04;
                  mat.metalness = 0.08;
                } else if (
                  name.includes("head") ||
                  name.includes("body") ||
                  name.includes("skin") ||
                  name.includes("base") ||
                  matName.includes("skin") ||
                  matName.includes("head")
                ) {
                  mat.roughness = 0.58;
                  mat.metalness = 0.0;
                } else if (name.includes("hair") || name.includes("ponytail") || matName.includes("hair")) {
                  mat.roughness = 0.62;
                  mat.metalness = 0.02;
                } else if (name.includes("teeth") || matName.includes("teeth")) {
                  mat.roughness = 0.20;
                  mat.metalness = 0.0;
                } else if (name.includes("tie") || matName.includes("tie")) {
                  // Formal Business Tie: Elegant silk satin sheen
                  mat.roughness = 0.28;
                  mat.metalness = 0.06;
                } else if (name.includes("shoe") || name.includes("footwear") || matName.includes("shoe")) {
                  // Polished formal leather dress shoes
                  mat.roughness = 0.22;
                  mat.metalness = 0.05;
                } else if (name.includes("shirt") || name.includes("collar")) {
                  // Crisp formal white dress shirt
                  mat.roughness = 0.72;
                  mat.metalness = 0.0;
                } else {
                  // Tailored Corporate Coat Suit / Formal Blazer / Formal Trousers
                  // Authentic high-thread-count wool/cashmere fabric: zero plastic sheen, realistic micro-roughness
                  mat.roughness = 0.86;
                  mat.metalness = 0.01;
                }
              }
            }

            if (o.type === "Bone" || (o as THREE.Bone).isBone) {
              if (o.name) {
                bonesRef.current[o.name] = o;
              }
            }
          });

          // Add subtle professional accessory: Executive Wristwatch at left suit sleeve cuff
          const lForeArm = findBone(bonesRef.current, "LeftForeArm");
          if (lForeArm && !lForeArm.getObjectByName("executive_watch")) {
            const watchGroup = new THREE.Group();
            watchGroup.name = "executive_watch";

            // Leather watch strap
            const strapMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.55, metalness: 0.05 });
            const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.016, 16), strapMat);
            strap.rotation.x = Math.PI / 2;
            watchGroup.add(strap);

            // Polished metallic watch case
            const caseMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.18, metalness: 0.88 });
            const caseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.005, 16), caseMat);
            caseMesh.position.set(0, 0.037, 0);
            watchGroup.add(caseMesh);

            // Dark sunburst dial with subtle crystal glass highlight
            const dialMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.12, metalness: 0.35 });
            const dial = new THREE.Mesh(new THREE.CircleGeometry(0.014, 16), dialMat);
            dial.rotation.x = -Math.PI / 2;
            dial.position.set(0, 0.040, 0);
            watchGroup.add(dial);

            // Position at distal wrist end where hand emerges naturally from the formal suit sleeve
            watchGroup.position.set(0, 0.20, 0);
            lForeArm.add(watchGroup);
          }
        }

        setIsLoading(false);
        setLoadError(null);
        onLoaded?.();
      },
      (evt) => {
        if (evt.total > 0) setProgress(Math.round((evt.loaded / evt.total) * 100));
      },
      (err) => {
        console.warn("[Avatar Loader]", err);
        setIsLoading(false);
        setLoadError("Avatar load failed. Switch to HD Video mode if needed.");
        onError?.(String(err));
      }
    );

    // ── Animation Engine State ─────────────────────────────────────────────
    const clock = new THREE.Clock();
    let blinkTimer = 0;
    let blinkVal = 0;
    let blinkInterval = 3.5 + Math.random() * 2.5;
    let blinkPhase: "open" | "closing" | "opening" = "open";
    let doublePending = false;
    let doubleDelay = 0;

    const gazeDir = new THREE.Vector3(0, 0, 1);
    let gazeTarget = GAZE_CAMERA.clone();
    let gazeT = 0;
    let gazeInterval = 2.8 + Math.random() * 3.2;

    let gestureT = 0;
    let eHappy = 0;
    let eSurprised = 0;
    let eRelaxed = 0;
    const EL = 0.03;

    // Helper: Set morph target influence across all meshes with normalized lookup
    const setMorph = (name: string, val: number) => {
      const lower = name.toLowerCase();
      for (let i = 0; i < morphMeshesRef.current.length; i++) {
        const m = morphMeshesRef.current[i];
        if (m.morphTargetDictionary && m.morphTargetInfluences) {
          let idx = m.morphTargetDictionary[name];
          if (idx === undefined) {
            for (const k of Object.keys(m.morphTargetDictionary)) {
              if (k.toLowerCase() === lower) {
                idx = m.morphTargetDictionary[k];
                break;
              }
            }
          }
          if (idx !== undefined) {
            m.morphTargetInfluences[idx] = val;
          }
        }
      }
    };

    // ── Render & Continuous Seated Animation Loop ──────────────────────────
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();

      const st = stateRef.current.toUpperCase();
      const speaking = st === "SPEAKING" || speakingRef.current;
      const listening = st === "LISTENING";
      const thinking = st === "THINKING" || st === "PROCESSING";

      // ── 1. Realistic Blinking (Variable timing + occasional double-blink) ──
      blinkTimer += dt;
      const bInterval = speaking
        ? 2.8 + Math.random() * 2.2
        : thinking
        ? 4.5 + Math.random() * 2.5
        : 3.5 + Math.random() * 2.5;

      if (blinkPhase === "open" && blinkTimer >= blinkInterval) {
        blinkPhase = "closing";
        blinkTimer = 0;
        blinkInterval = bInterval;
        doublePending = Math.random() < 0.15;
      }
      if (blinkPhase === "closing") {
        blinkVal = Math.min(1, blinkVal + dt * 14);
        if (blinkVal >= 1) blinkPhase = "opening";
      }
      if (blinkPhase === "opening") {
        blinkVal = Math.max(0, blinkVal - dt * 10);
        if (blinkVal <= 0) {
          blinkPhase = "open";
          blinkTimer = 0;
          if (doublePending) {
            doublePending = false;
            doubleDelay = 0.08;
          }
        }
      }
      if (doubleDelay > 0) {
        doubleDelay -= dt;
        if (doubleDelay <= 0) {
          blinkPhase = "closing";
          blinkTimer = 0;
        }
      }

      // ── 2. Eye Contact & Gaze Management ─────────────────────────────────
      gazeT += dt;
      if (gazeT >= gazeInterval) {
        gazeT = 0;
        gazeInterval = 2.4 + Math.random() * 3.6;
        const r = Math.random();
        if (thinking) {
          gazeTarget =
            r < 0.45
              ? GAZE_CAMERA.clone()
              : r < 0.72
              ? GAZE_LAPTOP.clone()
              : r < 0.86
              ? GAZE_SIDE_L.clone()
              : GAZE_SIDE_R.clone();
        } else if (speaking) {
          gazeTarget =
            r < 0.74
              ? GAZE_CAMERA.clone()
              : r < 0.86
              ? GAZE_SIDE_L.clone()
              : r < 0.94
              ? GAZE_SIDE_R.clone()
              : GAZE_LAPTOP.clone();
        } else if (listening) {
          gazeTarget =
            r < 0.84 ? GAZE_CAMERA.clone() : r < 0.92 ? GAZE_SIDE_L.clone() : GAZE_LAPTOP.clone();
        } else {
          gazeTarget =
            r < 0.72
              ? GAZE_CAMERA.clone()
              : r < 0.84
              ? GAZE_LAPTOP.clone()
              : r < 0.92
              ? GAZE_SIDE_L.clone()
              : GAZE_SIDE_R.clone();
        }
      }
      gazeDir.lerp(gazeTarget, thinking ? 0.025 : 0.04);

      // ── 3. Facial Expression Target Lerp ─────────────────────────────────
      const tgt = exprForState(stateRef.current);
      eHappy = THREE.MathUtils.lerp(eHappy, tgt.happy ?? 0, EL);
      eSurprised = THREE.MathUtils.lerp(eSurprised, tgt.surprised ?? 0, EL);
      eRelaxed = THREE.MathUtils.lerp(eRelaxed, tgt.relaxed ?? 0, EL);

      // ── 4. Speech Volume & Viseme Envelope ───────────────────────────────
      const vol = volRef.current || (speaking ? 0.60 : 0);
      const tf = t * 14.0;
      const isVoiceActive = speaking || vol > 0.04;

      // Restrict max jaw opening so character never appears to shout
      const jaw = isVoiceActive ? Math.min(0.38, vol * (0.35 + 0.18 * Math.sin(tf))) : 0;
      const visAa = isVoiceActive ? Math.min(0.55, vol * (0.45 + 0.20 * Math.sin(tf))) : 0;
      const visE = isVoiceActive ? Math.min(0.40, vol * (0.32 + 0.16 * Math.cos(tf * 1.05))) : 0;
      const visI = isVoiceActive ? Math.min(0.32, vol * (0.26 + 0.14 * Math.sin(tf * 1.1))) : 0;
      const visO = isVoiceActive ? Math.min(0.28, vol * (0.22 + 0.14 * Math.cos(tf * 0.9))) : 0;
      const visU = isVoiceActive ? Math.min(0.24, vol * (0.18 + 0.12 * Math.sin(tf * 0.85))) : 0;

      // ── 5. Apply Precision Transforms to VRM HumanoidBone Hierarchy ────────
      if (vrmRef.current && vrmRef.current.humanoid) {
        const h = vrmRef.current.humanoid;
        const deg2rad = Math.PI / 180;

        // [TORSO & HEAD]
        const hipsNode = h.getNormalizedBoneNode("hips");
        if (hipsNode) {
          hipsNode.position.y = 0.0;
          hipsNode.rotation.set(2 * deg2rad, 0, 0);
        }
        const spineNode = h.getNormalizedBoneNode("spine");
        if (spineNode) spineNode.rotation.set(-3 * deg2rad, 0, 0);

        const chestNode = h.getNormalizedBoneNode("chest") || h.getNormalizedBoneNode("upperChest");
        if (chestNode) chestNode.rotation.set(-2 * deg2rad, 0, 0);

        const neckNode = h.getNormalizedBoneNode("neck");
        if (neckNode) neckNode.rotation.set(2 * deg2rad, 0, 0);

        const headNode = h.getNormalizedBoneNode("head");
        if (headNode) headNode.rotation.set(-1 * deg2rad, 0, 0);

        // [LEFT ARM & HAND]
        const lShoulderNode = h.getNormalizedBoneNode("leftShoulder");
        if (lShoulderNode) lShoulderNode.rotation.set(0, 0, -5 * deg2rad);

        const lUpperArmNode = h.getNormalizedBoneNode("leftUpperArm");
        if (lUpperArmNode) lUpperArmNode.rotation.set(10 * deg2rad, 5 * deg2rad, -70 * deg2rad);

        const lLowerArmNode = h.getNormalizedBoneNode("leftLowerArm");
        if (lLowerArmNode) lLowerArmNode.rotation.set(12 * deg2rad, 0, 0);

        const lHandNode = h.getNormalizedBoneNode("leftHand");
        if (lHandNode) lHandNode.rotation.set(0, 0, 5 * deg2rad);

        // [RIGHT ARM & HAND]
        const rShoulderNode = h.getNormalizedBoneNode("rightShoulder");
        if (rShoulderNode) rShoulderNode.rotation.set(0, 0, 5 * deg2rad);

        const rUpperArmNode = h.getNormalizedBoneNode("rightUpperArm");
        if (rUpperArmNode) rUpperArmNode.rotation.set(10 * deg2rad, -5 * deg2rad, 70 * deg2rad);

        const rLowerArmNode = h.getNormalizedBoneNode("rightLowerArm");
        if (rLowerArmNode) rLowerArmNode.rotation.set(12 * deg2rad, 0, 0);

        const rHandNode = h.getNormalizedBoneNode("rightHand");
        if (rHandNode) rHandNode.rotation.set(0, 0, -5 * deg2rad);

        // [LEFT LEG & FOOT]
        const lUpperLegNode = h.getNormalizedBoneNode("leftUpperLeg");
        if (lUpperLegNode) lUpperLegNode.rotation.set(-2 * deg2rad, 3 * deg2rad, 2 * deg2rad);

        const lLowerLegNode = h.getNormalizedBoneNode("leftLowerLeg");
        if (lLowerLegNode) lLowerLegNode.rotation.set(4 * deg2rad, 0, 0);

        const lFootNode = h.getNormalizedBoneNode("leftFoot");
        if (lFootNode) lFootNode.rotation.set(2 * deg2rad, 0, 0);

        // [RIGHT LEG & FOOT]
        const rUpperLegNode = h.getNormalizedBoneNode("rightUpperLeg");
        if (rUpperLegNode) rUpperLegNode.rotation.set(-2 * deg2rad, -3 * deg2rad, -2 * deg2rad);

        const rLowerLegNode = h.getNormalizedBoneNode("rightLowerLeg");
        if (rLowerLegNode) rLowerLegNode.rotation.set(4 * deg2rad, 0, 0);

        const rFootNode = h.getNormalizedBoneNode("rightFoot");
        if (rFootNode) rFootNode.rotation.set(2 * deg2rad, 0, 0);

        vrmRef.current.update(dt);
      }

      // ── 6. Apply to Photorealistic GLB Model Bones ─────────────────────────
      const bones = bonesRef.current;
      const hips = findBone(bones, "Hips");
      if (hips) {
        // Seated lower body: Thighs forward under desk, lower legs down
        const lUL = findBone(bones, "LeftUpLeg");
        const rUL = findBone(bones, "RightUpLeg");
        const lLeg = findBone(bones, "LeftLeg");
        const rLeg = findBone(bones, "RightLeg");

        if (lUL) lUL.rotation.set(-Math.PI / 2.05, 0.08, 0);
        if (rUL) rUL.rotation.set(-Math.PI / 2.05, -0.08, 0);
        if (lLeg) lLeg.rotation.set(Math.PI / 2.15, 0, 0);
        if (rLeg) rLeg.rotation.set(Math.PI / 2.15, 0, 0);

        // 1. Spine: 90° upright from horizontal tabletop, 2° lower spine, 5° upper spine / chest forward lean
        const spine = findBone(bones, "Spine");
        const spine1 = findBone(bones, "Spine1");
        const spine2 = findBone(bones, "Spine2");

        const breathe = Math.sin(t * 1.5) * 0.004; // 1-2° natural chest breathing
        if (spine) spine.rotation.set(-0.035 + breathe * 0.5, 0, 0); // 2.0° lower spine
        if (spine1) spine1.rotation.set(-0.015 + breathe * 0.3, 0, 0);
        if (spine2) spine2.rotation.set(-0.020 + breathe * 0.2, 0, 0); // ~4.0° total attentive lean

        // 2. Head and Neck: 0-5° horizontal rotation, 0-3° tilt, 3-5° forward inclination, direct eye contact
        const neck = findBone(bones, "Neck");
        const head = findBone(bones, "Head");
        const nodAmt = listening
          ? Math.sin(t * 0.9) * 0.022 // Subtle listening nod (1-3°)
          : speaking
          ? Math.sin(t * 2.4) * 0.026
          : 0;
        if (neck) neck.rotation.set(-0.035, gazeDir.x * -0.06, 0);
        if (head) {
          head.rotation.set(
            -0.035 + gazeDir.y * -0.08 + nodAmt,
            gazeDir.x * -0.14,
            0
          );
        }

        // 3. Shoulders / Clavicles: X = 7°, Y = 190° (left) / 170° (right), Z = -7° / +7°
        const lShoulder = findBone(bones, "LeftShoulder");
        const rShoulder = findBone(bones, "RightShoulder");
        if (lShoulder) lShoulder.rotation.set(0.12, 0.17, -0.12);
        if (rShoulder) rShoulder.rotation.set(0.12, -0.17, 0.12);

        // Arm bones: upper arms close to torso, elbows naturally bent near tabletop, forearms extending forward
        const lArm = findBone(bones, "LeftArm");
        const lForeArm = findBone(bones, "LeftForeArm");
        const lHand = findBone(bones, "LeftHand");
        const rArm = findBone(bones, "RightArm");
        const rForeArm = findBone(bones, "RightForeArm");
        const rHand = findBone(bones, "RightHand");

        // Speech conversational cadence timer
        if (speaking) gestureT += dt;
        else gestureT = 0;

        // Subtle organic breathing cadence along desk (tabletop height is Y = 0.78m)
        const breatheDesk = Math.sin(t * 1.5) * 0.0015;

        const modelLower = targetModelUrl.toLowerCase();
        const nameLower = interviewerName.toLowerCase();

        // ── 4–15. Professional Corporate Interview Posture Across ALL Avatars ───
        // Upper arm: X = 30°, Y = 190°/170°, Z = -15°/+15° (25–35° away from torso)
        // Elbow: ~90° bend (85–100°), 5–15 cm forward from body
        // Forearms: X = 85° forward toward candidate/camera, parallel to tabletop
        // Wrists: X = 3°, Y = 0°, Z = -5°/+5° (neutral)
        // Hands: 15–25 cm to left & right of laptop centerline (X = +-0.18m), resting on tabletop
        // Fingers: 10–25° natural flexion

        let targetL: THREE.Vector3;
        let targetR: THREE.Vector3;
        let wristRotL = [0.05, 0, -0.08]; // X = 3°, Y = 0°, Z = -5°
        let wristRotR = [0.05, 0, 0.08];  // X = 3°, Y = 0°, Z = +5°
        let fingerCurl = 0.20; // 10–25° natural finger flexion
        const poleL = new THREE.Vector3(0.52, -0.48, -0.22);
        const poleR = new THREE.Vector3(-0.52, -0.48, -0.22);

        if (modelLower.includes("avaturn") || nameLower.includes("arjun")) {
          // Arjun Mehta: Hands resting on tabletop beside laptop, 18cm from center
          const gCadence = speaking ? Math.sin(gestureT * 1.5) * 0.005 : 0;
          targetL = new THREE.Vector3(0.180, 0.785 + breatheDesk, 0.23);
          targetR = new THREE.Vector3(-0.180, 0.785 + breatheDesk + gCadence, 0.23);
        } else if (modelLower.includes("brunette") || nameLower.includes("meera")) {
          // Meera Iyer: Hands resting on tabletop beside laptop, 18cm from center
          const gCadence = speaking ? Math.sin(gestureT * 1.8) * 0.004 : 0;
          targetL = new THREE.Vector3(0.180, 0.785 + breatheDesk, 0.23);
          targetR = new THREE.Vector3(-0.180, 0.785 + breatheDesk + gCadence, 0.23);
        } else if (modelLower.includes("avatarsdk") || nameLower.includes("rohan")) {
          // Rohan Verma: Hands resting on tabletop beside laptop, 18cm from center
          const gCadence = speaking ? Math.sin(gestureT * 1.8) * 0.004 : 0;
          targetL = new THREE.Vector3(0.180, 0.788 + breatheDesk, 0.23);
          targetR = new THREE.Vector3(-0.180, 0.788 + breatheDesk + gCadence, 0.23);
        } else {
          // Priya Sharma (Best - Default): Hands resting on tabletop beside laptop, 18cm from center
          const gCadence = speaking ? Math.sin(gestureT * 1.5) * 0.005 : 0;
          targetL = new THREE.Vector3(0.180, 0.785 + breatheDesk, 0.23);
          targetR = new THREE.Vector3(-0.180, 0.785 + breatheDesk + gCadence, 0.23);
        }

        // Apply Two-Bone IK ensuring forward-angled upper arms (25-35°), elbows 5-15cm in front of torso,
        // ~90° elbow bend, forearms ~85° forward, and hands 18cm on either side of laptop on tabletop:
        if (lArm && lForeArm && lHand) {
          solveTwoBoneIK(lArm, lForeArm, lHand, targetL, poleL);
          lHand.rotation.set(wristRotL[0], wristRotL[1], wristRotL[2]);
          curlFingers(bones, "Left", fingerCurl, fingerCurl * 0.7);
        }

        if (rArm && rForeArm && rHand) {
          solveTwoBoneIK(rArm, rForeArm, rHand, targetR, poleR);
          rHand.rotation.set(wristRotR[0], wristRotR[1], wristRotR[2]);
          curlFingers(bones, "Right", fingerCurl, fingerCurl * 0.7);
        }

        // Facial Blendshapes & Visemes across meshes
        setMorph("eyeBlinkLeft", blinkVal);
        setMorph("eyeBlinkRight", blinkVal);
        setMorph("eyesClosed", blinkVal);

        setMorph("eyeLookDownLeft", gazeDir.y < 0 ? -gazeDir.y * 0.5 : 0);
        setMorph("eyeLookDownRight", gazeDir.y < 0 ? -gazeDir.y * 0.5 : 0);
        setMorph("eyeLookUpLeft", gazeDir.y > 0 ? gazeDir.y * 0.5 : 0);
        setMorph("eyeLookUpRight", gazeDir.y > 0 ? gazeDir.y * 0.5 : 0);
        setMorph("eyeLookOutLeft", gazeDir.x < 0 ? -gazeDir.x * 0.4 : 0);
        setMorph("eyeLookInRight", gazeDir.x < 0 ? -gazeDir.x * 0.4 : 0);
        setMorph("eyeLookInLeft", gazeDir.x > 0 ? gazeDir.x * 0.4 : 0);
        setMorph("eyeLookOutRight", gazeDir.x > 0 ? gazeDir.x * 0.4 : 0);

        setMorph("mouthSmile", eHappy);
        setMorph("mouthSmileLeft", eHappy * 0.9);
        setMorph("mouthSmileRight", eHappy * 0.9);
        setMorph("browInnerUp", eSurprised);
        setMorph("browDownLeft", eRelaxed * 0.4);
        setMorph("browDownRight", eRelaxed * 0.4);

        // Audio Visemes & Controlled Jaw Sync
        setMorph("viseme_aa", visAa);
        setMorph("viseme_E", visE);
        setMorph("viseme_I", visI);
        setMorph("viseme_O", visO);
        setMorph("viseme_U", visU);
        setMorph("jawOpen", jaw);
        setMorph("mouthOpen", jaw * 0.7);
      }

      // ── 6. Fallback: Apply to VRM if legacy VRM model is loaded ───────────
      const vrm = vrmRef.current;
      if (vrm && vrm.humanoid) {
        vrm.update(dt);
        const B = (n: string) => vrm.humanoid!.getNormalizedBoneNode(n as VRMHumanBoneName);

        const lUL = B("leftUpperLeg");
        if (lUL) lUL.rotation.x = -Math.PI / 2.05;
        const rUL = B("rightUpperLeg");
        if (rUL) rUL.rotation.x = -Math.PI / 2.05;
        const lLL = B("leftLowerLeg");
        if (lLL) lLL.rotation.x = Math.PI / 2.15;
        const rLL = B("rightLowerLeg");
        if (rLL) rLL.rotation.x = Math.PI / 2.15;

        const sp = B("spine");
        if (sp) sp.rotation.x = -0.058 + Math.sin(t * 1.7) * 0.003;

        // Relaxed shoulders
        const lSh = B("leftShoulder");
        if (lSh) lSh.rotation.z = -0.04;
        const rSh = B("rightShoulder");
        if (rSh) rSh.rotation.z = 0.04;

        // Upper arms close to torso, elbows bent near tabletop, forearms on table
        const lUA = B("leftUpperArm");
        if (lUA) {
          lUA.rotation.z = Math.PI / 6.2;
          lUA.rotation.x = 0.32;
        }
        const lLA = B("leftLowerArm");
        if (lLA) {
          lLA.rotation.x = -Math.PI / 2.3;
          lLA.rotation.z = 0.22;
        }
        const lH = B("leftHand");
        if (lH) {
          lH.rotation.x = 0.16;
          lH.rotation.z = -0.08;
        }

        const rUA = B("rightUpperArm");
        if (rUA) {
          rUA.rotation.z = -Math.PI / 6.2;
          rUA.rotation.x = 0.32 + (speaking ? Math.sin(gestureT * 1.6) * 0.04 : 0);
        }
        const rLA = B("rightLowerArm");
        if (rLA) {
          rLA.rotation.x = -Math.PI / 2.3 + (speaking ? Math.sin(gestureT * 1.3) * 0.03 : 0);
          rLA.rotation.z = -0.22;
        }
        const rH = B("rightHand");
        if (rH) {
          rH.rotation.x = 0.16;
          rH.rotation.z = 0.08;
        }

        const head = B("head");
        if (head) {
          const nodAmt = listening
            ? Math.sin(t * 0.9) * 0.028
            : speaking
            ? Math.sin(t * 2.6) * 0.035
            : 0;
          head.rotation.set(
            (listening ? -0.03 : thinking ? 0.05 : -0.02) + gazeDir.y * -0.14 + nodAmt,
            gazeDir.x * -0.24,
            0
          );
        }

        if (vrm.expressionManager) {
          vrm.expressionManager.setValue("blink", blinkVal);
          try {
            vrm.expressionManager.setValue("happy", eHappy);
            vrm.expressionManager.setValue("surprised", eSurprised);
            vrm.expressionManager.setValue("relaxed", eRelaxed);
            vrm.expressionManager.setValue("aa", visAa);
            vrm.expressionManager.setValue("ih", visE);
            vrm.expressionManager.setValue("ou", visU);
            vrm.expressionManager.setValue("oh", visO);
            vrm.expressionManager.setValue("ee", visI);
          } catch {}
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      scene.clear();
      vrmRef.current = null;
      glbRootRef.current = null;
      bonesRef.current = {};
      morphMeshesRef.current = [];
    };
  }, [vrmUrl, onLoaded, onError]);

  const up = state.toUpperCase();
  const speaking = up === "SPEAKING" || isSpeaking;
  const listening = up === "LISTENING";
  const thinking = up === "THINKING" || up === "PROCESSING";

  return (
    <div
      className={`relative w-full h-full min-h-[420px] bg-[#1a1208] rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80 ${className}`}
    >
      <div ref={containerRef} className="w-full h-full absolute inset-0" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#0e0c08]/85 backdrop-blur-md flex flex-col items-center justify-center text-white z-20">
          <div className="relative flex items-center justify-center mb-5">
            <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-400 rounded-full animate-spin" />
            <Sparkles className="w-7 h-7 text-amber-300 absolute animate-pulse" />
          </div>
          <p className="font-bold text-lg text-slate-100">Preparing Executive Interview Room</p>
          <p className="text-xs text-slate-400 mt-1">{interviewerName} • Corporate Studio</p>
          {progress > 0 && (
            <>
              <div className="w-52 bg-slate-800 h-1.5 rounded-full mt-5 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">{progress}% loaded</p>
            </>
          )}
        </div>
      )}

      {/* Load Error Fallback Overlay */}
      {loadError && (
        <div className="absolute inset-0 bg-slate-900/92 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
          <h4 className="text-lg font-bold text-white mb-1">3D Interviewer Notice</h4>
          <p className="text-sm text-slate-300 mb-5 max-w-sm">{loadError}</p>
          {onSwitchMode && (
            <button
              onClick={onSwitchMode}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Video className="w-4 h-4" /> Switch to HD Video Interviewer
            </button>
          )}
        </div>
      )}

      {/* Top Header Badge & Mode Switcher */}
      <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between z-10 pointer-events-auto">
        <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold text-white/90 uppercase tracking-wider">
            AI Interviewer
          </span>
        </div>
        {onSwitchMode && (
          <button
            onClick={onSwitchMode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/70 hover:bg-black/80 text-slate-200 text-xs font-medium rounded-xl border border-white/10 shadow-lg backdrop-blur-md transition-all cursor-pointer"
            title="Switch to HD Video"
          >
            <Video className="w-3.5 h-3.5 text-indigo-400" />
            <span>HD Video Mode</span>
          </button>
        )}
      </div>

      {/* Bottom Interviewer Profile & Synchronized State Indicator */}
      <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between z-10 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shadow-lg max-w-xs pointer-events-auto">
          <h3 className="font-bold text-white text-sm leading-tight">{interviewerName}</h3>
          <p className="text-[11px] text-slate-300 mt-0.5">{interviewerRole}</p>
        </div>
        <div className="pointer-events-auto">
          {speaking && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold shadow-lg">
              <div className="flex gap-0.5 items-end h-3">
                <span
                  className="w-1 bg-emerald-400 rounded-full animate-bounce"
                  style={{ height: "40%", animationDelay: "0ms" }}
                />
                <span
                  className="w-1 bg-emerald-400 rounded-full animate-bounce"
                  style={{ height: "100%", animationDelay: "150ms" }}
                />
                <span
                  className="w-1 bg-emerald-400 rounded-full animate-bounce"
                  style={{ height: "60%", animationDelay: "300ms" }}
                />
              </div>
              <span>Speaking</span>
            </div>
          )}
          {listening && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 backdrop-blur-md border border-indigo-500/40 rounded-xl text-indigo-300 text-xs font-bold shadow-lg">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span>Listening</span>
            </div>
          )}
          {thinking && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 backdrop-blur-md border border-amber-500/40 rounded-xl text-amber-300 text-xs font-bold shadow-lg">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Evaluating</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThreeVRMAvatarCanvas;
