import type { ParcelStatus, ParcelVehicleType } from '@/types';

export const PARCEL_STATUS_LABELS: Record<ParcelStatus, string> = {
  criado: 'Envio criado',
  a_procurar_estafeta: 'A procurar estafeta',
  estafeta_atribuido: 'Estafeta atribuído',
  a_caminho_recolha: 'A caminho da recolha',
  chegou_recolha: 'Estafeta no ponto de recolha',
  recolhido: 'Encomenda recolhida',
  a_caminho_destino: 'A caminho do destino',
  chegou_destino: 'Chegou ao destino',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
  falhou: 'Falhou',
  devolvido_remetente: 'Devolvido ao remetente',
};

export const PARCEL_VEHICLE_LABELS: Record<ParcelVehicleType, string> = {
  motorcycle: 'Moto',
  three_wheeler: 'Triciclo',
  car: 'Carro',
  van: 'Carrinha',
};

export function parcelStatusLabel(status: ParcelStatus): string {
  return PARCEL_STATUS_LABELS[status];
}

export function parcelVehicleLabel(type: ParcelVehicleType): string {
  return PARCEL_VEHICLE_LABELS[type];
}