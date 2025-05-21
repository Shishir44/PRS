from mongoengine import Document, StringField

class User(Document):
    username = StringField(required=True, unique=True)
    role = StringField(choices=["salesperson", "verifier", "client", "supervisor"], required=True)
    email = StringField(required=True)
    meta = {'collection': 'users'}
