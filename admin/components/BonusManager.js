// admin/components/BonusManager.js
/**
 * Komponent zarządzania bonusami dla panelu administratora
 * Bonus management component for admin panel
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UsersList.css'; // Użyjemy tych samych styli co dla UsersList

const BonusManager = () => {
  // Stan / State
  const [users, setUsers] = useState([]);
  const [userBonuses, setUserBonuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAddBonusModal, setShowAddBonusModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [bonusType, setBonusType] = useState('discount');
  const [bonusValue, setBonusValue] = useState('');
  const [bonusExpiry, setBonusExpiry] = useState('');
  const [bonusReason, setBonusReason] = useState('');
  const [showRemoveBonusModal, setShowRemoveBonusModal] = useState(false);
  const [bonusToRemove, setBonusToRemove] = useState(null);

  // Typy bonusów / Bonus types
  const bonusTypes = [
    { id: 'discount', name: 'Zniżka procentowa' },
    { id: 'fixed_discount', name: 'Zniżka kwotowa' },
    { id: 'free_promotion', name: 'Darmowa promocja' },
    { id: 'free_ads', name: 'Darmowe ogłoszenia' },
    { id: 'priority_display', name: 'Priorytetowe wyświetlanie' }
  ];

  // Pobierz użytkowników / Fetch users
  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm, selectedRole, sortBy, sortOrder]);

  // Funkcja pobierająca użytkowników / Function to fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const params = {
        page: currentPage,
        limit: 10,
        search: searchTerm,
        sortBy,
        sortOrder
      };
      
      if (selectedRole) {
        params.role = selectedRole;
      }
      
      const response = await axios.get('/api/admin/users', { params });
      
      const fetchedUsers = response.data.users;
      setUsers(fetchedUsers);
      setTotalPages(response.data.pagination.pages);
      
      // Pobierz bonusy dla każdego użytkownika / Fetch bonuses for each user
      const bonusesObject = {};
      for (const user of fetchedUsers) {
        try {
          const bonusesResponse = await axios.get(`/api/admin/users/${user._id}/bonuses`);
          bonusesObject[user._id] = bonusesResponse.data.bonuses || [];
        } catch (err) {
          console.error(`Błąd podczas pobierania bonusów dla użytkownika ${user._id}:`, err);
          bonusesObject[user._id] = [];
        }
      }
      
      setUserBonuses(bonusesObject);
      setLoading(false);
    } catch (err) {
      console.error('Błąd podczas pobierania użytkowników:', err);
      setError('Wystąpił błąd podczas pobierania listy użytkowników.');
      setLoading(false);
    }
  };

  // Obsługa wyszukiwania / Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset do pierwszej strony przy nowym wyszukiwaniu
  };

  // Obsługa dodawania bonusu / Handle bonus addition
  const handleAddBonus = async () => {
    if (!selectedUser || !bonusType || !bonusValue) {
      setError('Wszystkie pola są wymagane.');
      return;
    }
    
    try {
      const bonusData = {
        type: bonusType,
        value: bonusType === 'discount' || bonusType === 'fixed_discount' ? Number(bonusValue) : bonusValue,
        expiryDate: bonusExpiry || undefined,
        reason: bonusReason || undefined
      };
      
      const response = await axios.post(`/api/admin/users/${selectedUser._id}/bonuses`, bonusData);
      
      // Aktualizuj listę bonusów dla użytkownika
      setUserBonuses({
        ...userBonuses,
        [selectedUser._id]: [...(userBonuses[selectedUser._id] || []), response.data.bonus]
      });
      
      // Zamknij modal i wyczyść formularz
      setShowAddBonusModal(false);
      setBonusType('discount');
      setBonusValue('');
      setBonusExpiry('');
      setBonusReason('');
      setSelectedUser(null);
    } catch (err) {
      console.error('Błąd podczas dodawania bonusu:', err);
      setError('Wystąpił błąd podczas dodawania bonusu.');
    }
  };

  // Obsługa usuwania bonusu / Handle bonus removal
  const handleRemoveBonus = async () => {
    if (!bonusToRemove || !bonusToRemove.userId || !bonusToRemove.bonusId) return;
    
    try {
      await axios.delete(`/api/admin/users/${bonusToRemove.userId}/bonuses/${bonusToRemove.bonusId}`);
      
      // Aktualizuj listę bonusów dla użytkownika
      setUserBonuses({
        ...userBonuses,
        [bonusToRemove.userId]: (userBonuses[bonusToRemove.userId] || []).filter(
          bonus => bonus._id !== bonusToRemove.bonusId
        )
      });
      
      setShowRemoveBonusModal(false);
      setBonusToRemove(null);
    } catch (err) {
      console.error('Błąd podczas usuwania bonusu:', err);
      setError('Wystąpił błąd podczas usuwania bonusu.');
    }
  };

  // Formatowanie daty / Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Bez terminu';
    
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatowanie bonusu / Format bonus
  const formatBonus = (bonus) => {
    switch (bonus.type) {
      case 'discount':
        return `${bonus.value}% zniżki`;
      case 'fixed_discount':
        return `${bonus.value} PLN zniżki`;
      case 'free_promotion':
        return `Darmowa promocja: ${bonus.value}`;
      case 'free_ads':
        return `${bonus.value} darmowych ogłoszeń`;
      case 'priority_display':
        return `Priorytetowe wyświetlanie: ${bonus.value}`;
      default:
        return `${bonus.type}: ${bonus.value}`;
    }
  };

  // Renderowanie paginacji / Render pagination
  const renderPagination = () => {
    const pages = [];
    
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          className={`pagination-button ${currentPage === i ? 'active' : ''}`}
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </button>
      );
    }
    
    return (
      <div className="pagination">
        <button
          className="pagination-button"
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        
        {pages}
        
        <button
          className="pagination-button"
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    );
  };

  // Jeśli ładowanie / If loading
  if (loading) {
    return (
      <div className="loading">
        <i className="fas fa-spinner fa-spin"></i>
        <span>Ładowanie danych...</span>
      </div>
    );
  }

  // Jeśli błąd / If error
  if (error) {
    return (
      <div className="error">
        <i className="fas fa-exclamation-triangle"></i>
        <span>{error}</span>
        <button onClick={fetchUsers} className="btn btn-primary mt-4">
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="bonus-manager">
      <div className="list-header">
        <h2 className="section-title">Zarządzanie Bonusami</h2>
        
        <div className="filters">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Szukaj po email, imieniu lub nazwisku..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="btn btn-primary">
              <i className="fas fa-search"></i>
            </button>
          </form>
          
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setCurrentPage(1);
            }}
            className="role-filter"
          >
            <option value="">Wszystkie role</option>
            <option value="user">Użytkownicy</option>
            <option value="moderator">Moderatorzy</option>
            <option value="admin">Administratorzy</option>
          </select>
        </div>
      </div>
      
      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>
                <button 
                  className="sort-button"
                  onClick={() => {
                    if (sortBy === 'email') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('email');
                      setSortOrder('asc');
                    }
                  }}
                >
                  Email
                  {sortBy === 'email' && (
                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </button>
              </th>
              <th>
                <button 
                  className="sort-button"
                  onClick={() => {
                    if (sortBy === 'name') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('name');
                      setSortOrder('asc');
                    }
                  }}
                >
                  Imię i Nazwisko
                  {sortBy === 'name' && (
                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </button>
              </th>
              <th>Rola</th>
              <th>Aktywne bonusy</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user._id}>
                  <td>{user._id.substring(0, 8)}...</td>
                  <td>{user.email}</td>
                  <td>{user.name} {user.lastName}</td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>
                      {user.role === 'admin' ? 'Administrator' : 
                       user.role === 'moderator' ? 'Moderator' : 'Użytkownik'}
                    </span>
                  </td>
                  <td>
                    {(userBonuses[user._id] || []).length > 0 ? (
                      <div className="bonuses-list">
                        {(userBonuses[user._id] || []).map((bonus) => (
                          <div key={bonus._id} className="bonus-item">
                            <span className="bonus-name">{formatBonus(bonus)}</span>
                            <span className="bonus-expiry">
                              Wygasa: {formatDate(bonus.expiryDate)}
                            </span>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => {
                                setBonusToRemove({
                                  userId: user._id,
                                  bonusId: bonus._id,
                                  bonusName: formatBonus(bonus)
                                });
                                setShowRemoveBonusModal(true);
                              }}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="no-bonuses">Brak aktywnych bonusów</span>
                    )}
                  </td>
                  <td className="actions">
                    <button 
                      className="action-button add-bonus"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowAddBonusModal(true);
                      }}
                      title="Dodaj bonus"
                    >
                      <i className="fas fa-gift"></i>
                    </button>
                    <button 
                      className="action-button view"
                      onClick={() => window.location.href = `/admin/users/${user._id}`}
                      title="Zobacz szczegóły użytkownika"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="no-data">
                  Brak użytkowników spełniających kryteria wyszukiwania
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && renderPagination()}
      
      {/* Modal dodawania bonusu / Add bonus modal */}
      {showAddBonusModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Dodaj bonus dla użytkownika</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowAddBonusModal(false);
                  setSelectedUser(null);
                  setBonusType('discount');
                  setBonusValue('');
                  setBonusExpiry('');
                  setBonusReason('');
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>
                Dodajesz bonus dla użytkownika: <strong>{selectedUser?.email}</strong>
              </p>
              
              <div className="form-group">
                <label htmlFor="bonus-type">Typ bonusu:</label>
                <select
                  id="bonus-type"
                  value={bonusType}
                  onChange={(e) => setBonusType(e.target.value)}
                  className="form-control"
                >
                  {bonusTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="bonus-value">
                  {bonusType === 'discount' ? 'Wartość zniżki (%)' : 
                   bonusType === 'fixed_discount' ? 'Kwota zniżki (PLN)' : 
                   bonusType === 'free_ads' ? 'Liczba darmowych ogłoszeń' : 
                   'Wartość'}:
                </label>
                <input
                  type={bonusType === 'discount' || bonusType === 'fixed_discount' || bonusType === 'free_ads' ? 'number' : 'text'}
                  id="bonus-value"
                  value={bonusValue}
                  onChange={(e) => setBonusValue(e.target.value)}
                  className="form-control"
                  min={bonusType === 'discount' || bonusType === 'fixed_discount' || bonusType === 'free_ads' ? '0' : undefined}
                  step={bonusType === 'fixed_discount' ? '0.01' : undefined}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="bonus-expiry">Data wygaśnięcia (opcjonalnie):</label>
                <input
                  type="datetime-local"
                  id="bonus-expiry"
                  value={bonusExpiry}
                  onChange={(e) => setBonusExpiry(e.target.value)}
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="bonus-reason">Powód przyznania (opcjonalnie):</label>
                <textarea
                  id="bonus-reason"
                  value={bonusReason}
                  onChange={(e) => setBonusReason(e.target.value)}
                  className="form-control"
                  rows="3"
                ></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddBonusModal(false);
                  setSelectedUser(null);
                  setBonusType('discount');
                  setBonusValue('');
                  setBonusExpiry('');
                  setBonusReason('');
                }}
              >
                Anuluj
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleAddBonus}
              >
                Dodaj bonus
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal usuwania bonusu / Remove bonus modal */}
      {showRemoveBonusModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Usuwanie bonusu</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowRemoveBonusModal(false);
                  setBonusToRemove(null);
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>
                Czy na pewno chcesz usunąć bonus: <strong>{bonusToRemove?.bonusName}</strong>?
              </p>
              <p className="warning">
                <i className="fas fa-exclamation-triangle"></i>
                Ta operacja jest nieodwracalna. Bonus zostanie natychmiast usunięty.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowRemoveBonusModal(false);
                  setBonusToRemove(null);
                }}
              >
                Anuluj
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleRemoveBonus}
              >
                Usuń bonus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BonusManager;