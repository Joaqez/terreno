import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

export interface Ubicacion {
  lat: number;
  lng: number;
  /** Radio de error en metros que reporta el GPS/navegador. */
  precisionM: number | null;
  /** Momento en que se tomó la lectura (ms epoch). */
  tomadaEn: number;
}

function aUbicacion(p: Location.LocationObject): Ubicacion {
  return { lat: p.coords.latitude, lng: p.coords.longitude, precisionM: p.coords.accuracy ?? null, tomadaEn: p.timestamp };
}

/**
 * Lectura nueva y precisa (GPS de alta precisión). Ojo: en web,
 * expo-location pide por defecto `maximumAge: Infinity`, o sea que el
 * navegador puede devolver una posición guardada de hace horas — esa fue la
 * causa del bug del 2026-11-16 (distancias calculadas como si el vendedor
 * siguiera en Chamisero). Por eso se fuerza `maximumAge: 0`.
 */
export async function obtenerUbicacionPrecisa(timeoutMs = 20000): Promise<Ubicacion | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    // `timeout` solo lo respeta la versión web; el Promise.race corta también en nativo.
    const p = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 0,
        timeout: timeoutMs,
      } as Location.LocationOptions),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs + 1000)),
    ]);
    return p ? aUbicacion(p) : null;
  } catch (err) {
    console.error('No se pudo obtener la ubicación precisa', err);
    return null;
  }
}

/**
 * Ubicación del vendedor que se va actualizando sola mientras la pantalla
 * está montada (antes se pedía una sola vez y "Ruta del día" queda montada
 * todo el día debajo del resto de las pantallas). Precisión media y cada
 * ~100 m para no gastar tanta batería; `actualizar()` fuerza una lectura
 * precisa (botón "Actualizar"). Si el permiso se niega devuelve
 * `ubicacion: null` — `RutaScreen` cae de vuelta al `distanciaKm` fijo.
 */
export function useUbicacionActual() {
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [actualizando, setActualizando] = useState(false);
  const [sinPermiso, setSinPermiso] = useState(false);

  useEffect(() => {
    let cancelado = false;
    let suscripcion: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelado) return;
        if (status !== 'granted') {
          setSinPermiso(true);
          return;
        }
        suscripcion = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 100,
            timeInterval: 30000,
            // Solo lo usa la versión web (se pasa tal cual a navigator.geolocation).
            maximumAge: 30000,
          } as Location.LocationOptions,
          (p) => {
            if (!cancelado) setUbicacion(aUbicacion(p));
          }
        );
        if (cancelado) suscripcion.remove();
      } catch (err) {
        console.error('No se pudo seguir la ubicación actual', err);
      }
    })();
    return () => {
      cancelado = true;
      suscripcion?.remove();
    };
  }, []);

  const actualizar = useCallback(async () => {
    setActualizando(true);
    const nueva = await obtenerUbicacionPrecisa();
    if (nueva) setUbicacion(nueva);
    setActualizando(false);
  }, []);

  return { ubicacion, actualizando, sinPermiso, actualizar };
}
