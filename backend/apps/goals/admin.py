from django.contrib import admin
from .models import GoalSheet, GoalEntry, SharedGoal


class GoalEntryInline(admin.TabularInline):
    model = GoalEntry
    extra = 0
    readonly_fields = ['is_synced_achievement']


@admin.register(GoalSheet)
class GoalSheetAdmin(admin.ModelAdmin):
    list_display = ['employee', 'cycle_year', 'status', 'is_locked', 'total_weightage']
    list_filter = ['status', 'cycle_year', 'is_locked']
    search_fields = ['employee__full_name', 'employee__email']
    inlines = [GoalEntryInline]


@admin.register(SharedGoal)
class SharedGoalAdmin(admin.ModelAdmin):
    list_display = ['title', 'cycle_year', 'primary_owner', 'created_by']
    list_filter = ['cycle_year']
