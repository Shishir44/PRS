from django.db import models
from mongoengine import Document, StringField, ReferenceField, FloatField, ListField, DateTimeField, ValidationError, BooleanField
from datetime import datetime

class Deal(Document):
    title = StringField(required=True)
    client_name = StringField(required=True)
    contact_info = StringField(required=True)
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

# Create your models here.
