import { useState, useEffect } from 'react';
import { peopleAPI, bookingsAPI } from '../services/api';

const BookingForm = ({ selectedSlot, selectedPersonIds, onBookingComplete }) => {
  const [people, setPeople] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadPeople();
  }, []);

  const loadPeople = async () => {
    console.log('BookingForm: Starting to load people...');
    try {
      const response = await peopleAPI.getAll();
      console.log(`BookingForm: Loaded ${response.data.length} people`, response.data);
      setPeople(response.data);
    } catch (err) {
      console.error('BookingForm: Error loading people:', err);
      setError('Błąd podczas ładowania osób: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSlot) {
      setError('Wybierz slot przed rezerwacją');
      return;
    }

    if (!selectedPersonIds || selectedPersonIds.length === 0) {
      setError('Wybierz co najmniej jedną osobę');
      return;
    }

    if (!formData.title.trim()) {
      setError('Tytuł jest wymagany');
      return;
    }

    console.log('BookingForm: Creating booking:', {
      selectedSlot,
      selectedPersonIds,
      formData,
    });
    try {
      setLoading(true);
      setError(null);

      const bookingData = {
        personIds: selectedPersonIds,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        title: formData.title,
        description: formData.description,
      };

      console.log('BookingForm: Sending booking data:', bookingData);
      await bookingsAPI.create(bookingData);
      console.log('BookingForm: Booking created successfully');
      
      setSuccess('Rezerwacja utworzona pomyślnie!');
      setFormData({ title: '', description: '' });
      
      if (onBookingComplete) {
        setTimeout(() => {
          onBookingComplete();
        }, 2000);
      }
    } catch (err) {
      console.error('BookingForm: Error creating booking:', err);
      setError('Błąd podczas tworzenia rezerwacji: ' + (err.response?.data?.error || err.message));
      setSuccess(null);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleDateString('pl-PL', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getSelectedPeopleNames = () => {
    return people
      .filter((p) => selectedPersonIds.includes(p.id))
      .map((p) => p.name)
      .join(', ');
  };

  if (!selectedSlot) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Rezerwacja spotkania</h2>
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          Wybierz slot w sekcji wyszukiwania, aby utworzyć rezerwację
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Rezerwacja spotkania</h2>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Szczegóły slotu</h3>
        <div className="space-y-2">
          <div className="flex gap-3">
            <strong className="text-gray-700 min-w-[80px]">Data:</strong>
            <span className="text-gray-800">{formatDate(selectedSlot.startTime)}</span>
          </div>
          <div className="flex gap-3">
            <strong className="text-gray-700 min-w-[80px]">Godzina:</strong>
            <span className="text-gray-800">
              {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
            </span>
          </div>
          <div className="flex gap-3">
            <strong className="text-gray-700 min-w-[80px]">Osoby:</strong>
            <span className="text-gray-800">{getSelectedPeopleNames() || 'Brak wybranych osób'}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border-l-4 border-[#4CAF50] text-green-700 rounded-r-lg">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg shadow-sm space-y-4">
        <div>
          <label htmlFor="title" className="block mb-2 font-medium text-gray-700">
            Tytuł spotkania *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="np. Konsultacja projektowa"
            required
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50] focus:border-[#4CAF50] outline-none transition-all disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="description" className="block mb-2 font-medium text-gray-700">
            Opis (opcjonalnie)
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Dodatkowe informacje o spotkaniu..."
            rows={4}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50] focus:border-[#4CAF50] outline-none transition-all disabled:opacity-50 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !selectedPersonIds || selectedPersonIds.length === 0}
          className="w-full px-6 py-3 bg-[#4CAF50] text-white rounded-lg font-medium hover:bg-[#45a049] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-md hover:shadow-lg"
        >
          {loading ? 'Rezerwowanie...' : 'Zarezerwuj spotkanie'}
        </button>
      </form>
    </div>
  );
};

export default BookingForm;

