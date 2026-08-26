import os
import re
import json
import logging
from typing import Dict, Any, List, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class CompanyRAGService:
    """
    Local Company Knowledge Base & Retrieval-Augmented Generation (RAG) Service.
    Retrieves factual information about the target company without hallucinations.
    """

    def __init__(self):
        self.rag_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), settings.COMPANY_RAG_PATH)
        self.docs_cache: Dict[str, List[Dict[str, str]]] = {}
        self._initialize_knowledge_base()

    def _initialize_knowledge_base(self):
        """
        Loads local company text documents or default corporate profiles into memory.
        """
        try:
            os.makedirs(self.rag_path, exist_ok=True)
            # Seed default knowledge base for standard test companies if empty
            default_kb_file = os.path.join(self.rag_path, "companies.json")
            if not os.path.exists(default_kb_file):
                default_data = {
                    "Google": [
                        {"topic": "overview", "content": "Google is a global technology leader in search, cloud computing, artificial intelligence, advertising, and operating systems."},
                        {"topic": "mission", "content": "Google's mission is to organize the world's information and make it universally accessible and useful."},
                        {"topic": "culture", "content": "Google values psychological safety, intellectual curiosity, high-velocity innovation, collaboration, and 'Googliness' (integrity and empathy)."},
                        {"topic": "technologies", "content": "Core engineering stack includes C++, Python, Go, Java, TensorFlow, Kubernetes, Spanner, Borg, and GCP infrastructure."},
                        {"topic": "products", "content": "Major products include Google Search, YouTube, Android, Google Cloud Platform, Workspace, Pixel hardware, and Gemini AI models."}
                    ],
                    "Microsoft": [
                        {"topic": "overview", "content": "Microsoft is a global technology company providing cloud infrastructure, productivity software, gaming, and AI solutions."},
                        {"topic": "mission", "content": "To empower every person and every organization on the planet to achieve more through a growth mindset."},
                        {"topic": "culture", "content": "Growth mindset culture focusing on customer obsession, diversity and inclusion, and 'One Microsoft' unified collaboration."},
                        {"topic": "technologies", "content": "Core stack includes C#, .NET Core, TypeScript, C++, Python, Azure Cloud Services, Azure DevOps, and OpenAI integration."},
                        {"topic": "products", "content": "Key products include Microsoft Azure, Office 365 / Microsoft 365, Windows, GitHub, LinkedIn, Xbox, and Copilot."}
                    ],
                    "Amazon": [
                        {"topic": "overview", "content": "Amazon is a global technology and e-commerce leader operating in cloud computing, digital streaming, logistics, and artificial intelligence."},
                        {"topic": "mission", "content": "To be Earth's most customer-centric company, Earth's best employer, and Earth's safest place to work."},
                        {"topic": "culture", "content": "Driven by 16 Leadership Principles including Customer Obsession, Ownership, Bias for Action, Frugality, and Dive Deep."},
                        {"topic": "technologies", "content": "Core technologies include AWS Cloud Infrastructure, Java, Python, DynamoDB, SageMaker, OpenSearch, and microservices architecture."},
                        {"topic": "products", "content": "Key products include Amazon Web Services (AWS), Amazon Prime, Kindle, Alexa, Fulfillment by Amazon, and Zoox."}
                    ]
                }
                with open(default_kb_file, "w", encoding="utf-8") as f:
                    json.dump(default_data, f, indent=2)

            if os.path.exists(default_kb_file):
                with open(default_kb_file, "r", encoding="utf-8") as f:
                    self.docs_cache = json.load(f)
        except Exception as e:
            logger.error(f"Error initializing Company RAG: {e}")

    def query_company_knowledge(self, company_name: str, query: str) -> Dict[str, Any]:
        """
        Retrieves relevant company context for candidate questions.
        Enforces strict safety: Returns empty context if facts are unverified.
        """
        if not company_name:
            return {
                "has_context": False,
                "context": "",
                "message": "No specific company context requested."
            }

        # Normalize company name search
        normalized_name = company_name.strip().lower()
        matched_company = None
        for c in self.docs_cache:
            if c.lower() in normalized_name or normalized_name in c.lower():
                matched_company = c
                break

        if not matched_company:
            return {
                "has_context": False,
                "context": "",
                "message": f"I don't have enough verified information in the {company_name} knowledge base to answer that specific inquiry accurately."
            }

        chunks = self.docs_cache.get(matched_company, [])
        query_words = set(re.findall(r'\w+', query.lower()))

        scored_chunks = []
        for ch in chunks:
            content = ch.get("content", "")
            topic = ch.get("topic", "")
            content_words = set(re.findall(r'\w+', (topic + " " + content).lower()))
            overlap = len(query_words.intersection(content_words))
            if overlap > 0:
                scored_chunks.append((overlap, content))

        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        top_contexts = [c[1] for c in scored_chunks[:3]]

        if top_contexts:
            return {
                "has_context": True,
                "company": matched_company,
                "context": "\n".join(top_contexts),
                "message": "Factual company context retrieved successfully."
            }

        # Fallback to general overview chunk
        overview_chunks = [ch["content"] for ch in chunks if ch.get("topic") == "overview"]
        if overview_chunks:
            return {
                "has_context": True,
                "company": matched_company,
                "context": overview_chunks[0],
                "message": "General company overview retrieved."
            }

        return {
            "has_context": False,
            "context": "",
            "message": f"I don't have enough verified information in the {matched_company} materials to answer that question accurately."
        }


company_rag_service = CompanyRAGService()
