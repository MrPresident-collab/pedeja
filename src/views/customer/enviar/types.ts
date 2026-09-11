import type {
  Address,
  ParcelEstimate,
  ParcelPackageDraft,
  ParcelRecipientDraft,
  ParcelVehicleOption,
  PaymentMethod,
} from '@/types';

export type FlowStep =
  | 'landing'
  | 'recolha'
  | 'destino'
  | 'encomenda'
  | 'transporte'
  | 'estimativa'
  | 'confirmar';

export type ParcelDraft = {
  pickup: Address | null;
  destination: Address | null;
  recipient: ParcelRecipientDraft;
  package: ParcelPackageDraft;
  vehicleOption: ParcelVehicleOption | null;
  estimate: ParcelEstimate | null;
  paymentMethod: PaymentMethod;
  restrictionAcknowledged: boolean;
};

export type ParcelOptionWithEstimate = ParcelVehicleOption & {
  estimate: ParcelEstimate | null;
};

export type ParcelPlan = {
  options: ParcelOptionWithEstimate[];
  recommended: ParcelVehicleOption | null;
};