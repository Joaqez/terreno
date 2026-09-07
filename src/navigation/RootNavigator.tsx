import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { colors } from '../theme';
import CierreDiaScreen from '../screens/CierreDiaScreen';
import DetalleVentaScreen from '../screens/DetalleVentaScreen';
import FotoAntesScreen from '../screens/FotoAntesScreen';
import FotoDespuesScreen from '../screens/FotoDespuesScreen';
import HomeScreen from '../screens/HomeScreen';
import KmInicioScreen from '../screens/KmInicioScreen';
import LoginScreen from '../screens/LoginScreen';
import NuevaVisitaScreen from '../screens/NuevaVisitaScreen';
import ObservacionesScreen from '../screens/ObservacionesScreen';
import ResumenDiaScreen from '../screens/ResumenDiaScreen';
import RutaScreen from '../screens/RutaScreen';
import TipoVisitaScreen from '../screens/TipoVisitaScreen';
import VisitaRegistradaScreen from '../screens/VisitaRegistradaScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
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
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="KmInicio" component={KmInicioScreen} options={{ title: '' }} />
        <Stack.Screen name="Ruta" component={RutaScreen} options={{ title: '', headerBackVisible: false }} />
        <Stack.Screen name="NuevaVisita" component={NuevaVisitaScreen} options={{ title: '' }} />
        <Stack.Screen name="TipoVisita" component={TipoVisitaScreen} options={{ title: '' }} />
        <Stack.Screen name="DetalleVenta" component={DetalleVentaScreen} options={{ title: '' }} />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
