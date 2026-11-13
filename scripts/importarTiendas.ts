/**
 * Importa tiendas reales desde el Excel "Consolidado" (hojas Aramco, Shell,
 * Copec Propias, Copec Franquicias — cualquier hoja cuyo nombre contenga
 * "LT") a la colección `tiendas` de Firestore.
 *
 * Reglas:
 * - Solo se importan filas con STATUS "OK" (implementadas) — las "NUEVA"/
 *   "NUEVO"/etc. son tiendas por aperturar, se ignoran.
 * - `esMinima: true` solo para tiendas en la Región Metropolitana/Santiago
 *   (las únicas con visita presencial hoy) — las de región quedan con
 *   `esMinima: false` (no le aparecen a nadie en "Ruta del día" todavía;
 *   sirven para cuando se construya el seguimiento telefónico/mensajería).
 * - Cada tienda importada trae un ID estable (`<cadena>-<código interno>`)
 *   para que re-correr este script con un Excel actualizado actualice en
 *   vez de duplicar.
 * - Todavía NO asigna tiendas a vendedores específicos (pendiente — ver
 *   CLAUDE.md).
 *
 * Uso: npm run importar:tiendas -- "C:\ruta\al\Consolidado.xlsx"
 */
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getFirestore, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { Tienda } from '../src/types';

