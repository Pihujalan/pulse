#!/usr/bin/env python
"""
Seed script — populates Pulse with realistic demo data.
Run: docker-compose exec backend python scripts/seed.py
Or:  python manage.py shell < scripts/seed.py
"""
import os
import sys
import django

# Ensure Django is set up
if 'DJANGO_SETTINGS_MODULE' not in os.environ:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    django.setup()

from django.utils import timezone
from datetime import date, timedelta
from apps.users.models import User
from apps.goals.models import GoalSheet, GoalEntry, SharedGoal
from apps.checkins.models import CheckIn
from apps.cycles.models import QuarterWindow
from apps.escalations.models import EscalationLog

print("🌱 Seeding Pulse demo data...")

# ─── Clear existing data ───────────────────────────────────────────────────────
CheckIn.objects.all().delete()
EscalationLog.objects.all().delete()
GoalEntry.objects.all().delete()
GoalSheet.objects.all().delete()
SharedGoal.objects.all().delete()
QuarterWindow.objects.all().delete()
User.objects.all().delete()

YEAR = 2025

# ─── Create Users ──────────────────────────────────────────────────────────────

# Admin/HR
admin = User.objects.create_user(
    email='admin@pulse.demo',
    password='pulse123',
    full_name='Priya Sharma',
    role='ADMIN',
    department='Human Resources',
)

# Managers
mgr1 = User.objects.create_user(
    email='manager@pulse.demo',
    password='pulse123',
    full_name='Rahul Mehta',
    role='MANAGER',
    department='Sales',
)
mgr2 = User.objects.create_user(
    email='manager2@pulse.demo',
    password='pulse123',
    full_name='Ananya Iyer',
    role='MANAGER',
    department='Engineering',
)

# Employees
emp1 = User.objects.create_user(
    email='employee@pulse.demo',
    password='pulse123',
    full_name='Aditya Kumar',
    role='EMPLOYEE',
    department='Sales',
    manager=mgr1,
)
emp2 = User.objects.create_user(
    email='employee2@pulse.demo',
    password='pulse123',
    full_name='Sneha Patel',
    role='EMPLOYEE',
    department='Sales',
    manager=mgr1,
)
emp3 = User.objects.create_user(
    email='employee3@pulse.demo',
    password='pulse123',
    full_name='Vikram Singh',
    role='EMPLOYEE',
    department='Engineering',
    manager=mgr2,
)
emp4 = User.objects.create_user(
    email='employee4@pulse.demo',
    password='pulse123',
    full_name='Meera Nair',
    role='EMPLOYEE',
    department='Engineering',
    manager=mgr2,
)
emp5 = User.objects.create_user(
    email='employee5@pulse.demo',
    password='pulse123',
    full_name='Rohan Das',
    role='EMPLOYEE',
    department='Sales',
    manager=mgr1,
)

print("✅ Users created")

# ─── Quarter Windows ───────────────────────────────────────────────────────────
QuarterWindow.objects.create(cycle_year=YEAR, quarter='Q1', window_opens=date(YEAR, 7, 1), window_closes=date(YEAR, 7, 31), is_active=False)
QuarterWindow.objects.create(cycle_year=YEAR, quarter='Q2', window_opens=date(YEAR, 10, 1), window_closes=date(YEAR, 10, 31), is_active=True)  # currently open
QuarterWindow.objects.create(cycle_year=YEAR, quarter='Q3', window_opens=date(YEAR+1, 1, 1), window_closes=date(YEAR+1, 1, 31), is_active=False)
QuarterWindow.objects.create(cycle_year=YEAR, quarter='Q4', window_opens=date(YEAR+1, 3, 1), window_closes=date(YEAR+1, 3, 31), is_active=False)

print("✅ Quarter windows created (Q2 is currently open)")

# ─── Shared Goal ──────────────────────────────────────────────────────────────
shared_goal = SharedGoal.objects.create(
    created_by=mgr1,
    primary_owner=emp1,
    title='Achieve 95% Customer Satisfaction Score (CSAT)',
    description='All Sales team members must contribute to org-wide CSAT target through quality interactions.',
    uom_type='MIN',
    target=95,
    thrust_area='Customer Excellence',
    cycle_year=YEAR,
)
print("✅ Shared goal created")

