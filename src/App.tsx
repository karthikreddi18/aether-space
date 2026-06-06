import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Volume2, VolumeX, RotateCw, 
  Zap, Clock, Eye, EyeOff 
} from 'lucide-react';
import * as THREE from 'three';
import { Leva, useControls } from 'leva';

import SpaceScene from './components/SpaceScene';
import { planets, PlanetData } from './utils/planetData';
import { useSpaceAudio } from './hooks/useAudio';

type Quality = 'low' | 'medium' | 'high' | 'ultra';
type TravelTarget = { position: THREE.Vector3; lookAt: THREE.Vector3 } | null;

interface UIState {
  timeScale: number;
  quality: Quality;
  isAutoPilot: boolean;
  isPlayingAudio: boolean;
  audioVolume: number;
  showUI: boolean;
  isRelaxMode: boolean;
  selectedPlanetId: string | null;
  isTraveling: boolean;
  showDevControls: boolean;
}

export default function AetherSpaceExplorer() {
  const [ui, setUi] = useState<UIState>({
    timeScale: 1.0,
    quality: 'high',
    isAutoPilot: false,
    isPlayingAudio: false,
    audioVolume: 0.65,
    showUI: true,
    isRelaxMode: false,
    selectedPlanetId: null,
    isTraveling: false,
    showDevControls: false,
  });

  const [travelTarget, setTravelTarget] = useState<TravelTarget>(null);
  const [fps, setFps] = useState(60);
  const [isLoading, setIsLoading] = useState(true);

  const { toggleAudio, setVolume } = useSpaceAudio(ui.isPlayingAudio, ui.audioVolume);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1850);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let frame = 0;
    let lastTime = performance.now();
    
    const interval = setInterval(() => {
      const now = performance.now();
      const delta = now - lastTime;
      if (delta > 0) {
        setFps(Math.round((frame * 1000) / delta));
      }
      frame = 0;
      lastTime = now;
    }, 850);

    const raf = () => { frame++; requestAnimationFrame(raf); };
    raf();
    return () => clearInterval(interval);
  }, []);

  const travelToPlanet = useCallback((planet: PlanetData) => {
    if (ui.isTraveling) return;

    setUi(prev => ({ ...prev, selectedPlanetId: planet.id, isTraveling: true, isAutoPilot: false }));

    const offsetDistance = planet.radius * 5.2 + 28;
    const heightOffset = planet.radius * 1.8 + 12;
    
    const camPos = new THREE.Vector3(
      planet.distance * 0.6 + offsetDistance * 0.7,
      heightOffset + 18,
      planet.distance * 0.35 + offsetDistance * 0.65
    );
    
    const lookAtPos = new THREE.Vector3(
      planet.distance * 0.75,
      4,
      planet.distance * 0.4
    );

    setTravelTarget({ position: camPos, lookAt: lookAtPos });

    setTimeout(() => {
      setTravelTarget(null);
      setUi(prev => ({ ...prev, isTraveling: false }));
    }, 2650);
  }, [ui.isTraveling]);

  const handlePlanetClick = useCallback((planet: PlanetData) => {
    travelToPlanet(planet);
  }, [travelToPlanet]);

  const toggleAutoPilot = () => {
    const newAuto = !ui.isAutoPilot;
    setUi(prev => ({ 
      ...prev, 
      isAutoPilot: newAuto, 
      selectedPlanetId: newAuto ? null : prev.selectedPlanetId 
    }));
    if (newAuto) setTravelTarget(null);
  };

  const changeQuality = (q: Quality) => {
    setUi(prev => ({ ...prev, quality: q }));
  };

  const toggleRelaxMode = () => {
    const newRelax = !ui.isRelaxMode;
    setUi(prev => ({ 
      ...prev, 
      isRelaxMode: newRelax, 
      showUI: !newRelax,
      isAutoPilot: newRelax ? true : prev.isAutoPilot 
    }));
  };

  const takeScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `aether-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 0.98);
    link.click();
  };

  const handleAudioToggle = () => {
    const newPlaying = !ui.isPlayingAudio;
    setUi(prev => ({ ...prev, isPlayingAudio: newPlaying }));
    toggleAudio(newPlaying);
  };

  const handleVolumeChange = (vol: number) => {
    setUi(prev => ({ ...prev, audioVolume: vol }));
    setVolume(vol);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r') toggleRelaxMode();
      if (e.key.toLowerCase() === 'a') toggleAutoPilot();
      if (e.key.toLowerCase() === 's') takeScreenshot();
      if (e.key.toLowerCase() === 'p') {
        const newPlaying = !ui.isPlayingAudio;
        setUi(prev => ({ ...prev, isPlayingAudio: newPlaying }));
        toggleAudio(newPlaying);
      }
      if (e.key === 'Escape' && ui.isRelaxMode) {
        setUi(prev => ({ ...prev, isRelaxMode: false, showUI: true }));
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setUi(prev => ({ ...prev, showDevControls: !prev.showDevControls }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ui.isRelaxMode, ui.isPlayingAudio]);

  const levaControls = useControls(
    'Space Parameters',
    {
      timeScale: { value: ui.timeScale, min: 0.1, max: 4, step: 0.1 },
    },
    { collapsed: true, hidden: !ui.showDevControls }
  );

  useEffect(() => {
    if (levaControls.timeScale !== ui.timeScale) {
      setUi(prev => ({ ...prev, timeScale: levaControls.timeScale as number }));
    }
  }, [levaControls.timeScale]);

  const currentPlanet = planets.find(p => p.id === ui.selectedPlanetId);

  return (
    <div className={`relative w-full h-[100dvh] overflow-hidden bg-[#020308] text-white ${ui.isRelaxMode ? 'relax-mode' : ''}`}>
      
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020308]"
          >
            <div className="text-center">
              <div className="mb-8 flex justify-center">
                <div className="relative w-16 h-16">
                  <div className="w-16 h-16 rounded-full border border-white/10" />
                  <div className="absolute inset-0 w-16 h-16 rounded-full border-t-2 border-white/90 animate-spin" />
                </div>
              </div>
              <div className="font-space text-5xl tracking-[-2.5px] font-semibold mb-3">AETHER</div>
              <div className="text-white/50 text-sm tracking-[4px]">DEEP SPACE EXPLORATION</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SpaceScene
        timeScale={ui.timeScale}
        quality={ui.quality}
        onPlanetClick={handlePlanetClick}
        autoPilot={ui.isAutoPilot}
        cameraTarget={travelTarget}
      />

      <div className={`absolute top-0 left-0 right-0 z-50 px-6 pt-6 flex justify-between transition-opacity ${ui.showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="font-space text-3xl tracking-[-1.5px] font-semibold">AETHER</div>
        <div className="glass px-4 py-1.5 rounded-2xl text-xs flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          {fps} FPS
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 z-50 p-6 transition-all ${ui.showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="max-w-[1480px] mx-auto">
          <div className="glass rounded-3xl px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[2px] text-white/50">
                <Clock size={15} /> SIMULATION
              </div>
              <div className="flex items-center gap-px bg-white/5 rounded-2xl p-0.5">
                {[0.25, 0.5, 1, 2, 3.5].map((s) => (
                  <button key={s} onClick={() => setUi(p => ({ ...p, timeScale: s }))}
                    className={`px-4 py-1.5 text-xs rounded-[14px] ${ui.timeScale === s ? 'bg-white text-black' : 'hover:bg-white/10'}`}>
                    {s}×
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={toggleAutoPilot} className={`btn flex items-center gap-2 text-sm ${ui.isAutoPilot ? 'bg-white/10' : ''}`}>
                <RotateCw size={16} className={ui.isAutoPilot ? 'animate-spin' : ''} />
                {ui.isAutoPilot ? 'EXIT AUTOPILOT' : 'AUTO-PILOT'}
              </button>
              <button onClick={toggleRelaxMode} className="btn flex items-center gap-2 text-sm">
                {ui.isRelaxMode ? <Eye size={16} /> : <EyeOff size={16} />}
                {ui.isRelaxMode ? 'SHOW UI' : 'RELAX MODE'}
              </button>
              <button onClick={takeScreenshot} className="btn flex items-center gap-2 text-sm">
                <Camera size={16} /> CAPTURE
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleAudioToggle} className="btn flex items-center gap-2 text-sm">
                {ui.isPlayingAudio ? <VolumeX size={16} /> : <Volume2 size={16} />}
                {ui.isPlayingAudio ? 'MUTE' : 'AMBIENT'}
              </button>
              <input type="range" min={0} max={1} step={0.01} value={ui.audioVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))} className="w-20 accent-[#a5b4fc]" />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {planets.map((planet) => {
              const isActive = ui.selectedPlanetId === planet.id;
              return (
                <button key={planet.id} onClick={() => travelToPlanet(planet)} disabled={ui.isTraveling}
                  className={`planet-card glass px-5 py-2.5 rounded-2xl text-left min-w-[138px] border ${isActive ? 'active border-[#a5b4fc]' : 'border-transparent hover:border-white/20'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[15px]">{planet.name}</div>
                      <div className="text-[10px] text-white/40 font-mono tracking-widest">{planet.type.toUpperCase()}</div>
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-[#a5b4fc]' : 'bg-white/30'}`} />
                  </div>
                  {planet.hasRings && <div className="text-[9px] text-amber-400/70">RINGS</div>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {currentPlanet && ui.showUI && !ui.isRelaxMode && (
          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
            className="absolute top-20 right-6 z-40 w-80 glass rounded-3xl p-7 text-sm">
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="font-space text-4xl tracking-[-1.5px]">{currentPlanet.name}</div>
                <div className="text-xs text-white/40 tracking-[2px] mt-0.5">{currentPlanet.type.toUpperCase()}</div>
              </div>
              <button onClick={() => setUi(p => ({...p, selectedPlanetId: null}))}>×</button>
            </div>
            <p className="text-white/70 leading-relaxed mb-6">{currentPlanet.description}</p>
            <div className="pt-5 border-t border-white/10">
              <div className="uppercase text-[10px] tracking-[2px] text-white/50 mb-2">DID YOU KNOW?</div>
              <p className="text-white/80 text-[13px]">{currentPlanet.funFact}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {ui.showUI && !ui.isRelaxMode && (
        <div className="absolute top-20 right-6 z-40">
          <div className="glass rounded-2xl p-1 flex text-xs">
            {(['low','medium','high','ultra'] as const).map((q) => (
              <button key={q} onClick={() => changeQuality(q)}
                className={`px-4 py-1.5 rounded-xl capitalize ${ui.quality === q ? 'bg-white text-black' : 'hover:bg-white/5 text-white/70'}`}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <Leva hidden={!ui.showDevControls} theme={{ colors: { accent: '#a5b4fc' } }} />

      <div className="absolute bottom-6 left-6 text-[10px] text-white/30 font-mono tracking-widest hidden xl:block">
        R • RELAX &nbsp; A • AUTOPILOT &nbsp; S • SCREENSHOT &nbsp; P • AUDIO
      </div>
    </div>
  );
}