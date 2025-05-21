from mongoengine import Document, StringField, DateTimeField, ReferenceField, URLField
from datetime import datetime
from users.models import User

class Client(Document):
    # Basic client information
    name = StringField(required=True)  # Contact person's name
    company_name = StringField()      # Company/organization name (if applicable)
    
    # Contact details
    contact_info = StringField()      # Primary contact info (email/phone)
    email = StringField()             # Business email
    phone = StringField()             # Business phone
    
    # Location information
    address = StringField()           # Physical address
    city = StringField()              # City
    state = StringField()             # State/Province
    country = StringField()           # Country
    postal_code = StringField()       # Postal/Zip code
    
    # Online presence
    website = URLField()              # Business website
    
    # Metadata
    notes = StringField()             # Additional notes about the client
    created_by = ReferenceField(User, required=True)  # Reference to the salesperson who created this client
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'clients',
        'indexes': [
            'created_by',
            ('created_by', 'name'),  # Compound index
            ('created_by', 'company_name')
        ]
    }
    
    def to_dict(self):
        """Convert client document to dictionary"""
        return {
            'id': str(self.id),
            'name': self.name,
            'company_name': self.company_name,
            'contact_info': self.contact_info,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'city': self.city,
            'state': self.state,
            'country': self.country,
            'postal_code': self.postal_code,
            'website': self.website,
            'notes': self.notes,
            'created_by': self.created_by.username if self.created_by else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
