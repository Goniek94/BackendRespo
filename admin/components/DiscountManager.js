// admin/components/DiscountManager.js
/**
 * Komponent zarządzania zniżkami dla panelu administratora
 * Discount management component for admin panel
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DiscountManager.css';

const DiscountManager = () => {
  // Stan / State
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minDiscount, setMinDiscount] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showAddDiscountModal, setShowAddDiscountModal] = useState(false);
  const [showBulkDiscountModal, setShowBulkDiscountModal] = useState(false);
  const [showCategoryDiscountModal, setShowCategoryDiscountModal] = useState(false);
  const [showUserDiscountModal, setShowUserDiscountModal] = useState(false);
  const [selectedAds, setSelectedAds] = useState([]);
  const [discountValue, setDiscountValue] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryForDiscount, setSelectedCategoryForDiscount] = useState('');

  // Pobierz zniżki / Fetch discounts
  useEffect(() => {
    fetchDiscounts();
    fetchUsers();
    fetchCategories();
  }, [currentPage, searchTerm, selectedCategory, minDiscount, maxDiscount, sortBy, sortOrder]);

  // Funkcja pobierająca zniżki / Function to fetch discounts
  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      
      const params = {
        page: currentPage,
        limit: 10,
        search: searchTerm,
        sortBy,
        sortOrder
      };
      
      if (selectedCategory) {
        params.category = selectedCategory;
      }
      
      if (minDiscount) {
        params.minDiscount = minDiscount;
      }
      
      if (maxDiscount) {
        params.maxDiscount = maxDiscount;
      }
      
      const response = await axios.get('/api/admin/discounts', { params });
      
      setDiscounts(response.data.ads);
      setTotalPages(response.data.pagination.pages);
      setLoading(false);
    } catch (err) {
      console.error('Błąd podczas pobierania zniżek:', err);
      setError('Wystąpił błąd podczas pobierania listy zniżek.');
      setLoading(false);
    }
  };

  // Funkcja pobierająca użytkowników / Function to fetch users
  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users', { 
        params: { 
          limit: 100,
          sortBy: 'email',
          sortOrder: 'asc'
        } 
      });
      setUsers(response.data.users);
    } catch (err) {
      console.error('Błąd podczas pobierania użytkowników:', err);
    }
  };

  // Funkcja pobierająca kategorie / Function to fetch categories
  const fetchCategories = async () => {
    try {
      // Zakładamy, że mamy endpoint zwracający kategorie
      // Jeśli nie, można użyć statycznej listy
      const response = await axios.get('/api/categories');
      setCategories(response.data);
    } catch (err) {
      console.error('Błąd podczas pobierania kategorii:', err);
      // Fallback do statycznych kategorii
      setCategories([
        { id: 'sedan', name: 'Sedan' },
        { id: 'suv', name: 'SUV' },
        { id: 'hatchback', name: 'Hatchback' },
        { id: 'kombi', name: 'Kombi' },
        { id: 'coupe', name: 'Coupe' },
        { id: 'kabriolet', name: 'Kabriolet' },
        { id: 'van', name: 'Van' }
      ]);
    }
  };

  // Obsługa wyszukiwania / Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset do pierwszej strony przy nowym wyszukiwaniu
  };

  // Obsługa dodawania zniżki dla pojedynczego ogłoszenia / Handle adding discount for single ad
  const handleAddDiscount = async (adId) => {
    if (!discountValue || discountValue < 0 || discountValue > 99) {
      setError('Nieprawidłowa wartość zniżki. Podaj wartość od 0 do 99.');
      return;
    }
    
    try {
      await axios.put(`/api/admin/ads/${adId}/discount`, { discount: Number(discountValue) });
      
      // Aktualizuj lokalną listę zniżek
      setDiscounts(discounts.map(ad => 
        ad._id === adId ? { ...ad, discount: Number(discountValue) } : ad
      ));
      
      setShowAddDiscountModal(false);
      setDiscountValue('');
    } catch (err) {
      console.error('Błąd podczas dodawania zniżki:', err);
      setError('Wystąpił błąd podczas dodawania zniżki.');
    }
  };

  // Obsługa dodawania zniżki dla wielu ogłoszeń / Handle adding discount for multiple ads
  const handleBulkDiscount = async () => {
    if (!discountValue || discountValue < 0 || discountValue > 99) {
      setError('Nieprawidłowa wartość zniżki. Podaj wartość od 0 do 99.');
      return;
    }
    
    if (selectedAds.length === 0) {
      setError('Nie wybrano żadnych ogłoszeń.');
      return;
    }
    
    try {
      await axios.post('/api/admin/discounts/bulk', { 
        adIds: selectedAds,
        discount: Number(discountValue)
      });
      
      // Aktualizuj lokalną listę zniżek
      setDiscounts(discounts.map(ad => 
        selectedAds.includes(ad._id) ? { ...ad, discount: Number(discountValue) } : ad
      ));
      
      setShowBulkDiscountModal(false);
      setDiscountValue('');
      setSelectedAds([]);
    } catch (err) {
      console.error('Błąd podczas dodawania zniżek:', err);
      setError('Wystąpił błąd podczas dodawania zniżek.');
    }
  };

  // Obsługa dodawania zniżki dla kategorii / Handle adding discount for category
  const handleCategoryDiscount = async () => {
    if (!discountValue || discountValue < 0 || discountValue > 99) {
      setError('Nieprawidłowa wartość zniżki. Podaj wartość od 0 do 99.');
      return;
    }
    
    if (!selectedCategoryForDiscount) {
      setError('Nie wybrano kategorii.');
      return;
    }
    
    try {
      await axios.put(`/api/admin/categories/${selectedCategoryForDiscount}/discounts`, { 
        discount: Number(discountValue)
      });
      
      // Odśwież listę zniżek
      fetchDiscounts();
      
      setShowCategoryDiscountModal(false);
      setDiscountValue('');
      setSelectedCategoryForDiscount('');
    } catch (err) {
      console.error('Błąd podczas dodawania zniżek dla kategorii:', err);
      setError('Wystąpił błąd podczas dodawania zniżek dla kategorii.');
    }
  };

  // Obsługa dodawania zniżki dla użytkownika / Handle adding discount for user
  const handleUserDiscount = async () => {
    if (!discountValue || discountValue < 0 || discountValue > 99) {
      setError('Nieprawidłowa wartość zniżki. Podaj wartość od 0 do 99.');
      return;
    }
    
    if (!selectedUser) {
      setError('Nie wybrano użytkownika.');
      return;
    }
    
    try {
      await axios.put(`/api/admin/users/${selectedUser}/discounts`, { 
        discount: Number(discountValue)
      });
      
      // Odśwież listę zniżek
      fetchDiscounts();
      
      setShowUserDiscountModal(false);
      setDiscountValue('');
      setSelectedUser('');
    } catch (err) {
      console.error('Błąd podczas dodawania zniżek dla użytkownika:', err);
      setError('Wystąpił błąd podczas dodawania zniżek dla użytkownika.');
    }
  };

  // Obsługa zaznaczania ogłoszeń / Handle ad selection
  const handleAdSelection = (adId) => {
    if (selectedAds.includes(adId)) {
      setSelectedAds(selectedAds.filter(id => id !== adId));
    } else {
      setSelectedAds([...selectedAds, adId]);
    }
  };

  // Obsługa zaznaczania wszystkich ogłoszeń / Handle select all ads
  const handleSelectAllAds = () => {
    if (selectedAds.length === discounts.length) {
      setSelectedAds([]);
    } else {
      setSelectedAds(discounts.map(ad => ad._id));
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

  // Formatowanie ceny / Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    }).format(price);
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
        <span>Ładowanie zniżek...</span>
      </div>
    );
  }

  // Jeśli błąd / If error
  if (error) {
    return (
      <div className="error">
        <i className="fas fa-exclamation-triangle"></i>
        <span>{error}</span>
        <button onClick={fetchDiscounts} className="btn btn-primary mt-4">
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="discount-manager">
      <div className="list-header">
        <h2 className="section-title">Zarządzanie Zniżkami</h2>
        
        <div className="action-buttons">
          <button 
            className="btn btn-primary"
            onClick={() => setShowBulkDiscountModal(true)}
          >
            <i className="fas fa-percent"></i> Dodaj zniżkę dla wielu ogłoszeń
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowCategoryDiscountModal(true)}
          >
            <i className="fas fa-tags"></i> Dodaj zniżkę dla kategorii
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowUserDiscountModal(true)}
          >
            <i className="fas fa-user-tag"></i> Dodaj zniżkę dla użytkownika
          </button>
        </div>
      </div>
      
      <div className="filters">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Szukaj po tytule lub opisie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn btn-primary">
            <i className="fas fa-search"></i>
          </button>
        </form>
        
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setCurrentPage(1);
          }}
          className="category-filter"
        >
          <option value="">Wszystkie kategorie</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        
        <div className="discount-range">
          <input
            type="number"
            placeholder="Min %"
            value={minDiscount}
            onChange={(e) => {
              setMinDiscount(e.target.value);
              setCurrentPage(1);
            }}
            className="discount-input"
            min="0"
            max="99"
          />
          <span>-</span>
          <input
            type="number"
            placeholder="Max %"
            value={maxDiscount}
            onChange={(e) => {
              setMaxDiscount(e.target.value);
              setCurrentPage(1);
            }}
            className="discount-input"
            min="0"
            max="99"
          />
        </div>
      </div>
      
      <div className="table-container">
        <table className="discounts-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedAds.length === discounts.length && discounts.length > 0}
                  onChange={handleSelectAllAds}
                />
              </th>
              <th>
                <button 
                  className="sort-button"
                  onClick={() => {
                    if (sortBy === 'title') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('title');
                      setSortOrder('asc');
                    }
                  }}
                >
                  Tytuł
                  {sortBy === 'title' && (
                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </button>
              </th>
              <th>
                <button 
                  className="sort-button"
                  onClick={() => {
                    if (sortBy === 'price') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('price');
                      setSortOrder('asc');
                    }
                  }}
                >
                  Cena
                  {sortBy === 'price' && (
                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </button>
              </th>
              <th>
                <button 
                  className="sort-button"
                  onClick={() => {
                    if (sortBy === 'discount') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('discount');
                      setSortOrder('asc');
                    }
                  }}
                >
                  Zniżka
                  {sortBy === 'discount' && (
                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </button>
              </th>
              <th>Cena po zniżce</th>
              <th>Użytkownik</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {discounts.length > 0 ? (
              discounts.map((ad) => (
                <tr key={ad._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedAds.includes(ad._id)}
                      onChange={() => handleAdSelection(ad._id)}
                    />
                  </td>
                  <td>{ad.title}</td>
                  <td>{formatPrice(ad.price)}</td>
                  <td>
                    <span className="discount-badge">
                      {ad.discount}%
                    </span>
                  </td>
                  <td>{ad.discountedPrice ? formatPrice(ad.discountedPrice) : '-'}</td>
                  <td>
                    {ad.user ? (
                      <a href={`/admin/users/${ad.user._id}`}>
                        {ad.user.email}
                      </a>
                    ) : 'Nieznany'}
                  </td>
                  <td className="actions">
                    <button 
                      className="action-button view"
                      onClick={() => window.location.href = `/admin/ads/${ad._id}`}
                      title="Zobacz szczegóły"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    <button 
                      className="action-button edit"
                      onClick={() => {
                        setDiscountValue(ad.discount || '');
                        setShowAddDiscountModal(true);
                      }}
                      title="Edytuj zniżkę"
                    >
                      <i className="fas fa-percent"></i>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">
                  Brak ogłoszeń ze zniżkami spełniających kryteria wyszukiwania
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && renderPagination()}
      
      {/* Modal dodawania zniżki dla pojedynczego ogłoszenia / Add discount modal */}
      {showAddDiscountModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Dodaj zniżkę</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowAddDiscountModal(false);
                  setDiscountValue('');
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="discount">Wartość zniżki (%):</label>
                <input
                  type="number"
                  id="discount"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="form-control"
                  min="0"
                  max="99"
                />
                <small className="form-text">
                  Podaj wartość od 0 do 99%. Wartość 0 usuwa zniżkę.
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddDiscountModal(false);
                  setDiscountValue('');
                }}
              >
                Anuluj
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => handleAddDiscount(discounts.find(ad => ad._id === selectedAds[0])?._id)}
              >
                Zapisz zniżkę
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal dodawania zniżki dla wielu ogłoszeń / Bulk discount modal */}
      {showBulkDiscountModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Dodaj zniżkę dla wielu ogłoszeń</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowBulkDiscountModal(false);
                  setDiscountValue('');
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>
                Wybrano {selectedAds.length} ogłoszeń.
              </p>
              <div className="form-group">
                <label htmlFor="bulk-discount">Wartość zniżki (%):</label>
                <input
                  type="number"
                  id="bulk-discount"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="form-control"
                  min="0"
                  max="99"
                />
                <small className="form-text">
                  Podaj wartość od 0 do 99%. Wartość 0 usuwa zniżkę.
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowBulkDiscountModal(false);
                  setDiscountValue('');
                }}
              >
                Anuluj
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleBulkDiscount}
              >
                Zapisz zniżkę
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal dodawania zniżki dla kategorii / Category discount modal */}
      {showCategoryDiscountModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Dodaj zniżkę dla kategorii</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowCategoryDiscountModal(false);
                  setDiscountValue('');
                  setSelectedCategoryForDiscount('');
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="category">Kategoria:</label>
                <select
                  id="category"
                  value={selectedCategoryForDiscount}
                  onChange={(e) => setSelectedCategoryForDiscount(e.target.value)}
                  className="form-control"
                >
                  <option value="">Wybierz kategorię</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="category-discount">Wartość zniżki (%):</label>
                <input
                  type="number"
                  id="category-discount"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="form-control"
                  min="0"
                  max="99"
                />
                <small className="form-text">
                  Podaj wartość od 0 do 99%. Wartość 0 usuwa zniżkę.
                </small>
              </div>
              <div className="alert alert-warning">
                <i className="fas fa-exclamation-triangle"></i>
                Uwaga: Ta operacja zastosuje zniżkę do wszystkich ogłoszeń w wybranej kategorii.
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowCategoryDiscountModal(false);
                  setDiscountValue('');
                  setSelectedCategoryForDiscount('');
                }}
              >
                Anuluj
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCategoryDiscount}
              >
                Zapisz zniżkę
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal dodawania zniżki dla użytkownika / User discount modal */}
      {showUserDiscountModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Dodaj zniżkę dla użytkownika</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowUserDiscountModal(false);
                  setDiscountValue('');
                  setSelectedUser('');
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="user">Użytkownik:</label>
                <select
                  id="user"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="form-control"
                >
                  <option value="">Wybierz użytkownika</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.email} ({user.name} {user.lastName})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="user-discount">Wartość zniżki (%):</label>
                <input
                  type="number"
                  id="user-discount"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="form-control"
                  min="0"
                  max="99"
                />
                <small className="form-text">
                  Podaj wartość od 0 do 99%. Wartość 0 usuwa zniżkę.
                </small>
              </div>
              <div className="alert alert-warning">
                <i className="fas fa-exclamation-triangle"></i>
                Uwaga: Ta operacja zastosuje zniżkę do wszystkich ogłoszeń wybranego użytkownika.
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowUserDiscountModal(false);
                  setDiscountValue('');
                  setSelectedUser('');
                }}
              >
                Anuluj
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleUserDiscount}
              >
                Zapisz zniżkę
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountManager;
