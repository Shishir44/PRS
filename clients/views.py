from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Client
from users.models import User
import json
from datetime import datetime

@csrf_exempt
def create_client(request):
    """Create a new client with all available fields"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"create_client called with method {request.method}")
    
    if request.method != 'POST':
        logger.error(f"Invalid method: {request.method}")
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        # Parse request data
        data = json.loads(request.body)
        logger.info(f"Received client data: {data}")
        
        # Required fields validation
        name = data.get('name')
        username = data.get('username')
        if not (name and username):
            return JsonResponse({'success': False, 'error': 'Missing required fields: name and username'}, status=400)
        
        # Get the user who is creating this client
        try:
            user = User.objects.get(username=username)
            logger.info(f"Found user: {user.username} for client creation")
        except User.DoesNotExist:
            logger.error(f"User not found for username: {username}")
            return JsonResponse({'success': False, 'error': f'User {username} not found'}, status=404)
        
        # Create a new client with all available fields
        client = Client(
            name=name,
            company_name=data.get('company_name', ''),
            contact_info=data.get('contact_info', ''),
            email=data.get('email', ''),
            phone=data.get('phone', ''),
            address=data.get('address', ''),
            city=data.get('city', ''),
            state=data.get('state', ''),
            country=data.get('country', ''),
            postal_code=data.get('postal_code', ''),
            website=data.get('website', ''),
            notes=data.get('notes', ''),
            created_by=user
        )
        
        # Save the client to the database
        client.save()
        
        # Return success response with client data
        return JsonResponse({
            'success': True, 
            'message': 'Client created successfully',
            'client': client.to_dict()
        })
        
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'User not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
def list_clients(request):
    """
    List all clients for a given user with optional filtering
    GET parameters:
    - username: The username of the user whose clients to list (required)
    - search: Optional search term to filter clients by name, company_name, or contact info
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"list_clients called with method {request.method}")
    logger.info(f"Request GET params: {request.GET}")
    
    if request.method != 'GET':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    # Get required username parameter
    username = request.GET.get('username')
    if not username:
        return JsonResponse({'success': False, 'error': 'Username required'}, status=400)
    
    # Optional search parameter
    search_term = request.GET.get('search', '').strip()
    
    try:
        # Get the user
        try:
            user = User.objects.get(username=username)
            logger.info(f"Found user {username} for client listing")
        except User.DoesNotExist:
            logger.error(f"User not found for listing: {username}")
            return JsonResponse({
                'success': False, 
                'error': f'User {username} not found', 
                'debug_info': {
                    'username_provided': username,
                    'all_users': [u.username for u in User.objects.all()]
                }
            }, status=404)
        
        # Base query - filter by user
        clients_query = Client.objects.filter(created_by=user)
        logger.info(f"Found {clients_query.count()} clients for user {username}")
        # Dump the first few clients for debugging
        sample_clients = []
        for c in clients_query[:5]:
            sample_clients.append({
                'id': str(c.id),
                'name': c.name,
                'created_by': c.created_by.username if c.created_by else None
            })
        logger.info(f"Sample clients: {sample_clients}")
        
        # Apply search filter if provided
        if search_term:
            # MongoDB text search across multiple fields
            clients = clients_query.filter(
                name__icontains=search_term
            ) | clients_query.filter(
                company_name__icontains=search_term
            ) | clients_query.filter(
                contact_info__icontains=search_term
            ) | clients_query.filter(
                email__icontains=search_term
            ) | clients_query.filter(
                phone__icontains=search_term
            ) | clients_query.filter(
                address__icontains=search_term
            ) | clients_query.filter(
                country__icontains=search_term
            )
        else:
            clients = clients_query
        
        # Order by most recently updated
        clients = clients.order_by('-updated_at')
        
        # Return the results
        return JsonResponse({
            'success': True, 
            'count': clients.count(),
            'clients': [c.to_dict() for c in clients]
        })
    
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'User not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
def client_details(request, client_id):
    """
    Get detailed information about a specific client
    GET parameters:
    - username: The username of the user requesting the details (required for permission check)
    """
    if request.method != 'GET':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    # Get required username parameter
    username = request.GET.get('username')
    if not username:
        return JsonResponse({'success': False, 'error': 'Username required for permission check'}, status=400)
    
    try:
        # Get the user for permission check
        user = User.objects.get(username=username)
        
        # Get the client, filtering by the user (permission check)
        client = Client.objects.get(id=client_id, created_by=user)
        
        return JsonResponse({
            'success': True, 
            'client': client.to_dict()
        })
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'User not found'}, status=404)
    except Client.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Client not found or you do not have permission to view it'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
def update_client(request, client_id):
    """
    Update a client with all available fields
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        # Parse request data
        data = json.loads(request.body)
        
        # Required fields validation
        username = data.get('username')
        if not username:
            return JsonResponse({'success': False, 'error': 'Username required for permission check'}, status=400)
        
        # Get the user for permission check
        user = User.objects.get(username=username)
        
        # Get the client, filtering by the user (permission check)
        client = Client.objects.get(id=client_id, created_by=user)
        
        # Update all fields that are present in the request
        if 'name' in data:
            client.name = data['name']
        if 'company_name' in data:
            client.company_name = data['company_name']
        if 'contact_info' in data:
            client.contact_info = data['contact_info']
        if 'email' in data:
            client.email = data['email']
        if 'phone' in data:
            client.phone = data['phone']
        if 'address' in data:
            client.address = data['address']
        if 'city' in data:
            client.city = data['city']
        if 'state' in data:
            client.state = data['state']
        if 'country' in data:
            client.country = data['country']
        if 'postal_code' in data:
            client.postal_code = data['postal_code']
        if 'website' in data:
            client.website = data['website']
        if 'notes' in data:
            client.notes = data['notes']
        
        # Update the timestamp
        client.updated_at = datetime.utcnow()
        
        # Save the client to the database
        client.save()
        
        # Return success response with updated client data
        return JsonResponse({
            'success': True, 
            'message': 'Client updated successfully',
            'client': client.to_dict()
        })
        
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'User not found'}, status=404)
    except Client.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Client not found or you do not have permission to edit it'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
def delete_client(request, client_id):
    """
    Delete a client by ID
    Only the user who created the client can delete it
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        # Parse request data
        data = json.loads(request.body)
        
        # Required fields validation
        username = data.get('username')
        if not username:
            return JsonResponse({'success': False, 'error': 'Username required for permission check'}, status=400)
        
        # Get the user for permission check
        user = User.objects.get(username=username)
        
        # Check if the client exists and belongs to the user
        client = Client.objects.get(id=client_id, created_by=user)
        
        # Store the name for the response message
        client_name = client.name
        
        # Delete the client
        client.delete()
        
        # Return success response
        return JsonResponse({
            'success': True,
            'message': f'Client "{client_name}" deleted successfully'
        })
        
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'User not found'}, status=404)
    except Client.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Client not found or you do not have permission to delete it'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON in request body'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
