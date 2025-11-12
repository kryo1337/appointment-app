import { useState, useEffect } from 'react';
import { peopleAPI, bookingsAPI } from '../services/api';

const BookingsList = () => {
  const [bookings, setBookings] = useState([]);
  const [people, setPeople] = useState([]);
  const [selectedPersonIds, setSelectedPersonIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPeople();
    loadBookings();
  }, []);

  useEffect(() => {
    loadBookings();
  }, [selectedPersonIds]);

  const loadPeople = async () => {
    try {
      const response = await peopleAPI.getAll();
      setPeople(response.data);
    } catch (err) {
      console.error('Error loading people:', err);
      setError('Błąd podczas ładowania osób: ' + (err.response?.data?.error || err.message));
    }
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingsAPI.getAll(
        selectedPersonIds.length > 0 ? selectedPersonIds : null
      );
      setBookings(response.data);
    } catch (err) {
      console.error('Error loading bookings:', err);
      setError('Błąd podczas ładowania rezerwacji: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handlePersonToggle = (personId) => {
    setSelectedPersonIds((prev) => {
      if (prev.includes(personId)) {
        return prev.filter((id) => id !== personId);
      } else {
        return [...prev, personId];
      }
    });
  };

  const handleDelete = async (bookingId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę rezerwację?')) {
      return;
    }

    try {
      await bookingsAPI.delete(bookingId);
      loadBookings();
    } catch (err) {
      console.error('Error deleting booking:', err);
      setError('Błąd podczas usuwania rezerwacji: ' + (err.response?.data?.error || err.message));
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPersonNames = (personIds) => {
    return personIds
      .map((id) => {
        const person = people.find((p) => p.id === id);
        return person ? person.name : id;
      })
      .join(', ');
  };

  const getSelectedPeopleNames = () => {
    return people
      .filter((p) => selectedPersonIds.includes(p.id))
      .map((p) => p.name)
      .join(', ');
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Lista rezerwacji</h2>

      <div className="mb-6 bg-gray-50 p-6 rounded-lg shadow-sm">
        <div className="space-y-4">
          <label className="block font-semibold text-gray-700">Filtruj po osobach:</label>
          <div className="flex flex-wrap gap-3">
            {people.length === 0 ? (
              <div className="text-gray-500 italic p-3">Brak osób. Dodaj osoby w sekcji zarządzania.</div>
            ) : (
              people.map((person) => (
                <label
                  key={person.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPersonIds.includes(person.id)
                      ? 'bg-white border-[#4CAF50] bg-[#f0f8f0]'
                      : 'bg-white border-gray-300 hover:border-[#4CAF50] hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPersonIds.includes(person.id)}
                    onChange={() => handlePersonToggle(person.id)}
                    className="w-4 h-4 cursor-pointer text-[#4CAF50] focus:ring-[#4CAF50] rounded"
                  />
                  <span className={selectedPersonIds.includes(person.id) ? 'font-semibold text-[#4CAF50]' : 'text-gray-700'}>
                    {person.name}
                  </span>
                </label>
              ))
            )}
          </div>
          {selectedPersonIds.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-center gap-3 flex-wrap">
              <span className="text-gray-700">Filtrowanie:</span>
              <strong className="text-[#4CAF50]">{getSelectedPeopleNames()}</strong>
              <button
                onClick={() => setSelectedPersonIds([])}
                className="px-3 py-1.5 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Wyczyść filtr
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-600 text-lg">Ładowanie rezerwacji...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 px-4 text-gray-500 text-base bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          {selectedPersonIds.length > 0
            ? 'Brak rezerwacji dla wybranych osób'
            : 'Brak rezerwacji. Utwórz nową rezerwację w zakładce "Wyszukiwanie".'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-4 pb-4 border-b-2 border-gray-100">
                <h3 className="text-xl font-semibold text-gray-800 flex-1">{booking.title || 'Bez tytułu'}</h3>
                <button
                  onClick={() => handleDelete(booking.id)}
                  title="Usuń rezerwację"
                  className="w-8 h-8 bg-red-500 text-white rounded-full text-2xl leading-none flex items-center justify-center hover:bg-red-600 transition-colors flex-shrink-0"
                >
                  ×
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="font-semibold text-gray-600 min-w-[80px]">Data:</span>
                  <span className="text-gray-800 flex-1">{formatDate(booking.startTime)}</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-semibold text-gray-600 min-w-[80px]">Godzina:</span>
                  <span className="text-gray-800 flex-1">
                    {formatDateTime(booking.startTime).split(', ')[1]} -{' '}
                    {formatDateTime(booking.endTime).split(', ')[1]}
                  </span>
                </div>
                <div className="flex gap-3">
                  <span className="font-semibold text-gray-600 min-w-[80px]">Osoby:</span>
                  <span className="text-gray-800 flex-1">{getPersonNames(booking.personIds)}</span>
                </div>
                {booking.description && (
                  <div className="flex gap-3">
                    <span className="font-semibold text-gray-600 min-w-[80px]">Opis:</span>
                    <span className="text-gray-800 flex-1">{booking.description}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingsList;

