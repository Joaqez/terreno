import {
  LinkingOptions,
  NavigationContainer,
  getStateFromPath as getStateFromPathPorDefecto,
} from '@react-navigation/native';
import { NativeStackNavigationOptions, createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Platform, Pressable, Text } from 'react-native';
import CancelarVisita from '../components/CancelarVisita';
import ProgresoVisita from '../components/ProgresoVisita';
import { useTerrenoStore } from '../lib/store';
import { colors, spacing } from '../theme';
import AdminChecklistScreen from '../screens/AdminChecklistScreen';
import AdminJefeDetalleScreen from '../screens/AdminJefeDetalleScreen';
import AdminJefesScreen from '../screens/AdminJefesScreen';
import AdminTiendaDetalleScreen from '../screens/AdminTiendaDetalleScreen';
import ChecklistScreen from '../screens/ChecklistScreen';
import AdminTiendasScreen from '../screens/AdminTiendasScreen';
import AdminVendedorDetalleScreen from '../screens/AdminVendedorDetalleScreen';
import AdminVendedoresScreen from '../screens/AdminVendedoresScreen';
import AdminVisitaDetalleScreen from '../screens/AdminVisitaDetalleScreen';
import AdminVisitasScreen from '../screens/AdminVisitasScreen';
import CierreDiaScreen from '../screens/CierreDiaScreen';
import FotoAntesScreen from '../screens/FotoAntesScreen';
import FotoDespuesScreen from '../screens/FotoDespuesScreen';
import HomeScreen from '../screens/HomeScreen';
import InventarioScreen from '../screens/InventarioScreen';
import JefeTiendaScreen from '../screens/JefeTiendaScreen';
import LoginScreen from '../screens/LoginScreen';
import NuevaVisitaScreen from '../screens/NuevaVisitaScreen';
import ObservacionesScreen from '../screens/ObservacionesScreen';
import ObservacionRegionScreen from '../screens/ObservacionRegionScreen';
import PedidoScreen from '../screens/PedidoScreen';
import ResumenDiaScreen from '../screens/ResumenDiaScreen';
import RutaScreen from '../screens/RutaScreen';
import TiendasRegionScreen from '../screens/TiendasRegionScreen';
import TipoVisitaScreen from '../screens/TipoVisitaScreen';
import VisitaRegistradaScreen from '../screens/VisitaRegistradaScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Pasos de una visita presencial: llevan "Cancelar" arriba y no se puede
 * entrar a ellos directo por dirección si no hay una visita en curso. */
const PASOS_VISITA: (keyof RootStackParamList)[] = [
  'FotoAntes',
  'JefeTienda',
  'Inventario',
  'TipoVisita',
  'Pedido',
  'Checklist',
  'FotoDespues',
  'Observaciones',
];

/**
 * Una dirección por pantalla (2026-11-23). Sin esto la dirección era siempre
 * "/", así que el navegador no tenía historial: el botón atrás del navegador
 * o del celular (Android) sacaba de la app en vez de volver a la pantalla
 * anterior.
 */
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [],
  config: {
    initialRouteName: 'Home',
    screens: {
      Login: 'ingresar',
      Home: '',
      Ruta: 'ruta',
      NuevaVisita: 'ruta/nueva-visita',
      FotoAntes: 'visita/foto-antes',
      JefeTienda: 'visita/con-quien',
      Inventario: 'visita/productos-en-tienda',
      TipoVisita: 'visita/hay-pedido',
      Pedido: 'visita/pedido',
      Checklist: 'visita/checklist',
      FotoDespues: 'visita/foto-despues',
      Observaciones: 'visita/finalizar',
      VisitaRegistrada: 'visita/registrada',
      CierreDia: 'cierre',
      ResumenDia: 'resumen',
      TiendasRegion: 'region',
      ObservacionRegion: 'region/gestion',
      AdminTiendas: 'admin/tiendas',
      AdminTiendaDetalle: 'admin/tienda',
      AdminVendedores: 'admin/vendedores',
      AdminVendedorDetalle: 'admin/vendedor',
      AdminVisitas: 'admin/visitas',
      AdminVisitaDetalle: 'admin/visita',
      AdminJefes: 'admin/jefes',
      AdminJefeDetalle: 'admin/jefe',
      AdminChecklist: 'admin/checklist',
    },
  },
  // Si alguien llega a un paso de visita por dirección (recargando la página
  // o con atrás/adelante después de recargar) y no hay visita en curso, va
  // al inicio: entrar a mitad de visita se saltaría la foto y la verificación
  // de ubicación.
  getStateFromPath(path, options) {
    const state = getStateFromPathPorDefecto(path, options);
    const enPasoDeVisita = state?.routes.some((r) => PASOS_VISITA.includes(r.name as keyof RootStackParamList));
    if (enPasoDeVisita && !useTerrenoStore.getState().borrador) return getStateFromPathPorDefecto('/', options);
    return state;
  },
};

