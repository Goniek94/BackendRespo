import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth'; // Zakładamy, że istnieje hook do autoryzacji

/**
 * Komponent formularza do wysyłania wiadomości do właściciela ogłoszenia
 * @param {Object} props - Właściwości komponentu
 * @param {string} props.adId - ID ogłoszenia
 * @param {string} props.adTitle - Tytuł ogłoszenia (opcjonalnie)
 * @param {Function} props.onSuccess - Callback wywoływany po pomyślnym wysłaniu wiadomości
 * @param {Function} props.onError - Callback wywoływany w przypadku błędu
 */
const MessageForm = ({ adId, adTitle, onSuccess, onError }) => {
  const { user, token } = useAuth(); // Hook do pobierania danych użytkownika i tokenu
  const [subject, setSubject] = useState(adTitle ? `Pytanie o: ${adTitle}` : '');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Obsługa zmiany załączników
  const handleAttachmentChange = (e) => {
    setAttachments(Array.from(e.target.files));
  };

  // Wysłanie wiadomości
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Sprawdzenie, czy użytkownik jest zalogowany
      if (!user || !token) {
        throw new Error('Musisz być zalogowany, aby wysłać wiadomość');
      }

      // Sprawdzenie, czy treść wiadomości nie jest pusta
      if (!content.trim()) {
        throw new Error('Treść wiadomości nie może być pusta');
      }

      console.log(`Wysyłanie wiadomości do ogłoszenia ${adId}`);
      console.log(`Dane wiadomości: subject=${subject}, content=${content.substring(0, 20)}...`);
      console.log(`Załączniki: ${attachments.length}`);

      // Utworzenie obiektu FormData do wysłania danych
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('content', content);
      
      // Dodanie załączników
      attachments.forEach(file => {
        formData.append('attachments', file);
      });

      // Wysłanie żądania do API
      console.log(`Wysyłanie żądania do: /api/messages/send-to-ad/${adId}`);
      const response = await axios.post(
        `/api/messages/send-to-ad/${adId}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('Odpowiedź z API:', response.data);

      // Obsługa sukcesu
      setSuccess(true);
      setSubject('');
      setContent('');
      setAttachments([]);
      
      // Wywołanie callbacka sukcesu
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (err) {
      // Obsługa błędu
      const errorMessage = err.response?.data?.message || err.message || 'Wystąpił błąd podczas wysyłania wiadomości';
      setError(errorMessage);
      
      // Wywołanie callbacka błędu
      if (onError) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="message-form-container">
      <h3>Wyślij wiadomość do sprzedającego</h3>
      
      {success && (
        <div className="alert alert-success">
          Wiadomość została wysłana pomyślnie!
        </div>
      )}
      
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="subject">Temat</label>
          <input
            type="text"
            id="subject"
            className="form-control"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="content">Treść wiadomości</label>
          <textarea
            id="content"
            className="form-control"
            rows="5"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="attachments">Załączniki (opcjonalnie)</label>
          <input
            type="file"
            id="attachments"
            className="form-control"
            multiple
            onChange={handleAttachmentChange}
          />
          <small className="text-muted">
            Możesz dodać maksymalnie 5 plików, każdy o rozmiarze do 10MB
          </small>
        </div>
        
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Wysyłanie...' : 'Wyślij wiadomość'}
        </button>
      </form>
    </div>
  );
};

export default MessageForm;
