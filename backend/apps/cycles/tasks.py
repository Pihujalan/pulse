from celery import shared_task
from django.utils import timezone


@shared_task
def update_quarter_windows():
    """Daily task: open/close quarter windows based on dates."""
    from .models import QuarterWindow
    today = timezone.now().date()

    for window in QuarterWindow.objects.all():
        should_be_active = window.window_opens <= today <= window.window_closes
        if window.is_active != should_be_active:
            window.is_active = should_be_active
            window.save()


@shared_task
def check_escalations():
    """Daily task: flag overdue check-ins and missing submissions."""
    from apps.goals.models import GoalSheet
    from apps.escalations.models import EscalationLog
    from apps.users.models import User
    from django.utils import timezone

    today = timezone.now().date()
    year = today.year

    # Flag employees who haven't submitted goal sheets by June 1
    if today.month >= 6:
        pending = GoalSheet.objects.filter(
            cycle_year=year, status='DRAFT'
        ).select_related('employee')
        for sheet in pending:
            exists = EscalationLog.objects.filter(
                employee=sheet.employee,
                escalation_type='NO_SUBMISSION',
                triggered_at__year=year,
                is_resolved=False
            ).exists()
            if not exists:
                manager = sheet.employee.manager
                EscalationLog.objects.create(
                    employee=sheet.employee,
                    escalation_type='NO_SUBMISSION',
                    notified_to=manager,
                    is_resolved=False,
                )
