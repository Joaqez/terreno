import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getReactNativePersistence, initializeAuth, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

/**
 * `initializeAuth` con `getReactNativePersistence` es obligatorio en Android/
 * iOS nativo: sin esto, `getAuth()` guarda la sesión solo en memoria y el
 * vendedor tendría que volver a iniciar sesión cada vez que cierra la app.
 * En web no hace falta — `getAuth()` ya persiste solo en el navegador
 * (localStorage/IndexedDb) sin configuración extra.
 * `initializeAuth` solo se puede llamar una vez por app — si el Fast Refresh
 * de Expo vuelve a ejecutar este módulo, usamos la instancia ya creada.
 */
export const auth = (() => {
  if (Platform.OS === 'web') {
    return getAuth(firebaseApp);
  }
  try {
    return initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(firebaseApp);
  }
})();

export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
