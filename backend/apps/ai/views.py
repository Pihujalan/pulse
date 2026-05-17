import hashlib
import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
from django.conf import settings


def get_groq_client():
    from groq import Groq
    return Groq(api_key=settings.GROQ_API_KEY)


def groq_complete(prompt, system_prompt="You are a helpful assistant.", max_tokens=400):
    client = get_groq_client()
    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        max_tokens=max_tokens,
        temperature=0.7,
    )
    return response.choices[0].message.content


class GoalSuggestView(APIView):
    """
    POST /api/ai/suggest-goal/
    Returns 2-3 sharper goal phrasings with UoM recommendations.
    Cached by input hash in Redis for 24h.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        draft_title = request.data.get('draft_title', '').strip()
        thrust_area = request.data.get('thrust_area', '')
        uom_type = request.data.get('uom_type', '')
        department = request.data.get('department', request.user.department)

        if not draft_title or len(draft_title) < 3:
            return Response({'suggestions': []})

        cache_key = 'ai_goal_' + hashlib.sha256(
            f"{draft_title}{thrust_area}".encode()
        ).hexdigest()[:20]

        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        system_prompt = """You are an expert at writing SMART (Specific, Measurable, Achievable, Relevant, Time-bound) 
goal statements for corporate performance management. You help employees write clear, measurable goals.

Always respond with valid JSON only. No markdown, no explanation, just the JSON object."""

        prompt = f"""Draft goal title: "{draft_title}"
Thrust Area: {thrust_area}
Department: {department}
Currently selected UoM: {uom_type or 'not selected'}

Generate exactly 2-3 improved, SMART goal phrasings. For each suggestion, also recommend the best Unit of Measure.

UoM options:
- MIN: Numeric/Percentage where higher is better (sales, revenue, satisfaction score)
- MAX: Numeric where lower is better (cost, TAT, error rate)  
- TIMELINE: Date-based completion goals (project delivery, implementation)
- ZERO: Zero-based where zero incidents = success (safety, defects, complaints)

Respond with ONLY this JSON structure:
{{
  "suggestions": [
    {{
      "title": "improved goal statement",
      "rationale": "why this phrasing is better (1 sentence)",
      "recommended_uom": "MIN|MAX|TIMELINE|ZERO",
      "uom_reason": "why this UoM fits (1 sentence)"
    }}
  ]
}}"""

        try:
            content = groq_complete(prompt, system_prompt, max_tokens=500)
            # Strip markdown fences if present
            content = content.strip()
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
            parsed = json.loads(content)
        except Exception as e:
            # Fallback suggestions
            parsed = {
                'suggestions': [
                    {
                        'title': draft_title,
                        'rationale': 'Original title (AI suggestion unavailable)',
                        'recommended_uom': 'MIN',
                        'uom_reason': 'Default recommendation',
                    }
                ]
            }

        cache.set(cache_key, parsed, timeout=settings.AI_SUGGESTION_CACHE_TTL)
        return Response(parsed)


class CheckinDraftView(APIView):
    """
    POST /api/ai/draft-checkin-comment/
    Pre-fills manager check-in comment with a professional draft.
    Cached by goal+quarter+achievement hash for 1h.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in ['MANAGER', 'ADMIN']:
            return Response({'detail': 'Forbidden'}, status=403)

        goal_title = request.data.get('goal_title', '')
        uom_type = request.data.get('uom_type', 'MIN')
        planned = request.data.get('planned_target')
        actual = request.data.get('actual_achievement')
        progress_score = request.data.get('progress_score')
        quarter = request.data.get('quarter', 'Q1')
        employee_name = request.data.get('employee_name', 'the employee')
        goal_id = request.data.get('goal_id', '')

        cache_key = 'ai_checkin_' + hashlib.sha256(
            f"{goal_id}{quarter}{actual}".encode()
        ).hexdigest()[:20]

        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        uom_labels = {
            'MIN': 'higher is better',
            'MAX': 'lower is better',
            'TIMELINE': 'timeline/date-based',
            'ZERO': 'zero = success',
        }

        system_prompt = """You are a professional HR performance manager. Write concise, constructive, 
and specific check-in comments for employee goal reviews. Be professional but human.
Always respond with valid JSON only. No markdown."""

        score_str = f"{round(progress_score * 100)}%" if progress_score is not None else "not calculated"

        prompt = f"""Write a manager check-in comment for this quarterly review:

Employee: {employee_name}
Quarter: {quarter}
Goal: "{goal_title}"
Measurement type: {uom_labels.get(uom_type, uom_type)}
Planned target this quarter: {planned}
Actual achievement: {actual if actual is not None else 'not yet reported'}
Progress score: {score_str}

Write a 2-3 sentence professional comment that:
1. Acknowledges the progress (or lack thereof)
2. Is specific to the numbers
3. Suggests next steps or encouragement

Respond ONLY with this JSON:
{{"draft_comment": "your 2-3 sentence comment here"}}"""

        try:
            content = groq_complete(prompt, system_prompt, max_tokens=200)
            content = content.strip()
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
            parsed = json.loads(content)
        except Exception:
            parsed = {
                'draft_comment': f"{employee_name} has {'achieved' if actual else 'not yet reported'} "
                                 f"results for {quarter}. Please review and add your assessment."
            }

        cache.set(cache_key, parsed, timeout=settings.AI_CHECKIN_CACHE_TTL)
        return Response(parsed)
