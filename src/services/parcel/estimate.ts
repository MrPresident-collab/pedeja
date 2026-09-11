import { repositories } from '@/repositories';
import type {
  Address,
  ParcelEstimate,
  ParcelEstimateInput,
  ParcelSize,
  ParcelVehicleConfigurationProfile,
  ParcelVehicleType,
} from '@/types';

const BASE_BY_VEHICLE: Record<ParcelVehicleType, number> = {
  motorcycle: 800,
  three_wheeler: 1200,
  car: 1800,
  van: 2600,
};

const PER_KM_BY_VEHICLE: Record<ParcelVehicleType, number> = {
  motorcycle: 140,
  three_wheeler: 175,
  car: 210,
  van: 265,
};

const SIZE_ADJUSTMENT: Record<ParcelSize, number> = {
  pequeno: 0,
  medio: 250,
  grande: 600,
};

const DURATION_FACTOR: Record<ParcelVehicleType, number> = {
  motorcycle: 1,
  three_wheeler: 1.2,
  car: 1.35,
  van: 1.5,
};

const WEIGHT_FREE_KG = 10;
const WEIGHT_SURCHARGE_PER_KG = 25;
const FRAGILE_SURCHARGE = 300;
const BASE_DURATION_MIN = 12;
const MINUTES_PER_KM = 3;

const MOCK_ESTIMATE_VERSION = 'mock-v1';

export function resolveVehicleConfig(
  type: ParcelVehicleType,
  configurationId?: string,
): ParcelVehicleConfigurationProfile {
  const catalog = repositories.parcel.getVehicleCatalog();
  const vehicleClass = catalog.find((c) => c.type === type);
  const config =
    vehicleClass?.configs.find((c) => c.configurationId === configurationId) ??
    vehicleClass?.configs[0];
  if (!vehicleClass || !config) {
    throw new Error(`Configuração de veículo inválida: ${type}/${configurationId ?? 'default'}`);
  }
  return config;
}

export function estimateParcel(input: ParcelEstimateInput): ParcelEstimate {
  const config = resolveVehicleConfig(input.vehicleType, input.vehicleConfigurationId);
  const rawDistance = repositories.parcel.estimateDistanceKm(
    input.pickupAddress,
    input.destinationAddress,
  );
  const distanceKm = Math.max(0.1, Math.round(rawDistance * 10) / 10);

  const base = BASE_BY_VEHICLE[input.vehicleType];
  const perKm = PER_KM_BY_VEHICLE[input.vehicleType];
  const distancePay = Math.round(distanceKm * perKm);
  const deliveryFee = base + distancePay;

  const sizeAdjustment = SIZE_ADJUSTMENT[input.packageSize];

  const weightKg = input.approximateWeightKg;
  const weightSurcharge =
    weightKg != null && weightKg > WEIGHT_FREE_KG
      ? Math.round((weightKg - WEIGHT_FREE_KG) * WEIGHT_SURCHARGE_PER_KG)
      : 0;

  const fragile = Boolean(input.isFragile);
  const fragileSurcharge = fragile ? FRAGILE_SURCHARGE : 0;

  const adjustments: ParcelEstimate['adjustments'] = [
    { code: 'base', label: `Taxa base (${config.label})`, amount: base },
    { code: 'distance', label: `Deslocação (${distanceKm.toFixed(1)} km)`, amount: distancePay },
  ];
  if (sizeAdjustment > 0) {
    adjustments.push({ code: 'size', label: 'Tamanho da encomenda', amount: sizeAdjustment });
  }
  if (weightSurcharge > 0) {
    adjustments.push({ code: 'weight', label: 'Peso extra', amount: weightSurcharge });
  }
  if (fragileSurcharge > 0) {
    adjustments.push({ code: 'fragile', label: 'Artigos frágeis', amount: fragileSurcharge });
  }

  const total =
    base + distancePay + sizeAdjustment + weightSurcharge + fragileSurcharge;

  const durationMinutes = Math.round(
    (BASE_DURATION_MIN + distanceKm * MINUTES_PER_KM) * DURATION_FACTOR[input.vehicleType],
  );

  return {
    distanceKm,
    durationMinutes,
    deliveryFee,
    adjustments,
    total,
    isMockEstimate: true,
    estimateVersion: MOCK_ESTIMATE_VERSION,
  };
}

export type ParcelAddressPair = {
  pickupAddress: Address;
  destinationAddress: Address;
};