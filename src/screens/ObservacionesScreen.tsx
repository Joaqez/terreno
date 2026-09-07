import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Field, PrimaryButton, Screen, Subtitle, Title } from '../components/ui';
import { useTerrenoStore } from '../lib/store';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Observaciones'>;

export default function ObservacionesScreen({ navigation, route }: Props) {
  const { tiendaId } = route.params;
  const finalizarBorrador = useTerrenoStore((s) => s.finalizarBorrador);
  const [obs, setObs] = useState('');

  return (
    <Screen>
      <Title>Observaciones</Title>
      <Subtitle>Agrega notas adicionales, si es necesario.</Subtitle>

      <Field
        label="Notas (opcional)"
        placeholder="Ej: El encargado pidió más stock para la próxima semana."
        value={obs}
        onChangeText={setObs}
        multiline
        style={{ minHeight: 140 }}
      />

      <PrimaryButton
        title="Finalizar visita"
        onPress={() => {
          finalizarBorrador(obs.trim() || undefined);
          navigation.navigate('VisitaRegistrada', { tiendaId });
        }}
      />
    </Screen>
  );
}
