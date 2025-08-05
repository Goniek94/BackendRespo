i# Integracja Profilu Użytkownika - Frontend

## Endpoint do pobierania danych profilu

### GET `/api/users/profile`

**Opis:** Pobiera kompletne dane profilu zalogowanego użytkownika z bazy danych.

**Autoryzacja:** Wymagane (cookies z tokenem JWT)

**Odpowiedź sukcesu (200):**
```json
{
  "success": true,
  "message": "Profil użytkownika pobrany pomyślnie",
  "user": {
    "id": "688b4aba9c0f2fecd035b20a",
    "name": "Mateusz",
    "lastName": "Goszczycki",
    "email": "mateusz.goszczycki1994@gmail.com",
    "phoneNumber": "+48577886554",
    "dob": "1994-10-22T00:00:00.000Z",
    "role": "admin",
    "status": "active",
    "isVerified": true,
    "isEmailVerified": true,
    "isPhoneVerified": true,
    "createdAt": "2025-07-31T10:51:38.583Z",
    "lastLogin": "2025-07-31T11:01:09.088Z",
    "registrationStep": "completed",
    "street": null,
    "city": null,
    "postalCode": null,
    "country": "pl",
    "notificationPreferences": {
      "email": true,
      "sms": false,
      "push": false
    },
    "privacySettings": {
      "showEmail": false,
      "showPhone": false,
      "showProfile": true
    },
    "securitySettings": {
      "twoFactorAuth": false,
      "loginAlerts": true
    }
  }
}
```

## Implementacja w React

### 1. Service API (authApi.js)

```javascript
// Dodaj do authApi.js
export const getUserProfile = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
      method: 'GET',
      credentials: 'include', // Ważne dla cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Błąd pobierania profilu');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Błąd pobierania profilu:', error);
    throw error;
  }
};
```

### 2. Hook do zarządzania profilem

```javascript
// hooks/useProfile.js
import { useState, useEffect } from 'react';
import { getUserProfile } from '../services/api/authApi';

export const useProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getUserProfile();
      setProfile(response.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile
  };
};
```

### 3. Komponent profilu

```javascript
// components/Profile/ProfileData.js
import React from 'react';
import { useProfile } from '../../hooks/useProfile';

const ProfileData = () => {
  const { profile, loading, error } = useProfile();

  if (loading) return <div>Ładowanie profilu...</div>;
  if (error) return <div>Błąd: {error}</div>;
  if (!profile) return <div>Brak danych profilu</div>;

  return (
    <div className="profile-data">
      <h2>Dane osobowe</h2>
      
      <div className="profile-field">
        <label>Imię:</label>
        <span>{profile.name}</span>
      </div>
      
      <div className="profile-field">
        <label>Nazwisko:</label>
        <span>{profile.lastName}</span>
      </div>
      
      <div className="profile-field">
        <label>Email:</label>
        <span>{profile.email}</span>
        {profile.isEmailVerified && <span className="verified">✅ Zweryfikowany</span>}
      </div>
      
      <div className="profile-field">
        <label>Telefon:</label>
        <span>{profile.phoneNumber}</span>
        {profile.isPhoneVerified && <span className="verified">✅ Zweryfikowany</span>}
      </div>
      
      <div className="profile-field">
        <label>Data urodzenia:</label>
        <span>{new Date(profile.dob).toLocaleDateString('pl-PL')}</span>
      </div>
      
      <div className="profile-field">
        <label>Status konta:</label>
        <span className={`status ${profile.status}`}>
          {profile.status === 'active' ? 'Aktywne' : profile.status}
        </span>
      </div>
    </div>
  );
};

export default ProfileData;
```

### 4. Formatowanie daty urodzenia

```javascript
// utils/dateUtils.js
export const formatBirthDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Użycie w komponencie:
<span>{formatBirthDate(profile.dob)}</span>
```

## Endpoint do aktualizacji profilu

### PUT `/api/users/profile`

**Opis:** Aktualizuje dane profilu użytkownika.

**Body:**
```json
{
  "name": "Nowe Imię",
  "lastName": "Nowe Nazwisko",
  "phoneNumber": "+48123456789",
  "dob": "1990-01-01"
}
```

**Implementacja:**
```javascript
export const updateUserProfile = async (profileData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      throw new Error('Błąd aktualizacji profilu');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Błąd aktualizacji profilu:', error);
    throw error;
  }
};
```

## Przykład użycia w komponencie profilu

```javascript
import React, { useState } from 'react';
import { useProfile } from '../../hooks/useProfile';
import { updateUserProfile } from '../../services/api/authApi';

const EditProfile = () => {
  const { profile, loading, refetch } = useProfile();
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        lastName: profile.lastName || '',
        phoneNumber: profile.phoneNumber || '',
        dob: profile.dob ? profile.dob.split('T')[0] : ''
      });
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateUserProfile(formData);
      await refetch(); // Odśwież dane profilu
      alert('Profil zaktualizowany pomyślnie!');
    } catch (error) {
      alert('Błąd aktualizacji profilu: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Ładowanie...</div>;

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Imię"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
      />
      
      <input
        type="text"
        placeholder="Nazwisko"
        value={formData.lastName}
        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
      />
      
      <input
        type="tel"
        placeholder="Telefon"
        value={formData.phoneNumber}
        onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
      />
      
      <input
        type="date"
        value={formData.dob}
        onChange={(e) => setFormData({...formData, dob: e.target.value})}
      />
      
      <button type="submit" disabled={saving}>
        {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
      </button>
    </form>
  );
};
```

## Podsumowanie

✅ **Backend jest gotowy** - endpoint `/api/users/profile` zwraca kompletne dane użytkownika z bazy danych

✅ **Wszystkie wymagane pola są dostępne:**
- Imię, nazwisko, email, telefon, data urodzenia
- Status weryfikacji email i telefonu
- Rola użytkownika i status konta
- Preferencje i ustawienia

✅ **Frontend może teraz:**
- Pobrać dane użytkownika przy załadowaniu strony profilu
- Wyświetlić wszystkie pola w formularzu
- Zaktualizować dane użytkownika
- Pokazać status weryfikacji

**Następne kroki:**
1. Zaimplementuj powyższy kod w komponencie profilu frontendu
2. Dodaj walidację formularza
3. Dodaj obsługę błędów
4. Przetestuj funkcjonalność edycji profilu
