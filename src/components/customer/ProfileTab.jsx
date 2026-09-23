import React, { useState, useEffect } from 'react';
import {
  MapPin, ArrowDownCircle, Wallet, MessageSquare,
  ChevronRight, Repeat, LogOut, Settings, Save,
  Camera, Crosshair, Bike, ChefHat, Plus, Trash2,
  Check, Edit,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDateTimeFromMs } from '../../utils';

export default function ProfileTab() {
  const {
    userProfile,
    profileSubView, setProfileSubView,
    userRoles, userWallet, walletHistory,
    userAddresses,
    tempProfile, setTempProfile,
    withdrawMode, setWithdrawMode,
    withdrawAmount, setWithdrawAmount,
    withdrawBank, setWithdrawBank,
    withdrawAccount, setWithdrawAccount,
    withdrawName, setWithdrawName,
    setShowTopUpModal,
    merchantRegForm, setMerchantRegForm,
    riderRegForm, setRiderRegForm,
    newAddr, setNewAddr,
    handleMapLocationSelect, getCurrentLocationForForm,
    handleAddAddress, handleUpdateAddress, handleDeleteAddress,
    handleProfilePhotoChange,
    handleRegistrationPhotoSelect,
    handleSaveProfile, profileUploading,
    requestWithdraw, requestRegisterMerchant, requestRegisterRider,
    openChatWindow, handleLogout,
    isPending, syncRoles,
    setActiveRole,
    handleUpdateUserLocation,
    notifySystem,
  } = useApp();

  const [editingAddrId, setEditingAddrId] = useState(null);
  const [editAddrPinLoc, setEditAddrPinLoc] = useState(null);
  const [editAddrSaving, setEditAddrSaving] = useState(false);
  const [newAddrMode, setNewAddrMode] = useState(false);
  const [userPinLoc, setUserPinLoc] = useState(null);
  const [userPinSaving, setUserPinSaving] = useState(false);
  const [merchantSubmitting, setMerchantSubmitting] = useState(false);
  const [riderSubmitting, setRiderSubmitting] = useState(false);

  const MERCHANT_FORM_INIT = { shopName: '', category: 'Street Food', realName: '', idCard: '', phone: '', bankName: '', bankAccount: '', idCardImage: null, shopImage: null, location: null };
  const RIDER_FORM_INIT    = { realName: '', vehicle: 'Motorcycle', idCard: '', phone: '', bankName: '', bankAccount: '', idCardImage: null, profileImage: null };

  const handleClearCache = async () => {
    if (!window.confirm('Pretende limpar a cache e recarregar a aplicação?')) return;
    const cacheKeys = [
      'pedeja_orders',
      'pedeja_pending_requests',
      'pedeja_riders',
      'pedeja_restaurants',
      'pedeja_menu_items',
      'pedeja_appconfig',
      'pedeja_wallets',
      'pedeja_user_roles',
      'pedeja_chats',
      'pedeja_promo_codes',
      'pedeja_admin_notifs',
      'pedeja_admin_last_check',
      'pedeja_custom_sound',
      'pedeja_install_dismissed',
      'rider_sound_enabled',
      'rider_vibrate_enabled',
    ];
    cacheKeys.forEach(k => {
      try { localStorage.removeItem(k); } catch { void 0; }
    });
    if ('caches' in window) {
      try {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
      } catch { void 0; }
    }
    notifySystem('Cache limpa', 'A recarregar a aplicação...', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="p-4 min-h-screen pb-24">
      {profileSubView === 'main' ? (
        <>
          <div className="bg-white p-6 rounded-2xl shadow-sm mb-4 flex items-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden mr-4 relative">
              <img
                src={userProfile.image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(userProfile.name || 'User') + '&background=fb923c&color=fff&size=64'}
                alt="Profile"
                className="w-full h-full object-cover"
              />
              <div
                onClick={() => { setTempProfile({ ...userProfile }); setProfileSubView('edit_profile'); }}
                className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-white"
              >
                <Edit size={20} />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{userProfile.name}</h2>
              <div className="text-gray-500 text-sm">ID: {userProfile.id}</div>
            </div>
          </div>
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setProfileSubView('wallet')}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-500 p-4 rounded-2xl shadow-lg text-white flex justify-between items-center"
            >
              <div className="flex items-center"><carteira className="mr-2" /><span className="font-bold text-sm">Kz {userWallet.toFixed(2)}</span></div>
            </button>
            <button
              onClick={() => openChatWindow('support-' + userProfile.id, 'Suporte (Admin)', 'customer')}
              className="flex-1 bg-blue-600 p-4 rounded-2xl shadow-lg text-white flex justify-center items-center font-bold text-sm"
            >
              <MessageSquare className="mr-2" /> Contactar suporte
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 text-sm">Área de parceiros</div>
            {userRoles.includes('merchant') ? (
              <button onClick={() => setActiveRole('merchant')} className="w-full p-4 flex items-center justify-between hover:bg-green-50 border-b">
                <span className="text-green-700 font-bold">Mudar para comerciante</span><Repeat size={20} />
              </button>
            ) : isPending('merchant_reg') ? (
              <div className="p-4 text-gray-400 border-b flex items-center justify-between bg-gray-50">
                <span>Registo de comerciante (aguarda aprovação...)</span>
                <button onClick={syncRoles} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 flex items-center gap-1 ml-2">
                  <Repeat size={12} /> Verificar
                </button>
              </div>
            ) : (
              <button onClick={() => setProfileSubView('reg_merchant')} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 border-b">
                <span>Registar estabelecimento de comida</span><ChevronRight size={20} />
              </button>
            )}
            {userRoles.includes('rider') ? (
              <button onClick={() => setActiveRole('rider')} className="w-full p-4 flex items-center justify-between hover:bg-blue-50">
                <span className="text-blue-700 font-bold">Mudar para estafeta</span><Repeat size={20} />
              </button>
            ) : isPending('rider_reg') ? (
              <div className="p-4 text-gray-400 flex items-center justify-between bg-gray-50">
                <span>Registo de estafeta (aguarda aprovação...)</span>
                <button onClick={syncRoles} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 flex items-center gap-1 ml-2">
                  <Repeat size={12} /> Verificar
                </button>
              </div>
            ) : (
              <button onClick={() => setProfileSubView('reg_rider')} className="w-full p-4 flex items-center justify-between hover:bg-gray-50">
                <span>Registar como estafeta</span><ChevronRight size={20} />
              </button>
            )}
            <button onClick={handleLogout} className="w-full p-4 flex items-center justify-between hover:bg-red-50 border-t">
              <span className="text-red-600 font-bold">Terminar sessão</span><LogOut size={20} className="text-red-600" />
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => { setProfileSubView('pin_location'); setUserPinLoc(null); }}
              className="w-full p-4 flex items-center justify-between hover:bg-blue-50 border-b"
            >
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mr-3"><MapPin size={20} /></div>
                <div className="text-left">
                  <div className="font-medium">As minhas moradas</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {userProfile.location
                      ? `${userProfile.location.lat.toFixed(4)}, ${userProfile.location.lng.toFixed(4)}`
                      : 'Ainda não definida'}
                  </div>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
            <button onClick={handleClearCache} className="w-full p-4 flex items-center justify-between hover:bg-red-50 border-b">
              <div className="flex items-center">
                <div className="bg-red-50 p-2 rounded-lg text-red-500 mr-3"><Trash2 size={20} /></div>
                <span className="text-gray-800 font-medium">Limpar cache</span>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
            <button onClick={() => { setTempProfile({ ...userProfile }); setProfileSubView('edit_profile'); }} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 border-b">
              <div className="flex items-center"><div className="bg-gray-100 p-2 rounded-lg text-gray-600 mr-3"><Settings size={20} /></div><span>Definições/editar perfil</span></div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>
        </>

      ) : profileSubView === 'wallet' ? (
        <div className="p-4 pt-0 bg-white min-h-[50vh]">
          <div className="bg-gradient-to-r from-green-600 to-green-500 p-8 rounded-2xl shadow-lg text-white mb-6 text-center">
            <p className="text-green-100 mb-2">Saldo actual</p>
            <h1 className="text-4xl font-bold mb-6">Kz {userWallet.toFixed(2)}</h1>
            {!withdrawMode ? (
              <div className="grid grid-cols-3 gap-4">
                {[100, 500, 1000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => { setWithdrawAmount(amount.toString()); setShowTopUpModal(true); }}
                    className="bg-white/20 hover:bg-white/30 py-2 rounded-lg font-bold backdrop-blur-sm"
                  >
                    +Kz {amount}
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm space-y-2">
                <label htmlFor="withdraw-amount-input" className="sr-only">Indique o valor</label>
                <input id="withdraw-amount-input" name="withdrawAmount" type="number" placeholder="Indique o valor" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="w-full text-black p-2 rounded text-center font-bold" autoComplete="off" />
                <label htmlFor="withdraw-bank-input" className="sr-only">Nome do banco</label>
                <input id="withdraw-bank-input" name="withdrawBank" type="text" placeholder="Nome do banco (ex.: BFA)" value={withdrawBank} onChange={e => setWithdrawBank(e.target.value)} className="w-full text-black p-2 rounded text-sm" autoComplete="off" />
                <label htmlFor="withdraw-account-input" className="sr-only">Número da conta</label>
                <input id="withdraw-account-input" name="withdrawAccount" type="text" placeholder="Número da conta" value={withdrawAccount} onChange={e => setWithdrawAccount(e.target.value)} className="w-full text-black p-2 rounded text-sm" autoComplete="off" />
                <label htmlFor="withdraw-name-input" className="sr-only">Titular da conta</label>
                <input id="withdraw-name-input" name="withdrawName" type="text" placeholder="Titular da conta" value={withdrawName} onChange={e => setWithdrawName(e.target.value)} className="w-full text-black p-2 rounded text-sm" autoComplete="off" />
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setWithdrawMode(false)} className="flex-1 bg-gray-500 py-2 rounded font-bold">Cancelar</button>
                  <button
                    onClick={() => {
                      if (withdrawAmount > 0 && withdrawBank && withdrawAccount && withdrawName) {
                        requestWithdraw(parseFloat(withdrawAmount), { bank: withdrawBank, account: withdrawAccount, name: withdrawName });
                        setWithdrawMode(false); setWithdrawAmount(''); setWithdrawBank(''); setWithdrawAccount('');
                      } else { alert('Preencha todos os campos'); }
                    }}
                    className="flex-1 bg-white text-green-600 py-2 rounded font-bold"
                  >
                    confirmarถอน
                  </button>
                </div>
              </div>
            )}
            {!withdrawMode && (
              <button onClick={() => setWithdrawMode(true)} className="mt-4 text-sm text-green-100 underline flex items-center justify-center w-full">
                <ArrowDownCircle size={16} className="mr-1" /> Pretende levantar fundos?
              </button>
            )}
          </div>
          <h3 className="font-bold text-base mb-3 text-gray-700">Histórico de transacções</h3>
          {walletHistory.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">Ainda não existem transacções</div>
          ) : (
            <div className="space-y-2">
              {[...walletHistory].sort((a, b) => {
                const ms = (e) => e.createdAtMs || parseInt(((e.id || '').match(/\d{10,}/) || ['0'])[0], 10);
                return ms(b) - ms(a);
              }).map(tx => {
                const amt = tx.amount ?? 0;
                const isIncome = amt >= 0;
                return (
                  <div key={tx.id} className="flex justify-between items-center gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
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

      ) : profileSubView === 'pin_location' ? (
        <div className="p-4 pt-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2"><MapPin size={18} className="text-green-500" /> As minhas moradas</h3>
            <p className="text-xs text-gray-500 mb-4">Guarde casa, trabalho, escola ou outro local onde costuma receber encomendas.</p>
            <div className="space-y-3">
              {userAddresses.map(addr => (
                <div key={addr.id} className="border border-gray-200 rounded-xl p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-sm">{addr.label}</div>
                    <div className="text-xs text-gray-600 mt-1">{addr.address || 'Morada sem detalhes'}</div>
                    <div className="text-[10px] mt-1 ${addr.location ? 'text-green-600' : 'text-amber-600'}">
                      {addr.location ? 'Localização resolvida' : 'Localização por resolver — a equipa Pedejá pode tratar disso'}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteAddress(addr.id)} className="p-1.5 rounded-lg bg-red-50 text-red-500" aria-label="Remover morada"><Trash2 size={14} /></button>
                </div>
              ))}
              {userAddresses.length === 0 && <div className="text-center py-5 text-gray-400 text-xs">Ainda não existem moradas guardadas.</div>}
            </div>
            <button onClick={() => setNewAddrMode(v => !v)} className="w-full mt-4 bg-green-600 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"><Plus size={16} /> {newAddrMode ? 'Cancelar' : 'Adicionar morada'}</button>
            {newAddrMode && (
              <div className="mt-4 border border-green-200 rounded-xl p-3 bg-green-50">
                <select value={newAddr.label} onChange={e => setNewAddr({...newAddr,label:e.target.value})} className="w-full p-2 border rounded-lg text-xs bg-white mb-2">
                  <option>Casa</option><option>Trabalho</option><option>Escola</option><option>Amigo</option><option>Oficina</option><option>Escritório</option><option>Outro</option>
                </select>
                <input value={newAddr.addressLine1} onChange={e => setNewAddr({...newAddr,addressLine1:e.target.value})} placeholder="Rua / Avenida e nº" className="w-full p-2 border rounded-lg text-xs mb-2" />
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input value={newAddr.neighborhood} onChange={e => setNewAddr({...newAddr,neighborhood:e.target.value})} placeholder="Bairro" className="w-full p-2 border rounded-lg text-xs" />
                  <input value={newAddr.municipality} onChange={e => setNewAddr({...newAddr,municipality:e.target.value})} placeholder="Município" className="w-full p-2 border rounded-lg text-xs" />
                </div>
                <input value={newAddr.reference} onChange={e => setNewAddr({...newAddr,reference:e.target.value})} placeholder="Referência / ponto próximo" className="w-full p-2 border rounded-lg text-xs mb-2" />
                <button type="button" onClick={getCurrentLocationForForm} className="w-full py-2 rounded-lg bg-white border border-green-200 text-green-700 text-xs font-bold flex items-center justify-center gap-1"><Crosshair size={13} /> Usar localização actual (opcional)</button>
                <button onClick={async () => { const ok = await handleAddAddress(newAddr); if (ok) { setNewAddr({label:'Casa',addressLine1:'',addressLine2:'',neighborhood:'',municipality:'',city:'',province:'',reference:'',latitude:null,longitude:null,location:null}); setNewAddrMode(false); } }} className="w-full mt-3 bg-green-600 text-white py-2.5 rounded-xl text-xs font-bold">Guardar morada</button>
              </div>
            )}
          </div>
        </div>

      ) : profileSubView === 'edit_profile' ? (
        <div className="p-4 pt-0">
          <div className="flex justify-center mb-6">
            <label htmlFor="profile-photo-input" className="w-24 h-24 bg-gray-200 rounded-full overflow-hidden relative cursor-pointer">
              <img
                src={tempProfile.image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(tempProfile.name || 'User') + '&background=fb923c&color=fff&size=96'}
                className="w-full h-full object-cover"
                alt="profile"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                {profileUploading ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Camera />}
              </div>
              <input id="profile-photo-input" name="profileImage" type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoChange} disabled={profileUploading} />
            </label>
          </div>
          <div className="space-y-4">
            <div><label htmlFor="edit-profile-name-input" className="text-sm text-gray-500">Nome completo</label><input id="edit-profile-name-input" name="name" value={tempProfile.name} onChange={e => setTempProfile({ ...tempProfile, name: e.target.value })} className="w-full border-b py-2 outline-none font-medium text-lg" autoComplete="name" /></div>
            <div><label htmlFor="edit-profile-phone-input" className="text-sm text-gray-500">Telefone</label><input id="edit-profile-phone-input" name="phone" value={tempProfile.phone} onChange={e => setTempProfile({ ...tempProfile, phone: e.target.value })} className="w-full border-b py-2 outline-none font-medium text-lg" autoComplete="tel" /></div>
            <div><label htmlFor="edit-profile-email-input" className="text-sm text-gray-500">E-mail</label><input id="edit-profile-email-input" name="email" value={tempProfile.email} onChange={e => setTempProfile({ ...tempProfile, email: e.target.value })} className="w-full border-b py-2 outline-none font-medium text-lg" autoComplete="email" /></div>
            <button
              onClick={handleSaveProfile}
              disabled={profileUploading}
              className={`w-full bg-green-600 text-white py-3 rounded-lg font-bold mt-8 transition-opacity ${profileUploading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {profileUploading ? 'A carregar imagem...' : 'Guardar alterações'}
            </button>
          </div>
        </div>

      ) : profileSubView === 'reg_merchant' ? (
        <div className="p-4 pt-0">
          <div className="bg-orange-50 p-4 rounded-xl mb-6 text-center">
            <ChefHat size={48} className="text-orange-500 mx-auto mb-2" />
            <h2 className="text-xl font-bold text-orange-700">ลงทะเบียนComerciante (KYC)</h2>
          </div>
          <div className="space-y-4">
            <div><label htmlFor="merchant-reg-shopname" className="font-bold mb-1 block">nomeComerciante</label><input id="merchant-reg-shopname" name="shopName" value={merchantRegForm.shopName} onChange={e => setMerchantRegForm({ ...merchantRegForm, shopName: e.target.value })} className="w-full border p-2 rounded-lg" autoComplete="off" /></div>
            <div className="mb-4">
              <label htmlFor="merchant-reg-shopimage" className="text-sm mb-1 block">รูปหน้าestabelecimento (Shop Image)</label>
              <label htmlFor="merchant-reg-shopimage" className={`w-full border-2 border-dashed p-4 rounded-lg text-center cursor-pointer block ${merchantRegForm.shopImage ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300 text-gray-500'}`}>
                {merchantRegForm.shopImage ? <><Check className="inline mr-1" /> seleccionarconcluído</> : <><Camera className="inline mr-1" /> ถ่ายรูป/seleccionarรูป</>}
                <input id="merchant-reg-shopimage" name="shopImage" type="file" accept="image/*" className="hidden" onChange={e => handleRegistrationPhotoSelect(e, setMerchantRegForm, 'shopImage')} />
              </label>
              {merchantRegForm.shopImage && <img src={merchantRegForm.shopImage} className="mt-2 h-32 w-full object-cover rounded-lg" alt="shop" />}
            </div>
            <div><label htmlFor="merchant-reg-category" className="font-bold mb-1 block">หมวดหมู่</label>
              <select id="merchant-reg-category" name="category" value={merchantRegForm.category} onChange={e => setMerchantRegForm({ ...merchantRegForm, category: e.target.value })} className="w-full border p-2 rounded-lg">
                <option>Street Food</option><option>Fast Food</option><option>Japanese</option><option>Italian</option><option>Dessert</option>
              </select>
            </div>
            <div className="pt-2 border-t mt-2">
              <h4 className="font-bold text-gray-700 mb-2">dadosเจ้าของestabelecimento (confirmarตัวตน)</h4>
              <div><label htmlFor="merchant-reg-realname" className="text-sm mb-1 block">Nome completo</label><input id="merchant-reg-realname" name="realName" value={merchantRegForm.realName} onChange={e => setMerchantRegForm({ ...merchantRegForm, realName: e.target.value })} className="w-full border p-2 rounded-lg mb-2" autoComplete="name" /></div>
              <div><label htmlFor="merchant-reg-idcard" className="text-sm mb-1 block">เลขบัตรประชาชน</label><input id="merchant-reg-idcard" name="idCard" value={merchantRegForm.idCard} onChange={e => setMerchantRegForm({ ...merchantRegForm, idCard: e.target.value })} className="w-full border p-2 rounded-lg mb-2" autoComplete="off" /></div>
              <div><label htmlFor="merchant-reg-phone" className="text-sm mb-1 block">Telefone</label><input id="merchant-reg-phone" name="phone" value={merchantRegForm.phone} onChange={e => setMerchantRegForm({ ...merchantRegForm, phone: e.target.value })} className="w-full border p-2 rounded-lg mb-2" autoComplete="tel" /></div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div><label htmlFor="merchant-reg-bankname" className="text-sm mb-1 block">banco</label><input id="merchant-reg-bankname" name="bankName" value={merchantRegForm.bankName} onChange={e => setMerchantRegForm({ ...merchantRegForm, bankName: e.target.value })} className="w-full border p-2 rounded-lg" placeholder="กสิกร, ไทยพาณิชย์..." autoComplete="off" /></div>
                <div><label htmlFor="merchant-reg-bankaccount" className="text-sm mb-1 block">เลขที่บัญชี</label><input id="merchant-reg-bankaccount" name="bankAccount" value={merchantRegForm.bankAccount} onChange={e => setMerchantRegForm({ ...merchantRegForm, bankAccount: e.target.value })} className="w-full border p-2 rounded-lg" autoComplete="off" /></div>
              </div>
              <div className="mb-4">
                <label htmlFor="merchant-reg-idcardimage" className="text-sm mb-1 block">รูปถ่ายบัตรประชาชน</label>
                <label htmlFor="merchant-reg-idcardimage" className={`w-full border-2 border-dashed p-4 rounded-lg text-center cursor-pointer block ${merchantRegForm.idCardImage ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300 text-gray-500'}`}>
                  {merchantRegForm.idCardImage ? <><Check className="inline mr-1" /> seleccionarconcluído</> : <><Camera className="inline mr-1" /> ถ่ายรูป/seleccionarรูป</>}
                  <input id="merchant-reg-idcardimage" name="idCardImage" type="file" accept="image/*" className="hidden" onChange={e => handleRegistrationPhotoSelect(e, setMerchantRegForm, 'idCardImage')} />
                </label>
                {merchantRegForm.idCardImage && <img src={merchantRegForm.idCardImage} className="mt-2 h-32 w-full object-cover rounded-lg" alt="id" />}
              </div>
            </div>
            <button
              disabled={merchantSubmitting}
              onClick={async () => {
                setMerchantSubmitting(true);
                const ok = await requestRegisterMerchant(merchantRegForm);
                setMerchantSubmitting(false);
                if (ok) {
                  setMerchantRegForm(MERCHANT_FORM_INIT);
                  setProfileSubView('main');
                }
              }}
              className="w-full bg-orange-500 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              {merchantSubmitting
                ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Aentregadados...</>
                : 'entregaใบregistarComerciante'}
            </button>
          </div>
        </div>

      ) : (
        <div className="p-4 pt-0">
          <div className="bg-blue-50 p-4 rounded-xl mb-6 text-center">
            <Bike size={48} className="text-blue-500 mx-auto mb-2" />
            <h2 className="text-xl font-bold text-blue-700">Registar como estafeta (KYC)</h2>
          </div>
          <div className="space-y-4">
            <div><label htmlFor="rider-reg-realname" className="font-bold mb-1 block">Nome completo (ผู้ขับขี่)</label><input id="rider-reg-realname" name="realName" value={riderRegForm.realName} onChange={e => setRiderRegForm({ ...riderRegForm, realName: e.target.value })} className="w-full border p-2 rounded-lg" autoComplete="name" /></div>
            <div><label htmlFor="rider-reg-vehicle" className="font-bold mb-1 block">ประเภทพาหนะ</label>
              <select id="rider-reg-vehicle" name="vehicle" value={riderRegForm.vehicle} onChange={e => setRiderRegForm({ ...riderRegForm, vehicle: e.target.value })} className="w-full border p-2 rounded-lg">
                <option value="Motorcycle">รถจักรยานยนต์</option><option value="Car">รถยนต์</option>
              </select>
            </div>
            <div className="pt-2 border-t mt-2">
              <h4 className="font-bold text-gray-700 mb-2">dadosconfirmarตัวตน</h4>
              <div><label htmlFor="rider-reg-idcard" className="text-sm mb-1 block">เลขบัตรประชาชน</label><input id="rider-reg-idcard" name="idCard" value={riderRegForm.idCard} onChange={e => setRiderRegForm({ ...riderRegForm, idCard: e.target.value })} className="w-full border p-2 rounded-lg mb-2" autoComplete="off" /></div>
              <div><label htmlFor="rider-reg-phone" className="text-sm mb-1 block">Telefone</label><input id="rider-reg-phone" name="phone" value={riderRegForm.phone} onChange={e => setRiderRegForm({ ...riderRegForm, phone: e.target.value })} className="w-full border p-2 rounded-lg mb-2" autoComplete="tel" /></div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div><label htmlFor="rider-reg-bankname" className="text-sm mb-1 block">banco</label><input id="rider-reg-bankname" name="bankName" value={riderRegForm.bankName} onChange={e => setRiderRegForm({ ...riderRegForm, bankName: e.target.value })} className="w-full border p-2 rounded-lg" placeholder="กสิกร, ไทยพาณิชย์..." autoComplete="off" /></div>
                <div><label htmlFor="rider-reg-bankaccount" className="text-sm mb-1 block">เลขที่บัญชี</label><input id="rider-reg-bankaccount" name="bankAccount" value={riderRegForm.bankAccount} onChange={e => setRiderRegForm({ ...riderRegForm, bankAccount: e.target.value })} className="w-full border p-2 rounded-lg" autoComplete="off" /></div>
              </div>
              <div className="mb-2">
                <label htmlFor="rider-reg-idcardimage" className="text-sm mb-1 block">รูปถ่ายบัตรประชาชน <span className="text-red-500">*</span></label>
                <label htmlFor="rider-reg-idcardimage" className={`w-full border-2 border-dashed p-4 rounded-lg text-center cursor-pointer block ${riderRegForm.idCardImage ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300 text-gray-500'}`}>
                  {riderRegForm.idCardImage ? <><Check className="inline mr-1" /> seleccionarconcluído</> : <><Camera className="inline mr-1" /> ถ่ายรูป/seleccionarรูป</>}
                  <input id="rider-reg-idcardimage" name="idCardImage" type="file" accept="image/*" className="hidden" onChange={e => handleRegistrationPhotoSelect(e, setRiderRegForm, 'idCardImage')} />
                </label>
                {riderRegForm.idCardImage && <img src={riderRegForm.idCardImage} className="mt-2 h-32 w-full object-cover rounded-lg" alt="id" />}
              </div>
              <div className="mb-4">
                <label htmlFor="rider-reg-profileimage" className="text-sm mb-1 block">รูปโปรไฟล์estafeta (opcional)</label>
                <label htmlFor="rider-reg-profileimage" className={`w-full border-2 border-dashed p-4 rounded-lg text-center cursor-pointer block ${riderRegForm.profileImage ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300 text-gray-500'}`}>
                  {riderRegForm.profileImage ? <><Check className="inline mr-1" /> seleccionarconcluído</> : <><Camera className="inline mr-1" /> ถ่ายรูป/seleccionarรูป</>}
                  <input id="rider-reg-profileimage" name="profileImage" type="file" accept="image/*" className="hidden" onChange={e => handleRegistrationPhotoSelect(e, setRiderRegForm, 'profileImage')} />
                </label>
                {riderRegForm.profileImage && <img src={riderRegForm.profileImage} className="mt-2 h-32 w-full object-cover rounded-lg" alt="profile" />}
              </div>
            </div>
            <button
              disabled={riderSubmitting}
              onClick={async () => {
                setRiderSubmitting(true);
                const ok = await requestRegisterRider(riderRegForm);
                setRiderSubmitting(false);
                if (ok) {
                  setRiderRegForm(RIDER_FORM_INIT);
                  setProfileSubView('main');
                }
              }}
              className="w-full bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              {riderSubmitting
                ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Aentregadados...</>
                : 'entregaใบregistarestafeta'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
