import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import ToastContainer from '../components/ToastContainer';
import BottomNav from '../components/customer/BottomNav';
import HomeTab from '../components/customer/HomeTab';
import ActivityTab from '../components/customer/ActivityTab';
import ProfileTab from '../components/customer/ProfileTab';
import TopUpModal from '../components/customer/TopUpModal';
import RatingModal from '../components/customer/RatingModal';

export default function CustomerView() {
  const { t } = useTranslation();
  const {
    activeTab,
    profileSubView, setProfileSubView,
    toasts, removeToast,
    userProfile,
    selectedRestaurant,
    showTopUpModal,
    forceRefresh,
  } = useApp();


  const handleRefresh = async () => {
    await forceRefresh();
  };

  return (
    <div className="pb-20 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white transition-colors duration-200">
      <ToastContainer toasts={toasts} removeToast={removeToast} />





      {activeTab === 'home' && (
        <HomeTab />
      )}
      {activeTab === 'orders' && <ActivityTab domain="orders" />}
      {activeTab === 'packages' && <ActivityTab domain="packages" />}
      {activeTab === 'profile' && <ProfileTab />}

      <BottomNav />
      {showTopUpModal && <TopUpModal />}
      <RatingModal />
    </div>
  );
}
