import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';
import { ItemChecklist, RespuestaChecklist } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Checklist'>;

const OPCIONES: { valor: RespuestaChecklist; texto: string }[] = [
  { valor: 'si', texto: 'Sí' },
  { valor: 'no', texto: 'No' },
  { valor: 'na', texto: 'No aplica' },
];

/**
 * Checklist de mantención del exhibidor (2026-11-18): en todas las visitas
 * presenciales, con o sin pedido, antes de la foto de después. Todas las
 * preguntas son obligatorias (Sí / No / No aplica); un "No" no exige
 * comentario — para eso están las observaciones al final. Las preguntas las
 * editan los supervisores desde el panel (`AdminChecklistScreen`).
 */
export default function ChecklistScreen({ navigation, route }: Props) {
  const { tiendaId, tipo } = route.params;
  const { tiendas, preguntasMantencion, borrador, actualizarBorrador } = useTerrenoStore();
  const tienda = tiendas.find((t) => t.id === tiendaId);
  const preguntas = preguntasMantencion.filter((p) => p.activa);
  const [respuestas, setRespuestas] = useState<Record<string, RespuestaChecklist>>(() =>
    Object.fromEntries((borrador?.checklist ?? []).map((i) => [i.preguntaId, i.respuesta]))
  );

  const completas = preguntas.every((p) => respuestas[p.id]);

  function continuar() {
    const checklist: ItemChecklist[] = preguntas.map((p) => ({
      preguntaId: p.id,
      pregunta: p.texto,
      respuesta: respuestas[p.id],
    }));
    actualizarBorrador({ checklist });
    navigation.navigate('FotoDespues', { tiendaId, tipo });
  }

  return (
    <Screen>
      <Title>Mantención del exhibidor</Title>
      <Subtitle>{tienda?.nombre}</Subtitle>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {preguntas.map((p, i) => (
          <View key={p.id} style={styles.pregunta}>
            <Text style={styles.preguntaTexto}>
              {i + 1}. {p.texto}
            </Text>
            <View style={styles.opciones}>
              {OPCIONES.map((o) => {
                const activa = respuestas[p.id] === o.valor;
                return (
                  <Pressable
                    key={o.valor}
                    style={[styles.opcion, activa && estiloActivo[o.valor]]}
                    onPress={() => setRespuestas((r) => ({ ...r, [p.id]: o.valor }))}
                  >
                    <Text style={[styles.opcionTexto, activa && styles.opcionTextoActivo]}>{o.texto}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.pie}>
        {!completas ? (
          <Text style={styles.faltan}>
            Faltan {preguntas.filter((p) => !respuestas[p.id]).length} por responder
          </Text>
        ) : null}
        <PrimaryButton title="Continuar" disabled={!completas} onPress={continuar} />
      </View>
    </Screen>
  );
}

const estiloActivo = StyleSheet.create({
  si: { backgroundColor: colors.success, borderColor: colors.success },
  no: { backgroundColor: colors.danger, borderColor: colors.danger },
  na: { backgroundColor: colors.inkSoft, borderColor: colors.inkSoft },
});

const styles = StyleSheet.create({
  pregunta: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  preguntaTexto: { fontSize: 14.5, fontWeight: '600', color: colors.ink, marginBottom: spacing.sm },
  opciones: { flexDirection: 'row', gap: spacing.sm },
  opcion: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
  },
  opcionTexto: { fontWeight: '700', fontSize: 13.5, color: colors.inkSoft },
  opcionTextoActivo: { color: colors.accentInk },
  pie: { paddingTop: spacing.md, gap: spacing.sm },
  faltan: { fontSize: 12.5, color: colors.inkSoft, textAlign: 'center' },
});
