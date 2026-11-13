import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Field, PrimaryButton, Screen } from '../components/ui';
import { colors } from '../theme';
import { auth } from '../lib/firebase';

/**
 * Las cuentas de vendedores se crean a mano en la consola de Firebase
 * (Authentication → Users) — no hay auto-registro. Al iniciar sesión con
 * éxito, `App.tsx` detecta el cambio vía `onAuthStateChanged` y cambia solo
 * al stack principal; esta pantalla no navega manualmente.
 */
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function ingresar() {
    setError(null);
    setCargando(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setError('Correo o contraseña incorrectos.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 32 }}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>Terreno</Text>
        <Text style={{ color: colors.inkSoft, marginTop: 4 }}>Bitácora de vendedores en ruta</Text>
      </View>

      <Field
        label="Correo corporativo"
        placeholder="nombre.apellido@empresa.cl"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Field label="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />

      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}

      <PrimaryButton title="Ingresar" disabled={!email || !password} loading={cargando} onPress={ingresar} />
    </Screen>
  );
}
