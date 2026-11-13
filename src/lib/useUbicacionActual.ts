import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

/**
 * Ubicación actual del vendedor, pedida una vez al montar. Si el permiso se
 * niega o el dispositivo no tiene GPS, devuelve `null` — las pantallas que
 * usan esto deben poder mostrar algo razonable sin ubicación (ver
 * `RutaScreen`, que cae de vuelta al `distanciaKm` fijo de cada tienda).
 */
export function useUbicacionActual() {
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelado) return;
        const posicion = await Location.getCurrentPositionAsync({});
        if (!cancelado) {
          setUbicacion({ lat: posicion.coords.latitude, lng: posicion.coords.longitude });
        }
      } catch (err) {
        console.error('No se pudo obtener la ubicación actual', err);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  return ubicacion;
}
