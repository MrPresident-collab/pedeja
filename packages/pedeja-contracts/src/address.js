export const ADDRESS_LABELS = Object.freeze([
  'Casa',
  'Trabalho',
  'Escola',
  'Amigo',
  'Oficina',
  'Escritório',
  'Outro',
]);

export const ADDRESS_FIELDS = Object.freeze([
  'label',
  'addressLine1',
  'addressLine2',
  'neighborhood',
  'municipality',
  'city',
  'province',
  'reference',
  'latitude',
  'longitude',
]);

export function hasHumanAddress(address) {
  if (!address || typeof address !== 'object') return false;

  return Boolean(
    String(address.addressLine1 || '').trim()
    && String(address.neighborhood || '').trim(),
  );
}

export function hasCoordinates(address) {
  return Number.isFinite(address?.latitude)
    && Number.isFinite(address?.longitude);
}

export function normalizeAddress(address) {
  if (!address || typeof address !== 'object') return null;

  return Object.freeze({
    label: String(address.label || 'Outro').trim(),
    addressLine1: String(address.addressLine1 || '').trim(),
    addressLine2: String(address.addressLine2 || '').trim(),
    neighborhood: String(address.neighborhood || '').trim(),
    municipality: String(address.municipality || '').trim(),
    city: String(address.city || '').trim(),
    province: String(address.province || '').trim(),
    reference: String(address.reference || '').trim(),
    latitude: Number.isFinite(address.latitude) ? address.latitude : null,
    longitude: Number.isFinite(address.longitude) ? address.longitude : null,
  });
}
