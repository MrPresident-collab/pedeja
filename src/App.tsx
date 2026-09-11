import { useEffect, useState } from 'react';
import { BottomNav, type Tab } from '@/components/BottomNav';
import { BottomSheet } from '@/components/BottomSheet';
import { AddressSheet } from '@/components/address/AddressSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PersonalDataSheet } from '@/components/account/PersonalDataSheet';
import { PaymentsSheet } from '@/components/account/PaymentsSheet';
import { NotificationsSheet } from '@/components/account/NotificationsSheet';
import { AppearanceSheet } from '@/components/account/AppearanceSheet';
import { PermissionsSheet } from '@/components/account/PermissionsSheet';
import { DeleteAccountDialog } from '@/components/account/DeleteAccountDialog';
import { RiderBottomNav, type RiderTab } from '@/components/RiderBottomNav';
import { ToastHost } from '@/components/Toast';
import { showToast } from '@/components/toastStore';
import { SignInSheet } from '@/components/SignInSheet';
import { repositories } from '@/repositories';
import { useAuth } from '@/auth/useAuth';
import { SessionGate } from '@/auth/SessionGate';
import { useResolvedDark } from '@/hooks/useAppearance';
import { createMockRiderRepository } from '@/repositories/riderMock';
import type { RiderRepository } from '@/repositories/riderTypes';
import { HomeView } from '@/views/customer/HomeView';
import { MarketplaceView } from '@/views/customer/MarketplaceView';
import { ExploreView } from '@/views/customer/ExploreView';
import { OrdersView } from '@/views/customer/OrdersView';
import { ProfileView } from '@/views/customer/ProfileView';
import { SplashView } from '@/views/customer/SplashView';
import { WelcomeView } from '@/views/customer/WelcomeView';
import { ContentView } from '@/views/customer/ContentView';
import { BusinessView } from '@/views/customer/BusinessView';
import { CartView } from '@/views/customer/CartView';
import { CheckoutView } from '@/views/customer/CheckoutView';
import { CategoryView } from '@/views/customer/categories/CategoryView';
import { EnviarView } from '@/views/customer/enviar/EnviarView';
import { ParcelCreatedView } from '@/views/customer/enviar/ParcelCreatedView';
import { ParcelTrackingView } from '@/views/customer/enviar/ParcelTrackingView';
import { DevSwitcherView } from '@/views/dev/DevSwitcherView';
import { OperationsLayout, type OpsSection } from '@/views/operations/OperationsLayout';
import { OpsOverview } from '@/views/operations/OpsOverview';
import { OpsPedidos } from '@/views/operations/OpsPedidos';
import { OpsRiders } from '@/views/operations/OpsRiders';
import { OpsReceita } from '@/views/operations/OpsReceita';
import { OpsClientes } from '@/views/operations/OpsClientes';
import { OpsRelatorios } from '@/views/operations/OpsRelatorios';
import { OpsConfig } from '@/views/operations/OpsConfig';
import { createMockOperationsRepository } from '@/repositories/operationsMock';
import type { OperationsRepository } from '@/repositories/operationsTypes';
import { MerchantLayout, type MerchantSection } from '@/views/merchant/MerchantLayout';
import { MerchantPedidos } from '@/views/merchant/MerchantPedidos';
import { MerchantCardapio } from '@/views/merchant/MerchantCardapio';
import { MerchantRelatorios } from '@/views/merchant/MerchantRelatorios';
import { MerchantConfig } from '@/views/merchant/MerchantConfig';
import { createMockMerchantRepository } from '@/repositories/merchantMock';
import type { MerchantRepository } from '@/repositories/merchantTypes';
import { RiderHomeView } from '@/views/estafeta/RiderHomeView';
import { RiderWalletView } from '@/views/estafeta/RiderWalletView';
import { RiderHistoryView } from '@/views/estafeta/RiderHistoryView';
import { RiderProfileView } from '@/views/estafeta/RiderProfileView';
import type { Business, Category } from '@/types';

const riderRepo: RiderRepository = createMockRiderRepository();
const merchantRepo: MerchantRepository = createMockMerchantRepository();
const opsRepo: OperationsRepository = createMockOperationsRepository();

type CustomerScreen =
  | { name: 'splash' }
  | { name: 'welcome' }
  | { name: 'app' }
  | { name: 'marketplace' }
  | { name: 'category'; category: Category }
  | { name: 'enviar' }
  | { name: 'parcel-success'; orderId: string }
  | { name: 'parcel-tracking'; orderId: string }
  | { name: 'business'; business: Business }
  | { name: 'cart' }
  | { name: 'checkout' }
  | { name: 'content'; topicKey: string };

type Route =
  | { surface: 'dev' }
  | { surface: 'customer'; screen: CustomerScreen }
  | { surface: 'estafeta'; tab: RiderTab }
  | { surface: 'merchant' }
  | { surface: 'operations' };

