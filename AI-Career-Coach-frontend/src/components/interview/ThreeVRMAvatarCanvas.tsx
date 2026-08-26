import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { VRMLoaderPlugin, VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import { RefreshCw, Video, Sparkles, AlertCircle } from "lucide-react";

// Initialize RectAreaLight shader support
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
const GAZE_LAPTOP = new THREE.Vector3(0.06, -0.30, 0.65);
const GAZE_SIDE_L = new THREE.Vector3(-0.18, -0.02, 0.85);
const GAZE_SIDE_R = new THREE.Vector3(0.16, -0.02, 0.85);

interface ExprTarget {
  happy?: number;
  surprised?: number;
  relaxed?: number;
}

function exprForState(state: string): ExprTarget {
  const s = state.toUpperCase();
  if (s === "SPEAKING") return { happy: 0.22, relaxed: 0.08 };
  if (s === "LISTENING") return { surprised: 0.10, happy: 0.06 };
  if (s === "THINKING" || s === "PROCESSING") return { relaxed: 0.28 };
  if (s === "COMPLETED") return { happy: 0.55, relaxed: 0.15 };
  if (s === "CONNECTED" || s === "CONNECTING") return { happy: 0.18, relaxed: 0.08 };
  return { relaxed: 0.05 };
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

// ── 1. Corporate Office Room Environment ─────────────────────────────────────
function buildRoom(scene: THREE.Scene, woodTex: THREE.Texture | null) {
  const wallMat = (c: number) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.88, metalness: 0.01 });

  // Hardwood floor
  const floorMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0xc4a478,
    roughness: 0.55,
    metalness: 0.02,
  });
  if (woodTex) {
    woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
    woodTex.repeat.set(4, 4);
    woodTex.colorSpace = THREE.SRGBColorSpace;
  }
  addMesh(scene, new THREE.PlaneGeometry(6, 6), floorMat, [0, 0, 0], [-Math.PI / 2, 0, 0], true, false);

  // Modern painted plaster walls
  addMesh(scene, new THREE.PlaneGeometry(6, 4), wallMat(0xede8e0), [0, 2, -2.2], [0, 0, 0], false, true); // Back wall
  addMesh(scene, new THREE.PlaneGeometry(4.5, 4), wallMat(0xe8e2d8), [-3, 2, 0], [0, Math.PI / 2, 0], false, true); // Left wall
  addMesh(scene, new THREE.PlaneGeometry(4.5, 4), wallMat(0xe8e2d8), [3, 2, 0], [0, -Math.PI / 2, 0], false, true); // Right wall
  addMesh(scene, new THREE.PlaneGeometry(6, 6), wallMat(0xf5f2ee), [0, 4, 0], [Math.PI / 2, 0, 0], false, false); // Ceiling

  // Architectural Baseboard / Wainscoting Trim
  const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x42362b, roughness: 0.5 });
  addMesh(scene, new THREE.BoxGeometry(6.0, 0.12, 0.04), baseboardMat, [0, 0.06, -2.18]);
  addMesh(scene, new THREE.BoxGeometry(0.04, 0.12, 4.5), baseboardMat, [-2.98, 0.06, 0]);
  addMesh(scene, new THREE.BoxGeometry(0.04, 0.12, 4.5), baseboardMat, [2.98, 0.06, 0]);

  // Large Office Window with Daylight Glow Panel
  const winGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfff6cf,
    emissive: new THREE.Color(0xffefa8),
    emissiveIntensity: 1.15,
    roughness: 0.15,
    transparent: true,
    opacity: 0.9,
  });
  addMesh(scene, new THREE.PlaneGeometry(1.6, 1.2), winGlowMat, [-1.25, 2.35, -2.18], [0, 0, 0], false, false);

  // Window Architectural Frame
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3d3228, roughness: 0.45 });
  addMesh(scene, new THREE.BoxGeometry(1.7, 0.04, 0.04), frameMat, [-1.25, 2.97, -2.17]);
  addMesh(scene, new THREE.BoxGeometry(1.7, 0.04, 0.04), frameMat, [-1.25, 1.73, -2.17]);
  addMesh(scene, new THREE.BoxGeometry(0.04, 1.28, 0.04), frameMat, [-2.08, 2.35, -2.17]);
  addMesh(scene, new THREE.BoxGeometry(0.04, 1.28, 0.04), frameMat, [-0.42, 2.35, -2.17]);
  addMesh(scene, new THREE.BoxGeometry(0.025, 1.24, 0.03), frameMat, [-1.25, 2.35, -2.17]);

  // Executive Bookshelf on Right Wall
  const shelfWood = new THREE.MeshStandardMaterial({ color: 0x4e3319, roughness: 0.45, metalness: 0.05 });
  addMesh(scene, new THREE.BoxGeometry(0.22, 1.7, 0.75), shelfWood, [2.89, 1.5, -1.0], [0, 0, 0], true, true);
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x6e4723, roughness: 0.5 });
  for (let i = 0; i < 4; i++) {
    addMesh(scene, new THREE.BoxGeometry(0.2, 0.025, 0.71), plankMat, [2.89, 0.75 + i * 0.45, -1.0]);
  }
  const bkColors = [0x8b1a1a, 0x1a4d8b, 0x2d6e2d, 0x7a5500, 0x4b1a6b, 0x8b4513, 0x2c3e50, 0x5d6d7e];
  bkColors.forEach((c, i) => {
    addMesh(
      scene,
      new THREE.BoxGeometry(0.03, 0.28 + (i % 3) * 0.04, 0.55),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 }),
      [2.82, 0.92 + Math.floor(i / 3) * 0.45, -1.0 + (i % 3) * 0.16 - 0.16]
    );
  });

  // Corporate Framed Wall Art
  addMesh(
    scene,
    new THREE.PlaneGeometry(0.75, 0.55),
    new THREE.MeshStandardMaterial({
      color: 0x1e3a5f,
      emissive: new THREE.Color(0x0e1e32),
      emissiveIntensity: 0.25,
      roughness: 0.75,
    }),
    [1.15, 2.45, -2.18]
  );
  addMesh(
    scene,
    new THREE.BoxGeometry(0.81, 0.61, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x82694b, roughness: 0.35, metalness: 0.4 }),
    [1.15, 2.45, -2.19]
  );

  // Indoor Ceramic Potted Office Plant
  addMesh(
    scene,
    new THREE.CylinderGeometry(0.08, 0.06, 0.18, 12),
    new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 }),
    [-0.95, 0.88, -0.45]
  );
  addMesh(
    scene,
    new THREE.SphereGeometry(0.14, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x2d5618, roughness: 0.85 }),
    [-0.95, 1.08, -0.45]
  );
}

