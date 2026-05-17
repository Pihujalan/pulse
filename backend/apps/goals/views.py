from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import GoalSheet, GoalEntry, SharedGoal
from .serializers import (
    GoalSheetSerializer, GoalEntrySerializer, GoalEntryCreateSerializer,
    GoalSheetSubmitSerializer, SharedGoalSerializer, ManagerEditGoalSerializer
)
from apps.audit.models import AuditLog
from apps.users.models import User


class GoalSheetView(APIView):
    """Get or create goal sheet for current cycle year."""
    permission_classes = [IsAuthenticated]

    def get_cycle_year(self):
        return int(self.request.query_params.get('year', timezone.now().year))

    def get(self, request):
        year = self.get_cycle_year()
        user = request.user

        if user.role == 'EMPLOYEE':
            sheet, _ = GoalSheet.objects.get_or_create(employee=user, cycle_year=year)
            return Response(GoalSheetSerializer(sheet).data)
        elif user.role == 'MANAGER':
            sheets = GoalSheet.objects.filter(employee__manager=user, cycle_year=year)
            return Response(GoalSheetSerializer(sheets, many=True).data)
        else:  # ADMIN
            sheets = GoalSheet.objects.filter(cycle_year=year)
            return Response(GoalSheetSerializer(sheets, many=True).data)


class GoalEntryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, sheet_id):
        sheet = get_object_or_404(GoalSheet, pk=sheet_id)
        if sheet.employee != request.user:
            return Response({'detail': 'Forbidden'}, status=403)
        if sheet.is_locked:
            return Response({'detail': 'Goal sheet is locked after approval.'}, status=400)
        if sheet.status not in ['DRAFT', 'RETURNED']:
            return Response({'detail': 'Cannot add goals in current status.'}, status=400)
        if sheet.goals.count() >= 8:
            return Response({'detail': 'Maximum 8 goals per employee per cycle.'}, status=400)

        ser = GoalEntryCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        goal = ser.save(goal_sheet=sheet)
        return Response(GoalEntrySerializer(goal).data, status=201)

    def put(self, request, sheet_id, goal_id):
        sheet = get_object_or_404(GoalSheet, pk=sheet_id)
        goal = get_object_or_404(GoalEntry, pk=goal_id, goal_sheet=sheet)

        if sheet.is_locked:
            return Response({'detail': 'Goal sheet is locked.'}, status=400)

        # Manager editing during review
        if request.user.role in ['MANAGER', 'ADMIN'] and sheet.status == 'MANAGER_REVIEW':
            old_vals = {'target': goal.target, 'weightage': goal.weightage}
            ser = ManagerEditGoalSerializer(goal, data=request.data, partial=True)
            ser.is_valid(raise_exception=True)
            ser.save()
            AuditLog.objects.create(
                actor=request.user,
                action='GOAL_INLINE_EDIT',
                target_model='GoalEntry',
                target_id=str(goal.pk),
                old_value=old_vals,
                new_value={'target': goal.target, 'weightage': goal.weightage},
            )
            return Response(GoalEntrySerializer(goal).data)

        # Employee editing own draft
        if sheet.employee == request.user and sheet.status in ['DRAFT', 'RETURNED']:
            ser = GoalEntryCreateSerializer(goal, data=request.data, partial=True)
            ser.is_valid(raise_exception=True)
            ser.save()
            return Response(GoalEntrySerializer(goal).data)

        return Response({'detail': 'Forbidden'}, status=403)

    def delete(self, request, sheet_id, goal_id):
        sheet = get_object_or_404(GoalSheet, pk=sheet_id)
        goal = get_object_or_404(GoalEntry, pk=goal_id, goal_sheet=sheet)
        if sheet.employee != request.user:
            return Response({'detail': 'Forbidden'}, status=403)
        if sheet.is_locked or sheet.status not in ['DRAFT', 'RETURNED']:
            return Response({'detail': 'Cannot delete goals in current status.'}, status=400)
        goal.delete()
        return Response(status=204)


class SubmitGoalSheetView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, sheet_id):
        sheet = get_object_or_404(GoalSheet, pk=sheet_id, employee=request.user)
        if sheet.status not in ['DRAFT', 'RETURNED']:
            return Response({'detail': 'Sheet cannot be submitted in current status.'}, status=400)

        ser = GoalSheetSubmitSerializer(data={}, context={'sheet': sheet})
        ser.is_valid(raise_exception=True)

        sheet.status = 'SUBMITTED'
        sheet.save()
        return Response(GoalSheetSerializer(sheet).data)


class ManagerReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all sheets pending manager review."""
        if request.user.role not in ['MANAGER', 'ADMIN']:
            return Response({'detail': 'Forbidden'}, status=403)

        if request.user.role == 'MANAGER':
            sheets = GoalSheet.objects.filter(
                employee__manager=request.user,
                status__in=['SUBMITTED', 'MANAGER_REVIEW']
            )
        else:
            sheets = GoalSheet.objects.filter(status__in=['SUBMITTED', 'MANAGER_REVIEW'])
        return Response(GoalSheetSerializer(sheets, many=True).data)


class ManagerApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, sheet_id):
        if request.user.role not in ['MANAGER', 'ADMIN']:
            return Response({'detail': 'Forbidden'}, status=403)
        sheet = get_object_or_404(GoalSheet, pk=sheet_id)

        # Move to review first if submitted
        if sheet.status == 'SUBMITTED':
            sheet.status = 'MANAGER_REVIEW'
            sheet.save()
            return Response({'detail': 'Moved to review', **GoalSheetSerializer(sheet).data})

        if sheet.status != 'MANAGER_REVIEW':
            return Response({'detail': 'Sheet not in review status.'}, status=400)

        # Check weightage
        total = sum(g.weightage for g in sheet.goals.all())
        if total != 100:
            return Response({'detail': f'Total weightage must equal 100%. Current: {total}%.'}, status=400)

        sheet.status = 'APPROVED'
        sheet.approved_by = request.user
        sheet.save()  # signal handles lock + audit

        return Response(GoalSheetSerializer(sheet).data)


class ManagerReturnView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, sheet_id):
        if request.user.role not in ['MANAGER', 'ADMIN']:
            return Response({'detail': 'Forbidden'}, status=403)
        sheet = get_object_or_404(GoalSheet, pk=sheet_id)
        reason = request.data.get('reason', '').strip()
        if len(reason) < 10:
            return Response({'detail': 'Return reason must be at least 10 characters.'}, status=400)

        sheet.status = 'RETURNED'
        sheet.return_reason = reason
        sheet.save()
        AuditLog.objects.create(
            actor=request.user,
            action='GOALSHEET_RETURNED',
            target_model='GoalSheet',
            target_id=str(sheet.pk),
            new_value={'reason': reason},
        )
        return Response(GoalSheetSerializer(sheet).data)


class AdminUnlockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, sheet_id):
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Only admins can unlock goal sheets.'}, status=403)
        sheet = get_object_or_404(GoalSheet, pk=sheet_id)
        reason = request.data.get('reason', '').strip()
        if len(reason) < 5:
            return Response({'detail': 'Unlock reason required (min 5 chars).'}, status=400)

        sheet.is_locked = False
        sheet.save()
        AuditLog.objects.create(
            actor=request.user,
            action='GOALSHEET_UNLOCKED',
            target_model='GoalSheet',
            target_id=str(sheet.pk),
            new_value={'reason': reason, 'unlocked_by': request.user.email},
        )
        return Response({'detail': 'Goal sheet unlocked.', 'sheet': GoalSheetSerializer(sheet).data})


class SharedGoalView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        year = int(request.query_params.get('year', timezone.now().year))
        goals = SharedGoal.objects.filter(cycle_year=year)
        return Response(SharedGoalSerializer(goals, many=True).data)

    def post(self, request):
        if request.user.role not in ['MANAGER', 'ADMIN']:
            return Response({'detail': 'Forbidden'}, status=403)

        employee_ids = request.data.get('employee_ids', [])
        primary_owner_id = request.data.get('primary_owner_id')
        year = request.data.get('cycle_year', timezone.now().year)

        # Create the shared goal
        sg_data = {
            'title': request.data.get('title'),
            'description': request.data.get('description', ''),
            'uom_type': request.data.get('uom_type'),
            'target': request.data.get('target'),
            'thrust_area': request.data.get('thrust_area'),
            'cycle_year': year,
            'primary_owner_id': primary_owner_id,
        }
        ser = SharedGoalSerializer(data=sg_data)
        ser.is_valid(raise_exception=True)
        shared = ser.save(created_by=request.user)

        # Push to each employee
        created_entries = []
        for emp_id in employee_ids:
            try:
                emp = User.objects.get(pk=emp_id, role='EMPLOYEE')
                sheet, _ = GoalSheet.objects.get_or_create(employee=emp, cycle_year=year)
                entry = GoalEntry.objects.create(
                    goal_sheet=sheet,
                    shared_goal=shared,
                    title=shared.title,
                    description=shared.description,
                    thrust_area=shared.thrust_area,
                    uom_type=shared.uom_type,
                    target=shared.target,
                    weightage=10,  # default, employee sets own
                    is_synced_achievement=True,
                )
                created_entries.append(entry.id)
            except User.DoesNotExist:
                pass

        return Response({
            'shared_goal': SharedGoalSerializer(shared).data,
            'entries_created': len(created_entries),
        }, status=201)


class AlignmentMapView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from services.graph import build_alignment_map
        from django.core.cache import cache
        import json

        year = int(request.query_params.get('year', timezone.now().year))
        quarter = request.query_params.get('quarter', None)
        cache_key = f'alignment_map_{year}_{quarter}_{request.user.role}'

        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        data = build_alignment_map(year, quarter, request.user)
        cache.set(cache_key, data, timeout=300)
        return Response(data)


class AchievementUpdateView(APIView):
    """Employee logs achievement for their own goals."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, goal_id):
        goal = get_object_or_404(GoalEntry, pk=goal_id, goal_sheet__employee=request.user)
        if goal.goal_sheet.status != 'APPROVED':
            return Response({'detail': 'Goal sheet must be approved before logging achievement.'}, status=400)

        achievement = request.data.get('achievement')
        if achievement is None:
            return Response({'detail': 'achievement field required.'}, status=400)

        goal.achievement = achievement
        goal.save()
        return Response(GoalEntrySerializer(goal).data)
