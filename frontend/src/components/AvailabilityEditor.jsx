import { useState, useEffect } from 'react';
import { peopleAPI, availabilityAPI } from '../services/api';

const DAYS = [
  { value: 0, label: 'Poniedziałek', short: 'Pn' },
  { value: 1, label: 'Wtorek', short: 'Wt' },
  { value: 2, label: 'Środa', short: 'Śr' },
  { value: 3, label: 'Czwartek', short: 'Cz' },
  { value: 4, label: 'Piątek', short: 'Pt' },
  { value: 5, label: 'Sobota', short: 'Sb' },
  { value: 6, label: 'Niedziela', short: 'Nd' },
];

const AvailabilityEditor = () => {
  const [people, setPeople] = useState([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadPeople();
  }, []);

  useEffect(() => {
    if (selectedPersonId) {
      loadAvailability(selectedPersonId);
    } else {
      setAvailability([]);
    }
  }, [selectedPersonId]);

  const loadPeople = async () => {
    console.log('AvailabilityEditor: Starting to load people...');
    try {
      const response = await peopleAPI.getAll();
      console.log(`AvailabilityEditor: Loaded ${response.data.length} people`, response.data);
      setPeople(response.data);
    } catch (err) {
      console.error('AvailabilityEditor: Error loading people:', err);
      setError('Błąd podczas ładowania osób: ' + (err.response?.data?.error || err.message));
    }
  };

  const loadAvailability = async (personId) => {
    console.log(`AvailabilityEditor: Loading availability for person ID: ${personId}`);
    try {
      setLoading(true);
      const response = await availabilityAPI.get(personId);
      const availabilityData = response.data.availability || [];
      console.log(`AvailabilityEditor: Loaded availability:`, availabilityData);
      setAvailability(availabilityData);
      setError(null);
    } catch (err) {
      console.error('AvailabilityEditor: Error loading availability:', err);
      setError('Błąd podczas ładowania harmonogramu: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getDayAvailability = (day) => {
    return availability.find(a => a.day === day) || { day, timeSlots: [] };
  };

  const addTimeSlot = (day) => {
    const dayAvail = getDayAvailability(day);
    const newTimeSlots = [...dayAvail.timeSlots, { start: '09:00', end: '17:00' }];
    updateDayAvailability(day, newTimeSlots);
  };

  const removeTimeSlot = (day, index) => {
    const dayAvail = getDayAvailability(day);
    const newTimeSlots = dayAvail.timeSlots.filter((_, i) => i !== index);
    updateDayAvailability(day, newTimeSlots);
  };

  const updateTimeSlot = (day, index, field, value) => {
    const dayAvail = getDayAvailability(day);
    const newTimeSlots = [...dayAvail.timeSlots];
    newTimeSlots[index] = { ...newTimeSlots[index], [field]: value };
    updateDayAvailability(day, newTimeSlots);
  };

  const updateDayAvailability = (day, timeSlots) => {
    const filteredAvailability = availability.filter(a => a.day !== day);
    if (timeSlots.length > 0) {
      filteredAvailability.push({ day, timeSlots });
    }
    setAvailability(filteredAvailability);
  };

  const handleSave = async () => {
    if (!selectedPersonId) {
      setError('Wybierz osobę');
      return;
    }

    console.log(`AvailabilityEditor: Saving availability for person ID: ${selectedPersonId}`, availability);
    try {
      setLoading(true);
      await availabilityAPI.update(selectedPersonId, availability);
      console.log('AvailabilityEditor: Availability saved successfully');
      setSuccess('Harmonogram zapisany pomyślnie!');
      setError(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('AvailabilityEditor: Error saving availability:', err);
      setError('Błąd podczas zapisywania: ' + (err.response?.data?.error || err.message));
      setSuccess(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = () => {
    const defaultAvail = [
      { day: 0, timeSlots: [{ start: '08:00', end: '16:00' }] },
      { day: 1, timeSlots: [{ start: '08:00', end: '16:00' }] },
      { day: 2, timeSlots: [{ start: '08:00', end: '16:00' }] },
      { day: 3, timeSlots: [{ start: '08:00', end: '16:00' }] },
      { day: 4, timeSlots: [{ start: '08:00', end: '16:00' }] },
    ];
    setAvailability(defaultAvail);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Edycja harmonogramów pracy</h2>

      <div className="mb-6 bg-gray-50 p-6 rounded-lg shadow-sm">
        <label htmlFor="person-select" className="block mb-3 font-semibold text-gray-700">
          Wybierz osobę:
        </label>
        <select
          id="person-select"
          value={selectedPersonId}
          onChange={(e) => setSelectedPersonId(e.target.value)}
          disabled={loading}
          className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50] focus:border-[#4CAF50] outline-none transition-all disabled:opacity-50"
        >
          <option value="">-- Wybierz osobę --</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
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

      {selectedPersonId && (
        <>
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              onClick={handleSetDefault}
              disabled={loading}
              className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Ustaw domyślny (Pn-Pt 8:00-16:00)
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2.5 bg-[#4CAF50] text-white rounded-lg font-medium hover:bg-[#45a049] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              {loading ? 'Zapisywanie...' : 'Zapisz harmonogram'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DAYS.map((day) => {
              const dayAvail = getDayAvailability(day.value);
              return (
                <div
                  key={day.value}
                  className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200">
                    {day.label}
                  </h3>
                  <div className="space-y-3">
                    {dayAvail.timeSlots.map((slot, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) => updateTimeSlot(day.value, index, 'start', e.target.value)}
                          disabled={loading}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#4CAF50] focus:border-[#4CAF50] outline-none disabled:opacity-50"
                        />
                        <span className="text-gray-600">-</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => updateTimeSlot(day.value, index, 'end', e.target.value)}
                          disabled={loading}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#4CAF50] focus:border-[#4CAF50] outline-none disabled:opacity-50"
                        />
                        <button
                          onClick={() => removeTimeSlot(day.value, index)}
                          disabled={loading}
                          className="w-8 h-8 bg-red-500 text-white rounded-full text-xl leading-none flex items-center justify-center hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addTimeSlot(day.value)}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-2 border-dashed border-gray-300"
                    >
                      + Dodaj przedział
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!selectedPersonId && (
        <div className="text-center py-16 px-4 text-gray-500 text-base bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          Wybierz osobę, aby edytować jej harmonogram pracy
        </div>
      )}
    </div>
  );
};

export default AvailabilityEditor;

