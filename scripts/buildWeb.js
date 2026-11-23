// Build web con la fecha/hora de la versión incrustada (EXPO_PUBLIC_VERSION),
// que HomeScreen muestra abajo: así se puede confirmar qué versión tiene
// abierta un vendedor (2026-11-23, el celular de Santiago seguía en una vieja).
const { spawnSync } = require('child_process');

const version = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(new Date());

console.log(`Versión web: ${version}`);
const r = spawnSync('npx expo export -p web', {
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_VERSION: version },
});
process.exit(r.status ?? 1);
