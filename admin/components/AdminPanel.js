// admin/components/AdminPanel.js
/**
 * Główny komponent panelu administratora
 * Main admin panel component
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../src/contexts/AuthContext';
import axios from 'axios';

// Komponenty panelu administratora / Admin panel components
import Dashboard from './Dashboard/Dashboard';
import UserManagement from './UserManagement/UserManagement';
import UserDetails from './UserManagement/UserDetails';
import AdManagement from './AdManagement/AdManagement';
import AdDetails from './AdManagement/AdDetails';
import CommentManagement from './CommentManagement/CommentManagement';
import CommentDetails from './CommentManagement/CommentDetails';
import ReportManagement from './ReportManagement/ReportManagement';
import ReportDetails from './ReportManagement/ReportDetails';

// Style / Styles
import './AdminPanel.css';

const AdminPanel = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sprawdź uprawnienia użytkownika / Check user permissions
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  // Obsługa wylogowania / Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Przełączanie sekcji / Toggle section
  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  // Przełączanie widoczności sidebar / Toggle sidebar visibility
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Jeśli użytkownik nie jest zalogowany lub nie ma uprawnień, przekieruj / If user is not logged in or doesn't have permissions, redirect
  if (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="admin-panel">
      {/* Nagłówek / Header */}
      <header className="admin-header">
        <div className="header-left">
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            <i className="fas fa-bars"></i>
          </button>
          <h1>Panel Administratora</h1>
        </div>
        <div className="header-right">
          <span className="user-info">
            <i className="fas fa-user"></i>
            {user.name} {user.lastName} ({user.role})
          </span>
          <button className="logout-button" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Wyloguj
          </button>
        </div>
      </header>

      <div className="admin-content">
        {/* Sidebar / Sidebar */}
        <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            <ul>
              <li className={activeSection === 'dashboard' ? 'active' : ''}>
                <Link to="/admin" onClick={() => handleSectionChange('dashboard')}>
                  <i className="fas fa-tachometer-alt"></i> Dashboard
                </Link>
              </li>
              <li className={activeSection === 'users' ? 'active' : ''}>
                <Link to="/admin/users" onClick={() => handleSectionChange('users')}>
                  <i className="fas fa-users"></i> Użytkownicy
                </Link>
              </li>
              <li className={activeSection === 'ads' ? 'active' : ''}>
                <Link to="/admin/ads" onClick={() => handleSectionChange('ads')}>
                  <i className="fas fa-ad"></i> Ogłoszenia
                </Link>
              </li>
              <li className={activeSection === 'comments' ? 'active' : ''}>
                <Link to="/admin/comments" onClick={() => handleSectionChange('comments')}>
                  <i className="fas fa-comments"></i> Komentarze
                </Link>
              </li>
              <li className={activeSection === 'reports' ? 'active' : ''}>
                <Link to="/admin/reports" onClick={() => handleSectionChange('reports')}>
                  <i className="fas fa-flag"></i> Zgłoszenia
                </Link>
              </li>
              {/* Dodatkowe opcje tylko dla administratora / Additional options only for admin */}
              {user.role === 'admin' && (
                <>
                  <li className="separator">Ustawienia administratora</li>
                  <li className={activeSection === 'settings' ? 'active' : ''}>
                    <Link to="/admin/settings" onClick={() => handleSectionChange('settings')}>
                      <i className="fas fa-cog"></i> Ustawienia
                    </Link>
                  </li>
                  <li className={activeSection === 'permissions' ? 'active' : ''}>
                    <Link to="/admin/permissions" onClick={() => handleSectionChange('permissions')}>
                      <i className="fas fa-user-shield"></i> Uprawnienia
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </aside>

        {/* Główna zawartość / Main content */}
        <main className={`admin-main ${sidebarOpen ? '' : 'full-width'}`}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/users/:userId" element={<UserDetails />} />
            <Route path="/ads" element={<AdManagement />} />
            <Route path="/ads/:adId" element={<AdDetails />} />
            <Route path="/comments" element={<CommentManagement />} />
            <Route path="/comments/:commentId" element={<CommentDetails />} />
            <Route path="/reports" element={<ReportManagement />} />
            <Route path="/reports/:reportId" element={<ReportDetails />} />
            {/* Dodatkowe trasy tylko dla administratora / Additional routes only for admin */}
            {user.role === 'admin' && (
              <>
                <Route path="/settings" element={<div>Ustawienia</div>} />
                <Route path="/permissions" element={<div>Uprawnienia</div>} />
              </>
            )}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
