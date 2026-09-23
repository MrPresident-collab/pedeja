import React, { useState } from 'react';
import {
  MapPin, Clock, Star, Navigation, MessageSquare,
  Banknote, CheckCircle, Receipt, ShoppingBag, Bike,
  X, ArrowLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getDistanceFromLatLonInKm } from '../../utils';
import InteractiveMap from '../InteractiveMap';

const calcETA = (fromLoc, toLoc) => {
  if (!fromLoc || !toLoc) return null;
  const km = getDistanceFromLatLonInKm(fromLoc.lat, fromLoc.lng, toLoc.lat, toLoc.lng);
  const mins = Math.max(1, Math.ceil((km / 30) * 60));
  return { km: km.toFixed(1), mins };
};

const STATUS_LABELS = {
  pending:         { label: 'A aguardar confirmação do comerciante',          color: 'bg-orange-100 text-orange-600' },
  accepted:        { label: 'Pedido aceite pelo comerciante',                 color: 'bg-indigo-100 text-indigo-600' },
  preparing:       { label: 'A preparar comida',          color: 'bg-blue-100 text-blue-600' },
  ready_to_pickup: { label: 'A aguardar estafeta',           color: 'bg-purple-100 text-purple-600' },
  rider_accepted:  { label: 'Estafeta aceitou',         color: 'bg-indigo-100 text-indigo-600' },
  picking_up:      { label: 'Estafeta chegou ao ponto de recolha',      color: 'bg-indigo-100 text-indigo-700' },
  delivering:      { label: '🛵 A entregar',      color: 'bg-blue-100 text-blue-700' },
  delivered:       { label: '📦 Estafeta chegou ao destino', color: 'bg-teal-100 text-teal-700' },
};

const TRACKING_STATUSES = ['rider_accepted', 'picking_up', 'delivering'];