function readRoute(): Route {
  const path = window.location.pathname;
  if (path === '/estafeta') return { surface: 'estafeta', tab: 'inicio' };
  if (path === '/merchant') return { surface: 'merchant' };
  if (path === '/operations') return { surface: 'operations' };
  if (path === '/customer') return { surface: 'customer', screen: { name: 'splash' } };
  return { surface: 'dev' };
}

function openWhatsApp(text: string) {
  window.open(`https://wa.me/244900000000?text=${encodeURIComponent(text)}`, '_blank');
}

function CustomerApp() {
  const auth = useAuth();
  const [screen, setScreen] = useState<CustomerScreen>({ name: 'splash' });
  const [tab, setTab] = useState<Tab>('home');
  const [showAddress, setShowAddress] = useState(false);
  const [showAddressMode, setShowAddressMode] = useState<'picker' | 'manage'>('picker');
  const [showPersonal, setShowPersonal] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [profileTick, setProfileTick] = useState(0);
  const [, bumpAppearance] = useState(0);
  const defaultAddress = repositories.location.getDefaultAddress();

  const appearanceMode = repositories.settings.getAppearance();
  const resolvedDark = useResolvedDark(appearanceMode);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.appearance = resolvedDark ? 'dark' : 'light';
    return () => {
      delete root.dataset.appearance;
    };
  }, [resolvedDark]);

  function navigateToApp() {
    setScreen({ name: 'app' });
    setTab('home');
  }

  function handleGuest() {
    if (!auth.isDemo && !auth.user) {
      setShowSignIn(true);
      return;
    }
    navigateToApp();
  }

  function handleCategory(cat: Category) {
    if (cat === 'enviar') {
      setScreen({ name: 'enviar' });
    } else {
      setScreen({ name: 'category', category: cat });
    }
  }

  function handleBusiness(b: Business) {
    setScreen({ name: 'business', business: b });
  }

  function openCheckout() {
    if (!auth.user) {
      setShowSignIn(true);
      showToast('Entra para finalizar a compra.');
      return;
    }
    setScreen({ name: 'checkout' });
  }

  function handleContent(topicKey: string) {
    if (topicKey === 'Contactar suporte' || topicKey === 'feedback') {
      openWhatsApp('Olá Pedejá! Quero falar com o suporte.');
      return;
    }
    setScreen({ name: 'content', topicKey });
  }

  function confirmLogout() {
    setShowLogoutConfirm(false);
    void auth.signOut();
    setScreen({ name: 'welcome' });
    showToast('Sessão terminada.');
  }

  function handleAction(label: string, orderId?: string) {
    switch (label) {
      case 'logout':
        setShowLogoutConfirm(true);
        return;
      case 'support':
        openWhatsApp('Olá Pedejá! Preciso de ajuda.');
        return;
      case 'track':
        showToast('Encontra o mapa com a localização por cima. O estafeta está a caminho.');
        return;
      case 'trackParcel':
        if (orderId) {
          setScreen({ name: 'parcel-tracking', orderId });
        }
        return;
      case 'addresses':
        setShowAddressMode('manage');
        setShowAddress(true);
        return;
      case 'personal':
        setShowPersonal(true);
        return;
      case 'payments':
        setShowPayments(true);
        return;
      case 'notifications':
        setShowNotifications(true);
        return;
      case 'appearance':
        setShowAppearance(true);
        return;
      case 'permissions':
        setShowPermissions(true);
        return;
      case 'privacy':
        setScreen({ name: 'content', topicKey: 'Política de Privacidade' });
        return;
      case 'terms':
        setScreen({ name: 'content', topicKey: 'Termos de Uso' });
        return;
      case 'delete-account':
        setShowDelete(true);
        return;
      case 'share-and-earn':
      case 'share-app':
        if (navigator.share) {
          navigator.share({ title: 'Pedejá', text: 'A promessa que se move — pede e recebe com o Pedejá.' }).catch(() => {});
        } else {
          showToast('O Pedejá está disponível no teu navegador.');
        }
        return;
      default:
        showToast('Estamos a preparar isso. Em breve!');
        return;
    }
  }

  if (screen.name === 'splash') {
    return (
      <>
        <SplashView onNext={() => setScreen({ name: 'welcome' })} />
        <ToastHost />
      </>
    );
  }

  if (screen.name === 'welcome') {
    return (
      <>
        <WelcomeView
          onEnter={() => setShowSignIn(true)}
          onCreate={() => setShowSignIn(true)}
          onGuest={handleGuest}
          demoMode={auth.isDemo}
        />
        <BottomSheet
          open={showSignIn}
          onClose={() => setShowSignIn(false)}
          eyebrow="PEDEJÁ"
          title="Como queres começar?"
        >
          <SignInSheet onClose={() => setShowSignIn(false)} onSuccess={navigateToApp} />
        </BottomSheet>
        <ToastHost />
      </>
    );
  }

  if (screen.name === 'marketplace') {
    return (
      <>
        <MarketplaceView
          onBack={() => setScreen({ name: 'app' })}
          onBusiness={handleBusiness}
        />
        <ToastHost />
      </>
    );
  }

  if (screen.name === 'category') {
    return (
      <>
        <CategoryView
          category={screen.category}
          onBack={() => setScreen({ name: 'app' })}
          onBusiness={handleBusiness}
        />
        <ToastHost />
      </>
    );
  }

  if (screen.name === 'enviar') {
    return (
      <>
        <EnviarView
          onBack={() => setScreen({ name: 'app' })}
          onComplete={(orderId) => setScreen({ name: 'parcel-success', orderId })}
        />
        <ToastHost />
      </>
    );
  }

  if (screen.name === 'parcel-success') {
    return (
      <>
        <ParcelCreatedView
          orderId={screen.orderId}
          onTrack={() => setScreen({ name: 'parcel-tracking', orderId: screen.orderId })}
          onDone={() => {
            setScreen({ name: 'app' });
            setTab('orders');
          }}
        />
        <ToastHost />
      </>
    );
  }

  if (screen.name === 'parcel-tracking') {
    return (
      <>
        <ParcelTrackingView
          orderId={screen.orderId}
          onBack={() => {
            setScreen({ name: 'app' });
            setTab('orders');
          }}
          onCancelled={(orderId) => {
            setScreen({ name: 'parcel-tracking', orderId });
          }}
        />
        <ToastHost />
      </>
    );
  }

  if (screen.name === 'business') {
    return (
      <>
        <BusinessView
          business={screen.business}
          onBack={() => setScreen({ name: 'app' })}
          onCart={() => setScreen({ name: 'cart' })}
        />
        <ToastHost />
      </>
    );
  }

  if (screen.name === 'cart') {
    const cartBusiness = repositories.cart.getBusiness();
    return (
      <>
        <CartView
          business={cartBusiness}
          onBack={() =>
            cartBusiness
              ? setScreen({ name: 'business', business: cartBusiness })
              : setScreen({ name: 'app' })
          }
          onCheckout={openCheckout}
        />
        <ToastHost />
      </>
    );
  }

  if (screen.name === 'checkout') {
    const business = repositories.cart.getBusiness();
    return (
      <>
        <CheckoutView
          onBack={() =>
            business
              ? setScreen({ name: 'business', business })
              : setScreen({ name: 'app' })
          }
          address={defaultAddress}
          onChangeAddress={() => {
            setShowAddressMode('picker');
            setShowAddress(true);
          }}
          onPlaced={(orderId) => {
            showToast(`Pedido ${orderId} confirmado.`);
            setScreen({ name: 'app' });
            setTab('orders');
          }}
        />
        <AddressSheet
          open={showAddress}
          onClose={() => setShowAddress(false)}
          onChanged={() => {}}
          confirmLabel="Escolher"
        />
        <ToastHost />
      </>
    );
  }

  if (screen.name === 'content') {
    return (
      <>
        <ContentView
          topicKey={screen.topicKey}
          onBack={() => setScreen({ name: 'app' })}
          onSupport={() => openWhatsApp('Olá Pedejá! Quero falar com o suporte.')}
        />
        <ToastHost />
      </>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-frame">
        {tab === 'home' && (
          <HomeView
            onAddress={() => {
              setShowAddressMode('picker');
              setShowAddress(true);
            }}
            onCategory={handleCategory}
            onMarketplace={() => setScreen({ name: 'marketplace' })}
            defaultAddress={defaultAddress}
          />
        )}
        {tab === 'explore' && <ExploreView onOpen={handleContent} />}
        {tab === 'orders' && <OrdersView onAction={handleAction} />}
        {tab === 'profile' && <ProfileView key={profileTick} onAction={handleAction} />}
      </div>
      <BottomNav tab={tab} onChange={setTab} badge={1} />
      <AddressSheet
        open={showAddress}
        onClose={() => setShowAddress(false)}
        onChanged={() => {}}
        closeOnSelect={showAddressMode === 'picker'}
        confirmLabel={showAddressMode === 'picker' ? 'Confirmar localização' : 'Fechar'}
      />
      <PersonalDataSheet
        open={showPersonal}
        onClose={() => setShowPersonal(false)}
        onChanged={() => setProfileTick((t) => t + 1)}
        onSupport={() => openWhatsApp('Olá Pedejá! Quero atualizar os meus dados pessoais.')}
      />
      <PaymentsSheet open={showPayments} onClose={() => setShowPayments(false)} />
      <NotificationsSheet open={showNotifications} onClose={() => setShowNotifications(false)} />
      <AppearanceSheet open={showAppearance} onClose={() => setShowAppearance(false)} onChanged={() => bumpAppearance((t) => t + 1)} />
      <PermissionsSheet open={showPermissions} onClose={() => setShowPermissions(false)} />
      <DeleteAccountDialog open={showDelete} onClose={() => setShowDelete(false)} />
      <ConfirmDialog
        open={showLogoutConfirm}
        title="Terminar sessão?"
        message="Vais voltar ao início. Tens a certeza?"
        confirmLabel="Terminar sessão"
        tone="primary"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
      <ToastHost />
    </div>
  );
}

