from typing import Dict, Any, List, Optional


class PromptBuilderV2:
    """
    Constructs specialized prompts for Mock Interview v2.
    Adapts tone, depth, and scrutiny to the selected interviewer persona and phase.
    """

    @staticmethod
    def build_system_prompt(interviewer: Dict[str, Any], target_role: str, difficulty: str) -> str:
        return f"""You are {interviewer['name']}, acting as {interviewer['role']}.
Your Background & Style: {interviewer['personality']}
Interview Style: {interviewer['interview_style']}
Specialization: {interviewer['specialization']}

You are conducting a live, rigorous, professional mock interview for a candidate applying for the role of: '{target_role}'.
Difficulty Level: {difficulty}

CORE RULES:
1. Stay in character 100% of the time as {interviewer['name']}.
2. Be professional, authentic, and direct.
3. Keep your spoken responses concise and conversational (1 to 3 sentences maximum), suitable for direct text-to-speech audio.
4. If the candidate asks a clarifying question (e.g., asking what they would be doing in this role, asking about the company, asking why you are asking that question, or asking you to repeat/clarify the question):
   - Answer their question concisely and authoritatively using the job context.
   - Then seamlessly restate or ask the next relevant question.
5. If this is a follow-up, directly reference the candidate's previous statements and probe deeper into their choices, trade-offs, or numbers.
6. Do NOT list multiple bullet points or multi-part questions in one turn. Ask ONE focused question at a time.
7. Return only the interviewer spoken dialogue without internal thoughts, markdown formatting, prefixes, or stage directions.
"""

    @staticmethod
    def build_question_prompt(
        phase: str,
        question_number: int,
        target_role: str,
        job_description: Optional[str],
        resume_context: Optional[str],
        conversation_history: List[Dict[str, Any]],
        previous_answer: Optional[str] = None
    ) -> str:
        history_summary = "\n".join([
            f"Phase [{turn.get('phase')}]: Interviewer Q: {turn.get('question')}\nCandidate A: {turn.get('answer', '')}"
            for turn in conversation_history[-4:]
        ])

        return f"""Current Interview Phase: {phase}
Question Number: {question_number}
Target Role: {target_role}

Job Description & Company Context:
{job_description or "General software engineering, distributed systems, and technical competencies."}

Candidate Resume Highlights:
{resume_context or "Standard engineering experience and software development skills."}

Recent Conversation History:
{history_summary or "Beginning of the interview."}

Candidate's Most Recent Answer / Inquiry:
"{previous_answer or 'None (First question).'}"

Task:
- If the candidate asked a question (such as "What would I be doing in this role?", "Can you repeat the question?", or "Why are you asking that?"), briefly answer it in 1-2 sentences using the job context and then continue with the interview.
- Otherwise, generate the next dynamic, realistic question for phase '{phase}'.
Ensure natural conversational flow, focusing on real-world engineering trade-offs, architecture decisions, or practical experience.
"""
