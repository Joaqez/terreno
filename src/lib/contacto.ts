/**
 * Links para contactar a un jefe de tienda desde el panel. Los teléfonos
 * vienen en formatos muy distintos del Excel ("9 2074 1668", "56949309709",
 * "+56 9 4699 0157"), así que se normalizan a formato internacional chileno.
 */
export function telefonoInternacional(telefono?: string): string | null {
  const d = (telefono ?? '').replace(/\D/g, '');
  if (d.startsWith('56') && d.length === 11) return d;
  if (d.length === 9) return `56${d}`; // 9XXXXXXXX (celular) o 2XXXXXXXX (fijo Santiago)
  if (d.length === 8) return `569${d}`; // celular antiguo sin el 9
  return null;
}

export function linkLlamar(telefono?: string) {
  const n = telefonoInternacional(telefono);
  return n ? `tel:+${n}` : telefono ? `tel:${telefono.replace(/\s/g, '')}` : null;
}

export function linkWhatsApp(telefono?: string) {
  const n = telefonoInternacional(telefono);
  return n ? `https://wa.me/${n}` : null;
}

export function linkCorreo(email?: string) {
  return email ? `mailto:${email}` : null;
}
