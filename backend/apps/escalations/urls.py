from django.urls import path
from .views import EscalationView

urlpatterns = [
    path('escalations/', EscalationView.as_view()),
    path('escalations/<int:esc_id>/', EscalationView.as_view()),
]
