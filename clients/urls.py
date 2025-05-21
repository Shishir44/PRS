from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.create_client, name='create_client'),
    path('list/', views.list_clients, name='list_clients'),
    path('details/<str:client_id>/', views.client_details, name='client_details'),
    path('update/<str:client_id>/', views.update_client, name='update_client'),
    path('delete/<str:client_id>/', views.delete_client, name='delete_client'),
]
