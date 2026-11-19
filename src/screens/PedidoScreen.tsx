import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Field, PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { productosParaTienda } from '../lib/catalogo';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';
import { ItemPedido, Producto } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Pedido'>;

/** Índice = en cuántos lugares está (exhibidor + bodega): 0 → 10, 1 → 5, 2 → 0.
 * Fijo por ahora (decisión 2026-11-19); si cambia seguido, moverlo al panel. */
const SUGERIDO_SEGUN_PRESENCIA = [10, 5, 0];

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export default function PedidoScreen({ navigation, route }: Props) {
  const { tiendaId } = route.params;
  const { tiendas, productos: catalogo, borrador, actualizarBorrador, preguntasMantencion } = useTerrenoStore();
  const tienda = tiendas.find((t) => t.id === tiendaId);
  const productos = useMemo(() => productosParaTienda(catalogo, tienda), [catalogo, tienda]);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'faltan' | 'seleccionados'>('todos');
  const soloSeleccionados = filtro === 'seleccionados';

  // Pedido sugerido según "Productos en tienda" (regla del equipo 2026-11-19):
  // en exhibidor y bodega → 0, en uno solo → 5, en ninguno → 10. Una bodega
  // no revisada cuenta como vacía. Todo es editable.
  const inventario = borrador?.inventario;
  const estado = useMemo(() => {
    const exhibidor = new Set((inventario?.exhibidor ?? []).map((i) => i.productoId));
    const bodega = new Set((inventario?.bodega ?? []).map((i) => i.productoId));
    return (p: Producto) => ({ enExhibidor: exhibidor.has(p.id), enBodega: bodega.has(p.id) });
  }, [inventario]);
  const sugerida = (p: Producto) => {
    if (!inventario) return 0;
    const { enExhibidor, enBodega } = estado(p);
    return SUGERIDO_SEGUN_PRESENCIA[Number(enExhibidor) + Number(enBodega)];
  };
  const falta = (p: Producto) => !!inventario && sugerida(p) > 0;
  const nFaltan = productos.filter(falta).length;

  // Solo se guardan los cambios a mano; el resto sale de la sugerencia, así
  // si el vendedor vuelve atrás y corrige el stock, lo no tocado se recalcula.
  const [manual, setManual] = useState<Record<string, number>>(() => borrador?.pedidoManual ?? {});
  const cantidades: Record<string, number> = useMemo(
    () => ({ ...Object.fromEntries(productos.map((p) => [p.id, sugerida(p)])), ...manual }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productos, estado, manual]
  );

  const seleccionados = productos.filter((p) => (cantidades[p.id] ?? 0) > 0);
  const totalUnidades = seleccionados.reduce((n, p) => n + cantidades[p.id], 0);

  const visibles = useMemo(() => {
    const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
    return productos
      .filter((p) => !soloSeleccionados || (cantidades[p.id] ?? 0) > 0)
      .filter((p) => filtro !== 'faltan' || falta(p))
      .filter((p) => {
        const texto = normalizar(`${p.nombre} ${p.marca} ${p.sku}`);
        return palabras.every((w) => texto.includes(w));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos, busqueda, soloSeleccionados, filtro, estado, cantidades]);

  function fijar(productoId: string, cantidad: number) {
    const nuevo = { ...manual, [productoId]: Math.max(0, cantidad) };
    setManual(nuevo);
    // Al borrador de inmediato: si vuelve atrás sin "Continuar", no pierde lo ajustado.
    actualizarBorrador({ pedidoManual: nuevo });
  }

  function aviso(p: Producto) {
    if (!inventario) return undefined;
    const { enExhibidor, enBodega } = estado(p);
    if (enExhibidor && enBodega) return undefined;
    const bodega = inventario.bodegaRevisada ? 'bodega' : 'bodega (sin revisar)';
    if (!enExhibidor && !enBodega) return `No está en exhibidor ni ${bodega}`;
    return enExhibidor ? `Falta en ${bodega}` : 'Falta en exhibidor';
  }

  function continuar() {
    const pedido: ItemPedido[] = seleccionados.map((p) => ({
      productoId: p.id,
      nombre: p.nombre,
      sku: p.sku,
      cantidad: cantidades[p.id],
    }));
    actualizarBorrador({ pedido });
    navigation.navigate(preguntasMantencion.some((p) => p.activa) ? 'Checklist' : 'FotoDespues', {
      tiendaId,
      tipo: 'venta',
    });
  }

  return (
    <Screen>
      <Title>Pedido</Title>
      <Subtitle>{tienda?.nombre}</Subtitle>

      {inventario ? (
        <Text style={styles.sugerencia}>
          Cantidades sugeridas según el stock que marcaste: 10 si no está en ningún lado, 5 si falta en exhibidor o
          bodega. Ajusta lo que necesites.
        </Text>
      ) : null}

      <Field label="Buscar producto" placeholder="Ej: ignite v80 mint" value={busqueda} onChangeText={setBusqueda} />

      <View style={styles.filtros}>
        <Chip texto={`Todos (${productos.length})`} activo={filtro === 'todos'} onPress={() => setFiltro('todos')} />
        {inventario ? (
          <Chip texto={`Faltan (${nFaltan})`} activo={filtro === 'faltan'} onPress={() => setFiltro('faltan')} />
        ) : null}
        <Chip
          texto={`Seleccionados (${seleccionados.length})`}
          activo={soloSeleccionados}
          onPress={() => setFiltro('seleccionados')}
        />
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={visibles}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <FilaProducto
            producto={item}
            cantidad={cantidades[item.id] ?? 0}
            onCambiar={(c) => fijar(item.id, c)}
            aviso={aviso(item)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.vacio}>
            {productos.length === 0
              ? 'No hay productos cargados. Revisa tu conexión o avisa a un supervisor.'
              : soloSeleccionados
                ? 'Aún no seleccionas productos.'
                : filtro === 'faltan' && !busqueda.trim()
                  ? 'No falta ningún producto en la tienda.'
                  : 'Ningún producto coincide con la búsqueda.'}
          </Text>
        }
      />

      <View style={styles.pie}>
        <Text style={styles.resumen}>
          {seleccionados.length} {seleccionados.length === 1 ? 'producto' : 'productos'} · {totalUnidades}{' '}
          {totalUnidades === 1 ? 'unidad' : 'unidades'}
        </Text>
        <PrimaryButton title="Continuar" disabled={seleccionados.length === 0} onPress={continuar} />
      </View>
    </Screen>
  );
}

function FilaProducto({
  producto,
  cantidad,
  onCambiar,
  aviso,
}: {
  producto: Producto;
  cantidad: number;
  onCambiar: (cantidad: number) => void;
  /** Ej. "No está en la tienda" — sugerencia para pedir. */
  aviso?: string;
}) {
  return (
    <View style={[styles.fila, cantidad > 0 && styles.filaSeleccionada]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.nombre}>{producto.nombre}</Text>
        <Text style={styles.meta}>
          {producto.marca} · {producto.sku}
        </Text>
        {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}
      </View>
      {cantidad === 0 ? (
        <Pressable style={styles.agregar} onPress={() => onCambiar(1)} hitSlop={6}>
          <Text style={styles.agregarTexto}>Agregar</Text>
        </Pressable>
      ) : (
        <View style={styles.contador}>
          <Pressable style={styles.botonContador} onPress={() => onCambiar(cantidad - 1)} hitSlop={6}>
            <Text style={styles.botonContadorTexto}>−</Text>
          </Pressable>
          <TextInput
            style={styles.cantidad}
            keyboardType="number-pad"
            value={String(cantidad)}
            onChangeText={(t) => onCambiar(parseInt(t.replace(/\D/g, ''), 10) || 0)}
            selectTextOnFocus
          />
          <Pressable style={styles.botonContador} onPress={() => onCambiar(cantidad + 1)} hitSlop={6}>
            <Text style={styles.botonContadorTexto}>+</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Chip({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, activo && styles.chipActivo]} onPress={onPress}>
      <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sugerencia: {
    backgroundColor: colors.accentSoft,
    color: colors.ink,
    fontSize: 12.5,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  filtros: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  chipActivo: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTexto: { fontSize: 12.5, fontWeight: '600', color: colors.inkSoft },
  chipTextoActivo: { color: colors.accentInk },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filaSeleccionada: { backgroundColor: colors.accentSoft },
  nombre: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  meta: { fontSize: 11.5, color: colors.inkFaint, marginTop: 2 },
  aviso: { fontSize: 11.5, color: colors.amber, fontWeight: '700', marginTop: 2 },
  agregar: { borderWidth: 1.5, borderColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 7 },
  agregarTexto: { color: colors.accent, fontWeight: '700', fontSize: 12.5 },
  contador: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  botonContador: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonContadorTexto: { color: colors.accentInk, fontWeight: '700', fontSize: 17 },
  cantidad: {
    width: 44,
    height: 32,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 14,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
  },
  vacio: { color: colors.inkSoft, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  pie: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  resumen: { fontSize: 13, fontWeight: '600', color: colors.ink, textAlign: 'center' },
});