// ── 2. Executive Ergonomic High-Back Office Chair (Behind Avatar) ─────────────
function buildOfficeChair(scene: THREE.Scene) {
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x1b1c20, roughness: 0.48, metalness: 0.08 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.2, metalness: 0.85 });

  // Chair backrest (contoured high-back)
  addMesh(scene, new THREE.BoxGeometry(0.54, 0.72, 0.07), leatherMat, [0, 1.18, -0.22], [-0.08, 0, 0], true, true);
  // Headrest
  addMesh(scene, new THREE.BoxGeometry(0.32, 0.16, 0.06), leatherMat, [0, 1.58, -0.25], [-0.05, 0, 0], true);
  // Rear chrome support spine
  addMesh(scene, new THREE.BoxGeometry(0.05, 0.68, 0.03), chromeMat, [0, 1.15, -0.27], [-0.08, 0, 0]);

  // Seat cushion
  addMesh(scene, new THREE.BoxGeometry(0.56, 0.09, 0.52), leatherMat, [0, 0.62, -0.06], [0, 0, 0], true, true);

  // Ergonomic armrests
  addMesh(scene, new THREE.BoxGeometry(0.06, 0.035, 0.32), leatherMat, [-0.31, 0.82, -0.04]);
  addMesh(scene, new THREE.BoxGeometry(0.06, 0.035, 0.32), leatherMat, [0.31, 0.82, -0.04]);
  // Armrest chrome posts
  addMesh(scene, new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8), chromeMat, [-0.31, 0.71, -0.04]);
  addMesh(scene, new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8), chromeMat, [0.31, 0.71, -0.04]);

  // Center column & 5-star base
  addMesh(scene, new THREE.CylinderGeometry(0.03, 0.03, 0.45, 10), chromeMat, [0, 0.32, -0.06]);
  addMesh(scene, new THREE.CylinderGeometry(0.32, 0.34, 0.04, 5), chromeMat, [0, 0.08, -0.06]);
}

