from django.db import models


class QuarterWindow(models.Model):
    QUARTER_CHOICES = [('Q1', 'Q1'), ('Q2', 'Q2'), ('Q3', 'Q3'), ('Q4', 'Q4')]

    cycle_year = models.IntegerField()
    quarter = models.CharField(max_length=2, choices=QUARTER_CHOICES)
    window_opens = models.DateField()
    window_closes = models.DateField()
    is_active = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('cycle_year', 'quarter')
        ordering = ['cycle_year', 'quarter']

    def __str__(self):
        return f"{self.cycle_year} {self.quarter} ({'OPEN' if self.is_active else 'CLOSED'})"
