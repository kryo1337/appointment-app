from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import sys
import os
from datetime import timedelta

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from functions.storage_client import get_people_container, get_bookings_container
from functions.utils import (
    parse_datetime, get_day_of_week, get_time_slots_for_day,
    slots_overlap, default_availability
)

def validate_booking_availability_wrapper(person_ids, start_time, end_time):
    from datetime import datetime
    
    people_container = get_people_container()
    bookings_container = get_bookings_container()
    
    people = []
    for person_id in person_ids:
        try:
            person = people_container.read_item(item=person_id, partition_key=person_id)
            people.append(person)
        except Exception as e:
            return False, f'Person {person_id} not found'
    
    if isinstance(start_time, str):
        start_time = parse_datetime(start_time)
    if isinstance(end_time, str):
        end_time = parse_datetime(end_time)
    
    day_of_week = get_day_of_week(start_time)
    target_date = start_time.date() if isinstance(start_time, datetime) else start_time
    
    for person in people:
        availability = person.get('availability', [])
        person_slots = get_time_slots_for_day(availability, day_of_week, target_date)
        
        fits_in_schedule = False
        for slot in person_slots:
            if slot['start'] <= start_time and end_time <= slot['end']:
                fits_in_schedule = True
                break
        
        if not fits_in_schedule:
            return False, f'Person {person["name"]} is not available at this time according to their schedule'
    
    query = 'SELECT * FROM c'
    all_bookings = list(bookings_container.query_items(
        query="SELECT * FROM c",
        enable_cross_partition_query=True
    ))
    
    existing_bookings = [
        b for b in all_bookings
        if any(pid in b.get('personIds', []) for pid in person_ids)
    ]
    
    for booking in existing_bookings:
        booking_start = parse_datetime(booking['startTime'])
        booking_end = parse_datetime(booking['endTime'])
        booking_person_ids = booking.get('personIds', [])
        
        if any(pid in person_ids for pid in booking_person_ids):
            if slots_overlap(start_time, end_time, booking_start, booking_end):
                return False, f'Conflict with existing booking'
    
    return True, None

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.route('/api/people', methods=['GET', 'POST'])
def people():
    container = get_people_container()
    
    if request.method == 'GET':
        try:
            items = list(container.query_items(query="SELECT * FROM c", enable_cross_partition_query=True))
            return jsonify(items), 200
        except Exception as e:
            logger.error(f"Error getting people: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            if not data or 'name' not in data:
                return jsonify({"error": "Name is required"}), 400
            
            item = {
                'id': data.get('id') or str(os.urandom(16).hex()),
                'name': data['name'],
                'email': data.get('email', ''),
                'availability': data.get('availability', default_availability())
            }
            container.create_item(body=item)
            return jsonify(item), 201
        except Exception as e:
            logger.error(f"Error creating person: {str(e)}")
            return jsonify({"error": str(e)}), 500


@app.route('/api/people/<person_id>', methods=['GET', 'PUT', 'DELETE'])
def person(person_id):
    container = get_people_container()
    
    try:
        if request.method == 'GET':
            item = container.read_item(item=person_id, partition_key=person_id)
            return jsonify(item), 200
        
        elif request.method == 'PUT':
            data = request.get_json()
            if not data:
                return jsonify({"error": "Request body required"}), 400
            
            item = container.read_item(item=person_id, partition_key=person_id)
            item['name'] = data.get('name', item.get('name'))
            item['email'] = data.get('email', item.get('email', ''))
            container.replace_item(item=person_id, body=item)
            return jsonify(item), 200
        
        elif request.method == 'DELETE':
            container.delete_item(item=person_id, partition_key=person_id)
            return jsonify({"message": "Person deleted"}), 200
    
    except Exception as e:
        logger.error(f"Error with person {person_id}: {str(e)}")
        if 'not found' in str(e).lower() or '404' in str(e):
            return jsonify({"error": "Person not found"}), 404
        return jsonify({"error": str(e)}), 500


@app.route('/api/people/<person_id>/availability', methods=['GET', 'PUT'])
def availability(person_id):
    container = get_people_container()
    
    try:
        if request.method == 'GET':
            try:
                person = container.read_item(item=person_id, partition_key=person_id)
                availability = person.get('availability', [])
                return jsonify({"personId": person_id, "availability": availability}), 200
            except Exception as e:
                if 'not found' in str(e).lower():
                    return jsonify({"error": "Person not found"}), 404
                return jsonify({"personId": person_id, "availability": []}), 200
        
        elif request.method == 'PUT':
            data = request.get_json()
            availability = data.get('availability', [])
            
            person = container.read_item(item=person_id, partition_key=person_id)
            person['availability'] = availability
            container.replace_item(item=person_id, body=person)
            return jsonify({"personId": person_id, "availability": availability}), 200
    
    except Exception as e:
        logger.error(f"Error with availability for {person_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/slots/find', methods=['POST', 'OPTIONS'])
def slots():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body required"}), 400
        
        person_ids = data.get('personIds', [])
        date_str = data.get('date')
        duration_minutes = data.get('durationMinutes', 60)
        
        if not person_ids or not date_str:
            return jsonify({"error": "personIds and date are required"}), 400
        
        target_date = parse_datetime(date_str)
        day_of_week = get_day_of_week(target_date)
        
        people_container = get_people_container()
        bookings_container = get_bookings_container()
        
        all_people = list(people_container.query_items(query="SELECT * FROM c", enable_cross_partition_query=True))
        selected_people = [p for p in all_people if p['id'] in person_ids]
        
        if not selected_people:
            return jsonify({"error": "No valid people found"}), 400
        
        all_person_slots = []
        for person in selected_people:
            person_avail = person.get('availability', [])
            person_slots = get_time_slots_for_day(person_avail, day_of_week, target_date)
            if person_slots:
                all_person_slots.append(person_slots)
            else:
                return jsonify([]), 200
        
        if not all_person_slots or len(all_person_slots) != len(selected_people):
            return jsonify([]), 200
        
        first_person_slots = all_person_slots[0]
        common_time_ranges = []
        
        for slot in first_person_slots:
            slot_start = slot['start']
            slot_end = slot['end']
            
            current_ranges = [(slot_start, slot_end)]
            
            for other_person_slots in all_person_slots[1:]:
                new_ranges = []
                for range_start, range_end in current_ranges:
                    for other_slot in other_person_slots:
                        other_start = other_slot['start']
                        other_end = other_slot['end']
                        
                        if slots_overlap(range_start, range_end, other_start, other_end):
                            intersection_start = max(range_start, other_start)
                            intersection_end = min(range_end, other_end)
                            if intersection_start < intersection_end:
                                new_ranges.append((intersection_start, intersection_end))
                
                if not new_ranges:
                    current_ranges = []
                    break
                current_ranges = new_ranges
            
            for range_start, range_end in current_ranges:
                common_time_ranges.append({
                    'start': range_start,
                    'end': range_end
                })
        
        common_slots = []
        all_existing_bookings = []
        try:
            all_existing_bookings = list(bookings_container.query_items(
                query="SELECT * FROM c",
                enable_cross_partition_query=True
            ))
            all_existing_bookings = [
                b for b in all_existing_bookings
                if any(pid in b.get('personIds', []) for pid in person_ids)
            ]
        except Exception as e:
            logger.warning(f"Error loading bookings for conflict check: {str(e)}")
        
        for time_range in common_time_ranges:
            current = time_range['start']
            while current + timedelta(minutes=duration_minutes) <= time_range['end']:
                slot_end_time = current + timedelta(minutes=duration_minutes)
                
                conflicts = False
                for booking in all_existing_bookings:
                    booking_start = parse_datetime(booking['startTime'])
                    booking_end = parse_datetime(booking['endTime'])
                    if slots_overlap(current, slot_end_time, booking_start, booking_end):
                        conflicts = True
                        break
                
                if not conflicts:
                    common_slots.append({
                        'startTime': current.isoformat(),
                        'endTime': slot_end_time.isoformat()
                    })
                
                current += timedelta(minutes=15)
        
        return jsonify(common_slots), 200
    
    except Exception as e:
        logger.error(f"Error finding slots: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/bookings', methods=['GET', 'POST'])
def bookings():
    container = get_bookings_container()
    
    if request.method == 'GET':
        try:
            person_ids_param = request.args.get('personIds')
            person_ids = []
            if person_ids_param:
                if isinstance(person_ids_param, str):
                    person_ids = [pid.strip() for pid in person_ids_param.split(',') if pid.strip()]
                else:
                    person_ids = person_ids_param if isinstance(person_ids_param, list) else [person_ids_param]
            
            query = "SELECT * FROM c"
            
            if person_ids:
                items = list(container.query_items(query=query, enable_cross_partition_query=True))
                filtered = [
                    item for item in items
                    if any(pid in item.get('personIds', []) for pid in person_ids)
                ]
                return jsonify(filtered), 200
            else:
                items = list(container.query_items(query=query, enable_cross_partition_query=True))
                return jsonify(items), 200
        except Exception as e:
            logger.error(f"Error getting bookings: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Request body required"}), 400
            
            person_ids = data.get('personIds', [])
            start_time = data.get('startTime')
            end_time = data.get('endTime')
            title = data.get('title', '')
            description = data.get('description', '')
            
            if not person_ids or not start_time or not end_time:
                return jsonify({"error": "personIds, startTime, and endTime are required"}), 400
            
            start_dt = parse_datetime(start_time)
            end_dt = parse_datetime(end_time)
            is_valid, error = validate_booking_availability_wrapper(person_ids, start_dt, end_dt)
            if not is_valid:
                return jsonify({"error": error}), 400
            
            booking = {
                'id': str(os.urandom(16).hex()),
                'personIds': person_ids,
                'startTime': start_time,
                'endTime': end_time,
                'title': title,
                'description': description
            }
            
            container.create_item(body=booking)
            return jsonify(booking), 201
        
        except Exception as e:
            logger.error(f"Error creating booking: {str(e)}")
            return jsonify({"error": str(e)}), 500


@app.route('/api/bookings/<booking_id>', methods=['DELETE'])
def booking(booking_id):
    container = get_bookings_container()
    
    try:
        container.delete_item(item=booking_id, partition_key=booking_id)
        return jsonify({"message": "Booking deleted"}), 200
    except Exception as e:
        logger.error(f"Error deleting booking {booking_id}: {str(e)}")
        if 'not found' in str(e).lower():
            return jsonify({"error": "Booking not found"}), 404
        return jsonify({"error": str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8000)), debug=False)

