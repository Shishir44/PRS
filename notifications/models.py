from django.db import models
from mongoengine import Document, StringField, ReferenceField, DateTimeField
from datetime import datetime

class Notification(Document):
    recipient = StringField(required=True)
    message = StringField(required=True)
    deal = ReferenceField('Deal', required=False)
    created_at = DateTimeField(default=datetime.utcnow)
    meta = {'collection': 'notifications'}
