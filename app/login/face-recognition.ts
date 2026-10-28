import type { FaceResult, Human as HumanInstance } from "@vladmandic/human";

const descriptorLength = 1024;
const confidenceThreshold = 0.6;
const captureTimeoutMs = 30_000;

let humanPromise: Promise<HumanInstance> | null = null;

async function getHuman(): Promise<HumanInstance> {
  if (!humanPromise) {
    humanPromise = import("@vladmandic/human").then(async ({ Human }) => {
      const human = new Human({
        modelBasePath: "/models/",
        cacheModels: true,
        debug: false,
        filter: { enabled: true, equalization: true },
        gesture: { enabled: true },
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
    && face.size[0] >= 180
    && face.size[1] >= 180
    && (face.real ?? 0) >= confidenceThreshold
    && (face.live ?? 0) >= confidenceThreshold
    && Array.isArray(face.embedding)
    && face.embedding.length === descriptorLength
    && face.embedding.every(Number.isFinite);
}

export async function captureLiveFaceDescriptor(
  video: HTMLVideoElement,
  onStatus: (message: string) => void,
): Promise<number[]> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
    throw new Error("La cámara todavía no entrega video. Espera un momento e inténtalo de nuevo.");
  }

  onStatus("Cargando modelos faciales locales…");
  const human = await getHuman();
  onStatus("Mira a la cámara y parpadea una vez para completar el reto de vida.");

  const deadline = performance.now() + captureTimeoutMs;
  const embeddings: number[][] = [];
  let blinkStartedAt = 0;
  let blinkDetected = false;

  while (performance.now() < deadline) {
    const result = await human.detect(video);
    const gestures = result.gesture.map(({ gesture }) => gesture);
    const blinking = gestures.includes("blink left eye") || gestures.includes("blink right eye");
    const now = performance.now();

    if (blinking && blinkStartedAt === 0) {
      blinkStartedAt = now;
    } else if (!blinking && blinkStartedAt !== 0) {
      const blinkDuration = now - blinkStartedAt;
      blinkDetected ||= blinkDuration >= 10 && blinkDuration <= 800;
      blinkStartedAt = 0;
    }

    if (result.face.length !== 1) {
      embeddings.length = 0;
      onStatus(result.face.length === 0
        ? "No se detecta un rostro. Centra tu cara y mejora la iluminación."
        : "Debe aparecer una sola persona frente a la cámara.");
    } else {
      const face = result.face[0];
      if ((face.real ?? 0) < confidenceThreshold || (face.live ?? 0) < confidenceThreshold) {
        embeddings.length = 0;
        onStatus("No se pudo confirmar la señal de vida. Retira fotos o pantallas y vuelve a intentarlo.");
      } else if (face.size[0] < 180 || face.size[1] < 180) {
        embeddings.length = 0;
        onStatus("Acércate un poco a la cámara y mantén el rostro centrado.");
      } else if (!blinkDetected) {
        onStatus("Rostro detectado. Parpadea una vez para completar el reto.");
      } else if (isUsableFace(face)) {
        embeddings.push(face.embedding);
        onStatus(`Rostro y reto detectados. Estabilizando captura (${embeddings.length}/3)…`);
        if (embeddings.length >= 3) {
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
