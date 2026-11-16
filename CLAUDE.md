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
Reemplaza una bitácora informal por un registro estructurado: ruta del día
y el detalle de cada visita con fotos.

Usuarios: vendedores en terreno, con una mezcla de celulares Android e iOS
(confirmado 2026-09-07) — hay que soportar ambos, no priorizar uno.

**Decisión importante (2026-09-07): la app se distribuye como página web
móvil (PWA), no como app nativa instalable.** Se evaluó EAS Build + TestFlight
para iOS, pero eso exige una cuenta de Apple Developer Program (99 USD/año,
recurrente) que el usuario no quiere pagar. Como el proyecto está armado con
Expo, ya trae soporte de web integrado (`react-native-web`) — se aprovechó
eso en vez de reescribir la app. Cada vendedor entra por navegador (Safari en
iPhone, Chrome en Android) a la URL desplegada y usa "Agregar a pantalla de
inicio" para tener un ícono con apariencia de app nativa, sin costo y sin
pasar por ninguna tienda de aplicaciones. Confirmado funcionando en iPhone
real (cámara incluida) el mismo día. Ver detalle en "Stack técnico" y
"Próximos pasos". No hay todavía una vista web para supervisores, pero es
casi seguro que se va a pedir más adelante (ver "Próximos pasos").

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
3. ~~Kilometraje inicial — `KmInicioScreen`~~ (eliminada 2026-11-16, ver "Inicio de día")
4. Ruta del día — `RutaScreen`
5. Nueva visita (crear tienda) — `NuevaVisitaScreen`
6. Cómo llegar (Waze / Google Maps) — modal dentro de `RutaScreen`
7. Visita rápida / gestión sin visita presencial — modal dentro de `RutaScreen`
8. Foto antes — `FotoAntesScreen`
9. ¿Necesita stock? (tipo de visita) — `TipoVisitaScreen`
10. Pedido (productos y cantidades) — `PedidoScreen` (reemplazó a "Detalle de venta" el 2026-11-16)
11. Foto después — `FotoDespuesScreen`
12. Observaciones — `ObservacionesScreen`
13. Visita registrada (confirmación) — `VisitaRegistradaScreen`
14. Cierre de día — `CierreDiaScreen`
15. Resumen del día — `ResumenDiaScreen`

## Reglas de negocio (confirmadas con el equipo)

### Inicio de día
El vendedor toca "Iniciar día" en `HomeScreen` antes de poder ver su ruta.
**Desde 2026-11-16 ya no se registra kilometraje** (ni foto del odómetro ni
número, ni al inicio ni al cierre) — el equipo decidió quitarlo. Las jornadas
antiguas en Firestore todavía pueden tener `kmInicio`/`kmFinal`, pero la app
ya no los lee ni escribe. Esto arranca la
`JornadaVendedor` del día.

### Ruta del día
La empresa define un mínimo de tiendas que el vendedor debe visitar ese día
(`Tienda.esMinima = true`). La app muestra esas tiendas con un **orden
sugerido simple**: numeradas por cercanía (distancia recta), sin ruteo real
todavía. Ruteo optimizado con mapa/tiempos (Google Directions API o similar)
quedó marcado explícitamente como **siguiente fase**, no para el MVP.
**Actualizado 2026-09-14 — ya calcula distancia real:** `RutaScreen` usa
`src/lib/useUbicacionActual.ts` (`expo-location`, funciona en native y en
web) para pedir la ubicación del vendedor, y `src/lib/distancia.ts`
(Haversine) para calcular distancia real en línea recta a cada tienda con
`lat`/`lng` — reemplaza el `distanciaKm` fijo de antes (que sigue existiendo
como respaldo si no hay ubicación o coordenadas). 222 de las 223 tiendas
reales ya tienen coordenadas (`scripts/geocodificarTiendas.ts`, gratis vía
Nominatim/OpenStreetMap — sin costo, sin API key de Google). De esas, ~55
son aproximadas (solo el centro de la comuna, no la dirección exacta) porque
son direcciones de carretera con kilometraje que un geocodificador no
interpreta bien; falta 1 sola tienda (`copec-20091`) por un typo en el
Excel original ("San Plablo" en vez de "San Pablo"), dejado pendiente a
propósito. Esto sigue siendo la distancia en **línea recta**, no ruteo real
por calles — eso sigue siendo el paso 8 del roadmap (Google Directions),
todavía no implementado.

