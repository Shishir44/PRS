import mongoengine
from users.models import User
from deals.models import Deal
from projects.models import Project
from notifications.models import Notification
from datetime import datetime
import os
from mongoengine.connection import connect, disconnect

def create_mock_data():
    """Function to create mock data for testing"""
    
    # Ensure we're connected to MongoDB
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
        
        # Clear existing data
        User.objects.delete()
        Deal.objects.delete()
        Project.objects.delete()
        Notification.objects.delete()
        
        # Create mock users
        users = [
            User(username="sales1", role="salesperson", email="sales1@example.com").save(),
            User(username="sales2", role="salesperson", email="sales2@example.com").save(),
            User(username="verifier1", role="verifier", email="verifier1@example.com").save(),
            User(username="supervisor1", role="supervisor", email="supervisor1@example.com").save(),
            User(username="supervisor2", role="supervisor", email="supervisor2@example.com").save(),
            User(username="client1", role="client", email="client1@example.com").save()
        ]

        # Create mock deals with comprehensive data
        deals = [
            # Deal 1: Draft status
            Deal(
                title="Website Development",
                client_name="ABC Corp",
                contact_info="john.doe@abccorp.com | (555) 123-4567",
                budget=10000,
                advance_payment=2000,
                requirements="Build a modern responsive website with e-commerce capabilities. Must include product catalog, shopping cart, and payment integration with Stripe and PayPal. Site should be mobile-friendly and SEO optimized.",
                created_by="sales1",
                created_at=datetime.utcnow(),
                status="draft",
                is_multiproject=True,
                description="Corporate website redesign project with focus on user experience"
            ).save(),
            
            # Deal 2: Pending verification status
            Deal(
                title="Mobile App Development",
                client_name="TechStart Inc",
                contact_info="sarah.miller@techstart.io | (555) 987-6543",
                budget=20000,
                advance_payment=5000,
                requirements="Develop cross-platform mobile applications for iOS and Android. Must include user authentication, push notifications, offline data sync, and integration with REST APIs. UI should follow Material Design guidelines.",
                created_by="sales1",
                created_at=datetime.utcnow(),
                status="pending_verification",
                receipt_file="receipts/mock_receipt.pdf",
                is_multiproject=True,
                description="Mobile app suite for customer engagement and loyalty program"
            ).save(),
            
            # Deal 3: Verified status
            Deal(
                title="SEO Services",
                client_name="Global Marketing Ltd",
                contact_info="michael.chen@globalmarketing.com | (555) 456-7890",
                budget=5000,
                advance_payment=1000,
                requirements="Comprehensive SEO optimization package including keyword research, on-page optimization, backlink building, and monthly performance reporting. Target improving organic search rankings for 20 key industry terms.",
                created_by="sales2",
                created_at=datetime.utcnow(),
                status="verified",
                verified_by="verifier1",
                verified_at=datetime.utcnow(),
                is_multiproject=True,
                description="6-month SEO campaign to improve online visibility"
            ).save(),
            
            # Deal 4: Rejected status
            Deal(
                title="Data Analytics Dashboard",
                client_name="FinTech Solutions",
                contact_info="alex.rodriguez@fintechsolutions.net | (555) 333-2222",
                budget=15000,
                advance_payment=3000,
                requirements="Build a comprehensive data analytics dashboard with real-time data visualization. Should include custom reports, export functionality, and role-based access control. Integration with existing SQL and NoSQL databases required.",
                created_by="sales2",
                created_at=datetime.utcnow(),
                status="rejected",
                verified_by="verifier1",
                verified_at=datetime.utcnow(),
                rejection_reason="Budget insufficient for requirements scope. Please revise budget or reduce scope of analytics features.",
                is_multiproject=True,
                description="Enterprise analytics platform for financial data"
            ).save(),
            
            # Deal 5: Another pending verification with different data
            Deal(
                title="Content Management System",
                client_name="Media Group XYZ",
                contact_info="emma.wilson@mediagroupxyz.com | (555) 777-8888",
                budget=12500,
                advance_payment=2500,
                requirements="Custom CMS development with editorial workflow, media library, and publishing controls. System should support multiple user roles, content versioning, and scheduled publishing. Integration with social media platforms required.",
                created_by="sales1",
                created_at=datetime.utcnow(),
                status="pending_verification",
                receipt_file="receipts/cms_receipt.pdf",
                is_multiproject=True,
                description="Publishing platform for digital media company"
            ).save()
        ]

        # Create mock projects
        projects = [
            Project(
                deal=deals[0],
                name="Website Frontend",
                supervisor="supervisor1"
            ).save(),
            Project(
                deal=deals[0],
                name="Website Backend",
                supervisor="supervisor1"
            ).save(),
            Project(
                deal=deals[1],
                name="iOS App",
                supervisor="supervisor1"
            ).save()
        ]

        # Add projects to deals
        deals[0].projects = [projects[0], projects[1]]
        deals[0].save()
        deals[1].projects = [projects[2]]
        deals[1].save()

        print("Mock data created successfully!")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    create_mock_data()
