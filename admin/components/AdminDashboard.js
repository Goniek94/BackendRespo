// admin/components/AdminDashboard.js
/**
 * Główny komponent dashboardu administratora
 * Main admin dashboard component
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

// Komponenty / Components
import StatCard from './StatCard';
import UsersList from './UsersList';
import AdsList from './AdsList';
import DiscountManager from './DiscountManager';
import BonusManager from './BonusManager';

const AdminDashboard = () => {
  // Stan / State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    usersCount: 0,
    adsCount: 0,
    commentsCount: 0,
    reportsCount: 0,
    discountsCount: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Pobierz dane użytkownika i statystyki / Fetch user data and statistics
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Pobierz dane użytkownika / Fetch user data
        const userResponse = await axios.get('/api/users/profile');
        setUser(userResponse.data);
        
        // Pobierz statystyki / Fetch statistics
        const statsResponse = await axios.get('/api/admin/dashboard/stats');
        setStats(statsResponse.data.stats);
        setRecentActivity(statsResponse.data.recentActivity);
        
        setLoading(false);
      } catch (err) {
        console.error('Błąd podczas pobierania danych:', err);
        setError('Wystąpił błąd podczas ładowania danych. Spróbuj odświeżyć stronę.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Formatowanie daty / Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Renderowanie zawartości zakładki / Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="dashboard-content">
            <h2 className="section-title">Statystyki</h2>
            <div className="stats-grid">
              <StatCard 
                title="Użytkownicy" 
                value={stats.usersCount} 
                icon="fas fa-users" 
                color="blue"
                link="/admin/users"
              />
              <StatCard 
                title="Ogłoszenia" 
                value={stats.adsCount} 
                icon="fas fa-ad" 
                color="green"
                link="/admin/ads"
              />
              <StatCard 
                title="Komentarze" 
                value={stats.commentsCount} 
                icon="fas fa-comments" 
                color="orange"
                link="/admin/comments"
              />
              <StatCard 
                title="Zgłoszenia" 
                value={stats.reportsCount} 
                icon="fas fa-flag" 
                color="red"
                link="/admin/reports"
              />
              <StatCard 
                title="Aktywne zniżki" 
                value={stats.discountsCount} 
                icon="fas fa-percent" 
                color="purple"
                link="/admin/discounts"
              />
            </div>
            
            <h2 className="section-title mt-6">Ostatnia aktywność</h2>
            <div className="activity-list">
              {recentActivity.ads && recentActivity.ads.length > 0 ? (
                <div className="activity-section">
                  <h3 className="activity-title">Nowe ogłoszenia</h3>
                  <ul className="activity-items">
                    {recentActivity.ads.map((ad) => (
                      <li key={ad._id} className="activity-item">
                        <div className="activity-icon">
                          <i className="fas fa-ad"></i>
                        </div>
                        <div className="activity-details">
                          <div className="activity-title">{ad.title}</div>
                          <div className="activity-meta">
                            <span className="activity-user">{ad.user?.email || 'Nieznany'}</span>
                            <span className="activity-date">{formatDate(ad.createdAt)}</span>
                          </div>
                        </div>
                        <div className="activity-actions">
                          <a href={`/admin/ads/${ad._id}`} className="btn btn-sm btn-primary">
                            <i className="fas fa-eye"></i>
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="no-data">Brak nowych ogłoszeń</p>
              )}
              
              {recentActivity.users && recentActivity.users.length > 0 ? (
                <div className="activity-section">
                  <h3 className="activity-title">Nowi użytkownicy</h3>
                  <ul className="activity-items">
                    {recentActivity.users.map((user) => (
                      <li key={user._id} className="activity-item">
                        <div className="activity-icon">
                          <i className="fas fa-user"></i>
                        </div>
                        <div className="activity-details">
                          <div className="activity-title">{user.email}</div>
                          <div className="activity-meta">
                            <span className="activity-user">{user.name} {user.lastName}</span>
                            <span className="activity-date">{formatDate(user.createdAt)}</span>
                          </div>
                        </div>
                        <div className="activity-actions">
                          <a href={`/admin/users/${user._id}`} className="btn btn-sm btn-primary">
                            <i className="fas fa-eye"></i>
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="no-data">Brak nowych użytkowników</p>
              )}
            </div>
          </div>
        );
      case 'users':
        return <UsersList />;
      case 'ads':
        return <AdsList />;
      case 'discounts':
        return <DiscountManager />;
      case 'bonuses':
        return <BonusManager />;
      default:
        return <div>Wybierz sekcję z menu</div>;
    }
  };

  // Jeśli ładowanie / If loading
  if (loading) {
    return (
      <div className="admin-loading">
        <i className="fas fa-spinner fa-spin"></i>
        <span>Ładowanie panelu administratora...</span>
      </div>
    );
  }

  // Jeśli błąd / If error
  if (error) {
    return (
      <div className="admin-error">
        <i className="fas fa-exclamation-triangle"></i>
        <span>{error}</span>
        <button onClick={() => window.location.reload()} className="btn btn-primary mt-4">
          Odśwież stronę
        </button>
      </div>
    );
  }

  // Jeśli użytkownik nie jest administratorem / If user is not admin
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return (
      <div className="admin-error">
        <i className="fas fa-lock"></i>
        <span>Brak dostępu do panelu administratora</span>
        <a href="/" className="btn btn-primary mt-4">
          Wróć do strony głównej
        </a>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Nagłówek / Header */}
      <header className="admin-header">
        <div className="header-brand">
          <h1>Panel Administratora</h1>
        </div>
        <div className="header-user">
          <div className="user-info">
            <span className="user-name">{user.name} {user.lastName}</span>
            <span className="user-role">{user.role === 'admin' ? 'Administrator' : 'Moderator'}</span>
          </div>
          <div className="user-avatar">
            <i className="fas fa-user-circle"></i>
          </div>
        </div>
      </header>

      <div className="admin-container">
        {/* Menu boczne / Sidebar */}
        <aside className="admin-sidebar">
          <nav className="sidebar-nav">
            <ul>
              <li className={activeTab === 'dashboard' ? 'active' : ''}>
                <button onClick={() => setActiveTab('dashboard')}>
                  <i className="fas fa-tachometer-alt"></i>
                  <span>Dashboard</span>
                </button>
              </li>
              <li className={activeTab === 'users' ? 'active' : ''}>
                <button onClick={() => setActiveTab('users')}>
                  <i className="fas fa-users"></i>
                  <span>Użytkownicy</span>
                </button>
              </li>
              <li className={activeTab === 'ads' ? 'active' : ''}>
                <button onClick={() => setActiveTab('ads')}>
                  <i className="fas fa-ad"></i>
                  <span>Ogłoszenia</span>
                </button>
              </li>
              <li className={activeTab === 'discounts' ? 'active' : ''}>
                <button onClick={() => setActiveTab('discounts')}>
                  <i className="fas fa-percent"></i>
                  <span>Zniżki</span>
                </button>
              </li>
              <li className={activeTab === 'bonuses' ? 'active' : ''}>
                <button onClick={() => setActiveTab('bonuses')}>
                  <i className="fas fa-gift"></i>
                  <span>Bonusy</span>
                </button>
              </li>
              <li className="separator"></li>
              <li>
                <a href="/" className="external-link">
                  <i className="fas fa-home"></i>
                  <span>Strona główna</span>
                </a>
              </li>
              <li>
                <button onClick={() => window.location.href = '/logout'} className="logout-button">
                  <i className="fas fa-sign-out-alt"></i>
                  <span>Wyloguj</span>
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Główna zawartość / Main content */}
        <main className="admin-main">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
