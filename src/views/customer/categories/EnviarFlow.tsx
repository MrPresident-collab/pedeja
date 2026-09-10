import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Camera,
  Car,
  Check,
  CloudRain,
  MapPin,
  Navigation,
  Package,
  Timer,
  Truck,
} from 'lucide-react';
import { repositories } from '@/repositories';
import { formatKz } from '@/utils/format';
import { showToast } from '@/components/toastStore';
import type { ParcelSize, VehicleType } from '@/types';

type Step = 'origin' | 'destination' | 'what' | 'size' | 'delivery' | 'confirm';

const steps: { id: Step; label: string }[] = [
  { id: 'origin', label: 'Origem' },
  { id: 'destination', label: 'Destino' },
  { id: 'what', label: 'O que envias?' },
  { id: 'size', label: 'Tamanho' },
  { id: 'delivery', label: 'Como entregar?' },
  { id: 'confirm', label: 'Confirmar' },
];

const sizes: { id: ParcelSize; label: string; detail: string }[] = [
  { id: 'pequeno', label: 'Pequeno', detail: 'Documentos, pequenas encomendas' },
  { id: 'medio', label: 'Médio', detail: 'Caixas, sacos de compras' },
  { id: 'grande', label: 'Grande', detail: 'Móveis, electrodomésticos' },
];

const vehicleIcons = { bike: Bike, car: Car, truck: Truck };

type Props = { onBack: () => void; onComplete: () => void };