// ── 3. Executive Office Desk with Dark Walnut Finish ─────────────────────────
function buildDesk(scene: THREE.Scene, woodTex: THREE.Texture | null): { deskTopY: number } {
  const deskMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0x9b704c,
    roughness: 0.38,
    metalness: 0.04,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x22180f, roughness: 0.55, metalness: 0.05 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xa89f92, roughness: 0.25, metalness: 0.75 });
  const deskTopY = 0.76;

  // Main Desktop surface
  addMesh(scene, new THREE.BoxGeometry(1.88, 0.045, 0.86), deskMat, [0, deskTopY - 0.0225, 0.42], [0, 0, 0], true, true);

  // Front Fascia Apron
  addMesh(scene, new THREE.BoxGeometry(1.86, 0.18, 0.04), darkMat, [0, 0.61, 0.83], [0, 0, 0], true, false);

  // Side Panels / Aprons
  addMesh(scene, new THREE.BoxGeometry(0.04, 0.18, 0.76), darkMat, [-0.92, 0.61, 0.45]);
  addMesh(scene, new THREE.BoxGeometry(0.04, 0.18, 0.76), darkMat, [0.92, 0.61, 0.45]);

  // Desk Modesty Body Panel
  addMesh(scene, new THREE.BoxGeometry(1.84, 0.56, 0.76), darkMat, [0, 0.36, 0.44], [0, 0, 0], false, true);

  // Four Sturdy Column Legs
  const legGeo = new THREE.BoxGeometry(0.07, 0.72, 0.07);
  [
    [-0.88, 0.36, 0.08],
    [0.88, 0.36, 0.08],
    [-0.88, 0.36, 0.80],
    [0.88, 0.36, 0.80],
  ].forEach(([x, y, z]) => addMesh(scene, legGeo, darkMat, [x, y, z], [0, 0, 0], true, false));

  // Brushed Metal Front Trim
  addMesh(scene, new THREE.BoxGeometry(1.90, 0.024, 0.03), trimMat, [0, deskTopY + 0.008, 0.835]);

  // Executive Black Leather Desk Pad / Blotter
  const blotterMat = new THREE.MeshStandardMaterial({ color: 0x161618, roughness: 0.6, metalness: 0.05 });
  addMesh(scene, new THREE.BoxGeometry(0.92, 0.005, 0.50), blotterMat, [0, deskTopY + 0.0025, 0.34], [0, 0, 0], false, true);

  return { deskTopY };
}

// ── 4. Realistically Scaled 14" Business Laptop ──────────────────────────────
function buildLaptop(scene: THREE.Scene, deskTopY: number) {
  const alumMat = new THREE.MeshStandardMaterial({ color: 0x2e3034, roughness: 0.28, metalness: 0.85 });
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x08152e,
    emissive: new THREE.Color(0x1d4ed8),
    emissiveIntensity: 0.22,
    roughness: 0.12,
    metalness: 0.05,
  });
  const keyboardMat = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.55, metalness: 0.4 });

  const laptopBaseY = deskTopY + 0.008;
  const lx = 0.06;
  const lz = 0.24;

  // Laptop Base Deck (14" laptop scale: 34cm x 23cm x 1.2cm)
  addMesh(scene, new THREE.BoxGeometry(0.34, 0.012, 0.23), alumMat, [lx, laptopBaseY + 0.006, lz], [0, 0, 0], true, true);

  // Keyboard & Trackpad Area
  addMesh(scene, new THREE.BoxGeometry(0.30, 0.002, 0.18), keyboardMat, [lx, laptopBaseY + 0.0125, lz + 0.01]);

  // Screen Lid (Tilted open at ~105°, facing interviewer)
  const screenAngle = -Math.PI / 2 + 0.32;
  const pivotZ = lz - 0.114;
  const pivotY = laptopBaseY + 0.006;
  const lidPos: [number, number, number] = [
    lx,
    pivotY + Math.sin(-screenAngle) * 0.105,
    pivotZ + Math.cos(-screenAngle) * 0.105,
  ];
  addMesh(scene, new THREE.BoxGeometry(0.34, 0.21, 0.010), alumMat, lidPos, [screenAngle, 0, 0], true, false);

  // Active Screen Display Surface
  const dispPos: [number, number, number] = [
    lx,
    lidPos[1] + Math.sin(-screenAngle) * 0.002,
    lidPos[2] + Math.cos(-screenAngle) * 0.002,
  ];
  addMesh(scene, new THREE.BoxGeometry(0.31, 0.18, 0.003), screenMat, dispPos, [screenAngle, 0, 0]);

  // Display Screen Soft Area Glow Light
  const glow = new THREE.RectAreaLight(0x2563eb, 0.45, 0.30, 0.18);
  glow.position.set(dispPos[0], dispPos[1] + 0.02, dispPos[2]);
  glow.rotation.set(screenAngle, 0, 0);
  scene.add(glow);
}

