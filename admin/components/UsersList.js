// admin/components/UsersList.js
/**
 * Komponent listy użytkowników dla panelu administratora
 * Users list component for admin panel
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UsersList.css';
import UserBlockModal from './UserBlockModal';

const UsersList = () => {
  // Stan / State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [userToChangeRole, setUserToChangeRole] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [userToBlock, setUserToBlock] = useState(null);
  // Obsługa zmiany statusu blokady / Handle block status change
  const handleBlockStatusChange = (updatedUser) => {
    // Aktualizuj lokalną listę użytkowników
    setUsers(users.map(user => 
      user._id === updatedUser._id ? updatedUser : user
    ));
  };
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
      
      setUsers(response.data.users);
      setTotalPages(response.data.pagination.pages);
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

  // Obsługa zmiany roli / Handle role change
  const handleRoleChange = async () => {
    if (!userToChangeRole || !newRole) return;
    
    try {
      await axios.put(`/api/admin/users/${userToChangeRole._id}`, { role: newRole });
      
      // Aktualizuj lokalną listę użytkowników
      setUsers(users.map(user => 
        user._id === userToChangeRole._id ? { ...user, role: newRole } : user
      ));
      
      setShowRoleModal(false);
      setUserToChangeRole(null);
      setNewRole('');
    } catch (err) {
      console.error('Błąd podczas zmiany roli użytkownika:', err);
      setError('Wystąpił błąd podczas zmiany roli użytkownika.');
    }
  };

  // Obsługa usuwania użytkownika / Handle user deletion
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      await axios.delete(`/api/admin/users/${userToDelete._id}`);
      
      // Usuń użytkownika z lokalnej listy
      setUsers(users.filter(user => user._id !== userToDelete._id));
      
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Błąd podczas usuwania użytkownika:', err);
      setError('Wystąpił błąd podczas usuwania użytkownika.');
    }
  };

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
        <span>Ładowanie użytkowników...</span>
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
    <div className="users-list">
      <div className="list-header">
        <h2 className="section-title">Zarządzanie Użytkownikami</h2>
        
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
              <th>
                <button 
                  className="sort-button"
                  onClick={() => {
                    if (sortBy === 'role') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('role');
                      setSortOrder('asc');
                    }
                  }}
                >
                  Rola
                  {sortBy === 'role' && (
                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </button>
              </th>
              <th>
                <button 
                  className="sort-button"
                  onClick={() => {
                    if (sortBy === 'createdAt') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('createdAt');
                      setSortOrder('asc');
                    }
                  }}
                >
                  Data rejestracji
                  {sortBy === 'createdAt' && (
                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </button>
              </th>
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
                    {user.isBlocked ? (
                      <span className="block-badge blocked">
                        <i className="fas fa-ban mr-1"></i> Zablokowany
                      </span>
                    ) : (
                      <span className="block-badge active">
                        <i className="fas fa-check-circle mr-1"></i> Aktywny
                      </span>
                    )}
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td className="actions">
                    <button 
                      className="action-button view"
                      onClick={() => window.location.href = `/admin/users/${user._id}`}
                      title="Zobacz szczegóły"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    <button 
                      className="action-button edit"
                      onClick={() => {
                        setUserToChangeRole(user);
                        setNewRole(user.role);
                        setShowRoleModal(true);
                      }}
                      title="Zmień rolę"
                    >
                      <i className="fas fa-user-shield"></i>
                    </button>
                    <button 
                      className={`action-button ${user.isBlocked ? 'unblock' : 'block'}`}
                      onClick={() => {
                        setUserToBlock(user);
                        setShowBlockModal(true);
                      }}
                      title={user.isBlocked ? "Odblokuj użytkownika" : "Zablokuj użytkownika"}
                    >
                      <i className={`fas ${user.isBlocked ? 'fa-unlock' : 'fa-ban'}`}></i>
                    </button>
                    <button 
                      className="action-button delete"
                      onClick={() => {
                        setUserToDelete(user);
                        setShowDeleteModal(true);
                      }}
                      title="Usuń użytkownika"
                    >
                      <i className="fas fa-trash-alt"></i>
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
      
      {/* Modal zmiany roli / Role change modal */}
      {showRoleModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Zmiana roli użytkownika</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowRoleModal(false);
                  setUserToChangeRole(null);
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>
                Zmieniasz rolę dla użytkownika: <strong>{userToChangeRole?.email}</strong>
              </p>
              <div className="form-group">
                <label htmlFor="role">Nowa rola:</label>
                <select
                  id="role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="form-control"
                >
                  <option value="user">Użytkownik</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowRoleModal(false);
                  setUserToChangeRole(null);
                }}
              >
                Anuluj
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleRoleChange}
              >
                Zapisz zmiany
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal blokowania użytkownika / User block modal */}
      {showBlockModal && userToBlock && (
        <UserBlockModal 
          user={userToBlock}
          onClose={() => {
            setShowBlockModal(false);
            setUserToBlock(null);
          }}
          onBlockStatusChange={handleBlockStatusChange}
        />
      )}
      
      {/* Modal usuwania użytkownika / Delete user modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Usuwanie użytkownika</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>
                Czy na pewno chcesz usunąć użytkownika: <strong>{userToDelete?.email}</strong>?
              </p>
              <p className="warning">
                <i className="fas fa-exclamation-triangle"></i>
                Ta operacja jest nieodwracalna. Wszystkie dane użytkownika zostaną usunięte.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
              >
                Anuluj
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleDeleteUser}
              >
                Usuń użytkownika
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersList;
