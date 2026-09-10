import type { ReactNode } from 'react';
import {
  Banknote,
  Bike,
  Briefcase,
  ChevronRight,
  CreditCard,
  Handshake,
  Home,
  Lock,
  MessageCircle,
  MonitorSmartphone,
  Plus,
  Scale,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
} from 'lucide-react';
import { repositories } from '@/repositories';
import type { Address } from '@/types';

type Props = { onAction: (label: string) => void };

export function ProfileView({ onAction }: Props) {
  const profile = repositories.profile.getProfile();
  const addresses = repositories.location.listAddresses();
  return (
    <main className="page inner-page profile-page">
      <header className="inner-header">
        <p className="eyebrow">PERFIL</p>
        <h1>Olá, {profile.name.split(' ')[0]}.</h1>
        <p>A tua conta, os teus lugares e a tua participação.</p>
      </header>

      <div className="profile-identity">
        <span className="profile-avatar">{profile.initials}</span>
        <div>
          <strong>{profile.name}</strong>
          <small>
            {profile.phone} · desde {profile.memberSince}
          </small>
        </div>
        <button>
          <ChevronRight size={18} />
        </button>
      </div>

      <ProfileGroup title="Conta">
        <ProfileLink icon={<UserRound />} title="Nome, telefone e email" detail={profile.email} onClick={() => onAction('personal')} />
      </ProfileGroup>

      <ProfileGroup title="Endereços">
        {addresses.map((address: Address) => (
          <ProfileLink
            key={address.id}
            icon={address.label === 'Casa' ? <Home /> : <Briefcase />}
            title={address.label}
            detail={address.line}
            badge={address.current ? 'Atual' : undefined}
            onClick={() => onAction('addresses')}
          />
        ))}
        <ProfileLink icon={<Plus />} title="Adicionar endereço" onClick={() => onAction('addresses')} />
      </ProfileGroup>

      <ProfileGroup title="Pagamentos">
        <ProfileLink icon={<Banknote />} title="Dinheiro" detail="Pagar em dinheiro à entrega" onClick={() => onAction('payments')} />
        <ProfileLink icon={<CreditCard />} title="Multicaixa" detail="Cartão Multicaixa ou transferência" onClick={() => onAction('payments')} />
      </ProfileGroup>

      <ProfileGroup title="Participação">
        <ProfileLink icon={<Bike />} title="Tornar-se Estafeta" detail="Entrega e ganha com o Pedejá" onClick={() => onAction('become-rider')} />
        <ProfileLink icon={<Handshake />} title="Tornar-se Parceiro" detail="Unir-te à rede Pedejá" onClick={() => onAction('become-partner')} />
        <ProfileLink icon={<Store />} title="Registar negócio" detail="Restaurante, comerciante ou loja" onClick={() => onAction('register-business')} />
      </ProfileGroup>

      <ProfileGroup title="Segurança">
        <ProfileLink icon={<ShieldCheck />} title="Segurança da conta" detail="Palavra-passe e verificações" onClick={() => onAction('security')} />
        <ProfileLink icon={<MonitorSmartphone />} title="Sessões ativas" detail="Dispositivos com sessão iniciada" onClick={() => onAction('sessions')} />
        <ProfileLink icon={<Lock />} title="Controlos da conta" detail="Privacidade e preferências" onClick={() => onAction('account-controls')} />
      </ProfileGroup>

      <ProfileGroup title="Informação">
        <ProfileLink icon={<ScrollText />} title="Termos de uso" onClick={() => onAction('terms')} />
        <ProfileLink icon={<Scale />} title="Política de privacidade" onClick={() => onAction('privacy')} />
      </ProfileGroup>

      <button className="support-link" onClick={() => onAction('support')}>
        <MessageCircle size={18} /> Precisas de ajuda? Fala connosco <ChevronRight size={17} />
      </button>

      <button className="share-app" onClick={() => onAction('share-app')}>
        <Sparkles size={18} /> Partilhar o Pedejá com alguém <ChevronRight size={17} />
      </button>

      <button className="logout-button" onClick={() => onAction('logout')}>
        Terminar sessão
      </button>

      <p className="profile-footer">
        Pedejá · A promessa que se move
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
      {badge && <span className="profile-badge">{badge}</span>}
      <ChevronRight size={17} />
    </button>
  );
}