**Asignación por vendedor — ya filtra (actualizado 2026-11-15):** el negocio
es principalmente vendedores que cubren Santiago, con las tiendas repartidas
*individualmente* entre ellos (no por comuna). `iniciarJornada()` en
`store.ts` ahora usa `tiendas.filter(t => t.esMinima &&
t.vendedorAsignadoId === vendedorId)` — cada vendedor ve solo sus tiendas
asignadas, no las 131 de Santiago completas. La asignación real se cargó con
`scripts/asignarVendedoresPorExcel.ts` (lee un Excel de asignación tienda→
vendedor y fija `vendedorAsignadoId`; reusable para el próximo Excel de
asignación que llegue — hay que editar el mapeo nombre→correo
`VENDEDOR_A_EMAIL` dentro del script si aparece gente nueva). De las 131
tiendas `esMinima` de Santiago, 102 quedaron asignadas (15 a un vendedor
nuevo, "Santiago"/`shpereznova@gmail.com`; 87 a Benjamín); las 29 restantes
—incluidas 10 tiendas que el Excel de asignación mencionaba pero que nunca
se habían importado a Firestore— siguen sin `vendedorAsignadoId`, así que
hoy no le aparecen a nadie en "Ruta del día" hasta que se asignen desde el
panel de administración.

Las tiendas **fuera de Santiago** ("de región") no se visitan nunca en
persona — se hacen seguimiento por teléfono/WhatsApp/correo. Desde
2026-09-14 tienen su propia pantalla, `TiendasRegionScreen` (botón "Tiendas
de región" en Home, junto a "Ver ruta del día" — requiere jornada activa
igual que el resto). Cada tienda tiene un botón "Listo" que lleva a
`ObservacionRegionScreen`, con un campo de texto **obligatorio** para que el
vendedor diga qué hizo (llamó, escribió por WhatsApp, mandó un correo,
etc.) — al confirmar, usa la misma `marcarGestionRapida()` que ya existía
para la gestión rápida de tiendas de Santiago (mismo dato, mismo `modo:
'rapida'` en `Visita`, sin fotos ni pregunta de stock). Como `esMinima:
false` también la usan las tiendas que un vendedor agrega sobre la marcha
("Nueva visita", ver abajo), se agregó `Tienda.agregadaPorVendedor?:
boolean` para no mezclarlas — `TiendasRegionScreen` filtra por
`!esMinima && !agregadaPorVendedor`.

Cada tienda pendiente tiene un botón "Cómo llegar" que abre Waze o Google
Maps con la dirección. Además de las tiendas mínimas, el vendedor puede
agregar tiendas nuevas ("Nueva visita") que no vienen de la base de datos de
la empresa — quedan marcadas como `esMinima: false` pero cuentan para el
resumen del día igual.

### Panel de administración (para supervisores)
Agregado 2026-09-09. Vive **dentro de esta misma app** (no un proyecto
Next.js aparte, como sugería una versión anterior de este documento) — como
la app ya es web, no tenía sentido duplicar auth/Firestore/hosting en otro
proyecto. Pantallas: `AdminTiendasScreen` (buscar/filtrar las 223 tiendas,
Santiago/Región/todas) → `AdminTiendaDetalleScreen` (asignar
`vendedorAsignadoId`, cambiar `esMinima`) y `AdminVendedoresScreen` →
`AdminVendedorDetalleScreen` (cambiar `rol`, fijar `minimoDiario`).
Desde 2026-11-16 también `AdminVisitasScreen` (link "Ver visitas" en
`AdminTiendasScreen`): todas las visitas de todos los vendedores agrupadas por
fecha, con filtro por vendedor y búsqueda por tienda →
`AdminVisitaDetalleScreen` (fotos antes/después, observaciones, tipo de
visita, productos del pedido). `AdminTiendaDetalleScreen` muestra además el historial de
visitas de esa tienda. Carga las últimas 1000 visitas (`cargarVisitasAdmin()`
en `store.ts`); si el volumen crece mucho, paginar o filtrar por fecha en la
consulta.

