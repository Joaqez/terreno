import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { useTerrenoStore } from '../lib/store';
import { JefeTienda } from '../types';
import { Field, PrimaryButton, TextLink } from './ui';

/** Compara teléfonos ignorando formato y prefijo (+56 9 ...): últimos 8 dígitos. */
function claveTelefono(telefono?: string) {
  const digitos = (telefono ?? '').replace(/\D/g, '');
  return digitos.length >= 8 ? digitos.slice(-8) : '';
}

/**
 * Crear o editar un jefe de tienda. Solo el nombre es obligatorio (sin marcar
 * los otros campos como "opcional", a pedido del equipo). Al editar, incluye
 * "Ya no trabaja aquí" para darlo de baja sin borrarlo del historial.
 */
export default function JefeTiendaModal({
  visible,
  tiendaId,
  jefe,
  onCerrar,
  onGuardado,
}: {
  visible: boolean;
  tiendaId: string;
  /** Si viene, se edita ese jefe; si no, se crea uno nuevo. */
  jefe?: JefeTienda | null;
  onCerrar: () => void;
  onGuardado?: (jefe: JefeTienda) => void;
}) {
  const { jefesTienda, crearJefeTienda, actualizarJefeTienda, darDeBajaJefeTienda } = useTerrenoStore();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);

  useEffect(() => {
    if (visible) {
      setNombre(jefe?.nombre ?? '');
      setTelefono(jefe?.telefono ?? '');
      setEmail(jefe?.email ?? '');
      setConfirmandoBaja(false);
    }
  }, [visible, jefe]);

  const clave = claveTelefono(telefono);
  const duplicado = clave
    ? jefesTienda.find((j) => j.tiendaId === tiendaId && j.activo && j.id !== jefe?.id && claveTelefono(j.telefono) === clave)
    : undefined;

  function guardar() {
    const datos = { nombre, telefono, email };
    if (jefe) {
      actualizarJefeTienda(jefe.id, datos);
      onGuardado?.({ ...jefe, nombre: nombre.trim(), telefono: telefono.trim(), email: email.trim() });
    } else {
      onGuardado?.(crearJefeTienda(tiendaId, datos));
    }
    onCerrar();
  }

  function darDeBaja() {
    if (!jefe) return;
    darDeBajaJefeTienda(jefe.id);
    onCerrar();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.titulo}>{jefe ? 'Editar jefe de tienda' : 'Nuevo jefe de tienda'}</Text>
            <Field label="Nombre" placeholder="Ej: María González" value={nombre} onChangeText={setNombre} autoFocus={!jefe} />
            <Field
              label="Teléfono"
              placeholder="+56 9 ...."
              value={telefono}
              onChangeText={setTelefono}
              keyboardType="phone-pad"
            />
            {duplicado ? (
              <Text style={styles.aviso}>
                {duplicado.nombre} ya está registrado con este teléfono en esta tienda. ¿Es la misma persona?
              </Text>
            ) : null}
            <Field
              label="Correo"
              placeholder="nombre@correo.cl"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <PrimaryButton title="Guardar" disabled={!nombre.trim()} onPress={guardar} />

            {jefe ? (
              <View style={styles.baja}>
                {confirmandoBaja ? (
                  <>
                    <Text style={styles.bajaTexto}>
                      {jefe.nombre} dejará de aparecer en las visitas. Queda en el historial del panel.
                    </Text>
                    <Pressable style={styles.bajaBoton} onPress={darDeBaja}>
                      <Text style={styles.bajaBotonTexto}>Sí, ya no trabaja aquí</Text>
                    </Pressable>
                  </>
                ) : (
                  <TextLink title="Ya no trabaja aquí" tone="danger" onPress={() => setConfirmandoBaja(true)} />
                )}
              </View>
            ) : null}

            <Pressable onPress={onCerrar} style={styles.cancelar}>
              <Text style={styles.cancelarTexto}>Cancelar</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,25,22,0.42)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    maxHeight: '90%',
  },
  titulo: { fontWeight: '700', fontSize: 16, marginBottom: spacing.lg, color: colors.ink },
  aviso: {
    backgroundColor: colors.amberSoft,
    color: colors.amber,
    fontSize: 12.5,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  baja: { marginTop: spacing.lg, alignItems: 'center', gap: spacing.sm },
  bajaTexto: { fontSize: 12.5, color: colors.inkSoft, textAlign: 'center' },
  bajaBoton: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    paddingVertical: 11,
    paddingHorizontal: spacing.lg,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  bajaBotonTexto: { color: colors.danger, fontWeight: '700', fontSize: 13.5 },
  cancelar: { marginTop: spacing.md, alignItems: 'center', paddingVertical: spacing.sm },
  cancelarTexto: { color: colors.inkSoft, fontWeight: '600' },
});
