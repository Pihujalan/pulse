from django.db import models
from apps.users.models import User


class SharedGoal(models.Model):
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_shared_goals')
    primary_owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_shared_goals')
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    uom_type = models.CharField(max_length=10, choices=[
        ('MIN', 'Numeric/Percentage (Higher is Better)'),
        ('MAX', 'Numeric (Lower is Better)'),
        ('TIMELINE', 'Timeline/Date-based'),
        ('ZERO', 'Zero-based (Zero = Success)'),
    ])
    target = models.FloatField()
    thrust_area = models.CharField(max_length=200)
    cycle_year = models.IntegerField()
    pushed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[Shared] {self.title} ({self.cycle_year})"


class GoalSheet(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('MANAGER_REVIEW', 'Manager Review'),
        ('APPROVED', 'Approved'),
        ('RETURNED', 'Returned for Rework'),
    ]

    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goal_sheets')
    cycle_year = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    is_locked = models.BooleanField(default=False)
    return_reason = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='approved_sheets')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('employee', 'cycle_year')
        ordering = ['-cycle_year', 'employee__full_name']

    def __str__(self):
        return f"{self.employee.full_name} — {self.cycle_year} ({self.status})"

    @property
    def total_weightage(self):
        return sum(g.weightage for g in self.goals.all())


class GoalEntry(models.Model):
    UOM_CHOICES = [
        ('MIN', 'Numeric/% (Higher is Better)'),
        ('MAX', 'Numeric (Lower is Better)'),
        ('TIMELINE', 'Timeline/Date-based'),
        ('ZERO', 'Zero-based'),
    ]

    goal_sheet = models.ForeignKey(GoalSheet, on_delete=models.CASCADE, related_name='goals')
    shared_goal = models.ForeignKey(SharedGoal, null=True, blank=True, on_delete=models.SET_NULL, related_name='linked_entries')
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    thrust_area = models.CharField(max_length=200)
    uom_type = models.CharField(max_length=10, choices=UOM_CHOICES)
    target = models.FloatField()
    weightage = models.IntegerField()
    achievement = models.FloatField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    is_synced_achievement = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.title} ({self.goal_sheet.employee.full_name})"

    @property
    def is_shared(self):
        return self.shared_goal is not None

    @property
    def is_primary_owner(self):
        if not self.shared_goal:
            return False
        return self.goal_sheet.employee == self.shared_goal.primary_owner
