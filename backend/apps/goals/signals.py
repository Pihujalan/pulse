from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from django.db import transaction


@receiver(pre_save, sender='goals.GoalSheet')
def handle_goal_sheet_status_change(sender, instance, **kwargs):
    """Handle side effects on status changes."""
    if not instance.pk:
        return

    try:
        old = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    # Lock on approval
    if old.status != 'APPROVED' and instance.status == 'APPROVED':
        instance.is_locked = True
        instance.approved_at = timezone.now()

    # Set submitted_at
    if old.status == 'DRAFT' and instance.status == 'SUBMITTED':
        instance.submitted_at = timezone.now()


@receiver(post_save, sender='goals.GoalSheet')
def audit_goal_sheet_changes(sender, instance, created, **kwargs):
    """Log goal sheet status changes."""
    from apps.audit.models import AuditLog
    if not created:
        AuditLog.objects.create(
            actor=instance.approved_by or instance.employee,
            action=f'GOALSHEET_{instance.status}',
            target_model='GoalSheet',
            target_id=str(instance.pk),
            new_value={'status': instance.status, 'is_locked': instance.is_locked},
        )


@receiver(post_save, sender='goals.GoalEntry')
def sync_shared_goal_achievement(sender, instance, **kwargs):
    """When primary owner saves achievement on a shared goal, propagate to all recipients."""
    if not instance.shared_goal:
        return
    if not instance.is_primary_owner:
        return
    if instance.achievement is None:
        return

    with transaction.atomic():
        linked = sender.objects.filter(
            shared_goal=instance.shared_goal
        ).exclude(pk=instance.pk)
        linked.update(achievement=instance.achievement, is_synced_achievement=True)
