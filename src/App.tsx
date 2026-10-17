/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { EmptyDashboard } from './components/EmptyDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return sessionStorage.getItem('corrugation_user');
  });

  const handleLoginSuccess = (userId: string) => {
    sessionStorage.setItem('corrugation_user', userId);
    setCurrentUser(userId);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('corrugation_user');
    setCurrentUser(null);
  };

  return (
    <ErrorBoundary>
      {!currentUser ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <EmptyDashboard onLogout={handleLogout} />
      )}
    </ErrorBoundary>
  );
}
