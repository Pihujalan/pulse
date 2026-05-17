from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers
from django.utils import timezone
from .models import QuarterWindow


class QuarterWindowSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuarterWindow
        fields = '__all__'


class QuarterWindowView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        year = int(request.query_params.get('year', timezone.now().year))
        windows = QuarterWindow.objects.filter(cycle_year=year)
        return Response(QuarterWindowSerializer(windows, many=True).data)

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Forbidden'}, status=403)
        ser = QuarterWindowSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=201)

    def patch(self, request, window_id):
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Forbidden'}, status=403)
        from django.shortcuts import get_object_or_404
        window = get_object_or_404(QuarterWindow, pk=window_id)
        ser = QuarterWindowSerializer(window, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)
