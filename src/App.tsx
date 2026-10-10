/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { EmptyDashboard } from './components/EmptyDashboard';

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

  // If not logged in, show Login Screen (ID: admin, Password: admin)
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Once authenticated, show Clean Empty Dashboard with Gemini Chat Bot
  return <EmptyDashboard onLogout={handleLogout} />;
}
