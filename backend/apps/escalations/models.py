from django.db import models
from apps.users.models import User


class EscalationLog(models.Model):
    TYPE_CHOICES = [
        ('NO_SUBMISSION', 'Goal Sheet Not Submitted'),
        ('NO_CHECKIN', 'Check-in Not Completed'),
        ('OVERDUE', 'Goal Overdue'),
        ('MANUAL', 'Manual Escalation'),
    ]

    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='escalations')
    escalation_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    triggered_at = models.DateTimeField(auto_now_add=True)
    notified_to = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='received_escalations')
    resolved_at = models.DateTimeField(null=True, blank=True)
    is_resolved = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-triggered_at']

    def __str__(self):
        return f"{self.employee.full_name} — {self.escalation_type}"
