import type { PaymentMethod, ParcelSize } from '@/types/common';
import type { Address } from '@/types';

export type ParcelVehicleType = 'motorcycle' | 'three_wheeler' | 'car' | 'van';

export type ParcelCargoVolumeClass = 'S' | 'M' | 'L' | 'XL';

export type ParcelVehicleConfigurationId =
  | 'mc-standard'
  | 'tw-standard'
  | 'tw-open'
  | 'tw-enclosed'
  | 'car-standard'
  | 'van-standard';

export interface ParcelVehicleConfigurationProfile {
  configurationId: ParcelVehicleConfigurationId | string;
  label: string;
  volumeClass: ParcelCargoVolumeClass;
  cargoCapacityL: number;
  maxWeightKg: number;
  enclosed: boolean;
  openCargo: boolean;
  fragileCapable: boolean;
  oversizedCapable: boolean;
  multiPackage: boolean;
}

export interface ParcelVehicleClass {
  type: ParcelVehicleType;
  label: string;
  configs: ParcelVehicleConfigurationProfile[];
}

export type ParcelVehicleVerificationStatus = 'pending' | 'verified' | 'rejected';

export type EstafetaVehicleState = 'pending_review' | 'approved' | 'rejected' | 'suspended' | 'inactive';

export interface EstafetaVehicle {
  id: string;
  estafetaId: string;
  type: ParcelVehicleType;
  configurationId: ParcelVehicleConfigurationId | string;
  make: string;
  model: string;
  plate: string;
  color?: string;
  verificationStatus: ParcelVehicleVerificationStatus;
  verificationRefs: string[];
  state: EstafetaVehicleState;
  active: boolean;
}

export interface ParcelEligibilityIssue {
  code:
    | 'size_too_big'
    | 'weight_exceeds'
    | 'fragile_requires_enclosed'
    | 'oversized_requires_capacity'
    | 'no_cargo_capacity';
  message: string;
}

export interface ParcelEligibility {
  eligible: boolean;
  issues: ParcelEligibilityIssue[];
  maxWeightKg: number;
}

export type ParcelAvailability =
  | { available: true; estafetaId?: string }
  | { available: false; reason: string };

export interface ParcelVehicleOption {
  type: ParcelVehicleType;
  label: string;
  configurationId: string;
  configurationLabel: string;
  eligible: boolean;
  issues: ParcelEligibilityIssue[];
  available: boolean;
  unavailableReason?: string;
  recommended: boolean;
}

export interface ParcelPackageDraft {
  description: string;
  size: ParcelSize;
  approximateWeightKg?: number;
  isFragile?: boolean;
  photo?: { ref: string };
  notes?: string;
}

export interface ParcelRecipientDraft {
  name: string;
  phone: string;
  apartment?: string;
  landmark?: string;
  instructions?: string;
  notes?: string;
}

export interface ParcelEstimateAdjustment {
  code: string;
  label: string;
  amount: number;
}

export interface ParcelEstimate {
  distanceKm: number;
  durationMinutes: number;
  deliveryFee: number;
  adjustments: ParcelEstimateAdjustment[];
  total: number;
  isMockEstimate: boolean;
  estimateVersion: string;
}

export interface ParcelEstimateInput {
  pickupAddress: Address;
  destinationAddress: Address;
  packageSize: ParcelSize;
  approximateWeightKg?: number;
  isFragile?: boolean;
  vehicleType: ParcelVehicleType;
  vehicleConfigurationId?: string;
}

export type ParcelStatus =
  | 'criado'
  | 'a_procurar_estafeta'
  | 'estafeta_atribuido'
  | 'a_caminho_recolha'
  | 'chegou_recolha'
  | 'recolhido'
  | 'a_caminho_destino'
  | 'chegou_destino'
  | 'entregue'
  | 'cancelado'
  | 'falhou'
  | 'devolvido_remetente';

export type ParcelTerminalStatus = 'entregue' | 'cancelado' | 'falhou' | 'devolvido_remetente';

export interface ParcelTimelineEvent {
  status: ParcelStatus;
  label: string;
  at: string;
}

export interface ParcelAssignedEstafeta {
  id: string;
  name: string;
  vehicleLabel: string;
  phone?: string;
}

export interface ParcelOrder {
  pickup: Address;
  destination: Address;
  recipient: ParcelRecipientDraft;
  package: ParcelPackageDraft;
  vehicle: { type: ParcelVehicleType; configurationId: string; configurationLabel: string };
  deliveryNotes?: string;
  estimate: ParcelEstimate;
  paymentMethod: PaymentMethod;
  status: ParcelStatus;
  timeline: ParcelTimelineEvent[];
  assignedEstafeta?: ParcelAssignedEstafeta;
  cancellation?: { reason: string; at: string };
  createdAt: string;
  updatedAt: string;
}

export type ParcelCancellationResult =
  | { ok: true }
  | { ok: false; message: string };