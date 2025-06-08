import React from 'react';

/**
 * Komponent wyświetlający badge z liczbą nieprzeczytanych wiadomości
 * @param {Object} props - Właściwości komponentu
 * @param {number} props.count - Liczba nieprzeczytanych wiadomości
 * @returns {JSX.Element|null} Element JSX lub null, jeśli count === 0
 */
const NotificationBadge = ({ count }) => {
  // Nie renderuj nic, jeśli liczba nieprzeczytanych jest równa 0
  if (count === 0) return null;
  
  return (
    <span className="notification-badge">
      {count > 99 ? '99+' : count}
    </span>
  );
};

export default NotificationBadge;