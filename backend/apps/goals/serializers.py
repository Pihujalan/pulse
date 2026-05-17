from rest_framework import serializers
from .models import GoalSheet, GoalEntry, SharedGoal
from apps.users.serializers import UserMinimalSerializer
from services.progress import ProgressCalculator


class GoalEntrySerializer(serializers.ModelSerializer):
    progress_score = serializers.SerializerMethodField()
    is_shared = serializers.ReadOnlyField()
    is_primary_owner = serializers.ReadOnlyField()

    class Meta:
        model = GoalEntry
        fields = '__all__'
        read_only_fields = ['goal_sheet', 'is_synced_achievement']

    def get_progress_score(self, obj):
        calc = ProgressCalculator(obj)
        return calc.score()


class GoalEntryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoalEntry
        fields = ['title', 'description', 'thrust_area', 'uom_type', 'target', 'weightage', 'deadline', 'shared_goal']

    def validate(self, data):
        uom = data.get('uom_type')
        target = data.get('target', 0)
        if uom != 'ZERO' and target <= 0:
            raise serializers.ValidationError({'target': 'Target must be greater than zero for this measurement type.'})
        if uom == 'TIMELINE' and not data.get('deadline'):
            raise serializers.ValidationError({'deadline': 'Deadline is required for Timeline goals.'})
        w = data.get('weightage', 0)
        if w < 10:
            raise serializers.ValidationError({'weightage': 'Each goal must have at least 10% weightage.'})
        if w != int(w):
            raise serializers.ValidationError({'weightage': 'Weightage must be a whole number percentage.'})
        return data


class GoalSheetSerializer(serializers.ModelSerializer):
    goals = GoalEntrySerializer(many=True, read_only=True)
    employee_detail = UserMinimalSerializer(source='employee', read_only=True)
    total_weightage = serializers.ReadOnlyField()

    class Meta:
        model = GoalSheet
        fields = '__all__'
        read_only_fields = ['employee', 'is_locked', 'submitted_at', 'approved_at', 'approved_by']


class GoalSheetSubmitSerializer(serializers.Serializer):
    """Validates goal sheet is ready for submission."""

    def validate(self, data):
        sheet = self.context['sheet']
        goals = list(sheet.goals.all())

        if len(goals) == 0:
            raise serializers.ValidationError('Add at least one goal before submitting.')
        if len(goals) > 8:
            raise serializers.ValidationError('Maximum 8 goals per employee per cycle.')

        for g in goals:
            if g.weightage < 10:
                raise serializers.ValidationError(f'Goal "{g.title}" has weightage below 10%.')

        total = sum(g.weightage for g in goals)
        if total != 100:
            raise serializers.ValidationError(
                f'Total weightage must equal 100%. Current total: {total}%.'
            )
        return data


class SharedGoalSerializer(serializers.ModelSerializer):
    created_by_detail = UserMinimalSerializer(source='created_by', read_only=True)
    primary_owner_detail = UserMinimalSerializer(source='primary_owner', read_only=True)

    class Meta:
        model = SharedGoal
        fields = '__all__'
        read_only_fields = ['created_by', 'pushed_at']


class ManagerEditGoalSerializer(serializers.ModelSerializer):
    """Manager can only edit target and weightage during review."""
    class Meta:
        model = GoalEntry
        fields = ['target', 'weightage']

    def validate_weightage(self, value):
        if value < 10:
            raise serializers.ValidationError('Each goal must have at least 10% weightage.')
        return value

    def validate_target(self, value):
        if value <= 0:
            raise serializers.ValidationError('Target must be greater than zero.')
        return value