// ── 5. Executive Desk Accessories ────────────────────────────────────────────
function buildAccessories(scene: THREE.Scene, deskTopY: number) {
  // Ceramic Coffee Mug (Right side)
  addMesh(
    scene,
    new THREE.CylinderGeometry(0.036, 0.030, 0.072, 14),
    new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.65 }),
    [-0.58, deskTopY + 0.036, 0.28],
    [0, 0, 0],
    true
  );
  // Coffee surface
  addMesh(
    scene,
    new THREE.CylinderGeometry(0.034, 0.034, 0.004, 14),
    new THREE.MeshStandardMaterial({ color: 0x321a0a, roughness: 0.9 }),
    [-0.58, deskTopY + 0.070, 0.28]
  );

  // Executive Leather Notebook (Left side)
  addMesh(
    scene,
    new THREE.BoxGeometry(0.18, 0.012, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x2b1c11, roughness: 0.65 }),
    [-0.34, deskTopY + 0.006, 0.32],
    [0, 0.08, 0],
    false,
    true
  );

  // Metallic Ballpoint Pen
  const pen = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.16, 8),
    new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.25, metalness: 0.85 })
  );
  pen.rotation.z = Math.PI / 2;
  pen.rotation.y = 0.12;
  pen.position.set(-0.34, deskTopY + 0.016, 0.24);
  scene.add(pen);

  // Ceramic Pen Holder
  addMesh(
    scene,
    new THREE.CylinderGeometry(0.028, 0.025, 0.078, 12),
    new THREE.MeshStandardMaterial({ color: 0x3e2e20, roughness: 0.55 }),
    [-0.72, deskTopY + 0.039, 0.20]
  );
}

