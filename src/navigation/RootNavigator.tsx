import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { colors } from '../theme';
import AdminTiendaDetalleScreen from '../screens/AdminTiendaDetalleScreen';
import AdminTiendasScreen from '../screens/AdminTiendasScreen';
import AdminVendedorDetalleScreen from '../screens/AdminVendedorDetalleScreen';
import AdminVendedoresScreen from '../screens/AdminVendedoresScreen';
import AdminVisitaDetalleScreen from '../screens/AdminVisitaDetalleScreen';
import AdminVisitasScreen from '../screens/AdminVisitasScreen';
import CierreDiaScreen from '../screens/CierreDiaScreen';
import FotoAntesScreen from '../screens/FotoAntesScreen';
import FotoDespuesScreen from '../screens/FotoDespuesScreen';
import HomeScreen from '../screens/HomeScreen';
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

/**
 * Autenticación real con Firebase Auth (ver App.tsx, `onAuthStateChanged`):
 * sin sesión solo existe la pantalla de Login; con sesión, el stack completo
 * de la bitácora. Es el patrón estándar de React Navigation para separar un
 * flujo de auth del resto de la app.
 */
export default function RootNavigator({ autenticado }: { autenticado: boolean }) {
  return (
    <NavigationContainer>
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
            <Stack.Screen name="Ruta" component={RutaScreen} options={{ title: '', headerBackVisible: false }} />
            <Stack.Screen name="NuevaVisita" component={NuevaVisitaScreen} options={{ title: '' }} />
            <Stack.Screen name="TipoVisita" component={TipoVisitaScreen} options={{ title: '' }} />
            <Stack.Screen name="Pedido" component={PedidoScreen} options={{ title: '' }} />
            <Stack.Screen name="FotoAntes" component={FotoAntesScreen} options={{ title: '' }} />
            <Stack.Screen name="FotoDespues" component={FotoDespuesScreen} options={{ title: '' }} />
            <Stack.Screen name="Observaciones" component={ObservacionesScreen} options={{ title: '' }} />
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
            <Stack.Screen name="AdminTiendas" component={AdminTiendasScreen} options={{ title: 'Tiendas' }} />
            <Stack.Screen
              name="AdminTiendaDetalle"
              component={AdminTiendaDetalleScreen}
              options={{ title: '' }}
            />
            <Stack.Screen name="AdminVendedores" component={AdminVendedoresScreen} options={{ title: 'Vendedores' }} />
            <Stack.Screen
              name="AdminVendedorDetalle"
              component={AdminVendedorDetalleScreen}
              options={{ title: '' }}
            />
            <Stack.Screen name="AdminVisitas" component={AdminVisitasScreen} options={{ title: 'Visitas' }} />
            <Stack.Screen name="AdminVisitaDetalle" component={AdminVisitaDetalleScreen} options={{ title: '' }} />
            <Stack.Screen name="TiendasRegion" component={TiendasRegionScreen} options={{ title: 'Región' }} />
            <Stack.Screen name="ObservacionRegion" component={ObservacionRegionScreen} options={{ title: '' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
