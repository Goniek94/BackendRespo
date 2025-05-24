// admin/components/Dashboard/Dashboard.js
/**
 * Komponent dashboardu administratora
 * Admin dashboard component
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    usersCount: 0,
    adsCount: 0,
    commentsCount: 0,
    notificationsCount: 0
  });
  
  const [recentActivity, setRecentActivity] = useState({
    ads: [],
    users: [],
    comments: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pobierz dane dashboardu / Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/admin/dashboard/stats');
        
        setStats(response.data.stats);
        setRecentActivity(response.data.recentActivity);
        setError(null);
      } catch (err) {
        console.error('Błąd podczas pobierania danych dashboardu:', err);
        setError('Nie udało się pobrać danych dashboardu. Spróbuj odświeżyć stronę.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
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

  if (loading) {
    return (
      <div className="admin-loading">
        <i className="fas fa-spinner fa-spin"></i>
        <span>Ładowanie danych...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-alert admin-alert-danger">
        <i className="fas fa-exclamation-circle"></i>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <h1 className="admin-page-title">Dashboard</h1>
      
      {/* Statystyki / Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="stat-value">{stats.usersCount}</div>
          <div className="stat-label">Użytkownicy</div>
          <Link to="/admin/users" className="stat-link">
            Zarządzaj użytkownikami <i className="fas fa-arrow-right"></i>
          </Link>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-ad"></i>
          </div>
          <div className="stat-value">{stats.adsCount}</div>
          <div className="stat-label">Ogłoszenia</div>
          <Link to="/admin/ads" className="stat-link">
            Zarządzaj ogłoszeniami <i className="fas fa-arrow-right"></i>
          </Link>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-comments"></i>
          </div>
          <div className="stat-value">{stats.commentsCount}</div>
          <div className="stat-label">Komentarze</div>
          <Link to="/admin/comments" className="stat-link">
            Zarządzaj komentarzami <i className="fas fa-arrow-right"></i>
          </Link>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-bell"></i>
          </div>
          <div className="stat-value">{stats.notificationsCount}</div>
          <div className="stat-label">Powiadomienia</div>
        </div>
      </div>
      
      {/* Ostatnie aktywności / Recent activities */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Ostatnie ogłoszenia</h2>
          <Link to="/admin/ads" className="admin-btn admin-btn-primary admin-btn-sm">
            Zobacz wszystkie
          </Link>
        </div>
        
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tytuł</th>
                <th>Użytkownik</th>
                <th>Data</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.ads.length > 0 ? (
                recentActivity.ads.map((ad) => (
                  <tr key={ad._id}>
                    <td>{ad.title}</td>
                    <td>
                      {ad.user ? (
                        <Link to={`/admin/users/${ad.user._id}`}>
                          {ad.user.email}
                        </Link>
                      ) : 'Nieznany'}
                    </td>
                    <td>{formatDate(ad.createdAt)}</td>
                    <td>
                      <Link to={`/admin/ads/${ad._id}`} className="admin-btn admin-btn-sm admin-btn-primary">
                        <i className="fas fa-eye"></i> Szczegóły
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="admin-table-empty">
                    Brak ostatnich ogłoszeń
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Nowi użytkownicy</h2>
          <Link to="/admin/users" className="admin-btn admin-btn-primary admin-btn-sm">
            Zobacz wszystkich
          </Link>
        </div>
        
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Imię i nazwisko</th>
                <th>Rola</th>
                <th>Data rejestracji</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.users.length > 0 ? (
                recentActivity.users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.email}</td>
                    <td>{user.name} {user.lastName}</td>
                    <td>
                      <span className={`admin-badge admin-badge-${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <Link to={`/admin/users/${user._id}`} className="admin-btn admin-btn-sm admin-btn-primary">
                        <i className="fas fa-eye"></i> Szczegóły
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="admin-table-empty">
                    Brak nowych użytkowników
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Ostatnie komentarze</h2>
          <Link to="/admin/comments" className="admin-btn admin-btn-primary admin-btn-sm">
            Zobacz wszystkie
          </Link>
        </div>
        
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Treść</th>
                <th>Użytkownik</th>
                <th>Ogłoszenie</th>
                <th>Data</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.comments.length > 0 ? (
                recentActivity.comments.map((comment) => (
                  <tr key={comment._id}>
                    <td className="admin-table-content-cell">
                      {comment.content.length > 50 
                        ? `${comment.content.substring(0, 50)}...` 
                        : comment.content}
                    </td>
                    <td>
                      {comment.user ? (
                        <Link to={`/admin/users/${comment.user._id}`}>
                          {comment.user.email}
                        </Link>
                      ) : 'Nieznany'}
                    </td>
                    <td>
                      {comment.ad ? (
                        <Link to={`/admin/ads/${comment.ad._id}`}>
                          {comment.ad.title}
                        </Link>
                      ) : 'Nieznane'}
                    </td>
                    <td>{formatDate(comment.createdAt)}</td>
                    <td>
                      <Link to={`/admin/comments/${comment._id}`} className="admin-btn admin-btn-sm admin-btn-primary">
                        <i className="fas fa-eye"></i> Szczegóły
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="admin-table-empty">
                    Brak ostatnich komentarzy
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
