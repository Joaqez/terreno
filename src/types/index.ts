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
  | 'Estación de servicio'
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
  /** true = viene de la ruta mínima asignada por la empresa (Santiago, visita presencial);
   * false = de región (seguimiento remoto) o agregada por el vendedor — ver `agregadaPorVendedor`. */
  esMinima: boolean;
  /** true = el vendedor la creó sobre la marcha ("Nueva visita"), no viene de la base oficial
   * de la empresa. Distingue esas de las tiendas oficiales de región (ambas tienen esMinima:
   * false, pero son cosas distintas — ver "Tiendas de región" en CLAUDE.md). */
  agregadaPorVendedor?: boolean;
  /** distancia en km desde la posición actual del vendedor; null si aún no se calcula (tienda recién creada) */
  distanciaKm: number | null;
  /** uid del vendedor responsable de esta tienda (panel de administración). Sin asignar todavía
   * no se usa para filtrar "Ruta del día" — ver CLAUDE.md antes de cambiar eso. */
  vendedorAsignadoId?: string;
  /** coordenadas para "cómo llegar" (Waze / Google Maps) */
  lat?: number;
  lng?: number;
}

export interface Visita {
  id: string;
  tiendaId: string;
  vendedorId: string;
  /** id de la JornadaVendedor a la que pertenece — permite recuperar las visitas del día desde Firestore */
  jornadaId: string;
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
  horaInicio?: string; // ISO
  horaFin?: string; // ISO
  tiendaIds: string[]; // ruta del día (mínimas + agregadas)
  visitaIds: string[];
}

export type RolVendedor = 'vendedor' | 'supervisor';

export interface Vendedor {
  id: string;
  nombre: string;
  email: string;
  rol: RolVendedor;
  /** Meta de tiendas a visitar hoy, fijada por un supervisor desde el panel
   * de administración. 0 = sin fijar todavía → se usa el total de tiendas
   * asignadas como meta (ver HomeScreen/ResumenDiaScreen). */
  minimoDiario: number;
}
