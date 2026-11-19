import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Field, PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { formatearFecha } from '../components/VisitaFila';
import { colors, radius, spacing } from '../theme';
import { agruparPorLinea, productosParaTienda } from '../lib/catalogo';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';
import { InventarioTienda, ItemInventario, Producto } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Inventario'>;
type Lugar = 'exhibidor' | 'bodega';

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Productos en tienda (2026-11-18): después de "¿Con quién hablaste?" y antes
 * de "¿Hay pedido?" (orden pedido por el equipo 2026-11-19), qué
 * productos hay en el exhibidor y en la bodega — solo presencia, por sabor,
 * sin cantidades. Se precarga con el último inventario de la tienda para que
 * el vendedor solo corrija lo que cambió. Para continuar sin marcar nada hay
 * que confirmar "vacío" (si no, no se distingue de saltarse el paso), y la
 * bodega admite "No pude revisarla".
 */
export default function InventarioScreen({ navigation, route }: Props) {
  const { tiendaId } = route.params;
  const { tiendas, productos: catalogo, borrador, actualizarBorrador } = useTerrenoStore();
  const tienda = tiendas.find((t) => t.id === tiendaId);
  const productos = useMemo(() => productosParaTienda(catalogo, tienda), [catalogo, tienda]);
  const lineas = useMemo(() => agruparPorLinea(productos), [productos]);

  // Si vuelve atrás a esta pantalla se respeta lo que ya marcó en esta visita;
  // si no, se parte del último inventario conocido de la tienda.
  const [inicial] = useState(() => {
    const ids = new Set(productos.map((p) => p.id));
    const delBorrador = borrador?.tiendaId === tiendaId ? borrador.inventario : undefined;
    const fuente = delBorrador ?? tienda?.ultimoInventario;
    const solo = (items?: ItemInventario[]) => new Set((items ?? []).map((i) => i.productoId).filter((id) => ids.has(id)));
    return {
      exhibidor: solo(fuente?.exhibidor),
      bodega: fuente?.bodegaRevisada === false ? new Set<string>() : solo(fuente?.bodega),
      bodegaRevisada: delBorrador ? delBorrador.bodegaRevisada : true,
      fechaPrecarga: !delBorrador && tienda?.ultimoInventario ? tienda.ultimoInventario.fecha : undefined,
      vacioConfirmado: !!delBorrador,
    };
  });
  const [marcados, setMarcados] = useState<Record<Lugar, Set<string>>>({
    exhibidor: inicial.exhibidor,
    bodega: inicial.bodega,
  });
  const [bodegaRevisada, setBodegaRevisada] = useState(inicial.bodegaRevisada);
  const [exhibidorVacio, setExhibidorVacio] = useState(inicial.vacioConfirmado && !inicial.exhibidor.size);
  const [bodegaVacia, setBodegaVacia] = useState(inicial.vacioConfirmado && !inicial.bodega.size);
  const [busqueda, setBusqueda] = useState('');

  const visibles = useMemo(() => {
    const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
    if (!palabras.length) return lineas;
    return lineas
      .map((l) => ({
        ...l,
        items: l.items.filter((i) => {
          const texto = normalizar(`${l.titulo} ${i.producto.nombre} ${i.producto.sku}`);
          return palabras.every((w) => texto.includes(w));
        }),
      }))
      .filter((l) => l.items.length);
  }, [lineas, busqueda]);

  const nExhibidor = marcados.exhibidor.size;
  const nBodega = bodegaRevisada ? marcados.bodega.size : 0;
  const exhibidorListo = nExhibidor > 0 || exhibidorVacio;
  const bodegaLista = !bodegaRevisada || nBodega > 0 || bodegaVacia;

  function alternar(lugar: Lugar, ids: string[]) {
    setMarcados((actual) => {
      const nuevo = new Set(actual[lugar]);
      // En una línea completa: si ya están todos, se desmarcan; si no, se marcan todos.
      const todos = ids.every((id) => nuevo.has(id));
      ids.forEach((id) => (todos ? nuevo.delete(id) : nuevo.add(id)));
      return { ...actual, [lugar]: nuevo };
    });
    if (lugar === 'exhibidor') setExhibidorVacio(false);
    else setBodegaVacia(false);
  }

  function continuar() {
    const aItems = (ids: Set<string>): ItemInventario[] =>
      productos.filter((p) => ids.has(p.id)).map((p) => ({ productoId: p.id, nombre: p.nombre, sku: p.sku }));
    const inventario: InventarioTienda = {
      exhibidor: aItems(marcados.exhibidor),
      bodega: bodegaRevisada ? aItems(marcados.bodega) : [],
      bodegaRevisada,
    };
    actualizarBorrador({ inventario });
    navigation.navigate('TipoVisita', { tiendaId });
  }

  return (
    <Screen>
      <Title>Productos en tienda</Title>
      <Subtitle>{tienda?.nombre} · marca lo que hay, sin cantidades</Subtitle>

      {inicial.fechaPrecarga ? (
        <Text style={styles.precarga}>
          Precargado con lo que había el {formatearFecha(inicial.fechaPrecarga)}. Corrige lo que cambió.
        </Text>
      ) : null}

      <Field label="Buscar producto" placeholder="Ej: meloso mango" value={busqueda} onChangeText={setBusqueda} />

      <Casilla
        texto="No pude revisar la bodega"
        marcada={!bodegaRevisada}
        onPress={() => setBodegaRevisada((r) => !r)}
      />

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {visibles.map((linea) => {
          const ids = linea.items.map((i) => i.producto.id);
          return (
            <View key={linea.clave} style={styles.linea}>
              <Text style={styles.lineaTitulo}>{linea.titulo}</Text>
              <View style={styles.lineaAcciones}>
                <AccionLinea texto="Toda en exhibidor" onPress={() => alternar('exhibidor', ids)} />
                {bodegaRevisada ? <AccionLinea texto="Toda en bodega" onPress={() => alternar('bodega', ids)} /> : null}
              </View>
              {linea.items.map(({ producto, sabor }) => (
                <FilaProducto
                  key={producto.id}
                  producto={producto}
                  sabor={sabor}
                  enExhibidor={marcados.exhibidor.has(producto.id)}
                  enBodega={bodegaRevisada ? marcados.bodega.has(producto.id) : null}
                  onAlternar={(lugar) => alternar(lugar, [producto.id])}
                />
              ))}
            </View>
          );
        })}
        {!visibles.length ? (
          <Text style={styles.vacio}>
            {productos.length === 0
              ? 'No hay productos cargados. Revisa tu conexión o avisa a un supervisor.'
              : 'Ningún producto coincide con la búsqueda.'}
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.pie}>
        <Text style={styles.resumen}>
          Exhibidor: {nExhibidor} · Bodega: {bodegaRevisada ? nBodega : 'no revisada'}
        </Text>
        {nExhibidor === 0 ? (
          <Casilla texto="El exhibidor está vacío" marcada={exhibidorVacio} onPress={() => setExhibidorVacio((v) => !v)} />
        ) : null}
        {bodegaRevisada && nBodega === 0 ? (
          <Casilla texto="La bodega está vacía" marcada={bodegaVacia} onPress={() => setBodegaVacia((v) => !v)} />
        ) : null}
        <PrimaryButton title="Continuar" disabled={!exhibidorListo || !bodegaLista} onPress={continuar} />
      </View>
    </Screen>
  );
}

function FilaProducto({
  producto,
  sabor,
  enExhibidor,
  enBodega,
  onAlternar,
}: {
  producto: Producto;
  sabor: string;
  enExhibidor: boolean;
  /** null = bodega no revisada (no se muestra el botón). */
  enBodega: boolean | null;
  onAlternar: (lugar: Lugar) => void;
}) {
  return (
    <View style={[styles.fila, (enExhibidor || enBodega) && styles.filaMarcada]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sabor}>{sabor}</Text>
        <Text style={styles.sku}>{producto.sku}</Text>
      </View>
      <Toggle texto="Exhibidor" activo={enExhibidor} onPress={() => onAlternar('exhibidor')} />
      {enBodega !== null ? <Toggle texto="Bodega" activo={enBodega} onPress={() => onAlternar('bodega')} /> : null}
    </View>
  );
}

function Toggle({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.toggle, activo && styles.toggleActivo]} onPress={onPress} hitSlop={4}>
      <Text style={[styles.toggleTexto, activo && styles.toggleTextoActivo]}>
        {activo ? '✓ ' : ''}
        {texto}
      </Text>
    </Pressable>
  );
}

