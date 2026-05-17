"""
Generates CSV/Excel achievement report for Admin/HR.
Streams the file as HTTP response.
"""
import io
import pandas as pd
from django.http import HttpResponse
from services.progress import ProgressCalculator


def generate_achievement_report(year, quarters=None, file_format='xlsx'):
    from apps.goals.models import GoalSheet, GoalEntry
    from apps.checkins.models import CheckIn

    quarters = quarters or ['Q1', 'Q2', 'Q3', 'Q4']

    rows = []
    sheets = GoalSheet.objects.filter(
        cycle_year=year
    ).select_related('employee', 'approved_by').prefetch_related('goals')

    for sheet in sheets:
        emp = sheet.employee
        for goal in sheet.goals.all():
            calc = ProgressCalculator(goal)
            score = calc.score_percentage()

            # Check-in data per quarter
            checkin_data = {}
            for q in quarters:
                try:
                    ci = CheckIn.objects.get(goal_entry=goal, quarter=q)
                    checkin_data[f'{q}_planned'] = ci.planned_target
                    checkin_data[f'{q}_actual'] = ci.actual_achievement
                    checkin_data[f'{q}_status'] = ci.status
                except CheckIn.DoesNotExist:
                    checkin_data[f'{q}_planned'] = ''
                    checkin_data[f'{q}_actual'] = ''
                    checkin_data[f'{q}_status'] = 'NOT_SUBMITTED'

            row = {
                'Employee': emp.full_name,
                'Email': emp.email,
                'Department': emp.department,
                'Manager': emp.manager.full_name if emp.manager else '',
                'Goal Title': goal.title,
                'Thrust Area': goal.thrust_area,
                'UoM': goal.uom_type,
                'Target': goal.target,
                'Weightage (%)': goal.weightage,
                'Achievement': goal.achievement if goal.achievement is not None else '',
                'Progress Score (%)': score if score is not None else '',
                'Sheet Status': sheet.status,
                **checkin_data,
            }
            rows.append(row)

    df = pd.DataFrame(rows)

    if file_format == 'csv':
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="pulse_achievement_{year}.csv"'
        df.to_csv(response, index=False)
        return response
    else:
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Achievement Report')
        buffer.seek(0)
        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="pulse_achievement_{year}.xlsx"'
        return response
