import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { JefeTienda, JornadaVendedor, Producto, Tienda, Visita } from '../types';

/**
 * El SDK de Firebase para JavaScript no soporta persistencia offline real de
 * Firestore en React Native (depende de IndexedDb, que no existe en Hermes).
 * Este módulo es la solución casera para el caso que sí importa acá: que un
 * vendedor sin señal dentro de una tienda pueda seguir registrando su visita
 * sin perder nada si cierra la app antes de que vuelva la conexión.
 *
 * Dos piezas independientes:
 * 1. Caché de lectura (`guardarCache`/`leerCache`): la última foto conocida
 *    de tiendas/jornada/visitas, para que abrir la app sin señal muestre algo
 *    en vez de spinner infinito.
 * 2. Cola de escritura (`escribirConCola`/`reintentarPendientes`): cada
 *    escritura se guarda en disco ANTES de intentarla — si la app se cierra
 *    a mitad de camino, `reintentarPendientes()` la reintenta la próxima vez
 *    que se abre.
 */

function sinUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

// ---- Caché de lectura ----

interface CacheVendedor {
  tiendas: Tienda[];
  /** Opcional: las cachés guardadas antes de existir el catálogo no lo traen. */
  productos?: Producto[];
  /** Opcional por el mismo motivo (no existía antes del 2026-11-16). */
  jefesTienda?: JefeTienda[];
  jornada: JornadaVendedor | null;
  visitas: Visita[];
}

const claveCache = (vendedorId: string) => `terreno:cache:${vendedorId}`;

export async function guardarCache(vendedorId: string, datos: CacheVendedor) {
  try {
    await AsyncStorage.setItem(claveCache(vendedorId), JSON.stringify(datos));
  } catch (err) {
    console.error('No se pudo guardar el caché local', err);
  }
}

export async function leerCache(vendedorId: string): Promise<CacheVendedor | null> {
  try {
    const crudo = await AsyncStorage.getItem(claveCache(vendedorId));
    return crudo ? (JSON.parse(crudo) as CacheVendedor) : null;
  } catch (err) {
    console.error('No se pudo leer el caché local', err);
    return null;
  }
}

// ---- Cola de escritura pendiente ----

interface OperacionPendiente {
  id: string;
  coleccion: string;
  docId: string;
  tipo: 'set' | 'update';
  datos: object;
}

const CLAVE_COLA = 'terreno:cola-pendiente';

async function leerCola(): Promise<OperacionPendiente[]> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE_COLA);
    return crudo ? (JSON.parse(crudo) as OperacionPendiente[]) : [];
  } catch (err) {
    console.error('No se pudo leer la cola de escrituras pendientes', err);
    return [];
  }
}

async function escribirCola(cola: OperacionPendiente[]) {
  try {
    await AsyncStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
  } catch (err) {
    console.error('No se pudo guardar la cola de escrituras pendientes', err);
  }
}

async function quitarDeCola(id: string) {
  const cola = await leerCola();
  await escribirCola(cola.filter((op) => op.id !== id));
}

async function intentar(operacion: OperacionPendiente) {
  try {
    const ref = doc(db, operacion.coleccion, operacion.docId);
    if (operacion.tipo === 'set') {
      await setDoc(ref, operacion.datos);
    } else {
      await updateDoc(ref, operacion.datos);
    }
    await quitarDeCola(operacion.id);
  } catch (err) {
    // Sin señal (u otro error transitorio): queda en la cola, se reintenta
    // en la próxima llamada a reintentarPendientes().
    console.error(`Escritura pendiente (${operacion.coleccion}/${operacion.docId}) — queda en cola`, err);
  }
}

/**
 * Guarda la escritura en disco (para que sobreviva si la app se cierra) y la
 * intenta de inmediato. No bloquea — se llama sin `await` desde las acciones
 * del store, igual que el `enSegundoPlano` que reemplaza.
 */
export async function escribirConCola(coleccion: string, docId: string, tipo: 'set' | 'update', datos: object) {
  const operacion: OperacionPendiente = {
    id: `${coleccion}/${docId}/${Date.now()}`,
    coleccion,
    docId,
    tipo,
    datos: sinUndefined(datos),
  };
  const cola = await leerCola();
  await escribirCola([...cola, operacion]);
  await intentar(operacion);
}

/** Reintenta las escrituras que quedaron pendientes de una sesión anterior
 * (ej. la app se cerró sin señal). Se llama una vez al iniciar sesión. */
export async function reintentarPendientes() {
  const cola = await leerCola();
  for (const operacion of cola) {
    await intentar(operacion);
  }
}
