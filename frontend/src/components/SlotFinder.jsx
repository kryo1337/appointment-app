import { useState, useEffect } from 'react';
import { peopleAPI, slotsAPI } from '../services/api';

const SlotFinder = ({ onSlotSelect }) => {
  const [people, setPeople] = useState([]);
  const [selectedPersonIds, setSelectedPersonIds] = useState([]);
  const [date, setDate] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPeople();
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
  }, []);

  const loadPeople = async () => {
    console.log('SlotFinder: Starting to load people...');
    try {
      const response = await peopleAPI.getAll();
      console.log(`SlotFinder: Loaded ${response.data.length} people`, response.data);
      setPeople(response.data);
    } catch (err) {
      console.error('SlotFinder: Error loading people:', err);
      setError('Błąd podczas ładowania osób: ' + (err.response?.data?.error || err.message));
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

  const handleSearch = async () => {
    if (selectedPersonIds.length === 0) {
      setError('Wybierz co najmniej jedną osobę');
      return;
    }

    if (!date) {
      setError('Wybierz datę');
      return;
    }

    console.log('SlotFinder: Searching for slots:', {
      personIds: selectedPersonIds,
      date,
      durationMinutes,
    });
    try {
      setLoading(true);
      setError(null);
      const response = await slotsAPI.find(selectedPersonIds, date, durationMinutes);
      const foundSlots = Array.isArray(response.data) ? response.data : (response.data.slots || []);
      console.log(`SlotFinder: Found ${foundSlots.length} slots`, foundSlots);
      setSlots(foundSlots);
      
      if (foundSlots.length === 0) {
        console.warn('SlotFinder: No available slots for selected criteria');
        setError('Brak dostępnych slotów dla wybranych osób w tym dniu');
      }
    } catch (err) {
      console.error('SlotFinder: Error searching for slots:', err);
      setError('Błąd podczas wyszukiwania: ' + (err.response?.data?.error || err.message));
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
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

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Wyszukiwanie wspólnych terminów</h2>

      <div className="bg-gray-50 p-6 rounded-lg shadow-sm mb-6 space-y-6">
        <div>
          <label className="block mb-3 font-semibold text-gray-700">Wybierz osoby:</label>
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
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <span className="text-gray-700">Wybrane: </span>
              <strong className="text-[#4CAF50]">{getSelectedPeopleNames()}</strong>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="block mb-2 font-medium text-gray-700">
              Data:
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50] focus:border-[#4CAF50] outline-none transition-all"
            />
          </div>

          <div>
            <label htmlFor="duration" className="block mb-2 font-medium text-gray-700">
              Czas trwania (minuty):
            </label>
            <select
              id="duration"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50] focus:border-[#4CAF50] outline-none transition-all"
            >
              <option value={15}>15 minut</option>
              <option value={30}>30 minut</option>
              <option value={60}>1 godzina</option>
              <option value={90}>1.5 godziny</option>
              <option value={120}>2 godziny</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full md:w-auto px-8 py-3 bg-[#4CAF50] text-white rounded-lg font-medium hover:bg-[#45a049] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-md hover:shadow-lg"
        >
          {loading ? 'Wyszukiwanie...' : 'Szukaj slotów'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
          {error}
        </div>
      )}

      {slots.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Dostępne sloty dla {formatDate(date)} ({slots.length} znalezionych)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {slots.map((slot, index) => (
              <div
                key={index}
                className="bg-white border-2 border-[#4CAF50] rounded-lg p-4 cursor-pointer hover:bg-[#f0f8f0] hover:shadow-md transition-all duration-200 text-center"
                onClick={() => onSlotSelect && onSlotSelect(slot, selectedPersonIds)}
              >
                <div className="text-lg font-semibold text-gray-800 mb-1">
                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                </div>
                <div className="text-sm text-gray-600">
                  {durationMinutes} minut
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && slots.length === 0 && selectedPersonIds.length > 0 && date && !error && (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          Kliknij "Szukaj slotów", aby znaleźć dostępne terminy
        </div>
      )}
    </div>
  );
};

export default SlotFinder;

