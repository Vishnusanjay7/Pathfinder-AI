"""
memory_limit.py

Responsible for monitoring memory usage during program execution.

Features:
1. Track current memory usage
2. Track peak memory usage
3. Validate against configured memory limit
"""

import os
import psutil

from config import MAX_MEMORY_MB
from exceptions import MemoryLimitExceeded


class MemoryManager:

    def __init__(self):
        self.process = psutil.Process(os.getpid())
        self.peak_memory = 0

    # =====================================================
    # Current Memory Usage
    # =====================================================

    def current_memory(self):

        memory = self.process.memory_info().rss / (1024 * 1024)

        return round(memory, 2)

    # =====================================================
    # Peak Memory
    # =====================================================

    def update_peak(self):

        current = self.current_memory()

        if current > self.peak_memory:
            self.peak_memory = current

    # =====================================================
    # Get Peak Memory
    # =====================================================

    def get_peak_memory(self):

        self.update_peak()

        return round(self.peak_memory, 2)

    # =====================================================
    # Validate Memory Limit
    # =====================================================

    def validate(self):

        self.update_peak()

        if self.peak_memory > MAX_MEMORY_MB:

            raise MemoryLimitExceeded(

                f"Memory limit exceeded.\n"

                f"Allowed : {MAX_MEMORY_MB} MB\n"

                f"Used : {self.peak_memory:.2f} MB"

            )

        return True

    # =====================================================
    # Reset
    # =====================================================

    def reset(self):

        self.peak_memory = 0


memory_manager = MemoryManager()