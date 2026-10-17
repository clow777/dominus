"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { STOP, damp, squareToPoint, type Square } from "@/lib/motion/pawn-path";
import { BODY_PROFILE, headArc } from "@/lib/motion/pawn-profile";
import type { Journey } from "./use-journey";

const INK = "#080808";
const DOMINUS_RED = new THREE.Color("#b51224");
const BOARD_TOP = 0.06;
const FINAL_SQUARE: Square = "d8";
const NODE_SQUARES: Square[] = ["b6", "c8", "f8", "g6"];

export type StageMode = "journey" | "hero";

interface PawnSceneProps {
  journey: Journey;
  mode: StageMode;
  /** false quando o palco está fora da tela: nenhum quadro é renderizado. */
  active?: boolean;
  onReady?: () => void;
  onFailure?: () => void;
}

const START = squareToPoint("e2");
/** No modo hero (mobile) o peão fica em e2; a jornada é contada pela trilha do cabeçalho. */
const HERO_SAMPLE = { x: START.x, z: START.z, lift: 0, presence: [1, 0, 0, 0, 0, 0] };

export default function PawnScene({ journey, mode, active = true, onReady, onFailure }: PawnSceneProps) {
  return (
    <Canvas
      frameloop={active ? "demand" : "never"}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: mode === "journey" ? 26 : 30, near: 0.1, far: 60, position: [3, 4, 9] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onFailure?.();
        });
        onReady?.();
      }}
    >
      <Scene journey={journey} mode={mode} />
    </Canvas>
  );
}

/* ───────────────────────── Ambiente de estúdio ───────────────────────── */

/**
 * Ambiente de reflexo montado localmente: painéis de luz (softboxes) e uma
 * faixa vermelha estreita atrás do peão. Gera o "cromado" sem baixar HDR.
 */
function StudioEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useLayoutEffect(() => {
    const env = new THREE.Scene();
    env.background = new THREE.Color("#050505");
    const plane = new THREE.PlaneGeometry(1, 1);
    const panels: THREE.Mesh[] = [];

    const panel = (color: THREE.ColorRepresentation, intensity: number, pos: [number, number, number], size: [number, number]) => {
      const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      mat.color.multiplyScalar(intensity);
      const mesh = new THREE.Mesh(plane, mat);
      mesh.position.set(...pos);
      mesh.scale.set(size[0], size[1], 1);
      mesh.lookAt(0, 0.5, 0);
      env.add(mesh);
      panels.push(mesh);
    };

    panel("#ffffff", 5, [0, 6, 1], [6, 3]); // softbox superior
    panel("#ffffff", 9, [-5, 2, 2], [0.7, 6]); // faixa de recorte à esquerda
    panel("#ffffff", 2.2, [4.5, 1.5, 4], [3, 4]); // preenchimento frontal direito
    panel("#ffffff", 1.2, [0, -1, -6], [10, 2]); // reflexo do horizonte
    panel(DOMINUS_RED, 6, [-3.5, 1.2, -4.5], [0.35, 4]); // faixa vermelha Dominus

    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(env, 0.035).texture;
    scene.environment = texture;
    scene.fog = new THREE.Fog(INK, 10, 21);

    return () => {
      scene.environment = null;
      scene.fog = null;
      texture.dispose();
      pmrem.dispose();
      plane.dispose();
      panels.forEach((m) => (m.material as THREE.Material).dispose());
    };
  }, [gl, scene]);

  return null;
}

/* ───────────────────────── Peão ───────────────────────── */

function usePawnGeometry() {
  return useMemo(() => {
    const spline = new THREE.SplineCurve(BODY_PROFILE.map(([r, h]) => new THREE.Vector2(r, h)));
    const body = spline.getSpacedPoints(180);
    const head = headArc(48).map(([r, h]) => new THREE.Vector2(r, h));
    const geometry = new THREE.LatheGeometry([...body, ...head.slice(1)], 160);
    geometry.computeVertexNormals();
    return geometry;
  }, []);
}

/* ───────────────────────── Tabuleiro ───────────────────────── */

