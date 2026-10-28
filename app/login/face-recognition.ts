import type { FaceResult, Human as HumanInstance } from "@vladmandic/human";

const descriptorLength = 1024;
const confidenceThreshold = 0.6;
const livenessThreshold = 0.5;
const captureTimeoutMs = 45_000;
const minimumFaceSize = 150;

export type DetectedFaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  videoWidth: number;
  videoHeight: number;
};

export function captureVideoFrame(video: HTMLVideoElement): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 640 / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

export async function captureFacePhoto(video: HTMLVideoElement, onStatus: (message: string) => void): Promise<string> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
    throw new Error("La cámara todavía no entrega video. Espera un momento e inténtalo de nuevo.");
  }
  onStatus("Detectando rostro…");
  const human = await getHuman();
  const deadline = performance.now() + 15_000;
  while (performance.now() < deadline) {
    const result = await detectFrame(human, video);
    const face = result.face.length === 1 ? result.face[0] : null;
    if (face && face.score >= 0.5 && face.size[0] >= 100 && face.size[1] >= 100) {
      const photo = captureVideoFrame(video);
      if (photo) return photo;
    }
    onStatus(face ? "Mantén el rostro centrado…" : "No se detecta un rostro…");
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  throw new Error("No se pudo detectar el rostro. Centra tu cara e inténtalo de nuevo.");
}

let humanPromise: Promise<HumanInstance> | null = null;
let detectionQueue: Promise<void> = Promise.resolve();

async function detectFrame(human: HumanInstance, video: HTMLVideoElement) {
  const previousDetection = detectionQueue;
  let releaseDetection!: () => void;
  detectionQueue = new Promise<void>((resolve) => { releaseDetection = resolve; });
  await previousDetection;
  try {
    return await human.detect(video);
  } finally {
    releaseDetection();
  }
}

async function getHuman(): Promise<HumanInstance> {
  if (!humanPromise) {
    humanPromise = import("@vladmandic/human").then(async ({ Human }) => {
      const human = new Human({
        modelBasePath: "/models/",
        cacheModels: true,
        debug: false,
        filter: { enabled: true, equalization: true },
        gesture: { enabled: false },
        face: {
          enabled: true,
          detector: { rotation: true, maxDetected: 2, minConfidence: confidenceThreshold, skipFrames: 0, skipTime: 0 },
          mesh: { enabled: true, skipFrames: 0, skipTime: 0 },
          iris: { enabled: true, skipFrames: 0, skipTime: 0 },
          description: { enabled: true, skipFrames: 0, skipTime: 0 },
          antispoof: { enabled: true, skipFrames: 0, skipTime: 0 },
          liveness: { enabled: true, skipFrames: 0, skipTime: 0 },
          emotion: { enabled: false },
          attention: { enabled: false },
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        segmentation: { enabled: false },
      });
      await human.load();
      return human;
    }).catch((error: unknown) => {
      humanPromise = null;
      throw error;
    });
  }
  return humanPromise;
}

function isUsableFace(face: FaceResult): face is FaceResult & { embedding: number[] } {
  return face.score >= confidenceThreshold
    && face.size[0] >= minimumFaceSize
    && face.size[1] >= minimumFaceSize
    && (face.real ?? 0) >= livenessThreshold
    && (face.live ?? 0) >= livenessThreshold
    && Array.isArray(face.embedding)
    && face.embedding.length === descriptorLength
    && face.embedding.every(Number.isFinite);
}

function getFaceGuideBox(face: FaceResult, video: HTMLVideoElement): DetectedFaceBox {
  const points = face.mesh?.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)) ?? [];
  const sourceBox = points.length >= 20
    ? [
        Math.min(...points.map(([x]) => x)),
        Math.min(...points.map(([, y]) => y)),
        Math.max(...points.map(([x]) => x)) - Math.min(...points.map(([x]) => x)),
        Math.max(...points.map(([, y]) => y)) - Math.min(...points.map(([, y]) => y)),
      ]
    : face.box;
  const horizontalPadding = sourceBox[2] * 0.08;
  const verticalPadding = sourceBox[3] * 0.1;

  return {
    x: Math.max(0, sourceBox[0] - horizontalPadding),
    y: Math.max(0, sourceBox[1] - verticalPadding),
    width: Math.min(video.videoWidth, sourceBox[2] + horizontalPadding * 2),
    height: Math.min(video.videoHeight, sourceBox[3] + verticalPadding * 2),
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
  };
}

export async function trackLiveFaceBox(
  video: HTMLVideoElement,
  onFaceDetected: (box: DetectedFaceBox | null) => void,
  signal: AbortSignal,
): Promise<void> {
  const human = await getHuman();

  while (!signal.aborted) {
    const result = await detectFrame(human, video);
    const face = result.face.length === 1 ? result.face[0] : null;
    if (face) {
      onFaceDetected(getFaceGuideBox(face, video));
    } else {
      onFaceDetected(null);
    }

    await new Promise<void>((resolve) => window.setTimeout(resolve, 120));
  }
}

export async function captureLiveFaceDescriptor(
  video: HTMLVideoElement,
  onStatus: (message: string) => void,
  onFaceDetected?: (box: DetectedFaceBox | null) => void,
): Promise<number[]> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
    throw new Error("La cámara todavía no entrega video. Espera un momento e inténtalo de nuevo.");
  }

  onStatus("Cargando modelos faciales locales…");
  const human = await getHuman();
  onStatus("Mira a la cámara y mantén el rostro centrado para completar el análisis.");

  const deadline = performance.now() + captureTimeoutMs;
  const embeddings: number[][] = [];

  while (performance.now() < deadline) {
    const result = await detectFrame(human, video);
    if (result.face.length !== 1) {
      onFaceDetected?.(null);
      embeddings.length = 0;
      onStatus(result.face.length === 0
        ? "No se detecta un rostro. Centra tu cara y mejora la iluminación."
        : "Debe aparecer una sola persona frente a la cámara.");
    } else {
      const face = result.face[0];
      onFaceDetected?.(getFaceGuideBox(face, video));
      const livenessConfirmed = (face.real ?? 0) >= livenessThreshold
        && (face.live ?? 0) >= livenessThreshold;
      if (!livenessConfirmed) {
        embeddings.length = 0;
        onStatus("No se pudo confirmar la señal de vida. Retira fotos o pantallas y vuelve a intentarlo.");
      } else if (face.size[0] < minimumFaceSize || face.size[1] < minimumFaceSize) {
        embeddings.length = 0;
        onStatus("Acércate un poco a la cámara y mantén el rostro centrado.");
      } else if (isUsableFace(face)) {
        embeddings.push(face.embedding);
        onStatus(`Rostro y reto detectados. Estabilizando captura (${embeddings.length}/3)…`);
        if (embeddings.length >= 5) {
          return Array.from({ length: descriptorLength }, (_, index) =>
            embeddings.reduce((sum, embedding) => sum + embedding[index], 0) / embeddings.length,
          );
        }
      } else {
        embeddings.length = 0;
        onStatus("No se obtuvo una muestra facial de calidad suficiente. Ajusta la iluminación e inténtalo de nuevo.");
      }
    }

    await new Promise((resolve) => window.setTimeout(resolve, 80));
  }

  throw new Error("Se agotó el tiempo de captura. Vuelve a intentarlo o usa el código autenticador.");
}
