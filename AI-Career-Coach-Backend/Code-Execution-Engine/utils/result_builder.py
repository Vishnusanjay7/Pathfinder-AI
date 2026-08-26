def build_result(results):

    passed = sum(1 for result in results if result["passed"])
    total = len(results)

    return {
        "success": True,
        "results": results,
        "summary": {
            "passed": passed,
            "failed": total - passed,
            "total": total,
            "score": int((passed / total) * 100) if total else 0
        }
    }


def build_error(message):

    return {
        "success": False,
        "error": message
    }