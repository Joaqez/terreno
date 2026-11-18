import { create } from 'zustand';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { escribirConCola, guardarCache, leerCache, reintentarPendientes } from './offline';
import {
  ItemChecklist,
  ItemPedido,
  JefeTienda,
  JornadaVendedor,
  PreguntaMantencion,
  Producto,
  Tienda,
  UbicacionVisita,
  Vendedor,
  Visita,
} from '../types';

/** Datos editables de un jefe de tienda (lo que pide el formulario). */
export type DatosJefeTienda = Pick<JefeTienda, 'nombre' | 'telefono' | 'email'>;

const vendedorVacio: Vendedor = { id: '', nombre: '', email: '', rol: 'vendedor', minimoDiario: 0 };

/**
 * Estado global de la app, con la misma forma que el `state` del mockup
 * interactivo (terreno.html) — se mantiene así a propósito para que sea
 * fácil trazar cada pantalla contra la especificación validada con el equipo.
 *
 * Cada acción actualiza el estado local de inmediato (misma UX que antes,
 * las pantallas no esperan una respuesta de red para navegar) y en paralelo
 * persiste el cambio en Firestore sin bloquear. `inicializar()` se llama una
 * vez al abrir la app: suscribe la lista de tiendas en vivo y, si ya existe
 * una jornada de hoy en Firestore (ej. la app se cerró a mitad del día), la
 * recupera junto con sus visitas en vez de partir de cero.
 */

/** Borrador de la visita presencial en curso: se va llenando pantalla por
 * pantalla (foto antes → jefe de tienda → ¿pedido? → pedido → checklist → foto después
 * → observaciones) y se vuelca a una Visita real recién en "Finalizar visita". */
export interface BorradorVisita {
  tiendaId: string;
  tipo?: 'venta' | 'mantencion';
  pedido?: ItemPedido[];
  fotoAntesUrl?: string;
  fotoDespuesUrl?: string;
  jefeTiendaId?: string;
  jefeTiendaNombre?: string;
  checklist?: ItemChecklist[];
  ubicacionVendedor?: UbicacionVisita;
  horaInicio: string;
}

const tiendasCol = collection(db, 'tiendas');
const jornadasCol = collection(db, 'jornadas');
const visitasCol = collection(db, 'visitas');
const vendedoresCol = collection(db, 'vendedores');
const productosCol = collection(db, 'productos');
const jefesTiendaCol = collection(db, 'jefesTienda');
const preguntasCol = collection(db, 'preguntasMantencion');

export function idJornadaDeHoy(vendedorId: string) {
  const hoy = new Date().toISOString().slice(0, 10);
  return `${vendedorId}_${hoy}`;
}

/** Referencia a la suscripción en vivo de `tiendas`, para poder cortarla al
 * cerrar sesión (si no, un segundo login en el mismo dispositivo apilaría
 * un listener nuevo cada vez). */
let unsubTiendas: Unsubscribe | null = null;
let unsubProductos: Unsubscribe | null = null;
let unsubJefes: Unsubscribe | null = null;
let unsubPreguntas: Unsubscribe | null = null;

interface TerrenoState {
  vendedor: Vendedor;
  tiendas: Tienda[];
  productos: Producto[];
  /** Todos los jefes de tienda (activos y dados de baja) de todas las tiendas. */
  jefesTienda: JefeTienda[];
  /** Checklist de mantención, ordenado por `orden` (activas e inactivas). */
  preguntasMantencion: PreguntaMantencion[];
  jornada: JornadaVendedor | null;
  visitas: Visita[];
  borrador: BorradorVisita | null;
  cargandoInicial: boolean;
  /** Lista de vendedores para el panel de administración (asignar tiendas,
   * editar rol/meta) — no se carga en el arranque normal, solo cuando se
   * entra a esa sección. */
  vendedoresDisponibles: Vendedor[];
  /** Visitas de todos los vendedores, para revisarlas desde el panel de administración. */
  visitasAdmin: Visita[];
  cargandoVisitasAdmin: boolean;

