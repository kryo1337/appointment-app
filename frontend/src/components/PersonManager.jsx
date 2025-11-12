import { useState, useEffect } from 'react';
import { peopleAPI } from '../services/api';

const PersonManager = () => {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  useEffect(() => {
    loadPeople();
  }, []);

  const loadPeople = async () => {
    console.log('PersonManager: Starting to load people...');
    try {
      setLoading(true);
      const response = await peopleAPI.getAll();
      console.log(`PersonManager: Loaded ${response.data.length} people`, response.data);
      setPeople(response.data);
      setError(null);
    } catch (err) {
      console.error('PersonManager: Error loading people:', err);
      setError('Błąd podczas ładowania osób: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Nazwa jest wymagana');
      return;
    }

    console.log(`PersonManager: ${editingId ? 'Updating' : 'Creating'} person:`, formData);
    try {
      setLoading(true);
      if (editingId) {
        console.log(`PersonManager: Updating person ID: ${editingId}`);
        await peopleAPI.update(editingId, formData);
        console.log(`PersonManager: Person ${editingId} updated`);
      } else {
        console.log('PersonManager: Creating new person');
        await peopleAPI.create(formData);
        console.log('PersonManager: New person created');
      }
      setFormData({ name: '', email: '' });
      setEditingId(null);
      await loadPeople();
      setError(null);
    } catch (err) {
      console.error('PersonManager: Error saving:', err);
      setError('Błąd podczas zapisywania: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (person) => {
    setFormData({
      name: person.name,
      email: person.email || '',
    });
    setEditingId(person.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę osobę?')) {
      return;
    }

    console.log(`PersonManager: Deleting person ID: ${id}`);
    try {
      setLoading(true);
      await peopleAPI.delete(id);
      console.log(`PersonManager: Person ${id} deleted`);
      await loadPeople();
      setError(null);
    } catch (err) {
      console.error('PersonManager: Error deleting:', err);
      setError('Błąd podczas usuwania: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', email: '' });
    setEditingId(null);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Zarządzanie osobami</h2>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-6 rounded-lg shadow-sm">
        <div className="mb-4">
          <label htmlFor="name" className="block mb-2 font-medium text-gray-700">
            Nazwa *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50] focus:border-[#4CAF50] outline-none transition-all"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="email" className="block mb-2 font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50] focus:border-[#4CAF50] outline-none transition-all"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#4CAF50] text-white rounded-lg font-medium hover:bg-[#45a049] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            {editingId ? 'Zaktualizuj' : 'Dodaj'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Anuluj
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">Lista osób ({people.length})</h3>
        </div>
        
        {loading && (
          <div className="p-8 text-center text-gray-600">Ładowanie...</div>
        )}
        
        {!loading && people.length === 0 && (
          <div className="p-8 text-center text-gray-500 italic bg-gray-50">
            Brak osób. Dodaj pierwszą osobę powyżej.
          </div>
        )}

        {!loading && people.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nazwa</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Akcje</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {people.map((person) => (
                  <tr key={person.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {person.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {person.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(person)}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          disabled={loading}
                        >
                          Edytuj
                        </button>
                        <button
                          onClick={() => handleDelete(person.id)}
                          className="px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          disabled={loading}
                        >
                          Usuń
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonManager;

