import { Tienda, Vendedor } from '../types';

/**
 * Datos de ejemplo para desarrollar sin depender todavía de Firebase / Bsale.
 * Mismos locales que se usaron en el mockup interactivo, para que la demo
 * en el celular se sienta igual a lo que ya se validó con el equipo.
 */

export const vendedorDemo: Vendedor = {
  id: 'v1',
  nombre: 'Camila Rojas',
  email: 'camila.rojas@distribuidoraandina.cl',
};

export const tiendasDemo: Tienda[] = [
  {
    id: 't1',
    nombre: 'Minimarket Los Aromos',
    direccion: 'Av. Los Aromos 482',
    comuna: 'Providencia',
    tipoNegocio: 'Minimarket',
    esMinima: true,
    distanciaKm: 0.8,
  },
  {
    id: 't2',
    nombre: 'Botillería El Litre',
    direccion: 'Irarrázaval 3210',
    comuna: 'Ñuñoa',
    tipoNegocio: 'Botillería',
    esMinima: true,
    distanciaKm: 1.4,
  },
  {
    id: 't3',
    nombre: 'Almacén Doña Rosa',
    direccion: 'Los Plátanos 1560',
    comuna: 'Macul',
    tipoNegocio: 'Almacén de barrio',
    esMinima: true,
    distanciaKm: 2.1,
  },
  {
    id: 't4',
    nombre: 'Supermercado Full Fresh',
    direccion: 'Larraín 5870',
    comuna: 'La Reina',
    tipoNegocio: 'Supermercado',
    esMinima: true,
    distanciaKm: 3.6,
  },
];
