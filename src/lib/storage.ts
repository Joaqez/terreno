import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Platform } from 'react-native';
import { storage } from './firebase';

/** Lado mayor de la foto subida. Sobra para ver el exhibidor en el panel. */
const LADO_MAXIMO_PX = 1600;
const CALIDAD_JPEG = 0.75;

/**
 * Sube una foto a Firebase Storage y devuelve su URL pública de descarga.
 *
 * `uriLocal` puede ser una URI de archivo nativa (Android/iOS) o un
 * `blob:` URL (web, lo que devuelve expo-image-picker en el navegador) — en
 * ambos casos `fetch()` + `.blob()` funciona para leer el archivo. En web es
 * importante subir la foto apenas se toma: un `blob:` URL deja de servir en
 * cuanto se recarga la página, así que no se puede dejar para más tarde.
 */
export async function subirFoto(uriLocal: string, ruta: string): Promise<string> {
  const respuesta = await fetch(uriLocal);
  const original = await respuesta.blob();
  const blob = Platform.OS === 'web' ? await comprimirEnWeb(original) : original;
  const referencia = ref(storage, ruta);
  await uploadBytes(referencia, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(referencia);
}

/**
 * En web, expo-image-picker ignora `quality` y entrega la foto original del
 * celular (3–9 MB). Con señal débil eso fallaba al subir (2026-11-23,
 * Santiago: "revisa tu conexión" aunque tenía WhatsApp). Se reduce con un
 * canvas a ~1600 px / JPEG 0,75 (unos 300–600 KB). Si algo falla, sube la original.
 */
async function comprimirEnWeb(original: Blob): Promise<Blob> {
  try {
    const url = URL.createObjectURL(original);
    try {
      // <img> respeta la orientación EXIF en los navegadores actuales.
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });
      const escala = Math.min(1, LADO_MAXIMO_PX / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * escala);
      canvas.height = Math.round(img.naturalHeight * escala);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const comprimida = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', CALIDAD_JPEG));
      return comprimida && comprimida.size < original.size ? comprimida : original;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    console.error('No se pudo comprimir la foto, se sube la original', err);
    return original;
  }
}
