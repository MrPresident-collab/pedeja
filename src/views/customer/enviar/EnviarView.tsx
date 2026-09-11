import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Navigation } from 'lucide-react';
import { repositories } from '@/repositories';
import { evaluateVehicleOptions } from '@/services/parcel/eligibility';
import { estimateParcel } from '@/services/parcel/estimate';
import { recommendVehicle } from '@/services/parcel/recommend';
import { createParcelOrder } from '@/services/parcel/createParcelOrder';
import { firstParcelError, validateParcelDraft } from '@/services/parcel/validation';
import { showToast } from '@/components/toastStore';
import { LandingStep } from './steps/LandingStep';
import { PickupStep } from './steps/PickupStep';
import { DestinationStep } from './steps/DestinationStep';
import { PackageStep } from './steps/PackageStep';
import { TransportStep } from './steps/TransportStep';
import { EstimateStep } from './steps/EstimateStep';
import { ConfirmStep } from './steps/ConfirmStep';
import type { ParcelDraft, FlowStep, ParcelOptionWithEstimate, ParcelPlan } from './types';
import type { ParcelEstimate, ParcelVehicleOption } from '@/types';
import type { ParcelFieldErrors } from '@/services/parcel/validation';

type Props = {
  onBack: () => void;
  onComplete: (orderId: string) => void;
};

const FLOW_STEPS: { id: FlowStep; label: string }[] = [
  { id: 'recolha', label: 'Recolha' },
  { id: 'destino', label: 'Destino' },
  { id: 'encomenda', label: 'Encomenda' },
  { id: 'transporte', label: 'Transporte' },
  { id: 'estimativa', label: 'Estimativa' },
  { id: 'confirmar', label: 'Confirmar' },
];

const STEP_DISPLAY: Partial<Record<FlowStep, string>> = {
  landing: 'Começar envio',
  recolha: 'Onde recolhemos?',
  destino: 'Onde entregamos?',
  encomenda: 'O que envias?',
  transporte: 'Como entregamos?',
  estimativa: 'Preço estimado',
  confirmar: 'Confirmar envio',
};

function initialDraft(): ParcelDraft {
  return {
    pickup: repositories.location.getDefaultAddress(),
    destination: null,
    recipient: { name: '', phone: '' },
    package: { description: '', size: 'pequeno' },
    vehicleOption: null,
    estimate: null,
    paymentMethod: repositories.payment.getDefaultMethod(),
    restrictionAcknowledged: false,
  };
}

function computePlan(draft: ParcelDraft): ParcelPlan | null {
  if (!draft.pickup || !draft.destination || !draft.package.description.trim()) return null;
  const catalog = repositories.parcel.getVehicleCatalog();
  const estafetaVehicles = repositories.parcel.getEstafetaVehicles();
  const options = evaluateVehicleOptions(draft.package, catalog, estafetaVehicles);
  const enrich = (option: ParcelVehicleOption): ParcelEstimate | null => {
    if (!option.eligible || !option.available || !draft.pickup || !draft.destination) return null;
    return estimateParcel({
      pickupAddress: draft.pickup,
      destinationAddress: draft.destination,
      packageSize: draft.package.size,
      approximateWeightKg: draft.package.approximateWeightKg,
      isFragile: draft.package.isFragile,
      vehicleType: option.type,
      vehicleConfigurationId: option.configurationId,
    });
  };
  const optionsWithEstimates: ParcelOptionWithEstimate[] = options.map((option) => ({
    ...option,
    estimate: enrich(option),
  }));
  const recommended = recommendVehicle(options, (option) => enrich(option) as ParcelEstimate)?.option ?? null;
  return { options: optionsWithEstimates, recommended };
}

