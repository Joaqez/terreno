import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Field, PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';
import { TipoNegocio } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'NuevaVisita'>;

export default function NuevaVisitaScreen({ navigation }: Props) {
  const agregarTienda = useTerrenoStore((s) => s.agregarTiendaCreadaPorVendedor);
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [comuna, setComuna] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [notas, setNotas] = useState('');

  function guardar() {
    agregarTienda({
      nombre: nombre.trim() || 'Nuevo local',
      direccion: direccion.trim() || 'Dirección no especificada',
      comuna: comuna.trim() || '—',
      tipoNegocio: 'Otro' as TipoNegocio,
      contacto: contacto.trim() || undefined,
      telefono: telefono.trim() || undefined,
      notas: notas.trim() || undefined,
    });
    navigation.goBack();
  }

  return (
    <Screen>
      <Title>Nueva visita</Title>
      <Subtitle>Agrega un local fuera de tu ruta asignada.</Subtitle>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Field label="Nombre del local" placeholder="Ej: Almacén San Judas" value={nombre} onChangeText={setNombre} />
        <Field label="Dirección" placeholder="Calle y número" value={direccion} onChangeText={setDireccion} />
        <Field label="Comuna" placeholder="Ej: Ñuñoa" value={comuna} onChangeText={setComuna} />
        <Field label="Contacto (opcional)" placeholder="Nombre de quien recibe" value={contacto} onChangeText={setContacto} />
        <Field label="Teléfono (opcional)" placeholder="+56 9 ...." value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
        <Field label="Notas (opcional)" placeholder="Referencias del local, horario, etc." value={notas} onChangeText={setNotas} multiline />
        <PrimaryButton title="Guardar y agregar a la ruta" onPress={guardar} />
      </ScrollView>
    </Screen>
  );
}
