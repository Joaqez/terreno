import { onAuthStateChanged } from 'firebase/auth';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { auth } from './src/lib/firebase';
import { useTerrenoStore } from './src/lib/store';
import { colors } from './src/theme';

export default function App() {
  const cargandoInicial = useTerrenoStore((s) => s.cargandoInicial);
  const [autenticado, setAutenticado] = useState<boolean | null>(null); // null = verificando sesión

  useEffect(() => {
    return onAuthStateChanged(auth, (usuario) => {
      if (usuario) {
        useTerrenoStore.getState().setVendedorAutenticado(usuario);
        useTerrenoStore.getState().inicializar();
      } else {
        useTerrenoStore.getState().cerrarSesionLocal();
      }
      setAutenticado(!!usuario);
    });
  }, []);

  const cargando = autenticado === null || (autenticado && cargandoInicial);

  if (cargando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <RootNavigator autenticado={!!autenticado} />
      <StatusBar style="dark" />
    </>
  );
}
