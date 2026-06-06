import { useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';

export function useSpaceAudio(isPlaying: boolean, volume: number) {
  const isInitializedRef = useRef(false);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const noiseRef = useRef<Tone.Noise | null>(null);
  const masterGainRef = useRef<Tone.Gain | null>(null);

  const initializeAudio = useCallback(async () => {
    if (isInitializedRef.current) return;
    await Tone.start();

    masterGainRef.current = new Tone.Gain(volume).toDestination();

    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 4.5, decay: 2, sustain: 0.92, release: 6 }
    }).connect(masterGainRef.current);

    noiseRef.current = new Tone.Noise('brown');
    const filter = new Tone.Filter({ type: 'lowpass', frequency: 380, Q: 0.6 });
    const reverb = new Tone.Reverb({ decay: 9.5, wet: 0.65 });
    const noiseGain = new Tone.Gain(0.018);

    noiseRef.current.chain(filter, reverb, noiseGain, masterGainRef.current);

    const notes = ['C2', 'G2', 'Eb2', 'Bb2'];
    const playAmbient = () => {
      if (!synthRef.current || !isPlaying) return;
      const now = Tone.now();
      synthRef.current.triggerAttackRelease(notes[0], '8n', now, 0.12);
      synthRef.current.triggerAttackRelease(notes[2], '4n', now + 1.2, 0.09);
    };

    setInterval(playAmbient, 9200);
    noiseRef.current.start();
    isInitializedRef.current = true;
  }, [volume]);

  const toggleAudio = useCallback(async (play: boolean) => {
    if (play && !isInitializedRef.current) {
      await initializeAudio();
    }
    if (masterGainRef.current) {
      if (play) {
        masterGainRef.current.gain.rampTo(volume * 0.85, 1.8);
        if (noiseRef.current && noiseRef.current.state !== 'started') noiseRef.current.start();
      } else {
        masterGainRef.current.gain.rampTo(0.0001, 2.2);
      }
    }
  }, [initializeAudio, volume]);

  const setVolume = useCallback((vol: number) => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.rampTo(vol * 0.85, 0.6);
    }
  }, []);

  useEffect(() => {
    if (isInitializedRef.current) {
      toggleAudio(isPlaying);
    }
  }, [isPlaying, toggleAudio]);

  useEffect(() => {
    setVolume(volume);
  }, [volume, setVolume]);

  useEffect(() => {
    return () => {
      if (synthRef.current) synthRef.current.dispose();
      if (noiseRef.current) noiseRef.current.dispose();
      if (masterGainRef.current) masterGainRef.current.dispose();
    };
  }, []);

  return { toggleAudio, setVolume, isInitialized: isInitializedRef.current };
}