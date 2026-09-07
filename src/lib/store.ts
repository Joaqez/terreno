import { create } from 'zustand';
import { tiendasDemo, vendedorDemo } from '../data/mockData';
import { JornadaVendedor, Tienda, Visita } from '../types';

/**
 * Estado global de la app, con la misma forma que el `state` del mockup
 * interactivo (terreno.html) — se mantiene así a propósito para que sea
 * fácil trazar cada pantalla contra la especificación validada con el equipo.
 *
 * Esto es un store en memoria para poder navegar la app mientras se conecta
 * Firebase de verdad (ver src/lib/firebase.ts). Reemplazar las acciones de
 * abajo por lecturas/escrituras a Firestore es el siguiente paso natural.
 */

/** Borrador de la visita presencial en curso: se va llenando pantalla por
 * pantalla (foto antes → ¿necesita stock? → detalle de venta → foto después
 * → observaciones) y se vuelca a una Visita real recién en "Finalizar visita". */
export interface BorradorVisita {
  tiendaId: string;
  tipo?: 'venta' | 'mantencion';
  tipoVenta?: 'nueva' | 'acordada';
  numeroFactura?: string;
  fotoAntesUrl?: string;
  fotoDespuesUrl?: string;
  horaInicio: string;
}

interface TerrenoState {
  vendedor: typeof vendedorDemo;
  tiendas: Tienda[];
  jornada: JornadaVendedor | null;
  visitas: Visita[];
  borrador: BorradorVisita | null;

  iniciarJornada: (km: number, fotoUrl: string) => void;
  finalizarJornada: (km: number, fotoUrl: string) => void;
  agregarTiendaCreadaPorVendedor: (tienda: Omit<Tienda, 'id' | 'esMinima' | 'distanciaKm'>) => Tienda;
  registrarVisita: (visita: Omit<Visita, 'id' | 'vendedorId'>) => void;
  marcarGestionRapida: (tiendaId: string, motivo: string) => void;

  iniciarBorrador: (tiendaId: string) => void;
  actualizarBorrador: (cambios: Partial<BorradorVisita>) => void;
  finalizarBorrador: (observaciones?: string) => void;
}

export const useTerrenoStore = create<TerrenoState>((set, get) => ({
  vendedor: vendedorDemo,
  tiendas: tiendasDemo,
  jornada: null,
  visitas: [],
  borrador: null,

  iniciarJornada: (km, fotoUrl) => {
    const hoy = new Date().toISOString().slice(0, 10);
    set({
      jornada: {
        id: `j-${Date.now()}`,
        vendedorId: get().vendedor.id,
        fecha: hoy,
        kmInicio: { km, fotoUrl, hora: new Date().toISOString() },
        horaInicio: new Date().toISOString(),
        tiendaIds: get().tiendas.filter((t) => t.esMinima).map((t) => t.id),
        visitaIds: [],
      },
    });
  },

  finalizarJornada: (km, fotoUrl) => {
    const jornada = get().jornada;
    if (!jornada) return;
    set({
      jornada: {
        ...jornada,
        kmFinal: { km, fotoUrl, hora: new Date().toISOString() },
        horaFin: new Date().toISOString(),
      },
    });
  },

  agregarTiendaCreadaPorVendedor: (tienda) => {
    const nueva: Tienda = { ...tienda, id: `nv-${Date.now()}`, esMinima: false, distanciaKm: null };
    set({ tiendas: [...get().tiendas, nueva] });
    const jornada = get().jornada;
    if (jornada) {
      set({ jornada: { ...jornada, tiendaIds: [...jornada.tiendaIds, nueva.id] } });
    }
    return nueva;
  },

  registrarVisita: (visita) => {
    const nueva: Visita = { ...visita, id: `vi-${Date.now()}`, vendedorId: get().vendedor.id };
    set({ visitas: [...get().visitas, nueva] });
    const jornada = get().jornada;
    if (jornada) {
      set({ jornada: { ...jornada, visitaIds: [...jornada.visitaIds, nueva.id] } });
    }
  },

  marcarGestionRapida: (tiendaId, motivo) => {
    get().registrarVisita({
      tiendaId,
      modo: 'rapida',
      motivoGestionRapida: motivo,
      horaInicio: new Date().toISOString(),
      horaFin: new Date().toISOString(),
    });
  },

  iniciarBorrador: (tiendaId) => {
    set({ borrador: { tiendaId, horaInicio: new Date().toISOString() } });
  },

  actualizarBorrador: (cambios) => {
    const actual = get().borrador;
    if (!actual) return;
    set({ borrador: { ...actual, ...cambios } });
  },

  finalizarBorrador: (observaciones) => {
    const b = get().borrador;
    if (!b || !b.tipo) return;
    get().registrarVisita({
      tiendaId: b.tiendaId,
      modo: 'presencial',
      tipo: b.tipo,
      tipoVenta: b.tipoVenta,
      numeroFactura: b.numeroFactura,
      fotoAntesUrl: b.fotoAntesUrl,
      fotoDespuesUrl: b.fotoDespuesUrl,
      observaciones,
      horaInicio: b.horaInicio,
      horaFin: new Date().toISOString(),
    });
    set({ borrador: null });
  },
}));
