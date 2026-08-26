class CompilationError(Exception):
    pass


class RuntimeExecutionError(Exception):
    pass


class TimeLimitExceeded(Exception):
    pass


class MemoryLimitExceeded(Exception):
    pass


class UnsupportedLanguage(Exception):
    pass


class DockerExecutionError(Exception):
    pass