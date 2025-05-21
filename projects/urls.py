from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.create_project, name='create_project'),
    path('', views.list_projects, name='list_projects'),
    path('<str:project_id>/status/', views.update_project_status, name='update_project_status'),
    path('<str:project_id>/upload/', views.upload_project_files, name='upload_project_files'),
    path('files/', views.list_project_files, name='list_project_files'),
    path('files/<str:file_id>/delete/', views.delete_project_file, name='delete_project_file'),
]
