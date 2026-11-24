import { RootStackParamList } from '../navigation/types';

export type PasoVisita =
  | 'FotoAntes'
  | 'JefeTienda'
  | 'Inventario'
  | 'TipoVisita'
  | 'Pedido'
  | 'Checklist'
  | 'FotoDespues'
  | 'Observaciones';

export const NOMBRE_PASO: Record<PasoVisita, string> = {
  FotoAntes: 'Foto de antes',
  JefeTienda: '¿Con quién hablaste?',
  Inventario: 'Productos en tienda',
  TipoVisita: '¿Hay pedido?',
  Pedido: 'Pedido',
  Checklist: 'Mantención del exhibidor',
  FotoDespues: 'Foto de después',
  Observaciones: 'Revisa y finaliza',
};

/**
 * Pasos de la visita presencial en orden, para la barra "Paso X de N".
 * "Pedido" solo va si hay pedido; mientras no se elige, se cuenta (la
 * mayoría de las visitas tienen pedido). El checklist se salta si no hay
 * preguntas activas.
 */
export function pasosVisita(tipo: 'venta' | 'mantencion' | undefined, hayChecklist: boolean): PasoVisita[] {
  return [
    'FotoAntes',
    'JefeTienda',
    'Inventario',
    'TipoVisita',
    ...(tipo === 'mantencion' ? [] : (['Pedido'] as PasoVisita[])),
    ...(hayChecklist ? (['Checklist'] as PasoVisita[]) : []),
    'FotoDespues',
    'Observaciones',
  ];
}

export function esPasoVisita(nombre: keyof RootStackParamList): nombre is PasoVisita {
  return nombre in NOMBRE_PASO;
}
