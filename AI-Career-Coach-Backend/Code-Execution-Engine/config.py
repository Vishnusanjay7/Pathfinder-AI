from pathlib import Path
from dataclasses import dataclass

# =====================================================
# Directories
# =====================================================

BASE_DIR = Path(__file__).resolve().parent

TEMP_DIR = BASE_DIR / "temp"
LOG_DIR = BASE_DIR / "logs"
DOCKER_DIR = BASE_DIR / "docker"

TEMP_DIR.mkdir(exist_ok=True)
LOG_DIR.mkdir(exist_ok=True)

# =====================================================
# Limits
# =====================================================

MAX_EXECUTION_TIME = 3
MAX_MEMORY_MB = 256
MAX_CPU_PERCENT = 80
MAX_FILE_SIZE_MB = 2
MAX_INPUT_SIZE_KB = 64

# =====================================================
# Docker Images
# =====================================================

DOCKER_IMAGES = {
    "java": "careercoach-java:latest",
    "python": "careercoach-python:latest",
    "c": "careercoach-c:latest",
    "cpp": "careercoach-cpp:latest",
    "javascript": "careercoach-node:latest",
}

# =====================================================
# Supported Languages
# =====================================================

SUPPORTED_LANGUAGES = {
    "java",
    "python",
    "py",
    "c",
    "cpp",
    "c++",
    "javascript",
    "js",
}

# =====================================================
# Source Files
# =====================================================

SOURCE_FILES = {
    "java": "Main.java",
    "python": "solution.py",
    "c": "main.c",
    "cpp": "main.cpp",
    "javascript": "solution.js",
}

# =====================================================
# Docker Configuration
# =====================================================

@dataclass
class DockerConfig:
    network_disabled: bool = True
    remove_container: bool = True
    memory_limit: str = "256m"
    cpu_limit: float = 1.0
    timeout: int = 3


docker_config = DockerConfig()