@AGENTS.md

# Terreno — contexto del proyecto

Esto es lo que Claude Code necesita saber antes de tocar código en este repo.
Léelo completo antes de implementar features nuevas — la mayoría de las
decisiones de producto ya están tomadas y validadas con el equipo; no hay
que volver a inventarlas.

## Qué es esta app

"Terreno" es la app móvil interna para los vendedores de la empresa que
visitan tiendas (minimarkets, botillerías, almacenes, supermercados, etc.)
para reponer/vender productos y hacer mantención de nuestros exhibidores.
Reemplaza una bitácora informal por un registro estructurado: kilometraje,
ruta del día, y el detalle de cada visita con fotos.

Usuarios: vendedores en terreno (celular, mayormente Android — validar con
el equipo si hay que priorizar Android sobre iOS). No hay todavía una vista
web para supervisores, pero es casi seguro que se va a pedir más adelante
(ver "Próximos pasos").

## Origen de la spec: el mockup interactivo

Antes de escribir código se construyó un prototipo clickeable en HTML/CSS/JS
(`terreno.html`, publicado como artifact en claude.ai) que el equipo ya
revisó y aprobó, incluyendo una ronda de feedback de una reunión. Este repo
es la traducción de ese mockup a una app real en React Native. Si hay dudas
sobre cómo se ve o se comporta una pantalla, el mockup es la referencia
visual; este documento es la referencia de las reglas de negocio.

Estructura de pantallas y su equivalente en `src/screens/`:

1. Inicio de sesión — `LoginScreen`
2. Panel principal — `HomeScreen`
3. Kilometraje inicial — `KmInicioScreen`
4. Ruta del día — `RutaScreen`
5. Nueva visita (crear tienda) — `NuevaVisitaScreen`
6. Cómo llegar (Waze / Google Maps) — modal dentro de `RutaScreen`
7. Visita rápida / gestión sin visita presencial — modal dentro de `RutaScreen`
8. Foto antes — `FotoAntesScreen`
9. ¿Necesita stock? (tipo de visita) — `TipoVisitaScreen`
10. Detalle de venta — `DetalleVentaScreen`
11. Foto después — `FotoDespuesScreen`
12. Observaciones — `ObservacionesScreen`
13. Visita registrada (confirmación) — `VisitaRegistradaScreen`
14. Cierre de día — `CierreDiaScreen`
15. Resumen del día — `ResumenDiaScreen`

## Reglas de negocio (confirmadas con el equipo)

### Inicio de día
El vendedor debe registrar el kilometraje inicial de su vehículo (foto del
odómetro + número manual) antes de poder ver su ruta. Esto arranca la
`JornadaVendedor` del día.

### Ruta del día
La empresa define un mínimo de tiendas que el vendedor debe visitar ese día
(`Tienda.esMinima = true`). La app muestra esas tiendas con un **orden
sugerido simple**: numeradas por cercanía (distancia recta), sin ruteo real
todavía. Ruteo optimizado con mapa/tiempos (Google Directions API o similar)
quedó marcado explícitamente como **siguiente fase**, no para el MVP.

Cada tienda pendiente tiene un botón "Cómo llegar" que abre Waze o Google
Maps con la dirección. Además de las tiendas mínimas, el vendedor puede
agregar tiendas nuevas ("Nueva visita") que no vienen de la base de datos de
la empresa — quedan marcadas como `esMinima: false` pero cuentan para el
resumen del día igual.

### El flujo de visita — IMPORTANTE, cambió respecto a la primera versión
Feedback clave de la reunión del 2026-09-07: la mayoría de las visitas son
de venta, así que el flujo NO es "elegir tipo de visita → luego actuar". Es
al revés — se decide el tipo después de la conversación con el encargado:

1. El vendedor llega a la tienda y **primero** toma una foto de nuestro
   exhibidor (`FotoAntesScreen`).
2. Le pregunta al encargado si necesitan más stock.
3. Si dice que sí → es una **venta**: se pide tipo de venta (`nueva` o
   `acordada` — acordada previamente con el cliente) y el número de factura
   (`DetalleVentaScreen`). Ambos tipos de venta piden número de factura.
4. Si dice que no → es **mantención**: no se pide nada de venta, se salta
   directo a la foto de después.
5. Foto después de la visita (`FotoDespuesScreen`), mismo ángulo que la de
   antes.
6. Observaciones libres, opcional (`ObservacionesScreen`).
7. Se guarda la `Visita` y se marca la tienda como visitada.

No existe ya un concepto de "entrega que no sea venta" — lo que antes se
llamaba "entrega" ahora siempre es "venta". Si en algún momento hay que
reportar esto a Bsale, confirmar con el equipo si el término interno debe
ser "venta" o si Bsale espera otro nombre.

### Visita rápida (gestión sin visita presencial)
Algunos vendedores tienen relación telefónica directa y frecuente con el
encargado de ciertas tiendas. Para esos casos existe una opción, disponible
directamente desde la tarjeta de la tienda en "Ruta del día", para marcarla
como **gestionada** sin pasar presencialmente: solo se pide un motivo breve
en texto (ej. "Hablé por teléfono con el encargado, todo en orden"). No pide
fotos ni pregunta de stock. Esta gestión **cuenta para el mínimo de tiendas
del día**, y se muestra distinta a una visita presencial (badge "Gestionada"
en vez de "Visitada") tanto en la ruta como en el resumen del día.