function App() {
  const auth = useAuth();
  const [route, setRoute] = useState<Route>(readRoute);

  const protectedSurface = route.surface === 'estafeta' || route.surface === 'merchant';
  const requireIdentity = !auth.isDemo && !auth.user && protectedSurface;
  const renderSurface = requireIdentity ? ('customer' as const) : route.surface;

  useEffect(() => {
    function onPop() {
      setRoute(readRoute());
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!requireIdentity) return;
    window.history.replaceState(null, '', '/customer');
  }, [requireIdentity]);

  if (auth.status === 'loading') return <SessionGate />;
  if (auth.status === 'error') {
    return <SessionGate error={auth.error ?? 'Não foi possível verificar a sessão.'} onRetry={auth.retry} />;
  }
  if (renderSurface === 'dev') return <DevSwitcherView />;
  if (renderSurface === 'estafeta' && route.surface === 'estafeta') {
    return <RiderApp tab={route.tab} onTabChange={(tab) => setRoute({ surface: 'estafeta', tab })} />;
  }
  if (renderSurface === 'merchant') return <MerchantApp />;
  if (renderSurface === 'operations') return <OpsApp />;
  return <CustomerApp />;
}

function OpsApp() {
  const [section, setSection] = useState<OpsSection>('overview');

  return (
    <OperationsLayout repo={opsRepo} section={section} onSection={setSection}>
      {section === 'overview' && <OpsOverview repo={opsRepo} onSection={setSection} />}
      {section === 'pedidos' && <OpsPedidos repo={opsRepo} />}
      {section === 'entregadores' && <OpsRiders repo={opsRepo} onOrders={() => setSection('pedidos')} />}
      {section === 'receita' && <OpsReceita repo={opsRepo} />}
      {section === 'clientes' && <OpsClientes repo={opsRepo} onOrders={() => setSection('pedidos')} />}
      {section === 'relatorios' && <OpsRelatorios repo={opsRepo} />}
      {section === 'config' && <OpsConfig repo={opsRepo} />}
    </OperationsLayout>
  );
}

