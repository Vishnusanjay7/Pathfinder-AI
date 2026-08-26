import React, { useEffect, useState } from "react";

interface MicWaveformProps {
  /** Real RMS volume (0..~1) measured from the candidate microphone. */
  volume: number;
  /** When true the waveform animates; when false it renders idle bars. */
  active?: boolean;
  barCount?: number;
}

/**
 * Live microphone waveform. Bar heights are driven by the REAL mic audio
 * level (`volume`) provided by the VoiceActivityDetector — this is not a fake
 * animation. The per-bar variation is a cosmetic envelope so the bars look
 * like an audio waveform while still scaling with actual input volume.
 */
export const MicWaveform: React.FC<MicWaveformProps> = ({
  volume,
  active = false,
  barCount = 28,
}) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (start === 0) start = t;
      setPhase(((t - start) / 1000) % (Math.PI * 2));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const bars = Array.from({ length: barCount }, (_, i) => {
    const envelope = 0.55 + 0.45 * Math.abs(Math.sin(i * 0.62 + phase));
    const base = active ? 3 + volume * 46 * envelope : 2 + Math.abs(Math.sin(i * 0.8 + phase)) * 4;
    return {
      key: i,
      height: Math.min(100, Math.max(4, base)),
      bright: active && i % 3 === 0,
    };
  });

  return (
    <div className="flex items-end gap-[3px] h-8 px-2" aria-hidden="true">
      {bars.map((bar) => (
        <span
          key={bar.key}
          className={`w-[3px] rounded-full transition-[height] duration-75 ${
            active
              ? bar.bright
                ? "bg-emerald-400"
                : "bg-emerald-500/70"
              : "bg-slate-600/70"
          }`}
          style={{ height: `${bar.height}px` }}
        />
      ))}
    </div>
  );
};

export default MicWaveform;
