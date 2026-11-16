import { Producto, Tienda } from '../types';

type Cadena = 'copec' | 'shell' | 'aramco' | 'otra';

/** Las tiendas importadas tienen id `<cadena>-<código>`; las creadas por un vendedor tienen id aleatorio. */
export function cadenaDeTienda(tienda: Tienda): Cadena {
  const prefijo = tienda.id.split('-')[0];
  return prefijo === 'copec' || prefijo === 'shell' || prefijo === 'aramco' ? prefijo : 'otra';
}

const esVarianteShell = (p: Producto) => /\bshell\b/i.test(p.nombre);
const esVarianteAramco = (p: Producto) => /\baramco\b/i.test(p.nombre);

/**
 * Qué marcas se venden en cada cadena (definido por el equipo 2026-11-16):
 * Copec solo Ignite, Shell solo GeekBar, Aramco GeekBar y Upends, cualquier
 * otra tienda todo. Las variantes con "SHELL"/"ARAMCO" en el nombre son
 * exclusivas de esa cadena.
 */
export function productosParaTienda(productos: Producto[], tienda: Tienda | undefined): Producto[] {
  const cadena = tienda ? cadenaDeTienda(tienda) : 'otra';
  const marca = (p: Producto) => p.marca.toUpperCase();
  switch (cadena) {
    case 'copec':
      return productos.filter((p) => marca(p) === 'IGNITE');
    case 'shell':
      return productos.filter((p) => marca(p) === 'GEEKBAR' && !esVarianteAramco(p));
    case 'aramco':
      return productos.filter((p) => ['GEEKBAR', 'UPENDS'].includes(marca(p)) && !esVarianteShell(p));
    default:
      return productos.filter((p) => !esVarianteShell(p));
  }
}