export function EnviarView({ onBack, onComplete }: Props) {
  const [step, setStep] = useState<FlowStep>('landing');
  const [draft, setDraft] = useState<ParcelDraft>(() => initialDraft());
  const [errors, setErrors] = useState<ParcelFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const plan = useMemo(() => computePlan(draft), [draft]);

  useEffect(() => {
    if (!plan) return;
    const selectedType = draft.vehicleOption?.type;
    if (!selectedType) return;
    const current = plan.options.find((option) => option.type === selectedType);
    if (!current || !current.eligible || !current.available) {
      setDraft((prev) => ({ ...prev, vehicleOption: null, estimate: null }));
      setErrors({});
    }
  }, [plan, draft.vehicleOption]);

  const stepIndex = FLOW_STEPS.findIndex((s) => s.id === step);
  const selectedOption = plan?.options.find((option) => option.type === draft.vehicleOption?.type) ?? null;

  function goBack() {
    if (step === 'landing') {
      onBack();
      return;
    }
    const index = FLOW_STEPS.findIndex((s) => s.id === step);
    setStep(index <= 0 ? 'landing' : FLOW_STEPS[index - 1].id);
  }

  function goNext() {
    if (step === 'landing') {
      setStep('recolha');
      return;
    }
    if (step === 'recolha') {
      if (!draft.pickup) {
        showToast('Escolhe um ponto de recolha para continuar.');
        return;
      }
      setStep('destino');
      return;
    }
    if (step === 'destino') {
      if (!draft.destination) {
        showToast('Escolhe o destino da encomenda.');
        return;
      }
      const recipientErrors = validateParcelDraft(draft.package, draft.recipient, true);
      const nextErrors: ParcelFieldErrors = {
        recipientName: recipientErrors.recipientName,
        recipientPhone: recipientErrors.recipientPhone,
      };
      if (nextErrors.recipientName || nextErrors.recipientPhone) {
        setErrors(nextErrors);
        return;
      }
      setErrors({});
      setStep('encomenda');
      return;
    }
    if (step === 'encomenda') {
      const pkgErrors = validateParcelDraft(draft.package, draft.recipient, draft.restrictionAcknowledged);
      setErrors(pkgErrors);
      const message = firstParcelError(pkgErrors);
      if (message) {
        showToast(message);
        return;
      }
      setStep('transporte');
      return;
    }
    if (step === 'transporte') {
      if (!draft.vehicleOption) {
        showToast('Escolhe como queremos entregar.');
        return;
      }
      setStep('estimativa');
      return;
    }
    if (step === 'estimativa') {
      const current = plan?.options.find((option) => option.type === draft.vehicleOption?.type);
      if (!current?.estimate) {
        showToast('Não foi possível calcular a estimativa. Volta a escolher o veículo.');
        setStep('transporte');
        return;
      }
      setDraft((prev) => ({ ...prev, estimate: current.estimate }));
      setStep('confirmar');
      return;
    }
  }

  function submit() {
    if (
      submitting ||
      !draft.pickup ||
      !draft.destination ||
      !draft.vehicleOption ||
      !draft.estimate
    ) {
      return;
    }
    const validation = validateParcelDraft(draft.package, draft.recipient, draft.restrictionAcknowledged);
    if (firstParcelError(validation)) {
      setErrors(validation);
      showToast(firstParcelError(validation) as string);
      setStep('encomenda');
      return;
    }
    setSubmitting(true);
    const result = createParcelOrder({
      pickup: draft.pickup,
      destination: draft.destination,
      recipient: draft.recipient,
      package: draft.package,
      vehicleType: draft.vehicleOption.type,
      vehicleConfigurationId: draft.vehicleOption.configurationId,
      deliveryNotes: draft.package.notes,
      paymentMethod: draft.paymentMethod,
      restrictionAcknowledged: draft.restrictionAcknowledged,
    });
    setTimeout(() => {
      setSubmitting(false);
      if (result.ok) {
        showToast('Envio criado. Vamos encontrar um estafeta.');
        onComplete(result.order.id);
      } else {
        showToast(result.message);
      }
    }, 900);
  }

  const title = STEP_DISPLAY[step] ?? 'Enviar';

  return (
    <main className="page inner-page parcel-flow">
      <header className="category-header">
        <button className="icon-button back-button" onClick={goBack} aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <div>
          {step === 'landing' ? (
            <p className="eyebrow">ENVIAR </p>
          ) : (
            <p className="eyebrow">
              ENVIAR · PASSO {stepIndex + 1}/{FLOW_STEPS.length}
            </p>
          )}
          <h1>{title}</h1>
        </div>
        {step !== 'landing' && draft.destination && (
          <div className="header-route-hint">
            <Navigation size={14} />
          </div>
        )}
      </header>

      {step !== 'landing' && (
        <div className="step-progress">
          {FLOW_STEPS.map((s, i) => (
            <span key={s.id} className={i <= stepIndex ? 'done' : ''} />
          ))}
        </div>
      )}

      {step === 'landing' && <LandingStep onStart={goNext} />}

      {step === 'recolha' && (
        <PickupStep
          pickup={draft.pickup}
          onChange={(pickup) => setDraft((prev) => ({ ...prev, pickup }))}
        />
      )}

      {step === 'destino' && (
        <DestinationStep
          destination={draft.destination}
          onChange={(destination) => setDraft((prev) => ({ ...prev, destination }))}
          recipient={draft.recipient}
          onRecipientChange={(recipient) => setDraft((prev) => ({ ...prev, recipient }))}
          errors={errors}
        />
      )}

      {step === 'encomenda' && (
        <PackageStep
          pkg={draft.package}
          onChange={(pkg) => setDraft((prev) => ({ ...prev, package: pkg }))}
          restrictionAcknowledged={draft.restrictionAcknowledged}
          onRestrictionChange={(restrictionAcknowledged) =>
            setDraft((prev) => ({ ...prev, restrictionAcknowledged }))
          }
          errors={errors}
        />
      )}

      {step === 'transporte' && (
        <TransportStep
          plan={plan}
          selected={selectedOption}
          onSelect={(option) =>
            setDraft((prev) => ({
              ...prev,
              vehicleOption: option ? { ...option } : null,
            }))
          }
        />
      )}

      {step === 'estimativa' && (
        <EstimateStep
          vehicleOption={draft.vehicleOption}
          estimate={draft.estimate ?? selectedOption?.estimate ?? null}
          paymentMethod={draft.paymentMethod}
          onPaymentChange={(paymentMethod) => setDraft((prev) => ({ ...prev, paymentMethod }))}
        />
      )}

      {step === 'confirmar' && (
        <ConfirmStep
          pickup={draft.pickup}
          destination={draft.destination}
          recipient={draft.recipient}
          pkg={draft.package}
          vehicleOption={draft.vehicleOption}
          estimate={draft.estimate}
          paymentMethod={draft.paymentMethod}
          restrictionAcknowledged={draft.restrictionAcknowledged}
          onRestrictionChange={(restrictionAcknowledged) =>
            setDraft((prev) => ({ ...prev, restrictionAcknowledged }))
          }
          submitting={submitting}
          onSubmit={submit}
        />
      )}

      {step !== 'confirmar' && step !== 'landing' && (
        <div className="step-actions">
          <button className="btn-primary" onClick={goNext} disabled={step === 'transporte' && !draft.vehicleOption}>
            Continuar <ArrowRight size={18} />
          </button>
        </div>
      )}
    </main>
  );
}