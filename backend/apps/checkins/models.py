from django.db import models
from apps.goals.models import GoalEntry


class CheckIn(models.Model):
    QUARTER_CHOICES = [('Q1', 'Q1'), ('Q2', 'Q2'), ('Q3', 'Q3'), ('Q4', 'Q4')]
    STATUS_CHOICES = [
        ('NOT_STARTED', 'Not Started'),
        ('ON_TRACK', 'On Track'),
        ('COMPLETED', 'Completed'),
    ]

    goal_entry = models.ForeignKey(GoalEntry, on_delete=models.CASCADE, related_name='checkins')
    quarter = models.CharField(max_length=2, choices=QUARTER_CHOICES)
    planned_target = models.FloatField()
    actual_achievement = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='NOT_STARTED')
    employee_note = models.TextField(blank=True)
    manager_comment = models.TextField(blank=True)
    checked_in_at = models.DateTimeField(auto_now_add=True)
    manager_reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('goal_entry', 'quarter')
        ordering = ['quarter']

    def __str__(self):
        return f"{self.goal_entry.title} — {self.quarter}"
