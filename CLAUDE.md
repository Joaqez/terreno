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
8a. ¿Con quién hablaste? (jefe de tienda) — `JefeTiendaScreen` (agregada 2026-11-16)
8b. Productos en tienda (exhibidor / bodega) — `InventarioScreen` (agregada 2026-11-18)
9. ¿Hay pedido? (Con pedido / Sin pedido) — `TipoVisitaScreen` (antes "¿Necesita stock?", cambió 2026-11-18)
10. Pedido (productos y cantidades) — `PedidoScreen` (reemplazó a "Detalle de venta" el 2026-11-16)
10b. Checklist de mantención del exhibidor — `ChecklistScreen` (agregada 2026-11-18)
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

**Cuándo cambia el día:** la jornada es por fecha (id `<uid>_<YYYY-MM-DD>`)
y lo "visitada" se muestra solo para las visitas de la jornada de hoy, así
que la ruta se libera sola al día siguiente (al abrir o recargar la app).
Desde 2026-11-19 la fecha es la de **Chile** (`fechaHoyChile()` en
`store.ts`, zona `America/Santiago`); antes era UTC y el día cambiaba a las
21:00. No volver a usar `toISOString().slice(0, 10)` para fechas de jornada.

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

**Bug arreglado 2026-11-18 — ubicación desactualizada:** en el primer día
real (2026-11-16) la ruta siguió calculando distancias como si el vendedor
estuviera en Chamisero después de volver a la ciudad. Dos causas: (1) la
ubicación se pedía una sola vez al montar `RutaScreen`, que queda montada
todo el día debajo del resto del stack; (2) en web, `expo-location` llama a
`navigator.geolocation.getCurrentPosition` con `maximumAge: Infinity`, o sea
que el navegador podía devolver una posición vieja de caché. Ahora
`useUbicacionActual()` usa `watchPositionAsync` (precisión media, cada
~100 m / 30 s, para cuidar batería), la ruta muestra "Ubicación actualizada
hace X min · ±N m" con botón "Actualizar", y `obtenerUbicacionPrecisa()`
fuerza `maximumAge: 0`. **No volver a usar `getCurrentPositionAsync` sin
`maximumAge` en web.**

**Ubicación en cada visita (2026-11-18):** al entrar a `FotoAntesScreen` se
toma, en segundo plano y sin bloquear, una lectura precisa que queda en
`Visita.ubicacionVendedor` (`{lat, lng, precisionM, distanciaTiendaM}`); el
panel la muestra con link a Google Maps. Sirve de respaldo y para corregir
coordenadas de tiendas mal ubicadas.

**Bloqueo de visitas fuera de rango (implementado 2026-11-19):** al tocar
"Iniciar visita" en `RutaScreen` se pide una ubicación precisa
(`verificarRango()` en `src/lib/rangoVisita.ts`, timeout 15 s). Se bloquea si:
(a) la distancia a la tienda **menos** el error del GPS supera **200 m**
(`RADIO_VISITA_M`); (b) el GPS reporta un error mayor a **100 m**
(`PRECISION_MAXIMA_M` — si no, descontar el error dejaría pasar casi todo);
(c) no hay ubicación (permiso negado, sin GPS, timeout — si no, negar el
permiso bastaría para saltarse el bloqueo). En los tres casos aparece
"Reintentar" o "Iniciar igual" con justificación **obligatoria**; la visita
guarda `Visita.fueraDeRango` (`{motivo: 'lejos'|'imprecisa'|'sin_ubicacion',
distanciaM, precisionM, justificacion}`) y el panel la marca "Fuera de rango"
(listado y detalle). La lectura verificada es la `ubicacionVendedor` de la
visita (`FotoAntesScreen` ya no toma otra). **No aplica** a gestión rápida,
región, tiendas creadas con "Nueva visita", tiendas sin coordenadas ni
tiendas con `Tienda.ubicacionPorConfirmar: true`.

**Coordenadas por confirmar:** el geocodificador dejó varias tiendas en el
centro de la comuna o en otro lugar (ej. Pronto Costanera E0, `copec-64079`,
"Costanera Norte km 2", quedó cerca de Independencia y está en Lo Barnechea;
corregida 2026-11-18 a -33.3751547, -70.5323189 y confirmada por una visita
real a 26 m). El 2026-11-19 se marcaron con `ubicacionPorConfirmar: true` las
18 de Santiago con coordenadas compartidas o dirección por km (Cantagallo,
U. de los Andes, Gertrudis, Patagonia, Manquehue, Salida Norte, Piedra Roja,
Lampa, Enea, Caren, Bilbao/Varas, Tobalaba Bilbao, Costanera E1/E2, Ruta 68,
Fach Oriente, Lo Blanco, Puente Maipo Poniente). Se corrigen desde el panel:
**Recalculadas con Google (2026-11-23):** las coordenadas de OpenStreetMap
erraban hasta varios km en direcciones normales (ej. Blanche 2,3 km, Luis
Pasteur Shell 2,8 km). Se geocodificaron las 223 con la **Google Geocoding
API** (clave `GOOGLE_GEOCODING_API_KEY` en `.env`, nunca en el chat) y,
**por regla del usuario, solo se tocaron las tiendas con dirección
específica (calle + número)** — las de kilometraje, "s/n" o sin número
quedaron tal cual. Se usó Google cuando encontró el número
(`street_address`/`premise`, sin `partial_match`): 54 de Santiago y 29 de
región; las con dirección específica que Google no ubicó bien quedaron
"por confirmar" (10 de Santiago). Validado contra el GPS de visitas reales:
Blanche 25 m, Laura de Neves 20 m (pero E0, por km, 1,9 km — por eso no se
usa Google en direcciones por km). U. de los Andes quedó "por confirmar" a
propósito (campus grande). Quedaron 21 tiendas de Santiago por confirmar.
Respaldo de lo anterior: fuera del repo (scratchpad de la sesión).
Se corrigen desde el panel:
`AdminVisitaDetalleScreen` → "Usar esta ubicación como la de la tienda"
(fija `lat`/`lng` con la ubicación del vendedor en esa visita y quita la
marca, con lo que se activa el bloqueo). `AdminTiendaDetalleScreen` muestra
el estado de la ubicación. Las otras ~112 tienen dirección con número y se
asumen bien; si una resulta mal, se corrige con el mismo botón.

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
**Ruta en vivo (2026-11-25):** `RutaScreen` ya no arma la ruta con la copia
`jornada.tiendaIds` que guarda "Iniciar día", sino con la asignación actual
(`tiendas` llega por `onSnapshot`): tiendas `esMinima` asignadas al vendedor
**más** las que ya visitó/gestionó hoy aunque se hayan reasignado, más las
creadas con "Nueva visita" (estas sí salen de `tiendaIds`). Así, asignar o
quitar una tienda desde el panel a mitad del día se ve al instante en ambos
vendedores, sin recargar ni tocar la jornada. `tiendaIds` queda como registro
de con qué empezó el día.
**Reasignación 2026-11-23** (pedido del usuario): Santiago dejó todas sus
Copec (14, quedaron **sin asignar** a propósito) y recibió 14 Aramco/Shell
de Las Condes, Vitacura y Lo Barnechea que eran de Benjamín (Portal La
Dehesa, Shell La Dehesa y La Dehesa I, Cantagallo Aramco, U. de los Andes,
Blanche, Laura de Neves, La Capitanía, Boulevard Nueva Las Condes,
Hualtatas, Vitacura/Luis Pasteur Aramco, Luis Pasteur Shell, San Félix,
Vitacura 7900). Quedó: Benjamín 73, Santiago 14, José Tomás 1 (E0).
Ese mismo día se intercambiaron Las Condes / Cantagallo (Aramco,
`aramco-9522`), que pasó de Santiago a Benjamín, y Chamisero (Shell,
`shell-408`, Colina), que pasó de Benjamín a Santiago.
**2026-11-25:** a Santiago le quedaron **solo 2 tiendas**: Stand Alone
Parque Arauco (`aramco-7458`) y Stand Alone Providencia 2501
(`aramco-7495`), ambas antes de Benjamín. Sus otras 14 (las de Vitacura,
Las Condes, Lo Barnechea y Chamisero) quedaron **sin asignar** a propósito.
Benjamín quedó con 71. Ese mismo día el usuario le asignó desde el panel
Chicureo (Aramco, `aramco-9308`) y Chamisero (Shell, `shell-408`), y se
agregaron a su jornada ya iniciada (`tiendaIds`) para que las viera ese día.

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
visita, productos del pedido, checklist, ubicación del vendedor).
**Tiendas de prueba** (2026-11-19): `copec-prueba`, `shell-prueba`,
`aramco-prueba`, asignadas a Joaquín para probar el flujo por cadena. Sus
visitas **no aparecen en `AdminVisitasScreen`** (se filtran por el sufijo
`-prueba` del `tiendaId`), pero sí en el detalle de cada tienda de prueba.
`AdminTiendaDetalleScreen` muestra además el historial de visitas y los
jefes de esa tienda. Desde 2026-11-18 también `AdminJefesScreen` (link
"Jefes de tienda"): todos los jefes, con búsqueda por nombre/tienda/
comuna/teléfono/correo y filtro por cadena y activos/dados de baja →
`AdminJefeDetalleScreen` (botones Llamar / WhatsApp / Correo — los
teléfonos se normalizan a +56 en `src/lib/contacto.ts` —, editar,
reactivar, historial de visitas con ese jefe). Y `AdminChecklistScreen`
(link "Checklist de mantención") para editar las preguntas del checklist. Carga las últimas 1000 visitas (`cargarVisitasAdmin()`
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
  en ese caso `HomeScreen`/`CierreDiaScreen`/`ResumenDiaScreen` usan como
  meta las tiendas `esMinima` **asignadas a ese vendedor**
  (`tiendasMinimasDe()` en `store.ts`; hasta 2026-11-23 contaban las 134 de
  Santiago).
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
   Después, **siempre** aparece "¿Con quién hablaste?" (`JefeTiendaScreen`):
   elige un jefe de tienda ya registrado, crea uno nuevo, o toca "Omitir"
   (ver "Jefes de tienda" abajo).
   Luego **"Productos en tienda"** (`InventarioScreen`, desde 2026-11-18;
   va después del jefe y antes de "¿Hay pedido?" por pedido del equipo el
   2026-11-19):
   qué productos hay en el **exhibidor** y en la **bodega** — solo
   presencia, **por sabor**, sin cantidades. Lista con los productos de la
   cadena (misma regla que el pedido), agrupada por línea con "Toda en
   exhibidor/bodega" (`agruparPorLinea()` en `src/lib/catalogo.ts`: el
   catálogo no trae la línea, se deduce de marca + puffs + nombre). Reglas
   del equipo: para seguir sin marcar nada hay que confirmar "El exhibidor
   está vacío" / "La bodega está vacía" (para no confundirlo con saltarse el
   paso); existe "No pude revisar la bodega" (`bodegaRevisada: false`,
   distinto de vacía); **se precarga** con el último inventario de la
   tienda (`Tienda.ultimoInventario`, que se reescribe al finalizar cada
   visita presencial — vive en la tienda para que funcione sin señal y es
   lo que el panel muestra como "Último inventario conocido"). Se guarda en
   `Visita.inventario`. **Pedido sugerido** (2026-11-19): al abrir
   `PedidoScreen` cada producto de la cadena viene precargado con una
   cantidad según el stock marcado — en exhibidor y bodega → 0, en uno solo
   → 5, en ninguno → 10 (`SUGERIDO_SEGUN_PRESENCIA`, fijo en código por
   ahora); una bodega no revisada cuenta como **vacía**. Si la tienda no
   tiene nada, se sugiere todo el catálogo de la cadena (decisión del
   equipo: es solo sugerencia). Todo es editable; el borrador guarda solo
   los cambios a mano (`pedidoManual`), así que si el vendedor vuelve y
   corrige el stock, lo que no tocó se recalcula. Cada producto muestra por
   qué se sugiere ("Falta en bodega", etc.) y hay filtro "Faltan". No aplica a
   región ni gestión rápida. Pendiente para otra fase: vista "tiendas sin
   X producto" en el panel.
