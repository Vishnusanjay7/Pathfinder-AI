"""
cpu_limit.py

Responsible for monitoring CPU usage.

Features
--------
1. Current CPU Usage
2. Average CPU Usage
3. Peak CPU Usage
4. CPU Limit Validation
"""

import psutil

from config import MAX_CPU_PERCENT
from exceptions import RuntimeExecutionError


class CPUManager:

    def __init__(self):

        self.process = psutil.Process()

        self.peak_cpu = 0

        self.samples = []

    # =====================================================
    # Current CPU Usage
    # =====================================================

    def current_cpu(self):

        cpu = self.process.cpu_percent(interval=0.1)

        self.samples.append(cpu)

        if cpu > self.peak_cpu:
            self.peak_cpu = cpu

        return round(cpu, 2)

    # =====================================================
    # Average CPU Usage
    # =====================================================

    def average_cpu(self):

        if not self.samples:
            return 0

        return round(sum(self.samples) / len(self.samples), 2)

    # =====================================================
    # Peak CPU Usage
    # =====================================================

    def peak_cpu_usage(self):

        return round(self.peak_cpu, 2)

    # =====================================================
    # Validate CPU Usage
    # =====================================================

    def validate(self):

        current = self.current_cpu()

        if current > MAX_CPU_PERCENT:

            raise RuntimeExecutionError(

                f"CPU limit exceeded.\n"

                f"Allowed : {MAX_CPU_PERCENT}%\n"

                f"Used : {current}%"

            )

        return True

    # =====================================================
    # Statistics
    # =====================================================

    def statistics(self):

        return {

            "current_cpu": self.current_cpu(),

            "average_cpu": self.average_cpu(),

            "peak_cpu": self.peak_cpu_usage()

        }

    # =====================================================
    # Reset
    # =====================================================

    def reset(self):

        self.samples.clear()

        self.peak_cpu = 0


cpu_manager = CPUManager()