from django.urls import path
from .views import CheckInView, TeamCheckInsView, ExportReportView

urlpatterns = [
    path('checkins/goal/<int:goal_id>/', CheckInView.as_view()),
    path('checkins/goal/<int:goal_id>/<int:checkin_id>/', CheckInView.as_view()),
    path('checkins/team/', TeamCheckInsView.as_view()),
    path('checkins/export/', ExportReportView.as_view()),
]