function BotonInicio({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      // En web la barra no le da margen al botón de la izquierda (quedaba pegado al borde).
      style={{ minHeight: 44, justifyContent: 'center', paddingRight: spacing.sm, paddingLeft: Platform.OS === 'web' ? spacing.lg : 0 }}
    >
      <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 16 }}>‹ Inicio</Text>
    </Pressable>
  );
}

const opcionesPasoVisita: NativeStackNavigationOptions = {
  title: '',
  headerTitleAlign: 'center',
  headerTitle: () => <ProgresoVisita />,
  headerRight: () => <CancelarVisita />,
};

/**
 * Autenticación real con Firebase Auth (ver App.tsx, `onAuthStateChanged`):
 * sin sesión solo existe la pantalla de Login; con sesión, el stack completo
 * de la bitácora. Es el patrón estándar de React Navigation para separar un
 * flujo de auth del resto de la app.
 */
export default function RootNavigator({ autenticado }: { autenticado: boolean }) {
  return (
    <NavigationContainer linking={linking} documentTitle={{ formatter: () => 'Terreno' }}>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: colors.ink,
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {autenticado ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="Ruta"
              component={RutaScreen}
              options={({ navigation }) => ({
                title: '',
                // Siempre "Inicio" (no la flecha): la ruta puede ser la
                // primera pantalla del stack si se recargó la página.
                headerBackVisible: false,
                headerLeft: () => <BotonInicio onPress={() => navigation.navigate('Home')} />,
              })}
            />
            <Stack.Screen name="NuevaVisita" component={NuevaVisitaScreen} options={{ title: '' }} />
            <Stack.Screen name="TipoVisita" component={TipoVisitaScreen} options={opcionesPasoVisita} />
            <Stack.Screen name="Pedido" component={PedidoScreen} options={opcionesPasoVisita} />
            <Stack.Screen name="FotoAntes" component={FotoAntesScreen} options={opcionesPasoVisita} />
            <Stack.Screen name="Inventario" component={InventarioScreen} options={opcionesPasoVisita} />
            <Stack.Screen name="JefeTienda" component={JefeTiendaScreen} options={opcionesPasoVisita} />
            <Stack.Screen name="Checklist" component={ChecklistScreen} options={opcionesPasoVisita} />
            <Stack.Screen name="FotoDespues" component={FotoDespuesScreen} options={opcionesPasoVisita} />
            <Stack.Screen name="Observaciones" component={ObservacionesScreen} options={opcionesPasoVisita} />
            <Stack.Screen
              name="VisitaRegistrada"
              component={VisitaRegistradaScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen name="CierreDia" component={CierreDiaScreen} options={{ title: '' }} />
            <Stack.Screen
              name="ResumenDia"
              component={ResumenDiaScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            {/* Pantallas con título propio: la barra de arriba solo lleva la
                flecha (antes repetía el título y además había un "← Volver"). */}
            <Stack.Screen name="AdminTiendas" component={AdminTiendasScreen} options={{ title: '' }} />
            <Stack.Screen
              name="AdminTiendaDetalle"
              component={AdminTiendaDetalleScreen}
              options={{ title: '' }}
            />
            <Stack.Screen name="AdminVendedores" component={AdminVendedoresScreen} options={{ title: '' }} />
            <Stack.Screen
              name="AdminVendedorDetalle"
              component={AdminVendedorDetalleScreen}
              options={{ title: '' }}
            />
            <Stack.Screen name="AdminVisitas" component={AdminVisitasScreen} options={{ title: '' }} />
            <Stack.Screen name="AdminVisitaDetalle" component={AdminVisitaDetalleScreen} options={{ title: '' }} />
            <Stack.Screen name="AdminJefes" component={AdminJefesScreen} options={{ title: '' }} />
            <Stack.Screen name="AdminJefeDetalle" component={AdminJefeDetalleScreen} options={{ title: '' }} />
            <Stack.Screen name="AdminChecklist" component={AdminChecklistScreen} options={{ title: '' }} />
            <Stack.Screen name="TiendasRegion" component={TiendasRegionScreen} options={{ title: '' }} />
            <Stack.Screen name="ObservacionRegion" component={ObservacionRegionScreen} options={{ title: '' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
