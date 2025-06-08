import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth'; // Zakładamy, że istnieje hook do autoryzacji

/**
 * Komponent wyświetlający skrzynkę wiadomości użytkownika
 */
const MessagesInbox = () => {
  const { token } = useAuth(); // Hook do pobierania tokenu
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  // Refs do kontroli zapytań API
  const lastFetchTime = useRef(0);
  const isRequestPending = useRef(false);
  const messagesCache = useRef(null);
  const MIN_FETCH_INTERVAL = 5000; // Minimalny czas między zapytaniami (5 sekund)

  // Pobieranie wiadomości dla aktywnego folderu - zoptymalizowane z useCallback
  const fetchMessages = useCallback(async (force = false) => {
    // Blokuj zbyt częste wywołania API
    const now = Date.now();
    if (!force && 
        (isRequestPending.current || 
         now - lastFetchTime.current < MIN_FETCH_INTERVAL)) {
      // Jeśli wywołanie jest zbyt częste, ale mamy buforowane dane, użyj ich
      if (messagesCache.current) {
        return;
      }
    }

    // Ustaw flagi stanu zapytania
    isRequestPending.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Zmniejszamy ilość logów, aby uniknąć niepotrzebnych renderów
      // Ustaw pełny URL z protokołem i hostem
      const baseUrl = 'http://localhost:5000';
      const response = await axios.get(`${baseUrl}/api/messages/${activeFolder}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Aktualizuj dane i cache
      setMessages(response.data);
      messagesCache.current = response.data;
      lastFetchTime.current = Date.now();
    } catch (err) {
      console.error('Błąd podczas pobierania wiadomości:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Wystąpił błąd podczas pobierania wiadomości';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      isRequestPending.current = false;
    }
  }, [activeFolder, token]); // Zależności useCallback

  // Pobieranie szczegółów wiadomości
  const fetchMessageDetails = async (messageId) => {
    setIsLoading(true);
    setError(null);

    try {
      // Ustaw pełny URL z protokołem i hostem
      const baseUrl = 'http://localhost:5000';
      const response = await axios.get(`${baseUrl}/api/messages/message/${messageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setSelectedMessage(response.data);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Wystąpił błąd podczas pobierania szczegółów wiadomości';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Oznaczanie wiadomości jako przeczytana
  const markAsRead = async (messageId) => {
    try {
      // Ustaw pełny URL z protokołem i hostem
      const baseUrl = 'http://localhost:5000';
      await axios.patch(`${baseUrl}/api/messages/read/${messageId}`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Aktualizacja stanu wiadomości
      setMessages(messages.map(msg => 
        msg._id === messageId ? { ...msg, read: true } : msg
      ));

      if (selectedMessage && selectedMessage._id === messageId) {
        setSelectedMessage({ ...selectedMessage, read: true });
      }
    } catch (err) {
      console.error('Błąd podczas oznaczania wiadomości jako przeczytana:', err);
    }
  };

  // Oznaczanie wiadomości gwiazdką
  const toggleStar = async (messageId) => {
    try {
      // Ustaw pełny URL z protokołem i hostem
      const baseUrl = 'http://localhost:5000';
      const response = await axios.patch(`${baseUrl}/api/messages/star/${messageId}`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const { starred } = response.data;

      // Aktualizacja stanu wiadomości
      setMessages(messages.map(msg => 
        msg._id === messageId ? { ...msg, starred } : msg
      ));

      if (selectedMessage && selectedMessage._id === messageId) {
        setSelectedMessage({ ...selectedMessage, starred });
      }
    } catch (err) {
      console.error('Błąd podczas oznaczania wiadomości gwiazdką:', err);
    }
  };

  // Usuwanie wiadomości
  const deleteMessage = async (messageId) => {
    try {
      // Ustaw pełny URL z protokołem i hostem
      const baseUrl = 'http://localhost:5000';
      await axios.delete(`${baseUrl}/api/messages/${messageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Aktualizacja stanu wiadomości
      setMessages(messages.filter(msg => msg._id !== messageId));

      if (selectedMessage && selectedMessage._id === messageId) {
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error('Błąd podczas usuwania wiadomości:', err);
    }
  };

  // Wysyłanie odpowiedzi na wiadomość
  const sendReply = async () => {
    if (!selectedMessage || !replyContent.trim()) return;

    setIsReplying(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('content', replyContent);

      // Ustaw pełny URL z protokołem i hostem
      const baseUrl = 'http://localhost:5000';
      await axios.post(
        `${baseUrl}/api/messages/reply/${selectedMessage._id}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Wyczyszczenie pola odpowiedzi
      setReplyContent('');
      
      // Odświeżenie wiadomości
      fetchMessages();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Wystąpił błąd podczas wysyłania odpowiedzi';
      setError(errorMessage);
    } finally {
      setIsReplying(false);
    }
  };

  // Efekt pobierający wiadomości przy zmianie folderu
  useEffect(() => {
    if (token) {
      // Usuńmy console.log aby uniknąć nadmiernych renderów
      fetchMessages(true); // Wymuś odświeżenie przy zmianie folderu
    }
  }, [activeFolder, token, fetchMessages]); // Dodajemy fetchMessages do zależności

  // Obsługa kliknięcia w wiadomość
  const handleMessageClick = (message) => {
    fetchMessageDetails(message._id);
    
    // Jeśli wiadomość nie jest przeczytana, oznacz ją jako przeczytaną
    if (!message.read && activeFolder === 'inbox') {
      markAsRead(message._id);
    }
  };

  // Formatowanie daty
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="messages-inbox-container">
      <div className="row">
        {/* Pasek boczny z folderami */}
        <div className="col-md-3">
          <div className="folders-sidebar">
            <h3>Wiadomości</h3>
            <ul className="list-group">
              <li 
                className={`list-group-item ${activeFolder === 'inbox' ? 'active' : ''}`}
                onClick={() => setActiveFolder('inbox')}
              >
                Odebrane
              </li>
              <li 
                className={`list-group-item ${activeFolder === 'sent' ? 'active' : ''}`}
                onClick={() => setActiveFolder('sent')}
              >
                Wysłane
              </li>
              <li 
                className={`list-group-item ${activeFolder === 'drafts' ? 'active' : ''}`}
                onClick={() => setActiveFolder('drafts')}
              >
                Szkice
              </li>
              <li 
                className={`list-group-item ${activeFolder === 'starred' ? 'active' : ''}`}
                onClick={() => setActiveFolder('starred')}
              >
                Oznaczone gwiazdką
              </li>
              <li 
                className={`list-group-item ${activeFolder === 'trash' ? 'active' : ''}`}
                onClick={() => setActiveFolder('trash')}
              >
                Kosz
              </li>
            </ul>
          </div>
        </div>
        
        {/* Lista wiadomości */}
        <div className="col-md-9">
          {isLoading && !selectedMessage && (
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="sr-only">Ładowanie...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}
          
          {!isLoading && !error && messages.length === 0 && (
            <div className="alert alert-info">
              Brak wiadomości w tym folderze
            </div>
          )}
          
          <div className="row">
            {/* Lista wiadomości */}
            <div className={`${selectedMessage ? 'col-md-5' : 'col-md-12'}`}>
              <div className="messages-list">
                {messages.map(message => (
                  <div 
                    key={message._id} 
                    className={`message-item ${!message.read && activeFolder === 'inbox' ? 'unread' : ''} ${selectedMessage && selectedMessage._id === message._id ? 'selected' : ''}`}
                    onClick={() => handleMessageClick(message)}
                  >
                    {!message.read && activeFolder === 'inbox' && (
                      <span className="message-unread-indicator">1</span>
                    )}
                    <div className="message-header">
                      <div className="message-sender">
                        {activeFolder === 'sent' ? `Do: ${message.recipient.name || message.recipient.email}` : `Od: ${message.sender.name || message.sender.email}`}
                      </div>
                      <div className="message-date">
                        {formatDate(message.createdAt)}
                      </div>
                    </div>
                    <div className="message-subject">
                      {message.starred && <span className="star-icon">★</span>}
                      {message.subject}
                    </div>
                    <div className="message-preview">
                      {message.content.substring(0, 100)}
                      {message.content.length > 100 ? '...' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Szczegóły wiadomości */}
            {selectedMessage && (
              <div className="col-md-7">
                <div className="message-details">
                  <div className="message-actions">
                    <button 
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => toggleStar(selectedMessage._id)}
                    >
                      {selectedMessage.starred ? 'Usuń gwiazdkę' : 'Oznacz gwiazdką'}
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => deleteMessage(selectedMessage._id)}
                    >
                      Usuń
                    </button>
                  </div>
                  
                  <div className="message-header">
                    <h4>{selectedMessage.subject}</h4>
                    <div className="message-info">
                      <div>
                        <strong>Od:</strong> {selectedMessage.sender.name || selectedMessage.sender.email}
                      </div>
                      <div>
                        <strong>Do:</strong> {selectedMessage.recipient.name || selectedMessage.recipient.email}
                      </div>
                      <div>
                        <strong>Data:</strong> {formatDate(selectedMessage.createdAt)}
                      </div>
                      {selectedMessage.relatedAd && (
                        <div>
                          <strong>Dotyczy ogłoszenia:</strong> {selectedMessage.relatedAd.headline || `${selectedMessage.relatedAd.brand} ${selectedMessage.relatedAd.model}`}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="message-content">
                    {selectedMessage.content.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                  
                  {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                    <div className="message-attachments">
                      <h5>Załączniki:</h5>
                      <ul className="list-group">
                        {selectedMessage.attachments.map((attachment, index) => (
                          <li key={index} className="list-group-item">
                            <a href={`/uploads/attachments/${attachment.path}`} target="_blank" rel="noopener noreferrer">
                              {attachment.name} ({Math.round(attachment.size / 1024)} KB)
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Formularz odpowiedzi */}
                  <div className="reply-form mt-4">
                    <h5>Odpowiedz</h5>
                    <div className="form-group">
                      <textarea
                        className="form-control"
                        rows="5"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Wpisz swoją odpowiedź..."
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={sendReply}
                      disabled={isReplying || !replyContent.trim()}
                    >
                      {isReplying ? 'Wysyłanie...' : 'Wyślij odpowiedź'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesInbox;
