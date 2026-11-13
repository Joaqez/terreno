import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

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
  const blob = await respuesta.blob();
  const referencia = ref(storage, ruta);
  await uploadBytes(referencia, blob);
  return getDownloadURL(referencia);
}
