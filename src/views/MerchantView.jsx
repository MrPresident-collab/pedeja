import React, { useState } from 'react';
import {
  ChefHat, LogOut, Camera, ToggleRight, ToggleLeft,
  Plus, Edit, Trash2,
  Image as ImageIcon, MapPin, Loader, Bell,
  Clock, CheckCircle, History, X, XCircle, carteira,
  TrendingUp, BarChart2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STATUS_LABELS, MENU_TAGS } from '../constants';
import { formatDateTimeFromMs, getMerchantNotifSound, setMerchantNotifSound, playOrderNotificationSound } from '../utils';
import InteractiveMap from '../components/InteractiveMap';

export default function MerchantView() {
  const {
    setActiveRole,
    merchantTab, setMerchantTab,
    orders, restaurants, riders, menuItems,
    userProfile, currentUser,
    appConfig,
    isEditingMenu, setIsEditingMenu,
    editForm, setEditForm,
    handleToggleShopStatus,
    handleAddMenuItem, handleEditMenuItem,
    handleDeleteMenuItem, handleToggleItemAvailability,
    handleShopPhotoChange,
    handleMenuPhotoSelect,
    updateOrderStatus,
    notifySystem,
    setProfileSubView,
    setActiveTab,
    syncRoles, userRoles,
    handleUpdateShopLocation,
    initiateCancelOrder,
    requestCancelByRole,
    showCancelModal, setShowCancelModal,
    selectedOrderToCancel,
    cancelReasonInput, setCancelReasonInput,
    usercarteira, walletHistory,
    isDataLoading,
  } = useApp();

  const [pendingShopLocation, setPendingShopLocation] = useState(null);
  const [savingShopLocation, setSavingShopLocation] = useState(false);
  const [showSoundPanel, setShowSoundPanel] = useState(false);
  const [customSoundName, setCustomSoundName] = useState(() => {
    const s = getMerchantNotifSound();
    return s ? 'Som seleccionado' : null;
  });

  const handleSoundFilePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      notifySystem('Ficheiro demasiado grande', 'Seleccione um ficheiro de áudio até 2 MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setMerchantNotifSound(ev.target.result);
      setCustomSoundName(file.name);
      notifySystem('Som guardado ✅', file.name, 'success');
    };
    reader.readAsDataURL(file);
  };

  const myShop = restaurants.find(r => r.ownerId === userProfile.id || r.ownerId === currentUser?.id);

  // กลุ่ม orders แยกตาม status
  const myOrders = myShop ? orders.filter(o => o.type === 'food' && o.restaurantId === myShop.id) : [];
  const newOrders     = myOrders.filter(o => o.status === 'pending');
  // Keep order on merchant active tab while preparing, waiting rider, rider accepted, and when rider arrives (picking_up)
  // Move to doneOrders when rider departs for delivery (delivering)
  const activeOrders  = myOrders.filter(o => ['preparing', 'ready_to_pickup', 'rider_accepted', 'picking_up'].includes(o.status));
  const doneOrders    = myOrders.filter(o => ['delivering', 'delivered', 'completed', 'cancelled'].includes(o.status));

  const getMerchantIncome = (o) => {
    if (typeof o.merchantIncome === 'number') return o.merchantIncome;
    if (typeof o.settlement?.merchantIncome === 'number') return o.settlement.merchantIncome;
    const foodTotal = o.foodTotal || 0;
    const gpRate = (appConfig?.gpFood ?? 30) / 100;
    return foodTotal * (1 - gpRate);
  };

  const myRevenue = myOrders
    .filter(o => ['delivered', 'completed'].includes(o.status))
    .reduce((sum, o) => sum + getMerchantIncome(o), 0);

  const openEditMenu = (item) => {
    setIsEditingMenu(item ? item.id : 'new');
    setEditForm(item ? { ...item, tag: item.tag || '', options: item.options || [] } : { name: '', price: '', desc: '', image: '', tag: '', options: [] });
  };

  const addEditFormOption = () => {
    setEditForm(prev => ({
      ...prev,
      options: [...(prev.options || []), { name: '', price: 0 }]
    }));
  };

  const updateEditFormOption = (index, field, value) => {
    setEditForm(prev => {
      const opts = [...(prev.options || [])];
      opts[index] = { ...opts[index], [field]: field === 'price' ? parseFloat(value) || 0 : value };
      return { ...prev, options: opts };
    });
  };

  const removeEditFormOption = (index) => {
    setEditForm(prev => ({
      ...prev,
      options: (prev.options || []).filter((_, i) => i !== index)
    }));
  };

  const saveMenu = () => {
    if (!editForm.name || !editForm.price) return notifySystem("Erro", "Indique o nome e o preço", "error");
    if (isEditingMenu === 'new') {
      handleAddMenuItem(myShop.id, { ...editForm, price: parseFloat(editForm.price) });
    } else {
      handleEditMenuItem(myShop.id, isEditingMenu, { ...editForm, price: parseFloat(editForm.price) });
    }
    setIsEditingMenu(null);
  };

  if (!myShop) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <ChefHat size={56} className="text-gray-300 mb-4" />
      <h2 className="text-xl font-bold text-gray-700 mb-2">Ainda não existe comerciante no sistema</h2>
      <p className="text-gray-500 text-sm mb-2">O registo pode ainda não ter sido aprovado</p>
      <p className="text-xs text-gray-400 mb-2">ID: {userProfile.id || currentUser?.id}</p>
      <p className="text-xs text-gray-400 mb-6">Permissões: {userRoles.join(', ')}</p>
      <button
        onClick={() => { syncRoles(); notifySystem("A verificar", "Dados actualizados", "info"); }}
        className="bg-blue-500 text-white px-6 py-3 rounded-xl font-bold mb-3 shadow w-full max-w-xs"
      >🔄 Verificar estado</button>
      <button
        onClick={() => { setActiveRole('customer'); setProfileSubView('reg_merchant'); setActiveTab('profile'); }}
        className="bg-violet-500 text-white px-6 py-3 rounded-xl font-bold mb-3 shadow w-full max-w-xs"
      >Registar novo comerciante</button>
      <button onClick={() => setActiveRole('customer')} className="text-gray-500 text-sm underline">Voltar ao início</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-14 pb-10">
      <header className="bg-white shadow p-4 mb-4 sticky top-0 z-30">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-xl font-bold flex items-center"><ChefHat className="mr-2 text-green-600" /> Gestão do comerciante</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSoundPanel(v => !v)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-colors ${showSoundPanel ? 'bg-violet-100 text-violet-600 border border-orange-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              title="Definições de som de notificações"
            >
              <Bell size={13} className={customSoundName ? 'text-violet-500' : ''} />
              {customSoundName ? <span className="text-violet-600">•</span> : null}
            </button>
            <button onClick={() => setActiveRole('customer')} className="flex items-center text-sm bg-gray-200 px-3 py-1 rounded-full hover:bg-gray-300"><LogOut size={14} className="mr-1" /> Sair</button>
          </div>
        </div>

        {/* Sound settings panel */}
        {showSoundPanel && (
          <div className="bg-orange-50 border border-violet-200 rounded-xl p-3 mb-3">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-sm text-gray-700 flex items-center gap-1.5">
                <Bell size={14} className="text-violet-500" /> Som de novos pedidos
              </h4>
              <button onClick={() => setShowSoundPanel(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
            <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 rounded-lg text-xs bg-white border border-gray-200">
              <Bell size={12} className={customSoundName ? 'text-violet-500' : 'text-gray-400'} />
              <span className="flex-1 truncate text-gray-700">{customSoundName || 'Som predefinido (Beep)'}</span>
              {customSoundName && (
                <button
                  onClick={() => { setMerchantNotifSound(null); setCustomSoundName(null); notifySystem('Som removido', 'Usar som predefinido', 'info'); }}
                  className="text-red-400 hover:text-red-600 font-bold"
                >Eliminar</button>
              )}
            </div>
            <div className="flex gap-2">
              <label htmlFor="merchant-notif-sound-file" className="flex-1 flex items-center justify-center gap-1 py-2 bg-violet-500 text-white rounded-lg cursor-pointer hover:bg-violet-600 active:scale-95 transition-all text-xs font-bold">
                <Bell size={13} /> Escolher som do dispositivo
                <input id="merchant-notif-sound-file" name="soundFile" type="file" accept="audio/*" className="hidden" onChange={handleSoundFilePick} />
              </label>
              <button
                onClick={() => { playOrderNotificationSound(); notifySystem('🔊 Testar som', 'A reproduzir...', 'info'); }}
                className="px-3 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 active:scale-95 transition-all text-xs font-bold"
              >🔊 Testar</button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">Aceita .mp3, .wav e .ogg até 2 MB • Guardado apenas neste dispositivo</p>
          </div>
        )}

        {/* รูปหน้าestabelecimento */}
        <div className="relative h-36 w-full rounded-xl overflow-hidden mb-3 group">
          <img src={myShop.image} className="w-full h-full object-cover" alt="shop" />
          <label htmlFor="merchant-shop-photo-file" className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-sm font-bold">
            <Camera className="mr-2" size={18} /> Alterar imagem do estabelecimento
            <input id="merchant-shop-photo-file" name="shopPhoto" type="file" accept="image/*" className="hidden" onChange={(e) => handleShopPhotoChange(myShop.id, e)} />
          </label>
        </div>

        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="font-bold text-lg">{myShop.name}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <span className={myShop.status === 'open' ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                ● {myShop.status === 'open' ? 'Aberto' : 'Fechado'}
              </span>
              {myShop.location && myShop.location.lat !== 13.7563 && (
                <span className="text-gray-400 ml-1">
                  · 📍 {myShop.location.lat.toFixed(3)}, {myShop.location.lng.toFixed(3)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => handleToggleShopStatus(myShop.id)}
            className={`px-4 py-2 rounded-lg font-bold text-white text-sm flex items-center ${myShop.status === 'open' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
          >
            {myShop.status === 'open' ? <><ToggleRight className="mr-1" size={16} /> Fechar estabelecimento</> : <><ToggleLeft className="mr-1" size={16} /> Abrir estabelecimento</>}
          </button>
        </div>

        {/* รายได้Hoje */}
        <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 flex justify-between items-center mb-3">
          <span className="text-gray-600 text-sm">Receita líquida (concluída)</span>
          <span className="text-xl font-bold text-green-700">Kz {myRevenue.toFixed(0)}</span>
        </div>

        {/* Tab bar */}
        <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
          <button
            onClick={() => setMerchantTab('orders')}
            className={`flex-1 py-2 rounded-md font-bold text-xs flex items-center justify-center gap-1 relative ${merchantTab === 'orders' ? 'bg-white shadow text-violet-600' : 'text-gray-500'}`}
          >
            <Bell size={13} />
            Novos pedidos
            {newOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {newOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMerchantTab('active')}
            className={`flex-1 py-2 rounded-md font-bold text-xs flex items-center justify-center gap-1 ${merchantTab === 'active' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
          >
            <Clock size={13} />
            Em preparação ({activeOrders.length})
          </button>
          <button
            onClick={() => setMerchantTab('menu')}
            className={`flex-1 py-2 rounded-md font-bold text-xs flex items-center justify-center gap-1 ${merchantTab === 'menu' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}
          >
            <ChefHat size={13} />
            Menu
          </button>
          <button
            onClick={() => setMerchantTab('location')}
            className={`flex-1 py-2 rounded-md font-bold text-xs flex items-center justify-center gap-1 ${merchantTab === 'location' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
          >
            <MapPin size={13} />
            Localização
          </button>
          <button
            onClick={() => setMerchantTab('wallet')}
            className={`flex-1 py-2 rounded-md font-bold text-xs flex items-center justify-center gap-1 ${merchantTab === 'wallet' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}
          >
            <carteira size={13} />
            Carteira
          </button>
          <button
            onClick={() => setMerchantTab('analytics')}
            className={`flex-1 py-2 rounded-md font-bold text-xs flex items-center justify-center gap-1 ${merchantTab === 'analytics' ? 'bg-white shadow text-purple-600' : 'text-gray-500'}`}
          >
            <TrendingUp size={13} />
            Estatísticas
          </button>
        </div>
      </header>

      {/* ── Novos pedidos (pending) ─────────────────────────────────────── */}
      {merchantTab === 'orders' && (
        <div className="px-4">
          {newOrders.length === 0 ? (
            isDataLoading ? (
              <div className="space-y-3 mt-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                    <div className="flex justify-between mb-3">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-4 bg-gray-200 rounded w-1/4" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <div className="h-9 bg-gray-200 rounded-xl flex-1" />
                      <div className="h-9 bg-gray-200 rounded-xl flex-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 mt-16 py-8">
                <Bell size={44} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold text-gray-500">Sem novos pedidos</p>
                <p className="text-xs text-gray-400 mt-1">Novos pedidos aparecerão aqui com som de notificação</p>
              </div>
            )
          ) : (
            <div className="space-y-4">
              {newOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  riders={riders}
                  updateOrderStatus={(id, status) => {
                    updateOrderStatus(id, status);
                    if (status === 'preparing') setMerchantTab('active');
                  }}
                  onCancel={initiateCancelOrder}
                  highlight="orange"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Em preparação / aguardarEstafeta ───────────────────────────────────────── */}
      {merchantTab === 'active' && (
        <div className="px-4">
          {activeOrders.length === 0 ? (
            <div className="text-center text-gray-400 mt-16 py-8">
              <Clock size={44} className="mx-auto mb-3 opacity-20" />
              <p className="font-bold text-gray-500">Sem pedidos em curso</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  riders={riders}
                  updateOrderStatus={updateOrderStatus}
                  onCancel={initiateCancelOrder}
                  highlight="blue"
                />
              ))}
            </div>
          )}
          {/* Históricoย่อ */}
          {doneOrders.length > 0 && (
            <div className="mt-6">
              <h4 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1"><History size={12} /> Histórico ({doneOrders.length})</h4>
              <div className="space-y-2">
                {doneOrders.slice(0, 10).map(order => {
                  const inTransit = ['picking_up', 'delivering'].includes(order.status);
                  const isDone    = ['delivered', 'completed'].includes(order.status);
                  return (
                    <div key={order.id} className="bg-white p-3 rounded-lg border border-gray-100 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-gray-700">#{order.id.slice(-6)}</span>
                        <span className="text-xs text-gray-400 ml-2">{order.customerName}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold ${isDone ? 'text-green-600' : inTransit ? 'text-blue-500' : 'text-red-400'}`}>
                          {isDone ? `+Kz ${getMerchantIncome(order).toFixed(0)}` : inTransit ? '🚚 Em entrega' : 'Cancelar'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AcçõesMenu ────────────────────────────────────────────────── */}
      {merchantTab === 'menu' && (
        <div className="px-4">
          {!isEditingMenu ? (
            <>
              <button
                onClick={() => openEditMenu(null)}
                className="w-full bg-green-100 text-green-700 py-3 rounded-xl font-bold mb-4 border-2 border-green-200 flex items-center justify-center"
              >
                <Plus className="mr-2" /> Adicionar novo menu
              </button>
              <div className="space-y-4">
                {(menuItems[myShop.id] || []).map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm flex items-start">
                    {item.image && <img src={item.image} className="w-16 h-16 rounded-lg bg-gray-200 object-cover mr-4 flex-shrink-0" alt={item.name} />}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold truncate">{item.name}</h3>
                        <div className="flex space-x-1 ml-2 flex-shrink-0">
                          <button onClick={() => openEditMenu(item)} className="p-1 bg-gray-100 rounded text-gray-600"><Edit size={16} /></button>
                          <button onClick={() => handleDeleteMenuItem(myShop.id, item.id)} className="p-1 bg-red-100 rounded text-red-600"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <p className="text-gray-500 text-xs mb-2 line-clamp-1">{item.desc}</p>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-green-600">Kz {item.price}</span>
                        <button
                          onClick={() => handleToggleItemAvailability(myShop.id, item.id)}
                          className={`px-3 py-1 rounded-full text-xs font-bold ${item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                        >
                          {item.available ? 'Disponível' : 'Esgotado'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {(menuItems[myShop.id] || []).length === 0 && (
                  <p className="text-gray-400 text-center py-8 text-sm">Ainda não existem itens. Use o botão acima para adicionar.</p>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="font-bold text-lg mb-4">{isEditingMenu === 'new' ? 'Adicionar novo menu' : 'Editar menu'}</h3>
              <div className="space-y-3">
                <label htmlFor="merchant-menu-name-input" className="sr-only">Nome do prato</label>
                <input id="merchant-menu-name-input" name="name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nome do prato" className="w-full border p-2 rounded" autoComplete="off" aria-label="Nome do prato" />
                <label htmlFor="merchant-menu-price-input" className="sr-only">Preço (Kz)</label>
                <input id="merchant-menu-price-input" name="price" type="number" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} placeholder="Preço (Kz)" className="w-full border p-2 rounded" autoComplete="off" aria-label="Preço (Kz)" />
                <label htmlFor="merchant-menu-desc-input" className="sr-only">Descrição</label>
                <textarea id="merchant-menu-desc-input" name="desc" value={editForm.desc} onChange={e => setEditForm({ ...editForm, desc: e.target.value })} placeholder="Descrição" className="w-full border p-2 rounded" autoComplete="off" aria-label="Descrição" />

                <div>
                  <label htmlFor="merchant-menu-tag-select" className="block text-xs font-semibold text-gray-600 mb-1">Etiqueta</label>
                  <select
                    id="merchant-menu-tag-select"
                    name="tag"
                    value={editForm.tag || ''}
                    onChange={e => setEditForm({ ...editForm, tag: e.target.value })}
                    className="w-full border p-2 rounded text-sm"
                  >
                    <option value="">-- Sem etiqueta --</option>
                    {MENU_TAGS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Additional Options / Toppings */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-gray-700">Opções adicionais / extras</label>
                    <button
                      type="button"
                      onClick={addEditFormOption}
                      className="text-xs text-violet-600 font-bold flex items-center gap-1 hover:underline"
                    >
                      <Plus size={12} /> Adicionar opção
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(editForm.options || []).map((opt, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Nome da opção (ex.: ovo estrelado)"
                          value={opt.name}
                          onChange={e => updateEditFormOption(idx, 'name', e.target.value)}
                          className="flex-1 border p-1.5 text-xs rounded"
                        />
                        <input
                          type="number"
                          placeholder="Preço adicional (Kz)"
                          value={opt.price}
                          onChange={e => updateEditFormOption(idx, 'price', e.target.value)}
                          className="w-20 border p-1.5 text-xs rounded"
                        />
                        <button
                          type="button"
                          onClick={() => removeEditFormOption(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mb-2">
                  <label htmlFor="merchant-menu-photo-file" className="block text-sm text-gray-500 mb-1">Imagem do prato</label>
                  <label htmlFor="merchant-menu-photo-file" className={`w-full border-2 border-dashed p-4 rounded-lg text-center cursor-pointer block text-gray-500 hover:bg-gray-50 ${editForm._imageUploading ? 'opacity-60 pointer-events-none' : ''}`}>
                    {editForm._imageUploading ? (
                      <div className="flex flex-col items-center py-2">
                        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-2" />
                        <span className="text-xs text-green-600">A carregar imagem...</span>
                      </div>
                    ) : editForm.image ? (
                      <div className="relative">
                        <img src={editForm.image} className="h-32 w-full object-cover rounded-lg mx-auto" alt="food" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 hover:opacity-100 rounded-lg transition-opacity">
                          <Camera className="mr-2" /> Alterar imagem
                        </div>
                      </div>
                    ) : (
                      <><ImageIcon className="mx-auto mb-2 text-gray-400" /><span>Toque para escolher ou tirar uma fotografia</span></>
                    )}
                    <input id="merchant-menu-photo-file" name="menuPhoto" type="file" accept="image/*" className="hidden" onChange={handleMenuPhotoSelect} />
                  </label>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setIsEditingMenu(null)} className="flex-1 bg-gray-200 py-3 rounded font-bold">Cancelar</button>
                  <button
                    onClick={saveMenu}
                    disabled={!!editForm._imageUploading}
                    className={`flex-1 py-3 rounded font-bold text-white ${editForm._imageUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600'}`}
                  >
                    {editForm._imageUploading ? 'A carregar...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Localizaçãocomerciante ─────────────────────────────────────────────── */}
      {merchantTab === 'location' && (
        <div className="px-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 mb-4">
            <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
              <MapPin size={16} className="text-blue-500" /> Localização do estabelecimento
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Esta localização é usada para calcular a distância para clientes e distribuir entregas a estafetas num raio de {appConfig?.riderRadius || 5} km. — <strong>A localização deve estar correcta</strong>
            </p>

            {/* localizaçãoactual */}
            <div className="text-xs text-gray-500 mb-3 space-y-0.5">
              <div>
                📍 Localização actual:{' '}
                {myShop.location
                  ? `${myShop.location.lat.toFixed(4)}, ${myShop.location.lng.toFixed(4)}`
                  : <span className="text-red-400 font-bold">Ainda não definida</span>}
              </div>
              {pendingShopLocation && (
                <div className="text-blue-600 font-bold">
                  🔵 Escolher novamente: {pendingShopLocation.lat.toFixed(4)}, {pendingShopLocation.lng.toFixed(4)}
                </div>
              )}
            </div>

            {/* mapa */}
            <div className="rounded-xl overflow-hidden border-2 border-blue-200 mb-3">
              <InteractiveMap
                mode="select"
                userLocation={pendingShopLocation || myShop.location}
                onLocationSelect={(loc) => setPendingShopLocation(loc)}
                className="h-64"
              />
            </div>
            <p className="text-[10px] text-gray-400 mb-3 text-center">Toque no mapa para marcar a localização do estabelecimento</p>

            {/* GPS อัตโนมัติ */}
            <button
              onClick={() => {
                if (!navigator.geolocation) return;
                navigator.geolocation.getCurrentPosition(
                  pos => setPendingShopLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                  () => notifySystem('GPS indisponível', 'Toque no mapa para seleccionar a localização', 'error'),
                  { enableHighAccuracy: true, timeout: 8000 },
                );
              }}
              className="w-full py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-bold mb-2 hover:bg-gray-200 active:scale-95 transition-all"
            >
              📡 Usar GPS actual como localização do estabelecimento
            </button>

            {/* Guardar */}
            <button
              disabled={!pendingShopLocation || savingShopLocation}
              onClick={async () => {
                if (!pendingShopLocation) return;
                setSavingShopLocation(true);
                handleUpdateShopLocation(myShop.id, pendingShopLocation);
                setPendingShopLocation(null);
                setSavingShopLocation(false);
              }}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                pendingShopLocation && !savingShopLocation
                  ? 'bg-blue-500 text-white hover:bg-blue-400 active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {savingShopLocation ? (
                <><Loader size={16} className="animate-spin" /> A guardar...</>
              ) : (
                <><MapPin size={16} /> Guardar localização do estabelecimento</>
              )}
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 space-y-1">
            <p className="font-bold">📋 A localização do estabelecimento afecta:</p>
            <p>• <strong>Cliente</strong> — encontram o estabelecimento ordenado pela distância</p>
            <p>• <strong>Estafeta</strong> — recebem entregas de estabelecimentos num raio de {appConfig?.riderRadius || 5} km</p>
            <p>• <strong>mapa</strong> — o cliente vê o estabelecimento correctamente no mapa</p>
          </div>
        </div>
      )}


      {/* ── Carteiraเงิน ───────────────────────────────────────────────── */}
      {merchantTab === 'wallet' && (
        <div className="px-4">
          {/* ยอดคงเหลือ */}
          <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl p-5 mb-4 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <carteira size={18} />
              <span className="text-green-100 text-sm">Saldo actual</span>
            </div>
            <div className="text-3xl font-bold">Kz {(usercarteira ?? 0).toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-green-200 text-xs mt-1">A receita dos pedidos será creditada automaticamente na carteira</div>
          </div>

          {/* HistóricoTransacções */}
          <h3 className="font-bold text-base mb-3 text-gray-700">HistóricoTransacções</h3>
          {!walletHistory || walletHistory.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
              <carteira size={36} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Ainda não existe histórico</p>
              <p className="text-xs mt-1 text-gray-400">A receita aparecerá quando as entregas forem concluídas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...(walletHistory)].sort((a, b) => {
                  const ms = (e) => e.createdAtMs || parseInt(((e.id || '').match(/\d{10,}/) || ['0'])[0], 10);
                  return ms(b) - ms(a);
                }).slice(0, 50).map((tx, i) => {
                const amt = tx.amount ?? 0;
                const isIncome = amt >= 0;
                return (
                  <div key={tx.id || i} className="flex justify-between items-center gap-3 p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-sm truncate">{tx.desc || '—'}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{tx.createdAtMs ? formatDateTimeFromMs(tx.createdAtMs) : (tx.date || '')}</div>
                    </div>
                    <span className={`font-bold text-sm flex-shrink-0 ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
                      {isIncome ? '+' : '-'}Kz {Math.abs(amt).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Estatísticascomerciante ───────────────────────────────────────────────── */}
      {merchantTab === 'analytics' && (() => {
        const done = myOrders.filter(o => ['delivered', 'completed'].includes(o.status));
        const cancelled = myOrders.filter(o => o.status === 'cancelled');
        const todayStr = (() => { const d = new Date(); const p = n => String(n).padStart(2,'0'); return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`; })();
        const todayDone = done.filter(o => (o.createdAt || o.timestamp || '').startsWith(todayStr));
        const todayRevenue = todayDone.reduce((s, o) => s + getMerchantIncome(o), 0);
        const allRevenue = done.reduce((s, o) => s + getMerchantIncome(o), 0);
        const avgOrder = done.length > 0 ? allRevenue / done.length : 0;

        // Top Menus mais vendidos
        const itemCounts = {};
        done.forEach(o => (o.items || []).forEach(item => {
          itemCounts[item.name] = (itemCounts[item.name] || 0) + item.qty;
        }));
        const topItems = Object.entries(itemCounts)
          .map(([name, qty]) => ({ name, qty }))
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5);
        const maxQty = topItems[0]?.qty || 1;

        // Order count by hour
        const hourCounts = Array(24).fill(0);
        myOrders.forEach(o => {
          const ts = o.createdAt || o.timestamp;
          if (!ts) return;
          const parts = ts.split(' ');
          if (parts[1]) { const h = parseInt(parts[1].split(':')[0]); if (!isNaN(h)) hourCounts[h]++; }
        });
        const peakHours = hourCounts.map((cnt, h) => ({ h, cnt })).filter(x => x.cnt > 0);
        const maxHour = Math.max(...hourCounts, 1);

        return (
          <div className="px-4 space-y-4 pb-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1">Hoje</p>
                <p className="text-xl font-black text-green-600">Kz {todayRevenue.toFixed(0)}</p>
                <p className="text-xs text-gray-400">{todayDone.length} pedidos</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1">Total</p>
                <p className="text-xl font-black text-purple-600">Kz {allRevenue.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{done.length} pedidosconcluído</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1">pedidosmédia</p>
                <p className="text-xl font-black text-blue-600">Kz {avgOrder.toFixed(0)}</p>
                <p className="text-xs text-gray-400">ต่อpedidos</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1">Cancelar</p>
                <p className="text-xl font-black text-red-500">{cancelled.length}</p>
                <p className="text-xs text-gray-400">
                  {myOrders.length > 0 ? `${((cancelled.length / myOrders.length) * 100).toFixed(0)}%` : '0%'} do total
                </p>
              </div>
            </div>

            {/* Top items */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-1.5">
                <BarChart2 size={15} className="text-violet-500" /> Menus mais vendidos
              </h3>
              {topItems.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Ainda não existem dados</p>
              ) : topItems.map(item => (
                <div key={item.name} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500 w-24 shrink-0 truncate">{item.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
                    <div className="h-full rounded-full bg-violet-400 transition-all duration-500" style={{ width: `${(item.qty / maxQty) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-8 text-right">{item.qty}</span>
                </div>
              ))}
            </div>

            {/* Peak hours */}
            {peakHours.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-1.5">
                  <Clock size={15} className="text-blue-500" /> Horários de maior procura
                </h3>
                <div className="flex items-end gap-1 h-16">
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="flex-1 flex flex-col items-center gap-0.5">
                      <div
                        className="w-full rounded-t bg-blue-400 transition-all duration-500"
                        style={{ height: `${(hourCounts[h] / maxHour) * 52}px`, minHeight: hourCounts[h] > 0 ? 4 : 0 }}
                      />
                      {h % 6 === 0 && <span className="text-[8px] text-gray-400">{h}</span>}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-gray-400 mt-1 px-0.5">
                  <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
                </div>
              </div>
            )}

            {/* Order status breakdown */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-1.5">
                <CheckCircle size={15} className="text-green-500" /> สัดส่วนpedidos
              </h3>
              {[
                { label: 'concluído', count: done.length, color: '#22c55e' },
                { label: 'Cancelar', count: cancelled.length, color: '#ef4444' },
                { label: 'Aดำเนิน', count: myOrders.length - done.length - cancelled.length, color: '#3b82f6' },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500 w-28 shrink-0">{row.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: myOrders.length > 0 ? `${(row.count / myOrders.length) * 100}%` : '0%', backgroundColor: row.color }} />
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-8 text-right">{row.count}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Cancel Order Modal ─────────────────────────────────────────── */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="bg-violet-500 px-5 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2 text-white">
                <XCircle size={20} />
                <h3 className="font-bold text-base">ขอCancelarpedidos (aguardar Admin Aprovações)</h3>
              </div>
              <button onClick={() => setShowCancelModal(false)} className="text-white/80 hover:text-white">
                <X size={20} />
              </button>
            </div>
            {/* Body */}
            <div className="p-5">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 mb-3 flex items-start gap-2">
                <span className="text-yellow-600 mt-0.5">⚠️</span>
                <p className="text-xs text-yellow-700">O pedido de cancelamento será enviado ao <strong>Admin</strong> para aprovação. O reembolso será processado após a confirmação.</p>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                por favorindiquemotivo เพื่อให้ Admin พิจารณา
              </p>
              <div className="space-y-2 mb-4">
                {['Produto esgotado / estabelecimento fechado', 'Ingredientes indisponíveis', 'Quantidade encomendada demasiado elevada', 'Outro'].map(preset => (
                  <button
                    key={preset}
                    onClick={() => setCancelReasonInput(preset)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-all ${
                      cancelReasonInput === preset
                        ? 'bg-red-50 border-red-400 text-red-700 font-semibold'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {cancelReasonInput === preset ? '● ' : '○ '}{preset}
                  </button>
                ))}
              </div>
              <label htmlFor="merchant-cancel-reason-input" className="sr-only">Motivo adicional</label>
              <textarea
                id="merchant-cancel-reason-input"
                name="cancelReason"
                value={cancelReasonInput}
                onChange={e => setCancelReasonInput(e.target.value)}
                placeholder="หรือพิมพ์Motivo adicional..."
                className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-red-300"
                autoComplete="off"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                * หากClienteชำระผ่าน carteira ระบบจะคืนเงินให้อัตโนมัติ
              </p>
            </div>
            {/* Footer */}
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 active:scale-95 transition-all"
              >
                ไม่Cancelar
              </button>
              <button
                onClick={() => {
                  requestCancelByRole(selectedOrderToCancel, cancelReasonInput, 'merchant');
                  setShowCancelModal(false);
                }}
                disabled={!cancelReasonInput.trim()}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                  cancelReasonInput.trim()
                    ? 'bg-violet-500 text-white hover:bg-violet-600 shadow-lg shadow-orange-100'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                entregapedidoถึง Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── OrderCard component ──────────────────────────────────────────────────────
function OrderCard({ order, riders, updateOrderStatus, onCancel, highlight }) {
  const borderColor = highlight === 'orange' ? 'border-orange-400' : 'border-blue-400';
  const badgeBg = {
    pending:         'bg-yellow-100 text-yellow-800',
    preparing:       'bg-violet-100 text-orange-800',
    ready_to_pickup: 'bg-blue-100 text-blue-800',
    rider_accepted:  'bg-indigo-100 text-indigo-800',
    picking_up:      'bg-purple-100 text-purple-800',
    delivering:      'bg-cyan-100 text-cyan-800',
  };

  // Cancelarได้เฉพาะก่อนที่Estafetaจะaceitar entrega
  const canCancel = ['pending', 'preparing', 'ready_to_pickup'].includes(order.status);

  return (
    <div className={`bg-white p-4 rounded-xl shadow border-l-4 ${borderColor}`}>
      <div className="flex justify-between mb-2">
        <div>
          <span className="font-bold text-sm">#{order.id.slice(-6)}</span>
          <span className="text-xs text-gray-500 ml-2">{order.customerName}</span>
          {order.paymentMethod === 'cash' && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">💵 Cobrar numerário</span>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${badgeBg[order.status] || 'bg-gray-100 text-gray-600'}`}>
          {STATUS_LABELS[order.status]?.label || order.status}
        </span>
      </div>

      {/* รายสินค้า */}
      <div className="mb-3 text-sm bg-gray-50 rounded-lg p-2">
        {(order.items || []).map((item, idx) => (
          <div key={idx} className="flex justify-between text-xs">
            <span>{item?.qty}× {item?.name}</span>
            <span className="text-gray-500">Kz {((item?.price ?? 0) * (item?.qty ?? 0)).toFixed(0)}</span>
          </div>
        ))}
        <div className="border-t mt-1.5 pt-1.5 flex justify-between font-bold text-sm">
          <span>total</span>
          <span className="text-green-600">Kz {order.grandTotal}</span>
        </div>
      </div>

      {order.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5 mb-2 flex items-start gap-2">
          <span className="text-yellow-500 text-xs">📝</span>
          <span className="text-xs text-yellow-800 font-medium">{order.notes}</span>
        </div>
      )}

      {/* ── númeroติดต่อ ── */}
      {(order.customerPhone || order.riderId) && (
        <div className="flex flex-wrap gap-2 mb-2">
          {order.customerPhone && (
            <a
              href={`tel:${order.customerPhone}`}
              className="flex-1 min-w-[110px] bg-orange-50 text-violet-600 border border-violet-200 py-2 rounded-lg font-bold text-xs flex items-center justify-center hover:bg-violet-100 active:scale-95 transition-all"
            >
              📞 <span className="ml-1">{order.customerPhone}</span>
            </a>
          )}
          {order.riderId && (() => {
            // ใช้ riderPhone จาก order ก่อน (ฝังตอน acceptOrder) fallback หา riders array
            const phone = order.riderPhone || riders.find(r => r.id === order.riderId)?.phone;
            return phone ? (
              <a
                href={`tel:${phone}`}
                className="flex-1 min-w-[110px] bg-green-50 text-green-600 border border-green-200 py-2 rounded-lg font-bold text-xs flex items-center justify-center hover:bg-green-100 active:scale-95 transition-all"
              >
                📞 <span className="ml-1">{phone}</span>
              </a>
            ) : null;
          })()}
        </div>
      )}

      {/* ปุ่มควบคุม — Estadopedidos */}
      <div className="flex gap-2 mb-2">
        {order.status === 'pending' && (
          <button
            onClick={() => updateOrderStatus(order.id, 'preparing')}
            className="flex-1 bg-violet-500 text-white py-2 rounded-lg font-bold text-xs hover:bg-violet-600 active:scale-95 transition-all"
          >
            ✅ recolhapedidos
          </button>
        )}
        {order.status === 'preparing' && (
          <button
            onClick={() => updateOrderStatus(order.id, 'ready_to_pickup')}
            className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-bold text-xs hover:bg-blue-600 active:scale-95 transition-all"
          >
            🛵 เรียกEstafeta
          </button>
        )}
        {order.status === 'ready_to_pickup' && (
          <div className="flex-1 bg-blue-50 text-blue-600 border border-blue-200 py-2 rounded-lg font-bold text-xs flex items-center justify-center">
            ⏳ aguardarEstafetaaceitar entrega...
          </div>
        )}
        {order.status === 'rider_accepted' && (
          <div className="flex-1 bg-indigo-50 text-indigo-600 border border-indigo-200 py-2 rounded-lg font-bold text-xs flex items-center justify-center">
            🛵 EstafetaAมาrecolhacomida
          </div>
        )}
        {order.status === 'picking_up' && (
          <div className="flex-1 bg-purple-50 text-purple-700 border border-purple-200 py-2 rounded-lg font-bold text-xs flex items-center justify-center">
            🏪 Estafetaถึงestabelecimentoconcluído / aguardarrecolhacomida
          </div>
        )}
        {['delivering', 'delivered', 'completed'].includes(order.status) && (
          <div className="flex-1 bg-indigo-50 text-indigo-600 border border-indigo-200 py-2 rounded-lg font-bold text-xs flex items-center justify-center">
            🛵 EstafetaAentrega
          </div>
        )}
      </div>

      {/* ปุ่มCancelar — แสดงเฉพาะก่อนEstafetaaceitar entrega */}
      {canCancel && (
        <button
          onClick={() => onCancel(order.id)}
          className="w-full py-2 rounded-lg border border-red-300 text-red-600 bg-red-50 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-red-100 active:scale-95 transition-all"
        >
          <XCircle size={14} /> Cancelarpedidosนี้
        </button>
      )}
    </div>
  );
}
