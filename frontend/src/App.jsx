import { useState } from 'react';
import PersonManager from './components/PersonManager';
import AvailabilityEditor from './components/AvailabilityEditor';
import SlotFinder from './components/SlotFinder';
import BookingForm from './components/BookingForm';
import BookingsList from './components/BookingsList';

function App() {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedPersonIds, setSelectedPersonIds] = useState([]);
  const [activeTab, setActiveTab] = useState('people');

  const handleSlotSelect = (slot, personIds) => {
    setSelectedSlot(slot);
    setSelectedPersonIds(personIds);
    setActiveTab('booking');
  };

  const handleBookingComplete = () => {
    setSelectedSlot(null);
    setSelectedPersonIds([]);
    setActiveTab('bookings');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-br from-[#4CAF50] to-[#45a049] text-white shadow-md">
        <div className="container mx-auto px-4 py-5">
          <h1 className="text-center text-2xl md:text-3xl font-semibold mb-5">System umawiania spotkań</h1>
          <nav className="flex justify-center gap-2 flex-wrap">
            <button
              className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'people'
                  ? 'bg-white text-[#4CAF50] border-2 border-white shadow-sm'
                  : 'bg-white/20 text-white border-2 border-transparent hover:bg-white/30'
              }`}
              onClick={() => setActiveTab('people')}
            >
              Osoby
            </button>
            <button
              className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'availability'
                  ? 'bg-white text-[#4CAF50] border-2 border-white shadow-sm'
                  : 'bg-white/20 text-white border-2 border-transparent hover:bg-white/30'
              }`}
              onClick={() => setActiveTab('availability')}
            >
              Harmonogramy
            </button>
            <button
              className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'slots'
                  ? 'bg-white text-[#4CAF50] border-2 border-white shadow-sm'
                  : 'bg-white/20 text-white border-2 border-transparent hover:bg-white/30'
              }`}
              onClick={() => setActiveTab('slots')}
            >
              Wyszukiwanie
            </button>
            <button
              className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'bookings'
                  ? 'bg-white text-[#4CAF50] border-2 border-white shadow-sm'
                  : 'bg-white/20 text-white border-2 border-transparent hover:bg-white/30'
              }`}
              onClick={() => setActiveTab('bookings')}
            >
              Rezerwacje
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 py-5">
        {activeTab === 'people' && <PersonManager />}
        {activeTab === 'availability' && <AvailabilityEditor />}
        {activeTab === 'slots' && (
          <SlotFinder
            onSlotSelect={(slot, personIds) => {
              setSelectedSlot(slot);
              setSelectedPersonIds(personIds);
              setActiveTab('booking');
            }}
          />
        )}
        {activeTab === 'bookings' && <BookingsList />}
        {activeTab === 'booking' && selectedSlot && (
          <BookingForm
            selectedSlot={selectedSlot}
            selectedPersonIds={selectedPersonIds}
            onBookingComplete={handleBookingComplete}
          />
        )}
        {activeTab === 'booking' && !selectedSlot && (
          <div className="container mx-auto px-4 py-10 text-center">
            <p className="text-lg text-gray-600 mb-5">
              Wybierz slot w zakładce "Wyszukiwanie", aby utworzyć rezerwację.
            </p>
            <button
              onClick={() => setActiveTab('slots')}
              className="px-6 py-3 bg-[#4CAF50] text-white rounded-lg cursor-pointer text-base font-medium hover:bg-[#45a049] transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              Przejdź do wyszukiwania
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

