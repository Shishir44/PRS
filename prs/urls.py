"""
URL configuration for prs project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.decorators.csrf import csrf_exempt
from deals.views import (
    create_deal, verify_deal, submit_for_verification, update_deal,
    list_deals, delete_deal
)
from projects.views import create_project, list_projects, update_project_status
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from users.views import home_view, login_view, logout_view, register_view, dashboard_view

def api_home(request):
    """API root view providing endpoint documentation."""
    api_endpoints = {
        "message": "PRS API v0.3",
        "endpoints": {
            "deals": {
                "list": {
                    "url": "/api/deals/",
                    "method": "GET",
                    "params": "?username=<username>&role=<role>&status=<status>"
                },
                "create": {
                    "url": "/api/deals/create/",
                    "method": "POST",
                    "fields": ["title", "client_name", "contact_info", "budget", "requirements", "receipt"]
                },
                "verify": {
                    "url": "/api/deals/<deal_id>/verify/",
                    "method": "POST",
                    "fields": ["action", "verifier", "reason"]
                },
                "submit": {
                    "url": "/api/deals/<deal_id>/submit/",
                    "method": "POST"
                }
            },
            "projects": {
                "list": {
                    "url": "/api/projects/",
                    "method": "GET",
                    "params": "?deal_id=<deal_id>"
                },
                "create": {
                    "url": "/api/projects/create/",
                    "method": "POST",
                    "fields": ["deal_id", "name", "supervisor"]
                }
            }
        }
    }
    return JsonResponse(api_endpoints)

urlpatterns = [
    # Web UI routes
    path("", home_view, name="home"),
    path("login/", login_view, name="login"),
    path("logout/", logout_view, name="logout"),
    path("register/", register_view, name="register"),
    path("dashboard/", dashboard_view, name="dashboard"),
    
    # Admin and API routes
    path("admin/", admin.site.urls),
    path("api/", api_home, name="api_home"),
    # Deal endpoints
    path('api/deals/create/', csrf_exempt(create_deal), name='create_deal'),
    path('api/deals/<str:deal_id>/verify/', csrf_exempt(verify_deal), name='verify_deal'),
    path('api/deals/<str:deal_id>/submit/', csrf_exempt(submit_for_verification), name='submit_deal'),
    path('api/deals/<str:deal_id>/delete/', csrf_exempt(delete_deal), name='delete_deal'),
    path('api/deals/<str:deal_id>/update/', csrf_exempt(update_deal), name='update_deal'),
    path('api/deals/', list_deals, name='list_deals'),
    # Project endpoints
    path('api/projects/create/', csrf_exempt(create_project), name='create_project'),
    path('api/projects/', list_projects, name='list_projects'),
    path('api/projects/<str:project_id>/update-status/', csrf_exempt(update_project_status), name='update_project_status'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