function AccionLinea({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Text style={styles.accionLinea}>{texto}</Text>
    </Pressable>
  );
}

function Casilla({ texto, marcada, onPress }: { texto: string; marcada: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.casilla} onPress={onPress} hitSlop={4}>
      <View style={[styles.caja, marcada && styles.cajaMarcada]}>
        {marcada ? <Text style={styles.cajaCheck}>✓</Text> : null}
      </View>
      <Text style={styles.casillaTexto}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  precarga: {
    backgroundColor: colors.accentSoft,
    color: colors.ink,
    fontSize: 12.5,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  linea: { marginBottom: spacing.lg },
  lineaTitulo: { fontSize: 13, fontWeight: '700', color: colors.ink, textTransform: 'uppercase', letterSpacing: 0.3 },
  lineaAcciones: { flexDirection: 'row', gap: spacing.lg, marginTop: 4, marginBottom: spacing.xs },
  accionLinea: { color: colors.accent, fontWeight: '600', fontSize: 12.5 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filaMarcada: { backgroundColor: colors.accentSoft },
  sabor: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  sku: { fontSize: 11, color: colors.inkFaint, marginTop: 1 },
  toggle: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.bgElevated,
  },
  toggleActivo: { backgroundColor: colors.accent, borderColor: colors.accent },
  toggleTexto: { fontSize: 12, fontWeight: '700', color: colors.inkSoft },
  toggleTextoActivo: { color: colors.accentInk },
  casilla: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  caja: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cajaMarcada: { backgroundColor: colors.accent, borderColor: colors.accent },
  cajaCheck: { color: colors.accentInk, fontWeight: '800', fontSize: 13 },
  casillaTexto: { fontSize: 13.5, color: colors.ink, fontWeight: '600' },
  vacio: { color: colors.inkSoft, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  pie: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.xs },
  resumen: { fontSize: 13, fontWeight: '600', color: colors.ink, textAlign: 'center' },
});