# ─── Aditya Kumar — APPROVED goals with check-ins ──────────────────────────────
sheet1 = GoalSheet.objects.create(employee=emp1, cycle_year=YEAR, status='APPROVED', is_locked=True, approved_by=mgr1, submitted_at=timezone.now(), approved_at=timezone.now())
g1 = GoalEntry.objects.create(goal_sheet=sheet1, title='Achieve ₹50L Monthly Recurring Revenue', description='Drive MRR to ₹50 lakhs through new client acquisition and upselling.', thrust_area='Revenue Growth', uom_type='MIN', target=50, weightage=30, achievement=42)
g2 = GoalEntry.objects.create(goal_sheet=sheet1, title='Onboard 15 New Enterprise Clients', description='Sign and onboard enterprise accounts with ACV > ₹5L.', thrust_area='Client Acquisition', uom_type='MIN', target=15, weightage=25, achievement=11)
g3 = GoalEntry.objects.create(goal_sheet=sheet1, title='Reduce Sales Cycle TAT to 30 Days', description='Reduce average deal close time from 45 to 30 days.', thrust_area='Process Improvement', uom_type='MAX', target=30, weightage=20, achievement=35)
g4 = GoalEntry.objects.create(goal_sheet=sheet1, shared_goal=shared_goal, title='Achieve 95% Customer Satisfaction Score (CSAT)', description='All Sales team members must contribute to org-wide CSAT target.', thrust_area='Customer Excellence', uom_type='MIN', target=95, weightage=15, achievement=92, is_synced_achievement=True)
g5 = GoalEntry.objects.create(goal_sheet=sheet1, title='Zero Safety Incidents in Client Visits', description='Maintain zero safety incidents during all on-site client visits.', thrust_area='Safety & Compliance', uom_type='ZERO', target=0, weightage=10, achievement=0)

# Q1 check-ins for Aditya
for goal, planned, actual, st in [
    (g1, 40, 38, 'ON_TRACK'), (g2, 10, 8, 'ON_TRACK'), (g3, 35, 38, 'ON_TRACK'),
    (g4, 90, 89, 'ON_TRACK'), (g5, 0, 0, 'COMPLETED')
]:
    CheckIn.objects.create(goal_entry=goal, quarter='Q1', planned_target=planned, actual_achievement=actual, status=st, employee_note='Progress on track.', manager_comment='Good progress, keep it up.')

print("✅ Aditya Kumar (employee@pulse.demo) — APPROVED + Q1 done")

# ─── Sneha Patel — APPROVED, partial check-ins ─────────────────────────────────
sheet2 = GoalSheet.objects.create(employee=emp2, cycle_year=YEAR, status='APPROVED', is_locked=True, approved_by=mgr1, submitted_at=timezone.now(), approved_at=timezone.now())
GoalEntry.objects.create(goal_sheet=sheet2, title='Generate ₹30L in Outbound Pipeline', thrust_area='Revenue Growth', uom_type='MIN', target=30, weightage=35, achievement=18)
GoalEntry.objects.create(goal_sheet=sheet2, title='Conduct 50 Product Demo Sessions', thrust_area='Client Acquisition', uom_type='MIN', target=50, weightage=25, achievement=31)
GoalEntry.objects.create(goal_sheet=sheet2, title='Reduce Churn Rate Below 5%', thrust_area='Retention', uom_type='MAX', target=5, weightage=20, achievement=7.2)
GoalEntry.objects.create(goal_sheet=sheet2, shared_goal=shared_goal, title='Achieve 95% Customer Satisfaction Score (CSAT)', thrust_area='Customer Excellence', uom_type='MIN', target=95, weightage=10, achievement=92, is_synced_achievement=True)
GoalEntry.objects.create(goal_sheet=sheet2, title='Complete Sales Certification Program', thrust_area='Learning & Development', uom_type='TIMELINE', target=1, weightage=10, deadline=date(YEAR, 9, 30))

print("✅ Sneha Patel — APPROVED")

