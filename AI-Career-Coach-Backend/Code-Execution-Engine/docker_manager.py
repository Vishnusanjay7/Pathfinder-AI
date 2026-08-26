"""
docker_manager.py

Responsible for

1. Creating Docker containers
2. Copying workspace
3. Executing compile commands
4. Executing run commands
5. Capturing stdout/stderr
6. Measuring execution time
7. Destroying containers
"""

import io
import tarfile
import time
from pathlib import Path

import docker
from docker.errors import DockerException

from config import docker_config


class DockerManager:

    def __init__(self):

        self.client = docker.from_env()

    # =====================================================
    # Create Container
    # =====================================================

    def _create_container(self, image):

        container = self.client.containers.create(

            image=image,

            command=["sleep", "600"],

            working_dir="/workspace",

            network_disabled=docker_config.network_disabled,

            mem_limit=docker_config.memory_limit,

            cpu_count=1,

            detach=True,

            tty=True

        )

        return container

    # =====================================================
    # Copy Workspace
    # =====================================================

    def _copy_workspace(

        self,

        container,

        workspace

    ):

        workspace = Path(workspace)

        tarstream = io.BytesIO()

        with tarfile.open(

            fileobj=tarstream,

            mode="w"

        ) as tar:

            for file in workspace.iterdir():

                tar.add(

                    file,

                    arcname=file.name

                )

        tarstream.seek(0)

        container.put_archive(

            "/workspace",

            tarstream.read()

        )

    # =====================================================
    # Execute Command
    # =====================================================

    def execute(

        self,

        image,

        workspace,

        command

    ):

        container = None

        try:

            start = time.perf_counter()

            container = self._create_container(image)

            container.start()

            self._copy_workspace(

                container,

                workspace

            )

            result = container.exec_run(

                cmd=command,

                demux=True

            )

            end = time.perf_counter()

            execution_time = round(

                (end - start) * 1000,

                2

            )

            stdout = ""

            stderr = ""

            if result.output:

                out, err = result.output

                if out:

                    stdout = out.decode(

                        "utf-8",

                        errors="ignore"

                    )

                if err:

                    stderr = err.decode(

                        "utf-8",

                        errors="ignore"

                    )

            return {

                "success": result.exit_code == 0,

                "stdout": stdout.strip(),

                "stderr": stderr.strip(),

                "exit_code": result.exit_code,

                "execution_time": execution_time

            }

        except DockerException as e:

            return {

                "success": False,

                "stdout": "",

                "stderr": str(e),

                "exit_code": -1,

                "execution_time": 0

            }

        except Exception as e:

            return {

                "success": False,

                "stdout": "",

                "stderr": str(e),

                "exit_code": -1,

                "execution_time": 0

            }

        finally:

            if container:

                try:

                    container.stop(timeout=0)

                except Exception:
                    pass

                try:

                    container.remove(force=True)

                except Exception:
                    pass


docker_manager = DockerManager()