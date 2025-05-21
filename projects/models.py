from django.db import models
from mongoengine import Document, StringField, ReferenceField, DateTimeField, FloatField
from datetime import datetime

class Project(Document):
    deal_id = StringField(required=True)  # ID of the associated deal
    name = StringField(required=True)
    description = StringField(default="")
    supervisor = StringField(required=True)
    deadline = DateTimeField()
    files = StringField()  # Path to uploaded files/zip
    additional_fee = FloatField(default=0)  # For projects added to verified deals
    receipt_file = StringField()  # For projects added to verified deals
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    status = StringField(choices=[
        "pending",
        "in_progress",
        "completed"
    ], default="pending")

    meta = {'collection': 'projects'}

# Create your models here.
