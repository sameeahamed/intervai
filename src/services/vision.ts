/**
 * On-device visual guidance for the interview camera.
 * Face detection returns only a count and framing status; it does not identify,
 * describe, or save faces. The model and WASM assets are fetched on demand.
 */

import type { FaceDetector as MediaPipeFaceDetector } from '@mediapipe/tasks-vision';
import { VisualEngagementMetrics } from '../types/index.ts';

const MEDIAPIPE_VERSION = '1.1.0';
const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

export type FaceDetectionStatus = 'loading' | 'ready' | 'error';

export interface VisualAnalysisState {
  faceCount: number | null;
  faceDetectionStatus: FaceDetectionStatus;
  faceDetectionError?: string;
  isFacePresent: boolean;
  isCentered: boolean;
  lightingQuality: 'good' | 'low' | 'high';
  stability: 'stable' | 'shaky';
  currentOrientationScore: number;
  sampleCount: number;
}

export class VisionService {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private isAnalyzing = false;
  private isDisposed = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private detector: MediaPipeFaceDetector | null = null;
  private detectorPromise: Promise<MediaPipeFaceDetector> | null = null;
  private detectorError: string | null = null;
  private faceDetectionStatus: FaceDetectionStatus = 'loading';

  // Aggregate session metrics. Face counts are used only for live guidance;
  // only aggregate presentation metrics are returned to the caller.
  private totalSamples = 0;
  private faceDetectionSamples = 0;
  private facePresentSamples = 0;
  private centeredSamples = 0;
  private lookingAwayCount = 0;
  private totalLuminanceScore = 0;
  private totalStabilityScore = 0;
  private prevFrameData: Uint8ClampedArray | null = null;
  private isCameraAvailable = false;
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

  public startAnalysis(sampleIntervalMs = 1000) {
    if (this.isAnalyzing || this.isDisposed) return;
    this.isAnalyzing = true;
    this.resetMetrics();
    this.faceDetectionStatus = 'loading';
    this.detectorError = null;
    this.emitState(null, false, false, 'good', 'stable');

    void this.loadDetector()
      .then(() => {
        if (!this.isAnalyzing) return;
        this.faceDetectionStatus = 'ready';
      })
      .catch((error: unknown) => {
        if (!this.isAnalyzing) return;
        this.faceDetectionStatus = 'error';
        this.detectorError = 'Face detection could not start. Check your connection and retry the camera.';
        this.detectorPromise = null;
        console.warn('Local face detector unavailable:', error);
        this.emitState(null, false, false, 'good', 'stable', this.detectorError);
      });

    this.intervalId = setInterval(() => this.sampleFrame(), sampleIntervalMs);
  }

  public stopAnalysis(): VisualEngagementMetrics {
    this.isAnalyzing = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    return this.getAggregatedMetrics();
  }

  public dispose() {
    if (this.isDisposed) return;
    this.stopAnalysis();
    this.isDisposed = true;
    const pendingDetector = this.detectorPromise;
    if (pendingDetector) {
      void pendingDetector.then((detector) => detector.close()).catch(() => {});
    } else {
      this.detector?.close();
    }
    this.detector = null;
    this.videoElement = null;
    this.ctx = null;
  }

  public resetMetrics() {
    this.totalSamples = 0;
    this.faceDetectionSamples = 0;
    this.facePresentSamples = 0;
    this.centeredSamples = 0;
    this.lookingAwayCount = 0;
    this.totalLuminanceScore = 0;
    this.totalStabilityScore = 0;
    this.prevFrameData = null;
  }

