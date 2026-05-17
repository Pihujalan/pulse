from django.urls import path
from .views import (
    GoalSheetView, GoalEntryView, SubmitGoalSheetView,
    ManagerReviewView, ManagerApproveView, ManagerReturnView,
    AdminUnlockView, SharedGoalView, AlignmentMapView, AchievementUpdateView
)

urlpatterns = [
    path('goals/sheets/', GoalSheetView.as_view()),
    path('goals/sheets/<int:sheet_id>/goals/', GoalEntryView.as_view()),
    path('goals/sheets/<int:sheet_id>/goals/<int:goal_id>/', GoalEntryView.as_view()),
    path('goals/sheets/<int:sheet_id>/submit/', SubmitGoalSheetView.as_view()),
    path('goals/sheets/<int:sheet_id>/approve/', ManagerApproveView.as_view()),
    path('goals/sheets/<int:sheet_id>/return/', ManagerReturnView.as_view()),
    path('goals/sheets/<int:sheet_id>/unlock/', AdminUnlockView.as_view()),
    path('goals/review/', ManagerReviewView.as_view()),
    path('goals/shared/', SharedGoalView.as_view()),
    path('goals/entries/<int:goal_id>/achievement/', AchievementUpdateView.as_view()),
    path('goals/alignment-map/', AlignmentMapView.as_view()),
]
