from django.shortcuts import render
from deals.models import Deal
from projects.models import Project
from users.models import User
from notifications.models import Notification
from mongoengine.errors import ValidationError, DoesNotExist
from django.http import JsonResponse
import json
from django.views.decorators.csrf import csrf_exempt
import os
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from datetime import datetime

@csrf_exempt
def create_deal(request):
    """Create a new deal with receipt upload and handle project creation."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        # Handle multipart form data for file upload
        data = request.POST
        receipt_file = request.FILES.get('receipt')
        
        # Validate required fields
        required_fields = ['title', 'client_name', 'contact_info', 'budget', 'created_by']
        if not all(field in data for field in required_fields):
            return JsonResponse({'success': False, 'error': f'Missing required fields: {required_fields}'}, status=400)
        
        # Validate salesperson
        try:
            salesperson = User.objects.get(username=data['created_by'], role='salesperson')
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Invalid salesperson'}, status=400)
        
        # Handle receipt file
        receipt_path = None
        if receipt_file:
            file_name = f"receipts/{datetime.now().strftime('%Y%m%d_%H%M%S')}_{receipt_file.name}"
            receipt_path = default_storage.save(file_name, ContentFile(receipt_file.read()))
        
        # Check if it's a multi-project deal
        is_multiproject = data.get('is_multiproject', 'false').lower() == 'true'
        
        # Create deal
        deal = Deal(
            title=data['title'],
            client_name=data['client_name'],
            contact_info=data['contact_info'],
            budget=float(data['budget']),
            requirements=data.get('requirements', ''),
            advance_payment=float(data.get('advance_payment', 0)),
            receipt_file=receipt_path,
            created_by=salesperson.username,
            description=data.get('description', ''),
            is_multiproject=is_multiproject
        ).save()
        
        # Process projects if it's a multi-project deal
        projects_created = []
        if is_multiproject and 'projects_data' in data and data['projects_data']:
            try:
                projects_data = json.loads(data['projects_data'])
                
                # Create projects for this deal
                for project_data in projects_data:
                    project = Project(
                        deal_id=str(deal.id),
                        name=project_data.get('name', ''),
                        supervisor=project_data.get('supervisor', ''),
                        description=project_data.get('description', ''),
                        deadline=datetime.strptime(project_data.get('deadline', ''), '%Y-%m-%d') if project_data.get('deadline') else None,
                        status='pending'
                    ).save()
                    
                    projects_created.append({
                        'id': str(project.id),
                        'name': project.name,
                        'supervisor': project.supervisor
                    })
                    
                    # Notify supervisor
                    try:
                        Notification(
                            user=project.supervisor,
                            title=f"New Project Assignment: {project.name}",
                            message=f"You've been assigned to a new project: {project.name} for deal {deal.title}.",
                            link=f"/dashboard/supervisor/"
                        ).save()
                    except Exception as e:
                        print(f"Failed to create notification: {e}")
            except json.JSONDecodeError:
                # Log the error but don't fail the deal creation
                print("Error decoding projects data")
        
        return JsonResponse({
            'success': True,
            'deal_id': str(deal.id),
            'receipt_path': receipt_path,
            'projects': projects_created
        }, status=201)
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
def verify_deal(request, deal_id):
    """Verify or reject a deal with proper validation."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        action = data.get('action')
        verifier = data.get('verifier')
        reason = data.get('reason', '')
        
        if not (action and verifier):
            return JsonResponse({'success': False, 'error': 'Missing required fields: action, verifier'}, status=400)
        
        # Validate verifier
        try:
            verifier_user = User.objects.get(username=verifier, role='verifier')
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Invalid verifier'}, status=400)
        
        # Get and validate deal
        try:
            deal = Deal.objects.get(id=deal_id)
            if deal.status != 'pending_verification':
                return JsonResponse({'success': False, 'error': 'Deal is not pending verification'}, status=400)
            if not deal.receipt_file:
                return JsonResponse({'success': False, 'error': 'Deal has no receipt attached'}, status=400)
        except Deal.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Deal not found'}, status=404)
        
        # Process verification
        if action == 'approve':
            deal.verify(verifier_user.username)
            message = 'Deal verified successfully'
        elif action == 'reject':
            if not reason:
                return JsonResponse({'success': False, 'error': 'Rejection reason is required'}, status=400)
            deal.reject(verifier_user.username, reason)
            message = 'Deal rejected with reason'
        else:
            return JsonResponse({'success': False, 'error': 'Invalid action'}, status=400)
        
        # Notify relevant parties
        Notification(
            recipient=deal.created_by,
            message=f"Deal {deal_id} has been {deal.status}. {reason if reason else ''}",
            deal=deal
        ).save()
        
        return JsonResponse({
            'success': True,
            'status': deal.status,
            'message': message,
            'verified_by': verifier_user.username,
            'verified_at': deal.verified_at.isoformat() if deal.verified_at else None,
            'rejection_reason': deal.rejection_reason
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
def submit_for_verification(request, deal_id):
    """Submit a deal for verification."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        deal = Deal.objects.get(id=deal_id)
        if deal.status != 'draft':
            return JsonResponse({'success': False, 'error': 'Only draft deals can be submitted'}, status=400)
        
        deal.submit_for_verification()
        return JsonResponse({
            'success': True,
            'status': deal.status,
            'message': 'Deal submitted for verification'
        })
        
    except Deal.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Deal not found'}, status=404)
    except ValidationError as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def list_deals(request):
    """List deals based on user role and status."""
    if request.method != 'GET':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        username = request.GET.get('username')
        role = request.GET.get('role')
        status = request.GET.get('status')
        
        if not (username and role):
            return JsonResponse({'success': False, 'error': 'Username and role are required'}, status=400)
        
        # Build query based on role
        query = {}
        if role == 'salesperson':
            query['created_by'] = username
        elif role == 'verifier' and status != 'all':
            # Only filter by status=pending_verification if not explicitly requesting all
            query['status'] = 'pending_verification'
        
        # If specific status requested, override default role-based filtering
        if status and status != 'all':
            query['status'] = status
        
        deals = Deal.objects(**query).order_by('-created_at')
        deal_list = [{
            'id': str(d.id),
            'title': d.title,
            'client_name': d.client_name,
            'contact_info': d.contact_info,
            'requirements': d.requirements,
            'description': d.description,
            'status': d.status,
            'budget': d.budget,
            'advance_payment': d.advance_payment,
            'created_by': d.created_by,
            'created_at': d.created_at.isoformat(),
            'receipt_file': d.receipt_file,
            'is_multiproject': d.is_multiproject,
            'verified_by': d.verified_by,
            'verified_at': d.verified_at.isoformat() if d.verified_at else None,
            'rejection_reason': d.rejection_reason
        } for d in deals]
        
        return JsonResponse({
            'success': True,
            'deals': deal_list
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
def delete_deal(request, deal_id):
    """Delete a deal if it's in draft or rejected status."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        # Parse request data
        data = json.loads(request.body) if request.body else {}
        username = data.get('username')
        
        if not username:
            return JsonResponse({'success': False, 'error': 'Username is required'}, status=400)
        
        # Find the deal
        try:
            deal = Deal.objects.get(id=deal_id)
        except Deal.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Deal not found'}, status=404)
        
        # Security check: only the creator can delete their own deals
        if deal.created_by != username:
            return JsonResponse({'success': False, 'error': 'You can only delete deals you created'}, status=403)
        
        # Status check: only draft or rejected deals can be deleted
        if deal.status not in ['draft', 'rejected']:
            return JsonResponse({'success': False, 'error': f'Cannot delete deals in {deal.status} status'}, status=400)
        
        # If there's a receipt file, delete it from storage
        if deal.receipt_file:
            try:
                # Make path relative to media root
                file_path = os.path.join(settings.MEDIA_ROOT, deal.receipt_file)
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                # Log error but continue with deletion
                print(f"Error deleting receipt file: {e}")
        
        # Delete any associated projects
        for project in Project.objects(deal=deal):
            project.delete()
        
        # Delete the deal
        deal.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'Deal and related projects deleted successfully'
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
def update_deal(request, deal_id):
    """Update a deal with new information."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
    
    try:
        # Get the deal
        try:
            deal = Deal.objects.get(id=deal_id)
        except Deal.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Deal not found'}, status=404)
        
        # Check if current user is the creator
        username = request.POST.get('username')
        if not username or deal.created_by != username:
            return JsonResponse({'success': False, 'error': 'Unauthorized: You can only update your own deals'}, status=403)
        
        # Only allow updates if deal is in draft or rejected status
        if deal.status not in ['draft', 'rejected']:
            return JsonResponse({
                'success': False, 
                'error': f'Cannot update a deal with status: {deal.status}. Only draft or rejected deals can be updated.'
            }, status=403)
        
        # Update deal fields from form data
        deal.title = request.POST.get('title', deal.title)
        deal.client_name = request.POST.get('client_name', deal.client_name)
        deal.contact_info = request.POST.get('contact_info', deal.contact_info)
        deal.budget = float(request.POST.get('budget', deal.budget))
        deal.requirements = request.POST.get('requirements', deal.requirements)
        deal.advance_payment = float(request.POST.get('advance_payment', deal.advance_payment or 0))
        deal.description = request.POST.get('description', deal.description or '')
        deal.is_multiproject = request.POST.get('is_multiproject', '').lower() == 'true'
        
        # Handle status setting (usually back to draft after edits)
        if 'status' in request.POST:
            requested_status = request.POST.get('status')
            # Only allow setting back to draft status
            if requested_status == 'draft':
                deal.status = 'draft'
        
        # Handle receipt file update
        receipt_file = request.FILES.get('receipt')
        if receipt_file:
            # Delete previous receipt if it exists
            if deal.receipt_file:
                try:
                    file_path = os.path.join(settings.MEDIA_ROOT, deal.receipt_file)
                    if os.path.exists(file_path):
                        os.remove(file_path)
                except Exception as e:
                    print(f"Error deleting previous receipt file: {e}")
            
            # Save new receipt file
            file_name = f"receipts/{datetime.now().strftime('%Y%m%d_%H%M%S')}_{receipt_file.name}"
            receipt_path = default_storage.save(file_name, ContentFile(receipt_file.read()))
            deal.receipt_file = receipt_path
        
        # Update timestamp
        deal.updated_at = datetime.utcnow()
        
        # Save the deal
        deal.save()
        
        return JsonResponse({
            'success': True, 
            'message': 'Deal updated successfully',
            'deal_id': str(deal.id)
        })
        
    except Exception as e:
        print(f"Error updating deal: {e}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