export function EnviarFlow({ onBack, onComplete }: Props) {
  const [step, setStep] = useState<Step>('origin');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [what, setWhat] = useState('');
  const [size, setSize] = useState<ParcelSize | null>(null);
  const [distanceKm, setDistanceKm] = useState(2);
  const [quantity, setQuantity] = useState<number>(1);
  const [urgency, setUrgency] = useState<'normal' | 'expresso'>('normal');
  const [vehicle, setVehicle] = useState<VehicleType | null>(null);
  const [traffic, setTraffic] = useState<'leve' | 'moderado' | 'intenso'>('leve');
  const [rain, setRain] = useState(false);
  const [road, setRoad] = useState<'boa' | 'precaria'>('boa');
  const [instruction, setInstruction] = useState<string | null>(null);
  const [customInstruction, setCustomInstruction] = useState('');
  const [photoTaken, setPhotoTaken] = useState(false);

  const vehicles = repositories.parcel.listVehicles();
  const instructions = repositories.parcel.listInstructions();

  const stepIndex = steps.findIndex((s) => s.id === step);
  const canProceed = checkCanProceed();

  function factors(): string[] {
    const list: string[] = [];
    if (traffic === 'moderado') list.push('Trânsito moderado');
    if (traffic === 'intenso') list.push('Trânsito intenso');
    if (rain) list.push('Pluviosidade');
    if (road === 'precaria') list.push('Estrada precária');
    return list;
  }

  function estimateFor(v: VehicleType) {
    return repositories.parcel.estimate({
      size: size ?? 'pequeno',
      vehicle: v,
      distanceMeters: distanceKm * 1000,
      factors: factors(),
    });
  }

  const currentEstimate = vehicle ? estimateFor(vehicle) : null;

  function checkCanProceed(): boolean {
    switch (step) {
      case 'origin': return origin.trim().length > 0;
      case 'destination': return destination.trim().length > 0;
      case 'what': return what.trim().length > 0;
      case 'size': return size !== null && quantity >= 1;
      case 'delivery': return vehicle !== null;
      case 'confirm': return true;
    }
  }

  function next() {
    const nextIndex = stepIndex + 1;
    if (nextIndex < steps.length) setStep(steps[nextIndex].id);
  }

  function prev() {
    if (stepIndex === 0) { onBack(); return; }
    setStep(steps[stepIndex - 1].id);
  }

  function confirmOrder() {
    const estimate = currentEstimate;
    if (!estimate) return;
    const total = Math.round(estimate.price.amount * quantity);
    repositories.order.create({
      merchant: `Enviar: ${what}`,
      type: 'Enviar',
      icon: 'send',
      lines: [{ productId: 'parcel-1', name: what, unitPrice: estimate.price.amount, quantity }],
      subtotal: total,
      discounts: 0,
      deliveryFee: 0,
      tip: 0,
      total,
      note: `${origin} → ${destination}${instruction ? ` · ${instructions.find((i) => i.id === instruction)?.label}` : ''}`,
    });
    showToast('Envio registado! Vamos encontrar um estafeta.');
    onComplete();
  }

  return (
    <main className="page inner-page enviar-flow">
      <header className="category-header">
        <button className="icon-button back-button" onClick={prev}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="eyebrow">ENVIAR · PASSO {stepIndex + 1}/{steps.length}</p>
          <h1>{steps[stepIndex].label}</h1>
        </div>
      </header>

      <div className="step-progress">
        {steps.map((s, i) => (
          <span key={s.id} className={i <= stepIndex ? 'done' : ''} />
        ))}
      </div>

      {step === 'origin' && (
        <div className="step-content">
          <div className="input-group">
            <MapPin size={20} className="input-icon" />
            <input
              type="text"
              placeholder="Onde devemos recolher?"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              autoFocus
            />
          </div>
          <p className="input-hint">Escreve o endereço ou ponto de referência. Ex: "Casa da minha mãe, Talatona"</p>
        </div>
      )}

      {step === 'destination' && (
        <div className="step-content">
          <div className="input-group">
            <Navigation size={20} className="input-icon" />
            <input
              type="text"
              placeholder="Onde devemos entregar?"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              autoFocus
            />
          </div>
          <p className="input-hint">Ex: "Escritório na Marginal, Luanda"</p>
        </div>
      )}

      {step === 'what' && (
        <div className="step-content">
          <div className="input-group">
            <Package size={20} className="input-icon" />
            <input
              type="text"
              placeholder="O que estás a enviar?"
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              autoFocus
            />
          </div>
          <p className="input-hint">Ex: "Documentos do trabalho", "Presente de aniversário"</p>
        </div>
      )}

      {step === 'size' && (
        <div className="step-content">
          <div className="size-options">
            {sizes.map((s) => (
              <button
                key={s.id}
                className={`size-option ${size === s.id ? 'selected' : ''}`}
                onClick={() => setSize(s.id)}
              >
                <div>
                  <strong>{s.label}</strong>
                  <small>{s.detail}</small>
                </div>
                {size === s.id && <Check size={20} />}
              </button>
            ))}
          </div>

          <p className="step-section-title">Distância e condições</p>
          <div className="input-group estimate-input">
            <Timer size={18} className="input-icon" />
            <input
              type="number"
              min={0.5}
              step={0.5}
              placeholder="Distância aproximada (km)"
              value={distanceKm}
              onChange={(e) => setDistanceKm(Math.max(0.5, Number(e.target.value) || 0.5))}
            />
          </div>

          <div className="two-col-row">
            <label className="field-label">
              <span>Quantidade</span>
              <div className="input-group">
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.round(Number(e.target.value) || 1)))}
                />
              </div>
            </label>
            <div className="field-label">
              <span>Urgência</span>
              <div className="segmented small">
                <button className={urgency === 'normal' ? 'selected' : ''} onClick={() => setUrgency('normal')}>
                  Normal
                </button>
                <button className={urgency === 'expresso' ? 'selected' : ''} onClick={() => setUrgency('expresso')}>
                  Expresso
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'delivery' && (
        <div className="step-content">
          <p className="step-section-title">Condições da viagem</p>
          <div className="condition-grid">
            <button
              className={`condition-chip ${traffic === 'intenso' ? 'selected' : ''}`}
              onClick={() => setTraffic(traffic === 'intenso' ? 'leve' : traffic === 'moderado' ? 'intenso' : 'moderado')}
            >
              <span>Trânsito: {traffic === 'leve' ? 'leve' : traffic === 'moderado' ? 'moderado' : 'intenso'}</span>
            </button>
            <button
              className={`condition-chip ${rain ? 'selected' : ''}`}
              onClick={() => setRain(!rain)}
            >
              <CloudRain size={15} /> {rain ? 'Pluviosidade' : 'Chuva?'}
            </button>
            <button
              className={`condition-chip ${road === 'precaria' ? 'selected' : ''}`}
              onClick={() => setRoad(road === 'boa' ? 'precaria' : 'boa')}
            >
              Estrada: {road === 'boa' ? 'boa' : 'precária'}
            </button>
          </div>

          <p className="step-section-title">Veículo recomendado</p>
          <div className="vehicle-options">
            {vehicles.map((v) => {
              const Icon = vehicleIcons[v.icon];
              const est = estimateFor(v.type);
              const prices = vehicles.map((x) => estimateFor(x.type).price.amount);
              const recommended = est.price.amount === Math.min(...prices);
              return (
                <button
                  key={v.type}
                  className={`vehicle-option ${vehicle === v.type ? 'selected' : ''} ${recommended ? 'recommended' : ''}`}
                  onClick={() => setVehicle(v.type)}
                >
                  <span className="vehicle-icon">
                    <Icon size={24} />
                  </span>
                  <div>
                    <strong>{v.name}</strong>
                    <small>~{est.durationMin} min · {formatKz(est.price.amount)}</small>
                  </div>
                  {recommended && <span className="recommend-badge">Recomendado</span>}
                  {vehicle === v.type && <Check size={18} className="vehicle-check" />}
                </button>
              );
            })}
          </div>

          <p className="step-section-title">Instruções de entrega</p>
          <div className="instruction-options">
            {instructions.map((inst) => (
              <button
                key={inst.id}
                className={`instruction-option ${instruction === inst.id ? 'selected' : ''}`}
                onClick={() => setInstruction(inst.id)}
              >
                <div>
                  <strong>{inst.label}</strong>
                  <small>{inst.description}</small>
                </div>
                {instruction === inst.id && <Check size={18} />}
              </button>
            ))}
          </div>

          {instruction === 'custom' && (
            <div className="input-group custom-instruction">
              <input
                type="text"
                placeholder="Escreve a tua instrução..."
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
              />
            </div>
          )}

          <div className="photo-verification">
            <div className="photo-icon">
              <Package size={24} />
            </div>
            <div>
              <strong>Verificação fotográfica</strong>
              <small>Tira uma foto da encomenda antes de enviar. Ajuda a prevenir disputas.</small>
            </div>
            <button
              className={`photo-toggle ${photoTaken ? 'taken' : ''}`}
              onClick={() => setPhotoTaken(!photoTaken)}
            >
              {photoTaken ? <Check size={18} /> : <Camera size={18} />}
            </button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="step-content">
          <div className="confirm-summary">
            <div className="confirm-row">
              <small>Origem</small>
              <strong>{origin}</strong>
            </div>
            <div className="confirm-row">
              <small>Destino</small>
              <strong>{destination}</strong>
            </div>
            <div className="confirm-row">
              <small>Conteúdo</small>
              <strong>{what}</strong>
            </div>
            <div className="confirm-row">
              <small>Tamanho</small>
              <strong>{sizes.find((s) => s.id === size)?.label}</strong>
            </div>
            <div className="confirm-row">
              <small>Quantidade</small>
              <strong>{quantity}</strong>
            </div>
            <div className="confirm-row">
              <small>Urgência</small>
              <strong>{urgency === 'expresso' ? 'Expresso' : 'Normal'}</strong>
            </div>
            <div className="confirm-row">
              <small>Veículo</small>
              <strong>{vehicles.find((v) => v.type === vehicle)?.name}</strong>
            </div>
          </div>

          <div className="confirm-estimate">
            {currentEstimate && (
              <>
                <div className="estimate-row">
                  <span>Distância estimada</span>
                  <strong>{currentEstimate.distanceMeters / 1000} km</strong>
                </div>
                <div className="estimate-row">
                  <span>Duração estimada</span>
                  <strong>~{currentEstimate.durationMin} min</strong>
                </div>
                <div className="estimate-row total">
                  <span>Preço estimado{quantity > 1 ? ` × ${quantity}` : ''}</span>
                  <strong>{formatKz(currentEstimate.price.amount * quantity)}</strong>
                </div>
                {factors().length > 0 && currentEstimate.factors.length > 0 && (
                  <div className="estimate-factors">
                    <small>Considerámos:</small>
                    <span>{factors().join(' · ')}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <p className="estimate-disclaimer">
            O preço pode variar com trânsito, obras ou chuva. Confirmas no momento do envio.
          </p>
        </div>
      )}

      <div className="step-actions">
        {step !== 'confirm' ? (
          <button className="btn-primary" disabled={!canProceed} onClick={next}>
            Continuar <ArrowRight size={18} />
          </button>
        ) : (
          <button className="btn-primary" onClick={confirmOrder}>
            Confirmar envio <ArrowRight size={18} />
          </button>
        )}
      </div>
    </main>
  );
}