  /** Vuelca a `vendedor` los datos del usuario ya autenticado en Firebase Auth
   * (el nombre viene del "display name" configurado al crear la cuenta en la
   * consola). Se llama desde App.tsx cuando `onAuthStateChanged` entrega un
   * usuario válido, antes de `inicializar()`. */
  setVendedorAutenticado: (usuario: { uid: string; email: string | null; displayName: string | null }) => void;
  /** Limpia el estado local al cerrar sesión — no borra nada de Firestore. */
  cerrarSesionLocal: () => void;

  inicializar: () => Promise<void>;
  iniciarJornada: () => void;
  finalizarJornada: () => void;
  agregarTiendaCreadaPorVendedor: (tienda: Omit<Tienda, 'id' | 'esMinima' | 'distanciaKm'>) => void;
  registrarVisita: (visita: Omit<Visita, 'id' | 'vendedorId' | 'jornadaId'>) => void;
  marcarGestionRapida: (tiendaId: string, motivo: string) => void;

  /** Jefes de tienda: los vendedores los crean, editan y dan de baja desde la visita. */
  crearJefeTienda: (tiendaId: string, datos: DatosJefeTienda) => JefeTienda;
  actualizarJefeTienda: (jefeId: string, datos: DatosJefeTienda) => void;
  darDeBajaJefeTienda: (jefeId: string) => void;
  reactivarJefeTienda: (jefeId: string) => void;

  /** Checklist de mantención (panel de administración). */
  crearPreguntaMantencion: (texto: string) => void;
  actualizarPreguntaMantencion: (id: string, cambios: Partial<Pick<PreguntaMantencion, 'texto' | 'activa'>>) => void;
  moverPreguntaMantencion: (id: string, direccion: -1 | 1) => void;

  iniciarBorrador: (tiendaId: string) => void;
  actualizarBorrador: (cambios: Partial<BorradorVisita>) => void;
  finalizarBorrador: (observaciones?: string) => void;

  /** Panel de administración (solo para vendedor.rol === 'supervisor'). */
  cargarVendedores: () => Promise<void>;
  cargarVisitasAdmin: () => Promise<void>;
  actualizarTienda: (tiendaId: string, cambios: Partial<Omit<Tienda, 'id'>>) => void;
  actualizarVendedor: (vendedorId: string, cambios: Partial<Pick<Vendedor, 'rol' | 'minimoDiario' | 'nombre'>>) => void;
}

