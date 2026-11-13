/**
 * Siembra las 4 tiendas de ejemplo (las mismas del mockup / mockData.ts) en
 * la colección `tiendas` de Firestore, para poder probar la app contra datos
 * reales en vez de partir con la colección vacía.
 *
 * Requiere que el archivo `.env` ya tenga las credenciales del proyecto de
 * Firebase (ver .env.example). Desde que las reglas de Firestore exigen
 * sesión iniciada (ver firestore.rules), este script también necesita
 * autenticarse — usa las credenciales de un vendedor ya creado en la consola
 * vía las variables SEED_EMAIL / SEED_PASSWORD en `.env`.
 *
 * Uso: npm run seed:tiendas
 */
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getFirestore, setDoc } from 'firebase/firestore';
import { tiendasDemo } from '../src/data/mockData';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error('Faltan variables EXPO_PUBLIC_FIREBASE_* en .env — copia .env.example y complétalo primero.');
  process.exit(1);
}

if (!process.env.SEED_EMAIL || !process.env.SEED_PASSWORD) {
  console.error('Faltan SEED_EMAIL / SEED_PASSWORD en .env — usa el correo y contraseña de un vendedor ya creado en Firebase Auth.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  await signInWithEmailAndPassword(auth, process.env.SEED_EMAIL!, process.env.SEED_PASSWORD!);
  for (const { id, ...tienda } of tiendasDemo) {
    await setDoc(doc(db, 'tiendas', id), tienda);
    console.log(`Sembrada: ${id} — ${tienda.nombre}`);
  }
  console.log('Listo.');
}

main().catch((err) => {
  console.error('Error sembrando tiendas', err);
  process.exit(1);
});
