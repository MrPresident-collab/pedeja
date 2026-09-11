import type { ReactNode } from 'react';
import {
  Banknote,
  Bell,
  Briefcase,
  ChevronRight,
  CreditCard,
  Home,
  MapPin,
  MessageCircle,
  MonitorSmartphone,
  Plus,
  Scale,
  ScrollText,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { repositories } from '@/repositories';
import type { Address, PaymentMethod } from '@/types';

type Props = { onAction: (label: string) => void };

const appearanceLabels: Record<string, string> = {
  auto: 'Automático',
  light: 'Claro',
  dark: 'Escuro',
};

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12) return `+${digits.slice(0, 3)} ••• ••• •••`;
  if (digits.length === 9) return `+244 ••• ••• •••`;
  return phone;
}

function addressIcon(label: string) {
  if (label === 'Casa') return <Home size={17} />;
  if (label === 'Trabalho') return <Briefcase size={17} />;
  return <MapPin size={17} />;
}

export function ProfileView({ onAction }: Props) {
  const profile = repositories.profile.getProfile();
  const addresses = repositories.location.listAddresses();
  const defaultPayment: PaymentMethod = repositories.payment.getDefaultMethod();
  const appearance = repositories.settings.getAppearance();

  return (
    <main className="page inner-page profile-page">
      <header className="inner-header">
        <p className="eyebrow">PERFIL</p>
        <h1>Perfil</h1>
        <p>Gerir as definições da tua conta.</p>
      </header>

      <div className="profile-identity">
        <span className="profile-avatar">{profile.initials}</span>
        <div>
          <strong>{profile.name}</strong>
          <small>{maskPhone(profile.phone)} · Desde {profile.memberSince}</small>
        </div>
      </div>

      <ProfileGroup title="Conta">
        <ProfileLink icon={<UserRound />} title="Dados pessoais" detail={profile.name} onClick={() => onAction('personal')} />
      </ProfileGroup>

      <ProfileGroup title="Endereços">
        {addresses.map((address: Address) => (
          <ProfileLink
            key={address.id}
            icon={addressIcon(address.label)}
            title={address.label}
            detail={address.line}
            badge={address.current ? 'Predefinida' : undefined}
            onClick={() => onAction('addresses')}
          />
        ))}
        <ProfileLink icon={<Plus />} title="Adicionar endereço" onClick={() => onAction('addresses')} />
      </ProfileGroup>

      <ProfileGroup title="Métodos de pagamento">
        <ProfileLink
          icon={<Banknote />}
          title="Dinheiro"
          detail="Pagar em dinheiro à entrega"
          badge={defaultPayment === 'cash' ? 'Predefinido' : undefined}
          onClick={() => onAction('payments')}
        />
        <ProfileLink
          icon={<CreditCard />}
          title="Multicaixa"
          detail="Cartão Multicaixa ou transferência"
          badge={defaultPayment === 'multicaixa' ? 'Predefinido' : undefined}
          onClick={() => onAction('payments')}
        />
        <div className="profile-link disabled">
          <span className="profile-link-icon"><ShoppingBag size={17} /></span>
          <span>
            <strong>Adicionar método em breve</strong>
          </span>
          <small>Em breve</small>
        </div>
      </ProfileGroup>

      <ProfileGroup title="Preferências">
        <ProfileLink icon={<Bell />} title="Notificações" detail="Pedidos, segurança e promoções" onClick={() => onAction('notifications')} />
        <ProfileLink
          icon={<MonitorSmartphone />}
          title="Aparência"
          detail={appearanceLabels[appearance] ?? 'Automático'}
          onClick={() => onAction('appearance')}
        />
      </ProfileGroup>

      <ProfileGroup title="Informação">
        <ProfileLink icon={<Scale />} title="Política de privacidade" onClick={() => onAction('privacy')} />
        <ProfileLink icon={<ScrollText />} title="Termos de utilização" onClick={() => onAction('terms')} />
        <ProfileLink icon={<SlidersHorizontal />} title="Permissões" detail="Acesso do dispositivo" onClick={() => onAction('permissions')} />
        <ProfileLink icon={<Sparkles />} title="Partilhar e ganhar" detail="Convida amigas e amigos" onClick={() => onAction('share-and-earn')} />
        <ProfileLink icon={<MessageCircle />} title="Contactar-nos" detail="Fala connosco pelo WhatsApp" onClick={() => onAction('support')} />
      </ProfileGroup>

      <button className="logout-button" onClick={() => onAction('logout')}>
        Terminar sessão
      </button>

      <p className="profile-footer">
        Pedejá.: A promessa que se move
        <br />
        Versão 1.0.0
      </p>

      <div className="danger-zone">
        <button className="danger-button" onClick={() => onAction('delete-account')}>
          Eliminar conta
        </button>
      </div>
    </main>
  );
}

function ProfileGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="profile-group">
      <p className="eyebrow">{title}</p>
      <div className="profile-links">{children}</div>
    </section>
  );
}

function ProfileLink({
  icon,
  title,
  detail,
  badge,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  detail?: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button className="profile-link" onClick={onClick}>
      <span className="profile-link-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        {detail && <small>{detail}</small>}
      </span>
      {badge && <span className="chip chip-purple">{badge}</span>}
      <ChevronRight size={17} />
    </button>
  );
}