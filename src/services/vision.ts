/**
 * IntervAI Responsible Visual Engagement Analyzer
 * Performs client-side frame sampling for practice engagement feedback only.
 * Strictly adheres to ethical AI principles: No facial recognition, No psychological profiling.
 */

import { VisualEngagementMetrics } from '../types/index.ts';

export interface VisualAnalysisState {
  isFacePresent: boolean;
  isCentered: boolean;
  lightingQuality: 'good' | 'low' | 'high';
  stability: 'stable' | 'shaky';
  currentOrientationScore: number;
  sampleCount: number;
}

export class VisionService {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isAnalyzing: boolean = false;
  private intervalId: any = null;

  // Running telemetry metrics
  private totalSamples: number = 0;
  private facePresentSamples: number = 0;
  private centeredSamples: number = 0;
  private lookingAwayCount: number = 0;
  private totalLuminanceScore: number = 0;
  private totalStabilityScore: number = 0;
  private prevFrameData: Uint8ClampedArray | null = null;
  private isCameraAvailable: boolean = false;

  private onUpdateCallback?: (state: VisualAnalysisState) => void;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 160;
    this.canvas.height = 120;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  public bindVideo(video: HTMLVideoElement, onUpdate?: (state: VisualAnalysisState) => void) {
    this.videoElement = video;
    this.onUpdateCallback = onUpdate;
    this.isCameraAvailable = true;
  }

  public startAnalysis(sampleIntervalMs: number = 1000) {
    if (this.isAnalyzing) return;
    this.isAnalyzing = true;
    this.resetMetrics();

    this.intervalId = setInterval(() => {
      this.sampleFrame();
    }, sampleIntervalMs);
  }

  public stopAnalysis(): VisualEngagementMetrics {
    this.isAnalyzing = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    return this.getAggregatedMetrics();
  }

  public resetMetrics() {
    this.totalSamples = 0;
    this.facePresentSamples = 0;
    this.centeredSamples = 0;
    this.lookingAwayCount = 0;
    this.totalLuminanceScore = 0;
    this.totalStabilityScore = 0;
    this.prevFrameData = null;
  }

  private sampleFrame() {
    if (!this.videoElement || !this.ctx || !this.canvas || this.videoElement.readyState < 2) {
      return;
    }

    try {
      this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
      const frame = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const data = frame.data;

      this.totalSamples++;

      // 1. Calculate Average Luminance (Lighting Quality)
      let totalLuma = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalLuma += 0.299 * r + 0.587 * g + 0.114 * b;
      }
      const avgLuma = totalLuma / (data.length / 4);
      let lightingScore = 90;
      let lightingStatus: 'good' | 'low' | 'high' = 'good';

      if (avgLuma < 40) {
        lightingScore = 60;
        lightingStatus = 'low';
      } else if (avgLuma > 220) {
        lightingScore = 65;
        lightingStatus = 'high';
      } else {
        lightingScore = 95;
      }
      this.totalLuminanceScore += lightingScore;

      // 2. Camera Stability / Motion Delta
      let stabilityScore = 95;
      let stabilityStatus: 'stable' | 'shaky' = 'stable';
      if (this.prevFrameData) {
        let diff = 0;
        const step = 16;
        let count = 0;
        for (let i = 0; i < data.length; i += step * 4) {
          diff += Math.abs(data[i] - this.prevFrameData[i]);
          count++;
        }
        const avgDiff = diff / count;
        if (avgDiff > 35) {
          stabilityScore = 70;
          stabilityStatus = 'shaky';
        } else {
          stabilityScore = 95;
        }
      }
      this.totalStabilityScore += stabilityScore;
      this.prevFrameData = new Uint8ClampedArray(data);

      // 3. Approximate Face Presence and Centering via Center-Region Contrast/Motion
      const w = this.canvas.width;
      const h = this.canvas.height;
      const centerStartX = Math.floor(w * 0.25);
      const centerEndX = Math.floor(w * 0.75);
      const centerStartY = Math.floor(h * 0.15);
      const centerEndY = Math.floor(h * 0.85);

      let centerLuma = 0;
      let centerCount = 0;

      for (let y = centerStartY; y < centerEndY; y++) {
        for (let x = centerStartX; x < centerEndX; x++) {
          const idx = (y * w + x) * 4;
          centerLuma += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          centerCount++;
        }
      }

      const avgCenterLuma = centerLuma / centerCount;
      const contrast = Math.abs(avgCenterLuma - avgLuma);

      const isFacePresent = avgLuma > 25 && contrast >= 2;
      const isCentered = isFacePresent && contrast >= 5;

      if (isFacePresent) this.facePresentSamples++;
      if (isCentered) {
        this.centeredSamples++;
      } else {
        this.lookingAwayCount++;
      }

      if (this.onUpdateCallback) {
        this.onUpdateCallback({
          isFacePresent,
          isCentered,
          lightingQuality: lightingStatus,
          stability: stabilityStatus,
          currentOrientationScore: isCentered ? 95 : 70,
          sampleCount: this.totalSamples,
        });
      }
    } catch (e) {
      // Frame read error
    }
  }

  public getAggregatedMetrics(): VisualEngagementMetrics {
    const total = Math.max(1, this.totalSamples);
    const facePresenceRatio = Math.round((this.facePresentSamples / total) * 100);
    const screenCenterOrientationRatio = Math.round((this.centeredSamples / total) * 100);
    const lightingQualityScore = Math.round(this.totalLuminanceScore / total) || 90;
    const cameraStabilityScore = Math.round(this.totalStabilityScore / total) || 92;

    const overallEngagementScore = Math.min(
      100,
      Math.max(
        50,
        Math.round(
          facePresenceRatio * 0.35 +
            screenCenterOrientationRatio * 0.35 +
            lightingQualityScore * 0.15 +
            cameraStabilityScore * 0.15
        )
      )
    );

    return {
      id: `vm-${Date.now()}`,
      interviewId: '',
      sampleCount: this.totalSamples,
      facePresenceRatio,
      cameraAvailabilityRatio: this.isCameraAvailable ? 100.0 : 0.0,
      screenCenterOrientationRatio,
      lookingAwayCount: Math.round(this.lookingAwayCount / 3), // group consecutive looking away
      cameraStabilityScore,
      lightingQualityScore,
      overallEngagementScore,
      note: 'Approximate visual engagement feedback computed locally. No facial recognition or psychological profiling is used.',
    };
  }
}
