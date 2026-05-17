from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import EscalationLog


class EscalationSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    notified_to_name = serializers.SerializerMethodField()

    class Meta:
        model = EscalationLog
        fields = '__all__'

    def get_employee_name(self, obj):
        return obj.employee.full_name

    def get_notified_to_name(self, obj):
        return obj.notified_to.full_name if obj.notified_to else None


class EscalationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['MANAGER', 'ADMIN']:
            return Response({'detail': 'Forbidden'}, status=403)
        if request.user.role == 'MANAGER':
            qs = EscalationLog.objects.filter(employee__manager=request.user)
        else:
            qs = EscalationLog.objects.all()
        unresolved_only = request.query_params.get('unresolved') == 'true'
        if unresolved_only:
            qs = qs.filter(is_resolved=False)
        return Response(EscalationSerializer(qs[:100], many=True).data)

    def post(self, request):
        """Manual escalation trigger."""
        if request.user.role not in ['MANAGER', 'ADMIN']:
            return Response({'detail': 'Forbidden'}, status=403)
        from apps.users.models import User
        employee_id = request.data.get('employee_id')
        emp = get_object_or_404(User, pk=employee_id)
        esc = EscalationLog.objects.create(
            employee=emp,
            escalation_type='MANUAL',
            notified_to=request.user,
            notes=request.data.get('notes', ''),
        )
        return Response(EscalationSerializer(esc).data, status=201)

    def patch(self, request, esc_id):
        """Resolve escalation."""
        esc = get_object_or_404(EscalationLog, pk=esc_id)
        esc.is_resolved = True
        esc.resolved_at = timezone.now()
        esc.save()
        return Response(EscalationSerializer(esc).data)
