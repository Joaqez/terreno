import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

/**
 * Configuración de Firebase.
 *
 * Los valores se leen desde variables de entorno con prefijo EXPO_PUBLIC_
 * (Expo las incluye automáticamente en el bundle, no requiere configuración
 * extra). Cópialas desde la consola de Firebase del proyecto de la empresa
 * a un archivo `.env` local basado en `.env.example` — NUNCA subas el `.env`
 * real al repo.
 *
 * Mientras no exista un proyecto de Firebase real, la app sigue funcionando
 * con el store en memoria (src/lib/store.ts) — este archivo recién se usa
 * cuando empecemos a reemplazar esas acciones por lecturas/escrituras reales.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
