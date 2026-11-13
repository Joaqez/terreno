import { create } from 'zustand';
import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, where, type Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { escribirConCola, guardarCache, leerCache, reintentarPendientes } from './offline';
import { JornadaVendedor, Tienda, Vendedor, Visita } from '../types';

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

const tiendasCol = collection(db, 'tiendas');
const jornadasCol = collection(db, 'jornadas');
const visitasCol = collection(db, 'visitas');
const vendedoresCol = collection(db, 'vendedores');

export function idJornadaDeHoy(vendedorId: string) {
  const hoy = new Date().toISOString().slice(0, 10);
  return `${vendedorId}_${hoy}`;
}

/** Referencia a la suscripción en vivo de `tiendas`, para poder cortarla al
 * cerrar sesión (si no, un segundo login en el mismo dispositivo apilaría
 * un listener nuevo cada vez). */
let unsubTiendas: Unsubscribe | null = null;

interface TerrenoState {
  vendedor: Vendedor;
  tiendas: Tienda[];
  jornada: JornadaVendedor | null;
  visitas: Visita[];
  borrador: BorradorVisita | null;
  cargandoInicial: boolean;
  /** Lista de vendedores para el panel de administración (asignar tiendas,
   * editar rol/meta) — no se carga en el arranque normal, solo cuando se
   * entra a esa sección. */
  vendedoresDisponibles: Vendedor[];

  /** Vuelca a `vendedor` los datos del usuario ya autenticado en Firebase Auth
   * (el nombre viene del "display name" configurado al crear la cuenta en la
   * consola). Se llama desde App.tsx cuando `onAuthStateChanged` entrega un
   * usuario válido, antes de `inicializar()`. */
  setVendedorAutenticado: (usuario: { uid: string; email: string | null; displayName: string | null }) => void;
  /** Limpia el estado local al cerrar sesión — no borra nada de Firestore. */
  cerrarSesionLocal: () => void;

  inicializar: () => Promise<void>;
  iniciarJornada: (km: number, fotoUrl: string) => void;
  finalizarJornada: (km: number, fotoUrl: string) => void;
  agregarTiendaCreadaPorVendedor: (tienda: Omit<Tienda, 'id' | 'esMinima' | 'distanciaKm'>) => void;
  registrarVisita: (visita: Omit<Visita, 'id' | 'vendedorId' | 'jornadaId'>) => void;
  marcarGestionRapida: (tiendaId: string, motivo: string) => void;

  iniciarBorrador: (tiendaId: string) => void;
  actualizarBorrador: (cambios: Partial<BorradorVisita>) => void;
  finalizarBorrador: (observaciones?: string) => void;

  /** Panel de administración (solo para vendedor.rol === 'supervisor'). */
  cargarVendedores: () => Promise<void>;
  actualizarTienda: (tiendaId: string, cambios: Partial<Omit<Tienda, 'id'>>) => void;
  actualizarVendedor: (vendedorId: string, cambios: Partial<Pick<Vendedor, 'rol' | 'minimoDiario' | 'nombre'>>) => void;
}

export const useTerrenoStore = create<TerrenoState>((set, get) => ({
  vendedor: vendedorVacio,
  tiendas: [],
  jornada: null,
  visitas: [],
  borrador: null,
  cargandoInicial: true,
  vendedoresDisponibles: [],

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
    set({
      vendedor: vendedorVacio,
      tiendas: [],
      jornada: null,
      visitas: [],
      borrador: null,
      cargandoInicial: true,
      vendedoresDisponibles: [],
    });
  },

  inicializar: async () => {
    const vendedorId = get().vendedor.id;

    // Caché local primero: no depende de señal. Si no hay conexión, esto es
    // todo lo que el vendedor va a ver hasta que vuelva — mejor eso que un
    // spinner infinito esperando una respuesta que puede no llegar.
    const cache = await leerCache(vendedorId);
    if (cache) {
      set({ tiendas: cache.tiendas, jornada: cache.jornada, visitas: cache.visitas });
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

  iniciarJornada: (km, fotoUrl) => {
    const vendedorId = get().vendedor.id;
    const jornada: JornadaVendedor = {
      id: idJornadaDeHoy(vendedorId),
      vendedorId,
      fecha: new Date().toISOString().slice(0, 10),
      kmInicio: { km, fotoUrl, hora: new Date().toISOString() },
      horaInicio: new Date().toISOString(),
      tiendaIds: get().tiendas.filter((t) => t.esMinima).map((t) => t.id),
      visitaIds: [],
    };
    set({ jornada });
    escribirConCola('jornadas', jornada.id, 'set', jornada);
  },

  finalizarJornada: (km, fotoUrl) => {
    const jornada = get().jornada;
    if (!jornada) return;
    const cambios = {
      kmFinal: { km, fotoUrl, hora: new Date().toISOString() },
      horaFin: new Date().toISOString(),
    };
    set({ jornada: { ...jornada, ...cambios } });
    escribirConCola('jornadas', jornada.id, 'update', cambios);
  },

  agregarTiendaCreadaPorVendedor: (tienda) => {
    const ref = doc(tiendasCol);
    const nueva: Tienda = { ...tienda, id: ref.id, esMinima: false, distanciaKm: null, agregadaPorVendedor: true };
    set({ tiendas: [...get().tiendas, nueva] });
    escribirConCola('tiendas', nueva.id, 'set', nueva);

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

  cargarVendedores: async () => {
    const snap = await getDocs(vendedoresCol);
    set({ vendedoresDisponibles: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Vendedor) });
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
    (estado.tiendas !== anterior.tiendas || estado.jornada !== anterior.jornada || estado.visitas !== anterior.visitas)
  ) {
    guardarCache(estado.vendedor.id, { tiendas: estado.tiendas, jornada: estado.jornada, visitas: estado.visitas });
  }
});
