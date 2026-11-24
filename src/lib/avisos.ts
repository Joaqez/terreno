import { create } from 'zustand';

export interface Aviso {
  id: number;
  texto: string;
  tono: 'ok' | 'error';
}

/**
 * Avisos cortos que aparecen abajo y se van solos ("Guardado", "No se pudo…")
 * (2026-11-23). Reemplazan el texto suelto en pantalla: Alert.alert no funciona
 * en web, y antes los cambios del panel se guardaban sin decir nada.
 * Las escrituras van primero a la cola offline, así que "Guardado" es cierto
 * aunque no haya señal: se sincroniza solo al volver.
 */
export const useAvisos = create<{ aviso: Aviso | null; cerrar: () => void }>((set) => ({
  aviso: null,
  cerrar: () => set({ aviso: null }),
}));

let temporizador: ReturnType<typeof setTimeout> | null = null;

export function avisar(texto: string, tono: Aviso['tono'] = 'ok') {
  if (temporizador) clearTimeout(temporizador);
  useAvisos.setState({ aviso: { id: Date.now(), texto, tono } });
  temporizador = setTimeout(() => useAvisos.setState({ aviso: null }), tono === 'error' ? 5000 : 2500);
}