  private async loadDetector(): Promise<MediaPipeFaceDetector> {
    if (this.detector) return this.detector;
    if (!this.detectorPromise) {
      this.detectorPromise = (async () => {
        const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const wasmPath = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
        const files = await FilesetResolver.forVisionTasks(wasmPath);
        const detector = await FaceDetector.createFromOptions(files, {
          baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: 'CPU' },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.55,
          minSuppressionThreshold: 0.3,
        });
        if (this.isDisposed) {
          detector.close();
          throw new Error('Face detector was disposed before it finished loading.');
        }
        this.detector = detector;
        return detector;
      })();
    }
    return this.detectorPromise;
  }

  private emitState(
    faceCount: number | null,
    isFacePresent: boolean,
    isCentered: boolean,
    lightingQuality: 'good' | 'low' | 'high',
    stability: 'stable' | 'shaky',
    faceDetectionError?: string,
  ) {
    this.onUpdateCallback?.({
      faceCount,
      faceDetectionStatus: this.faceDetectionStatus,
      faceDetectionError,
      isFacePresent,
      isCentered,
      lightingQuality,
      stability,
      currentOrientationScore: isCentered ? 95 : 70,
      sampleCount: this.totalSamples,
    });
  }

  private sampleFrame() {
    const video = this.videoElement;
    if (!video || !this.ctx || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    try {
      this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
      const frame = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const data = frame.data;
      this.totalSamples++;

      // Estimate lighting and motion using a small local frame sample.
      let totalLuma = 0;
      for (let i = 0; i < data.length; i += 4) {
        totalLuma += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      const avgLuma = totalLuma / (data.length / 4);
      const lightingQuality = avgLuma < 40 ? 'low' : avgLuma > 220 ? 'high' : 'good';
      this.totalLuminanceScore += lightingQuality === 'good' ? 95 : 60;

      let stability: 'stable' | 'shaky' = 'stable';
      let stabilityScore = 95;
      if (this.prevFrameData) {
        let diff = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 16 * 4) {
          diff += Math.abs(data[i] - this.prevFrameData[i]);
          count++;
        }
        if (count > 0 && diff / count > 35) {
          stability = 'shaky';
          stabilityScore = 70;
        }
      }
      this.totalStabilityScore += stabilityScore;
      this.prevFrameData = new Uint8ClampedArray(data);

      if (this.faceDetectionStatus !== 'ready' || !this.detector) {
        if (this.faceDetectionStatus !== 'error') {
          this.emitState(null, false, false, lightingQuality, stability, this.detectorError || undefined);
        }
        return;
      }

      const result = this.detector.detectForVideo(video, Math.max(performance.now(), 1));
      const faceCount = result.detections.length;
      const singleFace = faceCount === 1;
      const bounds = result.detections[0]?.boundingBox;
      const centerX = bounds ? bounds.originX + bounds.width / 2 : 0;
      const centerY = bounds ? bounds.originY + bounds.height / 2 : 0;
      const isCentered = singleFace &&
        centerX >= video.videoWidth * 0.25 && centerX <= video.videoWidth * 0.75 &&
        centerY >= video.videoHeight * 0.15 && centerY <= video.videoHeight * 0.85;

      this.faceDetectionSamples++;
      if (singleFace) this.facePresentSamples++;
      if (isCentered) this.centeredSamples++;
      else this.lookingAwayCount++;

      this.emitState(faceCount, singleFace, isCentered, lightingQuality, stability);
    } catch (error) {
      this.faceDetectionStatus = 'error';
      this.detectorError = 'Face detection is unavailable for this camera. You can continue without it.';
      console.warn('Local face detection frame failed:', error);
      this.emitState(null, false, false, 'good', 'stable', this.detectorError);
    }
  }

  public getAggregatedMetrics(): VisualEngagementMetrics {
    const total = Math.max(1, this.totalSamples);
    const facePresenceRatio = this.faceDetectionSamples
      ? Math.round((this.facePresentSamples / this.faceDetectionSamples) * 100)
      : 0;
    const screenCenterOrientationRatio = this.faceDetectionSamples
      ? Math.round((this.centeredSamples / this.faceDetectionSamples) * 100)
      : 0;
    const lightingQualityScore = Math.round(this.totalLuminanceScore / total) || 90;
    const cameraStabilityScore = Math.round(this.totalStabilityScore / total) || 92;
    const overallEngagementScore = Math.min(
      100,
      Math.max(50, Math.round(
        facePresenceRatio * 0.35 + screenCenterOrientationRatio * 0.35 +
        lightingQualityScore * 0.15 + cameraStabilityScore * 0.15
      )),
    );

    return {
      id: `vm-${Date.now()}`,
      interviewId: '',
      sampleCount: this.totalSamples,
      facePresenceRatio,
      cameraAvailabilityRatio: this.isCameraAvailable ? 100 : 0,
      screenCenterOrientationRatio,
      lookingAwayCount: Math.round(this.lookingAwayCount / 3),
      cameraStabilityScore,
      lightingQualityScore,
      overallEngagementScore,
      note: 'Face count and framing are detected locally; no identity, face image, or face count is stored. Only aggregate session metrics are saved.',
    };
  }
}
