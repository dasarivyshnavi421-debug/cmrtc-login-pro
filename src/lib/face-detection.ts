import * as faceapi from "face-api.js";

let modelsLoaded = false;

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model";

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

export async function getDescriptorFromImage(imageUrl: string): Promise<Float32Array | null> {
  const img = await faceapi.fetchImage(imageUrl);
  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection?.descriptor ?? null;
}

export async function getDescriptorFromVideo(video: HTMLVideoElement): Promise<Float32Array | null> {
  const detection = await faceapi
    .detectSingleFace(video)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection?.descriptor ?? null;
}

export function compareFaces(
  descriptor1: Float32Array | number[],
  descriptor2: Float32Array | number[]
): { match: boolean; distance: number; confidence: number } {
  const d1 = descriptor1 instanceof Float32Array ? descriptor1 : new Float32Array(descriptor1);
  const d2 = descriptor2 instanceof Float32Array ? descriptor2 : new Float32Array(descriptor2);
  const distance = faceapi.euclideanDistance(d1, d2);
  const match = distance < 0.6;
  const confidence = Math.max(0, Math.min(100, (1 - distance) * 100));
  return { match, distance, confidence: Math.round(confidence * 10) / 10 };
}

export async function detectFaceFromCanvas(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): Promise<{ descriptor: Float32Array; confidence: number } | null> {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0);

  const detection = await faceapi
    .detectSingleFace(video)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;

  return {
    descriptor: detection.descriptor,
    confidence: detection.detection.score * 100,
  };
}
