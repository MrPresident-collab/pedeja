import { useWalletActions } from './useWalletActions';

export function usecarteiraActions(deps) {
  const wallet = useWalletActions({
    ...deps,
    userWallet: deps.usercarteira,
    setUserWallet: deps.setUsercarteira,
    setWalletAllEntries: deps.setcarteiraAllEntries,
    setGlobalWallets: deps.setGlobalcarteiras,
  });

  return {
    creditcarteira: wallet.creditWallet,
    creditcarteiraLocal: wallet.creditWalletLocal,
    processTransaction: wallet.processTransaction,
    requestTopUp: wallet.requestTopUp,
    requestWithdraw: wallet.requestWithdraw,
    adminAdjustcarteira: wallet.adminAdjustWallet,
  };
}
