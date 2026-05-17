from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer, UserSerializer
from .models import User


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class TeamMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'MANAGER':
            team = User.objects.filter(manager=user, is_active=True)
        elif user.role == 'ADMIN':
            team = User.objects.filter(is_active=True).exclude(role='ADMIN')
        else:
            team = User.objects.none()
        from .serializers import UserMinimalSerializer
        return Response(UserMinimalSerializer(team, many=True).data)


class AllUsersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['ADMIN', 'MANAGER']:
            return Response({'detail': 'Forbidden'}, status=403)
        users = User.objects.filter(is_active=True)
        from .serializers import UserSerializer
        return Response(UserSerializer(users, many=True).data)
