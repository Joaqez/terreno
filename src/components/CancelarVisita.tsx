import { NavigationProp, useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { avisar } from '../lib/avisos';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

/**
 * Botón "Cancelar" de la barra de arriba en todos los pasos de una visita
 * presencial (2026-11-23). Pide confirmar, bota la visita a medias sin
 * guardar nada y vuelve a la ruta. Las fotos que ya se subieron quedan en
 * Storage, pero no quedan asociadas a ninguna visita.
 * (Alert.alert no funciona en web, por eso la confirmación es un Modal.)
 */
export default function CancelarVisita() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const descartarBorrador = useTerrenoStore((s) => s.descartarBorrador);
  const [confirmando, setConfirmando] = useState(false);

  function cancelar() {
    setConfirmando(false);
    descartarBorrador();
    navigation.navigate('Ruta');
    avisar('Visita cancelada, no se guardó nada');
  }

  return (
    <>
      <Pressable onPress={() => setConfirmando(true)} style={styles.boton} hitSlop={8}>
        <Text style={styles.botonTexto}>Cancelar</Text>
      </Pressable>

      <Modal visible={confirmando} transparent animationType="fade" onRequestClose={() => setConfirmando(false)}>
        <View style={styles.overlay}>
          <View style={styles.caja}>
            <Text style={styles.titulo}>¿Cancelar esta visita?</Text>
            <Text style={styles.texto}>Se pierde lo que llevas registrado y la tienda vuelve a quedar pendiente.</Text>
            <Pressable style={styles.peligro} onPress={cancelar}>
              <Text style={styles.peligroTexto}>Sí, cancelar visita</Text>
            </Pressable>
            <Pressable style={styles.seguir} onPress={() => setConfirmando(false)}>
              <Text style={styles.seguirTexto}>Seguir con la visita</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  boton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  botonTexto: { color: colors.danger, fontWeight: '600', fontSize: 15.5 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,25,22,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  caja: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 380,
  },
  titulo: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: spacing.sm },
  texto: { fontSize: 15, color: colors.inkSoft, lineHeight: 21, marginBottom: spacing.lg },
  peligro: {
    backgroundColor: colors.danger,
    borderRadius: radius.sm,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peligroTexto: { color: colors.accentInk, fontWeight: '700', fontSize: 16 },
  seguir: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  seguirTexto: { color: colors.ink, fontWeight: '600', fontSize: 16 },
});