2. "¿Hay pedido?" (`TipoVisitaScreen`). **Desde 2026-11-18 la app ya no
   habla de "venta" ni "mantención"**: solo **Con pedido** / **Sin pedido**
   (feedback del primer uso real). Internamente `Visita.tipo` sigue siendo
   `'venta'` (con pedido) / `'mantencion'` (sin pedido) para no romper las
   visitas antiguas; en pantalla siempre se muestra "Con pedido"/"Sin pedido".
3. Con pedido → el vendedor arma el **pedido**
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
4. Sin pedido → no se piden productos.
4b. **Checklist de mantención del exhibidor** (`ChecklistScreen`, desde
   2026-11-18) — en **todas** las visitas presenciales, con o sin pedido
   (en todas hay exhibidor), antes de la foto de después. Preguntas Sí / No /
   No aplica, todas obligatorias. **Un "No" exige escribir cuál es el
   problema** (campo de texto obligatorio, guardado en
   `ItemChecklist.comentario` — corregido 2026-11-18; la primera versión no
   lo pedía). Las preguntas viven en la colección
   `preguntasMantencion` (`{texto, orden, activa}`) y las editan los
   supervisores desde el panel (`AdminChecklistScreen`) — **no van en el
   código**. No se borran, se desactivan. La visita guarda una copia
   (`Visita.checklist: {preguntaId, pregunta, respuesta}[]`) para que siga
   legible si la pregunta cambia. Si no hay ninguna pregunta activa, el paso
   se salta solo.
