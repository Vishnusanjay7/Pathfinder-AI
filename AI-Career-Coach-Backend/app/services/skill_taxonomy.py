import re
from typing import Dict, List, Set

# Master Taxonomy: 200+ Skills in 9 Categories
SKILL_TAXONOMY: Dict[str, List[str]] = {
    "programming_languages": [
        "python", "java", "c", "c++", "c#", "javascript", "typescript", "go", "golang",
        "rust", "php", "ruby", "kotlin", "swift", "scala", "r", "matlab", "perl", "dart",
        "assembly", "haskell", "elixir", "bash", "shell", "powershell", "sql", "html", "css"
    ],
    "frontend": [
        "react", "react.js", "reactjs", "angular", "angularjs", "vue", "vue.js", "vuejs",
        "next.js", "nextjs", "nuxt", "svelte", "ember", "backbone", "jquery", "html5",
        "css3", "bootstrap", "tailwind", "tailwindcss", "sass", "scss", "less",
        "material-ui", "mui", "shadcn", "chakra ui", "styled-components", "redux",
        "zustand", "mobx", "webgl", "three.js", "vite", "webpack", "babel"
    ],
    "backend": [
        "spring boot", "spring framework", "spring", "fastapi", "django", "flask",
        "node.js", "nodejs", "node", "express", "express.js", "nest.js", "nestjs",
        "asp.net", ".net", "dotnet", "laravel", "symfony", "rails", "ruby on rails",
        "gin", "fiber", "actix", "rocket", "phoenix", "ktor", "grpc", "graphql",
        "rest api", "restful api", "rest", "microservices", "celery", "rabbitmq", "kafka"
    ],
    "databases": [
        "mysql", "postgresql", "postgres", "mongodb", "mongo", "redis", "oracle",
        "sqlite", "microsoft sql server", "mssql", "cassandra", "dynamodb", "neo4j",
        "elasticsearch", "solr", "cockroachdb", "mariadb", "firebase", "supabase",
        "couchdb", "clickhouse", "timescaledb", "faiss", "pinecone", "chromadb"
    ],
    "cloud": [
        "aws", "amazon web services", "azure", "microsoft azure", "gcp", "google cloud",
        "google cloud platform", "heroku", "digitalocean", "vercel", "netlify",
        "cloudflare", "openstack", "cloudformation", "terraform", "serverless",
        "aws lambda", "ec2", "s3", "ecs", "eks", "cloudwatch"
    ],
    "devops": [
        "docker", "kubernetes", "k8s", "git", "github", "gitlab", "bitbucket",
        "ci/cd", "jenkins", "gitlab ci", "github actions", "circleci", "travis ci",
        "ansible", "puppet", "chef", "prometheus", "grafana", "elk stack", "argocd",
        "helm", "nginx", "apache", "linux", "ubuntu", "centos", "debian"
    ],
    "ai_ml": [
        "machine learning", "deep learning", "artificial intelligence", "tensorflow",
        "pytorch", "keras", "scikit-learn", "sklearn", "pandas", "numpy", "scipy",
        "opencv", "nlp", "natural language processing", "computer vision", "llm",
        "large language models", "openai", "groq", "huggingface", "langchain",
        "llama", "bert", "gpt", "rag", "transformers", "xgboost", "lightgbm"
    ],
    "tools": [
        "postman", "swagger", "jira", "confluence", "trello", "asana", "vs code",
        "vscode", "intellij", "eclipse", "pycharm", "gitkraken", "docker desktop",
        "figma", "canva", "photoshop", "illustrator", "wireshark", "junit", "pytest",
        "jest", "cypress", "selenium", "playwright"
    ],
    "soft_skills": [
        "communication", "teamwork", "leadership", "problem solving", "critical thinking",
        "time management", "adaptability", "collaboration", "agile", "scrum", "kanban",
        "analytical skills", "project management", "decision making", "presentation"
    ]
}

