from django.urls import path
from .views import GoalSuggestView, CheckinDraftView

urlpatterns = [
    path('ai/suggest-goal/', GoalSuggestView.as_view()),
    path('ai/draft-checkin-comment/', CheckinDraftView.as_view()),
]
