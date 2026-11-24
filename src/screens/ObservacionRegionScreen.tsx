import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Field, PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { avisar } from '../lib/avisos';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ObservacionRegion'>;

export default function ObservacionRegionScreen({ navigation, route }: Props) {
  const { tiendaId } = route.params;
  const { tiendas, marcarGestionRapida } = useTerrenoStore();
  const tienda = tiendas.find((t) => t.id === tiendaId);
  const [motivo, setMotivo] = useState('');

  function confirmar() {
    if (motivo.trim().length === 0) return;
    marcarGestionRapida(tiendaId, motivo.trim());
    avisar(`${tienda?.nombre ?? 'Tienda'}: gestión registrada`);
    navigation.goBack();
  }

  return (
    <Screen>
      <Title>{tienda?.nombre ?? 'Tienda'}</Title>
      <Subtitle>Cuéntanos cómo gestionaste esta tienda — es obligatorio.</Subtitle>

      <Field
        label="¿Qué hiciste?"
        placeholder="Ej: Hablé por WhatsApp con el encargado, todo en orden. / Lo llamé por teléfono. / Le escribí un correo."
        value={motivo}
        onChangeText={setMotivo}
        multiline
        style={{ minHeight: 140 }}
      />

      <PrimaryButton title="Confirmar" disabled={motivo.trim().length === 0} onPress={confirmar} />
    </Screen>
  );
}
