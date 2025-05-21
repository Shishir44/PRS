from django.shortcuts import render, redirect
from .models import User
from deals.models import Deal
from clients.models import Client

# Create your views here.

def home_view(request):
    """Function to render the home page."""
    return render(request, 'home.html')

def login_view(request):
    """Function to handle user login."""
    error_message = None
    
    if request.method == 'POST':
        username = request.POST.get('username')
        
        try:
            # Check if user exists (simplified for MVP)
            user = User.objects.get(username=username)
            # Store user info in session (simplified for MVP)
            request.session['username'] = user.username
            request.session['role'] = user.role
            return redirect('dashboard')
        except User.DoesNotExist:
            error_message = "Invalid username. Please try again."
    
    return render(request, 'login.html', {'error_message': error_message})

def logout_view(request):
    """Function to handle user logout."""
    # Clear session data
    request.session.flush()
    return redirect('login')

def register_view(request):
    """Function to handle user registration."""
    error_message = None
    
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        role = request.POST.get('role')
        
        # Check if username already exists
        if User.objects.filter(username=username).count() > 0:
            error_message = "Username already exists. Please choose another."
        else:
            # Create new user
            user = User(
                username=username,
                email=email,
                role=role
            ).save()
            return redirect('login')
    
    return render(request, 'register.html', {'error_message': error_message})

def dashboard_view(request):
    """Function to render the appropriate dashboard based on user role."""
    # Check if user is logged in
    username = request.session.get('username')
    role = request.session.get('role')
    
    if not username:
        return redirect('login')
    
    context = {
        'username': username,
        'role': role
    }
    
    # Render different dashboard based on role
    if role == 'salesperson':
        # Get salesperson's deals
        deals = Deal.objects.filter(created_by=username)
        context['deals'] = deals
        
        # Get supervisors for project assignment
        supervisors = User.objects.filter(role='supervisor')
        context['supervisors'] = supervisors
        
        return render(request, 'salesperson_dashboard.html', context)
    elif role == 'verifier':
        # Get deals pending verification
        deals = Deal.objects.filter(status='pending_verification')
        context['deals'] = deals
        return render(request, 'verifier_dashboard.html', context)
    elif role == 'supervisor':
        return render(request, 'supervisor_dashboard.html', context)
    else:
        return render(request, 'dashboard.html', context)

def client_management_view(request):
    """Function to render the client management page."""
    # Check if user is logged in
    username = request.session.get('username')
    role = request.session.get('role')
    
    if not username:
        return redirect('login')
    
    # Only salespeople should access client management
    if role != 'salesperson':
        return redirect('dashboard')
    
    context = {
        'username': username,
        'role': role
    }
    
    return render(request, 'client_management.html', context)
