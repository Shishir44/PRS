from mongoengine import Document, StringField, ReferenceField, FloatField, ListField, DateTimeField, ValidationError, BooleanField
from datetime import datetime

class Deal(Document):
    title = StringField(required=True)
    client_name = StringField(required=True)
    client = ReferenceField('Client', required=False)
    contact_info = StringField(required=True)
    initiation_date = DateTimeField()  # User-specified deal initiation date
    requirements = StringField()
    description = StringField()  # Deal description/summary
    budget = FloatField(required=True)
    advance_payment = FloatField(default=0)
    receipt_file = StringField()  # Store file path/URL
    is_multiproject = BooleanField(default=False)  # Whether the deal involves multiple projects
    status = StringField(choices=[
        "draft",
        "pending_verification",
        "verified",
        "rejected",
        "completed"
    ], default="draft")
    
    # Creator and timestamps
    created_by = StringField(required=True)  # Salesperson
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    # Verification details
    verified_by = StringField()
    verified_at = DateTimeField()
    rejection_reason = StringField()
    
    # Project references
    projects = ListField(ReferenceField('Project'))

    meta = {
        'collection': 'deals',
        'indexes': [
            'status',
            'created_by',
            'verified_by',
            ('status', 'created_at')
        ]
    }

    def submit_for_verification(self):
        if not self.receipt_file:
            raise ValidationError("Receipt file is required for verification")
        self.status = "pending_verification"
        self.save()

    def verify(self, verifier):
        self.status = "verified"
        self.verified_by = verifier
        self.verified_at = datetime.utcnow()
        self.save()

    def reject(self, verifier, reason):
        self.status = "rejected"
        self.verified_by = verifier
        self.verified_at = datetime.utcnow()
        self.rejection_reason = reason
        self.save()

    def to_dict(self):
        data = {
            'id': str(self.id),
            'title': self.title,
            'client_name': self.client_name,
            'contact_info': self.contact_info,
            'initiation_date': self.initiation_date.isoformat() if self.initiation_date else None,
            'requirements': self.requirements,
            'description': self.description,
            'budget': self.budget,
            'advance_payment': self.advance_payment,
            'receipt_file': self.receipt_file,
            'is_multiproject': self.is_multiproject,
            'status': self.status,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'verified_by': self.verified_by,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'rejection_reason': self.rejection_reason,
            'projects': [str(p.id) for p in self.projects] if self.projects else [],
        }
        # Add client info if present
        if self.client:
            data['client'] = self.client.to_dict()
            data['client_id'] = str(self.client.id)
        else:
            data['client'] = None
            data['client_id'] = None
        return data

# Create your models here.
