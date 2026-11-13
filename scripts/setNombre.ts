/**
 * Fija el "display name" de un vendedor ya creado en Firebase Auth — la
 * consola de Firebase no tiene un campo editable para esto, así que se hace
 * por código, una vez por vendedor, con su propio correo y contraseña.
 *
 * El correo/contraseña se leen de SEED_EMAIL/SEED_PASSWORD en `.env` (nunca
 * como argumento de línea de comandos) — cualquier texto que escribas en la
 * terminal de Claude Code queda visible en la conversación, así que una
 * contraseña ahí quedaría expuesta igual que si se pegara directo en el chat.
 *
 * Uso: npm run set:nombre -- "Nombre Apellido"
 */
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';

const [nombre] = process.argv.slice(2);

if (!nombre) {
  console.error('Uso: npm run set:nombre -- "Nombre Apellido"');
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

async function main() {
  const { user } = await signInWithEmailAndPassword(auth, process.env.SEED_EMAIL!, process.env.SEED_PASSWORD!);
  await updateProfile(user, { displayName: nombre });
  console.log(`Listo — ${user.email} ahora se muestra como "${nombre}".`);
}

main().catch((err) => {
  console.error('Error fijando el nombre', err);
  process.exit(1);
});
