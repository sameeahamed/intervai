/**
 * Real-Time Audio Waveform Visualizer Canvas
 */

import React, { useEffect, useRef } from 'react';
import { VoiceState } from '../../types/index.ts';

interface AudioWaveformProps {
  voiceState: VoiceState;
  frequencyData?: Uint8Array | null;
  height?: number;
  barColor?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  voiceState,
  frequencyData,
  height = 64,
  barColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const numBars = 32;
      const barWidth = 3;
      const gap = (canvas.width - numBars * barWidth) / (numBars - 1);
      const centerY = canvas.height / 2;

      for (let i = 0; i < numBars; i++) {
        let barHeight = 4;

        if (voiceState === 'ai_speaking') {
          // Dynamic sine wave animation for AI voice
          const t = Date.now() * 0.006;
          barHeight = Math.sin(t + i * 0.25) * 18 + Math.cos(t * 1.5 + i * 0.15) * 12 + 24;
        } else if (voiceState === 'listening' && frequencyData && frequencyData.length > 0) {
          // Real-time mic frequency data
          const dataIndex = Math.floor((i / numBars) * frequencyData.length);
          const val = frequencyData[dataIndex] || 0;
          barHeight = Math.max(4, (val / 255) * (canvas.height - 10));
        } else if (voiceState === 'evaluating' || voiceState === 'processing') {
          const t = Date.now() * 0.008;
          barHeight = Math.abs(Math.sin(t + i * 0.4)) * 14 + 6;
        } else {
          barHeight = 4;
        }

        const x = i * (barWidth + gap);
        const y = centerY - barHeight / 2;

        // Gradient coloring
        let fill = barColor;
        if (!fill) {
          if (voiceState === 'ai_speaking') fill = '#3b82f6'; // Blue
          else if (voiceState === 'listening') fill = '#10b981'; // Emerald
          else if (voiceState === 'evaluating' || voiceState === 'processing') fill = '#8b5cf6'; // Violet
          else fill = '#94a3b8'; // Slate
        }

        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, barWidth, barHeight, 2) : ctx.rect(x, y, barWidth, barHeight);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [voiceState, frequencyData, barColor]);

  return (
    <div className="w-full flex items-center justify-center overflow-hidden py-1">
      <canvas
        ref={canvasRef}
        width={240}
        height={height}
        className="w-full max-w-[240px] h-14 block"
      />
    </div>
  );
};
