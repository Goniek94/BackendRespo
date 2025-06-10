// admin/components/NewAdsApproval.js
/**
 * Komponent do zatwierdzania nowych ogłoszeń
 * New ads approval component
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UsersList.css'; // Używamy tych samych styli co dla UsersList

const NewAdsApproval = () => {
  // Stan / State
  const [pendingAds, setPendingAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveNote, setApproveNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [adDetails, setAdDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Pobierz ogłoszenia oczekujące na zatwierdzenie / Fetch pending ads
  useEffect(() => {
    fetchPendingAds();
  }, [currentPage]);

  // Funkcja pobierająca ogłoszenia oczekujące / Function to fetch pending ads
  const fetchPendingAds = async () => {
    try {
      setLoading(true);
      
      const response = await axios.get('/api/admin/ads/pending', {
        params: { page: currentPage, limit: 10 }
      });
      
      setPendingAds(response.data.ads);
      setTotalPages(response.data.pagination.pages);
      setLoading(false);
    } catch (err) {
      console.error('Błąd podczas pobierania ogłoszeń oczekujących:', err);
      setError('Wystąpił błąd podczas pobierania ogłoszeń oczekujących.');
      setLoading(false);
      
      // Tymczasowe dane testowe / Temporary test data
      setPendingAds([
        {
          _id: '1',
          title: 'Volkswagen Golf VII 1.4 TSI',
          price: 49000,
          images: ['https://via.placeholder.com/300x200?text=VW+Golf'],
          createdAt: new Date().toISOString(),
          user: { email: 'seller1@example.com', _id: '101' },
          description: 'Sprzedam Volkswagena Golfa VII z 2015 roku. Samochód w bardzo dobrym stanie technicznym i wizualnym. Przebieg 120 000 km.',
          location: 'Warszawa',
          category: { id: 'sedan', name: 'Sedan' }
        },
        {
          _id: '2',
          title: 'BMW Seria 3 320d',
          price: 85000,
          images: ['https://via.placeholder.com/300x200?text=BMW+320d'],
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          user: { email: 'seller2@example.com', _id: '102' },
          description: 'Sprzedam BMW Serii 3 320d z 2018 roku. Samochód bezwypadkowy, serwisowany w ASO. Przebieg 60 000 km.',
          location: 'Kraków',
          category: { id: 'coupe', name: 'Coupe' }
        },
        {
          _id: '3',
          title: 'Toyota Corolla 1.8 Hybrid',
          price: 92000,
          images: ['https://via.placeholder.com/300x200?text=Toyota+Corolla'],
          createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          user: { email: 'seller3@example.com', _id: '103' },
          description: 'Sprzedam Toyotę Corollę Hybrid z 2019 roku. Samochód w stanie idealnym, pierwszy właściciel. Przebieg 30 000 km.',
          location: 'Poznań',
          category: { id: 'sedan', name: 'Sedan' }
        }
      ]);
      setTotalPages(1);
    }
  };

  // Obsługa zatwierdzenia ogłoszenia / Handle ad approval
  const handleApproveAd = async () => {
    if (!selectedAd) return;
    
    setIsProcessing(true);
    
    try {
      await axios.post(`/api/admin/ads/${selectedAd._id}/approve`, {
        note: approveNote
      });
      
      // Usuń ogłoszenie z listy oczekujących
      setPendingAds(pendingAds.filter(ad => ad._id !== selectedAd._id));
      
      setShowApproveModal(false);
      setSelectedAd(null);
      setApproveNote('');
      setIsProcessing(false);
    } catch (err) {
      console.error('Błąd podczas zatwierdzania ogłoszenia:', err);
      setError('Wystąpił błąd podczas zatwierdzania ogłoszenia.');
      setIsProcessing(false);
      
      // Tymczasowo usuń ogłoszenie z listy / Temporarily remove ad from list
      setPendingAds(pendingAds.filter(ad => ad._id !== selectedAd._id));
      
      setShowApproveModal(false);
      setSelectedAd(null);
      setApproveNote('');
    }
  };

  // Obsługa odrzucenia ogłoszenia / Handle ad rejection
  const handleRejectAd = async () => {
    if (!selectedAd || !rejectReason) return;
    
    setIsProcessing(true);
    
    try {
      await axios.post(`/api/admin/ads/${selectedAd._id}/reject`, {
        reason: rejectReason
      });
      
      // Usuń ogłoszenie z listy oczekujących
      setPendingAds(pendingAds.filter(ad => ad._id !== selectedAd._id));
      
      setShowRejectModal(false);
      setSelectedAd(null);
      setRejectReason('');
      setIsProcessing(false);
    } catch (err) {
      console.error('Błąd podczas odrzucania ogłoszenia:', err);
      setError('Wystąpił błąd podczas odrzucania ogłoszenia.');
      setIsProcessing(false);
      
      // Tymczasowo usuń ogłoszenie z listy / Temporarily remove ad from list
      setPendingAds(pendingAds.filter(ad => ad._id !== selectedAd._id));
      
      setShowRejectModal(false);
      setSelectedAd(null);
      setRejectReason('');
    }
  };
  
  // Pokaż szczegóły ogłoszenia / Show ad details
  const showAdDetails = (ad) => {
    setAdDetails(ad);
    setShowDetailsModal(true);
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

  // Renderowanie widoku siatki / Render grid view
  const renderGridView = () => {
    return (
      <div className="ads-grid">
        {pendingAds.map(ad => (
          <div key={ad._id} className="ad-card">
            <div className="ad-card-image">
              {ad.images && ad.images.length > 0 ? (
                <img src={ad.images[0]} alt={ad.title} />
              ) : (
                <div className="no-image">
                  <i className="fas fa-image"></i>
                  <span>Brak zdjęcia</span>
                </div>
              )}
            </div>
            <div className="ad-card-content">
              <h3 className="ad-title">{ad.title}</h3>
              <p className="ad-price">{formatPrice(ad.price)}</p>
              <p className="ad-location">{ad.location}</p>
              <p className="ad-date">Dodano: {formatDate(ad.createdAt)}</p>
              <p className="ad-seller">Sprzedający: {ad.user?.email}</p>
            </div>
            <div className="ad-card-actions">
              <button 
                className="action-button view"
                onClick={() => showAdDetails(ad)}
                title="Zobacz szczegóły"
              >
                <i className="fas fa-eye"></i>
              </button>
              <button 
                className="action-button approve"
                onClick={() => {
                  setSelectedAd(ad);
                  setShowApproveModal(true);
                }}
                title="Zatwierdź ogłoszenie"
              >
                <i className="fas fa-check"></i>
              </button>
              <button 
                className="action-button reject"
                onClick={() => {
                  setSelectedAd(ad);
                  setShowRejectModal(true);
                }}
                title="Odrzuć ogłoszenie"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Renderowanie widoku listy / Render list view
  const renderListView = () => {
    return (
      <table className="ads-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tytuł</th>
            <th>Cena</th>
            <th>Lokalizacja</th>
            <th>Kategoria</th>
            <th>Data dodania</th>
            <th>Sprzedający</th>
            <th>Akcje</th>
          </tr>
        </thead>
        <tbody>
          {pendingAds.map(ad => (
            <tr key={ad._id}>
              <td>{ad._id.substring(0, 8)}...</td>
              <td>{ad.title}</td>
              <td>{formatPrice(ad.price)}</td>
              <td>{ad.location}</td>
              <td>{ad.category?.name || 'Nieznana'}</td>
              <td>{formatDate(ad.createdAt)}</td>
              <td>
                <a href={`/admin/users/${ad.user?._id}`}>
                  {ad.user?.email || 'Nieznany'}
                </a>
              </td>
              <td className="actions">
                <button 
                  className="action-button view"
                  onClick={() => showAdDetails(ad)}
                  title="Zobacz szczegóły"
                >
                  <i className="fas fa-eye"></i>
                </button>
                <button 
                  className="action-button approve"
                  onClick={() => {
                    setSelectedAd(ad);
                    setShowApproveModal(true);
                  }}
                  title="Zatwierdź ogłoszenie"
                >
                  <i className="fas fa-check"></i>
                </button>
                <button 
                  className="action-button reject"
                  onClick={() => {
                    setSelectedAd(ad);
                    setShowRejectModal(true);
                  }}
                  title="Odrzuć ogłoszenie"
                >
                  <i className="fas fa-times"></i>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Jeśli ładowanie / If loading
  if (loading) {
    return (
      <div className="loading">
        <i className="fas fa-spinner fa-spin"></i>
        <span>Ładowanie ogłoszeń oczekujących...</span>
      </div>
    );
  }

  // Jeśli błąd / If error
  if (error && pendingAds.length === 0) {
    return (
      <div className="error">
        <i className="fas fa-exclamation-triangle"></i>
        <span>{error}</span>
        <button onClick={fetchPendingAds} className="btn btn-primary mt-4">
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="ads-approval">
      <div className="list-header">
        <h2 className="section-title">Zatwierdzanie Ogłoszeń</h2>
        
        <div className="filters">
          <div className="view-toggle">
            <button 
              className={`toggle-button ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Widok siatki"
            >
              <i className="fas fa-th"></i>
            </button>
            <button 
              className={`toggle-button ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Widok listy"
            >
              <i className="fas fa-list"></i>
            </button>
          </div>
        </div>
      </div>
      
      {pendingAds.length > 0 ? (
        <div className="ads-container">
          {viewMode === 'grid' ? renderGridView() : renderListView()}
        </div>
      ) : (
        <div className="no-pending-ads">
          <i className="fas fa-check-circle"></i>
          <p>Brak ogłoszeń oczekujących na zatwierdzenie</p>
        </div>
      )}
      
      {totalPages > 1 && renderPagination()}
      
      {/* Modal zatwierdzania ogłoszenia / Ad approval modal */}
      {showApproveModal && selectedAd && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Zatwierdzanie ogłoszenia</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedAd(null);
                  setApproveNote('');
                }}
                disabled={isProcessing}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>
                Czy na pewno chcesz zatwierdzić ogłoszenie: <strong>{selectedAd.title}</strong>?
              </p>
              <div className="form-group">
                <label htmlFor="approveNote" className="block text-gray-700 mb-1">
                  Notatka (opcjonalnie):
                </label>
                <textarea
                  id="approveNote"
                  className="w-full p-2 border rounded"
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  rows="3"
                  placeholder="Dodaj notatkę dotyczącą zatwierdzenia..."
                ></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedAd(null);
                  setApproveNote('');
                }}
                disabled={isProcessing}
              >
                Anuluj
              </button>
              <button 
                className="btn btn-success"
                onClick={handleApproveAd}
                disabled={isProcessing}
              >
                {isProcessing ? 'Zatwierdzanie...' : 'Zatwierdź ogłoszenie'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal odrzucania ogłoszenia / Ad rejection modal */}
      {showRejectModal && selectedAd && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Odrzucanie ogłoszenia</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedAd(null);
                  setRejectReason('');
                }}
                disabled={isProcessing}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>
                Zamierzasz odrzucić ogłoszenie: <strong>{selectedAd.title}</strong>
              </p>
              <div className="form-group">
                <label htmlFor="rejectReason" className="block text-gray-700 mb-1">
                  Powód odrzucenia:
                </label>
                <textarea
                  id="rejectReason"
                  className="w-full p-2 border rounded"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows="3"
                  placeholder="Podaj powód odrzucenia ogłoszenia..."
                  required
                ></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedAd(null);
                  setRejectReason('');
                }}
                disabled={isProcessing}
              >
                Anuluj
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleRejectAd}
                disabled={isProcessing || !rejectReason}
              >
                {isProcessing ? 'Odrzucanie...' : 'Odrzuć ogłoszenie'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal szczegółów ogłoszenia / Ad details modal */}
      {showDetailsModal && adDetails && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>Szczegóły ogłoszenia</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowDetailsModal(false);
                  setAdDetails(null);
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="ad-details">
                <div className="ad-images">
                  {adDetails.images && adDetails.images.length > 0 ? (
                    <div className="image-carousel">
                      <img src={adDetails.images[0]} alt={adDetails.title} className="main-image" />
                      {adDetails.images.length > 1 && (
                        <div className="image-thumbnails">
                          {adDetails.images.map((image, index) => (
                            <img 
                              key={index} 
                              src={image} 
                              alt={`${adDetails.title} - zdjęcie ${index + 1}`}
                              className="thumbnail"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="no-image large">
                      <i className="fas fa-image"></i>
                      <span>Brak zdjęcia</span>
                    </div>
                  )}
                </div>
                
                <div className="ad-info">
                  <h2 className="ad-title">{adDetails.title}</h2>
                  <p className="ad-price">{formatPrice(adDetails.price)}</p>
                  <p className="ad-location">
                    <i className="fas fa-map-marker-alt"></i> {adDetails.location}
                  </p>
                  <p className="ad-date">
                    <i className="fas fa-calendar-alt"></i> Dodano: {formatDate(adDetails.createdAt)}
                  </p>
                  <p className="ad-category">
                    <i className="fas fa-tag"></i> Kategoria: {adDetails.category?.name || 'Nieznana'}
                  </p>
                  <p className="ad-seller">
                    <i className="fas fa-user"></i> Sprzedający: {adDetails.user?.email || 'Nieznany'}
                  </p>
                  
                  <div className="ad-description">
                    <h3>Opis</h3>
                    <p>{adDetails.description}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowDetailsModal(false);
                  setAdDetails(null);
                }}
              >
                Zamknij
              </button>
              <button 
                className="btn btn-success"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedAd(adDetails);
                  setShowApproveModal(true);
                }}
              >
                Zatwierdź ogłoszenie
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedAd(adDetails);
                  setShowRejectModal(true);
                }}
              >
                Odrzuć ogłoszenie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewAdsApproval;