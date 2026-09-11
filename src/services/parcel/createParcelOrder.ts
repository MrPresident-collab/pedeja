import { repositories } from '@/repositories';
import { normalizeAngolaPhone } from '@/services/account';
import { checkConfigEligibility } from './eligibility';
import { estimateParcel, resolveVehicleConfig } from './estimate';
import { firstParcelError, validateParcelDraft } from './validation';
import type {
  Address,
  Order,
  ParcelOrder,
  ParcelRecipientDraft,
  ParcelVehicleType,
  PaymentMethod,
  ParcelPackageDraft,
} from '@/types';
import type { ParcelFieldErrors } from './validation';

export type CreateParcelInput = {
  pickup: Address;
  destination: Address;
  recipient: ParcelRecipientDraft;
  package: ParcelPackageDraft;
  vehicleType: ParcelVehicleType;
  vehicleConfigurationId?: string;
  deliveryNotes?: string;
  paymentMethod: PaymentMethod;
  restrictionAcknowledged: boolean;
};

export type CreateParcelResult =
  | { ok: true; order: Order }
  | { ok: false; message: string; errors?: ParcelFieldErrors };

function isApprovedEstafetaType(type: ParcelVehicleType): boolean {
  return repositories.parcel
    .getEstafetaVehicles()
    .some(
      (vehicle) =>
        vehicle.type === type &&
        vehicle.state === 'approved' &&
        vehicle.active &&
        vehicle.verificationStatus === 'verified',
    );
}

export function createParcelOrder(input: CreateParcelInput): CreateParcelResult {
  const errors = validateParcelDraft(input.package, input.recipient, input.restrictionAcknowledged);
  const firstError = firstParcelError(errors);
  if (firstError) {
    return { ok: false, message: firstError, errors };
  }

  const config = resolveVehicleConfig(input.vehicleType, input.vehicleConfigurationId);

  const eligibility = checkConfigEligibility(input.package, config, Boolean(input.package.isFragile));
  if (!eligibility.eligible) {
    return {
      ok: false,
      message: eligibility.issues[0]?.message ?? 'Este veículo não é compatível com a encomenda.',
    };
  }

  if (!isApprovedEstafetaType(input.vehicleType)) {
    return {
      ok: false,
      message: 'Sem estafeta disponível para este tipo de entrega neste momento.',
    };
  }

  const estimate = estimateParcel({
    pickupAddress: input.pickup,
    destinationAddress: input.destination,
    packageSize: input.package.size,
    approximateWeightKg: input.package.approximateWeightKg,
    isFragile: input.package.isFragile,
    vehicleType: input.vehicleType,
    vehicleConfigurationId: config.configurationId,
  });

  const normalizedPhone = normalizeAngolaPhone(input.recipient.phone);
  const now = new Date().toISOString();

  const recipient: ParcelRecipientDraft = {
    name: input.recipient.name.trim(),
    phone: normalizedPhone ?? input.recipient.phone.trim(),
  };
  if (input.recipient.instructions?.trim()) recipient.instructions = input.recipient.instructions.trim();

  const parcel: ParcelOrder = {
    pickup: { ...input.pickup },
    destination: { ...input.destination },
    recipient,
    package: { ...input.package },
    vehicle: {
      type: input.vehicleType,
      configurationId: config.configurationId,
      configurationLabel: config.label,
    },
    deliveryNotes: input.deliveryNotes?.trim() || undefined,
    estimate,
    paymentMethod: input.paymentMethod,
    status: 'a_procurar_estafeta',
    timeline: [],
    createdAt: now,
    updatedAt: now,
  };

  const order = repositories.parcel.createParcelOrder({ parcel });
  return { ok: true, order };
}