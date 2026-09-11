import type {
  EstafetaVehicle,
  ParcelCargoVolumeClass,
  ParcelEligibility,
  ParcelEligibilityIssue,
  ParcelPackageDraft,
  ParcelSize,
  ParcelVehicleClass,
  ParcelVehicleConfigurationProfile,
  ParcelVehicleOption,
} from '@/types';

const SIZE_TIER: Record<ParcelSize, number> = { pequeno: 0, medio: 1, grande: 2 };
const VOLUME_TIER: Record<ParcelCargoVolumeClass, number> = { S: 0, M: 1, L: 2, XL: 3 };

export function checkConfigEligibility(
  pkg: ParcelPackageDraft,
  config: ParcelVehicleConfigurationProfile,
  fragile: boolean,
): ParcelEligibility {
  const issues: ParcelEligibilityIssue[] = [];

  if (VOLUME_TIER[config.volumeClass] < SIZE_TIER[pkg.size]) {
    issues.push({
      code: 'size_too_big',
      message: 'Este tipo de encomenda precisa de um veículo com maior capacidade.',
    });
  }

  if (pkg.approximateWeightKg != null && pkg.approximateWeightKg > config.maxWeightKg) {
    issues.push({
      code: 'weight_exceeds',
      message: `O peso estimado excede o limite (${config.maxWeightKg} kg) deste veículo.`,
    });
  }

  if (fragile && (!config.fragileCapable || (pkg.size !== 'pequeno' && !config.enclosed))) {
    issues.push({
      code: 'fragile_requires_enclosed',
      message: 'Artigos frágeis precisam de um veículo com cabine fechada.',
    });
  }

  if (pkg.size === 'grande' && !config.oversizedCapable) {
    issues.push({
      code: 'oversized_requires_capacity',
      message: 'Encomendas grandes precisam de um veículo com espaço alargado.',
    });
  }

  return { eligible: issues.length === 0, issues, maxWeightKg: config.maxWeightKg };
}

function isApprovedEstafeta(vehicle: EstafetaVehicle): boolean {
  return (
    vehicle.state === 'approved' &&
    vehicle.active &&
    vehicle.verificationStatus === 'verified'
  );
}

function pickBestConfig(
  configs: ParcelVehicleConfigurationProfile[],
  fragile: boolean,
): ParcelVehicleConfigurationProfile | null {
  const ordered = [...configs].sort((a, b) => {
    if (fragile && a.enclosed !== b.enclosed) return a.enclosed ? -1 : 1;
    return b.cargoCapacityL - a.cargoCapacityL;
  });
  return ordered[0] ?? null;
}

function collectIssues(
  vehicleClass: ParcelVehicleClass,
  pkg: ParcelPackageDraft,
  fragile: boolean,
): ParcelEligibilityIssue[] {
  const seen = new Set<string>();
  const issues: ParcelEligibilityIssue[] = [];
  for (const config of vehicleClass.configs) {
    for (const issue of checkConfigEligibility(pkg, config, fragile).issues) {
      if (!seen.has(issue.code)) {
        seen.add(issue.code);
        issues.push(issue);
      }
    }
  }
  return issues;
}

export function evaluateVehicleOptions(
  pkg: ParcelPackageDraft,
  catalog: ParcelVehicleClass[],
  estafetaVehicles: EstafetaVehicle[],
): ParcelVehicleOption[] {
  const fragile = Boolean(pkg.isFragile);
  return catalog.map((vehicleClass) => {
    const eligibleConfigs = vehicleClass.configs.filter((config) =>
      checkConfigEligibility(pkg, config, fragile).eligible,
    );
    const best = pickBestConfig(eligibleConfigs, fragile);
    const available = estafetaVehicles.some(
      (vehicle) => vehicle.type === vehicleClass.type && isApprovedEstafeta(vehicle),
    );
    return {
      type: vehicleClass.type,
      label: vehicleClass.label,
      configurationId: best?.configurationId ?? '',
      configurationLabel: best?.label ?? '',
      eligible: best !== null,
      issues: collectIssues(vehicleClass, pkg, fragile),
      available,
      unavailableReason:
        best && !available
          ? 'Adequado para esta encomenda, mas sem disponibilidade neste momento.'
          : undefined,
      recommended: false,
    };
  });
}