import { Producto, Tienda } from '../types';

type Cadena = 'copec' | 'shell' | 'aramco' | 'otra';

/** Las tiendas importadas tienen id `<cadena>-<código>`; las creadas por un vendedor tienen id aleatorio. */
export function cadenaDeTienda(tienda: Tienda): Cadena {
  const prefijo = tienda.id.split('-')[0];
  return prefijo === 'copec' || prefijo === 'shell' || prefijo === 'aramco' ? prefijo : 'otra';
}

const esVarianteShell = (p: Producto) => /\bshell\b/i.test(p.nombre);

/**
 * Qué marcas se venden en cada cadena (definido por el equipo 2026-11-16):
 * Copec solo Ignite, Shell solo los productos con "SHELL" en el nombre,
 * Aramco GeekBar y Upends (sin variantes SHELL), cualquier otra tienda todo
 * menos las variantes SHELL.
 */
export function productosParaTienda(productos: Producto[], tienda: Tienda | undefined): Producto[] {
  const cadena = tienda ? cadenaDeTienda(tienda) : 'otra';
  const marca = (p: Producto) => p.marca.toUpperCase();
  switch (cadena) {
    case 'copec':
      return productos.filter((p) => marca(p) === 'IGNITE');
    case 'shell':
      return productos.filter(esVarianteShell);
    case 'aramco':
      return productos.filter((p) => ['GEEKBAR', 'UPENDS'].includes(marca(p)) && !esVarianteShell(p));
    default:
      return productos.filter((p) => !esVarianteShell(p));
  }
}

export interface LineaProductos {
  clave: string;
  /** Ej: "GeekBar Meloso Max 2 · 12.000 puffs". */
  titulo: string;
  items: { producto: Producto; sabor: string }[];
}

/** Número de puffs del nombre ("12000", "15.500", "8.000"): último número de 4+ dígitos. */
function partesNombre(p: Producto) {
  const palabras = p.nombre.trim().split(/\s+/);
  let iPuffs = -1;
  palabras.forEach((w, i) => {
    if (/^(\d{1,3}(\.\d{3})+|\d{4,})$/.test(w)) iPuffs = i;
  });
  const puffs = iPuffs >= 0 ? parseInt(palabras[iPuffs].replace(/\./g, ''), 10) : 0;
  const base = iPuffs >= 0 ? palabras.slice(0, iPuffs) : palabras;
  // Lo que viene después de los puffs (ej. "Aramco", "SHELL"), sin la palabra "Puffs".
  const sufijo = iPuffs >= 0 ? palabras.slice(iPuffs + 1).filter((w) => !/^puffs?$/i.test(w)).join(' ') : '';
  return { base, puffs, sufijo };
}

function prefijoComun(listas: string[][]) {
  const n = Math.min(...listas.map((l) => l.length));
  let k = 0;
  while (k < n && listas.every((l) => l[k].toLowerCase() === listas[0][k].toLowerCase())) k++;
  return k;
}

/**
 * Agrupa el catálogo por línea de producto (modelo + puffs) para poder marcar
 * una línea entera de una vez. El catálogo de Bsale no trae la línea como
 * campo, así que se deduce del nombre: mismos puffs y misma marca = misma
 * línea, salvo que tras la parte común venga un token corto distinto
 * ("Pulse 2" vs "Pulse X", ambos de 25.000) — ahí se separan.
 */
export function agruparPorLinea(productos: Producto[]): LineaProductos[] {
  type Parte = { producto: Producto } & ReturnType<typeof partesNombre>;
  const porPuffs = new Map<string, Parte[]>();
  for (const producto of productos) {
    const partes = partesNombre(producto);
    const clave = `${producto.marca.toUpperCase()}|${partes.puffs}`;
    porPuffs.set(clave, [...(porPuffs.get(clave) ?? []), { producto, ...partes }]);
  }

  const lineas: LineaProductos[] = [];
  const separar = (grupo: Parte[]) => {
    const k = prefijoComun(grupo.map((g) => g.base));
    const siguientes = grupo.map((g) => (g.base[k] ?? '').toLowerCase());
    if (grupo.length > 1 && siguientes.every((w) => w.length > 0 && w.length <= 2) && new Set(siguientes).size > 1) {
      for (const token of new Set(siguientes)) separar(grupo.filter((g, i) => siguientes[i] === token));
      return;
    }
    const { puffs } = grupo[0];
    const textoPuffs = puffs ? ` · ${puffs.toLocaleString('es-CL')} puffs` : '';
    // Con un solo producto no hay parte común que separe modelo de sabor.
    const modelo = grupo.length > 1 ? grupo[0].base.slice(0, k).join(' ') : grupo[0].producto.marca;
    const sabores = grupo.map((g) => (grupo.length > 1 ? g.base.slice(k) : g.base).join(' ') || g.producto.nombre);
    const repetido = (s: string) => sabores.filter((x) => x.toLowerCase() === s.toLowerCase()).length > 1;
    lineas.push({
      clave: `${grupo[0].producto.marca}|${puffs}|${modelo}`,
      titulo: `${modelo}${textoPuffs}`,
      items: grupo
        .map((g, i) => ({
          producto: g.producto,
          // Ej. Meloso Max "Mexico Mango" normal y "Mexico Mango (Aramco)".
          sabor: repetido(sabores[i]) && g.sufijo ? `${sabores[i]} (${g.sufijo})` : sabores[i],
        }))
        .sort((a, b) => a.sabor.localeCompare(b.sabor)),
    });
  };
  porPuffs.forEach(separar);
  return lineas.sort((a, b) => a.titulo.localeCompare(b.titulo));
}
