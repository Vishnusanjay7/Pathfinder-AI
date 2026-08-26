"""
timeout.py

Execution timeout utilities.

Responsible for:
1. Measuring execution time
2. Checking execution time against configured limit
3. Raising Time Limit Exceeded when required
"""

import time

from config import MAX_EXECUTION_TIME
from exceptions import TimeLimitExceeded


class TimeoutManager:

    def __init__(self):
        self.start_time = None
        self.end_time = None

    # ============================================
    # Start Timer
    # ============================================

    def start(self):
        self.start_time = time.perf_counter()

    # ============================================
    # Stop Timer
    # ============================================

    def stop(self):
        self.end_time = time.perf_counter()

    # ============================================
    # Execution Time
    # ============================================

    def execution_time(self):

        if self.start_time is None:
            return 0.0

        end = self.end_time if self.end_time else time.perf_counter()

        return round(end - self.start_time, 4)

    # ============================================
    # Execution Time in Milliseconds
    # ============================================

    def execution_time_ms(self):
        return round(self.execution_time() * 1000, 2)

    # ============================================
    # Validate Timeout
    # ============================================

    def validate(self):

        elapsed = self.execution_time()

        if elapsed > MAX_EXECUTION_TIME:

            raise TimeLimitExceeded(
                f"Execution exceeded "
                f"{MAX_EXECUTION_TIME} seconds "
                f"(Actual: {elapsed:.2f}s)"
            )

        return True

    # ============================================
    # Reset Timer
    # ============================================

    def reset(self):
        self.start_time = None
        self.end_time = None


timeout_manager = TimeoutManager()