- **Quién es supervisor**: colección nueva `vendedores` en Firestore (doc id
  = uid de Firebase Auth), con `{nombre, email, rol: 'vendedor' |
  'supervisor', minimoDiario: number}`. Se crea sola con valores por defecto
  (`rol: 'vendedor'`, `minimoDiario: 0`) la primera vez que esa cuenta inicia
  sesión (`inicializar()` en `store.ts`). El botón "Administración" en
  `HomeScreen` solo aparece si `vendedor.rol === 'supervisor'`.
- **Sin seguridad real del lado del servidor todavía** — es una
  simplificación deliberada para un equipo de 2-4 personas de confianza: el
  botón de administración se oculta en la UI para quien no es supervisor,
  pero `firestore.rules` sigue permitiendo escribir en `tiendas`/`vendedores`
  a cualquier cuenta autenticada (lo necesita igual un vendedor común para
  crear sus "Nueva visita"). Si el equipo crece o deja de ser 100% de
  confianza, esto hay que endurecerlo.
- **`minimoDiario`**: la meta de tiendas a visitar por día, independiente de
  cuántas tiendas tenga asignadas un vendedor en total. `0` = sin fijar, y
  en ese caso `HomeScreen`/`ResumenDiaScreen` usan el total de tiendas
  `esMinima` como meta (mismo comportamiento de antes de este cambio).
- **Primer supervisor**: como no puede haber un huevo sin la gallina (nadie
  puede entrar al panel sin ser supervisor, y el panel es lo único que
  cambia el rol), la primera vez se hace con un script:
  `npm run gestionar:vendedor -- supervisor 0` (con `SEED_EMAIL`/
  `SEED_PASSWORD` de esa cuenta ya puestos en `.env` — **nunca** como
  argumento de línea de comandos, porque cualquier texto escrito en la
  terminal de Claude Code queda visible en la conversación). Después de eso,
  todo se maneja desde la app. Mismo criterio aplica a `npm run set:nombre`.

### El flujo de visita — IMPORTANTE, cambió respecto a la primera versión
Feedback clave de la reunión del 2026-09-07: la mayoría de las visitas son
de venta, así que el flujo NO es "elegir tipo de visita → luego actuar". Es
al revés — se decide el tipo después de la conversación con el encargado:

1. El vendedor llega a la tienda y **primero** toma una foto de nuestro
   exhibidor (`FotoAntesScreen`).
2. Le pregunta al encargado si necesitan más stock.
3. Si dice que sí → es una **venta**: el vendedor arma el **pedido**
   (`PedidoScreen`) — busca productos del catálogo y fija la cantidad de
   cada uno; se guarda en `Visita.pedido` (`ItemPedido[]`, copia nombre/SKU
   para que el pedido siga legible si el catálogo cambia) y se ve en el
   panel de administración. Desde 2026-11-16 **ya no se pide número de
   factura ni tipo de venta** (nueva/acordada) — el equipo los consideró
   innecesarios; las visitas antiguas pueden traer `tipoVenta`/
   `numeroFactura` en Firestore, pero la app ya no los usa.
   **Catálogo**: colección `productos` (doc id = SKU), cargada desde el
   reporte de productos de Bsale con `npm run importar:productos --
   "<ruta>.xlsx"` — solo vapes activos (Tipo de Producto VAPORIZADOR*), sin
   las "Caja X Unidades" ni merch/accesorios/alcohol. Re-ejecutable con un
   reporte nuevo (borra del catálogo lo que ya no venga, salvo
   `--sin-borrar`). 77 productos cargados al 2026-11-16. Se cachea en el
   teléfono junto a las tiendas para poder armar pedidos sin señal.
   **Qué productos ve cada tienda** (`productosParaTienda()` en
   `src/lib/catalogo.ts`, regla del equipo 2026-11-16): Copec solo Ignite,
   Shell **solo** los productos con "SHELL" en el nombre, Aramco GeekBar +
   Upends (sin variantes SHELL), y cualquier otra tienda (ej. creadas con
   "Nueva visita") todo menos las variantes "SHELL".
   La cadena se deduce del prefijo del id de la tienda (`copec-`/`shell-`/
   `aramco-`).
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
Al terminar, el vendedor confirma "Finalizar día" en `CierreDiaScreen` (sin
kilometraje desde 2026-11-16) y la app muestra un resumen:
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

