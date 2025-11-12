# appoitment system, pwch lab5-6

## API Endpoints

### Osoby
- `GET /api/people` - Lista wszystkich osób
- `POST /api/people` - Dodawanie nowej osoby
- `GET /api/people/{id}` - Szczegóły osoby
- `PUT /api/people/{id}` - Aktualizacja osoby
- `DELETE /api/people/{id}` - Usuwanie osoby

### Harmonogramy
- `GET /api/people/{id}/availability` - Pobranie harmonogramu
- `PUT /api/people/{id}/availability` - Aktualizacja harmonogramu

### Wyszukiwanie slotów
- `POST /api/slots/find` - Wyszukiwanie wspólnych slotów

### Rezerwacje
- `GET /api/bookings` - Lista rezerwacji
- `POST /api/bookings` - Tworzenie rezerwacji
- `GET /api/bookings/{id}` - Szczegóły rezerwacji
- `DELETE /api/bookings/{id}` - Anulowanie rezerwacji