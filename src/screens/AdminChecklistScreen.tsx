import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Badge, Field, PrimaryButton, Screen, Subtitle, TextLink, Title } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';
import { PreguntaMantencion } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminChecklist'>;

/**
 * Preguntas del checklist de mantención (colección `preguntasMantencion`).
 * Las preguntas no se borran, se desactivan: así el historial queda
 * coherente (igual cada visita guarda una copia del texto que se respondió).
 */
export default function AdminChecklistScreen({ navigation }: Props) {
  const { preguntasMantencion, crearPreguntaMantencion, actualizarPreguntaMantencion, moverPreguntaMantencion } =
    useTerrenoStore();
  const [nueva, setNueva] = useState('');
  const [editando, setEditando] = useState<PreguntaMantencion | null>(null);
  const [textoEditado, setTextoEditado] = useState('');

  const activas = preguntasMantencion.filter((p) => p.activa).length;

  function agregar() {
    if (!nueva.trim()) return;
    crearPreguntaMantencion(nueva);
    setNueva('');
  }

  return (
    <Screen>
      <View style={{ marginBottom: spacing.sm }}>
        <TextLink title="← Volver" onPress={() => navigation.goBack()} />
      </View>
      <Title>Checklist de mantención</Title>
      <Subtitle>
        {activas} {activas === 1 ? 'pregunta activa' : 'preguntas activas'}. Se responden con Sí / No / No aplica en cada
        visita presencial. Si no hay ninguna activa, la visita se salta este paso.
      </Subtitle>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {preguntasMantencion.map((p, i) => (
          <View key={p.id} style={[styles.fila, !p.activa && { opacity: 0.55 }]}>
            <View style={styles.flechas}>
              <Pressable hitSlop={6} disabled={i === 0} onPress={() => moverPreguntaMantencion(p.id, -1)}>
                <Text style={[styles.flecha, i === 0 && styles.flechaOff]}>▲</Text>
              </Pressable>
              <Pressable
                hitSlop={6}
                disabled={i === preguntasMantencion.length - 1}
                onPress={() => moverPreguntaMantencion(p.id, 1)}
              >
                <Text style={[styles.flecha, i === preguntasMantencion.length - 1 && styles.flechaOff]}>▼</Text>
              </Pressable>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.texto}>{p.texto}</Text>
              {!p.activa ? <Badge tone="neutral">Desactivada</Badge> : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: spacing.sm }}>
              <TextLink
                title="Editar"
                onPress={() => {
                  setEditando(p);
                  setTextoEditado(p.texto);
                }}
              />
              <TextLink
                title={p.activa ? 'Desactivar' : 'Activar'}
                tone={p.activa ? 'danger' : 'accent'}
                onPress={() => actualizarPreguntaMantencion(p.id, { activa: !p.activa })}
              />
            </View>
          </View>
        ))}

        <View style={{ marginTop: spacing.lg }}>
          <Field label="Nueva pregunta" placeholder="Ej: ¿La luz del exhibidor funciona?" value={nueva} onChangeText={setNueva} />
          <PrimaryButton title="Agregar pregunta" disabled={!nueva.trim()} onPress={agregar} />
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={!!editando} transparent animationType="slide" onRequestClose={() => setEditando(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitulo}>Editar pregunta</Text>
            <TextInput style={styles.input} value={textoEditado} onChangeText={setTextoEditado} multiline autoFocus />
            <Text style={styles.ayuda}>Las visitas ya registradas conservan el texto con que se respondieron.</Text>
            <PrimaryButton
              title="Guardar"
              disabled={!textoEditado.trim()}
              onPress={() => {
                if (editando) actualizarPreguntaMantencion(editando.id, { texto: textoEditado });
                setEditando(null);
              }}
            />
            <Pressable onPress={() => setEditando(null)} style={{ marginTop: spacing.md, alignItems: 'center' }}>
              <Text style={{ color: colors.inkSoft, fontWeight: '600' }}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  flechas: { gap: 6, alignItems: 'center' },
  flecha: { fontSize: 13, color: colors.accent },
  flechaOff: { color: colors.border },
  texto: { fontSize: 14, fontWeight: '600', color: colors.ink },
  overlay: { flex: 1, backgroundColor: 'rgba(15,25,22,0.42)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgElevated, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl },
  sheetTitulo: { fontWeight: '700', fontSize: 16, marginBottom: spacing.md, color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 14.5,
    color: colors.ink,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  ayuda: { fontSize: 12, color: colors.inkFaint, marginTop: spacing.sm, marginBottom: spacing.lg },
});
