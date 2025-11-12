import logging
import json
import azure.functions as func
from datetime import datetime
import sys
import os
import uuid

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from functions.storage_client import get_people_container, get_bookings_container
from functions.utils import (
    parse_datetime, get_day_of_week, get_time_slots_for_day,
    slots_overlap
)
from functions.cors import add_cors_headers

def validate_booking_availability(person_ids, start_time, end_time):
    people_container = get_people_container()
    bookings_container = get_bookings_container()
    
    people = []
    for person_id in person_ids:
        try:
            person = people_container.read_item(item=person_id, partition_key=person_id)
            people.append(person)
        except Exception as e:
            return False, f'Person {person_id} not found'
    
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
        query=query,
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

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Bookings function processed a request.')
    
    if req.method == 'OPTIONS':
        return func.HttpResponse(
            '',
            status_code=200,
            headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        )
    
    try:
        bookings_container = get_bookings_container()
        
        if req.method == 'GET':
            person_ids_param = req.params.get('personIds')
            
            if person_ids_param:
                person_ids = person_ids_param.split(',')
                query = 'SELECT * FROM c'
                all_items = list(bookings_container.query_items(
                    query=query,
                    enable_cross_partition_query=True
                ))
                items = [
                    item for item in all_items
                    if any(pid in item.get('personIds', []) for pid in person_ids)
                ]
            else:
                query = 'SELECT * FROM c'
                items = list(bookings_container.query_items(
                    query=query,
                    enable_cross_partition_query=True
                ))
            
            response = func.HttpResponse(
                json.dumps(items, default=str),
                status_code=200,
                mimetype='application/json'
            )
            return add_cors_headers(response)
        
        elif req.method == 'POST':
            req_body = req.get_json()
            
            if not req_body:
                response = func.HttpResponse(
                    json.dumps({'error': 'Request body is required'}),
                    status_code=400,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
            
            person_ids = req_body.get('personIds', [])
            start_time_str = req_body.get('startTime')
            end_time_str = req_body.get('endTime')
            title = req_body.get('title', '')
            description = req_body.get('description', '')
            
            if not person_ids or len(person_ids) == 0:
                response = func.HttpResponse(
                    json.dumps({'error': 'At least one person ID is required'}),
                    status_code=400,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
            
            if not start_time_str or not end_time_str:
                response = func.HttpResponse(
                    json.dumps({'error': 'Start time and end time are required'}),
                    status_code=400,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
            
            start_time = parse_datetime(start_time_str)
            end_time = parse_datetime(end_time_str)
            
            if start_time >= end_time:
                response = func.HttpResponse(
                    json.dumps({'error': 'End time must be after start time'}),
                    status_code=400,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
            
            is_available, error_msg = validate_booking_availability(person_ids, start_time, end_time)
            
            if not is_available:
                response = func.HttpResponse(
                    json.dumps({'error': error_msg}),
                    status_code=400,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
            
            booking = {
                'id': str(uuid.uuid4()),
                'personIds': person_ids,
                'startTime': start_time.isoformat(),
                'endTime': end_time.isoformat(),
                'title': title,
                'description': description
            }
            
            bookings_container.create_item(body=booking)
            
            response = func.HttpResponse(
                json.dumps(booking, default=str),
                status_code=201,
                mimetype='application/json'
            )
            return add_cors_headers(response)
        
        elif req.method == 'DELETE':
            booking_id = req.route_params.get('id')
            
            if not booking_id:
                response = func.HttpResponse(
                    json.dumps({'error': 'Booking ID is required'}),
                    status_code=400,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
            
            try:
                bookings_container.delete_item(item=booking_id, partition_key=booking_id)
                response = func.HttpResponse(
                    json.dumps({'message': 'Booking deleted successfully'}),
                    status_code=200,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
            except Exception as e:
                response = func.HttpResponse(
                    json.dumps({'error': 'Booking not found'}),
                    status_code=404,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
        
        else:
            response = func.HttpResponse(
                json.dumps({'error': 'Method not allowed'}),
                status_code=405,
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

