// admin/components/AdsList.js
/**
 * Komponent listy ogłoszeń dla panelu administratora
 * Ads list component for admin panel
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UsersList.css'; // Użyjemy tych samych styli co dla UsersList

const AdsList = () => {
  // Stan / State
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [adToDelete, setAdToDelete] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [adToChangeStatus, setAdToChangeStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [categories, setCategories] = useState([]);

  // Pobierz ogłoszenia / Fetch ads
  useEffect(() => {
    fetchAds();
    fetchCategories();
  }, [currentPage, searchTerm, selectedCategory, minPrice, maxPrice, sortBy, sortOrder]);

  // Funkcja pobierająca ogłoszenia / Function to fetch ads
  const fetchAds = async () => {
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
      
      if (minPrice) {
        params.minPrice = minPrice;
      }
      
      if (maxPrice) {
        params.maxPrice = maxPrice;
      }
      
      const response = await axios.get('/api/admin/ads', { params });
      
      setAds(response.data.ads);
      setTotalPages(response.data.pagination.pages);
      setLoading(false);
    } catch (err) {
      console.error('Błąd podczas pobierania ogłoszeń:', err);
      setError('Wystąpił błąd podczas pobierania listy ogłoszeń.');
      setLoading(false);
    }
  };

  // Funkcja pobierająca kategorie / Function to fetch categories
  const fetchCategories = async () => {
    try {
      // Zakładamy, że mamy endpoint zwracający kategorie
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

  // Obsługa zmiany statusu ogłoszenia / Handle ad status change
  const handleStatusChange = async () => {
    if (!adToChangeStatus || !newStatus) return;
    
    try {
      await axios.put(`/api/admin/ads/${adToChangeStatus._id}`, { status: newStatus });
      
      // Aktualizuj lokalną listę ogłoszeń
      setAds(ads.map(ad => 
        ad._id === adToChangeStatus._id ? { ...ad, status: newStatus } : ad
      ));
      
      setShowStatusModal(false);
      setAdToChangeStatus(null);
      setNewStatus('');
    } catch (err) {
      console.error('Błąd podczas zmiany statusu ogłoszenia:', err);
      setError('Wystąpił błąd podczas zmiany statusu ogłoszenia.');
    }
  };

  // Obsługa usuwania ogłoszenia / Handle ad deletion
  const handleDeleteAd = async () => {
    if (!adToDelete) return;
    
    try {
      await axios.delete(`/api/admin/ads/${adToDelete._id}`);
      
      // Usuń ogłoszenie z lokalnej listy
      setAds(ads.filter(ad => ad._id !== adToDelete._id));
      
      setShowDeleteModal(false);
      setAdToDelete(null);
    } catch (err) {
      console.error('Błąd podczas usuwania ogłoszenia:', err);
      setError('Wystąpił błąd podczas usuwania ogłoszenia.');
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
        <span>Ładowanie ogłoszeń...</span>
      </div>
    );
  }

  // Jeśli błąd / If error
  if (error) {
    return (
      <div className="error">
        <i className="fas fa-exclamation-triangle"></i>
        <span>{error}</span>
        <button onClick={fetchAds} className="btn btn-primary mt-4">
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="ads-list">
      <div className="list-header">
        <h2 className="section-title">Zarządzanie Ogłoszeniami</h2>
        
        <div className="filters">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Szukaj po tytule, opisie..."
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
          
          <div className="price-range">
            <input
              type="number"
              placeholder="Min cena"
              value={minPrice}
              onChange={(e) => {
                setMinPrice(e.target.value);
                setCurrentPage(1);
              }}
              className="price-input"
              min="0"
            />
            <span>-</span>
            <input
              type="number"
              placeholder="Max cena"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(e.target.value);
                setCurrentPage(1);
              }}
              className="price-input"
              min="0"
            />
          </div>
        </div>
      </div>
      
      <div className="table-container">
        <table className="ads-table">
          <thead>
            <tr>
              <th>ID</th>
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
                    if (sortBy === 'status') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('status');
                      setSortOrder('asc');
                    }
                  }}
                >
                  Status
                  {sortBy === 'status' && (
                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </button>
              </th>
              <th>Kategoria</th>
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
                  Data dodania
                  {sortBy === 'createdAt' && (
                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </button>
              </th>
              <th>Autor</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {ads.length > 0 ? (
              ads.map((ad) => (
                <tr key={ad._id}>
                  <td>{ad._id.substring(0, 8)}...</td>
                  <td>{ad.title}</td>
                  <td>{formatPrice(ad.price)}</td>
                  <td>
                    <span className={`status-badge status-${ad.status}`}>
                      {ad.status === 'active' ? 'Aktywne' : 
                       ad.status === 'pending' ? 'Oczekujące' : 
                       ad.status === 'rejected' ? 'Odrzucone' : 
                       ad.status === 'sold' ? 'Sprzedane' : 
                       ad.status === 'archived' ? 'Zarchiwizowane' : 'Nieznany'}
                    </span>
                  </td>
                  <td>{ad.category?.name || 'Nieznana'}</td>
                  <td>{formatDate(ad.createdAt)}</td>
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
                        setAdToChangeStatus(ad);
                        setNewStatus(ad.status);
                        setShowStatusModal(true);
                      }}
                      title="Zmień status"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      className="action-button discount"
                      onClick={() => window.location.href = `/admin/discounts?adId=${ad._id}`}
                      title="Zarządzaj zniżką"
                    >
                      <i className="fas fa-percent"></i>
                    </button>
                    <button 
                      className="action-button delete"
                      onClick={() => {
                        setAdToDelete(ad);
                        setShowDeleteModal(true);
                      }}
                      title="Usuń ogłoszenie"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="no-data">
                  Brak ogłoszeń spełniających kryteria wyszukiwania
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && renderPagination()}
      
      {/* Modal zmiany statusu / Status change modal */}
      {showStatusModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Zmiana statusu ogłoszenia</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowStatusModal(false);
                  setAdToChangeStatus(null);
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>
                Zmieniasz status dla ogłoszenia: <strong>{adToChangeStatus?.title}</strong>
              </p>
              <div className="form-group">
                <label htmlFor="status">Nowy status:</label>
                <select
                  id="status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="form-control"
                >
                  <option value="active">Aktywne</option>
                  <option value="pending">Oczekujące</option>
                  <option value="rejected">Odrzucone</option>
                  <option value="sold">Sprzedane</option>
                  <option value="archived">Zarchiwizowane</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowStatusModal(false);
                  setAdToChangeStatus(null);
                }}
              >
                Anuluj
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleStatusChange}
              >
                Zapisz zmiany
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal usuwania ogłoszenia / Delete ad modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Usuwanie ogłoszenia</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowDeleteModal(false);
                  setAdToDelete(null);
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>
                Czy na pewno chcesz usunąć ogłoszenie: <strong>{adToDelete?.title}</strong>?
              </p>
              <p className="warning">
                <i className="fas fa-exclamation-triangle"></i>
                Ta operacja jest nieodwracalna. Wszystkie dane ogłoszenia zostaną usunięte.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setAdToDelete(null);
                }}
              >
                Anuluj
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleDeleteAd}
              >
                Usuń ogłoszenie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdsList;