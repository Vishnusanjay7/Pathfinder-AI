import shutil
import tempfile
from pathlib import Path

from config import TEMP_DIR


class Sandbox:

    def __init__(self):
        self.workspace = Path(
            tempfile.mkdtemp(dir=TEMP_DIR)
        )

    def create_source_file(self, filename: str, source_code: str):

        file = self.workspace / filename

        file.write_text(
            source_code,
            encoding="utf-8"
        )

        return file

    def create_input_file(self, input_data: str):

        file = self.workspace / "input.txt"

        file.write_text(
            input_data,
            encoding="utf-8"
        )

        return file

    def path(self):

        return str(self.workspace)

    def cleanup(self):

        shutil.rmtree(
            self.workspace,
            ignore_errors=True
        )