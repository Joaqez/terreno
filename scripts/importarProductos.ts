/**
 * Importa el catálogo de productos para pedidos desde el reporte de productos
 * de Bsale (ej. "126746-product-report-<fecha>.xlsx") a la colección
 * `productos` de Firestore (doc id = SKU).
 *
 * Solo entran vapes activos: "Tipo de Producto" que empiece con VAPORIZADOR,
 * Estado "Activo", y se excluyen las "Caja X Unidades" (el equipo pide por
 * unidad). Accesorios/merch y alcohol quedan fuera.
 *
 * Re-ejecutable: actualiza los productos existentes por SKU. Los productos que
 * ya estaban en Firestore pero no vienen en el Excel nuevo se borran (salvo
 * con --sin-borrar), para que el catálogo refleje exactamente el reporte.
 *
 * Uso: npm run importar:productos -- "C:\ruta\al\product-report.xlsx" [--sin-borrar]
 */
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, getFirestore, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

const rutaExcel = process.argv[2];
const sinBorrar = process.argv.includes('--sin-borrar');
if (!rutaExcel) {
  console.error('Uso: npm run importar:productos -- "C:\\ruta\\al\\product-report.xlsx" [--sin-borrar]');
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

/** El reporte de Bsale trae un BOM pegado al primer encabezado ("\uFEFFNombre del Producto"). */
function campo(fila: Record<string, unknown>, nombre: string): string {
  const clave = Object.keys(fila).find((k) => k.replace(/^\uFEFF/, '').trim() === nombre);
  return clave ? String(fila[clave] ?? '').trim() : '';
}

async function main() {
  const libro = XLSX.readFile(rutaExcel);
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(libro.Sheets[libro.SheetNames[0]], { defval: '' });

  const productos = new Map<string, { nombre: string; sku: string; marca: string }>();
  let descartadas = 0;
  for (const fila of filas) {
    const nombre = campo(fila, 'Nombre del Producto');
    const sku = campo(fila, 'SKU') || campo(fila, 'Código de Barras');
    const esVape = /^VAPORIZADOR/i.test(campo(fila, 'Tipo de Producto'));
    const activo = campo(fila, 'Estado') === 'Activo';
    const esCaja = /^caja\b/i.test(nombre);
    if (!nombre || !sku || !esVape || !activo || esCaja) {
      descartadas++;
      continue;
    }
    productos.set(sku, { nombre, sku, marca: campo(fila, 'Marca') });
  }

  console.log(`Filas en el Excel: ${filas.length} · productos a importar: ${productos.size} · descartadas: ${descartadas}`);

  await signInWithEmailAndPassword(auth, process.env.SEED_EMAIL!, process.env.SEED_PASSWORD!);

  for (const p of productos.values()) {
    await setDoc(doc(db, 'productos', p.sku), p);
  }
  console.log(`Guardados: ${productos.size}`);

  if (!sinBorrar) {
    const existentes = await getDocs(collection(db, 'productos'));
    const sobrantes = existentes.docs.filter((d) => !productos.has(d.id));
    for (const d of sobrantes) {
      await deleteDoc(d.ref);
      console.log(`  borrado (ya no está en el Excel): ${d.id} ${d.data().nombre}`);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Error importando productos', err);
  process.exit(1);
});
