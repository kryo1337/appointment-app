import os
import json
import logging
from azure.data.tables import TableServiceClient, TableClient
from azure.core.exceptions import ResourceExistsError, ResourceNotFoundError

_people_table = None
_bookings_table = None
_table_service = None

def get_table_service():
    global _table_service
    if _table_service is None:
        connection_string = os.environ.get('AzureWebJobsStorage')
        if not connection_string:
            raise ValueError("AzureWebJobsStorage environment variable is not set")
        
        logging.info("Connecting to Azure Table Storage...")
        _table_service = TableServiceClient.from_connection_string(conn_str=connection_string)
        logging.info("Successfully connected to Azure Table Storage")
    return _table_service

def get_people_table():
    global _people_table
    if _people_table is None:
        logging.info("Initializing 'people' table...")
        table_service = get_table_service()
        table_name = "people"
        
        try:
            table_client = table_service.create_table_if_not_exists(table_name=table_name)
            _people_table = table_client
            logging.info(f"Table '{table_name}' ready")
        except Exception as e:
            logging.error(f"Error creating/retrieving table '{table_name}': {str(e)}")
            raise
    
    return _people_table

def get_bookings_table():
    global _bookings_table
    if _bookings_table is None:
        logging.info("Initializing 'bookings' table...")
        table_service = get_table_service()
        table_name = "bookings"
        
        try:
            table_client = table_service.create_table_if_not_exists(table_name=table_name)
            _bookings_table = table_client
            logging.info(f"Table '{table_name}' ready")
        except Exception as e:
            logging.error(f"Error creating/retrieving table '{table_name}': {str(e)}")
            raise
    
    return _bookings_table


def _serialize_value(value):
    if isinstance(value, (list, dict)):
        return json.dumps(value)
    return value


def _deserialize_value(value):
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, (list, dict)):
                return parsed
        except (json.JSONDecodeError, ValueError):
            pass
    return value


def _serialize_entity(entity):
    serialized = {}
    for key, value in entity.items():
        if key not in ('PartitionKey', 'RowKey', 'etag'):
            serialized[key] = _serialize_value(value)
        else:
            serialized[key] = value
    return serialized


def _deserialize_entity(entity):
    deserialized = {}
    for key, value in entity.items():
        if key not in ('PartitionKey', 'RowKey', 'etag'):
            deserialized[key] = _deserialize_value(value)
        else:
            deserialized[key] = value
    return deserialized


class TableContainerWrapper:
    def __init__(self, table_client):
        self.table_client = table_client
    
    def query_items(self, query=None, enable_cross_partition_query=None):
        try:
            entities = self.table_client.list_entities()
            items = []
            for entity in entities:
                item = dict(entity)
                item = _deserialize_entity(item)
                item.pop('etag', None)
                item.pop('PartitionKey', None)
                item.pop('RowKey', None)
                if 'id' not in item:
                    item['id'] = entity.get('PartitionKey') or entity.get('RowKey')
                items.append(item)
            return items
        except Exception as e:
            logging.error(f"Error querying table: {str(e)}")
            return []
    
    def create_item(self, body):
        entity = {
            'PartitionKey': body.get('id', 'default'),
            'RowKey': body.get('id', 'default'),
            **body
        }
        entity = _serialize_entity(entity)
        try:
            self.table_client.create_entity(entity=entity)
            return body
        except ResourceExistsError:
            self.table_client.update_entity(entity=entity)
            return body
        except Exception as e:
            logging.error(f"Error creating item: {str(e)}")
            raise
    
    def read_item(self, item, partition_key):
        try:
            entity = self.table_client.get_entity(partition_key=partition_key, row_key=item)
            result = dict(entity)
            result = _deserialize_entity(result)
            result.pop('etag', None)
            result.pop('PartitionKey', None)
            result.pop('RowKey', None)
            if 'id' not in result:
                result['id'] = partition_key
            return result
        except ResourceNotFoundError:
            raise Exception("Item not found")
        except Exception as e:
            logging.error(f"Error reading item: {str(e)}")
            raise
    
    def replace_item(self, item, body):
        entity = {
            'PartitionKey': body.get('id', item),
            'RowKey': body.get('id', item),
            **body
        }
        entity = _serialize_entity(entity)
        try:
            self.table_client.update_entity(entity=entity)
            return body
        except Exception as e:
            logging.error(f"Error replacing item: {str(e)}")
            raise
    
    def delete_item(self, item, partition_key):
        try:
            self.table_client.delete_entity(partition_key=partition_key, row_key=item)
        except ResourceNotFoundError:
            raise Exception("Item not found")
        except Exception as e:
            logging.error(f"Error deleting item: {str(e)}")
            raise


def get_people_container():
    table = get_people_table()
    return TableContainerWrapper(table)

def get_bookings_container():
    table = get_bookings_table()
    return TableContainerWrapper(table)

