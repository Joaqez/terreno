/**
 * Asigna `vendedorAsignadoId` a tiendas ya existentes según un Excel de
 * asignación (tienda -> nombre de vendedor). Dos formatos de hoja
 * soportados:
 *
 * 1. "Simple": tabla plana con columna VENDEDOR y una columna de código
 *    interno de cadena (ej. "Código EDS Copec", "CC", "GLA", "File", "EDS").
 * 2. "Consolidado": columnas Marca / ID tienda / Vendedor, con 1-2 filas de
 *    resumen antes del encabezado real (se detecta buscando la fila que
 *    tenga "Marca", "ID tienda" y "Vendedor" como valores).
 *
 * El nombre de vendedor del Excel (ej. "SANTIAGO", "BENJA") no es el email
 * de la cuenta — hay que mapearlo a mano en VENDEDOR_A_EMAIL abajo antes de
 * correr esto.
 *
 * No crea tiendas nuevas ni cuentas de vendedor: si el idDoc calculado no
 * existe en `tiendas`, o el vendedor no está mapeado/no tiene cuenta, la
 * fila se omite y se reporta al final — nunca se escribe un doc a medias.
 *
 * Uso: npm run asignar:vendedores -- "C:\ruta\al\excel.xlsx"
 */
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

const rutaExcel = process.argv[2];
if (!rutaExcel) {
  console.error('Uso: npm run asignar:vendedores -- "C:\\ruta\\al\\excel.xlsx"');
  process.exit(1);
}

/** Editar antes de correr: nombre tal como aparece en el Excel -> email real de la cuenta. */
const VENDEDOR_A_EMAIL: Record<string, string> = {
  SANTIAGO: 'shpereznova@gmail.com',
  BENJA: 'benjamin@brand-on.cl',
};

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

interface Asignacion {
  idDoc: string;
  nombreExcel: string;
  vendedorExcel: string;
}

function filasSimple(hoja: XLSX.WorkSheet): Asignacion[] {
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja);
  if (!filas.length || !('VENDEDOR' in filas[0])) return [];
  const columnasId: Array<[string, string]> = [
    ['Código EDS Copec', 'copec'],
    ['CC', 'copec'],
    ['GLA', 'aramco'],
    ['File', 'shell'],
    ['EDS', 'aramco'],
  ];
  const resultado: Asignacion[] = [];
  for (const fila of filas) {
    const vendedor = String(fila['VENDEDOR'] ?? '').trim();
    if (!vendedor) continue;
    for (const [columna, cadena] of columnasId) {
      if (fila[columna] !== undefined && fila[columna] !== '') {
        resultado.push({
          idDoc: `${cadena}-${fila[columna]}`,
          nombreExcel: String(fila['Nombre Local'] ?? fila['Tienda'] ?? ''),
          vendedorExcel: vendedor,
        });
        break;
      }
    }
  }
  return resultado;
}

function filasConsolidado(hoja: XLSX.WorkSheet): Asignacion[] {
  const crudas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1 });
  const idxEncabezado = crudas.findIndex(
    (fila) => fila.includes('Marca') && fila.includes('ID tienda') && fila.includes('Vendedor')
  );
  if (idxEncabezado === -1) return [];
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { range: idxEncabezado });
  const resultado: Asignacion[] = [];
  for (const fila of filas) {
    const marca = String(fila['Marca'] ?? '').trim();
    const idTienda = fila['ID tienda'];
    const vendedor = String(fila['Vendedor'] ?? '').trim();
    if (!marca || idTienda === undefined || !vendedor) continue;
    resultado.push({
      idDoc: `${marca.toLowerCase()}-${idTienda}`,
      nombreExcel: String(fila['Tienda'] ?? ''),
      vendedorExcel: vendedor,
    });
  }
  return resultado;
}

async function main() {
  await signInWithEmailAndPassword(auth, process.env.SEED_EMAIL!, process.env.SEED_PASSWORD!);

  const vendedoresSnap = await getDocs(collection(db, 'vendedores'));
  const uidPorEmail = new Map<string, string>();
  vendedoresSnap.forEach((d) => {
    const email = (d.data().email as string | undefined)?.toLowerCase();
    if (email) uidPorEmail.set(email, d.id);
  });

  const libro = XLSX.readFile(rutaExcel);
  const todas: Asignacion[] = [];
  for (const nombreHoja of libro.SheetNames) {
    const hoja = libro.Sheets[nombreHoja];
    const simples = filasSimple(hoja);
    todas.push(...(simples.length ? simples : filasConsolidado(hoja)));
  }

  console.log(`Filas con vendedor encontradas en el Excel: ${todas.length}`);

  let asignadas = 0;
  const omitidasTienda: Asignacion[] = [];
  const omitidasVendedor: Asignacion[] = [];

  for (const fila of todas) {
    const email = VENDEDOR_A_EMAIL[fila.vendedorExcel.toUpperCase()];
    const uid = email ? uidPorEmail.get(email.toLowerCase()) : undefined;
    if (!uid) {
      omitidasVendedor.push(fila);
      continue;
    }

    const ref = doc(db, 'tiendas', fila.idDoc);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      omitidasTienda.push(fila);
      continue;
    }

    await setDoc(ref, { vendedorAsignadoId: uid }, { merge: true });
    asignadas++;
  }

  console.log(`\nAsignadas: ${asignadas}`);
  if (omitidasTienda.length) {
    console.log(`\nOmitidas — la tienda no existe en Firestore (${omitidasTienda.length}):`);
    omitidasTienda.forEach((f) => console.log(`  - ${f.idDoc} (${f.nombreExcel}) -> "${f.vendedorExcel}"`));
  }
  if (omitidasVendedor.length) {
    console.log(`\nOmitidas — vendedor sin mapear o sin cuenta (${omitidasVendedor.length}):`);
    omitidasVendedor.forEach((f) => console.log(`  - ${f.idDoc} (${f.nombreExcel}) -> "${f.vendedorExcel}"`));
  }
}

main().catch((err) => {
  console.error('Error asignando vendedores', err);
  process.exit(1);
});
