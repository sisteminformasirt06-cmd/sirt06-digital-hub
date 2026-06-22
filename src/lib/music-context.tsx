import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Track = { name: string; url: string };
type Ctx = {
  track: Track | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  loadFile: (file: File) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  seek: (t: number) => void;
};

const MusicCtx = createContext<Ctx | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFile = (file: File) => {
    if (!audioRef.current) return;
    const url = URL.createObjectURL(file);
    audioRef.current.src = url;
    setTrack({ name: file.name, url });
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  const play = () => {
    if (!audioRef.current?.src) return;
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
  };
  const pause = () => { audioRef.current?.pause(); setIsPlaying(false); };
  const stop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };
  const setVolume = (v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  };
  const seek = (t: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = t;
      setCurrentTime(t);
    }
  };

  return (
    <MusicCtx.Provider value={{ track, isPlaying, volume, currentTime, duration, loadFile, play, pause, stop, setVolume, seek }}>
      {children}
    </MusicCtx.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicCtx);
  if (!ctx) throw new Error("useMusic must be used within MusicProvider");
  return ctx;
}