### Cierre de día
Al terminar, el vendedor registra el kilometraje final (foto + número). La
app calcula los km recorridos (`kmFinal - kmInicio`) y muestra un resumen:
tiendas visitadas vs. mínimo, ventas realizadas, mantenciones realizadas,
gestiones rápidas, y la lista completa de visitas del día con hora.

## Integración con Bsale — próxima fase, no en el alcance actual

La empresa usa Bsale (sistema de ventas e inventario, con API propia) y
quiere que los vendedores puedan ver sus ventas y reportes dentro de esta
app. **No está implementado ni diseñado todavía.** Antes de construirlo:

- Conseguir acceso a la documentación de la API de Bsale y las credenciales
  del proyecto (las tiene el jefe del usuario).
- Definir si la lectura de ventas se hace vendedor por vendedor (filtrando
  por algún identificador que Bsale ya use) o se sincroniza todo a Firestore
  vía un backend intermedio (recomendado: nunca llamar a la API de Bsale
  directo desde la app con credenciales de servidor — usar una Cloud
  Function como intermediario).
- Esto es aparte del flujo de bitácora — probablemente una pestaña/pantalla
  nueva "Mis ventas", no parte del flujo de visita.

## Stack técnico y por qué

- **Expo + React Native + TypeScript**: un solo código para iOS/Android,
  bien soportado, y es donde el asistente de código rinde mejor.
- **React Navigation (native-stack)**: navegación tipo stack, un `Stack.Screen`
  por pantalla del mockup. Los tipos de cada ruta están en
  `src/navigation/types.ts` — actualízalos ahí primero si una pantalla nueva
  necesita parámetros distintos.
- **Zustand** (`src/lib/store.ts`) para estado global en memoria. Se eligió
  por ser mínimo y fácil de leer — el `state` shape se calcó a propósito del
  mismo objeto de estado que usaba el mockup en HTML, para que sea fácil
  comparar. **Esto todavía no persiste nada real** — al cerrar la app se
  pierde todo. Migrar cada acción del store a leer/escribir Firestore es el
  trabajo pendiente más importante ahora mismo.
- **Firebase** (`src/lib/firebase.ts`, todavía sin credenciales reales — ver
  `.env.example`) para Auth, Firestore (datos) y Storage (fotos). Se eligió
  Firebase sobre Supabase específicamente por su soporte offline maduro:
  un vendedor dentro de una tienda sin señal debe poder seguir registrando
  la visita y que se sincronice sola al recuperar conexión.
- **expo-image-picker** (`src/lib/camera.ts`) para las fotos — abre la
  cámara nativa directamente. Si más adelante se quiere una cámara in-app
  con overlay o guía visual, reemplazar por `expo-camera`.

## Estado actual del repo (para no reinventar lo que ya existe)

- Todas las pantallas del mockup están construidas y navegables end-to-end
  en `src/screens/`, con UI real (no son wireframes) usando los tokens de
  `src/theme/index.ts` (misma paleta que el mockup en HTML).
- Los datos son de ejemplo (`src/data/mockData.ts`, mismas 4 tiendas que el
  mockup) y el estado vive solo en memoria vía Zustand.
- No hay autenticación real todavía — `LoginScreen` navega directo con el
  vendedor de ejemplo.
- Las dependencias se instalaron con `npm install` en vez de
  `npx expo install` porque el sandbox donde se generó este repo no tenía
  acceso a la API de compatibilidad de Expo. Antes de la primera vez que
  alguien corra esto con internet normal, conviene ejecutar
  `npx expo install --check` y corregir cualquier versión que no calce con
  el SDK de Expo instalado.
- No se han generado los proyectos nativos (`/ios`, `/android` no existen
  todavía) — se está trabajando 100% con Expo Go / Expo Dev Client.

## Próximos pasos sugeridos (en orden)

1. Crear el proyecto de Firebase real, completar `.env` (nunca commitear
   ese archivo), y reemplazar las acciones de `src/lib/store.ts` para que
   lean/escriban Firestore en vez de solo memoria.
2. Autenticación real con Firebase Auth.
3. Subida de fotos a Firebase Storage (ahora mismo `fotoUri` queda como URI
   local del dispositivo, nunca se sube a ningún lado).
4. Persistencia offline (revisar `enableIndexedDbPersistence` / el soporte
   offline nativo de Firestore para React Native).
5. Panel web simple para supervisores (probablemente fuera de este repo,
   como un proyecto Next.js aparte que lea la misma base de Firestore).
6. Integración con Bsale (ver sección arriba).
7. Ruteo optimizado real para "Ruta del día" (Google Directions/Distance
   Matrix API), si el equipo decide que vale la pena el costo/complejidad.

## Cómo darle feedback a este proyecto

Cambios de **reglas de negocio o de flujo** (qué pantallas existen, qué
pregunta hace la app, qué cuenta como venta vs. mantención, etc.) deberían
quedar reflejados primero en este archivo antes — o al mismo tiempo — que
en el código, para que seguir el porqué de una pantalla no dependa de
memoria de reuniones pasadas.
