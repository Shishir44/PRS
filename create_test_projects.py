import os
import sys
import random
from datetime import datetime, timedelta
from mongoengine import connect, disconnect
from users.models import User
from deals.models import Deal
from projects.models import Project

def create_test_projects():
    """Function to create test projects for development and testing"""
    
    # Connect to MongoDB
    try:
        # Disconnect if already connected
        disconnect()
        
        # Try to connect with default settings
        connect(
            db='prs_db',
            host='localhost',
            port=27017,
            alias='default'
        )
        
        print("Connected to MongoDB successfully")
        
        # Get verified deals
        verified_deals = Deal.objects(status='verified')
        
        if not verified_deals:
            print("No verified deals found. Creating a test verified deal...")
            
            # Create a test verified deal if none exists
            test_deal = Deal(
                title="Test Verified Deal",
                client_name="Test Client",
                contact_info="client@example.com",
                budget=10000,
                advance_payment=2000,
                requirements="Test requirements",
                description="Deal created for testing project management features",
                created_by="sales1",
                status="verified",
                verified_by="verifier1",
                verified_at=datetime.now(),
                is_multiproject=True
            ).save()
            
            verified_deals = [test_deal]
            print(f"Created test deal: {test_deal.title} (ID: {test_deal.id})")
        
        # Get supervisors
        supervisors = User.objects(role='supervisor')
        
        if not supervisors:
            print("No supervisors found. Please run mock_data.py first.")
            return
        
        supervisor_usernames = [sup.username for sup in supervisors]
        
        # Project statuses
        statuses = ['pending', 'in_progress', 'completed']
        
        # Project descriptions
        descriptions = [
            "Website development project including frontend and backend development",
            "Mobile application for inventory management",
            "Database migration and optimization project",
            "UI/UX redesign for client portal",
            "Integration with third-party payment system",
            "Development of custom reporting module",
            "Security audit and implementation of security measures",
            "Performance optimization of existing applications"
        ]
        
        # Clear existing test projects
        Project.objects(name__startswith="Test Project").delete()
        
        # Create test projects
        created_projects = []
        for i, deal in enumerate(verified_deals):
            # Create 2-4 projects per deal
            num_projects = random.randint(2, 4)
            
            for j in range(num_projects):
                # Create random deadline (5-30 days from now)
                days_from_now = random.randint(5, 30)
                deadline = datetime.now() + timedelta(days=days_from_now)
                
                # Pick random status
                status = random.choice(statuses)
                
                # Random additional fee (0-1000)
                additional_fee = random.randint(0, 1000) if random.random() > 0.7 else 0
                
                # Create test project
                project = Project(
                    name=f"Test Project {i+1}-{j+1}",
                    deal_id=str(deal.id),
                    supervisor=random.choice(supervisor_usernames),
                    description=random.choice(descriptions),
                    deadline=deadline,
                    status=status,
                    additional_fee=additional_fee,
                    created_at=datetime.now() - timedelta(days=random.randint(1, 10)),
                    updated_at=datetime.now() - timedelta(days=random.randint(0, 5))
                )
                
                # Sometimes add a path to (mock) files for testing
                if random.random() > 0.5:
                    project.files = f"/media/projects/{deal.id}/files_{j+1}"
                    
                # Add mock receipt file if there's an additional fee
                if additional_fee > 0:
                    project.receipt_file = f"/media/projects/{deal.id}/receipt_{j+1}.pdf"
                    
                project.save()
                
                created_projects.append(project)
                print(f"Created project: {project.name} (ID: {project.id})")
        
        print(f"\nCreated {len(created_projects)} test projects successfully!")
                
    except Exception as e:
        print(f"Error creating test projects: {e}")
        sys.exit(1)

if __name__ == "__main__":
    create_test_projects()
