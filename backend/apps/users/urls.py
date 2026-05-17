from django.urls import path
from .views import TeamMembersView, AllUsersView

urlpatterns = [
    path('users/team/', TeamMembersView.as_view()),
    path('users/', AllUsersView.as_view()),
]