function MerchantApp() {
  const [section, setSection] = useState<MerchantSection>('pedidos');

  function handleSignOut() {
    merchantRepo.signOut();
  }

  return (
    <MerchantLayout repo={merchantRepo} section={section} onSection={setSection}>
      {section === 'pedidos' && <MerchantPedidos repo={merchantRepo} />}
      {section === 'cardapio' && <MerchantCardapio repo={merchantRepo} />}
      {section === 'relatorios' && <MerchantRelatorios repo={merchantRepo} />}
      {section === 'config' && <MerchantConfig repo={merchantRepo} onSignOut={handleSignOut} />}
    </MerchantLayout>
  );
}

function RiderApp({ tab, onTabChange }: { tab: RiderTab; onTabChange: (tab: RiderTab) => void }) {
  const [, setThemeTick] = useState(0);
  const isDark = riderRepo.isDarkTheme();

  function handleAction(label: string) {
    if (label === 'logout') {
      riderRepo.setOnline(false);
      window.location.href = '/';
      return;
    }
    showToast('Em breve.');
  }

  function handleThemeChange() {
    setThemeTick((t) => t + 1);
  }

  return (
    <div className={`app-shell ${isDark ? 'rider-dark' : ''}`}>
      <div className="app-frame">
        {tab === 'inicio' && (
          <RiderHomeView
            riderRepo={riderRepo}
            onChat={(name) => { showToast(`A abrir chat com ${name}...`); }}
            onSupport={() => showToast('Suporte Pedeja. Em breve.')}
          />
        )}
        {tab === 'carteira' && <RiderWalletView riderRepo={riderRepo} />}
        {tab === 'historico' && <RiderHistoryView riderRepo={riderRepo} />}
        {tab === 'perfil' && <RiderProfileView riderRepo={riderRepo} onAction={handleAction} onThemeChange={handleThemeChange} />}
      </div>
      <RiderBottomNav tab={tab} onChange={onTabChange} />
      <ToastHost />
    </div>
  );
}

export default App;
