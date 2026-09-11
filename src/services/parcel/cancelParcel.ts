import { repositories } from '@/repositories';
import type { ParcelCancellationResult, ParcelStatus } from '@/types';

const CANCELLABLE_STATUSES: ReadonlyArray<ParcelStatus> = [
  'criado',
  'a_procurar_estafeta',
  'estafeta_atribuido',
  'a_caminho_recolha',
  'chegou_recolha',
];

export function cancelParcelOrder(orderId: string, reason: string): ParcelCancellationResult {
  const order = repositories.parcel.getParcelOrder(orderId);
  if (!order?.parcel) {
    return { ok: false, message: 'Envio não encontrado.' };
  }
  if (!CANCELLABLE_STATUSES.includes(order.parcel.status)) {
    return {
      ok: false,
      message: 'Este envio já não pode ser cancelado. A encomenda já foi recolhida.',
    };
  }
  return repositories.parcel.cancelParcelOrder(orderId, reason.trim() || 'Pedido do cliente');
}