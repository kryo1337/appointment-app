import logging
import json
import azure.functions as func
import sys
import os
import uuid

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from functions.storage_client import get_people_container
from functions.utils import default_availability
from functions.cors import add_cors_headers

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info(f'People function processed a {req.method} request.')
    
    if req.method == 'OPTIONS':
        return func.HttpResponse(
            '',
            status_code=200,
            headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        )
    
    try:
        logging.info('Retrieving people table from Azure Table Storage...')
        container = get_people_container()
        logging.info('People table ready')
        
        if req.method == 'GET':
            logging.info('Executing GET query - retrieving all people')
            query = 'SELECT * FROM c'
            items = list(container.query_items(query=query, enable_cross_partition_query=True))
            logging.info(f'Found {len(items)} people')
            
            response = func.HttpResponse(
                json.dumps(items, default=str),
                status_code=200,
                mimetype='application/json'
            )
            return add_cors_headers(response)
        
        elif req.method == 'POST':
            logging.info('Processing POST request - creating new person')
            req_body = req.get_json()
            
            if not req_body:
                logging.warning('Missing body in POST request')
                response = func.HttpResponse(
                    json.dumps({'error': 'Request body is required'}),
                    status_code=400,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
            
            name = req_body.get('name')
            email = req_body.get('email', '')
            
            if not name:
                logging.warning('Missing required field "name" in POST request')
                response = func.HttpResponse(
                    json.dumps({'error': 'Name is required'}),
                    status_code=400,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
            
            person = {
                'id': str(uuid.uuid4()),
                'name': name,
                'email': email,
                'availability': req_body.get('availability', default_availability())
            }
            
            logging.info(f'Creating person: {person["name"]} (ID: {person["id"]})')
            container.create_item(body=person)
            logging.info(f'Person created successfully: {person["id"]}')
            
            response = func.HttpResponse(
                json.dumps(person, default=str),
                status_code=201,
                mimetype='application/json'
            )
            return add_cors_headers(response)
        
        elif req.method == 'PUT':
            person_id = req.route_params.get('id')
            
            if not person_id:
                logging.warning('Missing person ID in PUT request')
                response = func.HttpResponse(
                    json.dumps({'error': 'Person ID is required'}),
                    status_code=400,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
            
            logging.info(f'Processing PUT request for person ID: {person_id}')
            req_body = req.get_json()
            
            if not req_body:
                logging.warning(f'Missing body in PUT request for person {person_id}')
                response = func.HttpResponse(
                    json.dumps({'error': 'Request body is required'}),
                    status_code=400,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
            
            try:
                logging.info(f'Retrieving person {person_id} from Table Storage...')
                existing_person = container.read_item(item=person_id, partition_key=person_id)
                logging.info(f'Person {person_id} found')
            except Exception as e:
                logging.error(f'Person {person_id} not found: {str(e)}')
                response = func.HttpResponse(
                    json.dumps({'error': 'Person not found'}),
                    status_code=404,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
            
            existing_person['name'] = req_body.get('name', existing_person.get('name'))
            existing_person['email'] = req_body.get('email', existing_person.get('email'))
            
            if 'availability' in req_body:
                existing_person['availability'] = req_body['availability']
            
            logging.info(f'Updating person {person_id} in Table Storage...')
            container.replace_item(item=person_id, body=existing_person)
            logging.info(f'Person {person_id} updated successfully')
            
            response = func.HttpResponse(
                json.dumps(existing_person, default=str),
                status_code=200,
                mimetype='application/json'
            )
            return add_cors_headers(response)
        
        elif req.method == 'DELETE':
            person_id = req.route_params.get('id')
            
            if not person_id:
                logging.warning('Missing person ID in DELETE request')
                response = func.HttpResponse(
                    json.dumps({'error': 'Person ID is required'}),
                    status_code=400,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
            
            logging.info(f'Processing DELETE request for person ID: {person_id}')
            try:
                container.delete_item(item=person_id, partition_key=person_id)
                logging.info(f'Person {person_id} deleted successfully')
                response = func.HttpResponse(
                    json.dumps({'message': 'Person deleted successfully'}),
                    status_code=200,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
            except Exception as e:
                logging.error(f'Error deleting person {person_id}: {str(e)}')
                response = func.HttpResponse(
                    json.dumps({'error': 'Person not found'}),
                    status_code=404,
                    mimetype='application/json'
                )
                return add_cors_headers(response)
        
        else:
            logging.warning(f'Unsupported HTTP method: {req.method}')
            response = func.HttpResponse(
                json.dumps({'error': 'Method not allowed'}),
                status_code=405,
                mimetype='application/json'
            )
            return add_cors_headers(response)
    
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logging.error(f'Error in people function: {str(e)}\n{error_trace}')
        response = func.HttpResponse(
            json.dumps({'error': str(e)}),
            status_code=500,
            mimetype='application/json'
        )
        return add_cors_headers(response)

