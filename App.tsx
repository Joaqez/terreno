import { onAuthStateChanged } from 'firebase/auth';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Avisos from './src/components/Avisos';
import RootNavigator from './src/navigation/RootNavigator';
import { auth } from './src/lib/firebase';
import { useTerrenoStore } from './src/lib/store';
import { colors } from './src/theme';

/** Ancho máximo de la app en pantallas anchas: cómodo para el panel en el
 * computador y sin estirar las pantallas pensadas para celular. */
const ANCHO_MAXIMO = 760;

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
    <SafeAreaProvider>
      {/* En pantallas anchas (computador) la app queda centrada con un ancho
          máximo en vez de estirarse de borde a borde (2026-11-23). En el
          celular no cambia nada. */}
      <View style={styles.fondo}>
        <View style={styles.columna}>
          <RootNavigator autenticado={!!autenticado} />
          <Avisos />
        </View>
      </View>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, alignItems: 'center', backgroundColor: '#E9EDEB' },
  columna: {
    flex: 1,
    width: '100%',
    maxWidth: ANCHO_MAXIMO,
    backgroundColor: colors.bg,
    ...(Platform.OS === 'web' ? { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border } : null),
  },
});
