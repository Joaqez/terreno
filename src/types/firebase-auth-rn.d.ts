/**
 * `getReactNativePersistence` existe en tiempo de ejecución (Metro resuelve
 * la build de React Native de `@firebase/auth`, que sí la exporta) pero no
 * está en los tipos de `firebase/auth` — esos se generan contra la build de
 * navegador. Sin esto, `tsc` marca el import como inexistente aunque el
 * código funcione. Ver src/lib/firebase.ts.
 */
import type { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: unknown): Persistence;
}
