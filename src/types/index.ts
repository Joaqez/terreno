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

/** Producto del catálogo para armar pedidos (colección `productos`, doc id = SKU). */
export interface Producto {
  id: string;
  nombre: string;
  sku: string;
  marca: string;
}

/** Línea de un pedido. Copia nombre/sku para que el pedido siga legible si el producto cambia o se borra del catálogo. */
export interface ItemPedido {
  productoId: string;
  nombre: string;
  sku: string;
  cantidad: number;
}

/** Producto presente en la tienda (sin cantidad). Copia nombre/sku por lo mismo que ItemPedido. */
export interface ItemInventario {
  productoId: string;
  nombre: string;
  sku: string;
}

/**
 * Qué productos hay en la tienda al llegar (2026-11-18), justo después de la
 * foto de antes. Solo presencia, sin cantidades. Ojo: va anidado en Firestore,
 * así que ningún campo puede quedar `undefined`.
 */
export interface InventarioTienda {
  exhibidor: ItemInventario[];
  /** Vacío si `bodegaRevisada` es false. */
  bodega: ItemInventario[];
  /** false = "No pude revisar la bodega" (no es lo mismo que bodega vacía). */
  bodegaRevisada: boolean;
}

/** Último inventario registrado en una tienda: precarga la visita siguiente y se ve en el panel. */
export interface UltimoInventario extends InventarioTienda {
  fecha: string; // ISO
  visitaId: string;
  vendedorId: string;
}

/**
 * Jefe/encargado de una tienda (colección `jefesTienda`). Vive aparte de la
 * visita porque cambian seguido y se reutilizan entre visitas: la visita solo
 * guarda con cuál se habló. Los vendedores los crean, editan y dan de baja
 * desde la visita; dar de baja no borra el documento (queda en el historial).
 */
export interface JefeTienda {
  id: string;
  tiendaId: string;
  nombre: string;
  telefono?: string;
  email?: string;
  /** false = "Ya no trabaja aquí": se oculta de la visita pero sigue en el historial del panel. */
  activo: boolean;
  /** 'importado' = cargado desde el contacto que traía el Excel de tiendas (2026-11-16). */
  origen: 'importado' | 'vendedor';
  creadoPorId?: string;
  creadoEn: string; // ISO
  actualizadoPorId?: string;
  actualizadoEn?: string; // ISO
  bajaPorId?: string;
  bajaEn?: string; // ISO
}

/** Pregunta del checklist de mantención del exhibidor (colección
 * `preguntasMantencion`). La editan los supervisores desde el panel. */
export interface PreguntaMantencion {
  id: string;
  texto: string;
  /** Orden en que se muestra (ascendente). */
  orden: number;
  /** false = no se pregunta en visitas nuevas (se conserva para no perder el historial). */
  activa: boolean;
}

export type RespuestaChecklist = 'si' | 'no' | 'na';

/** Respuesta guardada en la visita. Copia el texto de la pregunta para que
 * siga legible si la pregunta se edita o se desactiva después. */
export interface ItemChecklist {
  preguntaId: string;
  pregunta: string;
  respuesta: RespuestaChecklist;
  /** Cuál es el problema. Obligatorio si la respuesta es "No"; solo existe en ese caso. */
  comentario?: string;
}

/** Dónde estaba el vendedor al empezar la visita (respaldo + sirve para
 * corregir coordenadas de tiendas mal ubicadas). */
export interface UbicacionVisita {
  lat: number;
  lng: number;
  precisionM: number | null;
  /** Distancia a la tienda en metros; null si la tienda no tiene coordenadas. */
  distanciaTiendaM: number | null;
}

/** Visita iniciada con "Iniciar igual" sin estar dentro del rango de la tienda
 * (regla del equipo 2026-11-19, ver "Bloqueo de visitas fuera de rango" en CLAUDE.md). */
export interface FueraDeRango {
  /** lejos = a más de 200 m (descontando el error del GPS); imprecisa = el GPS
   * reportó un error mayor a 100 m; sin_ubicacion = sin permiso, sin GPS o no respondió. */
  motivo: 'lejos' | 'imprecisa' | 'sin_ubicacion';
  distanciaM: number | null;
  precisionM: number | null;
  justificacion: string;
}

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
  /** true = las coordenadas son aproximadas (centro de comuna, dirección por km): no se
   * bloquean visitas por distancia hasta que un supervisor fije la ubicación desde una visita. */
  ubicacionPorConfirmar?: boolean;
  /** Se actualiza al finalizar cada visita presencial (ver InventarioScreen). */
  ultimoInventario?: UltimoInventario;
}

export interface Visita {
  id: string;
  tiendaId: string;
  vendedorId: string;
  /** id de la JornadaVendedor a la que pertenece — permite recuperar las visitas del día desde Firestore */
  jornadaId: string;
  modo: ModoVisita;

  // Presente solo si modo === 'presencial'
  /** 'venta' = "Con pedido", 'mantencion' = "Sin pedido" (desde 2026-11-18 la
   * app ya no habla de venta/mantención; el valor interno se mantiene). */
  tipo?: TipoVisita;
  /** Productos solicitados — solo si tipo === 'venta'. */
  pedido?: ItemPedido[];
  /** Checklist de mantención del exhibidor (todas las visitas presenciales desde 2026-11-18). */
  checklist?: ItemChecklist[];
  /** Productos en exhibidor y bodega al llegar (visitas presenciales desde 2026-11-18). */
  inventario?: InventarioTienda;
  ubicacionVendedor?: UbicacionVisita;
  /** Solo si se inició con "Iniciar igual" fuera del rango de la tienda. */
  fueraDeRango?: FueraDeRango;
  fotoAntesUrl?: string;
  fotoDespuesUrl?: string;
  observaciones?: string;
  /** Con qué jefe de tienda se habló. Sin valor = el vendedor tocó "Omitir"
   * (o es una visita anterior a 2026-11-16). El nombre se copia para que siga
   * legible si después se edita el jefe. */
  jefeTiendaId?: string;
  jefeTiendaNombre?: string;

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