export const useTerrenoStore = create<TerrenoState>((set, get) => ({
  vendedor: vendedorVacio,
  tiendas: [],
  productos: [],
  jefesTienda: [],
  preguntasMantencion: [],
  jornada: null,
  visitas: [],
  borrador: null,
  cargandoInicial: true,
  vendedoresDisponibles: [],
  visitasAdmin: [],
  cargandoVisitasAdmin: false,

  setVendedorAutenticado: (usuario) => {
    set({
      vendedor: {
        id: usuario.uid,
        nombre: usuario.displayName || usuario.email || 'Vendedor',
        email: usuario.email ?? '',
        rol: 'vendedor',
        minimoDiario: 0,
      },
    });
  },

  cerrarSesionLocal: () => {
    unsubTiendas?.();
    unsubTiendas = null;
    unsubProductos?.();
    unsubProductos = null;
    unsubJefes?.();
    unsubJefes = null;
    unsubPreguntas?.();
    unsubPreguntas = null;
    set({
      vendedor: vendedorVacio,
      tiendas: [],
      productos: [],
      jefesTienda: [],
      preguntasMantencion: [],
      jornada: null,
      visitas: [],
      borrador: null,
      cargandoInicial: true,
      vendedoresDisponibles: [],
      visitasAdmin: [],
    });
  },

  inicializar: async () => {
    const vendedorId = get().vendedor.id;

    // Caché local primero: no depende de señal. Si no hay conexión, esto es
    // todo lo que el vendedor va a ver hasta que vuelva — mejor eso que un
    // spinner infinito esperando una respuesta que puede no llegar.
    const cache = await leerCache(vendedorId);
    if (cache) {
      set({
        tiendas: cache.tiendas,
        productos: cache.productos ?? [],
        jefesTienda: cache.jefesTienda ?? [],
        preguntasMantencion: cache.preguntasMantencion ?? [],
        jornada: cache.jornada,
        visitas: cache.visitas,
      });
    }
    set({ cargandoInicial: false });

    // Reintenta escrituras que quedaron pendientes de una sesión anterior
    // sin señal (no bloquea, no hace falta esperarla).
    reintentarPendientes();

    try {
      // Lista de tiendas en vivo: refleja altas propias y cambios hechos
      // desde la consola de Firebase o (más adelante) un panel de supervisores.
      unsubTiendas?.();
      unsubTiendas = onSnapshot(tiendasCol, (snap) => {
        set({ tiendas: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tienda) });
      });
      unsubProductos?.();
      unsubProductos = onSnapshot(productosCol, (snap) => {
        set({
          productos: snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Producto)
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        });
      });
      unsubJefes?.();
      unsubJefes = onSnapshot(jefesTiendaCol, (snap) => {
        set({
          jefesTienda: snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as JefeTienda)
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        });
      });
      unsubPreguntas?.();
      unsubPreguntas = onSnapshot(preguntasCol, (snap) => {
        set({
          preguntasMantencion: snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as PreguntaMantencion)
            .sort((a, b) => a.orden - b.orden),
        });
      });

      // Perfil del vendedor (rol, meta diaria) — vive aparte de Firebase Auth
      // porque Auth no tiene "rol" ni lo necesita el panel de administración
      // para listar vendedores. Si es la primera vez que esta cuenta entra,
      // se crea con los valores por defecto (rol vendedor, sin meta fijada).
      const perfilRef = doc(vendedoresCol, vendedorId);
      const perfilSnap = await getDoc(perfilRef);
      const vendedorActual = get().vendedor;
      if (perfilSnap.exists()) {
        const perfil = perfilSnap.data() as Partial<Vendedor>;
        set({ vendedor: { ...vendedorActual, rol: perfil.rol ?? 'vendedor', minimoDiario: perfil.minimoDiario ?? 0 } });
      } else {
        const perfilNuevo: Omit<Vendedor, 'id'> = {
          nombre: vendedorActual.nombre,
          email: vendedorActual.email,
          rol: 'vendedor',
          minimoDiario: 0,
        };
        await setDoc(perfilRef, perfilNuevo);
      }

      // Si ya existe una jornada de hoy en Firestore (ej. la app se cerró a
      // mitad del día y se volvió a abrir), la recuperamos junto a sus
      // visitas en vez de quedarnos solo con lo que había en caché. Si NO
      // existe, hay que limpiar explícitamente `jornada`/`visitas` — si no,
      // se queda mostrando lo que trajo la caché de un día anterior (bug
      // real encontrado 2026-09-15: al loguearse un día nuevo sin haber
      // iniciado jornada todavía, aparecían visitas de días previos).
      const idHoy = idJornadaDeHoy(vendedorId);
      const jornadaSnap = await getDoc(doc(jornadasCol, idHoy));
      if (jornadaSnap.exists()) {
        const jornada = jornadaSnap.data() as JornadaVendedor;
        const visitasSnap = await getDocs(query(visitasCol, where('jornadaId', '==', jornada.id)));
        set({
          jornada,
          visitas: visitasSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Visita),
        });
      } else if (get().jornada?.id !== idHoy) {
        // La caché tenía una jornada que no es la de hoy (de otro día) — se limpia.
        set({ jornada: null, visitas: [] });
      }
    } catch (err) {
      // Sin señal, típicamente — la app ya sigue andando con lo que había
      // en caché; esto se reintenta solo la próxima vez que se abra.
      console.error('No se pudo sincronizar con Firestore al iniciar', err);
    }
  },

  iniciarJornada: () => {
    const vendedorId = get().vendedor.id;
    const jornada: JornadaVendedor = {
      id: idJornadaDeHoy(vendedorId),
      vendedorId,
      fecha: new Date().toISOString().slice(0, 10),
      horaInicio: new Date().toISOString(),
      tiendaIds: get()
        .tiendas.filter((t) => t.esMinima && t.vendedorAsignadoId === vendedorId)
        .map((t) => t.id),
      visitaIds: [],
    };
    set({ jornada });
    escribirConCola('jornadas', jornada.id, 'set', jornada);
  },

  finalizarJornada: () => {
    const jornada = get().jornada;
    if (!jornada) return;
    const cambios = { horaFin: new Date().toISOString() };
    set({ jornada: { ...jornada, ...cambios } });
    escribirConCola('jornadas', jornada.id, 'update', cambios);
  },

  agregarTiendaCreadaPorVendedor: (tienda) => {
    const ref = doc(tiendasCol);
    const nueva: Tienda = { ...tienda, id: ref.id, esMinima: false, distanciaKm: null, agregadaPorVendedor: true };
    set({ tiendas: [...get().tiendas, nueva] });
    escribirConCola('tiendas', nueva.id, 'set', nueva);
    // El contacto que se anota al crear la tienda pasa a ser su primer jefe de tienda.
    if (tienda.contacto) {
      get().crearJefeTienda(nueva.id, { nombre: tienda.contacto, telefono: tienda.telefono });
    }

    const jornada = get().jornada;
    if (jornada) {
      const tiendaIds = [...jornada.tiendaIds, nueva.id];
      set({ jornada: { ...jornada, tiendaIds } });
      escribirConCola('jornadas', jornada.id, 'update', { tiendaIds });
    }
  },

  registrarVisita: (visita) => {
    const jornada = get().jornada;
    const ref = doc(visitasCol);
    const nueva: Visita = {
      ...visita,
      id: ref.id,
      vendedorId: get().vendedor.id,
      jornadaId: jornada?.id ?? '',
    };
    set({ visitas: [...get().visitas, nueva] });
    escribirConCola('visitas', nueva.id, 'set', nueva);

    if (jornada) {
      const visitaIds = [...jornada.visitaIds, nueva.id];
      set({ jornada: { ...jornada, visitaIds } });
      escribirConCola('jornadas', jornada.id, 'update', { visitaIds });
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

  crearJefeTienda: (tiendaId, datos) => {
    const ref = doc(jefesTiendaCol);
    const nuevo: JefeTienda = {
      id: ref.id,
      tiendaId,
      nombre: datos.nombre.trim(),
      telefono: datos.telefono?.trim() || undefined,
      email: datos.email?.trim() || undefined,
      activo: true,
      origen: 'vendedor',
      creadoPorId: get().vendedor.id,
      creadoEn: new Date().toISOString(),
    };
    set({ jefesTienda: [...get().jefesTienda, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)) });
    escribirConCola('jefesTienda', nuevo.id, 'set', nuevo);
    return nuevo;
  },

  actualizarJefeTienda: (jefeId, datos) => {
    // Vacío = '' (no undefined): la cola descarta los undefined y entonces
    // borrar un teléfono no llegaría nunca a Firestore.
    const cambios = {
      nombre: datos.nombre.trim(),
      telefono: datos.telefono?.trim() ?? '',
      email: datos.email?.trim() ?? '',
      actualizadoPorId: get().vendedor.id,
      actualizadoEn: new Date().toISOString(),
    };
    set({ jefesTienda: get().jefesTienda.map((j) => (j.id === jefeId ? { ...j, ...cambios } : j)) });
    escribirConCola('jefesTienda', jefeId, 'update', cambios);
  },

  darDeBajaJefeTienda: (jefeId) => {
    const cambios = { activo: false, bajaPorId: get().vendedor.id, bajaEn: new Date().toISOString() };
    set({ jefesTienda: get().jefesTienda.map((j) => (j.id === jefeId ? { ...j, ...cambios } : j)) });
    escribirConCola('jefesTienda', jefeId, 'update', cambios);
  },

  reactivarJefeTienda: (jefeId) => {
    // '' en vez de undefined, por el mismo motivo que en actualizarJefeTienda.
    const cambios = { activo: true, bajaPorId: '', bajaEn: '' };
    set({ jefesTienda: get().jefesTienda.map((j) => (j.id === jefeId ? { ...j, ...cambios } : j)) });
    escribirConCola('jefesTienda', jefeId, 'update', cambios);
  },

  crearPreguntaMantencion: (texto) => {
    const ref = doc(preguntasCol);
    const preguntas = get().preguntasMantencion;
    const nueva: PreguntaMantencion = {
      id: ref.id,
      texto: texto.trim(),
      orden: preguntas.length ? Math.max(...preguntas.map((p) => p.orden)) + 1 : 1,
      activa: true,
    };
    set({ preguntasMantencion: [...preguntas, nueva] });
    escribirConCola('preguntasMantencion', nueva.id, 'set', nueva);
  },

  actualizarPreguntaMantencion: (id, cambios) => {
    const limpios = cambios.texto != null ? { ...cambios, texto: cambios.texto.trim() } : cambios;
    set({ preguntasMantencion: get().preguntasMantencion.map((p) => (p.id === id ? { ...p, ...limpios } : p)) });
    escribirConCola('preguntasMantencion', id, 'update', limpios);
  },

  moverPreguntaMantencion: (id, direccion) => {
    const lista = [...get().preguntasMantencion];
    const i = lista.findIndex((p) => p.id === id);
    const j = i + direccion;
    if (i < 0 || j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    // Renumera todo 1..n: deja el orden limpio aunque haya habido empates.
    const renumeradas = lista.map((p, k) => ({ ...p, orden: k + 1 }));
    const cambiadas = renumeradas.filter((p) => get().preguntasMantencion.find((x) => x.id === p.id)?.orden !== p.orden);
    set({ preguntasMantencion: renumeradas });
    cambiadas.forEach((p) => escribirConCola('preguntasMantencion', p.id, 'update', { orden: p.orden }));
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
      pedido: b.pedido,
      fotoAntesUrl: b.fotoAntesUrl,
      fotoDespuesUrl: b.fotoDespuesUrl,
      jefeTiendaId: b.jefeTiendaId,
      jefeTiendaNombre: b.jefeTiendaNombre,
      checklist: b.checklist,
      ubicacionVendedor: b.ubicacionVendedor,
      observaciones,
      horaInicio: b.horaInicio,
      horaFin: new Date().toISOString(),
    });
    set({ borrador: null });
  },

  cargarVendedores: async () => {
    const snap = await getDocs(vendedoresCol);
    set({ vendedoresDisponibles: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Vendedor) });
  },

  cargarVisitasAdmin: async () => {
    set({ cargandoVisitasAdmin: true });
    try {
      const snap = await getDocs(query(visitasCol, orderBy('horaInicio', 'desc'), limit(1000)));
      set({ visitasAdmin: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Visita) });
    } finally {
      set({ cargandoVisitasAdmin: false });
    }
  },

  actualizarTienda: (tiendaId, cambios) => {
    set({ tiendas: get().tiendas.map((t) => (t.id === tiendaId ? { ...t, ...cambios } : t)) });
    escribirConCola('tiendas', tiendaId, 'update', cambios);
  },

  actualizarVendedor: (vendedorId, cambios) => {
    set({
      vendedoresDisponibles: get().vendedoresDisponibles.map((v) => (v.id === vendedorId ? { ...v, ...cambios } : v)),
    });
    if (get().vendedor.id === vendedorId) {
      set({ vendedor: { ...get().vendedor, ...cambios } });
    }
    escribirConCola('vendedores', vendedorId, 'update', cambios);
  },
}));

/** Cachea tiendas/jornada/visitas en disco cada vez que cambian, sin
 * importar qué acción los cambió — así una reapertura sin señal tiene algo
 * que mostrar. Se salta mientras no hay sesión (vendedor.id vacío, ej. justo
 * después de cerrar sesión) para no escribir una entrada de caché vacía. */
useTerrenoStore.subscribe((estado, anterior) => {
  if (
    estado.vendedor.id &&
    (estado.tiendas !== anterior.tiendas ||
      estado.productos !== anterior.productos ||
      estado.jefesTienda !== anterior.jefesTienda ||
      estado.preguntasMantencion !== anterior.preguntasMantencion ||
      estado.jornada !== anterior.jornada ||
      estado.visitas !== anterior.visitas)
  ) {
    guardarCache(estado.vendedor.id, {
      tiendas: estado.tiendas,
      productos: estado.productos,
      jefesTienda: estado.jefesTienda,
      preguntasMantencion: estado.preguntasMantencion,
      jornada: estado.jornada,
      visitas: estado.visitas,
    });
  }
});
