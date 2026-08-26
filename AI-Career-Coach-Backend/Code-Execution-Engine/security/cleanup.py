"""
cleanup.py

Responsible for cleaning up execution resources.

Features
--------
1. Remove sandbox directories
2. Stop Docker containers
3. Remove Docker containers
4. Delete temporary files
5. Safe cleanup (never crashes)
"""

import shutil
from pathlib import Path


class CleanupManager:

    def __init__(self):
        pass

    # =====================================================
    # Remove Sandbox
    # =====================================================

    def remove_workspace(self, workspace):

        try:

            workspace = Path(workspace)

            if workspace.exists():

                shutil.rmtree(
                    workspace,
                    ignore_errors=True
                )

        except Exception:

            pass

    # =====================================================
    # Stop Docker Container
    # =====================================================

    def stop_container(self, container):

        if container is None:
            return

        try:

            container.stop(timeout=0)

        except Exception:

            pass

    # =====================================================
    # Remove Docker Container
    # =====================================================

    def remove_container(self, container):

        if container is None:
            return

        try:

            container.remove(force=True)

        except Exception:

            pass

    # =====================================================
    # Cleanup Everything
    # =====================================================

    def cleanup(

        self,

        workspace=None,

        container=None

    ):

        self.stop_container(container)

        self.remove_container(container)

        self.remove_workspace(workspace)


cleanup_manager = CleanupManager()