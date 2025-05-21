from mongoengine import Document, StringField, ReferenceField, DateTimeField, FloatField, IntField, ListField
from datetime import datetime

class Project(Document):
    deal = ReferenceField('Deal', required=True)  # Reference to Deal document
    deal_id = StringField()  # For compatibility with older code
    name = StringField(required=True)
    description = StringField(default="")
    supervisor = StringField(required=True)
    assigned_by = StringField()  # The salesperson who assigned the project
    deadline = DateTimeField(required=True)
    status = StringField(choices=[
        "pending",
        "in_progress",
        "completed"
    ], default="pending")
    files = StringField()  # Path to project files directory (deprecated, use ProjectFile)
    additional_fee = FloatField(default=0)  # For verified deal projects
    receipt_file = StringField()  # Receipt for additional fee
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'projects',
        'indexes': [
            {'fields': ['deal']},
            {'fields': ['supervisor']},
            {'fields': ['status']},
            {'fields': ['deal', 'status']}
        ]
    }
    
    def save(self, *args, **kwargs):
        # Ensure deal_id is set for backward compatibility
        if self.deal and not self.deal_id:
            self.deal_id = str(self.deal.id)
        self.updated_at = datetime.utcnow()
        return super(Project, self).save(*args, **kwargs)
        
    def get_files(self):
        """Get all files associated with this project"""
        return ProjectFile.objects(project=self)


class ProjectFile(Document):
    """Model for handling files associated with projects"""
    project = ReferenceField('Project', required=True)  # Reference to Project document
    file_name = StringField(required=True)  # Original file name
    file_path = StringField(required=True)  # Path in storage
    file_type = StringField()  # MIME type
    file_size = IntField()  # Size in bytes
    description = StringField(default="")  # Optional description
    uploaded_by = StringField()  # Username of uploader
    uploaded_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'project_files',
        'indexes': [
            {'fields': ['project']},
            {'fields': ['uploaded_by']},
            {'fields': ['uploaded_at']}
        ]
    }
    
    def get_url(self):
        """Get the URL for accessing this file"""
        return f'/media/{self.file_path}'
    
    def to_dict(self):
        """Convert the file object to a dictionary for API responses"""
        return {
            'id': str(self.id),
            'project_id': str(self.project.id),
            'project_name': self.project.name,
            'file_name': self.file_name,
            'url': self.get_url(),
            'file_type': self.file_type,
            'size': self.file_size,
            'description': self.description,
            'uploaded_by': self.uploaded_by,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }
