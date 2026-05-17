from rest_framework import serializers
from .models import CheckIn
from services.progress import ProgressCalculator


class CheckInSerializer(serializers.ModelSerializer):
    progress_score = serializers.SerializerMethodField()

    class Meta:
        model = CheckIn
        fields = '__all__'
        read_only_fields = ['goal_entry', 'checked_in_at', 'manager_reviewed_at']

    def get_progress_score(self, obj):
        calc = ProgressCalculator(obj.goal_entry)
        return calc.score_percentage()


class CheckInCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckIn
        fields = ['quarter', 'planned_target', 'actual_achievement', 'status', 'employee_note']


class ManagerCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckIn
        fields = ['manager_comment']
