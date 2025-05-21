from datetime import datetime
import json
import os
import traceback
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from mongoengine.errors import ValidationError, DoesNotExist
from .models import Project, ProjectFile
from deals.models import Deal

@csrf_exempt
def create_project(request):
    """Create a new project associated with a deal."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        # Handle multipart form data
        data = request.POST
        files = request.FILES.getlist('files')
        receipt_file = request.FILES.get('receipt')
        
        # Validate required fields
        required_fields = ['deal', 'name', 'supervisor']  # Changed from deal_id to deal
        if not all(field in data for field in required_fields):
            return JsonResponse({'success': False, 'error': f'Missing required fields: {required_fields}'}, status=400)
        
        # Parse deadline if provided
        deadline = None
        if 'deadline' in data and data['deadline']:
            try:
                deadline = datetime.strptime(data['deadline'], '%Y-%m-%d')
            except ValueError:
                return JsonResponse({'success': False, 'error': 'Invalid deadline format. Use YYYY-MM-DD'}, status=400)
        
        # Get and validate deal
        try:
            deal = Deal.objects.get(id=data['deal'])  # Changed from deal_id to deal
        except Deal.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Deal not found'}, status=404)
        
        # Handle files for verified deals
        files_path = None
        receipt_path = None
        
        if deal.status == 'verified':
            # Validate additional fee and receipt
            if not data.get('additional_fee') or not receipt_file:
                return JsonResponse({
                    'success': False, 
                    'error': 'Additional fee and receipt are required for projects in verified deals'
                }, status=400)
            
            # Save receipt
            receipt_name = f"receipts/project_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{receipt_file.name}"
            receipt_path = default_storage.save(receipt_name, ContentFile(receipt_file.read()))
        
        # Handle project files
        saved_files = []
        if files:
            project_dir = f"project_files/{str(deal.id)}/{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            os.makedirs(os.path.join(settings.MEDIA_ROOT, project_dir), exist_ok=True)
            
            for file in files:
                # Validate file type
                file_name = file.name
                file_ext = file_name.split('.')[-1].lower() if '.' in file_name else ''
                valid_exts = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'zip']
                
                if file_ext not in valid_exts:
                    return JsonResponse({
                        'success': False, 
                        'error': f'File type .{file_ext} is not supported. Please upload PDF, DOC, DOCX, images or ZIP files.'
                    }, status=400)
                
                # Save the file
                file_path = os.path.join(project_dir, file.name)
                saved_path = default_storage.save(file_path, ContentFile(file.read()))
                saved_files.append(saved_path)
            
            files_path = project_dir
        
        # Create project
        project = Project(
            deal=deal,
            name=data['name'],
            supervisor=data['supervisor'],
            assigned_by=data.get('created_by', deal.created_by),  # Use the creator's username or deal creator as fallback
            description=data.get('description', ''),
            deadline=deadline,
            files=files_path,
            additional_fee=float(data.get('additional_fee', 0)),
            receipt_file=receipt_path
        )
        project.save()
        
        # Create ProjectFile entries for each uploaded file
        project_files = []
        if saved_files:
            for saved_path in saved_files:
                file_name = os.path.basename(saved_path)
                file_size = os.path.getsize(os.path.join(settings.MEDIA_ROOT, saved_path)) if os.path.exists(os.path.join(settings.MEDIA_ROOT, saved_path)) else 0
                
                # Determine file type
                file_ext = file_name.split('.')[-1].lower() if '.' in file_name else ''
                mime_types = {
                    'pdf': 'application/pdf',
                    'doc': 'application/msword',
                    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'png': 'image/png',
                    'gif': 'image/gif',
                    'zip': 'application/zip'
                }
                file_type = mime_types.get(file_ext, 'application/octet-stream')
                
                # Create file record
                project_file = ProjectFile(
                    project=project,
                    file_name=file_name,
                    file_path=saved_path,
                    file_type=file_type,
                    file_size=file_size,
                    uploaded_by=data.get('created_by', 'system'),
                    description='Initial project file upload'
                ).save()
                project_files.append(project_file)
        
        # Add project to deal
        if project not in deal.projects:
            deal.projects.append(project)
            deal.save()
        
        # Prepare response with file info
        project_file_info = []
        for pf in project_files:
            project_file_info.append({
                'id': str(pf.id) if hasattr(pf, 'id') else None,
                'name': pf.file_name,
                'path': pf.file_path,
                'type': pf.file_type,
                'size': pf.file_size
            })
        
        return JsonResponse({
            'success': True,
            'project_id': str(project.id),
            'message': 'Project created successfully',
            'files': project_file_info
        }, status=201)
        
    except ValidationError as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
    except Exception as e:
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
def list_project_files(request, project_id=None):
    """List all files associated with a project."""
    if request.method != 'GET':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        if not project_id:
            return JsonResponse({'success': False, 'error': 'Project ID is required'}, status=400)
        
        # Get project
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Project not found'}, status=404)
        
        # Get files
        project_files = ProjectFile.objects(project=project)
        
        # Format response
        files_list = []
        for file in project_files:
            files_list.append({
                'id': str(file.id),
                'name': file.file_name,
                'path': file.file_path,
                'type': file.file_type,
                'size': file.file_size,
                'description': file.description,
                'uploaded_by': file.uploaded_by,
                'uploaded_at': file.uploaded_at.strftime('%Y-%m-%d %H:%M:%S') if file.uploaded_at else None,
                'url': f'/media/{file.file_path}'
            })
        
        return JsonResponse({'success': True, 'files': files_list})
    
    except Exception as e:
        print(f"Error listing project files: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
def delete_project_file(request, file_id=None):
    """Delete a project file."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        if not file_id:
            return JsonResponse({'success': False, 'error': 'File ID is required'}, status=400)
        
        # Get file
        try:
            project_file = ProjectFile.objects.get(id=file_id)
        except ProjectFile.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'File not found'}, status=404)
        
        # Delete file from storage
        file_path = os.path.join(settings.MEDIA_ROOT, project_file.file_path)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete file record
        project_file.delete()
        
        return JsonResponse({'success': True, 'message': 'File deleted successfully'})
    
    except Exception as e:
        print(f"Error deleting project file: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
def list_projects(request):
    """List projects filtered by deal_id or supervisor.
    
    GET parameters:
    - deal_id: ID of the deal to list projects for
    - supervisor: Username of supervisor to list projects for
    - username: Username of the user viewing projects
    """
    if request.method != 'GET':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        deal_id = request.GET.get('deal_id')
        supervisor = request.GET.get('supervisor')
        username = request.GET.get('username')
        
        # Build query based on provided parameters
        query = {}
        
        if deal_id:
            query['deal_id'] = deal_id
        
        if supervisor:
            query['supervisor'] = supervisor
            
        # If no specific filters and we have a username, show relevant projects for that user
        if not deal_id and not supervisor and username:
            # Show projects where user is supervisor
            query['supervisor'] = username
        
        projects = Project.objects(**query).order_by('-created_at')
        project_list = []
        
        for p in projects:
            try:
                # Try to get deal data
                deal_data = {
                    'id': str(p.deal.id) if p.deal else p.deal_id,
                    'title': p.deal.title if p.deal else 'Unknown Deal'
                }
            except Exception as deal_error:
                print(f"Error getting deal data for project {p.id}: {str(deal_error)}")
                deal_data = {
                    'id': p.deal_id if p.deal_id else str(p.id),
                    'title': 'Unknown Deal'
                }
                
            project_list.append({
                'id': str(p.id),
                'deal_id': deal_data['id'],
                'deal_title': deal_data['title'],
                'name': p.name,
                'description': p.description,
                'supervisor': p.supervisor,
                'deadline': p.deadline.isoformat() if p.deadline else None,
                'files': p.files,
                'additional_fee': float(p.additional_fee) if p.additional_fee else 0,
                'receipt_file': p.receipt_file,
                'status': p.status,
                'created_at': p.created_at.isoformat(),
                'updated_at': p.updated_at.isoformat()
            })
        
        return JsonResponse({'success': True, 'projects': project_list})
        
    except Exception as e:
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
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': f'Unexpected error: {str(e)}'}, status=500)


@csrf_exempt
def upload_project_files(request, project_id):
    """Upload files to an existing project.
    
    POST parameters:
    - files: File objects to upload (multipart/form-data)
    - description: Optional description for the files
    - username: Username of the uploader
    
    Returns JSON response with upload status and list of uploaded files.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        # Check if project exists
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return JsonResponse({'success': False, 'error': f'Project not found with ID: {project_id}'}, status=404)
        
        # Get files from request
        files = request.FILES.getlist('files')
        description = request.POST.get('description', '')
        username = request.POST.get('username') or request.GET.get('username')
        
        if not username:
            return JsonResponse({'success': False, 'error': 'Username is required'}, status=400)
        
        if not files:
            return JsonResponse({'success': False, 'error': 'No files provided'}, status=400)
        
        # Create directory for project files if it doesn't exist
        # Use deal_id if available or project ID if not
        dir_id = project.deal_id if project.deal_id else str(project.id)
        project_dir = f"project_files/{dir_id}/{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        os.makedirs(os.path.join(settings.MEDIA_ROOT, project_dir), exist_ok=True)
        
        # Save each file and create ProjectFile record
        uploaded_files = []
        for file in files:
            # Generate a unique filename to prevent conflicts
            file_uuid = str(uuid.uuid4())
            file_ext = os.path.splitext(file.name)[1].lower()
            safe_filename = f"{file_uuid}{file_ext}"
            
            # Save the file
            file_path = os.path.join(project_dir, safe_filename)
            saved_path = default_storage.save(file_path, ContentFile(file.read()))
            
            # Create ProjectFile record
            project_file = ProjectFile(
                project=project,
                filename=file.name,  # Original filename
                file_path=saved_path,
                file_type=file_ext.lstrip('.'),
                file_size=file.size,
                description=description,
                uploaded_by=username
            )
            project_file.save()
            
            # Add to response list
            uploaded_files.append(project_file.to_dict())
        
        return JsonResponse({
            'success': True,
            'message': f'Successfully uploaded {len(uploaded_files)} files',
            'files': uploaded_files
        })
        
    except Exception as e:
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': f'Unexpected error: {str(e)}'}, status=500)


def list_project_files(request):
    """List files for projects based on filters.
    
    GET parameters:
    - project_id: Optional ID of the project to list files for
    - username: Username of the user listing files
    
    Returns a list of file objects with metadata and URLs.
    """
    if request.method != 'GET':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        project_id = request.GET.get('project_id')
        username = request.GET.get('username')
        
        if not username:
            return JsonResponse({'success': False, 'error': 'Username is required'}, status=400)
        
        # Build query based on parameters
        query = {}
        if project_id:
            try:
                project = Project.objects.get(id=project_id)
                query['project'] = project
            except Project.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Project not found'}, status=404)
        
        # Get all projects where user is either the supervisor or uploader
        if not project_id:
            # First get all projects where the user is the supervisor
            supervised_projects = Project.objects(supervisor=username)
            supervised_project_ids = [p.id for p in supervised_projects]
            
            # Filter files based on supervised projects or uploaded by user
            query = {
                '$or': [
                    {'project__in': supervised_project_ids},
                    {'uploaded_by': username}
                ]
            }
        
        # Get files based on query
        files = ProjectFile.objects(**query).order_by('-uploaded_at')
        file_list = [file.to_dict() for file in files]
        
        return JsonResponse({
            'success': True,
            'files': file_list
        })
        
    except Exception as e:
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': f'Unexpected error: {str(e)}'}, status=500)


@csrf_exempt
def delete_project_file(request, file_id):
    """Delete a project file.
    
    POST request to delete a file by ID.
    Requires the user to be either the file uploader or the project supervisor.
    
    Returns success status message.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        # Parse request data for username
        data = json.loads(request.body) if request.body else {}
        username = data.get('username') or request.GET.get('username')
        
        if not username:
            return JsonResponse({'success': False, 'error': 'Username is required'}, status=400)
        
        # Find the file
        try:
            file = ProjectFile.objects.get(id=file_id)
        except ProjectFile.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'File not found'}, status=404)
        
        # Check permissions - must be uploader or project supervisor
        if file.uploaded_by != username and file.project.supervisor != username:
            return JsonResponse({'success': False, 'error': 'You do not have permission to delete this file'}, status=403)
        
        # Get file path before deleting record
        file_path = os.path.join(settings.MEDIA_ROOT, file.file_path)
        
        # Delete the file record from database
        file.delete()
        
        # Try to delete the actual file from storage
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            # Log error but don't fail the request if file deletion fails
            print(f"Error deleting file {file_path}: {str(e)}")
        
        return JsonResponse({
            'success': True,
            'message': 'File deleted successfully'
        })
        
    except Exception as e:
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': f'Unexpected error: {str(e)}'}, status=500)
