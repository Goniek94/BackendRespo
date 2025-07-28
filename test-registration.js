import axios from 'axios';

const API_BASE = 'http://localhost:5000';

// Test registration data
const testRegistration = {
  name: 'Jan',
  lastName: 'Kowalski',
  email: 'jan.kowalski.test@example.com',
  phone: '+48123456789',
  password: 'TestPassword123!',
  dob: '1990-01-01'
};

async function testRegistration() {
  try {
    console.log('🧪 Testowanie rejestracji z poprawną walidacją...\n');

    // 1. Test registration with valid data
    console.log('1. Rejestracja z poprawnymi danymi...');
    console.log('   Dane:', {
      name: testRegistration.name,
      lastName: testRegistration.lastName,
      email: testRegistration.email,
      phone: testRegistration.phone,
      dob: testRegistration.dob
    });

    try {
      const registerResponse = await axios.post(`${API_BASE}/api/auth/register`, testRegistration);
      console.log('✅ Rejestracja pomyślna:', registerResponse.data.message);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.code === 'EMAIL_ALREADY_EXISTS') {
        console.log('⚠️  Email już istnieje - to normalne dla testów');
      } else if (error.response?.status === 400 && error.response?.data?.code === 'PHONE_ALREADY_EXISTS') {
        console.log('⚠️  Telefon już istnieje - to normalne dla testów');
      } else {
        console.log('❌ Błąd rejestracji:', error.response?.data?.message || error.message);
      }
    }

    // 2. Test registration with invalid phone format
    console.log('\n2. Test z niepoprawnym formatem telefonu...');
    const invalidPhoneData = {
      ...testRegistration,
      email: 'test.invalid.phone@example.com',
      phone: '123456789' // Brak +48
    };

    try {
      await axios.post(`${API_BASE}/api/auth/register`, invalidPhoneData);
      console.log('❌ Rejestracja powinna się nie udać z niepoprawnym telefonem');
    } catch (error) {
      console.log('✅ Poprawnie odrzucono niepoprawny format telefonu:', error.response?.data?.message);
    }

    // 3. Test registration with missing lastName
    console.log('\n3. Test z brakującym nazwiskiem...');
    const missingLastNameData = {
      ...testRegistration,
      email: 'test.missing.lastname@example.com',
      lastName: '' // Brak nazwiska
    };

    try {
      await axios.post(`${API_BASE}/api/auth/register`, missingLastNameData);
      console.log('❌ Rejestracja powinna się nie udać bez nazwiska');
    } catch (error) {
      console.log('✅ Poprawnie odrzucono brak nazwiska:', error.response?.data?.errors?.[0]?.msg || error.response?.data?.message);
    }

    // 4. Test registration with too young age
    console.log('\n4. Test z za młodym wiekiem...');
    const tooYoungData = {
      ...testRegistration,
      email: 'test.too.young@example.com',
      dob: '2010-01-01' // 15 lat
    };

    try {
      await axios.post(`${API_BASE}/api/auth/register`, tooYoungData);
      console.log('❌ Rejestracja powinna się nie udać dla za młodego użytkownika');
    } catch (error) {
      console.log('✅ Poprawnie odrzucono za młody wiek:', error.response?.data?.message);
    }

    console.log('\n🎉 Test rejestracji zakończony!');

  } catch (error) {
    console.error('❌ Błąd testu:', error.message);
  }
}

// Run test
testRegistration();
