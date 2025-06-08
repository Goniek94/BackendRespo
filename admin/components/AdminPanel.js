// admin/components/AdminPanel.js
/**
 * Główny komponent panelu administratora
 * Main admin panel component
 */

import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../examples/hooks/useAuth';

// Główny komponent panelu administratora / Main admin dashboard component
import AdminDashboard from './AdminDashboard';

// Style / Styles
import './AdminPanel.css';

const AdminPanel = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Jeśli użytkownik nie jest zalogowany lub nie ma uprawnień, przekieruj
  // If user is not logged in or doesn't have permissions, redirect
  if (!isAuthenticated || !user || user.role !== 'admin') {
    return <Navigate to="/login" />;
  }

  return (
    <Routes>
      <Route path="/*" element={<AdminDashboard />} />
    </Routes>
  );
};

export default AdminPanel;