5. Foto después de la visita (`FotoDespuesScreen`), mismo ángulo que la de
   antes.
6. Observaciones libres, opcional (`ObservacionesScreen`).
7. Se guarda la `Visita` y se marca la tienda como visitada.

Si en algún momento hay que reportar pedidos a Bsale, confirmar con el
equipo qué nombre espera Bsale (en la app es "pedido", internamente
`tipo: 'venta'`).

### Jefes de tienda
Agregado 2026-11-16. Las tiendas tienen varios jefes/encargados que cambian
seguido, y se quiere registrar con todos los que se encuentran los vendedores.
- Viven en su propia colección `jefesTienda` (`{tiendaId, nombre, telefono?,
  email?, activo, origen, creadoPorId, creadoEn, ...}`), **no dentro de la
  visita** — se reutilizan entre visitas. La `Visita` solo guarda
  `jefeTiendaId` + `jefeTiendaNombre` (copia del nombre). Sin esos campos =
  el vendedor tocó "Omitir" (o es una visita anterior a este cambio).
- Paso obligatorio en la visita presencial (siempre aparece, justo después
  de la foto de antes), pero con botón "Omitir". Solo el nombre es
  obligatorio; teléfono y correo **no** se rotulan como "opcional" (pedido
  explícito del equipo). Avisa si el teléfono ya existe en otro jefe activo
  de la misma tienda.
