from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = '__all__'

    def get_actor_name(self, obj):
        return obj.actor.full_name if obj.actor else 'System'


class AuditLogView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Forbidden'}, status=403)

        qs = AuditLog.objects.all()
        user_id = request.query_params.get('user_id')
        action = request.query_params.get('action')
        model = request.query_params.get('model')

        if user_id:
            qs = qs.filter(actor_id=user_id)
        if action:
            qs = qs.filter(action__icontains=action)
        if model:
            qs = qs.filter(target_model=model)

        qs = qs[:200]
        return Response(AuditLogSerializer(qs, many=True).data)
