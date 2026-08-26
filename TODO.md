# Coding Assessment Module Fix - TODO

## Backend
- [x] 1. Add `reference_solution`, `hints`, `admin_only` flags, `explanation`, `input_format`, `output_format`, `time_limit`, `memory_limit`, `tags`, `topic` to `CodingQuestion` model
- [x] 2. Create interview-quality question generator in adaptive_assessment_service.py (topics, difficulty distribution, personalized per user)
- [x] 3. Update `evaluate-mcq` API to return sanitized question (no hints, no reference solution, only visible test cases)
- [x] 4. Update `coding.py` submit API to evaluate against hidden+public test cases, sanitize response
- [x] 5. Update `execution_service.py` to use real DB question and separate public/hidden evaluation
- [x] 6. Add Judge0 language support for C
- [x] 7. Add `run` (visible only) vs `submit` (visible+hidden) endpoints
- [x] 8. Improve `_pick_question` to prioritize topic relevance and experience-appropriate difficulty

## Frontend
- [x] 9. Update `types/index.ts` with sanitized types
- [x] 10. Update `AssessmentPage.tsx` coding round (no hints, proper problem display, run/submit)
- [x] 11. Update `CodingPage.tsx` to render proper problem, remove hardcoded answer

## Verification
- [x] 12. Verify no answer/expected_output/hidden test case leaks in API responses
- [x] 13. End-to-end verification (backend compiles, imports OK, question generator works, frontend TS compiles)

## Debugging: "Unable to evaluate the MCQ round"
- [x] 14. Root cause: `coding_questions` table missing new columns (`topic`, `tags`, `input_format`, `output_format`, `explanation`, `time_limit`, `memory_limit`, `hints`, `reference_solution`) -> INSERT fails with 500 during `evaluate-mcq`
- [x] 15. Added idempotent startup migration in `main.py` to ALTER TABLE and add missing columns if absent
- [x] 16. Applied ALTER directly to DB; verified all 9 columns exist
- [x] 17. Reproduced full evaluate flow (MCQ evaluate -> coding_blueprint -> CodingQuestion insert -> TestCase insert -> commit) -> SUCCESS
- [x] 18. Backend py_compile OK, frontend tsc OK
</content>
