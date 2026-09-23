export default function PaymentQR({ paymentReference, amount, size = 160 }) {
  if (!paymentReference) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center p-2"
      >
        QR de pagamento não configurado
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="bg-white rounded-lg border flex flex-col items-center justify-center text-center p-3"
      aria-label="Referência de pagamento"
    >
      <span className="text-[10px] uppercase tracking-wide text-gray-400">Referência</span>
      <span className="font-mono font-bold text-sm break-all mt-1">{paymentReference}</span>
      {amount > 0 && <span className="text-xs text-gray-500 mt-2">Kz {Number(amount).toLocaleString('pt-AO')}</span>}
    </div>
  );
}