# ─── Vikram Singh — MANAGER_REVIEW (pending approval) ─────────────────────────
sheet3 = GoalSheet.objects.create(employee=emp3, cycle_year=YEAR, status='MANAGER_REVIEW', submitted_at=timezone.now())
GoalEntry.objects.create(goal_sheet=sheet3, title='Deliver 3 Product Features on Schedule', thrust_area='Product Delivery', uom_type='TIMELINE', target=1, weightage=30, deadline=date(YEAR, 12, 31))
GoalEntry.objects.create(goal_sheet=sheet3, title='Achieve 99.9% System Uptime', thrust_area='Reliability', uom_type='MIN', target=99.9, weightage=25)
GoalEntry.objects.create(goal_sheet=sheet3, title='Reduce P1 Bug Count to Zero', thrust_area='Quality', uom_type='ZERO', target=0, weightage=25)
GoalEntry.objects.create(goal_sheet=sheet3, title='Reduce Deployment Time by 40%', thrust_area='Process Improvement', uom_type='MAX', target=60, weightage=20)

print("✅ Vikram Singh — MANAGER_REVIEW (pending for manager2)")

# ─── Meera Nair — RETURNED for rework ────────────────────────────────────────
sheet4 = GoalSheet.objects.create(employee=emp4, cycle_year=YEAR, status='RETURNED', return_reason='Weightage distribution needs adjustment. The reliability goal deserves more weightage than learning goals. Please revise and resubmit.', submitted_at=timezone.now())
GoalEntry.objects.create(goal_sheet=sheet4, title='Implement 5 API Integrations', thrust_area='Product Delivery', uom_type='MIN', target=5, weightage=20)
GoalEntry.objects.create(goal_sheet=sheet4, title='Reduce API Response Time to <200ms', thrust_area='Performance', uom_type='MAX', target=200, weightage=20)
GoalEntry.objects.create(goal_sheet=sheet4, title='Achieve Zero Critical Security Vulnerabilities', thrust_area='Security', uom_type='ZERO', target=0, weightage=20)
GoalEntry.objects.create(goal_sheet=sheet4, title='Complete AWS Solutions Architect Certification', thrust_area='Learning', uom_type='TIMELINE', target=1, weightage=20, deadline=date(YEAR, 11, 30))
GoalEntry.objects.create(goal_sheet=sheet4, title='Mentor 2 Junior Engineers', thrust_area='People Development', uom_type='MIN', target=2, weightage=20)

print("✅ Meera Nair — RETURNED for rework")

# ─── Rohan Das — DRAFT (new employee) ────────────────────────────────────────
sheet5 = GoalSheet.objects.create(employee=emp5, cycle_year=YEAR, status='DRAFT')
GoalEntry.objects.create(goal_sheet=sheet5, title='Build 20 New Client Relationships', thrust_area='Client Acquisition', uom_type='MIN', target=20, weightage=40)
GoalEntry.objects.create(goal_sheet=sheet5, title='Achieve ₹20L in New Sales', thrust_area='Revenue Growth', uom_type='MIN', target=20, weightage=60)

print("✅ Rohan Das — DRAFT (in progress)")

# ─── Escalation sample ────────────────────────────────────────────────────────
EscalationLog.objects.create(
    employee=emp4,
    escalation_type='NO_SUBMISSION',
    notified_to=mgr2,
    notes='Goal sheet returned for rework 15 days ago, no resubmission.',
    is_resolved=False,
)

print("✅ Escalation created for Meera Nair")

print("\n" + "="*60)
print("🎉 PULSE SEED DATA COMPLETE")
print("="*60)
print("\n📋 DEMO ACCOUNTS:")
print(f"  Admin/HR:   admin@pulse.demo     / pulse123")
print(f"  Manager 1:  manager@pulse.demo   / pulse123  (Sales team)")
print(f"  Manager 2:  manager2@pulse.demo  / pulse123  (Engineering team)")
print(f"  Employee 1: employee@pulse.demo  / pulse123  (Approved + check-ins)")
print(f"  Employee 2: employee2@pulse.demo / pulse123  (Approved)")
print(f"  Employee 3: employee3@pulse.demo / pulse123  (Pending review)")
print(f"  Employee 4: employee4@pulse.demo / pulse123  (Returned for rework)")
print(f"  Employee 5: employee5@pulse.demo / pulse123  (Draft in progress)")
print(f"\n  Year: {YEAR} | Q2 check-in window is OPEN")