function Board({ finalSquareRef }: { finalSquareRef: React.RefObject<THREE.MeshPhysicalMaterial | null> }) {
  const { light, dark, final } = useMemo(() => {
    const light: [number, number][] = [];
    const dark: [number, number][] = [];
    let final: [number, number] = [0, 0];
    const f = squareToPoint(FINAL_SQUARE);
    for (let file = 0; file < 8; file++) {
      for (let rank = 0; rank < 8; rank++) {
        const x = file - 3.5;
        const z = 3.5 - rank;
        if (x === f.x && z === f.z) {
          final = [x, z];
          continue;
        }
        // a1 é escura: soma par = escura.
        ((file + rank) % 2 === 0 ? dark : light).push([x, z]);
      }
    }
    return { light, dark, final };
  }, []);

  return (
    <group>
      <SquareSet squares={light} color="#d6d6d6" roughness={0.42} metalness={0} />
      <SquareSet squares={dark} color="#0c0c0c" roughness={0.22} metalness={0.35} />
      <mesh position={[final[0], 0, final[1]]}>
        <boxGeometry args={[0.995, BOARD_TOP * 2, 0.995]} />
        <meshPhysicalMaterial
          ref={finalSquareRef}
          color="#0c0c0c"
          roughness={0.22}
          metalness={0.35}
          emissive={DOMINUS_RED}
          emissiveIntensity={0}
        />
      </mesh>
      {/* Moldura */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[8.5, 0.12, 8.5]} />
        <meshPhysicalMaterial color="#070707" roughness={0.18} metalness={0.8} />
      </mesh>
    </group>
  );
}

function SquareSet({
  squares,
  color,
  roughness,
  metalness,
}: {
  squares: [number, number][];
  color: string;
  roughness: number;
  metalness: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    squares.forEach(([x, z], i) => mesh.setMatrixAt(i, m.makeTranslation(x, 0, z)));
    mesh.instanceMatrix.needsUpdate = true;
  }, [squares]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, squares.length]}>
      <boxGeometry args={[0.995, BOARD_TOP * 2, 0.995]} />
      <meshPhysicalMaterial color={color} roughness={roughness} metalness={metalness} clearcoat={0.6} clearcoatRoughness={0.2} />
    </instancedMesh>
  );
}

