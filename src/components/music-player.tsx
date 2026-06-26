import { useRef, useState } from "react";
import { Music2, Play, Pause, Square, Upload, Volume2, ChevronUp, ChevronDown } from "lucide-react";
import { useMusic } from "@/lib/music-context";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";
import { useEffect } from "react";

function fmt(t: number) {
  if (!isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function FloatingMusicPlayer() {
  const { track, isPlaying, volume, currentTime, duration, loadFile, play, pause, stop, setVolume, seek } = useMusic();
  const { musik } = useSettings();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setVolume(musik.volumeAwal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musik.volumeAwal]);

  if (!musik.aktif) return null;

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] right-4 z-40 select-none">
      <div
        className={cn(
          "glass-strong rounded-2xl overflow-hidden transition-all duration-300",
          open ? "w-[300px] p-3" : "w-14 h-14 p-0",
        )}
      >
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            aria-label="Open music player"
            className={cn(
              "h-14 w-14 grid place-items-center text-primary-foreground gradient-primary rounded-2xl",
              isPlaying && "animate-pulse-ring",
            )}
          >
            <Music2 className="h-6 w-6" />
          </button>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 grid place-items-center rounded-lg gradient-primary text-primary-foreground shrink-0">
                  <Music2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{track?.name ?? "Belum ada musik"}</div>
                  <div className="text-[10px] text-muted-foreground">{fmt(currentTime)} / {fmt(duration)}</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full accent-primary h-1"
            />

            <div className="flex items-center justify-between gap-1">
              <button
                onClick={() => inputRef.current?.click()}
                title="Upload MP3"
                className="h-8 w-8 grid place-items-center rounded-lg bg-secondary hover:bg-accent text-secondary-foreground"
              >
                <Upload className="h-4 w-4" />
              </button>
              <button
                onClick={isPlaying ? pause : play}
                title={isPlaying ? "Pause" : "Play"}
                className="h-9 w-9 grid place-items-center rounded-full gradient-primary text-primary-foreground shadow-glow"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                onClick={stop}
                title="Stop"
                className="h-8 w-8 grid place-items-center rounded-lg bg-secondary hover:bg-accent text-secondary-foreground"
              >
                <Square className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center gap-1.5 ml-1 flex-1 min-w-0">
                <Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1"
                />
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="audio/mpeg,audio/mp3,audio/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) loadFile(f);
                e.currentTarget.value = "";
              }}
            />
          </div>
        )}
      </div>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="absolute -top-2 -left-2 h-6 w-6 grid place-items-center rounded-full bg-card border border-border shadow-soft text-muted-foreground hover:text-foreground"
          aria-label="Expand"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}