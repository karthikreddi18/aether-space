import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import { planets, BLACK_HOLE_POSITION, PlanetData } from '../utils/planetData';
import { 
  starVertexShader, starFragmentShader, 
  nebulaVertexShader, nebulaFragmentShader,
  blackHoleVertexShader, blackHoleFragmentShader,
  atmosphereVertexShader, atmosphereFragmentShader 
} from '../utils/shaders';

interface QualitySettings {
  starCount: number;
  asteroidCount: number;
  nebulaLayers: number;
  enablePost: boolean;
}

const QUALITY_PRESETS: Record<'low' | 'medium' | 'high' | 'ultra', QualitySettings> = {
  low:    { starCount: 15000, asteroidCount: 80,  nebulaLayers: 2, enablePost: false },
  medium: { starCount: 35000, asteroidCount: 160, nebulaLayers: 3, enablePost: true },
  high:   { starCount: 65000, asteroidCount: 280, nebulaLayers: 4, enablePost: true },
  ultra:  { starCount: 120000, asteroidCount: 420, nebulaLayers: 5, enablePost: true },
};

function Starfield({ count }: { count: number }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const [positions, colors, sizes, brightness] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const bri = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const radius = 450 + Math.random() * 1200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
      pos[i * 3 + 2] = radius * Math.cos(phi);

      const isWarm = Math.random() > 0.92;
      if (isWarm) {
        col[i * 3] = 1.0; col[i * 3 + 1] = 0.88; col[i * 3 + 2] = 0.6;
      } else {
        col[i * 3] = 0.85 + Math.random() * 0.15;
        col[i * 3 + 1] = 0.9 + Math.random() * 0.1;
        col[i * 3 + 2] = 1.0;
      }
      siz[i] = Math.random() * 1.6 + 0.7;
      bri[i] = Math.random() * 0.8 + 0.2;
    }
    return [pos, col, siz, bri];
  }, [count]);

  const uniforms = useMemo(() => ({
    time: { value: 0 },
    pixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
  }), []);

  useFrame((state) => {
    if (pointsRef.current) uniforms.time.value = state.clock.elapsedTime * 0.4;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={count} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-brightness" count={count} array={brightness} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Nebula({ quality }: { quality: string }) {
  const groupRef = useRef<THREE.Group>(null!);
  const settings = QUALITY_PRESETS[quality as keyof typeof QUALITY_PRESETS];

  const nebulaLayers = useMemo(() => {
    const layers = [];
    const colorSets = [
      { c1: '#3b0764', c2: '#7e22ce', c3: '#c026d3' },
      { c1: '#164e63', c2: '#0e7490', c3: '#22d3ee' },
      { c1: '#4c1d95', c2: '#7c3aed', c3: '#a78bfa' },
    ];
    for (let i = 0; i < settings.nebulaLayers; i++) {
      const colors = colorSets[i % colorSets.length];
      layers.push({
        position: [(i - 1.5) * 85, -20 + i * 18, -120 + i * 55] as [number, number, number],
        rotation: [Math.random() * 0.4 - 0.2, i * 0.7, Math.random() * 0.3],
        scale: [180 + i * 45, 130 + i * 30, 180 + i * 45] as [number, number, number],
        colors,
        density: 0.85 + i * 0.12,
        speed: 0.6 + i * 0.25,
      });
    }
    return layers;
  }, [settings.nebulaLayers]);

  useFrame((state) => {
    if (groupRef.current) groupRef.current.rotation.y = state.clock.elapsedTime * 0.0008;
  });

  return (
    <group ref={groupRef}>
      {nebulaLayers.map((layer, index) => (
        <mesh key={index} position={layer.position} rotation={layer.rotation as any} scale={layer.scale as any}>
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            vertexShader={nebulaVertexShader}
            fragmentShader={nebulaFragmentShader}
            uniforms={{
              time: { value: 0 },
              color1: { value: new THREE.Color(layer.colors.c1) },
              color2: { value: new THREE.Color(layer.colors.c2) },
              color3: { value: new THREE.Color(layer.colors.c3) },
              density: { value: layer.density },
              speed: { value: layer.speed },
            }}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function Planet({ data, timeScale, onClick }: { 
  data: PlanetData; 
  timeScale: number; 
  onClick: (planet: PlanetData) => void;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Group>(null!);
  const angleRef = useRef(Math.random() * Math.PI * 2);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime * timeScale;

    if (data.distance > 0) {
      angleRef.current += data.speed * delta * timeScale * 0.6;
      const x = Math.cos(angleRef.current) * data.distance;
      const z = Math.sin(angleRef.current) * data.distance * 0.92;
      groupRef.current.position.set(x, Math.sin(angleRef.current * 0.7) * 1.5, z);
    }

    if (meshRef.current) {
      meshRef.current.rotation.y += data.rotationSpeed * delta * timeScale * 0.8;
    }
    if (ringRef.current && data.hasRings) {
      ringRef.current.rotation.z = t * 0.15;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (groupRef.current) onClick(data);
  };

  const isSun = data.type === 'star';

  return (
    <group ref={groupRef} onClick={handleClick}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[data.radius, isSun ? 48 : 64, isSun ? 48 : 64]} />
        <meshPhongMaterial
          color={data.color}
          emissive={data.emissive || '#000000'}
          emissiveIntensity={isSun ? 0.9 : 0.02}
          shininess={isSun ? 8 : 12}
        />
      </mesh>

      {data.hasRings && (
        <group ref={ringRef}>
          <mesh rotation={[1.85, 0, 0]}>
            <ringGeometry args={[data.radius * 1.55, data.radius * 2.85, 128]} />
            <meshPhongMaterial color={data.ringColor || '#e8d5a3'} shininess={35} side={THREE.DoubleSide} transparent opacity={0.92} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function AsteroidBelt({ count, timeScale }: { count: number; timeScale: number }) {
  const instancedRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const angles = useMemo(() => Array.from({ length: count }, (_, i) => (i / count) * Math.PI * 2), [count]);

  useFrame((state) => {
    if (!instancedRef.current) return;
    const t = state.clock.elapsedTime * timeScale * 0.4;
    for (let i = 0; i < count; i++) {
      const angle = angles[i] + t * (0.3 + (i % 5) * 0.03);
      const radius = 92 + (i % 7) * 1.8;
      dummy.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle * 1.6 + i) * 3.5,
        Math.sin(angle) * radius * 0.88
      );
      dummy.rotation.set(t * 0.5 + i, t * 0.7 + i, t * 0.3);
      dummy.scale.setScalar(0.7 + ((i * 17) % 7) * 0.1);
      dummy.updateMatrix();
      instancedRef.current.setMatrixAt(i, dummy.matrix);
    }
    instancedRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[undefined, undefined, count]}>
      <icosahedronGeometry args={[1.1, 0]} />
      <meshPhongMaterial color="#6b7280" shininess={4} />
    </instancedMesh>
  );
}

function BlackHole() {
  const groupRef = useRef<THREE.Group>(null!);
  const diskRef = useRef<THREE.Mesh>(null!);
  const uniforms = useMemo(() => ({
    time: { value: 0 },
    diskColor: { value: new THREE.Color('#f97316') }
  }), []);

  useFrame((state) => {
    if (groupRef.current) groupRef.current.position.copy(BLACK_HOLE_POSITION);
    if (diskRef.current) diskRef.current.rotation.z = state.clock.elapsedTime * 0.6;
    uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[7.5, 48, 48]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh ref={diskRef} rotation={[1.3, 0, 0]}>
        <ringGeometry args={[9.5, 28, 92]} />
        <shaderMaterial
          vertexShader={blackHoleVertexShader}
          fragmentShader={blackHoleFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function Comets({ timeScale }: { timeScale: number }) {
  return (
    <group>
      {[1,2,3,4,5].map((i) => (
        <CometInstance key={i} radius={65 + i * 28} speed={0.0008 + i * 0.00035} phase={i * 1.7} timeScale={timeScale} />
      ))}
    </group>
  );
}

function CometInstance({ radius, speed, phase, timeScale }: any) {
  const headRef = useRef<THREE.Group>(null!);
  const trailRef = useRef<THREE.Points>(null!);
  const trailPositions = useMemo(() => new Float32Array(180 * 3), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime * timeScale;
    if (headRef.current) {
      const angle = t * speed + phase;
      headRef.current.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle * 1.3) * 12,
        Math.sin(angle) * radius * 0.7
      );
    }
    if (trailRef.current) {
      const positions = trailRef.current.geometry.attributes.position.array as Float32Array;
      const headPos = headRef.current.position;
      for (let i = 179; i > 0; i--) {
        positions[i * 3] = positions[(i-1)*3];
        positions[i * 3 + 1] = positions[(i-1)*3 + 1];
        positions[i * 3 + 2] = positions[(i-1)*3 + 2];
      }
      positions[0] = headPos.x * 0.98;
      positions[1] = headPos.y * 0.98;
      positions[2] = headPos.z * 0.98;
      trailRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      <group ref={headRef}>
        <mesh><sphereGeometry args={[1.8]} /><meshPhongMaterial color="#e0f2fe" emissive="#bae6fd" emissiveIntensity={0.6} /></mesh>
      </group>
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={180} array={trailPositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={1.3} color="#bae6fd" transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

interface SpaceSceneProps {
  timeScale: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  onPlanetClick: (planet: PlanetData) => void;
  autoPilot: boolean;
  cameraTarget: { position: THREE.Vector3; lookAt: THREE.Vector3 } | null;
}

function SceneContent({ timeScale, quality, onPlanetClick, autoPilot, cameraTarget }: SpaceSceneProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const settings = QUALITY_PRESETS[quality];

  useFrame((state) => {
    if (autoPilot && !cameraTarget) {
      const t = state.clock.elapsedTime * 0.08;
      const radius = 165;
      camera.position.lerp(new THREE.Vector3(
        Math.cos(t * 0.6) * radius * 1.1,
        35 + Math.sin(t * 0.3) * 22,
        Math.sin(t * 0.6) * radius * 0.75
      ), 0.008);
      camera.lookAt(12, 8, -25);
    }
    if (cameraTarget) {
      camera.position.lerp(cameraTarget.position, 0.022);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(cameraTarget.lookAt, 0.028);
        controlsRef.current.update();
      }
    }
  });

  return (
    <>
      <fog attach="fog" args={['#020308', 280, 1450]} />
      <ambientLight intensity={0.035} color="#a5b4fc" />
      <pointLight position={[0, 0, 0]} intensity={2.8} color="#fffbeb" />
      <hemisphereLight args={['#1e3a8a', '#020308', 0.25]} />

      <Starfield count={settings.starCount} />
      <Nebula quality={quality} />

      {planets.map((planet) => (
        <Planet key={planet.id} data={planet} timeScale={timeScale} onClick={onPlanetClick} />
      ))}

      <AsteroidBelt count={settings.asteroidCount} timeScale={timeScale} />
      <BlackHole />
      <Comets timeScale={timeScale} />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.085}
        minDistance={12}
        maxDistance={420}
        target={[18, 6, -12]}
      />

      {settings.enablePost && (
        <EffectComposer>
          <Bloom luminanceThreshold={0.65} luminanceSmoothing={0.85} intensity={0.85} kernelSize={KernelSize.LARGE} />
          <Vignette offset={0.15} darkness={0.65} />
        </EffectComposer>
      )}
    </>
  );
}

export default function SpaceScene(props: SpaceSceneProps) {
  return (
    <div className="absolute inset-0 bg-[#020308]">
      <Canvas
        camera={{ position: [95, 48, 135], fov: 48, near: 0.5, far: 2800 }}
        gl={{ 
          antialias: true, 
          alpha: true, 
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.95 
        }}
      >
        <Suspense fallback={<Html center><div className="text-white/70">Loading Space...</div></Html>}>
          <PerformanceMonitor />
          <SceneContent {...props} />
        </Suspense>
      </Canvas>
      <div className="cinematic-vignette absolute inset-0 pointer-events-none" 
           style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(2,3,8,0.6) 75%, rgba(2,3,8,0.85) 100%)' }} />
    </div>
  );
}