import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Text, View } from 'react-native';
import { Field, PrimaryButton, Screen } from '../components/ui';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const vendedor = useTerrenoStore((s) => s.vendedor);

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 32 }}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>Terreno</Text>
        <Text style={{ color: '#5B6A64', marginTop: 4 }}>Bitácora de vendedores en ruta</Text>
      </View>

      {/* TODO: reemplazar por Firebase Auth (src/lib/firebase.ts) — por ahora
          entra directo con el vendedor de ejemplo para poder navegar la app. */}
      <Field label="Correo corporativo" defaultValue={vendedor.email} editable={false} />
      <Field label="Contraseña" defaultValue="••••••••" secureTextEntry editable={false} />

      <PrimaryButton title="Ingresar" onPress={() => navigation.replace('Home')} />
    </Screen>
  );
}
