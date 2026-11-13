/**
 * Fija el rol y la meta diaria de un vendedor en la colección `vendedores`
 * de Firestore. Se necesita al menos una vez para tener un primer
 * "supervisor" que pueda entrar al panel de administración dentro de la
 * app — después de eso, los cambios de rol/meta se hacen desde ahí mismo.
 *
 * El correo/contraseña se leen de SEED_EMAIL/SEED_PASSWORD en `.env` (nunca
 * como argumento de línea de comandos) — cualquier texto que escribas en la
 * terminal de Claude Code queda visible en la conversación, así que una
 * contraseña ahí quedaría expuesta igual que si se pegara directo en el chat.
 *
 * Uso: npm run gestionar:vendedor -- supervisor 0
 *      npm run gestionar:vendedor -- vendedor 15
 */
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getFirestore, setDoc } from 'firebase/firestore';

const [rol, minimoTexto] = process.argv.slice(2);

if (rol !== 'vendedor' && rol !== 'supervisor') {
  console.error('Uso: npm run gestionar:vendedor -- <vendedor|supervisor> [minimoDiario]');
  process.exit(1);
}
if (!process.env.SEED_EMAIL || !process.env.SEED_PASSWORD) {
  console.error('Faltan SEED_EMAIL / SEED_PASSWORD en .env — pon ahí el correo y contraseña de la cuenta a modificar.');
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
  console.error('Faltan variables EXPO_PUBLIC_FIREBASE_* en .env — copia .env.example y complétalo primero.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  const { user } = await signInWithEmailAndPassword(auth, process.env.SEED_EMAIL!, process.env.SEED_PASSWORD!);
  const minimoDiario = minimoTexto ? Math.max(parseInt(minimoTexto, 10) || 0, 0) : 0;
  await setDoc(
    doc(db, 'vendedores', user.uid),
    {
      nombre: user.displayName || user.email || 'Vendedor',
      email: user.email ?? '',
      rol,
      minimoDiario,
    },
    { merge: true }
  );
  console.log(`Listo — ${user.email} ahora es "${rol}" con meta diaria ${minimoDiario}.`);
}

main().catch((err) => {
  console.error('Error actualizando el vendedor', err);
  process.exit(1);
});
