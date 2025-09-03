// examples/dashboard-usage-example.js
// Przykład użycia dashboardu z HttpOnly cookies (bez localStorage)

const testDashboardEndpoint = async () => {
  const baseUrl = 'http://localhost:5000';
  
  try {
    // Test endpoint dashboardu - używa HttpOnly cookies automatycznie
    const response = await fetch(`${baseUrl}/api/users/dashboard`, {
      method: 'GET',
      credentials: 'include', // WAŻNE: wysyła HttpOnly cookies
      headers: {
        'Content-Type': 'application/json'
        // USUNIĘTO: 'Authorization': `Bearer ${localStorage.getItem('token')}`
        // Token jest teraz automatycznie wysyłany przez cookies
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Dashboard data:', data);
      return data;
    } else {
      console.error('Dashboard request failed:', response.status, response.statusText);
      
      // Jeśli 401, użytkownik nie jest zalogowany
      if (response.status === 401) {
        console.log('Użytkownik nie jest zalogowany - przekieruj do logowania');
        // window.location.href = '/login';
      }
      
      return null;
    }
  } catch (error) {
    console.error('Dashboard request error:', error);
    return null;
  }
};

// Test z axios (alternatywna metoda)
const testDashboardWithAxios = async () => {
  const axios = require('axios'); // lub import axios from 'axios';
  const baseUrl = 'http://localhost:5000';
  
  try {
    const response = await axios.get(`${baseUrl}/api/users/dashboard`, {
      withCredentials: true, // WAŻNE: wysyła HttpOnly cookies
      headers: {
        'Content-Type': 'application/json'
        // USUNIĘTO: 'Authorization': `Bearer ${localStorage.getItem('token')}`
        // Token jest teraz automatycznie wysyłany przez cookies
      }
    });
    
    console.log('Dashboard data (axios):', response.data);
    return response.data;
  } catch (error) {
    console.error('Dashboard request error (axios):', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('Użytkownik nie jest zalogowany - przekieruj do logowania');
      // window.location.href = '/login';
    }
    
    return null;
  }
};

// Przykład użycia w komponencie React
const DashboardComponent = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Użyj HttpOnly cookies - bez localStorage
        const data = await testDashboardEndpoint();
        
        if (data) {
          setDashboardData(data);
        } else {
          setError('Nie udało się załadować danych dashboardu');
        }
      } catch (err) {
        setError('Błąd podczas ładowania dashboardu');
        console.error('Dashboard loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) return <div>Ładowanie dashboardu...</div>;
  if (error) return <div>Błąd: {error}</div>;
  if (!dashboardData) return <div>Brak danych dashboardu</div>;

  return (
    <div>
      <h2>Dashboard</h2>
      <pre>{JSON.stringify(dashboardData, null, 2)}</pre>
    </div>
  );
};

// Eksport funkcji testowych
module.exports = {
  testDashboardEndpoint,
  testDashboardWithAxios,
  DashboardComponent
};

// Jeśli uruchamiasz bezpośrednio ten plik
if (require.main === module) {
  console.log('🧪 Testowanie dashboardu z HttpOnly cookies...');
  testDashboardEndpoint()
    .then(data => {
      if (data) {
        console.log('✅ Test dashboardu zakończony pomyślnie');
      } else {
        console.log('❌ Test dashboardu nieudany - sprawdź autoryzację');
      }
    })
    .catch(error => {
      console.error('❌ Błąd testu dashboardu:', error);
    });
}
