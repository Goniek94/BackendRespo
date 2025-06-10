// admin/components/UserBlockModal.js
/**
 * Komponent modalu blokowania użytkownika
 * User block modal component
 */

import React, { useState } from 'react';
import axios from 'axios';

const UserBlockModal = ({ user, onClose, onBlockStatusChange }) => {
  const [blockReason, setBlockReason] = useState('');
  const [blockDuration, setBlockDuration] = useState('7days');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  // Duration options
  const durationOptions = [
    { value: '1day', label: '1 dzień' },
    { value: '3days', label: '3 dni' },
    { value: '7days', label: '7 dni' },
    { value: '30days', label: '30 dni' },
    { value: 'permanent', label: 'Na stałe' }
  ];
  
  // Handle blocking the user
  const handleBlockUser = async () => {
    if (!blockReason) {
      setError('Podaj powód blokady');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await axios.post(`/api/admin/users/${user._id}/block`, {
        reason: blockReason,
        duration: blockDuration
      });
      
      setIsProcessing(false);
      onBlockStatusChange({ ...user, isBlocked: true, blockInfo: response.data });
      onClose();
    } catch (err) {
      console.error('Błąd podczas blokowania użytkownika:', err);
      setError('Wystąpił błąd podczas blokowania użytkownika. Spróbuj ponownie.');
      setIsProcessing(false);
    }
  };
  
  // Handle unblocking the user
  const handleUnblockUser = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      await axios.post(`/api/admin/users/${user._id}/unblock`);
      
      setIsProcessing(false);
      onBlockStatusChange({ ...user, isBlocked: false, blockInfo: null });
      onClose();
    } catch (err) {
      console.error('Błąd podczas odblokowywania użytkownika:', err);
      setError('Wystąpił błąd podczas odblokowywania użytkownika. Spróbuj ponownie.');
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{user.isBlocked ? 'Odblokuj użytkownika' : 'Zablokuj użytkownika'}</h3>
          <button 
            className="modal-close"
            onClick={onClose}
            disabled={isProcessing}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body">
          <p className="mb-4">
            {user.isBlocked ? (
              <>
                Czy na pewno chcesz odblokować użytkownika <strong>{user.email}</strong>?
              </>
            ) : (
              <>
                Zamierzasz zablokować użytkownika <strong>{user.email}</strong>.
                <br />
                Po zablokowaniu użytkownik nie będzie mógł logować się ani korzystać z serwisu.
              </>
            )}
          </p>
          
          {!user.isBlocked && (
            <>
              <div className="form-group mb-3">
                <label htmlFor="blockReason" className="block text-gray-700 mb-1">
                  Powód blokady:
                </label>
                <textarea
                  id="blockReason"
                  className="w-full p-2 border rounded"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  rows="3"
                  placeholder="Podaj powód blokady..."
                ></textarea>
              </div>
              
              <div className="form-group mb-3">
                <label htmlFor="blockDuration" className="block text-gray-700 mb-1">
                  Czas trwania blokady:
                </label>
                <select
                  id="blockDuration"
                  className="w-full p-2 border rounded"
                  value={blockDuration}
                  onChange={(e) => setBlockDuration(e.target.value)}
                >
                  {durationOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          
          {user.isBlocked && user.blockInfo && (
            <div className="block-info bg-gray-100 p-3 rounded mb-3">
              <h4 className="text-gray-700 font-medium mb-2">Informacje o blokadzie:</h4>
              <p><strong>Powód:</strong> {user.blockInfo.reason}</p>
              <p><strong>Zablokowany od:</strong> {new Date(user.blockInfo.blockedAt).toLocaleString()}</p>
              <p><strong>Zablokowany do:</strong> {user.blockInfo.blockedUntil ? new Date(user.blockInfo.blockedUntil).toLocaleString() : 'Na stałe'}</p>
              <p><strong>Zablokowany przez:</strong> {user.blockInfo.blockedBy?.email || 'Administrator'}</p>
            </div>
          )}
          
          {error && (
            <div className="error-message text-red-600 mb-3">
              <i className="fas fa-exclamation-circle mr-1"></i> {error}
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button 
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isProcessing}
          >
            Anuluj
          </button>
          
          {user.isBlocked ? (
            <button 
              className="btn btn-success"
              onClick={handleUnblockUser}
              disabled={isProcessing}
            >
              {isProcessing ? 'Odblokowywanie...' : 'Odblokuj użytkownika'}
            </button>
          ) : (
            <button 
              className="btn btn-danger"
              onClick={handleBlockUser}
              disabled={isProcessing || !blockReason}
            >
              {isProcessing ? 'Blokowanie...' : 'Zablokuj użytkownika'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserBlockModal;