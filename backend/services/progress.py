"""
ProgressCalculator — implements all 4 UoM progress formulas per BRD spec.

MIN  — higher achievement is better (sales revenue, %)
MAX  — lower achievement is better (cost, TAT)
TIMELINE — date-based completion
ZERO — zero achievement = success (safety incidents)
"""
from datetime import date


class ProgressCalculator:
    def __init__(self, goal_entry):
        self.goal = goal_entry

    def score(self):
        """Returns 0.0–1.0 or None if not reportable."""
        uom = self.goal.uom_type
        if uom == 'MIN':
            return self._min_score()
        elif uom == 'MAX':
            return self._max_score()
        elif uom == 'TIMELINE':
            return self._timeline_score()
        elif uom == 'ZERO':
            return self._zero_score()
        return None

    def score_percentage(self):
        """Returns score as 0–100 percentage or None."""
        s = self.score()
        if s is None:
            return None
        return min(round(s * 100, 1), 100.0)

    def weighted_score(self):
        """Returns weighted score contribution (0–weightage)."""
        s = self.score()
        if s is None:
            return 0
        return s * self.goal.weightage

    # ─── MIN Formula ─────────────────────────────────────────────────────────

    def _min_score(self):
        """Higher is better. achievement / target, capped at 1.0."""
        achievement = self.goal.achievement
        target = self.goal.target

        if achievement is None:
            return None
        if achievement == 0:
            return 0.0
        if target <= 0:
            return None  # should be blocked at creation

        return min(achievement / target, 1.0)

    # ─── MAX Formula ─────────────────────────────────────────────────────────

    def _max_score(self):
        """Lower is better. target / achievement."""
        achievement = self.goal.achievement
        target = self.goal.target

        if achievement is None:
            return None
        if achievement == 0:
            return 1.0  # zero cost / zero TAT = perfect
        if target <= 0:
            return None

        return min(target / achievement, 1.0)

    # ─── TIMELINE Formula ────────────────────────────────────────────────────

    def _timeline_score(self):
        """Date-based. 1.0 if complete on/before deadline, partial if late."""
        achievement = self.goal.achievement  # use as 1.0 = completed flag
        deadline = self.goal.deadline

        if deadline is None:
            return None

        today = date.today()
        sheet_created = self.goal.goal_sheet.created_at.date()
        total_duration = max((deadline - sheet_created).days, 1)
        elapsed = max((today - sheet_created).days, 0)

        if achievement is not None and achievement >= 1.0:
            # Completed — check if on time
            # We treat achievement date as today (simplified — full impl would store completion_date)
            if today <= deadline:
                return 1.0
            else:
                deadline_days = total_duration
                elapsed_days = elapsed
                return max(deadline_days / elapsed_days, 0.0) if elapsed_days > 0 else 1.0
        else:
            # In progress
            if today > deadline:
                # Overdue and not completed
                return max(total_duration / elapsed, 0.0) if elapsed > 0 else 0.0
            else:
                # Not yet due — show time consumed
                return min(elapsed / total_duration, 1.0)

    # ─── ZERO Formula ────────────────────────────────────────────────────────

    def _zero_score(self):
        """Zero = success (safety incidents, defects)."""
        achievement = self.goal.achievement

        if achievement is None:
            return None
        if achievement == 0:
            return 1.0
        return 0.0


def calculate_sheet_score(goal_sheet):
    """Weighted aggregate score for an entire goal sheet."""
    goals = goal_sheet.goals.all()
    total_weighted = 0
    total_reportable_weight = 0

    for goal in goals:
        calc = ProgressCalculator(goal)
        score = calc.score()
        if score is not None:
            total_weighted += score * goal.weightage
            total_reportable_weight += goal.weightage

    if total_reportable_weight == 0:
        return None

    return round((total_weighted / total_reportable_weight) * 100, 1)