const rutaExcel = process.argv[2];
if (!rutaExcel) {
  console.error('Uso: npm run importar:tiendas -- "C:\\ruta\\al\\Consolidado.xlsx"');
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error('Faltan variables EXPO_PUBLIC_FIREBASE_* en .env.');
  process.exit(1);
}
if (!process.env.SEED_EMAIL || !process.env.SEED_PASSWORD) {
  console.error('Faltan SEED_EMAIL / SEED_PASSWORD en .env (credenciales de un vendedor ya creado).');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

type TiendaImportada = Omit<Tienda, 'id'> & { idExterno: string; cadena: string; status: string };

// --- helpers ---

/** Los encabezados del Excel a veces traen saltos de línea (ej. "Teléfono\r\nContacto") — busca por coincidencia parcial ignorando eso. */
function campo(fila: Record<string, unknown>, patron: RegExp): unknown {
  const clave = Object.keys(fila).find((k) => patron.test(k.replace(/[\r\n]+/g, ' ')));
  return clave ? fila[clave] : undefined;
}

/** Firestore rechaza `undefined` en un campo (contacto/telefono/notas
 * quedan así cuando la fila del Excel no trae ese dato). */
function sinUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

function texto(v: unknown): string | undefined {
  const s = String(v ?? '').trim();
  return s ? s : undefined;
}

function notasDe(partes: Array<[string, unknown]>): string | undefined {
  const listadas = partes
    .map(([etiqueta, valor]) => (texto(valor) ? `${etiqueta}: ${texto(valor)}` : null))
    .filter((x): x is string => x !== null);
  return listadas.length ? listadas.join(' · ') : undefined;
}

function esRM(region: unknown, zonaPais?: unknown): boolean {
  const r = String(region ?? '').trim().toUpperCase();
  if (r === 'METROPOLITANA' || r === 'XIII' || r === '13') return true;
  return String(zonaPais ?? '').trim().toUpperCase() === 'SANTIAGO';
}

// --- mapeo por hoja ---

function mapearAramco(fila: Record<string, unknown>): TiendaImportada | null {
  const status = texto(campo(fila, /^STATUS$/i));
  if (!status) return null;
  const idExterno = texto(fila['GLA']);
  if (!idExterno) return null;
  return {
    idExterno,
    cadena: 'aramco',
    status,
    nombre: `${texto(fila['EDS']) ?? 'Sin nombre'} (Aramco)`,
    direccion: texto(fila['Dirección']) ?? '',
    comuna: texto(fila['Comuna']) ?? '',
    tipoNegocio: 'Estación de servicio',
    contacto: texto(fila['Operador/Contacto/Supervisor']) ?? texto(fila['Nombre']),
    telefono: texto(campo(fila, /tel.fono.*contacto/i)),
    notas: notasDe([
      ['RUT', fila['RUT']],
      ['Razón social', fila['Razón Social']],
      ['Tipo', fila['TIPO_EDS']],
      ['Email', fila['E-mail Contacto']],
    ]),
    esMinima: esRM(fila['Región']),
    distanciaKm: null,
  };
}

function mapearShell(fila: Record<string, unknown>): TiendaImportada | null {
  const status = texto(campo(fila, /^STATUS$/i));
  if (!status) return null;
  const idExterno = texto(fila['File']);
  if (!idExterno) return null;
  return {
    idExterno,
    cadena: 'shell',
    status,
    nombre: `${texto(fila['Nombre Tienda']) ?? 'Sin nombre'} (Shell)`,
    direccion: texto(fila['Dirección']) ?? '',
    comuna: texto(fila['Comuna']) ?? '',
    tipoNegocio: 'Estación de servicio',
    contacto: texto(fila['Encargado Tienda']),
    telefono: texto(fila['Contacto']),
    notas: notasDe([
      ['RUT', fila['RUT']],
      ['Razón social', fila['Razón Social']],
      ['Formato', fila['Formato']],
      ['Operación', fila['Operación']],
      ['Jefe de zona', fila['Jefe de Zona']],
      ['Sub gerente', fila['Sub Gerente']],
      ['Correo', fila['Correo']],
      ['Observación', fila['Observación']],
      ['Encargado interno', fila['ENCARGADO']],
    ]),
    esMinima: esRM(fila['Región']),
    distanciaKm: null,
  };
}

function mapearCopecPropias(fila: Record<string, unknown>): TiendaImportada | null {
  const status = texto(campo(fila, /^STATUS$/i));
  if (!status) return null;
  const idExterno = texto(fila['Código EDS Copec']) ?? texto(fila['CC']);
  if (!idExterno) return null;
  return {
    idExterno,
    cadena: 'copec',
    status,
    nombre: `${texto(fila['Nombre Local']) ?? 'Sin nombre'} (Copec)`,
    direccion: texto(fila['Dirección']) ?? '',
    comuna: texto(fila['Ciudad o Localidad asociada']) ?? texto(fila['Sector']) ?? '',
    tipoNegocio: 'Estación de servicio',
    contacto: texto(fila['JOP']),
    telefono: undefined,
    notas: notasDe([
      ['Formato', fila['Formato']],
      ['Subformato', fila['Subformato']],
      ['Estado apertura', fila['Estado']],
      ['Apertura inicial', fila['Apertura Inicial']],
      ['Zona país', fila['Zona País']],
      ['Sector', fila['Sector']],
    ]),
    esMinima: esRM(undefined, fila['Zona País']),
    distanciaKm: null,
  };
}

function mapearCopecFranquicias(fila: Record<string, unknown>): TiendaImportada | null {
  const status = texto(campo(fila, /^STATUS$/i));
  if (!status) return null;
  const idExterno = texto(fila['EDS']) ?? texto(fila['N°']);
  if (!idExterno) return null;
  return {
    idExterno,
    cadena: 'copec-franquicia',
    status,
    nombre: `EDS ${idExterno} — ${texto(fila['Comuna']) ?? texto(fila['Provincia']) ?? 'sin comuna'} (Copec)`,
    direccion: texto(fila['Dirección']) ?? '',
    comuna: texto(fila['Comuna']) ?? '',
    tipoNegocio: 'Estación de servicio',
    contacto: undefined,
    telefono: undefined,
    notas: notasDe([
      ['RUT', fila['RUT']],
      ['Razón social', fila['Razón Social']],
      ['Zona', fila['Zona']],
      ['Provincia', fila['Provincia']],
    ]),
    esMinima: esRM(fila['Región']),
    distanciaKm: null,
  };
}

const MAPEADORES: Record<string, (fila: Record<string, unknown>) => TiendaImportada | null> = {
  'LT ARAMCO': mapearAramco,
  'LT SHELL': mapearShell,
  'LT COPEC PROPIAS': mapearCopecPropias,
  'LT COPEC FRANQUICIAS': mapearCopecFranquicias,
};

async function main() {
  await signInWithEmailAndPassword(auth, process.env.SEED_EMAIL!, process.env.SEED_PASSWORD!);

  const libro = XLSX.readFile(rutaExcel);
  let totalOk = 0;
  let totalIgnoradas = 0;
  let totalRM = 0;
  let totalRegion = 0;

  for (const nombreHoja of libro.SheetNames) {
    if (!nombreHoja.toUpperCase().includes('LT')) continue;
    const mapeador = MAPEADORES[nombreHoja.toUpperCase()];
    if (!mapeador) {
      console.warn(`Hoja "${nombreHoja}" tiene "LT" en el nombre pero no tengo un mapeo para ella — se salta.`);
      continue;
    }

    const filas = XLSX.utils.sheet_to_json(libro.Sheets[nombreHoja]) as Record<string, unknown>[];
    for (const fila of filas) {
      const tienda = mapeador(fila);
      if (!tienda) continue;
      if (tienda.status.trim().toUpperCase() !== 'OK') {
        totalIgnoradas++;
        continue;
      }

      const { idExterno, cadena, status, ...datosTienda } = tienda;
      const idDoc = `${cadena}-${idExterno}`;
      await setDoc(doc(db, 'tiendas', idDoc), sinUndefined(datosTienda), { merge: true });

      totalOk++;
      if (datosTienda.esMinima) totalRM++;
      else totalRegion++;
      console.log(`  ${idDoc}: ${datosTienda.nombre} — ${datosTienda.comuna} (${datosTienda.esMinima ? 'RM' : 'región'})`);
    }
  }

  console.log(`\nListo. Importadas: ${totalOk} (RM/esMinima: ${totalRM}, región: ${totalRegion}). Ignoradas (no OK): ${totalIgnoradas}.`);
}

main().catch((err) => {
  console.error('Error importando tiendas', err);
  process.exit(1);
});
