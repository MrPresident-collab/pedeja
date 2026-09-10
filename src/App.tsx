import { useEffect, useState } from 'react';
import { Home, MapPin, Plus } from 'lucide-react';
import { BottomNav, type Tab } from '@/components/BottomNav';
import { BottomSheet } from '@/components/BottomSheet';
import { RiderBottomNav, type RiderTab } from '@/components/RiderBottomNav';
import { ToastHost } from '@/components/Toast';
import { showToast } from '@/components/toastStore';
import { SignInSheet } from '@/components/SignInSheet';
import { repositories } from '@/repositories';
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
import { CheckoutView } from '@/views/customer/CheckoutView';
import { CategoryView } from '@/views/customer/categories/CategoryView';
import { EnviarFlow } from '@/views/customer/categories/EnviarFlow';
import { DevSwitcherView } from '@/views/dev/DevSwitcherView';
import { MerchantView } from '@/views/dev/MerchantView';
import { OperationsView } from '@/views/dev/OperationsView';
import { RiderHomeView } from '@/views/estafeta/RiderHomeView';
import { RiderWalletView } from '@/views/estafeta/RiderWalletView';
import { RiderHistoryView } from '@/views/estafeta/RiderHistoryView';
import { RiderProfileView } from '@/views/estafeta/RiderProfileView';
import type { Business, Category } from '@/types';

const riderRepo: RiderRepository = createMockRiderRepository();

type CustomerScreen =
  | { name: 'splash' }
  | { name: 'welcome' }
  | { name: 'app' }
  | { name: 'marketplace' }
  | { name: 'category'; category: Category }
  | { name: 'enviar-flow' }
  | { name: 'business'; business: Business }
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
  const [screen, setScreen] = useState<CustomerScreen>({ name: 'splash' });
  const [tab, setTab] = useState<Tab>('home');
  const [showAddress, setShowAddress] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  function navigateToApp() {
    setScreen({ name: 'app' });
    setTab('home');
  }

  function handleCategory(cat: Category) {
    if (cat === 'enviar') {
      setScreen({ name: 'enviar-flow' });
    } else {
      setScreen({ name: 'category', category: cat });
    }
  }

  function handleBusiness(b: Business) {
    setScreen({ name: 'business', business: b });
  }

  function openCheckout() {
    setScreen({ name: 'checkout' });
  }

  function handleContent(topicKey: string) {
    if (topicKey === 'Contactar suporte' || topicKey === 'feedback') {
      openWhatsApp('Olá Pedejá! Quero falar com o suporte.');
      return;
    }
    setScreen({ name: 'content', topicKey });
  }

  function handleAction(label: string) {
    if (label === 'logout') {
      repositories.auth.signOut();
      setScreen({ name: 'welcome' });
      showToast('Sessão terminada.');
      return;
    }
    if (label === 'support') {
      openWhatsApp('Olá Pedejá! Preciso de ajuda.');
      return;
    }
    if (label === 'track') {
      showToast('Encontra o mapa com a localização por cima. O estafeta está a caminho.');
      return;
    }
    if (label === 'share-app') {
      if (navigator.share) {
        navigator.share({ title: 'Pedejá', text: 'A promessa que se move — pede e recebe com o Pedejá.' }).catch(() => {});
      } else {
        showToast('O Pedejá está disponível no teu navegador.');
      }
      return;
    }
    showToast('Estamos a preparar isso. Em breve!');
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
          onGuest={navigateToApp}
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
          onSend={() => setScreen({ name: 'enviar-flow' })}
        />
        <ToastHost />
      </>
    );
  }

  if (screen.name === 'enviar-flow') {
    return (
      <>
        <EnviarFlow
          onBack={() => setScreen({ name: 'app' })}
          onComplete={() => {
            setScreen({ name: 'app' });
            setTab('orders');
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
          onCart={openCheckout}
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
          onPlaced={(orderId) => {
            showToast(`Pedido ${orderId} confirmado.`);
            setScreen({ name: 'app' });
            setTab('orders');
          }}
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
            onAddress={() => setShowAddress(true)}
            onCategory={handleCategory}
            onMarketplace={() => setScreen({ name: 'marketplace' })}
          />
        )}
        {tab === 'explore' && <ExploreView onOpen={handleContent} />}
        {tab === 'orders' && <OrdersView onAction={handleAction} />}
        {tab === 'profile' && <ProfileView onAction={handleAction} />}
      </div>
      <BottomNav tab={tab} onChange={setTab} badge={1} />
      <BottomSheet
        open={showAddress}
        onClose={() => setShowAddress(false)}
        eyebrow="ENTREGAR EM"
        title="Escolhe o teu lugar"
      >
        <div className="address-current">
          <span className="address-current-icon">
            <Home size={19} />
          </span>
          <div>
            <strong>Casa</strong>
            <small>Talatona, Luanda</small>
          </div>
          <span className="address-check">✓</span>
        </div>
        <button className="add-address">
          <Plus size={18} /> Adicionar outro endereço
        </button>
        <div className="location-note">
          <MapPin size={18} />
          <span>
            <strong>Por que pedimos isto?</strong>
            <small>Para encontrar o caminho certo e entregar sem atrasos.</small>
          </span>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setShowAddress(false);
            showToast('Localização confirmada.');
          }}
        >
          Confirmar localização
        </button>
      </BottomSheet>
      <ToastHost />
    </div>
  );
}

function App() {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    function onPop() {
      setRoute(readRoute());
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (route.surface === 'dev') return <DevSwitcherView />;
  if (route.surface === 'estafeta') return <RiderApp tab={route.tab} onTabChange={(tab) => setRoute({ surface: 'estafeta', tab })} />;
  if (route.surface === 'merchant') return <MerchantView />;
  if (route.surface === 'operations') return <OperationsView />;
  return <CustomerApp />;
}

function RiderApp({ tab, onTabChange }: { tab: RiderTab; onTabChange: (tab: RiderTab) => void }) {
  function handleAction(label: string) {
    if (label === 'logout') {
      riderRepo.setOnline(false);
      window.location.href = '/';
      return;
    }
    showToast('Em breve.');
  }

  return (
    <div className="app-shell">
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
        {tab === 'perfil' && <RiderProfileView riderRepo={riderRepo} onAction={handleAction} />}
      </div>
      <RiderBottomNav tab={tab} onChange={onTabChange} />
      <ToastHost />
    </div>
  );
}

export default App;
