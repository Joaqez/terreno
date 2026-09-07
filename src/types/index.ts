/**
 * Modelo de dominio de Terreno.
 * Refleja las reglas de negocio validadas en el mockup + el feedback de la
 * reunión del 2026-09-07 (ver CLAUDE.md para el detalle de cada regla).
 */

export type TipoNegocio =
  | 'Minimarket'
  | 'Almacén de barrio'
  | 'Botillería'
  | 'Supermercado'
  | 'Farmacia'
  | 'Otro';

/** Cómo se decidió el tipo de visita, y si fue presencial o gestión rápida. */
export type TipoVisita = 'venta' | 'mantencion';
export type ModoVisita = 'presencial' | 'rapida';

export type TipoVenta = 'nueva' | 'acordada';

export interface Tienda {
  id: string;
  nombre: string;
  direccion: string;
  comuna: string;
  tipoNegocio: TipoNegocio;
  telefono?: string;
  contacto?: string;
  notas?: string;
  /** true = viene de la ruta mínima asignada por la empresa; false = agregada por el vendedor */
  esMinima: boolean;
  /** distancia en km desde la posición actual del vendedor; null si aún no se calcula (tienda recién creada) */
  distanciaKm: number | null;
  /** coordenadas para "cómo llegar" (Waze / Google Maps) */
  lat?: number;
  lng?: number;
}

export interface RegistroKilometraje {
  km: number;
  fotoUrl: string;
  hora: string; // ISO
}

export interface Visita {
  id: string;
  tiendaId: string;
  vendedorId: string;
  modo: ModoVisita;

  // Presente solo si modo === 'presencial'
  tipo?: TipoVisita;
  tipoVenta?: TipoVenta;
  numeroFactura?: string;
  fotoAntesUrl?: string;
  fotoDespuesUrl?: string;
  observaciones?: string;

  // Presente solo si modo === 'rapida'
  motivoGestionRapida?: string;

  horaInicio: string; // ISO
  horaFin: string; // ISO
}

export interface JornadaVendedor {
  id: string;
  vendedorId: string;
  fecha: string; // YYYY-MM-DD
  kmInicio?: RegistroKilometraje;
  kmFinal?: RegistroKilometraje;
  horaInicio?: string; // ISO
  horaFin?: string; // ISO
  tiendaIds: string[]; // ruta del día (mínimas + agregadas)
  visitaIds: string[];
}

export interface Vendedor {
  id: string;
  nombre: string;
  email: string;
}
