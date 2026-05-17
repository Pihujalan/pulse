from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from apps.users.views import LoginView, MeView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', LoginView.as_view(), name='login'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', MeView.as_view(), name='me'),
    path('api/', include('apps.goals.urls')),
    path('api/', include('apps.checkins.urls')),
    path('api/', include('apps.cycles.urls')),
    path('api/', include('apps.audit.urls')),
    path('api/', include('apps.escalations.urls')),
    path('api/', include('apps.ai.urls')),
    path('api/', include('apps.users.urls')),
]
