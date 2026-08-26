import unittest
from app.services.interview_service import interview_service

class TestMockInterviewVADAndSpokenEnglish(unittest.TestCase):

    def test_filler_word_detection_and_metrics(self):
        transcript = "Um, I actually built a FastAPI project with PostgreSQL, and, uh, basically improved response time by 40%."
        filler_list = ["um", "uh", "like", "you know", "actually", "basically", "so"]
        text_lower = transcript.lower()

        found_fillers = {}
        total = 0
        for filler in filler_list:
            import re
            cnt = len(re.findall(rf"\b{re.escape(filler)}\b", text_lower))
            if cnt > 0:
                found_fillers[filler] = cnt
                total += cnt

        self.assertIn("um", found_fillers)
        self.assertIn("uh", found_fillers)
        self.assertIn("actually", found_fillers)
        self.assertIn("basically", found_fillers)
        self.assertEqual(total, 4)

    def test_personalized_question_fallback(self):
        qs = interview_service.generate_personalized_questions(
            role="Backend Developer",
            interview_type="Technical",
            difficulty="Intermediate",
            count=3,
            skills=["Python", "FastAPI"],
            projects=[],
            experience=[],
            weak_topics=[]
        )
        self.assertEqual(len(qs), 3)
        self.assertIn("question", qs[0])

if __name__ == "__main__":
    unittest.main()
