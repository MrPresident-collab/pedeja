import { useEffect, useRef, useState } from 'react';

export default function PaymentQR({ paymentReference, amount, size = 160 }) {
  const canvasRef = useRef();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!paymentReference || !canvasRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const [{ default: generatePayload }, { default: QRCode }] = await Promise.all([
          import(''),
          import('qrcode'),
        ]);
        if (cancelled) return;
        const payload = generatePayload(paymentReference, { amount: amount > 0 ? amount : undefined });
        await QRCode.toCanvas(canvasRef.current, payload, {
          width: size,
          margin: 1,
          color: { dark: '#1a1a2e', light: '#ffffff' },
        });
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => { cancelled = true; };
  }, [paymentReference, amount, size]);

  if (!paymentReference || error) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center p-2"
      >
        {error ? 'Não foi possível carregar o QR' : 'QR de pagamento não configurado'}
      </div>
    );
  }

  return <canvas ref={canvasRef} className="rounded-lg" />;
}
