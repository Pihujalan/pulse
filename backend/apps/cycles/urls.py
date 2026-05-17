from django.urls import path
from .views import QuarterWindowView

urlpatterns = [
    path('cycles/windows/', QuarterWindowView.as_view()),
    path('cycles/windows/<int:window_id>/', QuarterWindowView.as_view()),
]
