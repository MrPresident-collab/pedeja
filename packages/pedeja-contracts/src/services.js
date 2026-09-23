export const SERVICE_TYPES = Object.freeze({
  FOME: 'fome',
  COMPRAS: 'compras',
  ENVIAR: 'enviar',
});

export const ACTIVE_SERVICE_TYPES = Object.freeze(Object.values(SERVICE_TYPES));

export function isServiceType(value) {
  return ACTIVE_SERVICE_TYPES.includes(value);
}