SKILL_ALIASES: Dict[str, str] = {
    "go": "Go",
    "golang": "Go",
    "js": "JavaScript",
    "javascript": "JavaScript",
    "ts": "TypeScript",
    "typescript": "TypeScript",
    "py": "Python",
    "python": "Python",
    "reactjs": "React",
    "react.js": "React",
    "react": "React",
    "nextjs": "Next.js",
    "next.js": "Next.js",
    "vuejs": "Vue",
    "vue.js": "Vue",
    "vue": "Vue",
    "angularjs": "Angular",
    "angular": "Angular",
    "node": "Node.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "express.js": "Express",
    "express": "Express",
    "spring": "Spring Boot",
    "spring framework": "Spring Boot",
    "spring boot": "Spring Boot",
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "mongo": "MongoDB",
    "mongo db": "MongoDB",
    "mongodb": "MongoDB",
    "mssql": "Microsoft SQL Server",
    "microsoft sql server": "Microsoft SQL Server",
    "k8s": "Kubernetes",
    "kubernetes": "Kubernetes",
    "aws": "AWS",
    "amazon web services": "AWS",
    "gcp": "GCP",
    "google cloud": "GCP",
    "google cloud platform": "GCP",
    "azure": "Azure",
    "microsoft azure": "Azure",
    "ci/cd": "CI/CD",
    "gitlab ci": "GitLab CI",
    "github actions": "GitHub Actions",
    "rest": "REST API",
    "rest api": "REST API",
    "restful api": "REST API",
    "ml": "Machine Learning",
    "machine learning": "Machine Learning",
    "dl": "Deep Learning",
    "deep learning": "Deep Learning",
    "ai": "Artificial Intelligence",
    "artificial intelligence": "Artificial Intelligence",
    "nlp": "NLP",
    "natural language processing": "NLP",
    "llm": "LLM",
    "large language models": "LLM",
    "sklearn": "scikit-learn",
    "scikit-learn": "scikit-learn",
    "vscode": "VS Code",
    "vs code": "VS Code"
}

def normalize_skill_name(raw_skill: str) -> str:
    """Normalize a raw skill string to canonical casing or title case."""
    lower_skill = raw_skill.strip().lower()
    if lower_skill in SKILL_ALIASES:
        return SKILL_ALIASES[lower_skill]
    # Check taxonomy for matching canonical entry
    for cat_list in SKILL_TAXONOMY.values():
        for skill in cat_list:
            if skill.lower() == lower_skill:
                return skill.title() if not skill.isupper() else skill
    return raw_skill.strip().title()

def extract_categorized_skills(text: str) -> Dict[str, List[str]]:
    """
    Extract skills from text, categorized according to SKILL_TAXONOMY,
    with context filtering (excluding learning intent like 'learning python').
    """
    text_lower = text.lower()
    categorized: Dict[str, Set[str]] = {cat: set() for cat in SKILL_TAXONOMY.keys()}

    # Find context phrases to ignore e.g. "want to learn python", "interested in learning java"
    learning_matches = set(re.findall(r"(?:want to learn|interested in learning|looking to learn|learning|study|studying)\s+([a-z0-9#+.\s]{2,20})", text_lower))
    learning_text = " ".join(learning_matches)

    for category, skill_list in SKILL_TAXONOMY.items():
        for skill in skill_list:
            # Word boundary pattern
            pattern = rf"\b{re.escape(skill)}\b"
            if re.search(pattern, text_lower):
                # Ensure it's not purely mentioned as a "learning" skill without other experience context
                if re.search(pattern, learning_text) and text_lower.count(skill) == 1:
                    continue
                canonical = normalize_skill_name(skill)
                categorized[category].add(canonical)

    return {cat: sorted(list(skills)) for cat, skills in categorized.items()}

def get_all_extracted_skills_flat(text: str) -> List[str]:
    """Get a flat list of all unique normalized skills extracted from text."""
    categorized = extract_categorized_skills(text)
    all_skills: Set[str] = set()
    for cat_skills in categorized.values():
        all_skills.update(cat_skills)
    return sorted(list(all_skills))
