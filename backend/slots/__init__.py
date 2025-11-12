import logging
import json
import azure.functions as func
from datetime import datetime, timedelta
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from functions.storage_client import get_people_container, get_bookings_container
from functions.utils import (
    parse_datetime, get_day_of_week, get_time_slots_for_day,
    slots_overlap
)
from functions.cors import add_cors_headers

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Slots function processed a request.')
    
    if req.method == 'OPTIONS':
        return func.HttpResponse(
            '',
            status_code=200,
            headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        )
    
    try:
        if req.method != 'POST':
            response = func.HttpResponse(
                json.dumps({'error': 'Method not allowed'}),
                status_code=405,
                mimetype='application/json'
            )
            return add_cors_headers(response)
        
        req_body = req.get_json()
        
        if not req_body:
            response = func.HttpResponse(
                json.dumps({'error': 'Request body is required'}),
                status_code=400,
                mimetype='application/json'
            )
            return add_cors_headers(response)
        
        person_ids = req_body.get('personIds', [])
        date_str = req_body.get('date')
        duration_minutes = req_body.get('durationMinutes', 30)
        
        if not person_ids or len(person_ids) == 0:
            response = func.HttpResponse(
                json.dumps({'error': 'At least one person ID is required'}),
                status_code=400,
                mimetype='application/json'
            )
            return add_cors_headers(response)
        
        if not date_str:
            response = func.HttpResponse(
                json.dumps({'error': 'Date is required'}),
                status_code=400,
                mimetype='application/json'
            )
            return add_cors_headers(response)
        
        target_date = parse_datetime(date_str)
        if isinstance(target_date, datetime):
            target_date = target_date.date()
        
        day_of_week = get_day_of_week(target_date)
        
        people_container = get_people_container()
        people = []
        for person_id in person_ids:
            try:
                person = people_container.read_item(item=person_id, partition_key=person_id)
                people.append(person)
            except Exception as e:
                logging.warning(f'Person {person_id} not found: {str(e)}')
                continue
        
        if len(people) == 0:
            response = func.HttpResponse(
                json.dumps({'error': 'No valid people found'}),
                status_code=400,
                mimetype='application/json'
            )
            return add_cors_headers(response)
        
        all_person_slots = []
        for person in people:
            availability = person.get('availability', [])
            person_slots = get_time_slots_for_day(availability, day_of_week, target_date)
            all_person_slots.append({
                'personId': person['id'],
                'slots': person_slots
            })
        
        if len(all_person_slots) == 0:
            response = func.HttpResponse(
                json.dumps({'slots': []}, default=str),
                status_code=200,
                mimetype='application/json'
            )
            return add_cors_headers(response)
        
        common_slots = all_person_slots[0]['slots']
        
        for person_slot_data in all_person_slots[1:]:
            new_common_slots = []
            for common_slot in common_slots:
                for person_slot in person_slot_data['slots']:
                    overlap_start = max(common_slot['start'], person_slot['start'])
                    overlap_end = min(common_slot['end'], person_slot['end'])
                    
                    if overlap_start < overlap_end:
                        new_common_slots.append({
                            'start': overlap_start,
                            'end': overlap_end
                        })
            common_slots = new_common_slots
        
        duration_timedelta = timedelta(minutes=duration_minutes)
        final_slots = []
        
        for slot_range in common_slots:
            current_start = slot_range['start']
            slot_end = slot_range['end']
            
            while current_start + duration_timedelta <= slot_end:
                slot_start_dt = current_start
                slot_end_dt = current_start + duration_timedelta
                
                final_slots.append({
                    'startTime': slot_start_dt.isoformat(),
                    'endTime': slot_end_dt.isoformat()
                })
                
                current_start += duration_timedelta
        
        bookings_container = get_bookings_container()
        
        query = 'SELECT * FROM c'
        all_bookings = list(bookings_container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))
        
        existing_bookings = [
            b for b in all_bookings
            if any(pid in b.get('personIds', []) for pid in person_ids)
        ]
        
        available_slots = []
        for slot in final_slots:
            slot_start = parse_datetime(slot['startTime'])
            slot_end = parse_datetime(slot['endTime'])
            
            has_conflict = False
            for booking in existing_bookings:
                booking_start = parse_datetime(booking['startTime'])
                booking_end = parse_datetime(booking['endTime'])
                booking_person_ids = booking.get('personIds', [])
                
                if not any(pid in person_ids for pid in booking_person_ids):
                    continue
                
                if slots_overlap(slot_start, slot_end, booking_start, booking_end):
                    has_conflict = True
                    break
            
            if not has_conflict:
                available_slots.append(slot)
        
        response = func.HttpResponse(
            json.dumps({'slots': available_slots}, default=str),
            status_code=200,
            mimetype='application/json'
        )
        return add_cors_headers(response)
    
    except Exception as e:
        logging.error(f'Error: {str(e)}')
        response = func.HttpResponse(
            json.dumps({'error': str(e)}),
            status_code=500,
            mimetype='application/json'
        )
        return add_cors_headers(response)

