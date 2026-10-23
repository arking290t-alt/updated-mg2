/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { EmptyDashboard } from './components/EmptyDashboard';
import { FactoryFloorDashboard } from './components/FactoryFloorDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return sessionStorage.getItem('corrugation_user');
    }
    return null;
  });

  const handleLoginSuccess = (userId: string) => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem('corrugation_user', userId);
    }
    setCurrentUser(userId);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem('corrugation_user');
    }
    setCurrentUser(null);
  };

  return (
    <ErrorBoundary>
      {!currentUser ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : currentUser === 'factory' ? (
        <FactoryFloorDashboard onLogout={handleLogout} />
      ) : (
        <EmptyDashboard onLogout={handleLogout} currentUserId={currentUser} />
      )}
    </ErrorBoundary>
  );
}