- **Expo + React Native + TypeScript**: un solo código para iOS/Android
  **y web**, bien soportado, y es donde el asistente de código rinde mejor.
  El soporte web (`react-native-web`, `expo start --web` / `expo export -p
  web`) es lo que permitió pivotear a distribuir la app como PWA (ver
  "Usuarios" arriba) sin reescribir nada — las mismas pantallas de
  `src/screens/` corren en el navegador tal cual.
- **React Navigation (native-stack)**: navegación tipo stack, un `Stack.Screen`
  por pantalla del mockup. Los tipos de cada ruta están en
  `src/navigation/types.ts` — actualízalos ahí primero si una pantalla nueva
  necesita parámetros distintos.
- **Zustand** (`src/lib/store.ts`) para estado global en memoria, ya
  conectado a Firestore (ver "Estado actual del repo"). Se eligió por ser
  mínimo y fácil de leer — el `state` shape se calcó a propósito del mismo
  objeto de estado que usaba el mockup en HTML, para que sea fácil comparar.
- **Firebase** (`src/lib/firebase.ts`) para Auth, Firestore (datos) y Storage
  (fotos, pausado — ver "Próximos pasos"). Proyecto real: `terreno-62d96`.
  Se eligió Firebase sobre Supabase específicamente por su soporte offline
  — aunque el SDK de JavaScript no trae persistencia real de Firestore en
  React Native (ver "Próximos pasos" paso 5), así que hay una cola casera con
  AsyncStorage encima (`src/lib/offline.ts`) para cubrir ese caso igual: un
  vendedor dentro de una tienda sin señal debe poder seguir registrando la
  visita y que se sincronice sola al recuperar conexión.
- **expo-image-picker** (`src/lib/camera.ts`) para las fotos — abre la
  cámara nativa directamente en Android/iOS, y el selector de archivos con
  cámara del navegador en web (confirmado funcionando en iPhone real). Si
  más adelante se quiere una cámara in-app con overlay o guía visual,
  reemplazar por `expo-camera` (nativo only, no serviría en la versión web).
- **Firebase Hosting**: aloja el build web (`dist/`, generado con `npm run
  build:web`). Desplegar con `npm run deploy:web`. URL pública:
  https://terreno-62d96.web.app
  **Importante — no usar `firebase login` para desplegar**: el login normal
  de `firebase-tools` (OAuth de usuario) resultó poco confiable en esta
  máquina (2026-09-08) — el token de acceso vence a la hora y el refresh
  falla con error 400 de Google, y aunque se reintentó el login varias
  veces, `firebase-tools` seguía prefiriendo la sesión vieja rota antes que
  cualquier otra credencial. La solución fue usar una **cuenta de servicio**:
  `deploy:web` ya carga `GOOGLE_APPLICATION_CREDENTIALS` desde `.env`
  (vía `dotenv-cli`) apuntando a una clave JSON generada en Firebase console
  → Configuración del proyecto → Cuentas de servicio → Generar nueva clave
  privada. Esa clave se guarda **fuera del repo**, en
  `~/.secrets/terreno/service-account.json` (no está en `.env.example` con
  valor real por lo mismo). Si en algún momento hay que generar una clave
  nueva, la política de organización "Disable service account key creation"
  puede estar bloqueándolo — hay que anularla para este proyecto en Google
  Cloud Console → IAM y administración → Políticas de la organización.

## Estado actual del repo (para no reinventar lo que ya existe)

- Todas las pantallas del mockup están construidas y navegables end-to-end
  en `src/screens/`, con UI real (no son wireframes) usando los tokens de
  `src/theme/index.ts` (misma paleta que el mockup en HTML).
- `src/lib/store.ts` ya lee/escribe Firestore (proyecto `terreno-62d96`) en
  vez de solo memoria — cada acción actualiza el estado local al instante y
  persiste en paralelo sin bloquear la UI. `src/data/mockData.ts` (las mismas
  4 tiendas del mockup) ahora solo se usa para sembrar Firestore la primera
  vez (`npm run seed:tiendas`), no como fuente de datos en runtime — esas 4
  tiendas de prueba (`t1`-`t4`) se dieron de baja el 2026-09-09 al cargar
  datos reales.