/** Sombra de contato barata: gradiente radial num plano sob a peça. */
function useShadowTexture() {
  return useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(0,0,0,0.85)");
    g.addColorStop(0.5, "rgba(0,0,0,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/* ───────────────────────── Efeitos por seção ───────────────────────── */

function useIntegrationLines() {
  return useMemo(() => {
    const from = squareToPoint("d7");
    const positions: number[] = [];
    for (const sq of NODE_SQUARES) {
      const p = squareToPoint(sq);
      positions.push(from.x, BOARD_TOP + 0.02, from.z, p.x, BOARD_TOP + 0.02, p.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, []);
}

/* ───────────────────────── Cena ───────────────────────── */

function Scene({ journey, mode }: { journey: Journey; mode: StageMode }) {
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);

  const pawnGeometry = usePawnGeometry();
  const shadowTexture = useShadowTexture();
  const lineGeometry = useIntegrationLines();

  const pawn = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const shadowMat = useRef<THREE.MeshBasicMaterial>(null);
  const key = useRef<THREE.SpotLight>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const linesMat = useRef<THREE.LineBasicMaterial>(null);
  const nodeMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0 }),
    [],
  );
  const finalSquare = useRef<THREE.MeshPhysicalMaterial>(null);

  // Pose amortecida (o que está na tela) — persegue a pose-alvo vinda da rolagem.
  const pose = useRef({ x: 0, z: 0, lift: 0, security: 0, integrations: 0, final: 0, initialized: false });
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const camPos = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (mode === "hero") return;
    return journey.subscribe(() => invalidate());
  }, [journey, invalidate, mode]);
  useEffect(() => {
    invalidate();
  }, [invalidate]);

  useEffect(
    () => () => {
      pawnGeometry.dispose();
      shadowTexture.dispose();
      lineGeometry.dispose();
      nodeMaterial.dispose();
    },
    [pawnGeometry, shadowTexture, lineGeometry, nodeMaterial],
  );

  useFrame((_, rawDelta) => {
    const s = mode === "hero" ? HERO_SAMPLE : journey.sampleRef.current;
    const p = pose.current;
    const target = {
      x: s.x,
      z: s.z,
      lift: s.lift,
      security: s.presence[STOP.security] ?? 0,
      integrations: s.presence[STOP.integrations] ?? 0,
      final: s.presence[STOP.final] ?? 0,
    };

    const dt = Math.min(rawDelta, 1 / 20);
    const instant = journey.reducedMotion || !p.initialized;
    const k = 14; // rigidez do amortecimento
    for (const prop of ["x", "z", "lift", "security", "integrations", "final"] as const) {
      p[prop] = instant ? target[prop] : damp(p[prop], target[prop], k, dt);
    }
    p.initialized = true;

    // Peão
    pawn.current?.position.set(p.x, BOARD_TOP + p.lift, p.z);
    shadow.current?.position.set(p.x, BOARD_TOP + 0.002, p.z);
    if (shadow.current) shadow.current.scale.setScalar(1.05 + p.lift * 0.9);
    if (shadowMat.current) shadowMat.current.opacity = 0.75 * (1 - Math.min(p.lift * 1.6, 0.7));

    // Luz-chave segue a peça; na seção de segurança o tabuleiro inteiro acende.
    if (key.current) {
      key.current.position.set(p.x + 1.2, 6.5, p.z + 2.5);
      key.current.target.position.set(p.x, 0, p.z);
      key.current.target.updateMatrixWorld();
      key.current.intensity = 55 + 75 * p.security;
      key.current.angle = 0.42 + 0.3 * p.security;
    }
    if (ring.current && ringMat.current) {
      ring.current.position.set(p.x, BOARD_TOP + 0.01, p.z);
      ring.current.scale.setScalar(0.85 + 0.25 * p.security);
      ringMat.current.opacity = 0.55 * p.security;
    }
    if (linesMat.current) linesMat.current.opacity = 0.45 * p.integrations;
    nodeMaterial.opacity = 0.9 * p.integrations;
    if (finalSquare.current) finalSquare.current.emissiveIntensity = 1.6 * p.final;

    // Câmera
    if (mode === "journey") {
      const close = easeOut(p.final);
      const follow = THREE.MathUtils.clamp(p.z, -3.5, 3.5);
      lookTarget.set(p.x * 0.55, 0.55 - 0.05 * close, follow - 0.6 + 0.6 * close);
      camPos.set(
        THREE.MathUtils.lerp(2.4, 1.15, close) + p.x * 0.35,
        THREE.MathUtils.lerp(4.1, 1.35, close),
        follow + THREE.MathUtils.lerp(7.6, 3.1, close),
      );
    } else {
      lookTarget.set(0.2, 0.55, p.z - 0.8);
      camPos.set(2.2, 2.6, p.z + 5.6);
    }
    camera.position.copy(camPos);
    camera.lookAt(lookTarget);

    // Continua renderizando só enquanto a pose ainda está convergindo.
    const settling =
      Math.abs(p.x - target.x) > 1e-3 ||
      Math.abs(p.z - target.z) > 1e-3 ||
      Math.abs(p.lift - target.lift) > 1e-3 ||
      Math.abs(p.security - target.security) > 1e-3 ||
      Math.abs(p.integrations - target.integrations) > 1e-3 ||
      Math.abs(p.final - target.final) > 1e-3;
    if (settling) invalidate();
  });

  return (
    <>
      <StudioEnvironment />
      <hemisphereLight args={["#bfbfbf", "#050505", 0.35]} />
      <spotLight
        ref={key}
        color="#ffffff"
        intensity={55}
        distance={18}
        angle={0.42}
        penumbra={0.9}
        decay={1.6}
      />
      {/* Contraluz vermelha discreta, só no recorte da peça */}
      <pointLight color={DOMINUS_RED} intensity={6} distance={6} decay={2} position={[-2.2, 1.4, -1.5]} />

      <Board finalSquareRef={finalSquare} />

      <mesh ref={shadow} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.95, 0.95]} />
        <meshBasicMaterial ref={shadowMat} map={shadowTexture} transparent depthWrite={false} />
      </mesh>

      <group ref={pawn}>
        <mesh geometry={pawnGeometry}>
          <meshPhysicalMaterial
            color="#1b1b1b"
            metalness={1}
            roughness={0.13}
            clearcoat={1}
            clearcoatRoughness={0.04}
            envMapIntensity={1.35}
          />
        </mesh>
      </group>

      {/* Segurança: anel de proteção ao redor da casa do peão */}
      <mesh ref={ring} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.6, 0.63, 96]} />
        <meshBasicMaterial ref={ringMat} color="#ffffff" transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Integrações: nós conectados à casa d7 */}
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial ref={linesMat} color="#ffffff" transparent opacity={0} depthWrite={false} />
      </lineSegments>
      {NODE_SQUARES.map((sq) => {
        const p = squareToPoint(sq);
        return (
          <mesh key={sq} position={[p.x, BOARD_TOP + 0.05, p.z]} material={nodeMaterial}>
            <sphereGeometry args={[0.06, 24, 16]} />
          </mesh>
        );
      })}
    </>
  );
}

function easeOut(t: number) {
  return 1 - (1 - t) ** 3;
}
