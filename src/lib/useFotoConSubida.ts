import { useState } from 'react';
import { takePhoto } from './camera';
import { subirFoto } from './storage';

/**
 * Encapsula "tomar foto → mostrar preview de inmediato → subirla a Storage
 * en paralelo" para las pantallas que piden una fotografía (foto antes, foto
 * después). El botón de continuar de cada pantalla
 * debe quedar deshabilitado hasta que `fotoUrl` exista (subida confirmada) —
 * `fotoUri` es solo para el preview local, nunca se guarda en Firestore.
 *
 * El error se expone como texto (`error`) en vez de `Alert.alert` porque en
 * web (`react-native-web`) `Alert.alert` no hace nada — es un no-op — así
 * que ahí un fallo de subida quedaba completamente silencioso.
 */
export function useFotoConSubida() {
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function capturar(ruta: string) {
    const uri = await takePhoto();
    if (!uri) return;
    setFotoUri(uri);
    setFotoUrl(null);
    setError(null);
    setSubiendo(true);
    try {
      const url = await subirFoto(uri, ruta);
      setFotoUrl(url);
    } catch (err) {
      console.error('No se pudo subir la foto', err);
      setError('No se pudo subir la foto. Revisa tu conexión e intenta de nuevo tocando la foto otra vez.');
    } finally {
      setSubiendo(false);
    }
  }

  return { fotoUri, fotoUrl, subiendo, error, capturar };
}