export default function ActivityTab() {
  const {
    orders, userProfile, currentUser,
    openRatingModal, updateOrderStatus,
    hasPendingCancelRequest, requestCancelOrder, cancelOrderDirectly,
    openChatWindow, restaurants, riders,
    setActiveTab,
  } = useApp();

  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [showCancelReqModal, setShowCancelReqModal] = useState(false);
  const [cancelReqOrderId, setCancelReqOrderId] = useState(null);
  const [cancelReqReason, setCancelReqReason] = useState('');

  // Derive rider locations from order.riderLocation (updated by local simulation in AppContext)
  const riderLocations = Object.fromEntries(
    orders
      .filter(o => TRACKING_STATUSES.includes(o.status) && o.riderLocation)
      .map(o => [o.id, o.riderLocation]),
  );

  const myOrders = orders.filter(o =>
    o.customerId === userProfile.id || o.customerId === currentUser?.id,
  );

  const inProgress = myOrders.filter(o =>
    ['pending', 'accepted', 'preparing', 'ready_to_pickup', 'rider_accepted', 'picking_up', 'delivering', 'delivered'].includes(o.status),
  );

  const parseDateMs = (dateVal) => {
    if (!dateVal) return NaN;
    if (typeof dateVal === 'number') return dateVal;
    if (typeof dateVal === 'string') {
      const trimmed = dateVal.trim();
      const parts = trimmed.split(' ');
      if (parts.length >= 1) {
        const dateParts = parts[0].split('/');
        if (dateParts.length === 3) {
          const [d, m, y] = dateParts.map(Number);
          if (d > 0 && d <= 31 && m > 0 && m <= 12 && y >= 2000) {
            let hh = 0, mm = 0, ss = 0;
            if (parts[1]) {
              const timeParts = parts[1].split(':').map(Number);
              hh = timeParts[0] || 0;
              mm = timeParts[1] || 0;
              ss = timeParts[2] || 0;
            }
            return new Date(y, m - 1, d, hh, mm, ss).getTime();
          }
        }
      }
      const isoFormatted = trimmed.includes(' ') && !trimmed.includes('T') ? trimmed.replace(' ', 'T') : trimmed;
      const parsedIso = new Date(isoFormatted).getTime();
      if (!isNaN(parsedIso)) return parsedIso;
    }
    const t = new Date(dateVal).getTime();
    if (!isNaN(t)) return t;
    return NaN;
  };

  const [now] = useState(() => Date.now());

  const getOrderCompletedMs = (order) => {
    if (typeof order.completedAtMs === 'number') return order.completedAtMs;
    let ms = parseDateMs(order.completedAt);
    if (!isNaN(ms)) return ms;
    if (typeof order.deliveredAtMs === 'number') return order.deliveredAtMs;
    ms = parseDateMs(order.deliveredAt);
    if (!isNaN(ms)) return ms;
    ms = parseDateMs(order.createdAt || order.timestamp);
    return isNaN(ms) ? now : ms;
  };

  const justDone = myOrders.filter(o => {
    if (o.status !== 'completed') return false;
    const completedMs = getOrderCompletedMs(o);
    return (now - completedMs) < 2 * 60 * 60 * 1000;
  });

  const history = myOrders.filter(o => {
    if (!['completed', 'cancelled'].includes(o.status)) return false;
    if (o.status === 'completed') {
      const completedMs = getOrderCompletedMs(o);
      if ((now - completedMs) < 2 * 60 * 60 * 1000) return false;
    }
    return true;
  });

  return (
    <div className="p-4">
      {inProgress.length > 0 && (
        <>
          <h2 className="text-lg font-bold mb-3 text-orange-600 flex items-center gap-2">
            <Bike size={18} /> Em curso ({inProgress.length})
          </h2>
          {inProgress.map(order => {
            const s = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-600' };
            const cardBorder = order.status === 'delivered' ? 'border-2 border-teal-400' : 'border border-orange-100';
            const rLoc = riderLocations[order.id] ?? order.riderLocation;
            const isDelivering = order.status === 'delivering';
            return (
              <div key={order.id} className={`bg-white mb-4 rounded-2xl shadow-sm overflow-hidden ${cardBorder}`}>
                <div className="p-4 border-b border-orange-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {order.type === 'parcel' ? '📦 Entrega de encomenda' : order.restaurantName}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">{order.id} · {order.createdAt || order.timestamp}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${s.color}`}>{s.label}</span>
                  </div>
                  {order.type === 'parcel' && (
                    <div className="bg-blue-50 rounded-lg p-2.5 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <MapPin size={13} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700"><span className="font-semibold text-green-700">Recolha: </span>{order.pickup}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Navigation size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700"><span className="font-semibold text-red-600">Entrega: </span>{order.dropoff}</span>
                      </div>
                      {order.distance > 0 && (
                        <p className="text-xs text-gray-400 pl-5">Distância {order.distance} km · {order.weight} kg</p>
                      )}
                    </div>
                  )}
                  {order.status !== 'delivered' && (
                    <div className="mt-2">
                      {hasPendingCancelRequest(order.id) ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 flex items-center gap-2">
                          <Clock size={13} className="text-yellow-500 shrink-0" />
                          <div>
                            <p className="text-yellow-700 font-bold text-xs">⏳ A aguardar aprovação do Admin para cancelamento</p>
                            <p className="text-yellow-600 text-[11px] mt-0.5">O pedido de cancelamento aguarda revisão</p>
                          </div>
                        </div>
                      ) : order.status === 'pending' ? (
                        <button
                          onClick={() => {
                            if (window.confirm('Confirma o cancelamento deste pedido?')) {
                              cancelOrderDirectly(order.id, 'Cancelado pelo cliente');
                            }
                          }}
                          className="w-full text-center text-xs text-red-500 font-semibold hover:text-white py-2 hover:bg-red-500 rounded-xl transition-all border border-red-200 hover:border-red-500"
                        >
                          ✕ cancelarpedidoทันที
                        </button>
                      ) : (
                        <button
                          onClick={() => { setCancelReqOrderId(order.id); setCancelReqReason(''); setShowCancelReqModal(true); }}
                          className="w-full text-center text-xs text-gray-400 hover:text-red-500 py-1.5 hover:bg-red-50 rounded-lg transition-all border border-dashed border-gray-200 hover:border-red-200"
                        >
                          ✕ Pedir cancelamento do pedidoนี้
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {TRACKING_STATUSES.includes(order.status) && (() => {
                  const dest = order.status === 'picking_up' ? order.pickupLocation : order.location;
                  const eta = calcETA(rLoc, dest);
                  return (
                    <div className="border-t border-blue-50">
                      <div className={`px-4 py-2.5 flex items-center justify-between ${isDelivering ? 'bg-blue-600' : 'bg-indigo-50'}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🛵</span>
                          <div>
                            <p className={`text-xs font-bold ${isDelivering ? 'text-white' : 'text-indigo-700'}`}>
                              {order.riderName || 'Estafeta'}
                            </p>
                            <p className={`text-[10px] ${isDelivering ? 'text-blue-100' : 'text-indigo-400'}`}>
                              {isDelivering ? 'A caminho da sua morada!' : order.status === 'picking_up' ? 'A recolher' : 'Entrega aceite'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {eta && (
                            <div className={`text-right ${isDelivering ? 'text-white' : 'text-indigo-700'}`}>
                              <p className="text-xs font-black">~{eta.mins} min</p>
                              <p className={`text-[10px] ${isDelivering ? 'text-blue-100' : 'text-indigo-400'}`}>{eta.km} km</p>
                            </div>
                          )}
                          <button
                            onClick={() => setTrackingOrderId(order.id)}
                            className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 ${isDelivering ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'} active:scale-95 transition-all`}
                          >
                            <MapPin size={11} /> Ecrã inteiro
                          </button>
                        </div>
                      </div>
                      <InteractiveMap
                        mode="view"
                        userLocation={order.location}
                        shopLocation={order.pickupLocation}
                        riderLocation={rLoc}
                        trackingMode
                        autoFollow={isDelivering}
                        className={isDelivering ? 'h-72' : 'h-44'}
                      />
                    </div>
                  );
                })()}

                {order.status === 'delivered' ? (
                  order.paymentMethod === 'cash' ? (
                    <div className="px-4 py-3 bg-orange-100 border-t border-orange-200 flex items-center gap-3">
                      <Banknote size={22} className="text-orange-600 shrink-0" />
                      <div className="flex-1">
                        <p className="text-orange-800 font-bold text-sm">Prepare o numerário para o estafeta</p>
                        <p className="text-orange-600 text-xs mt-0.5">Valor a pagar <span className="font-black text-base text-orange-700">Kz {(order.grandTotal || 0).toLocaleString()}</span></p>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-2.5 bg-green-50 border-t border-green-100 flex items-center gap-2">
                      <span className="text-base">👛</span>
                      <span className="text-xs text-green-700 font-semibold">Pago pela carteira — não é necessário pagar mais</span>
                    </div>
                  )
                ) : (
                  <div className="px-4 py-2 bg-orange-50 border-t border-orange-100 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {order.paymentMethod === 'cash' ? '💵 Pagamento em numerário' : '👛 Pago pela carteira'}
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-400 mr-1">Valor pago</span>
                      <span className="text-lg font-black text-orange-600">Kz {(order.grandTotal || 0).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {order.status === 'delivered' && (
                  <div className="px-3 pt-2 pb-3">
                    {order.deliveryProofUrl && (
                      <div className="mb-3 rounded-xl overflow-hidden border-2 border-teal-200">
                        <img src={order.deliveryProofUrl} alt="Comprovativo de entrega" className="w-full object-cover max-h-48" />
                        <div className="bg-teal-50 px-3 py-1.5 flex items-center gap-1.5">
                          <CheckCircle size={13} className="text-teal-600" />
                          <span className="text-xs text-teal-700 font-semibold">Fotografia de comprovativo de entrega do estafeta</span>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => { updateOrderStatus(order.id, 'completed'); openRatingModal(order); }}
                      className="w-full bg-teal-500 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-teal-400 active:scale-95 transition-all shadow-lg shadow-teal-900/20 animate-pulse"
                    >
                      <CheckCircle size={18} />
                      {order.type === 'parcel' ? 'Recepção da encomenda confirmada'
                        : order.type === 'ride' ? 'Viagem confirmada'
                        : order.type === 'service' ? 'Serviço confirmado'
                        : 'Recepção da comida confirmada'}
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-1.5">
                      {order.paymentMethod === 'cash'
                        ? '✅ Verifique o comprovativo acima e confirme depois de receber e pagar ao estafeta'
                        : '✅ Verifique o comprovativo acima e confirme a recepção'}
                    </p>
                  </div>
                )}

                <div className="p-3 flex flex-wrap gap-2 border-t border-gray-50">
                  {order.type === 'food' && (() => {
                    const phone = order.restaurantPhone || restaurants.find(r => r.id === order.restaurantId)?.phone;
                    return phone ? (
                      <a href={`tel:${phone}`} className="flex-1 min-w-[110px] bg-orange-50 text-orange-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-orange-100 active:scale-95 transition-all">
                        📞 <span>{phone}</span>
                      </a>
                    ) : null;
                  })()}
                  {order.riderId && (() => {
                    const phone = order.riderPhone || riders.find(r => r.id === order.riderId)?.phone;
                    return phone ? (
                      <a href={`tel:${phone}`} className="flex-1 min-w-[110px] bg-green-50 text-green-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-green-100 active:scale-95 transition-all">
                        📞 <span>{phone}</span>
                      </a>
                    ) : null;
                  })()}
                  <button
                    onClick={() => openChatWindow('support-' + userProfile.id, 'Suporte (Admin)', 'customer')}
                    className="flex-1 min-w-[110px] bg-blue-50 text-blue-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-100 active:scale-95 transition-all"
                  >
                    <MessageSquare size={13} /> Support
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {justDone.length > 0 && (
        <>
          <h2 className="text-lg font-bold mb-3 text-green-600 flex items-center gap-2 mt-4">
            <CheckCircle size={18} /> Concluído ({justDone.length})
          </h2>
          {justDone.map(order => (
            <div key={order.id} className="bg-white mb-4 rounded-2xl shadow-sm overflow-hidden border-2 border-green-400">
              <div className="bg-green-500 px-4 py-3 flex items-center gap-3">
                <div className="bg-white rounded-full p-1.5">
                  <CheckCircle size={20} className="text-green-500" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Entrega concluída! 🎉</p>
                  <p className="text-green-100 text-xs">A encomenda chegou ao seu destino</p>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {order.type === 'parcel' ? '📦 Entrega de encomenda' : order.restaurantName}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">{order.id} · {order.createdAt || order.timestamp}</p>
                    {order.type === 'parcel' && order.dropoff && (
                      <p className="text-xs text-gray-500 mt-0.5">→ {order.dropoff}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700">✅ Concluído</span>
                    <div className="font-bold text-gray-800 mt-1">Kz {(order.grandTotal || 0).toLocaleString()}</div>
                  </div>
                </div>
                {order.paymentMethod === 'cash' ? (
                  <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 flex items-center gap-2">
                    <Banknote size={18} className="text-orange-500 shrink-0" />
                    <div>
                      <p className="text-orange-700 font-bold text-sm">Prepare o numerário Kz {(order.grandTotal || 0).toLocaleString()}</p>
                      <p className="text-orange-500 text-xs">Pagar directamente ao estafeta</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                    <span>👛</span><span>Pago pela carteira</span>
                  </div>
                )}
                {!order.rated && (
                  <button
                    onClick={() => openRatingModal(order)}
                    className="mt-3 w-full bg-yellow-400 text-yellow-900 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-yellow-300 active:scale-95 transition-all"
                  >
                    <Star size={16} className="fill-current" /> Avaliar
                  </button>
                )}
                {order.rated && (
                  <p className="mt-3 text-center text-xs text-green-600 font-semibold">⭐ Avaliado. Obrigado!</p>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      {history.length > 0 && (
        <>
          <h2 className="text-lg font-bold mb-3 text-gray-600 flex items-center gap-2 mt-4">
            <Receipt size={18} /> Histórico de pedidos
          </h2>
          {history.map(order => (
            <div key={order.id} className="bg-white mb-3 rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-800">
                    {order.type === 'parcel' ? '📦 Entrega de encomenda' : order.restaurantName}
                  </h3>
                  <p className="text-xs text-gray-400">{order.id} · {order.createdAt || order.timestamp}</p>
                  {order.type === 'parcel' && order.dropoff && (
                    <p className="text-xs text-gray-500 mt-0.5">→ {order.dropoff}</p>
                  )}
                  {order.status === 'cancelled' && order.cancelReason && (
                    <p className="text-xs text-red-500 mt-0.5">Cancelado: {order.cancelReason}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${order.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                    {order.status === 'cancelled' ? 'Cancelado' : 'Entrega concluída ✓'}
                  </span>
                  <div className="font-bold text-gray-800 mt-1">Kz {(order.grandTotal || 0).toLocaleString()}</div>
                </div>
              </div>
              {order.status === 'completed' && !order.rated && (
                <button
                  onClick={() => openRatingModal(order)}
                  className="mt-2 w-full bg-yellow-50 border border-yellow-300 text-yellow-700 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 hover:bg-yellow-100 active:scale-95 transition-all"
                >
                  <Star size={13} className="fill-current" /> Avaliar
                </button>
              )}
              {order.status === 'completed' && order.rated && (
                <p className="mt-2 text-center text-xs text-green-500 font-semibold">⭐ Avaliado</p>
              )}
            </div>
          ))}
        </>
      )}

      {myOrders.length === 0 && (
        <div className="text-center mt-20 text-gray-400">
          <ShoppingBag size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">Ainda não existem pedidos</p>
          <button onClick={() => setActiveTab('home')} className="mt-3 text-orange-500 font-bold text-sm underline">
            สั่งcomidaเลย!
          </button>
        </div>
      )}

      {/* ── Pedir cancelamento do pedido Modal ── */}
      {showCancelReqModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-end justify-center z-50 backdrop-blur-sm"
          onClick={() => setShowCancelReqModal(false)}
        >
          <div className="bg-white w-full max-w-md rounded-t-3xl p-5 pb-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-red-100 rounded-full p-1.5"><X size={16} className="text-red-500" /></div>
              <h3 className="font-bold text-gray-800 text-base">Pedir cancelamento do pedido</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4 pl-1">
              pedidoจะentregaไปยัง Admin เพื่อverificar
              {cancelReqOrderId && (() => {
                const o = orders.find(x => x.id === cancelReqOrderId);
                return o?.paymentMethod === 'wallet'
                  ? ` — Se o Admin aprovar, será reembolsado Kz ${(o.grandTotal || 0).toLocaleString()} para a carteira`
                  : '';
              })()}
            </p>
            {['Mudei de ideias', 'Pedido incorrecto / preciso de alterar', 'Morada de entrega incorrecta', 'Espera demasiado longa'].map(r => (
              <button
                key={r}
                onClick={() => setCancelReqReason(r)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm mb-1.5 border transition-all ${
                  cancelReqReason === r
                    ? 'bg-red-50 border-red-300 text-red-700 font-semibold'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {cancelReqReason === r ? '✓ ' : ''}{r}
              </button>
            ))}
            <label htmlFor="customer-cancel-req-reason" className="sr-only">Motivo do cancelamento</label>
            <textarea
              id="customer-cancel-req-reason"
              name="cancelReason"
              value={cancelReqReason}
              onChange={e => setCancelReqReason(e.target.value)}
              placeholder="Ou escreva outro motivo..."
              rows={2}
              className="w-full mt-1 border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200"
              autoComplete="off"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowCancelReqModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 active:scale-95 transition-all"
              >
                cancelar
              </button>
              <button
                onClick={() => {
                  if (!cancelReqReason.trim()) return alert('Indique o motivo');
                  requestCancelOrder(cancelReqOrderId, cancelReqReason);
                  setShowCancelReqModal(false);
                  setCancelReqOrderId(null);
                  setCancelReqReason('');
                }}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 active:scale-95 transition-all"
              >
                entregapedidocancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Full-screen Live Tracking Overlay ── */}
      {trackingOrderId && (() => {
        const o = orders.find(ord => ord.id === trackingOrderId);
        if (!o) { setTrackingOrderId(null); return null; }
        const rLoc = riderLocations[o.id] ?? o.riderLocation;
        const dest = o.status === 'picking_up' ? o.pickupLocation : o.location;
        const eta = calcETA(rLoc, dest);
        const isDelivering = o.status === 'delivering';
        return (
          <div className="fixed inset-0 z-[200] bg-white flex flex-col">
            <div className={`flex items-center justify-between px-4 py-3 shadow-sm flex-shrink-0 ${isDelivering ? 'bg-blue-600' : 'bg-indigo-600'}`}>
              <button
                onClick={() => setTrackingOrderId(null)}
                className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 active:scale-90 transition-all"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="text-center flex-1 mx-3">
                <p className="text-white font-black text-sm">
                  {isDelivering ? '🛵 A entregar!' : o.status === 'picking_up' ? '🏪 Estafeta chegou ao estabelecimento' : '✅ Estafeta aceitou'}
                </p>
                <p className="text-blue-100 text-xs mt-0.5">{o.riderName || 'Estafeta'}</p>
              </div>
              {eta ? (
                <div className="text-right bg-white/20 rounded-xl px-3 py-1.5">
                  <p className="text-white font-black text-sm leading-tight">~{eta.mins} min</p>
                  <p className="text-blue-100 text-[10px]">{eta.km} km</p>
                </div>
              ) : <div className="w-16" />}
            </div>
            <div className="flex-1 relative">
              <InteractiveMap
                mode="view"
                userLocation={o.location}
                shopLocation={o.pickupLocation}
                riderLocation={rLoc}
                trackingMode
                autoFollow={isDelivering}
                className="h-full"
              />
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-3 z-[1000]">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px]">🛵</span>
                    <span className="text-gray-600 font-medium">Estafeta</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-[10px]">🏪</span>
                    <span className="text-gray-600 font-medium">{o.type === 'parcel' ? 'Ponto de recolha' : 'Comerciante'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px]">🏠</span>
                    <span className="text-gray-600 font-medium">Entrega</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
                    <span className="text-blue-600 font-bold">Live</span>
                  </div>
                </div>
                {o.type === 'parcel' && o.dropoff && (
                  <p className="text-[10px] text-gray-400 mt-1.5 truncate">📦 Entregar em: {o.dropoff}</p>
                )}
                {o.type === 'food' && (
                  <p className="text-[10px] text-gray-400 mt-1.5 truncate">🍽️ {o.restaurantName}</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