- Los **vendedores** pueden crear, editar y dar de baja ("Ya no trabaja
  aquí" → `activo: false`, no se borra). El supervisor ve en
  `AdminTiendaDetalleScreen` los activos y los dados de baja, quién los
  registró y la fecha de la última visita con cada uno; también puede
  editarlos/crearlos ahí. `AdminVisitaDetalleScreen` muestra con quién se habló.
  `AdminJefesScreen` lista todos los jefes para encontrar su contacto rápido.
- **No** aplica a tiendas de región ni a la gestión rápida (decisión del
  equipo: quedan como estaban).
- Carga inicial: los 223 contactos que traía el Excel de tiendas
  (`Tienda.contacto`/`telefono`) se copiaron como jefes con `origen:
  'importado'` (ids `importado-<tiendaId>`). Ojo que no todos son de verdad
  jefes de tienda (en Copec la columna era "JOP", repetida entre tiendas);
  el equipo prefirió cargarlos todos y depurar sobre la marcha. El correo
  solo se copió si calzaba con el nombre (89 de 223). `Tienda.contacto`/
  `telefono` siguen en Firestore pero la app ya no los muestra. Las tiendas
  creadas con "Nueva visita" convierten su contacto en jefe automáticamente.

### Visita rápida (gestión sin visita presencial)
Algunos vendedores tienen relación telefónica directa y frecuente con el
encargado de ciertas tiendas. Para esos casos existe una opción, disponible
directamente desde la tarjeta de la tienda en "Ruta del día", para marcarla
como **gestionada** sin pasar presencialmente: solo se pide un motivo breve
en texto (ej. "Hablé por teléfono con el encargado, todo en orden"). No pide
fotos ni pregunta de stock. Esta gestión **cuenta para el mínimo de tiendas
del día**, y se muestra distinta a una visita presencial (badge "Gestionada"
en vez de "Visitada") tanto en la ruta como en el resumen del día.

### Interfaz: navegación y legibilidad (2026-11-23)
Revisión de UI/UX con el usuario; se priorizó en 4 tandas. Tandas 1 y 3
(errores de navegación + legibilidad en terreno) hechas:
- **Cada pantalla tiene su dirección** (`linking` en `RootNavigator.tsx`,
  ej. `/ruta`, `/visita/pedido`, `/admin/visitas`) para que el botón atrás
  del navegador y de Android funcione; antes la dirección era siempre `/` y
  "atrás" sacaba de la app. Entrar por dirección a un paso de visita sin
  visita en curso manda al inicio, y `FotoAntesScreen` ya no crea la visita
  (la crea solo `RutaScreen` tras verificar la ubicación) — si no, se podía
  saltar el bloqueo por distancia con el historial del navegador.
- La ruta tiene "‹ Inicio" arriba; "Iniciar día" deja Inicio debajo de Ruta.
- Cada paso de la visita tiene **"Cancelar"** arriba a la derecha
  (`CancelarVisita.tsx`): confirma, bota el borrador sin guardar nada y
  vuelve a la ruta.
- El último paso ("Revisa y finaliza", `ObservacionesScreen`) muestra un
  **resumen** (jefe, stock, pedido con productos, checklist, fotos) antes de
  "Finalizar visita" — sobre todo por el pedido sugerido, que viene precargado.
- Letra más grande (+1,5 px; campos de texto en 16 px, lo que además evita el
  zoom automático de Safari al tocar un campo), `inkFaint` más oscuro para
  que se lea al sol, y botones de al menos 44 px de alto.
- Ruta: buscador cuando hay más de 8 tiendas; "Marcar como gestionada" pasó
  al botón "⋯" de cada tarjeta. Región: "Listo" → "Registrar gestión".
Tanda 2 (flujo de visita) también hecha:
- **Barra de pasos** en la barra de arriba de cada paso (`ProgresoVisita.tsx`
  + `src/lib/pasosVisita.ts`): nombre de la tienda + "Paso X de N". N cambia
  según haya pedido (mientras no se elige, se cuenta) y checklist activo.
  El título de cada pantalla es ahora el nombre del paso.
- Productos en tienda y Pedido: el título y el buscador se desplazan con la
  lista (antes quedaban fijos y se veían 2-3 productos).
- **Pedido agrupado por línea** igual que el inventario (`agruparPorLinea()`),
  con el sabor como nombre; avisos cortos ("No hay en la tienda", "Falta en
  bodega").
- Fotos: recuadro `CuadroFoto.tsx` con "Toca para tomar la foto" / "Toca
  para repetir"; la foto de después muestra la de antes como referencia; si
  se vuelve atrás, la foto ya tomada se conserva (sale del borrador).
Tanda 4 (panel y pulido) también hecha:
- En pantallas anchas la app queda centrada con **ancho máximo 760 px**
  (`App.tsx`); los paneles de abajo (sheets) y la foto también se limitan.
- **Avisos** ("Guardado", "No se pudo subir la foto"): `avisar(texto, tono)`
  en `src/lib/avisos.ts`, se muestran con `Avisos.tsx` (montado una vez en
  `App.tsx`). Usarlo en vez de texto suelto o `Alert.alert` (no-op en web)
  cada vez que una acción guarda algo sin cambiar de pantalla.
- Panel: `nombreVisible()` en `store.ts` muestra la parte antes de la @ si la
  cuenta tiene el correo como nombre; el nombre real se corrige en
  `AdminVendedorDetalleScreen` (campo "Nombre"). Las filas de visitas dicen
  "· por <vendedor>" para no confundir a Santiago (vendedor) con la ciudad.
- Sin "← Volver" duplicado (la flecha de la barra basta) ni títulos repetidos.
- Íconos con `@expo/vector-icons` (Ionicons) en vez de emojis.
- **Fuentes: se decidió mantener la del sistema** (San Francisco en iPhone,
  Roboto en Android) en vez de Sora/Inter del mockup: se ve nativa, no hay
  que descargarla y funciona sin señal.

### Cierre de día
Al terminar, el vendedor confirma "Finalizar día" en `CierreDiaScreen` (sin
kilometraje desde 2026-11-16) y la app muestra un resumen:
tiendas visitadas vs. mínimo, visitas con pedido, visitas sin pedido,
gestiones rápidas, y la lista completa de visitas del día con hora.

## Integración con Bsale — fuera de los pendientes

**2026-11-19: el usuario la sacó de la lista de pendientes.** No proponerla
como siguiente paso a menos que se vuelva a pedir. Contexto por si vuelve:

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
  **Versión visible (2026-11-23):** `build:web` corre `scripts/buildWeb.js`,
  que incrusta la fecha/hora del build en `EXPO_PUBLIC_VERSION`; `HomeScreen`
  la muestra abajo ("Versión 23/11, 11:36"). Para saber si un vendedor tiene
  la última, pedirle que mire eso. `firebase.json` manda `no-cache` para
  `index.html`/rutas y cache largo solo para `/_expo/static/**` (archivos con
  hash) — antes el celular podía quedarse hasta 1 h con la versión vieja.
  **Fotos y facturación:** si las subidas fallan con `storage/quota-exceeded`
  aunque haya poco espacio usado, revisar la cuenta de facturación de Google
  Cloud: el 2026-11-23 estaba "disabled in state delinquent" (cobro fallido)
  con el plan todavía en Blaze — Firestore sigue andando (cuota gratis) pero
  Storage no. Se diagnostica subiendo un archivo con firebase-admin.
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
7. ~~Integración con Bsale~~ — sacada de los pendientes 2026-11-19 (ver
   sección arriba). Igual que la carga de preguntas del checklist: tampoco
   es un pendiente del lado del desarrollo.
8. ✅ (parcial) Distancia real en "Ruta del día" — la versión gratis (GPS del
   vendedor + distancia en línea recta, sin costo) está hecha, ver la nota
   en "Ruta del día" arriba. Lo que sigue pendiente y sí tiene costo es el
   **ruteo optimizado real** (Google Directions/Distance Matrix API — orden
   considerando calles/tráfico reales, no línea recta), si el equipo decide
   que vale la pena.
9. ✅ Gestión de las 92 tiendas de región. (Hecho 2026-09-14 —
   `TiendasRegionScreen` + `ObservacionRegionScreen`, ver la nota sobre
   tiendas de región en "Ruta del día" arriba para el detalle.)

10. **Pendiente (pedido 2026-11-16)**: enviar el reporte de las visitas por
   correo al usuario y a otros destinatarios que todavía tiene que definir.
   Falta decidir formato y frecuencia (por visita, resumen diario, etc.);
   requiere un backend (Cloud Function + proveedor de correo), no se puede
   mandar correo directo desde la app.

## Cómo darle feedback a este proyecto

Cambios de **reglas de negocio o de flujo** (qué pantallas existen, qué
pregunta hace la app, qué cuenta como venta vs. mantención, etc.) deberían
quedar reflejados primero en este archivo antes — o al mismo tiempo — que
en el código, para que seguir el porqué de una pantalla no dependa de
memoria de reuniones pasadas.
