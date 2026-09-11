import type { ParcelEstimate, ParcelVehicleOption } from '@/types';

export type RecommendedOption = {
  option: ParcelVehicleOption;
  estimate: ParcelEstimate;
};

export function recommendVehicle(
  options: ParcelVehicleOption[],
  estimateFor: (option: ParcelVehicleOption) => ParcelEstimate,
): RecommendedOption | null {
  const candidates = options
    .filter((option) => option.eligible && option.available)
    .map((option) => ({ option, estimate: estimateFor(option) }));
  if (candidates.length === 0) return null;
  return candidates.reduce((best, current) =>
    current.estimate.total < best.estimate.total ? current : best,
  );
}