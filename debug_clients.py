"""
Debug script to diagnose client and user data in MongoDB
Run this with: python debug_clients.py
"""

import os
import sys
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'prs.settings')
django.setup()

# Import models after Django setup
from clients.models import Client
from users.models import User

def debug_database():
    """Function to print diagnostics about users and clients in the database"""
    print("===== DATABASE DIAGNOSTICS =====")
    
    # Check users
    users = User.objects.all()
    print(f"\nFound {users.count()} users:")
    for user in users:
        print(f"- {user.username} (role: {user.role}, ID: {user.id})")
    
    # Check clients
    clients = Client.objects.all()
    print(f"\nFound {clients.count()} clients:")
    for client in clients:
        created_by = client.created_by.username if client.created_by else "None"
        print(f"- {client.name} (company: {client.company_name}, created by: {created_by}, ID: {client.id})")
    
    # Check clients by user
    print("\nClients by user:")
    for user in users:
        user_clients = Client.objects.filter(created_by=user)
        print(f"- {user.username}: {user_clients.count()} clients")

    print("\n===== END DIAGNOSTICS =====")

def fix_client_references():
    """Function to attempt to fix any client reference issues with users"""
    print("ATTEMPTING TO FIX CLIENT REFERENCES")
    
    # Get all users and clients
    users = User.objects.all()
    clients = Client.objects.all()
    
    # Check for clients with missing created_by
    missing_refs = clients.filter(created_by=None)
    if missing_refs.count() > 0:
        print(f"\nFound {missing_refs.count()} clients with missing created_by reference")
        # If we have users, assign the first user to these clients
        if users.count() > 0:
            first_user = users.first()
            for client in missing_refs:
                client.created_by = first_user
                client.save()
                print(f"- Fixed client '{client.name}' by assigning to user '{first_user.username}'")
    else:
        print("No clients with missing references found")
    
    print("REFERENCE FIX ATTEMPT COMPLETE")

if __name__ == "__main__":
    print("\nPRS DATABASE DIAGNOSTIC TOOL")
    print("============================\n")
    
    # Run diagnostics
    debug_database()
    
    # Ask if user wants to attempt fixes
    try:
        choice = input("\nWould you like to attempt to fix client references? (y/n): ")
        if choice.lower() == 'y':
            fix_client_references()
            # Run diagnostics again to show changes
            print("\nAFTER FIXES:")
            debug_database()
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
