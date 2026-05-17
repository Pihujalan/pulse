from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import CheckIn
from .serializers import CheckInSerializer, CheckInCreateSerializer, ManagerCommentSerializer
from apps.goals.models import GoalEntry, GoalSheet
from apps.cycles.models import QuarterWindow
from apps.audit.models import AuditLog


def check_window_open(quarter):
    """Returns (is_open, message)"""
    try:
        window = QuarterWindow.objects.get(quarter=quarter, is_active=True)
        return True, None
    except QuarterWindow.DoesNotExist:
        return False, f'{quarter} check-in window is not currently open.'


class CheckInView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, goal_id):
        goal = get_object_or_404(GoalEntry, pk=goal_id)
        # Access control
        if request.user.role == 'EMPLOYEE' and goal.goal_sheet.employee != request.user:
            return Response({'detail': 'Forbidden'}, status=403)
        if request.user.role == 'MANAGER' and goal.goal_sheet.employee.manager != request.user:
            return Response({'detail': 'Forbidden'}, status=403)

        checkins = CheckIn.objects.filter(goal_entry=goal)
        return Response(CheckInSerializer(checkins, many=True).data)

    def post(self, request, goal_id):
        goal = get_object_or_404(GoalEntry, pk=goal_id, goal_sheet__employee=request.user)

        if goal.goal_sheet.status != 'APPROVED':
            return Response({'detail': 'Goal sheet must be approved before check-ins.'}, status=400)

        quarter = request.data.get('quarter')
        if not quarter:
            return Response({'detail': 'quarter field required.'}, status=400)

        # Enforce window
        is_open, msg = check_window_open(quarter)
        if not is_open:
            return Response({'detail': msg}, status=403)

        ser = CheckInCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        checkin, created = CheckIn.objects.get_or_create(
            goal_entry=goal,
            quarter=quarter,
            defaults=ser.validated_data
        )
        if not created:
            for k, v in ser.validated_data.items():
                setattr(checkin, k, v)
            checkin.save()

        return Response(CheckInSerializer(checkin).data, status=201 if created else 200)

    def patch(self, request, goal_id, checkin_id):
        """Manager adds comment to check-in."""
        checkin = get_object_or_404(CheckIn, pk=checkin_id, goal_entry__id=goal_id)
        if request.user.role not in ['MANAGER', 'ADMIN']:
            return Response({'detail': 'Forbidden'}, status=403)

        old_comment = checkin.manager_comment
        ser = ManagerCommentSerializer(checkin, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save(manager_reviewed_at=timezone.now())

        AuditLog.objects.create(
            actor=request.user,
            action='CHECKIN_MANAGER_COMMENT',
            target_model='CheckIn',
            target_id=str(checkin.pk),
            old_value={'manager_comment': old_comment},
            new_value={'manager_comment': checkin.manager_comment},
        )
        return Response(CheckInSerializer(checkin).data)


class TeamCheckInsView(APIView):
    """Manager sees team check-in overview."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['MANAGER', 'ADMIN']:
            return Response({'detail': 'Forbidden'}, status=403)

        year = int(request.query_params.get('year', timezone.now().year))

        if request.user.role == 'MANAGER':
            sheets = GoalSheet.objects.filter(employee__manager=request.user, cycle_year=year)
        else:
            sheets = GoalSheet.objects.filter(cycle_year=year)

        result = []
        for sheet in sheets:
            emp_data = {
                'employee_id': sheet.employee.id,
                'employee_name': sheet.employee.full_name,
                'department': sheet.employee.department,
                'sheet_status': sheet.status,
                'quarters': {}
            }
            for q in ['Q1', 'Q2', 'Q3', 'Q4']:
                checkins = CheckIn.objects.filter(
                    goal_entry__goal_sheet=sheet, quarter=q
                )
                total = sheet.goals.count()
                done = checkins.exclude(status='NOT_STARTED').count()
                emp_data['quarters'][q] = {
                    'total_goals': total,
                    'checked_in': done,
                    'completion_pct': round((done / total * 100) if total > 0 else 0, 1),
                    'status': _aggregate_status(checkins)
                }
            result.append(emp_data)
        return Response(result)


def _aggregate_status(checkins):
    statuses = list(checkins.values_list('status', flat=True))
    if not statuses:
        return 'NOT_STARTED'
    if all(s == 'COMPLETED' for s in statuses):
        return 'COMPLETED'
    if any(s in ['ON_TRACK', 'COMPLETED'] for s in statuses):
        return 'ON_TRACK'
    return 'NOT_STARTED'


class ExportReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Forbidden'}, status=403)

        year = int(request.query_params.get('year', timezone.now().year))
        fmt = request.query_params.get('format', 'xlsx')
        quarters = request.query_params.getlist('quarters') or ['Q1', 'Q2', 'Q3', 'Q4']

        from services.export import generate_achievement_report
        return generate_achievement_report(year, quarters, fmt)
