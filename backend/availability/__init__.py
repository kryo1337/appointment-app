import logging
import json
import azure.functions as func
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from functions.storage_client import get_people_container
from functions.cors import add_cors_headers

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Availability function processed a request.')
    
    if req.method == 'OPTIONS':
        return func.HttpResponse(
            '',
            status_code=200,
            headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        )
    
    try:
        container = get_people_container()
        person_id = req.route_params.get('id')
        
        if not person_id:
            response = func.HttpResponse(
                json.dumps({'error': 'Person ID is required'}),
                status_code=400,
                mimetype='application/json'
            )
            return add_cors_headers(response)
        
        if req.method == 'GET':
            try:
                person = container.read_item(item=person_id, partition_key=person_id)
                availability = person.get('availability', [])
                
                response = func.HttpResponse(
                    json.dumps({'availability': availability}, default=str),
                    status_code=200,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
            except Exception as e:
                response = func.HttpResponse(
                    json.dumps({'error': 'Person not found'}),
                    status_code=404,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
        
        elif req.method == 'PUT':
            req_body = req.get_json()
            
            if not req_body or 'availability' not in req_body:
                response = func.HttpResponse(
                    json.dumps({'error': 'Availability data is required'}),
                    status_code=400,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
            
            try:
                person = container.read_item(item=person_id, partition_key=person_id)
                person['availability'] = req_body['availability']
                container.replace_item(item=person_id, body=person)
                
                response = func.HttpResponse(
                    json.dumps({'availability': person['availability']}, default=str),
                    status_code=200,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
            except Exception as e:
                response = func.HttpResponse(
                    json.dumps({'error': 'Person not found'}),
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

