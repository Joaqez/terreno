import * as ImagePicker from 'expo-image-picker';

/**
 * Abre la cámara del dispositivo y devuelve el URI local de la foto tomada,
 * o null si el usuario canceló o no dio permiso.
 *
 * Se usa expo-image-picker (en vez de armar una vista de cámara propia con
 * expo-camera) porque es lo más simple para "toma una foto y listo", que es
 * todo lo que necesitan las pantallas de kilometraje y de exhibidor. Si más
 * adelante se quiere una cámara in-app con overlay/guía, expo-camera es el
 * reemplazo natural de este archivo.
 */
export async function takePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    quality: 0.6,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets?.length) {
    return null;
  }
  return result.assets[0].uri;
}