// ── 6. Main Three.js Realistic WebGL Canvas Component ────────────────────────
export const ThreeVRMAvatarCanvas: React.FC<ThreeVRMAvatarCanvasProps> = ({
  vrmUrl = "/avatars/avaturn.glb",
  interviewerName = "Male Interviewer 01 (Arjun Mehta)",
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

    // Candidate Eye-Level Camera View (Waist-Up framing, Desk & Hands in lower portion)
    const camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 30);
    camera.position.set(0, 1.28, 1.76);
    camera.lookAt(0, 1.18, 0);

    // 5-Point Realistic Executive Lighting Rig
    scene.add(new THREE.AmbientLight(0xfff8f0, 0.72));

    // Warm Key Light (Window direction, soft shadows)
    const key = new THREE.DirectionalLight(0xfff4e0, 1.45);
    key.position.set(1.8, 3.2, 2.0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 12;
    key.shadow.camera.left = -2;
    key.shadow.camera.right = 2;
    key.shadow.camera.top = 2;
    key.shadow.camera.bottom = -2;
    key.shadow.bias = -0.0005;
    scene.add(key);

    // Cool Soft Fill Light (From left)
    const fill = new THREE.DirectionalLight(0xe8f2ff, 0.52);
    fill.position.set(-2.2, 2.0, 1.5);
    scene.add(fill);

    // Rim/Hair Separation Light
    const rim = new THREE.DirectionalLight(0xffffff, 0.38);
    rim.position.set(0, 2.8, -2.5);
    scene.add(rim);

    // Window Soft Light
    const winLight = new THREE.RectAreaLight(0xfff5c8, 2.2, 1.6, 1.2);
    winLight.position.set(-1.25, 2.35, -2.0);
    winLight.lookAt(0, 1.5, 0);
    scene.add(winLight);

    // Subtle Desk Bounce Light
    const bounce = new THREE.PointLight(0xffeedd, 0.22, 2.5);
    bounce.position.set(0, 0.85, 0.6);
    scene.add(bounce);

    // Build Executive Office Room Architecture & Furniture
    const tl = new THREE.TextureLoader();
    tl.load(
      "/avatars/wood_texture.jpg",
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        buildRoom(scene, tex);
        buildOfficeChair(scene);
        const { deskTopY } = buildDesk(scene, tex);
        buildLaptop(scene, deskTopY);
        buildAccessories(scene, deskTopY);
      },
      undefined,
      () => {
        buildRoom(scene, null);
        buildOfficeChair(scene);
        const { deskTopY } = buildDesk(scene, null);
        buildLaptop(scene, deskTopY);
        buildAccessories(scene, deskTopY);
      }
    );

    // Determine if file is GLB/GLTF or VRM
    const isVRM = vrmUrl.toLowerCase().endsWith(".vrm");
    isGLBRef.current = !isVRM;

    const loader = new GLTFLoader();
    if (isVRM) {
      loader.register((p) => new VRMLoaderPlugin(p));
    }

    loader.load(
      vrmUrl,
      (gltf) => {
        bonesRef.current = {};
        morphMeshesRef.current = [];

        if (isVRM && gltf.userData.vrm) {
          const vrm: VRM = gltf.userData.vrm;
          vrmRef.current = vrm;
          scene.add(vrm.scene);
          vrm.scene.rotation.y = Math.PI;
          vrm.scene.position.set(0, 0, 0);

          vrm.scene.traverse((o) => {
            if ((o as THREE.Mesh).isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });
        } else {
          // Photorealistic GLB model (avaturn.glb / Male Interviewer 01)
          const root = gltf.scene;
          glbRootRef.current = root;
          scene.add(root);

          // Position seated in executive chair
          root.position.set(0, -0.36, -0.06);
          root.rotation.set(0, 0, 0);

          // Cache bones & morph target meshes
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
                if (name.includes("eye") || name.includes("cornea")) {
                  mat.roughness = 0.05;
                  mat.metalness = 0.1;
                } else if (name.includes("head") || name.includes("body") || name.includes("skin")) {
                  mat.roughness = 0.58;
                  mat.metalness = 0.0;
                } else if (name.includes("hair")) {
                  mat.roughness = 0.62;
                } else {
                  // Suit / Look / Clothing
                  mat.roughness = 0.82;
                  mat.metalness = 0.02;
                }
              }
            }

            if (o.type === "Bone" || (o as THREE.Bone).isBone) {
              if (o.name) {
                bonesRef.current[o.name] = o;
              }
            }
          });
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

    // Helper: Set morph target influence across all meshes
    const setMorph = (name: string, val: number) => {
      for (let i = 0; i < morphMeshesRef.current.length; i++) {
        const m = morphMeshesRef.current[i];
        if (m.morphTargetDictionary && m.morphTargetInfluences) {
          const idx = m.morphTargetDictionary[name];
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
        ? 5.0 + Math.random() * 3.0
        : 3.5 + Math.random() * 2.8;

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
      const vol = volRef.current || (speaking ? 0.65 : 0);
      const tf = t * 14.0;
      const isVoiceActive = speaking || vol > 0.04;

      const visAa = isVoiceActive ? Math.min(1.0, vol * (0.65 + 0.38 * Math.sin(tf))) : 0;
      const visE = isVoiceActive ? Math.min(1.0, vol * (0.42 + 0.28 * Math.cos(tf * 1.05))) : 0;
      const visI = isVoiceActive ? Math.min(1.0, vol * (0.35 + 0.25 * Math.sin(tf * 1.1))) : 0;
      const visO = isVoiceActive ? Math.min(1.0, vol * (0.30 + 0.25 * Math.cos(tf * 0.9))) : 0;
      const visU = isVoiceActive ? Math.min(1.0, vol * (0.25 + 0.20 * Math.sin(tf * 0.85))) : 0;
      const jaw = isVoiceActive ? Math.min(1.0, vol * (0.55 + 0.30 * Math.sin(tf))) : 0;

      // ── 5. Apply to Photorealistic GLB Model (Male Interviewer 01) ────────
      const bones = bonesRef.current;
      if (bones && bones.Hips) {
        // Continuous Seated Posture
        if (bones.LeftUpLeg) bones.LeftUpLeg.rotation.set(-Math.PI / 2.05, 0.08, 0);
        if (bones.RightUpLeg) bones.RightUpLeg.rotation.set(-Math.PI / 2.05, -0.08, 0);
        if (bones.LeftLeg) bones.LeftLeg.rotation.set(Math.PI / 2.15, 0, 0);
        if (bones.RightLeg) bones.RightLeg.rotation.set(Math.PI / 2.15, 0, 0);

        // Spine Breathing & Engagement
        if (bones.Spine) bones.Spine.rotation.set(-0.04 + Math.sin(t * 1.7) * 0.005, 0, 0);
        if (bones.Spine1) bones.Spine1.rotation.set(-0.02, 0, 0);
        if (bones.Spine2) bones.Spine2.rotation.set(-0.02, 0, 0);

        // Head Tracking & Attentive Nodding
        const nodAmt = listening
          ? Math.sin(t * 0.9) * 0.028
          : speaking
          ? Math.sin(t * 2.6) * 0.040
          : 0;
        if (bones.Head) {
          bones.Head.rotation.set(
            (listening ? -0.04 : thinking ? 0.05 : -0.02) + gazeDir.y * -0.14 + nodAmt,
            gazeDir.x * -0.26,
            0
          );
        }

        // Left Arm: Natural Rest ON DESK PAD
        if (bones.LeftArm) bones.LeftArm.rotation.set(0.35, 0.12, -1.18);
        if (bones.LeftForeArm) bones.LeftForeArm.rotation.set(0.72, 0.28, -0.42);
        if (bones.LeftHand) bones.LeftHand.rotation.set(0.18, 0.05, -0.10);

        // Right Arm: Rest on desk with subtle conversational gesture when speaking
        if (speaking) gestureT += dt;
        else gestureT = 0;

        const gestureZ = speaking ? 1.18 - Math.sin(gestureT * 1.5) * 0.06 : 1.18;
        const gestureX = speaking ? 0.35 + Math.sin(gestureT * 1.8) * 0.05 : 0.35;
        const gestureForeX = speaking ? 0.72 + Math.sin(gestureT * 1.4) * 0.04 : 0.72;

        if (bones.RightArm) bones.RightArm.rotation.set(gestureX, -0.12, gestureZ);
        if (bones.RightForeArm) bones.RightForeArm.rotation.set(gestureForeX, -0.28, 0.42);
        if (bones.RightHand) bones.RightHand.rotation.set(0.18, -0.05, 0.10);

        // Morph Targets for Photorealistic GLB Avatar
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

        // Audio Visemes
        setMorph("viseme_aa", visAa);
        setMorph("viseme_E", visE);
        setMorph("viseme_I", visI);
        setMorph("viseme_O", visO);
        setMorph("viseme_U", visU);
        setMorph("jawOpen", jaw * 0.5);
        setMorph("mouthOpen", jaw * 0.4);
      }

      // ── 6. Fallback: Apply to VRM if VRM model is loaded ─────────────────
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
        if (sp) sp.rotation.x = -0.05 + Math.sin(t * 1.7) * 0.005;

        const lUA = B("leftUpperArm");
        if (lUA) {
          lUA.rotation.z = Math.PI / 6.2;
          lUA.rotation.x = 0.22;
        }
        const lLA = B("leftLowerArm");
        if (lLA) {
          lLA.rotation.x = -Math.PI / 3.0;
          lLA.rotation.z = 0.18;
        }
        const lH = B("leftHand");
        if (lH) {
          lH.rotation.x = 0.14;
          lH.rotation.z = -0.08;
        }

        const rUA = B("rightUpperArm");
        if (rUA) {
          rUA.rotation.z = -Math.PI / 6.2 + (speaking ? Math.sin(gestureT * 1.6) * 0.05 : 0);
          rUA.rotation.x = 0.20;
        }
        const rLA = B("rightLowerArm");
        if (rLA) {
          rLA.rotation.x = -Math.PI / 3.2 + (speaking ? Math.sin(gestureT * 1.3) * 0.035 : 0);
          rLA.rotation.z = -0.16;
        }
        const rH = B("rightHand");
        if (rH) {
          rH.rotation.x = 0.12;
          rH.rotation.z = 0.06;
        }

        const head = B("head");
        if (head) {
          const nodAmt = listening
            ? Math.sin(t * 0.9) * 0.028
            : speaking
            ? Math.sin(t * 2.6) * 0.040
            : 0;
          head.rotation.set(
            (listening ? -0.04 : thinking ? 0.05 : -0.02) + gazeDir.y * -0.14 + nodAmt,
            gazeDir.x * -0.26,
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg transition-all"
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/70 hover:bg-black/80 text-slate-200 text-xs font-medium rounded-xl border border-white/10 shadow-lg backdrop-blur-md transition-all"
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
