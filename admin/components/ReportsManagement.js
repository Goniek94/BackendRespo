// admin/components/ReportsManagement.js
/**
 * Komponent zarządzania zgłoszeniami dla panelu administratora
 * Reports management component for admin panel
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UsersList.css'; // Używamy tych samych styli co dla UsersList

const ReportsManagement = () => {
  // Stan / State
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [reportToResolve, setReportToResolve] = useState(null);
  const [resolutionAction, setResolutionAction] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Kategorie zgłoszeń / Report categories
  const reportCategories = [
    { id: 'spam', name: 'Spam' },
    { id: 'fraud', name: 'Oszustwo' },
    { id: 'inappropriate', name: 'Nieodpowiednia treść' },
    { id: 'error', name: 'Błąd' },
    { id: 'other', name: 'Inne' }
  ];

  // Statusy zgłoszeń / Report statuses
  const reportStatuses = [
    { id: 'new', name: 'Nowe' },
    { id: 'in_progress', name: 'W trakcie' },
    { id: 'resolved', name: 'Rozwiązane' },
    { id: 'rejected', name: 'Odrzucone' }
  ];

  // Akcje rozwiązania / Resolution actions
  const resolutionActions = [
    { id: 'close', name: 'Zamknij zgłoszenie' },
    { id: 'remove_content', name: 'Usuń treść' },
    { id: 'ban_user', name: 'Zbanuj użytkownika' },
    { id: 'contact_user', name: 'Skontaktuj się z użytkownikiem' }
  ];

  // Pobierz zgłoszenia / Fetch reports
  useEffect(() => {
    fetchReports();
  }, [currentPage, searchTerm, selectedCategory, selectedStatus, sortBy, sortOrder]);

  // Funkcja pobierająca zgłoszenia / Function to fetch reports
  const fetchReports = async () => {
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
      
      if (selectedStatus) {
        params.status = selectedStatus;
      }
      
      // Tutaj powinno być połączenie z API
      const response = await axios.get('/api/admin/reports', { params });
      
      setReports(response.data.reports);
      setTotalPages(response.data.pagination.pages);
      setLoading(false);
    } catch (err) {
      console.error('Błąd podczas pobierania zgłoszeń:', err);
      setError('Wystąpił błąd podczas pobierania listy zgłoszeń.');
      setLoading(false);
      
      // Tymczasowe dane testowe / Temporary test data
      setReports([
        {
          _id: '1',
          category: 'spam',
          status: 'new',
          title: 'Spam w komentarzach',
          description: 'Użytkownik wielokrotnie wysyła spam w komentarzach',
          reporter: { email: 'reporter@example.com', _id: '123' },
          reportedUser: { email: 'spammer@example.com', _id: '456' },
          reportedContent: { type: 'comment', id: '789', text: 'Treść komentarza...' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          _id: '2',
          category: 'fraud',
          status: 'in_progress',
          title: 'Podejrzane ogłoszenie',
          description: 'Ogłoszenie zawiera fałszywe informacje',
          reporter: { email: 'user1@example.com', _id: '124' },
          reportedUser: { email: 'seller@example.com', _id: '457' },
          reportedContent: { type: 'ad', id: '790', title: 'Samochód w idealnym stanie' },
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          updatedAt: new Date(Date.now() - 43200000).toISOString() // 12 hours ago
        },
        {
          _id: '3',
          category: 'inappropriate',
          status: 'resolved',
          title: 'Nieodpowiednie zdjęcie',
          description: 'Ogłoszenie zawiera nieodpowiednie zdjęcie',
          reporter: { email: 'user2@example.com', _id: '125' },
          reportedUser: { email: 'baduser@example.com', _id: '458' },
          reportedContent: { type: 'ad', id: '791', title: 'Sprzedam tanio' },
          resolution: {
            action: 'remove_content',
            note: 'Usunięto nieodpowiednie zdjęcie',
            resolvedBy: { email: 'admin@example.com', _id: '001' },
            resolvedAt: new Date(Date.now() - 21600000).toISOString() // 6 hours ago
          },
          createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          updatedAt: new Date(Date.now() - 21600000).toISOString() // 6 hours ago
        }
      ]);
      setTotalPages(1);
    }
  };

  // Obsługa wyszukiwania / Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset do pierwszej strony przy nowym wyszukiwaniu
  };

  // Obsługa rozwiązania zgłoszenia / Handle report resolution
  const handleResolveReport = async () => {
    if (!reportToResolve || !resolutionAction) return;
    
    try {
      const resolution = {
        action: resolutionAction,
        note: resolutionNote,
        resolvedAt: new Date().toISOString()
      };
      
      await axios.put(`/api/admin/reports/${reportToResolve._id}/resolve`, { resolution });
      
      // Aktualizuj lokalną listę zgłoszeń
      setReports(reports.map(report => 
        report._id === reportToResolve._id ? 
        { 
          ...report, 
          status: 'resolved', 
          resolution,
          updatedAt: new Date().toISOString()
        } : report
      ));
      
      setShowResolveModal(false);
      setReportToResolve(null);
      setResolutionAction('');
      setResolutionNote('');
    } catch (err) {
      console.error('Błąd podczas rozwiązywania zgłoszenia:', err);
      setError('Wystąpił błąd podczas rozwiązywania zgłoszenia.');
      
      // Tymczasowa aktualizacja bez API / Temporary update without API
      setReports(reports.map(report => 
        report._id === reportToResolve._id ? 
        { 
          ...report, 
          status: 'resolved', 
          resolution: {
            action: resolutionAction,
            note: resolutionNote,
            resolvedBy: { email: 'admin@example.com', _id: '001' },
            resolvedAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        } : report
      ));
      
      setShowResolveModal(false);
      setReportToResolve(null);
      setResolutionAction('');
      setResolutionNote('');
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

  // Pokaż szczegóły zgłoszenia / Show report details
  const showReportDetails = (report) => {
    setSelectedReport(report);
    setShowDetailsModal(true);
  };

  // Jeśli ładowanie / If loading
  if (loading) {
    return (
      <div className="loading">
        <i className="fas fa-spinner fa-spin"></i>
        <span>Ładowanie zgłoszeń...</span>
      </div>
    );
  }

  // Jeśli błąd / If error
  if (error && reports.length === 0) {
    return (
      <div className="error">
        <i className="fas fa-exclamation-triangle"></i>
        <span>{error}</span>
        <button onClick={fetchReports} className="btn btn-primary mt-4">
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="reports-list">
      <div className="list-header">
        <h2 className="section-title">Zarządzanie Zgłoszeniami</h2>
        
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
            {reportCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="status-filter"
          >
            <option value="">Wszystkie statusy</option>
            {reportStatuses.map(status => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="table-container">
        <table className="reports-table">
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
                    if (sortBy === 'category') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('category');
                      setSortOrder('asc');
                    }
                  }}
                >
                  Kategoria
                  {sortBy === 'category' && (
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
              <th>Zgłaszający</th>
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
                  Data zgłoszenia
                  {sortBy === 'createdAt' && (
                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </button>
              </th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {reports.length > 0 ? (
              reports.map((report) => (
                <tr key={report._id}>
                  <td>{report._id.substring(0, 8)}...</td>
                  <td>{report.title}</td>
                  <td>
                    <span className={`category-badge category-${report.category}`}>
                      {reportCategories.find(c => c.id === report.category)?.name || report.category}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${report.status}`}>
                      {reportStatuses.find(s => s.id === report.status)?.name || report.status}
                    </span>
                  </td>
                  <td>
                    <a href={`/admin/users/${report.reporter?._id}`}>
                      {report.reporter?.email || 'Nieznany'}
                    </a>
                  </td>
                  <td>{formatDate(report.createdAt)}</td>
                  <td className="actions">
                    <button 
                      className="action-button view"
                      onClick={() => showReportDetails(report)}
                      title="Zobacz szczegóły"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    {report.status !== 'resolved' && report.status !== 'rejected' && (
                      <button 
                        className="action-button resolve"
                        onClick={() => {
                          setReportToResolve(report);
                          setShowResolveModal(true);
                        }}
                        title="Rozwiąż zgłoszenie"
                      >
                        <i className="fas fa-check-circle"></i>
                      </button>
                    )}
                    <button 
                      className="action-button content"
                      onClick={() => {
                        // Przejdź do zgłoszonej treści
                        if (report.reportedContent?.type === 'ad' && report.reportedContent?.id) {
                          window.location.href = `/admin/ads/${report.reportedContent.id}`;
                        } else if (report.reportedContent?.type === 'comment' && report.reportedContent?.id) {
                          window.location.href = `/admin/comments/${report.reportedContent.id}`;
                        } else {
                          alert('Nie można znaleźć zgłoszonej treści');
                        }
                      }}
                      title="Zobacz zgłoszoną treść"
                    >
                      <i className="fas fa-external-link-alt"></i>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">
                  Brak zgłoszeń spełniających kryteria wyszukiwania
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && renderPagination()}
      
      {/* Modal szczegółów zgłoszenia / Report details modal */}
      {showDetailsModal && selectedReport && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>Szczegóły zgłoszenia</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedReport(null);
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="report-details">
                <div className="detail-group">
                  <h4>Informacje podstawowe</h4>
                  <div className="detail-row">
                    <div className="detail-label">ID:</div>
                    <div className="detail-value">{selectedReport._id}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Tytuł:</div>
                    <div className="detail-value">{selectedReport.title}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Kategoria:</div>
                    <div className="detail-value">
                      <span className={`category-badge category-${selectedReport.category}`}>
                        {reportCategories.find(c => c.id === selectedReport.category)?.name || selectedReport.category}
                      </span>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Status:</div>
                    <div className="detail-value">
                      <span className={`status-badge status-${selectedReport.status}`}>
                        {reportStatuses.find(s => s.id === selectedReport.status)?.name || selectedReport.status}
                      </span>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Data zgłoszenia:</div>
                    <div className="detail-value">{formatDate(selectedReport.createdAt)}</div>
                  </div>
                </div>
                
                <div className="detail-group">
                  <h4>Opis zgłoszenia</h4>
                  <p className="report-description">{selectedReport.description}</p>
                </div>
                
                <div className="detail-group">
                  <h4>Użytkownicy</h4>
                  <div className="detail-row">
                    <div className="detail-label">Zgłaszający:</div>
                    <div className="detail-value">
                      <a href={`/admin/users/${selectedReport.reporter?._id}`}>
                        {selectedReport.reporter?.email || 'Nieznany'}
                      </a>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Zgłoszony użytkownik:</div>
                    <div className="detail-value">
                      <a href={`/admin/users/${selectedReport.reportedUser?._id}`}>
                        {selectedReport.reportedUser?.email || 'Nieznany'}
                      </a>
                    </div>
                  </div>
                </div>
                
                <div className="detail-group">
                  <h4>Zgłoszona treść</h4>
                  <div className="detail-row">
                    <div className="detail-label">Typ:</div>
                    <div className="detail-value">{
                      selectedReport.reportedContent?.type === 'ad' ? 'Ogłoszenie' :
                      selectedReport.reportedContent?.type === 'comment' ? 'Komentarz' : 
                      'Inny'
                    }</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Treść:</div>
                    <div className="detail-value">
                      {selectedReport.reportedContent?.title || selectedReport.reportedContent?.text || 'Brak treści'}
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Link:</div>
                    <div className="detail-value">
                      {selectedReport.reportedContent?.type && selectedReport.reportedContent?.id ? (
                        <a 
                          href={`/admin/${selectedReport.reportedContent.type === 'ad' ? 'ads' : 'comments'}/${selectedReport.reportedContent.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Zobacz treść <i className="fas fa-external-link-alt"></i>
                        </a>
                      ) : 'Brak linku'}
                    </div>
                  </div>
                </div>
                
                {selectedReport.resolution && (
                  <div className="detail-group">
                    <h4>Rozwiązanie</h4>
                    <div className="detail-row">
                      <div className="detail-label">Akcja:</div>
                      <div className="detail-value">
                        {resolutionActions.find(a => a.id === selectedReport.resolution.action)?.name || selectedReport.resolution.action}
                      </div>
                    </div>
                    <div className="detail-row">
                      <div className="detail-label">Notatka:</div>
                      <div className="detail-value">{selectedReport.resolution.note || 'Brak notatki'}</div>
                    </div>
                    <div className="detail-row">
                      <div className="detail-label">Rozwiązane przez:</div>
                      <div className="detail-value">
                        {selectedReport.resolution.resolvedBy?.email || 'Nieznany'}
                      </div>
                    </div>
                    <div className="detail-row">
                      <div className="detail-label">Data rozwiązania:</div>
                      <div className="detail-value">
                        {selectedReport.resolution.resolvedAt ? formatDate(selectedReport.resolution.resolvedAt) : 'Nieznana'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedReport(null);
                }}
              >
                Zamknij
              </button>
              {selectedReport.status !== 'resolved' && selectedReport.status !== 'rejected' && (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setReportToResolve(selectedReport);
                    setShowResolveModal(true);
                  }}
                >
                  Rozwiąż zgłoszenie
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal rozwiązywania zgłoszenia / Report resolution modal */}
      {showResolveModal && reportToResolve && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Rozwiązanie zgłoszenia</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowResolveModal(false);
                  setReportToResolve(null);
                  setResolutionAction('');
                  setResolutionNote('');
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>
                Rozwiązujesz zgłoszenie: <strong>{reportToResolve.title}</strong>
              </p>
              
              <div className="form-group">
                <label htmlFor="resolutionAction">Akcja:</label>
                <select
                  id="resolutionAction"
                  value={resolutionAction}
                  onChange={(e) => setResolutionAction(e.target.value)}
                  className="form-control"
                >
                  <option value="">Wybierz akcję</option>
                  {resolutionActions.map(action => (
                    <option key={action.id} value={action.id}>
                      {action.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="resolutionNote">Notatka (opcjonalnie):</label>
                <textarea
                  id="resolutionNote"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="form-control"
                  rows="3"
                  placeholder="Dodaj notatkę z wyjaśnieniem rozwiązania..."
                ></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowResolveModal(false);
                  setReportToResolve(null);
                  setResolutionAction('');
                  setResolutionNote('');
                }}
              >
                Anuluj
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleResolveReport}
                disabled={!resolutionAction}
              >
                Zapisz rozwiązanie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsManagement;