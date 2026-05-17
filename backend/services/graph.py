"""
Builds the D3 force-graph data for the Goal Alignment Map.
Returns {nodes, edges} consumed by the frontend D3 component.
"""
from django.utils import timezone
from services.progress import ProgressCalculator


def _health_color(score):
    if score is None:
        return 'gray'
    if score >= 0.75:
        return 'green'
    if score >= 0.4:
        return 'amber'
    return 'red'


def build_alignment_map(year, quarter, requesting_user):
    from apps.goals.models import GoalSheet, GoalEntry, SharedGoal
    from apps.users.models import User

    nodes = []
    edges = []
    shared_hub_ids = set()

    # Filter sheets by user role
    if requesting_user.role == 'MANAGER':
        sheets = GoalSheet.objects.filter(
            cycle_year=year, employee__manager=requesting_user
        ).select_related('employee').prefetch_related('goals__shared_goal')
    elif requesting_user.role == 'ADMIN':
        sheets = GoalSheet.objects.filter(
            cycle_year=year
        ).select_related('employee').prefetch_related('goals__shared_goal')
    else:
        sheets = GoalSheet.objects.filter(
            cycle_year=year, employee=requesting_user
        ).select_related('employee').prefetch_related('goals__shared_goal')

    # Employee nodes
    for sheet in sheets:
        emp = sheet.employee
        emp_node_id = f'emp_{emp.id}'

        # Add employee node
        nodes.append({
            'id': emp_node_id,
            'type': 'employee',
            'label': emp.full_name,
            'department': emp.department,
            'employee_id': emp.id,
            'sheet_id': sheet.id,
            'sheet_status': sheet.status,
        })

        for goal in sheet.goals.all():
            calc = ProgressCalculator(goal)
            score = calc.score()
            color = _health_color(score)
            node_id = f'goal_{goal.id}'

            # Check checkin completeness for opacity
            from apps.checkins.models import CheckIn
            checkins_done = CheckIn.objects.filter(goal_entry=goal).count()
            opacity = 1.0 if checkins_done > 0 else 0.4

            nodes.append({
                'id': node_id,
                'type': 'goal',
                'label': goal.title[:40],
                'color': color,
                'size': max(goal.weightage, 10),
                'opacity': opacity,
                'score': score,
                'employee_id': emp.id,
                'employee_name': emp.full_name,
                'goal_id': goal.id,
                'sheet_id': sheet.id,
                'thrust_area': goal.thrust_area,
                'weightage': goal.weightage,
                'target': goal.target,
                'achievement': goal.achievement,
                'uom_type': goal.uom_type,
                'is_shared': goal.is_shared,
                'shared_goal_id': goal.shared_goal_id,
            })

            # Edge: employee → goal
            edges.append({'source': emp_node_id, 'target': node_id, 'type': 'owns'})

            # Shared goal hub
            if goal.shared_goal:
                hub_id = f'shared_{goal.shared_goal_id}'
                if hub_id not in shared_hub_ids:
                    shared_hub_ids.add(hub_id)
                    sg = goal.shared_goal
                    nodes.append({
                        'id': hub_id,
                        'type': 'shared_hub',
                        'label': sg.title[:40],
                        'color': 'blue',
                        'size': 30,
                        'opacity': 1.0,
                        'shared_goal_id': sg.id,
                    })

                edges.append({'source': hub_id, 'target': node_id, 'type': 'shared'})

    return {'nodes': nodes, 'edges': edges}
