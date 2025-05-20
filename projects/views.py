from datetime import datetime
import json
import os
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from mongoengine.errors import ValidationError
from projects.models import Project
from deals.models import Deal

# Create your views here.

# Function: Create a new project and assign supervisor
# POST: {"deal_id": str, "name": str, "supervisor": str}
@csrf_exempt
def create_project(request):
    """Create a new project associated with a deal.
    
    Projects can be created for a draft deal or for a verified deal with additional fee.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        # Handle multipart form data for file upload
        data = request.POST
        files = request.FILES.getlist('files')
        receipt_file = request.FILES.get('receipt')
        
        # Get required fields
        deal_id = data.get('deal_id')
        name = data.get('name')
        supervisor = data.get('supervisor')
        description = data.get('description', '')
        deadline_str = data.get('deadline')
        
        if not (deal_id and name and supervisor):
            return JsonResponse({'success': False, 'error': 'Missing required fields: deal_id, name, supervisor'}, status=400)
        
        # Parse deadline if provided
        deadline = None
        if deadline_str:
            try:
                deadline = datetime.strptime(deadline_str, '%Y-%m-%d')
            except ValueError:
                return JsonResponse({'success': False, 'error': 'Invalid deadline format. Use YYYY-MM-DD'}, status=400)
        
        try:
            deal = Deal.objects.get(id=deal_id)
        except Deal.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Deal not found'}, status=404)
        
        # Check additional fee requirements for verified deals
        additional_fee = 0
        receipt_path = None
        
        if deal.status == 'verified':
            additional_fee_str = data.get('additional_fee')
            if not additional_fee_str:
                return JsonResponse({'success': False, 'error': 'Additional fee is required for projects added to verified deals'}, status=400)
            
            try:
                additional_fee = float(additional_fee_str)
            except ValueError:
                return JsonResponse({'success': False, 'error': 'Invalid additional fee amount'}, status=400)
            
            if not receipt_file:
                return JsonResponse({'success': False, 'error': 'Receipt is required for projects added to verified deals'}, status=400)
            
            # Save receipt file
            file_name = f"receipts/project_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{receipt_file.name}"
            receipt_path = default_storage.save(file_name, ContentFile(receipt_file.read()))
        
        # Handle project files
        files_path = None
        if files:
            # Create directory for project files
            project_dir = f"project_files/{deal_id}/{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            os.makedirs(os.path.join(settings.MEDIA_ROOT, project_dir), exist_ok=True)
            
            # Save each file
            saved_files = []
            for file in files:
                file_path = os.path.join(project_dir, file.name)
                default_storage.save(file_path, ContentFile(file.read()))
                saved_files.append(file_path)
            
            files_path = project_dir
        
        # Create the project
        project = Project(
            deal=deal,
            name=name,
            description=description,
            supervisor=supervisor,
            deadline=deadline,
            files=files_path,
            additional_fee=additional_fee,
            receipt_file=receipt_path
        )
        project.save()
        
        # Add project to deal's project list if not already present
        if project not in deal.projects:
            deal.projects.append(project)
            deal.save()
        
        return JsonResponse({
            'success': True, 
            'project_id': str(project.id),
            'message': 'Project created successfully'
        }, status=201)
        
    except ValidationError as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': f'Unexpected error: {str(e)}'}, status=500)

# Function: List all projects for a deal
# GET: /api/projects/?deal_id=<deal_id>
def list_projects(request):
    """List projects filtered by deal_id or supervisor.
    
    GET parameters:
    - deal_id: ID of the deal to list projects for
    - supervisor: Username of supervisor to list projects for
    """
    if request.method != 'GET':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    deal_id = request.GET.get('deal_id')
    supervisor = request.GET.get('supervisor')
    
    if not (deal_id or supervisor):
        return JsonResponse({'success': False, 'error': 'Missing filter parameter: deal_id or supervisor'}, status=400)
    
    try:
        # Build query based on provided parameters
        query = {}
        if deal_id:
            query['deal'] = deal_id
        if supervisor:
            query['supervisor'] = supervisor
        
        projects = Project.objects(**query).order_by('-created_at')
        project_list = [
            {
                'id': str(p.id),
                'deal_id': str(p.deal.id),
                'deal_title': p.deal.title,
                'name': p.name,
                'description': p.description,
                'supervisor': p.supervisor,
                'deadline': p.deadline.isoformat() if p.deadline else None,
                'files': p.files,
                'additional_fee': p.additional_fee,
                'receipt_file': p.receipt_file,
                'status': p.status,
                'created_at': p.created_at.isoformat(),
                'updated_at': p.updated_at.isoformat()
            } for p in projects
        ]
        
        return JsonResponse({'success': True, 'projects': project_list}, status=200)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': f'Unexpected error: {str(e)}'}, status=500)


@csrf_exempt
def update_project_status(request, project_id):
    """Update a project's status.
    
    POST parameters:
    - status: New status (pending, in_progress, completed)
    - supervisor: Username of supervisor making the change
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        # Parse request data
        data = json.loads(request.body) if request.body else {}
        status = data.get('status')
        supervisor = data.get('supervisor')
        
        if not status or status not in ['pending', 'in_progress', 'completed']:
            return JsonResponse({'success': False, 'error': 'Invalid or missing status parameter'}, status=400)
        
        if not supervisor:
            return JsonResponse({'success': False, 'error': 'Supervisor username is required'}, status=400)
        
        # Find the project
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Project not found'}, status=404)
        
        # Verify that the current user is the assigned supervisor
        if project.supervisor != supervisor:
            return JsonResponse({'success': False, 'error': 'Only the assigned supervisor can update this project'}, status=403)
        
        # Update the project status
        project.status = status
        project.updated_at = datetime.utcnow()
        project.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Project status updated to {status}',
            'project_id': str(project.id),
            'status': status,
            'updated_at': project.updated_at.isoformat()
        })
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': f'Unexpected error: {str(e)}'}, status=500)
