import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { signOut } from 'firebase/auth';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, GhostButton, PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { auth } from '../lib/firebase';
import { primerNombre, tiendasMinimasDe, useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { vendedor, jornada, tiendas, visitas, iniciarJornada } = useTerrenoStore();

  const fecha = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Pie con lo secundario: administración, cerrar sesión y versión. Va abajo
  // y en gris para que no compita con las acciones del día.
  const pie = (
    <View style={styles.pie}>
      {vendedor.rol === 'supervisor' && (
        <Pressable style={styles.pieBoton} onPress={() => navigation.navigate('AdminTiendas')}>
          <Text style={styles.pieAdmin}>Administración</Text>
        </Pressable>
      )}
      <Pressable style={styles.pieBoton} onPress={() => signOut(auth)}>
        <Text style={styles.pieCerrar}>Cerrar sesión</Text>
      </Pressable>
      <Text style={styles.version}>Versión {VERSION}</Text>
    </View>
  );

  if (!jornada) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
          <Title>Hola, {primerNombre(vendedor.nombre)}</Title>
          <Subtitle>{fecha}</Subtitle>

          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Tu día aún no comienza</Text>
            <Text style={styles.heroText}>Inicia tu día para ver tu ruta de hoy.</Text>
            <BotonHero
              title="Iniciar día"
              onPress={() => {
                iniciarJornada();
                // Inicio queda debajo de la ruta: así el botón atrás (y el del
                // navegador/celular) vuelve aquí en vez de no llevar a ninguna parte.
                navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'Ruta' }] });
              }}
            />
          </View>

          <View style={{ flex: 1 }} />
          {pie}
        </ScrollView>
      </Screen>
    );
  }

  const minimas = tiendasMinimasDe(tiendas, vendedor.id);
  const visitadasIds = new Set(visitas.map((v) => v.tiendaId));
  const visitadas = minimas.filter((t) => visitadasIds.has(t.id)).length;
  const metaDelDia = vendedor.minimoDiario > 0 ? vendedor.minimoDiario : minimas.length;
  const entregas = visitas.filter((v) => v.modo === 'presencial' && v.tipo === 'venta').length;
  const mantenciones = visitas.filter((v) => v.modo === 'presencial' && v.tipo === 'mantencion').length;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <Title>Hola, {primerNombre(vendedor.nombre)}</Title>
        <Subtitle>{fecha}</Subtitle>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Ruta en curso</Text>
          <Text style={styles.heroText}>
            {visitadas} de {metaDelDia} tiendas visitadas
          </Text>
          <BotonHero title="Ver ruta del día" onPress={() => navigation.navigate('Ruta')} />
        </View>

        <View style={styles.statsRow}>
          <Card style={{ flex: 1 }}>
            <Text style={styles.statNum}>{entregas}</Text>
            <Text style={styles.statLbl}>Con pedido hoy</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={styles.statNum}>{mantenciones}</Text>
            <Text style={styles.statLbl}>Sin pedido hoy</Text>
          </Card>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <GhostButton title="Tiendas de región" onPress={() => navigation.navigate('TiendasRegion')} />
        </View>

        <View style={{ flex: 1, minHeight: spacing.xl }} />

        <PrimaryButton title="Finalizar día" onPress={() => navigation.navigate('CierreDia')} />
        {pie}
      </ScrollView>
    </Screen>
  );
}

/** Botón blanco sobre el bloque verde (el PrimaryButton verde no se veía ahí). */
function BotonHero({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.heroBoton, pressed && { opacity: 0.85 }]} onPress={onPress}>
      <Text style={styles.heroBotonTexto}>{title}</Text>
    </Pressable>
  );
}

/** Fecha y hora del build (scripts/buildWeb.js). Sirve para confirmar qué
 * versión tiene abierta un vendedor; "desarrollo" = `expo start` local. */
const VERSION = process.env.EXPO_PUBLIC_VERSION || 'desarrollo';

const styles = StyleSheet.create({
  contenido: { flexGrow: 1 },
  hero: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroTitle: { color: colors.accentInk, fontWeight: '700', fontSize: 19, marginBottom: 6 },
  heroText: { color: colors.accentInk, opacity: 0.9, marginBottom: spacing.lg, fontSize: 16, lineHeight: 22 },
  heroBoton: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBotonTexto: { color: colors.accent, fontWeight: '700', fontSize: 16 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statNum: { fontSize: 24, fontWeight: '700', color: colors.ink },
  statLbl: { fontSize: 14, color: colors.inkSoft, marginTop: 2 },
  pie: { alignItems: 'center', marginTop: spacing.lg },
  pieBoton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.lg },
  pieAdmin: { color: colors.accent, fontWeight: '600', fontSize: 15 },
  pieCerrar: { color: colors.inkSoft, fontWeight: '600', fontSize: 15 },
  version: { fontSize: 12.5, color: colors.inkFaint, textAlign: 'center', marginTop: spacing.xs },
});
