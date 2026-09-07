# Terreno

App móvil de bitácora para vendedores en ruta. Expo + React Native +
TypeScript. Si vas a tocar código, lee primero **CLAUDE.md** — ahí está todo
el contexto de negocio (por qué el flujo es como es, qué falta, qué no
tocar sin avisar).

## Requisitos

- Node.js 20+ y npm.
- La app **Expo Go** instalada en tu celular (iOS o Android) — es la forma
  más rápida de probar la app sin compilar nada nativo.
- VS Code con la extensión de Claude Code (o el CLI `claude` corriendo en
  la terminal integrada).

## Primeros pasos

```bash
npm install
npx expo install --check   # corrige versiones si no calzan con el SDK de Expo
npm start
```

Esto abre el Metro Bundler. Escanea el código QR con la cámara del celular
(Android) o con la app de Cámara (iOS) para abrir la app en Expo Go.

La app funciona de inmediato con datos de ejemplo (4 tiendas, un vendedor
demo) — no necesitas configurar Firebase para empezar a navegar las
pantallas.

## Conectar Firebase (cuando quieras que los datos persistan de verdad)

1. Crea un proyecto en [Firebase console](https://console.firebase.google.com).
2. Copia `.env.example` a `.env` y completa los valores desde
   *Configuración del proyecto → tus apps → SDK setup and configuration*.
3. `.env` nunca se sube al repo (está en `.gitignore`).
4. Las lecturas/escrituras reales a Firestore todavía no están conectadas —
   hoy todo vive en memoria (`src/lib/store.ts`). Ver "Próximos pasos" en
   `CLAUDE.md`.

## Cómo trabajar en este repo con VS Code + Claude Code

1. Abre esta carpeta en VS Code (`code .`).
2. Abre la terminal integrada y corre `claude` (o usa la extensión).
3. Claude Code va a leer automáticamente `CLAUDE.md` al empezar — ahí está
   el contexto de negocio, así que no hace falta explicárselo de nuevo cada
   vez que abras una sesión nueva.
4. Trabaja pantalla por pantalla o feature por feature. Antes de aceptar un
   cambio grande, corre `npx tsc --noEmit` para chequear tipos y prueba en
   tu celular con Expo Go — la cámara y la ubicación casi no se pueden
   probar bien en un simulador.
5. Si cambia algo del **flujo o las reglas de negocio** (no solo del
   código), actualiza `CLAUDE.md` primero — es la fuente de verdad para
   cualquiera (persona o IA) que vuelva a este proyecto más adelante.

## Estructura del proyecto

```
src/
  screens/       una pantalla por archivo, nombradas igual que en CLAUDE.md
  navigation/     stack de navegación y tipos de cada ruta
  components/ui.tsx   los bloques de UI reutilizables (botones, cards, etc.)
  lib/
    store.ts      estado global (Zustand) — hoy en memoria, mañana Firestore
    firebase.ts   inicialización de Firebase (Auth, Firestore, Storage)
    camera.ts     helper para tomar fotos con la cámara
  data/mockData.ts  tiendas y vendedor de ejemplo
  theme/          paleta de colores, spacing, radios — la misma que el mockup HTML
  types/          modelo de datos (Tienda, Visita, JornadaVendedor, etc.)
```

## Estado del proyecto

Esto es un scaffold inicial: todas las pantallas del flujo están construidas
y navegables, pero los datos son de ejemplo y no persisten. Ver la sección
"Próximos pasos sugeridos" en `CLAUDE.md` para el orden recomendado de lo
que falta.
