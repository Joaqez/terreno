/**
 * Rellena `lat`/`lng` de las tiendas que no los tengan, usando Nominatim
 * (el geocodificador gratuito de OpenStreetMap — sin costo, sin API key).
 *
 * Para cada tienda prueba varias variantes de la dirección, de más precisa a
 * menos, y se queda con la primera que Nominatim reconozca:
 *   1. Dirección completa tal cual está en Firestore.
 *   2. Sin lo que venga después de una "/" (las intersecciones tipo
 *      "Calle 123/Otra Calle" confunden al buscador — nos quedamos con la
 *      calle principal).
 *   3. Sin "local X" / "locales X y Y" (números de local dentro de un mall
 *      o strip center no aportan y a veces estorban).
 *   4. Sin "esquina X" / "esq. X".
 *   5. Como último recurso, solo la comuna — da una coordenada aproximada
 *      (el centro de la comuna, no la tienda exacta) en vez de nada. Estas
 *      quedan marcadas en el resumen final como "aproximada" para que se
 *      puedan revisar a mano si la precisión importa.
 *
 * Respeta el límite de uso de Nominatim (máximo 1 solicitud por segundo,
 * con un User-Agent identificable). Es re-ejecutable: solo procesa tiendas
 * sin coordenadas todavía.
 *
 * Uso: npm run geocodificar:tiendas
 */
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDocs, getFirestore, updateDoc } from 'firebase/firestore';

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
const tiendasCol = collection(db, 'tiendas');

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodificar(consulta: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(consulta)}`;
  const respuesta = await fetch(url, {
    headers: { 'User-Agent': 'Terreno-App/1.0 (bitácora interna de vendedores)' },
  });
  const datos = (await respuesta.json()) as Array<{ lat: string; lon: string }>;
  if (!datos.length) return null;
  return { lat: parseFloat(datos[0].lat), lng: parseFloat(datos[0].lon) };
}

/** De más precisa a menos — la última (solo comuna) siempre está al final
 * como red de seguridad. */
function variantesDeDireccion(direccion: string, comuna: string): string[] {
  const variantes: string[] = [];
  const agregar = (calle: string) => {
    const consulta = `${calle}, ${comuna}, Chile`;
    if (calle && !variantes.includes(consulta)) variantes.push(consulta);
  };

  agregar(direccion);

  const sinBarra = direccion.split('/')[0].trim();
  agregar(sinBarra);

  const sinLocal = sinBarra.replace(/,?\s*locale?s?\.?\s*[\wáéíóúñ°]+(\s*[yY]\s*[\wáéíóúñ°]+)?/gi, '').trim();
  agregar(sinLocal);

  const sinEsquina = sinLocal.replace(/,?\s*esq(uina)?\.?\s+.*/i, '').trim();
  agregar(sinEsquina);

  variantes.push(`${comuna}, Chile`); // último recurso, coordenada aproximada
  return variantes;
}

async function main() {
  await signInWithEmailAndPassword(auth, process.env.SEED_EMAIL!, process.env.SEED_PASSWORD!);

  const snap = await getDocs(tiendasCol);
  const pendientes = snap.docs.filter((d) => d.data().lat == null || d.data().lng == null);
  console.log(`${pendientes.length} tiendas sin coordenadas de ${snap.size} totales.\n`);

  let ok = 0;
  let aproximadas = 0;
  const fallidas: string[] = [];

  for (const d of pendientes) {
    const t = d.data() as { nombre: string; direccion: string; comuna: string };
    const variantes = variantesDeDireccion(t.direccion, t.comuna);
    let encontrada: { lat: number; lng: number } | null = null;
    let intentoUsado = -1;

    for (let i = 0; i < variantes.length; i++) {
      try {
        encontrada = await geocodificar(variantes[i]);
      } catch {
        encontrada = null;
      }
      await esperar(1100);
      if (encontrada) {
        intentoUsado = i;
        break;
      }
    }

    if (encontrada) {
      await updateDoc(doc(tiendasCol, d.id), encontrada);
      ok++;
      const esAproximada = intentoUsado === variantes.length - 1 && variantes.length > 1;
      if (esAproximada) {
        aproximadas++;
        console.log(`  ~ ${d.id}: ${t.nombre} → ${encontrada.lat}, ${encontrada.lng} (aproximada, solo comuna)`);
      } else {
        console.log(`  ✓ ${d.id}: ${t.nombre} → ${encontrada.lat}, ${encontrada.lng}`);
      }
    } else {
      fallidas.push(`${d.id} — ${t.nombre} (${t.direccion}, ${t.comuna})`);
      console.log(`  ✗ ${d.id}: ${t.nombre} — no encontrada ni por comuna`);
    }
  }

  console.log(
    `\nListo. Geocodificadas: ${ok} (${aproximadas} aproximadas, solo por comuna). Sin encontrar: ${fallidas.length}.`
  );
  if (fallidas.length) {
    console.log('\nNo se pudieron geocodificar de ninguna forma (revisar a mano):');
    fallidas.forEach((f) => console.log(`  - ${f}`));
  }
}

main().catch((err) => {
  console.error('Error geocodificando tiendas', err);
  process.exit(1);
});
