import { FueraDeRango, Tienda, UbicacionVisita } from '../types';
import { calcularDistanciaKm } from './distancia';
import { obtenerUbicacionPrecisa } from './useUbicacionActual';

/** Bloqueo de visitas fuera de rango (decidido 2026-11-19, ver CLAUDE.md). */
export const RADIO_VISITA_M = 200;
/** Con un error mayor a esto, descontarlo dejaría pasar casi cualquier lugar. */
export const PRECISION_MAXIMA_M = 100;
const TIMEOUT_UBICACION_MS = 15000;

/** Solo se verifican tiendas oficiales de Santiago con coordenadas confiables. */
export function tiendaSeVerifica(t: Tienda) {
  return t.esMinima && !t.agregadaPorVendedor && !t.ubicacionPorConfirmar && t.lat != null && t.lng != null;
}

export type ResultadoRango =
  | { ok: true; ubicacion: UbicacionVisita | null }
  | { ok: false; ubicacion: UbicacionVisita | null; fuera: Omit<FueraDeRango, 'justificacion'> };

export async function verificarRango(t: Tienda): Promise<ResultadoRango> {
  const u = await obtenerUbicacionPrecisa(TIMEOUT_UBICACION_MS);
  if (!u) return { ok: false, ubicacion: null, fuera: { motivo: 'sin_ubicacion', distanciaM: null, precisionM: null } };

  const distanciaM = Math.round(calcularDistanciaKm(u.lat, u.lng, t.lat!, t.lng!) * 1000);
  const precisionM = u.precisionM != null ? Math.round(u.precisionM) : null;
  const ubicacion: UbicacionVisita = { lat: u.lat, lng: u.lng, precisionM: u.precisionM, distanciaTiendaM: distanciaM };

  if (precisionM == null || precisionM > PRECISION_MAXIMA_M) {
    return { ok: false, ubicacion, fuera: { motivo: 'imprecisa', distanciaM, precisionM } };
  }
  if (distanciaM - precisionM > RADIO_VISITA_M) {
    return { ok: false, ubicacion, fuera: { motivo: 'lejos', distanciaM, precisionM } };
  }
  return { ok: true, ubicacion };
}

export function formatearMetros(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`;
}

export function textoFueraDeRango(f: Pick<FueraDeRango, 'motivo' | 'distanciaM' | 'precisionM'>) {
  if (f.motivo === 'sin_ubicacion') return 'No se pudo obtener la ubicación';
  if (f.motivo === 'imprecisa') return `GPS impreciso (±${f.precisionM ?? '?'} m)`;
  return `A ${formatearMetros(f.distanciaM ?? 0)} de la tienda (±${f.precisionM ?? '?'} m)`;
}