- **223 tiendas reales cargadas** (2026-09-09) — Shell, Aramco y Copec
  ("Pronto"), filtradas por STATUS "OK" (implementadas; se ignoraron las
  "NUEVA"/"NUEVO", tiendas por aperturar) desde un Excel consolidado que la
  empresa maneja. 131 son de la Región Metropolitana (`esMinima: true`), 92
  son de región (`esMinima: false` — ver la nota en "Ruta del día" sobre por
  qué no aparecen en ninguna pantalla todavía). Faltan las tiendas Copec
  "Franquicias" (376 filas, todas en estado "Nueva" — ninguna implementada
  aún) y no hay coordenadas (lat/lng) para ninguna tienda, solo dirección y
  comuna de texto. El importador (`scripts/importarTiendas.ts`, `npm run
  importar:tiendas -- "ruta\al\excel.xlsx"`) es re-ejecutable — usa IDs
  estables (`shell-809`, `aramco-9225`, `copec-60288`, etc.) armados desde
  el código interno de cada cadena, así que correrlo de nuevo con un Excel
  actualizado actualiza en vez de duplicar. Se agregó `'Estación de
  servicio'` a `TipoNegocio` (`src/types/index.ts`) para estas tiendas.
- **Panel de administración** (2026-09-09) — ver la sección "Panel de
  administración" arriba para el detalle. Vive dentro de esta misma app,
  gatillado por `vendedor.rol === 'supervisor'` (colección `vendedores`
  nueva en Firestore). Permite asignar `vendedorAsignadoId` por tienda y
  fijar `minimoDiario` por vendedor, pero `iniciarJornada()` todavía no
  filtra por esa asignación (ver la nota en "Ruta del día").
- Autenticación real con Firebase Auth (`LoginScreen`, correo/contraseña) —
  las cuentas se crean a mano en la consola de Firebase, no hay
  auto-registro. El "nombre a mostrar" hay que fijarlo por código
  (`npm run set:nombre`) porque la consola de Firebase no tiene un campo
  editable para eso.
- Las reglas de Firestore (`firestore.rules`, en la raíz del repo) exigen
  sesión iniciada (`request.auth != null`) pero todavía no distinguen dueño
  del documento.
- Subida de fotos a Firebase Storage funcionando (confirmado end-to-end
  2026-09-08: foto antes/después de cada visita se suben apenas se toman,
  no al guardar). `src/lib/storage.ts` + `src/lib/useFotoConSubida.ts`
  (hook compartido por las pantallas de foto) + `storage.rules` (mismo
  criterio que `firestore.rules`). Los campos `fotoAntesUrl`/`fotoDespuesUrl`
  en Firestore ya son URLs reales de `firebasestorage.googleapis.com`, no
  URIs locales. Nota de la versión web: `Alert.alert` de React Native es un
  no-op en `react-native-web` — los errores de subida se muestran como texto
  en pantalla (`error` del hook), no con `Alert.alert`.
- Cola offline casera (`src/lib/offline.ts`) para cubrir lo que el SDK de
  Firestore no soporta en React Native (ver "Stack técnico"): cachea
  tiendas/jornada/visitas en `AsyncStorage` para que abrir la app sin señal
  muestre algo en vez de spinner infinito, y guarda cada escritura en disco
  antes de intentarla para que sobreviva si la app se cierra sin señal
  (`reintentarPendientes()` se corre al iniciar sesión). **Bug real
  encontrado y arreglado 2026-09-15**: la caché no tiene fecha — si al
  loguearse Firestore confirma que no hay jornada para hoy pero la caché
  tenía una de un día anterior, `inicializar()` en `store.ts` ahora limpia
  `jornada`/`visitas` explícitamente en ese caso (antes se quedaban las del
  día viejo, incluidas visitas ya hechas, como si fueran de hoy).
- **La app se distribuye como web (PWA), no como app nativa instalable** —
  ver la decisión en "Usuarios" arriba. Desplegada en
  https://terreno-62d96.web.app vía Firebase Hosting. Config relevante:
  `app.json` (bloque `web`), `public/index.html` (plantilla eyectada con
  `npx expo customize public/index.html`, con los meta tags de Apple para
  modo pantalla completa), `public/manifest.json`, `firebase.json` +
  `.firebaserc`. No se han generado los proyectos nativos (`/ios`, `/android`
  no existen) y no hace falta para el plan actual — Expo Go solo se usa para
  probar durante desarrollo (`npm run start`/`npm run android`), no es la
  vía de distribución a los vendedores.
- Las dependencias se instalaron con `npm install` en vez de
  `npx expo install` porque el sandbox donde se generó este repo no tenía
  acceso a la API de compatibilidad de Expo. Antes de la primera vez que
  alguien corra esto con internet normal, conviene ejecutar
  `npx expo install --check` y corregir cualquier versión que no calce con
  el SDK de Expo instalado.

## Próximos pasos sugeridos (en orden)

1. ✅ Crear el proyecto de Firebase real, completar `.env` (nunca commitear
   ese archivo), y reemplazar las acciones de `src/lib/store.ts` para que
   lean/escriban Firestore en vez de solo memoria. (Hecho 2026-09-07 —
   proyecto `terreno-62d96`, región `southamerica-west1`.)
2. ✅ Autenticación real con Firebase Auth. (Hecho 2026-09-07 — cuentas se
   crean a mano en la consola, sin auto-registro; ver `LoginScreen.tsx`.)
3. ✅ Subida de fotos a Firebase Storage. (Hecho 2026-09-08 — usuario activó
   Blaze; confirmado end-to-end con fotos reales subiendo y visibles en
   Firestore/Storage. Ver detalle en "Estado actual del repo".)
4. ✅ Distribución a los vendedores sin depender de Expo Go/tu laptop.
   (Hecho 2026-09-07 — pero **no** como se planeaba originalmente: en vez de
   EAS Build + Apple Developer Program [99 USD/año], se pivoteó a distribuir
   la app como página web/PWA, gratis, en https://terreno-62d96.web.app. Ver
   la decisión completa en "Usuarios" y "Stack técnico" arriba. Confirmado
   funcionando en iPhone real, cámara incluida.)
5. ✅ Persistencia offline. (Hecho 2026-09-07 — opción elegida: cola casera
   con AsyncStorage, `src/lib/offline.ts`, ver "Estado actual del repo".
   **Importante para quien retome esto**: el SDK de Firebase para JavaScript
   NO soporta persistencia offline real de Firestore en React Native
   [`enableIndexedDbPersistence` depende de IndexedDb, que no existe en el
   motor JS de RN/Hermes] — esto se descubrió el mismo día y contradice lo
   que este documento sugería antes. La alternativa no elegida era migrar a
   `@react-native-firebase`, que exige dejar Expo Go — ya no aplica de todas
   formas ahora que la distribución es web, donde Firestore sí soporta
   IndexedDb nativo si en algún momento se quisiera usar en vez de la cola.)
6. ✅ Panel de administración para supervisores. (Hecho 2026-09-09 — dentro
   de este mismo repo, no un proyecto Next.js aparte como se planeaba antes;
   ver la sección "Panel de administración" arriba.) **Filtro de asignación
   activado 2026-11-15**: ver la nota actualizada de "Asignación por
   vendedor" en "Ruta del día" arriba — 102 de 131 tiendas de Santiago ya
   tienen vendedor asignado, el resto se va completando desde el panel.
7. Integración con Bsale (ver sección arriba).
8. ✅ (parcial) Distancia real en "Ruta del día" — la versión gratis (GPS del
   vendedor + distancia en línea recta, sin costo) está hecha, ver la nota
   en "Ruta del día" arriba. Lo que sigue pendiente y sí tiene costo es el
   **ruteo optimizado real** (Google Directions/Distance Matrix API — orden
   considerando calles/tráfico reales, no línea recta), si el equipo decide
   que vale la pena.
9. ✅ Gestión de las 92 tiendas de región. (Hecho 2026-09-14 —
   `TiendasRegionScreen` + `ObservacionRegionScreen`, ver la nota sobre
   tiendas de región en "Ruta del día" arriba para el detalle.)

## Cómo darle feedback a este proyecto

Cambios de **reglas de negocio o de flujo** (qué pantallas existen, qué
pregunta hace la app, qué cuenta como venta vs. mantención, etc.) deberían
quedar reflejados primero en este archivo antes — o al mismo tiempo — que
en el código, para que seguir el porqué de una pantalla no dependa de
memoria de reuniones pasadas.
