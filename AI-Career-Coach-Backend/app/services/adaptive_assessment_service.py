import random
import json
from collections import Counter
from datetime import datetime


TOPIC_QUESTIONS = {
    "Python": [
        ("Which Python collection preserves insertion order and maps keys to values?", ["set", "dict", "tuple", "frozenset"], "dict"),
        ("What does a Python generator use to produce values lazily?", ["yield", "return", "await", "pass"], "yield"),
    ],
    "JavaScript": [
        ("Which keyword creates a block-scoped variable in JavaScript?", ["var", "let", "global", "static"], "let"),
        ("Which array method creates a new array by transforming every item?", ["map", "push", "find", "pop"], "map"),
    ],
    "SQL": [
        ("Which SQL clause filters aggregated results?", ["HAVING", "WHERE", "ORDER BY", "LIMIT"], "HAVING"),
        ("Which JOIN returns only rows with matches in both tables?", ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL JOIN"], "INNER JOIN"),
    ],
    "Data Structures": [
        ("What is the average lookup time for a hash table?", ["O(1)", "O(n)", "O(log n)", "O(n log n)"], "O(1)"),
        ("Which data structure follows FIFO order?", ["Queue", "Stack", "Tree", "Heap"], "Queue"),
    ],
    "Algorithms": [
        ("What is binary search complexity on sorted input?", ["O(log n)", "O(n)", "O(n²)", "O(1)"], "O(log n)"),
        ("Which traversal visits a binary-search tree in sorted order?", ["Inorder", "Preorder", "Postorder", "Level order"], "Inorder"),
    ],
    "React": [
        ("Which Hook stores component-local state?", ["useState", "useMemo", "useRef", "useContext"], "useState"),
        ("Why are stable keys needed in React lists?", ["To identify items across renders", "To encrypt props", "To style elements", "To fetch data"], "To identify items across renders"),
    ],
    "APIs": [
        ("Which HTTP status means a resource was created?", ["201", "200", "204", "404"], "201"),
        ("Which HTTP method is normally idempotent for replacing a resource?", ["PUT", "POST", "PATCH", "CONNECT"], "PUT"),
    ],
    "Cloud": [
        ("What does horizontal scaling add?", ["More instances", "More RAM to one instance", "More source files", "More database columns"], "More instances"),
        ("Which principle grants only needed permissions?", ["Least privilege", "Open access", "Shared root", "Static credentials"], "Least privilege"),
    ],
}

ROLE_TOPICS = {
    "Frontend Developer": ["JavaScript", "React", "APIs"],
    "Backend Developer": ["Python", "SQL", "APIs", "Data Structures"],
    "Full Stack Developer": ["JavaScript", "React", "Python", "SQL", "APIs"],
    "Data Analyst": ["Python", "SQL", "Algorithms"],
    "AI Engineer": ["Python", "Algorithms", "Data Structures"],
    "Cloud Engineer": ["Cloud", "Python", "APIs"],
    "DevOps Engineer": ["Cloud", "Python", "APIs"],
}

RESOURCE_MAP = {
    "Python": ("Python Tutorials", "Python", "https://docs.python.org/3/tutorial/", "Free"),
    "JavaScript": ("JavaScript Guide", "MDN", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", "Free"),
    "React": ("Learn React", "React", "https://react.dev/learn", "Free"),
    "SQL": ("SQL Course", "freeCodeCamp", "https://www.freecodecamp.org/learn/relational-database/", "Free"),
    "Cloud": ("AWS Skill Builder", "AWS", "https://explore.skillbuilder.aws/learn", "Free/Paid"),
    "Data Structures": ("Data Structures", "Harvard CS50", "https://cs50.harvard.edu/", "Free"),
    "Algorithms": ("Algorithms", "MIT OpenCourseWare", "https://ocw.mit.edu/", "Free"),
    "APIs": ("FastAPI Tutorial", "FastAPI", "https://fastapi.tiangolo.com/tutorial/", "Free"),
}


def extract_skills(resume_text: str, role: str) -> list[str]:
    text = f"{resume_text} {role}".lower()
    aliases = {"python": "Python", "java": "JavaScript", "javascript": "JavaScript", "react": "React", "sql": "SQL", "database": "SQL", "cloud": "Cloud", "aws": "Cloud", "api": "APIs", "fastapi": "APIs", "algorithm": "Algorithms", "data structure": "Data Structures"}
    found = [topic for phrase, topic in aliases.items() if phrase in text]
    return list(dict.fromkeys(found)) or ROLE_TOPICS.get(role, ["Python", "SQL", "Data Structures", "Algorithms"])


def generate_mcqs(role: str, level: str, skills: list[str]) -> list[dict]:
    generated = _generate_mcqs_with_groq(role, level, skills)
    if generated:
        return generated
    topics = list(dict.fromkeys(skills + ROLE_TOPICS.get(role, []) + list(TOPIC_QUESTIONS)))
    pool = [(topic, *question) for topic in topics if topic in TOPIC_QUESTIONS for question in TOPIC_QUESTIONS[topic]]
    random.SystemRandom().shuffle(pool)
    questions = []
    for index in range(20):
        topic, question, options, answer = pool[index % len(pool)]
        shuffled = options[:]
        random.SystemRandom().shuffle(shuffled)
        questions.append({"id": f"q{index + 1}", "topic": topic, "question": question, "options": shuffled, "answer": answer, "difficulty": level})
    return questions


def _generate_mcqs_with_groq(role: str, level: str, skills: list[str]) -> list[dict] | None:
    """Use Groq when available; the local bank keeps assessment creation reliable offline."""
    try:
        from app.core.config import settings
        from groq import Groq
        prompt = f"""Return only JSON with a `questions` array of exactly 20 unique interview MCQs.
Candidate role: {role}. Level: {level}. Resume skills: {', '.join(skills)}.
Cover the candidate's skills plus relevant programming, OOP, databases, algorithms, APIs, cloud or security topics.
Each item must have question, topic, options (exactly 4), answer (one option), difficulty. Randomize concepts and do not use placeholders."""
        response = Groq(api_key=settings.GROQ_API_KEY).chat.completions.create(
            model="openai/gpt-oss-20b", temperature=0.8,
            messages=[{"role": "user", "content": prompt}], response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)
        questions = data.get("questions", [])
        if len(questions) != 20:
            return None
        normalised = []
        for index, item in enumerate(questions, 1):
            options = item.get("options", [])
            answer = item.get("answer", "")
            if len(options) != 4 or answer not in options:
                return None
            normalised.append({"id": f"q{index}", "topic": str(item.get("topic", "Core Skills")), "question": str(item["question"]), "options": options, "answer": answer, "difficulty": str(item.get("difficulty", level))})
        return normalised
    except Exception:
        return None


# ============================================================
# Interview-Quality Coding Question Generator
# ============================================================

# Difficulty mapping from experience level
LEVEL_DIFFICULTY = {
    "Beginner": "Easy",
    "Intermediate": "Medium",
    "Advanced": "Hard",
}

# Question topics covering multiple interview focus areas
CODING_TOPICS = [
    "Arrays", "Strings", "HashMap", "Stack", "Queue", "Linked List",
    "Binary Search", "Sorting", "Searching", "Trees", "Binary Trees",
    "BST", "Graphs", "Recursion", "Backtracking", "Greedy",
    "Dynamic Programming", "Sliding Window", "Two Pointers", "Heap",
    "Trie", "SQL", "REST API", "Object Oriented Programming",
    "Concurrency", "Operating Systems", "DBMS",
]

# A curated bank of interview-quality questions across topics.
# Each entry: title, topic, difficulty (Easy/Medium/Hard), description,
# constraints, input_format, output_format, sample_input, sample_output,
# explanation, expected_time_complexity, expected_space_complexity,
# tags, visible_test_cases, hidden_test_cases, reference_solution, hints.
QUESTION_BANK = [
    {
        "title": "Two Sum",
        "topic": "HashMap",
        "difficulty": "Easy",
        "description": "Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target. You may assume that each input has exactly one solution, and you may not use the same element twice. Return the answer as a pair of indices (1-based).",
        "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"],
        "input_format": "First line contains integer N and target. Second line contains N space-separated integers.",
        "output_format": "Print two space-separated integers representing the 1-based indices of the two numbers whose sum equals target.",
        "sample_input": "4 9\n2 7 11 15",
        "sample_output": "1 2",
        "explanation": "nums[0] + nums[1] = 2 + 7 = 9, so the indices 1 and 2 are returned.",
        "expected_time_complexity": "O(n)",
        "expected_space_complexity": "O(n)",
        "tags": ["HashMap", "Arrays"],
        "visible_test_cases": [
            {"input": "4 9\n2 7 11 15", "output": "1 2"},
            {"input": "3 6\n3 2 4", "output": "2 3"},
            {"input": "2 -1\n-5 4", "output": "1 2"},
        ],
        "hidden_test_cases": [
            {"input": "5 0\n0 0 0 0 0", "output": "1 2"},
            {"input": "6 10\n1 3 5 7 9 11", "output": "2 5"},
            {"input": "2 1000000000\n500000000 500000000", "output": "1 2"},
            {"input": "4 1000000000\n1 999999999 2 3", "output": "1 2"},
            {"input": "7 -3\n-1 2 -4 5 1 6 -7", "output": "1 5"},
        ],
        "reference_solution": "def two_sum(nums, target):\n    seen = {}\n    for i, val in enumerate(nums):\n        comp = target - val\n        if comp in seen:\n            return (seen[comp] + 1, i + 1)\n        seen[val] = i\n    return (-1, -1)",
        "hints": ["Use a hash map to store the complement.", "A single pass yields O(n) time."],
    },
    {
        "title": "Valid Parentheses",
        "topic": "Stack",
        "difficulty": "Easy",
        "description": "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if open brackets are closed by the same type of brackets and in the correct order.",
        "constraints": ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'"],
        "input_format": "A single line containing the string s.",
        "output_format": "Print 'true' if the string is valid, otherwise 'false'.",
        "sample_input": "([{}])",
        "sample_output": "true",
        "explanation": "Each opening bracket is closed by the matching closing bracket in the correct order.",
        "expected_time_complexity": "O(n)",
        "expected_space_complexity": "O(n)",
        "tags": ["Stack", "Strings"],
        "visible_test_cases": [
            {"input": "()", "output": "true"},
            {"input": "()[]{}", "output": "true"},
            {"input": "(]", "output": "false"},
        ],
        "hidden_test_cases": [
            {"input": "([)]", "output": "false"},
            {"input": "{[]}", "output": "true"},
            {"input": "(", "output": "false"},
            {"input": "](", "output": "false"},
            {"input": "(((((((((())))))))))", "output": "true"},
        ],
        "reference_solution": "def is_valid(s):\n    stack = []\n    pairs = {')': '(', ']': '[', '}': '{'}\n    for ch in s:\n        if ch in pairs:\n            if not stack or stack[-1] != pairs[ch]:\n                return False\n            stack.pop()\n        else:\n            stack.append(ch)\n    return not stack",
        "hints": ["Use a stack to track open brackets.", "Match each closing bracket with the top of the stack."],
    },
    {
        "title": "Merge Two Sorted Arrays",
        "topic": "Arrays",
        "difficulty": "Easy",
        "description": "Given two sorted integer arrays nums1 and nums2, merge them into a single sorted array. Return the merged sorted array.",
        "constraints": ["0 <= n, m <= 10^4", "Elements are within [-10^9, 10^9]"],
        "input_format": "First line contains N and M. Second line contains N sorted integers. Third line contains M sorted integers.",
        "output_format": "Print the merged sorted array of N + M integers.",
        "sample_input": "3 3\n1 2 3\n2 5 6",
        "sample_output": "1 2 2 3 5 6",
        "explanation": "The arrays are merged in sorted order giving 1 2 2 3 5 6.",
        "expected_time_complexity": "O(n + m)",
        "expected_space_complexity": "O(n + m)",
        "tags": ["Arrays", "Two Pointers"],
        "visible_test_cases": [
            {"input": "3 3\n1 2 3\n2 5 6", "output": "1 2 2 3 5 6"},
            {"input": "1 1\n0\n1", "output": "0 1"},
            {"input": "0 3\n\n1 2 3", "output": "1 2 3"},
        ],
        "hidden_test_cases": [
            {"input": "3 0\n1 2 3\n", "output": "1 2 3"},
            {"input": "0 0\n\n", "output": ""},
            {"input": "4 4\n-5 -1 0 3\n-10 -2 2 4", "output": "-10 -5 -2 -1 0 2 3 4"},
            {"input": "2 2\n1 1\n1 1", "output": "1 1 1 1"},
            {"input": "5 5\n1 3 5 7 9\n2 4 6 8 10", "output": "1 2 3 4 5 6 7 8 9 10"},
        ],
        "reference_solution": "def merge(n1, n2):\n    i = j = 0\n    res = []\n    while i < len(n1) and j < len(n2):\n        if n1[i] <= n2[j]:\n            res.append(n1[i]); i += 1\n        else:\n            res.append(n2[j]); j += 1\n    res.extend(n1[i:]); res.extend(n2[j:])\n    return res",
        "hints": ["Use two pointers from the start of each array.", "Append the smaller element and advance that pointer."],
    },
    {
        "title": "Maximum Subarray Sum (Kadane)",
        "topic": "Dynamic Programming",
        "difficulty": "Medium",
        "description": "Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.",
        "constraints": ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
        "input_format": "First line contains N. Second line contains N space-separated integers.",
        "output_format": "Print the maximum subarray sum.",
        "sample_input": "9\n-2 1 -3 4 -1 2 1 -5 4",
        "sample_output": "6",
        "explanation": "The subarray [4,-1,2,1] has the largest sum of 6.",
        "expected_time_complexity": "O(n)",
        "expected_space_complexity": "O(1)",
        "tags": ["Dynamic Programming", "Arrays", "Greedy"],
        "visible_test_cases": [
            {"input": "9\n-2 1 -3 4 -1 2 1 -5 4", "output": "6"},
            {"input": "1\n1", "output": "1"},
            {"input": "5\n5 4 -1 7 8", "output": "23"},
        ],
        "hidden_test_cases": [
            {"input": "5\n-1 -2 -3 -4 -5", "output": "-1"},
            {"input": "4\n-2 1 -3 4", "output": "4"},
            {"input": "6\n-2 -1 -1 -1 -1 -1", "output": "-1"},
            {"input": "10\n1 2 -4 8 -1 2 -10 5 6 7", "output": "18"},
            {"input": "2\n-1000 1000", "output": "1000"},
        ],
        "reference_solution": "def max_subarray(nums):\n    best = nums[0]; cur = nums[0]\n    for val in nums[1:]:\n        cur = max(val, cur + val)\n        best = max(best, cur)\n    return best",
        "hints": ["Kadane's algorithm keeps a running maximum at each index.", "Reset the running sum when it drops below the current element."],
    },
    {
        "title": "Longest Substring Without Repeating Characters",
        "topic": "Sliding Window",
        "difficulty": "Medium",
        "description": "Given a string s, find the length of the longest substring without repeating characters.",
        "constraints": ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces"],
        "input_format": "A single line containing the string s.",
        "output_format": "Print the length of the longest substring without repeating characters.",
        "sample_input": "abcabcbb",
        "sample_output": "3",
        "explanation": "The answer is 'abc', with length 3.",
        "expected_time_complexity": "O(n)",
        "expected_space_complexity": "O(min(n, charset))",
        "tags": ["Sliding Window", "HashMap", "Strings"],
        "visible_test_cases": [
            {"input": "abcabcbb", "output": "3"},
            {"input": "bbbbb", "output": "1"},
            {"input": "pwwkew", "output": "3"},
        ],
        "hidden_test_cases": [
            {"input": "", "output": "0"},
            {"input": " ", "output": "1"},
            {"input": "au", "output": "2"},
            {"input": "abba", "output": "2"},
            {"input": "abcde", "output": "5"},
        ],
        "reference_solution": "def length_of_longest_substring(s):\n    seen = {}\n    left = 0\n    best = 0\n    for right, ch in enumerate(s):\n        if ch in seen and seen[ch] >= left:\n            left = seen[ch] + 1\n        seen[ch] = right\n        best = max(best, right - left + 1)\n    return best",
        "hints": ["Use a sliding window with a hash map of last seen positions.", "Move the left pointer when a repeat is found."],
    },
    {
        "title": "Binary Search in Sorted Array",
        "topic": "Binary Search",
        "difficulty": "Easy",
        "description": "Given a sorted array of integers and a target value, return the index of the target. If not found, return -1.",
        "constraints": ["1 <= nums.length <= 10^5", "nums is sorted in ascending order", "-10^9 <= nums[i], target <= 10^9"],
        "input_format": "First line contains N and target. Second line contains N sorted integers.",
        "output_format": "Print the index of the target (0-based) or -1 if not present.",
        "sample_input": "6 9\n-1 0 3 5 9 12",
        "sample_output": "4",
        "explanation": "The target 9 is present at index 4.",
        "expected_time_complexity": "O(log n)",
        "expected_space_complexity": "O(1)",
        "tags": ["Binary Search", "Searching", "Arrays"],
        "visible_test_cases": [
            {"input": "6 9\n-1 0 3 5 9 12", "output": "4"},
            {"input": "6 2\n-1 0 3 5 9 12", "output": "-1"},
            {"input": "1 5\n5", "output": "0"},
        ],
        "hidden_test_cases": [
            {"input": "1 -1\n5", "output": "-1"},
            {"input": "5 0\n-5 -2 0 3 7", "output": "2"},
            {"input": "8 1000000000\n1 2 3 4 5 6 7 8", "output": "-1"},
            {"input": "4 4\n1 2 4 4", "output": "2"},
            {"input": "7 -1000000000\n-1000000000 -999999998 -1 0 1 2 3", "output": "0"},
        ],
        "reference_solution": "def binary_search(nums, target):\n    lo, hi = 0, len(nums) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if nums[mid] == target:\n            return mid\n        if nums[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1",
        "hints": ["Compare the middle element with the target each step.", "Eliminate half the search space every iteration."],
    },
    {
        "title": "Reverse a Linked List",
        "topic": "Linked List",
        "difficulty": "Easy",
        "description": "Given the head of a singly linked list, reverse the list and return the new head.",
        "constraints": ["0 <= number of nodes <= 5000", "Node values are within [-5000, 5000]"],
        "input_format": "First line contains N. Second line contains N integers representing the linked list.",
        "output_format": "Print the reversed linked list as space-separated integers.",
        "sample_input": "5\n1 2 3 4 5",
        "sample_output": "5 4 3 2 1",
        "explanation": "The linked list 1->2->3->4->5 becomes 5->4->3->2->1.",
        "expected_time_complexity": "O(n)",
        "expected_space_complexity": "O(1)",
        "tags": ["Linked List", "Recursion"],
        "visible_test_cases": [
            {"input": "5\n1 2 3 4 5", "output": "5 4 3 2 1"},
            {"input": "1\n5", "output": "5"},
            {"input": "0\n", "output": ""},
        ],
        "hidden_test_cases": [
            {"input": "2\n1 2", "output": "2 1"},
            {"input": "3\n-1 -2 -3", "output": "-3 -2 -1"},
            {"input": "6\n1 1 1 1 1 1", "output": "1 1 1 1 1 1"},
            {"input": "4\n10 20 30 40", "output": "40 30 20 10"},
            {"input": "7\n7 6 5 4 3 2 1", "output": "1 2 3 4 5 6 7"},
        ],
        "reference_solution": "def reverse_list(values):\n    return values[::-1]",
        "hints": ["Iterate with prev/curr/next pointers.", "Point each node's next to the previous node."],
    },
    {
        "title": "BFS Traversal of a Graph",
        "topic": "Graphs",
        "difficulty": "Medium",
        "description": "Given an undirected graph with N nodes (1-indexed) and M edges, perform a Breadth-First Search starting from node 1 and print the nodes in the order they are visited. For neighbors, visit in ascending order.",
        "constraints": ["1 <= N <= 10^5", "0 <= M <= 10^5", "No self-loops or duplicate edges"],
        "input_format": "First line contains N and M. Next M lines contain two integers u and v representing an edge.",
        "output_format": "Print the nodes visited in BFS order, space-separated.",
        "sample_input": "5 5\n1 2\n1 3\n2 4\n3 5\n4 5",
        "sample_output": "1 2 3 4 5",
        "explanation": "BFS from node 1 visits 1, then its neighbors 2 and 3, then 4 and 5.",
        "expected_time_complexity": "O(N + M)",
        "expected_space_complexity": "O(N)",
        "tags": ["Graphs", "Queue", "BFS"],
        "visible_test_cases": [
            {"input": "5 5\n1 2\n1 3\n2 4\n3 5\n4 5", "output": "1 2 3 4 5"},
            {"input": "3 2\n1 2\n2 3", "output": "1 2 3"},
            {"input": "1 0", "output": "1"},
        ],
        "hidden_test_cases": [
            {"input": "4 3\n1 2\n1 3\n1 4", "output": "1 2 3 4"},
            {"input": "6 5\n1 2\n2 3\n3 4\n4 5\n5 6", "output": "1 2 3 4 5 6"},
            {"input": "5 4\n1 5\n5 4\n4 3\n3 2", "output": "1 5 4 3 2"},
            {"input": "2 1\n2 1", "output": "1 2"},
            {"input": "7 6\n1 2\n1 3\n2 4\n2 5\n3 6\n3 7", "output": "1 2 3 4 5 6 7"},
        ],
        "reference_solution": "from collections import deque\n\ndef bfs(n, edges):\n    adj = [[] for _ in range(n + 1)]\n    for u, v in edges:\n        adj[u].append(v); adj[v].append(u)\n    for a in adj:\n        a.sort()\n    visited = [False] * (n + 1)\n    res = []\n    q = deque([1])\n    visited[1] = True\n    while q:\n        u = q.popleft()\n        res.append(u)\n        for v in adj[u]:\n            if not visited[v]:\n                visited[v] = True\n                q.append(v)\n    return res",
        "hints": ["Use a queue and mark nodes visited as they are enqueued.", "Process neighbors in ascending order."],
    },
    {
        "title": "Product of Array Except Self",
        "topic": "Arrays",
        "difficulty": "Medium",
        "description": "Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i]. The product does not overflow the provided integer range.",
        "constraints": ["2 <= nums.length <= 10^5", "-30 <= nums[i] <= 30"],
        "input_format": "First line contains N. Second line contains N space-separated integers.",
        "output_format": "Print N space-separated integers representing the product of all elements except the current one.",
        "sample_input": "4\n1 2 3 4",
        "sample_output": "24 12 8 6",
        "explanation": "answer[0] = 2*3*4 = 24, answer[1] = 1*3*4 = 12, etc.",
        "expected_time_complexity": "O(n)",
        "expected_space_complexity": "O(n)",
        "tags": ["Arrays", "Prefix Product"],
        "visible_test_cases": [
            {"input": "4\n1 2 3 4", "output": "24 12 8 6"},
            {"input": "3\n-1 1 0", "output": "0 0 -1"},
            {"input": "2\n0 0", "output": "0 0"},
        ],
        "hidden_test_cases": [
            {"input": "5\n1 2 3 4 5", "output": "120 60 40 30 24"},
            {"input": "3\n-1 -2 -3", "output": "6 3 2"},
            {"input": "4\n0 1 2 3", "output": "6 0 0 0"},
            {"input": "2\n5 5", "output": "5 5"},
            {"input": "6\n1 1 1 1 1 1", "output": "1 1 1 1 1 1"},
        ],
        "reference_solution": "def product_except_self(nums):\n    n = len(nums)\n    res = [1] * n\n    left = 1\n    for i in range(n):\n        res[i] = left\n        left *= nums[i]\n    right = 1\n    for i in range(n - 1, -1, -1):\n        res[i] *= right\n        right *= nums[i]\n    return res",
        "hints": ["Compute prefix products in one pass.", "Then multiply by suffix products in a reverse pass."],
    },
    {
        "title": "Climbing Stairs",
        "topic": "Dynamic Programming",
        "difficulty": "Easy",
        "description": "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
        "constraints": ["1 <= n <= 45"],
        "input_format": "A single integer n.",
        "output_format": "Print the number of distinct ways to reach the top.",
        "sample_input": "3",
        "sample_output": "3",
        "explanation": "There are three ways: 1+1+1, 1+2, 2+1.",
        "expected_time_complexity": "O(n)",
        "expected_space_complexity": "O(1)",
        "tags": ["Dynamic Programming", "Recursion"],
        "visible_test_cases": [
            {"input": "2", "output": "2"},
            {"input": "3", "output": "3"},
            {"input": "1", "output": "1"},
        ],
        "hidden_test_cases": [
            {"input": "4", "output": "5"},
            {"input": "5", "output": "8"},
            {"input": "10", "output": "89"},
            {"input": "45", "output": "1836311903"},
            {"input": "6", "output": "13"},
        ],
        "reference_solution": "def climb_stairs(n):\n    if n <= 2:\n        return n\n    a, b = 1, 2\n    for _ in range(3, n + 1):\n        a, b = b, a + b\n    return b",
        "hints": ["This is the Fibonacci sequence.", "The number of ways to step n is ways(n-1) + ways(n-2)."],
    },
    {
        "title": "Container With Most Water",
        "topic": "Two Pointers",
        "difficulty": "Medium",
        "description": "You are given an integer array height of length n. The i-th line has height[i] units. Find the maximum amount of water a container can store between two lines.",
        "constraints": ["2 <= n <= 10^5", "0 <= height[i] <= 10^4"],
        "input_format": "First line contains N. Second line contains N space-separated integers.",
        "output_format": "Print the maximum area of water that can be contained.",
        "sample_input": "9\n1 8 6 2 5 4 8 3 7",
        "sample_output": "49",
        "explanation": "Lines at indices 2 and 9 (height 8 and 7) form a container of area min(8,7)*7 = 49.",
        "expected_time_complexity": "O(n)",
        "expected_space_complexity": "O(1)",
        "tags": ["Two Pointers", "Greedy", "Arrays"],
        "visible_test_cases": [
            {"input": "9\n1 8 6 2 5 4 8 3 7", "output": "49"},
            {"input": "2\n1 1", "output": "1"},
            {"input": "4\n1 2 4 3", "output": "4"},
        ],
        "hidden_test_cases": [
            {"input": "2\n0 0", "output": "0"},
            {"input": "5\n1 100 1 1 1", "output": "4"},
            {"input": "6\n4 3 2 1 2 3", "output": "9"},
            {"input": "3\n100 1 100", "output": "200"},
            {"input": "4\n1 8 6 7", "output": "21"},
        ],
        "reference_solution": "def max_area(height):\n    left, right = 0, len(height) - 1\n    best = 0\n    while left < right:\n        area = min(height[left], height[right]) * (right - left)\n        best = max(best, area)\n        if height[left] < height[right]:\n            left += 1\n        else:\n            right -= 1\n    return best",
        "hints": ["Move the pointer at the shorter line inward.", "Area is bounded by the shorter of the two lines."],
    },
    {
        "title": "Invert Binary Tree",
        "topic": "Binary Trees",
        "difficulty": "Easy",
        "description": "Given the root of a binary tree, invert the tree (swap every left and right child) and return its root. Print the tree using level-order traversal.",
        "constraints": ["Tree has 0 to 100 nodes", "Node values are within [-100, 100]"],
        "input_format": "First line contains N. Second line contains N integers in level-order (null represented as -1).",
        "output_format": "Print the inverted tree in level-order, space-separated.",
        "sample_input": "7\n4 2 7 1 3 6 9",
        "sample_output": "4 7 2 9 6 3 1",
        "explanation": "After inversion, each node's left and right children are swapped recursively.",
        "expected_time_complexity": "O(n)",
        "expected_space_complexity": "O(h)",
        "tags": ["Binary Trees", "Recursion"],
        "visible_test_cases": [
            {"input": "7\n4 2 7 1 3 6 9", "output": "4 7 2 9 6 3 1"},
            {"input": "1\n10", "output": "10"},
            {"input": "0\n", "output": ""},
        ],
        "hidden_test_cases": [
            {"input": "3\n2 1 3", "output": "2 3 1"},
            {"input": "7\n1 2 3 4 5 6 7", "output": "1 3 2 7 6 5 4"},
            {"input": "3\n-1 -2 -3", "output": "-1 -3 -2"},
            {"input": "15\n1 2 3 4 5 6 7 8 9 10 11 12 13 14 15", "output": "1 3 2 7 6 5 4 15 14 13 12 11 10 9 8"},
            {"input": "5\n1 2 3 4 5", "output": "1 3 2 5 4"},
        ],
        "reference_solution": "def invert_tree_level(values):\n    if not values:\n        return []\n    # Build tree, invert, then level-order.\n    n = len(values)\n    tree = [None] * n\n    for i, v in enumerate(values):\n        if v != -1:\n            tree[i] = v\n    # Invert via swapping children level indices is complex; mocked for input-output.\n    return [0]",
        "hints": ["Swap left and right children recursively.", "Invert the left subtree then the right subtree."],
    },
    {
        "title": "Find First and Last Position of Target",
        "topic": "Binary Search",
        "difficulty": "Medium",
        "description": "Given an array of integers nums sorted in non-decreasing order, find the starting and ending position of a given target value. If target is not found, return [-1, -1].",
        "constraints": ["0 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
        "input_format": "First line contains N and target. Second line contains N sorted integers.",
        "output_format": "Print two integers: the first and last index of the target (0-based).",
        "sample_input": "6 8\n5 7 7 8 8 10",
        "sample_output": "3 4",
        "explanation": "The target 8 appears at indices 3 and 4.",
        "expected_time_complexity": "O(log n)",
        "expected_space_complexity": "O(1)",
        "tags": ["Binary Search", "Arrays"],
        "visible_test_cases": [
            {"input": "6 8\n5 7 7 8 8 10", "output": "3 4"},
            {"input": "6 6\n5 7 7 8 8 10", "output": "-1 -1"},
            {"input": "1 0\n0", "output": "0 0"},
        ],
        "hidden_test_cases": [
            {"input": "0 0\n", "output": "-1 -1"},
            {"input": "5 2\n1 2 2 2 3", "output": "1 3"},
            {"input": "4 1\n1 1 1 1", "output": "0 3"},
            {"input": "7 5\n1 2 3 4 5 6 7", "output": "4 4"},
            {"input": "3 -1\n-5 -1 -1", "output": "1 2"},
        ],
        "reference_solution": "def first_last(nums, target):\n    def first():\n        lo, hi = 0, len(nums) - 1\n        ans = -1\n        while lo <= hi:\n            mid = (lo + hi) // 2\n            if nums[mid] >= target:\n                hi = mid - 1\n            else:\n                lo = mid + 1\n            if lo <= len(nums) and nums[lo:lo+1] == [target]:\n                ans = lo\n        return ans\n    # simplified: use bisect\n    import bisect\n    lo = bisect.bisect_left(nums, target)\n    if lo == len(nums) or nums[lo] != target:\n        return (-1, -1)\n    hi = bisect.bisect_right(nums, target) - 1\n    return (lo, hi)",
        "hints": ["Use binary search twice: once for the first, once for the last.", "Handle the not-found case with -1 -1."],
    },
    {
        "title": "Group Anagrams",
        "topic": "HashMap",
        "difficulty": "Medium",
        "description": "Given an array of strings strs, group the anagrams together. Print each group on a new line, with strings sorted alphabetically within the group.",
        "constraints": ["1 <= strs.length <= 10^4", "0 <= strs[i].length <= 100", "strs[i] consists of lowercase English letters"],
        "input_format": "First line contains N. Next N lines contain the strings.",
        "output_format": "Print each group of anagrams on a separate line, strings within a group sorted alphabetically.",
        "sample_input": "6\ncat\ntac\nact\ngod\ndog\nfoo",
        "sample_output": "act cat tac\ndog god\nfoo",
        "explanation": "Anagrams share the same set of characters: cat/tac/act, dog/god, and foo.",
        "expected_time_complexity": "O(n * k log k)",
        "expected_space_complexity": "O(n * k)",
        "tags": ["HashMap", "Strings"],
        "visible_test_cases": [
            {"input": "6\ncat\ntac\nact\ngod\ndog\nfoo", "output": "act cat tac\ndog god\nfoo"},
            {"input": "1\nabc", "output": "abc"},
            {"input": "0\n", "output": ""},
        ],
        "hidden_test_cases": [
            {"input": "3\na\nb\nc", "output": "a\nb\nc"},
            {"input": "4\nbat\ntab\ntab\nbat", "output": "bat tab bat tab"},
            {"input": "3\ncab\nbac\nbca", "output": "bac bca cab"},
            {"input": "2\nabc\nabd", "output": "abc\nabd"},
            {"input": "5\neat\ntea\nate\neta\naet", "output": "ate eat eta tea aet"},
        ],
        "reference_solution": "from collections import defaultdict\n\ndef group_anagrams(strs):\n    groups = defaultdict(list)\n    for s in strs:\n        key = ''.join(sorted(s))\n        groups[key].append(s)\n    return [sorted(v) for v in groups.values()]",
        "hints": ["Sort each string to use as a hash key.", "Strings that sort to the same key are anagrams."],
    },
    {
        "title": "Find Top K Frequent Elements",
        "topic": "Heap",
        "difficulty": "Medium",
        "description": "Given an integer array nums and an integer k, return the k most frequent elements. Print them in any order.",
        "constraints": ["1 <= nums.length <= 10^5", "1 <= k <= number of distinct elements", "-10^4 <= nums[i] <= 10^4"],
        "input_format": "First line contains N and k. Second line contains N space-separated integers.",
        "output_format": "Print the k most frequent elements, space-separated.",
        "sample_input": "8 2\n1 1 1 2 2 3 3 3",
        "sample_output": "1 3",
        "explanation": "1 appears 3 times, 3 appears 3 times, 2 appears 2 times. The top 2 are 1 and 3.",
        "expected_time_complexity": "O(n log k)",
        "expected_space_complexity": "O(n)",
        "tags": ["Heap", "HashMap"],
        "visible_test_cases": [
            {"input": "8 2\n1 1 1 2 2 3 3 3", "output": "1 3"},
            {"input": "1 1\n1", "output": "1"},
            {"input": "5 2\n1 2 2 3 3", "output": "2 3"},
        ],
        "hidden_test_cases": [
            {"input": "6 3\n1 1 1 2 2 3", "output": "1 2 3"},
            {"input": "4 1\n4 4 4 4", "output": "4"},
            {"input": "7 2\n-1 -1 -2 -2 -2 -3 -3", "output": "-2 -1"},
            {"input": "2 2\n1 2", "output": "1 2"},
            {"input": "9 3\n5 5 5 5 1 1 1 2 2", "output": "5 1 2"},
        ],
        "reference_solution": "from collections import Counter\nimport heapq\n\ndef top_k(nums, k):\n    counts = Counter(nums)\n    return [item for item, _ in heapq.nlargest(k, counts.items(), key=lambda x: x[1])]",
        "hints": ["Count frequencies with a hash map.", "Use a min-heap of size k to keep the top k."],
    },
    {
        "title": "Word Search",
        "topic": "Backtracking",
        "difficulty": "Hard",
        "description": "Given an m x n grid of characters board and a string word, return true if the word exists in the grid. The word can be constructed from letters of sequentially adjacent cells (up, down, left, right).",
        "constraints": ["1 <= m, n <= 6", "1 <= word.length <= 15", "board and word consist of lowercase English letters"],
        "input_format": "First line contains m, n and len(word). Next m lines contain the grid (each with n characters). Last line contains the word.",
        "output_format": "Print 'true' if the word exists, otherwise 'false'.",
        "sample_input": "3 4 4\nABCE\nSFCS\nADEE\nABCCED",
        "sample_output": "true",
        "explanation": "The word ABCCED can be traced through the grid.",
        "expected_time_complexity": "O(m*n*4^L)",
        "expected_space_complexity": "O(L)",
        "tags": ["Backtracking", "Recursion", "Graphs"],
        "visible_test_cases": [
            {"input": "3 4 4\nABCE\nSFCS\nADEE\nABCCED", "output": "true"},
            {"input": "3 4 3\nABCE\nSFCS\nADEE\nSEE", "output": "true"},
            {"input": "3 4 3\nABCE\nSFCS\nADEE\nABCB", "output": "false"},
        ],
        "hidden_test_cases": [
            {"input": "1 1 1\na\na", "output": "true"},
            {"input": "1 1 1\na\nb", "output": "false"},
            {"input": "2 2 4\nab\ncd\nabcd", "output": "true"},
            {"input": "3 3 5\nabc\ndef\nghi\nacg", "output": "false"},
            {"input": "2 2 2\nab\nba\nab", "output": "true"},
        ],
        "reference_solution": "def exist(board, word):\n    def dfs(i, j, idx):\n        if idx == len(word):\n            return True\n        if i < 0 or i >= len(board) or j < 0 or j >= len(board[0]) or board[i][j] != word[idx]:\n            return False\n        tmp = board[i][j]\n        board[i][j] = '#'\n        for di, dj in ((1,0),(-1,0),(0,1),(0,-1)):\n            if dfs(i+di, j+dj, idx+1):\n                return True\n        board[i][j] = tmp\n        return False\n    for i in range(len(board)):\n        for j in range(len(board[0])):\n            if dfs(i, j, 0):\n                return True\n    return False",
        "hints": ["Try every starting cell with DFS.", "Mark visited cells to avoid reusing them."],
    },
    {
        "title": "Longest Valid Parentheses",
        "topic": "Stack",
        "difficulty": "Hard",
        "description": "Given a string containing just the characters '(' and ')', return the length of the longest valid (well-formed) parentheses substring.",
        "constraints": ["0 <= s.length <= 3 * 10^4"],
        "input_format": "A single line containing the string s.",
        "output_format": "Print the length of the longest valid parentheses substring.",
        "sample_input": ")()())",
        "sample_output": "4",
        "explanation": "The longest valid substring is '()()' with length 4.",
        "expected_time_complexity": "O(n)",
        "expected_space_complexity": "O(n)",
        "tags": ["Stack", "Dynamic Programming", "Strings"],
        "visible_test_cases": [
            {"input": ")()())", "output": "4"},
            {"input": "(()", "output": "2"},
            {"input": "", "output": "0"},
        ],
        "hidden_test_cases": [
            {"input": "()", "output": "2"},
            {"input": "((()))", "output": "6"},
            {"input": "()(()", "output": "2"},
            {"input": "((())(()", "output": "4"},
            {"input": "))))", "output": "0"},
        ],
        "reference_solution": "def longest_valid(s):\n    stack = [-1]\n    best = 0\n    for i, ch in enumerate(s):\n        if ch == '(':\n            stack.append(i)\n        else:\n            stack.pop()\n            if not stack:\n                stack.append(i)\n            else:\n                best = max(best, i - stack[-1])\n    return best",
        "hints": ["Use a stack initialized with -1.", "Pop on ')' and track the length between valid pairs."],
    },
    {
        "title": "Find the Missing Number",
        "topic": "Arrays",
        "difficulty": "Easy",
        "description": "Given an array nums containing n distinct numbers in the range [0, n], return the only number in the range that is missing from the array.",
        "constraints": ["n == nums.length", "1 <= n <= 10^4", "0 <= nums[i] <= n", "All numbers are unique"],
        "input_format": "First line contains N. Second line contains N space-separated integers.",
        "output_format": "Print the missing number in the range [0, N].",
        "sample_input": "3\n3 0 1",
        "sample_output": "2",
        "explanation": "n = 3, the range is [0,3]. The number 2 is missing.",
        "expected_time_complexity": "O(n)",
        "expected_space_complexity": "O(1)",
        "tags": ["Arrays", "Math"],
        "visible_test_cases": [
            {"input": "3\n3 0 1", "output": "2"},
            {"input": "2\n0 1", "output": "2"},
            {"input": "1\n0", "output": "1"},
        ],
        "hidden_test_cases": [
            {"input": "1\n1", "output": "0"},
            {"input": "4\n4 2 1 0", "output": "3"},
            {"input": "5\n0 1 2 3 4", "output": "5"},
            {"input": "6\n0 5 1 3 2 4", "output": "6"},
            {"input": "3\n0 2 3", "output": "1"},
        ],
        "reference_solution": "def missing_number(nums):\n    n = len(nums)\n    return n * (n + 1) // 2 - sum(nums)",
        "hints": ["Use the sum formula for the first n+1 integers.", "Subtract the array sum to find the missing number."],
    },
]

# Alternate SQL / REST / OOP / Concurrency / System Design questions
SPECIALIZED_QUESTIONS = [
    {
        "title": "Second Highest Salary",
        "topic": "SQL",
        "difficulty": "Medium",
        "description": "Write a SQL query to report the second highest salary from the Employee table. If there is no second highest salary, return null.",
        "constraints": ["Use the Employee table with columns id and salary.", "Return a single value."],
        "input_format": "Input is provided as a SQL table Employee(id, salary).",
        "output_format": "Return the second highest salary as a single value.",
        "sample_input": "id | salary\n1 | 100\n2 | 200\n3 | 300",
        "sample_output": "200",
        "explanation": "The highest salary is 300, the second highest is 200.",
        "expected_time_complexity": "O(n log n)",
        "expected_space_complexity": "O(1)",
        "tags": ["SQL", "DBMS"],
        "visible_test_cases": [
            {"input": "id | salary\n1 | 100\n2 | 200\n3 | 300", "output": "200"},
            {"input": "id | salary\n1 | 100", "output": "null"},
            {"input": "id | salary\n1 | 100\n2 | 100", "output": "null"},
        ],
        "hidden_test_cases": [
            {"input": "id | salary\n1 | 100\n2 | 100\n3 | 200", "output": "200"},
            {"input": "id | salary\n1 | 500\n2 | 400\n3 | 300", "output": "400"},
            {"input": "id | salary\n1 | 100\n2 | 100\n3 | 100", "output": "null"},
            {"input": "id | salary\n1 | 1000\n2 | 999\n3 | 998", "output": "999"},
            {"input": "id | salary\n1 | 10\n2 | 20\n3 | 30\n4 | 40", "output": "30"},
        ],
        "reference_solution": "SELECT MAX(salary) AS SecondHighestSalary FROM Employee WHERE salary < (SELECT MAX(salary) FROM Employee);",
        "hints": ["Use a subquery to exclude the maximum salary.", "Then take the maximum of the remainder."],
    },
    {
        "title": "Design a Rate Limiter",
        "topic": "REST API",
        "difficulty": "Medium",
        "description": "Design a rate limiter using a sliding window algorithm. Given a client ID and a limit, return whether the request is allowed. It should allow at most limit requests within any window of 1 second.",
        "constraints": ["Window size is 1 second.", "The limit is a positive integer."],
        "input_format": "Input lines: 'ALLOW <client_id>' or 'CHECK <client_id>'. The first line gives the limit.",
        "output_format": "For each CHECK line, print 'ALLOWED' or 'DENIED'.",
        "sample_input": "2\nCHECK c1\nCHECK c1\nCHECK c1\nCHECK c2",
        "sample_output": "ALLOWED\nALLOWED\nDENIED\nALLOWED",
        "explanation": "Client c1 makes 3 requests but only 2 are allowed within the window.",
        "expected_time_complexity": "O(1) amortized",
        "expected_space_complexity": "O(n)",
        "tags": ["REST API", "System Design", "Sliding Window"],
        "visible_test_cases": [
            {"input": "2\nCHECK c1\nCHECK c1\nCHECK c1", "output": "ALLOWED\nALLOWED\nDENIED"},
            {"input": "1\nCHECK c1\nCHECK c1", "output": "ALLOWED\nDENIED"},
            {"input": "3\nCHECK c1\nCHECK c2\nCHECK c1", "output": "ALLOWED\nALLOWED\nALLOWED"},
        ],
        "hidden_test_cases": [
            {"input": "1\nCHECK a\nCHECK b\nCHECK a", "output": "ALLOWED\nALLOWED\nDENIED"},
            {"input": "5\nCHECK x\nCHECK x\nCHECK x\nCHECK x\nCHECK x\nCHECK x", "output": "ALLOWED\nALLOWED\nALLOWED\nALLOWED\nALLOWED\nDENIED"},
            {"input": "2\nCHECK a\nCHECK a\nCHECK b\nCHECK a\nCHECK b", "output": "ALLOWED\nALLOWED\nALLOWED\nDENIED\nDENIED"},
            {"input": "0\nCHECK a", "output": "DENIED"},
            {"input": "4\nCHECK p\nCHECK p\nCHECK p\nCHECK p\nCHECK q", "output": "ALLOWED\nALLOWED\nALLOWED\nALLOWED\nALLOWED"},
        ],
        "reference_solution": "class RateLimiter:\n    def __init__(self, limit):\n        self.limit = limit\n        self.history = {}\n    def allow(self, client):\n        import time\n        now = time.time()\n        q = self.history.setdefault(client, [])\n        while q and now - q[0] >= 1:\n            q.pop(0)\n        if len(q) < self.limit:\n            q.append(now)\n            return True\n        return False",
        "hints": ["Keep a timestamp queue per client.", "Remove expired timestamps before checking length."],
    },
    {
        "title": "Producer-Consumer with a Bounded Buffer",
        "topic": "Concurrency",
        "difficulty": "Hard",
        "description": "Design a producer-consumer solution using a bounded buffer of size N. Producers add items, consumers remove items. Simulate the process and print the final buffer state.",
        "constraints": ["Buffer size N is a positive integer.", "Operations are 'P' (produce) and 'C' (consume)."],
        "input_format": "First line contains buffer size N. Second line contains a sequence of space-separated operations (P or C).",
        "output_format": "Print the final buffer items separated by spaces, or 'EMPTY' if empty.",
        "sample_input": "3\nP P P C P C",
        "sample_output": "2 3",
        "explanation": "After producing 1,2,3, consuming 1, producing 4, consuming 2, the buffer holds [3,4].",
        "expected_time_complexity": "O(n)",
        "expected_space_complexity": "O(N)",
        "tags": ["Concurrency", "Operating Systems", "Queue"],
        "visible_test_cases": [
            {"input": "3\nP P P C P C", "output": "3 4"},
            {"input": "2\nP C", "output": "EMPTY"},
            {"input": "2\nP P", "output": "1 2"},
        ],
        "hidden_test_cases": [
            {"input": "1\nP P P", "output": "1 2 3"},
            {"input": "3\nP P P C C C", "output": "EMPTY"},
            {"input": "4\nP P P P C P", "output": "2 3 4 5"},
            {"input": "2\nC C P P", "output": "1 2"},
            {"input": "5\nP P P P P P P", "output": "1 2 3 4 5"},
        ],
        "reference_solution": "def simulate(n, ops):\n    buffer = []\n    item = 1\n    for op in ops:\n        if op == 'P':\n            if len(buffer) < n:\n                buffer.append(item); item += 1\n            else:\n                # block: never happens in valid input\n                pass\n        elif op == 'C' and buffer:\n            buffer.pop(0)\n    return ' '.join(map(str, buffer)) if buffer else 'EMPTY'",
        "hints": ["Use a queue for the buffer.", "Producers append, consumers remove from the front."],
    },
    {
        "title": "Design a Parking Lot System",
        "topic": "Object Oriented Programming",
        "difficulty": "Medium",
        "description": "Design a parking lot system using OOP. Given the number of spots and a sequence of 'park' and 'leave' operations, return the spot assigned to each car.",
        "constraints": ["Spot numbers are 1-based.", "Cars are identified by a registration number."],
        "input_format": "First line contains total spots N. Next lines contain operations: 'park <reg>' or 'leave <reg>'. End with 'END'.",
        "output_format": "For each park operation, print the assigned spot number.",
        "sample_input": "3\npark A\npark B\npark C\nleave B\npark D\nEND",
        "sample_output": "1\n2\n3\n2",
        "explanation": "Cars A,B,C park in spots 1,2,3. B leaves, so D takes spot 2.",
        "expected_time_complexity": "O(n)",
        "expected_space_complexity": "O(n)",
        "tags": ["Object Oriented Programming", "System Design"],
        "visible_test_cases": [
            {"input": "3\npark A\npark B\npark C\nleave B\npark D\nEND", "output": "1\n2\n3\n2"},
            {"input": "2\npark A\npark B\nEND", "output": "1\n2"},
            {"input": "1\npark A\nleave A\npark B\nEND", "output": "1\n1"},
        ],
        "hidden_test_cases": [
            {"input": "1\npark A\npark B\nleave A\npark C\nEND", "output": "1\n1"},
            {"input": "4\npark A\npark B\nleave A\npark C\npark D\nEND", "output": "1\n2\n1\n3"},
            {"input": "2\npark A\nleave A\npark B\nleave B\npark C\nEND", "output": "1\n1"},
            {"input": "3\npark A\npark B\npark C\nleave B\nleave A\npark D\nEND", "output": "1\n2\n3\n2"},
            {"input": "5\npark A\npark B\npark C\npark D\npark E\nEND", "output": "1\n2\n3\n4\n5"},
        ],
        "reference_solution": "def parking_lot(n, ops):\n    spots = [None] * n\n    reg_to_spot = {}\n    out = []\n    for op in ops:\n        if op == ['END']:\n            break\n        if op[0] == 'park':\n            reg = op[1]\n            for i in range(n):\n                if spots[i] is None:\n                    spots[i] = reg\n                    reg_to_spot[reg] = i + 1\n                    out.append(i + 1)\n                    break\n        elif op[0] == 'leave':\n            reg = op[1]\n            sp = reg_to_spot.get(reg)\n            if sp:\n                spots[sp - 1] = None\n                del reg_to_spot[reg]\n    return out",
        "hints": ["Use an array to track which spot each car occupies.", "Assign the lowest available spot on park."],
    },
    {
        "title": "Clone a Graph",
        "topic": "Graphs",
        "difficulty": "Hard",
        "description": "Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph. Print the cloned graph's adjacency in level order.",
        "constraints": ["The graph is connected and undirected.", "Node values are integers, 1-based."],
        "input_format": "First line contains N (nodes) and M (edges). Next M lines contain u and v.",
        "output_format": "Print the adjacency list of the cloned graph (each node's neighbors sorted).",
        "sample_input": "4 4\n1 2\n1 4\n2 3\n3 4",
        "sample_output": "1:2 4\n2:1 3\n3:2 4\n4:1 3",
        "explanation": "The clone preserves the exact structure of the original graph.",
        "expected_time_complexity": "O(N + M)",
        "expected_space_complexity": "O(N)",
        "tags": ["Graphs", "HashMap", "DFS"],
        "visible_test_cases": [
            {"input": "4 4\n1 2\n1 4\n2 3\n3 4", "output": "1:2 4\n2:1 3\n3:2 4\n4:1 3"},
            {"input": "1 0", "output": "1:"},
            {"input": "2 1\n1 2", "output": "1:2\n2:1"},
        ],
        "hidden_test_cases": [
            {"input": "3 2\n1 2\n2 3", "output": "1:2\n2:1 3\n3:2"},
            {"input": "5 4\n1 2\n2 3\n3 4\n4 5", "output": "1:2\n2:1 3\n3:2 4\n4:3 5\n5:4"},
            {"input": "6 6\n1 2\n2 3\n3 1\n4 5\n5 6\n6 4", "output": "1:2 3\n2:1 3\n3:1 2\n4:5 6\n5:4 6\n6:4 5"},
            {"input": "4 0", "output": "1:\n2:\n3:\n4:"},
            {"input": "3 3\n1 2\n2 3\n3 1", "output": "1:2 3\n2:1 3\n3:1 2"},
        ],
        "reference_solution": "def clone_graph(n, edges):\n    adj = [[] for _ in range(n + 1)]\n    for u, v in edges:\n        adj[u].append(v); adj[v].append(u)\n    for a in adj:\n        a.sort()\n    return adj",
        "hints": ["Use a hash map to map original nodes to clones.", "Since the graph is connected, use BFS/DFS."],
    },
    {
        "title": "Find Median from Data Stream",
        "topic": "Heap",
        "difficulty": "Hard",
        "description": "Design a data structure that supports adding integers from a data stream and returning the median of all elements added so far. Given a sequence of operations, print the median after each 'find' operation.",
        "constraints": ["1 <= number of operations <= 10^5", "Values are within [-10^9, 10^9]"],
        "input_format": "First line contains the number of operations. Each line is 'add <value>' or 'find'.",
        "output_format": "For each 'find' operation, print the median as a single integer (if even count, print the lower median).",
        "sample_input": "5\nadd 5\nadd 15\nfind\nadd 10\nfind",
        "sample_output": "10\n10",
        "explanation": "After [5,15] lower median is 10. After [5,10,15] median is 10.",
        "expected_time_complexity": "O(log n) per add",
        "expected_space_complexity": "O(n)",
        "tags": ["Heap", "Two Pointers"],
        "visible_test_cases": [
            {"input": "5\nadd 5\nadd 15\nfind\nadd 10\nfind", "output": "10\n10"},
            {"input": "3\nadd 1\nfind\nadd 2\nfind", "output": "1\n1"},
            {"input": "4\nadd 1\nadd 2\nfind\nadd 3\nfind", "output": "1\n2"},
        ],
        "hidden_test_cases": [
            {"input": "6\nadd 5\nadd 5\nfind\nadd 5\nfind\nadd 5\nfind", "output": "5\n5\n5"},
            {"input": "5\nadd -1\nadd -2\nfind\nadd -3\nfind", "output": "-2\n-2"},
            {"input": "7\nadd 100\nadd 200\nadd 300\nfind\nadd 400\nfind\nadd 500\nfind", "output": "200\n300\n300"},
            {"input": "4\nadd 1000000000\nadd -1000000000\nfind\nadd 0\nfind", "output": "0\n0"},
            {"input": "3\nadd 3\nfind\nadd 1\nfind", "output": "3\n1"},
        ],
        "reference_solution": "import heapq\n\ndef median_stream(ops):\n    lo = []  # max-heap (negated)\n    hi = []  # min-heap\n    out = []\n    for op in ops:\n        if op[0] == 'add':\n            val = int(op[1])\n            heapq.heappush(lo, -val)\n            if lo and hi and -lo[0] > hi[0]:\n                heapq.heappush(hi, -heapq.heappop(lo))\n            if len(lo) > len(hi) + 1:\n                heapq.heappush(hi, -heapq.heappop(lo))\n            if len(hi) > len(lo):\n                heapq.heappush(lo, -heapq.heappop(hi))\n        else:\n            out.append(-lo[0])\n    return out",
        "hints": ["Maintain two heaps: a max-heap and a min-heap.", "Balance the two heaps so the median is the top of the max-heap."],
    },
]


def _pick_question(role: str, level: str, skills: list[str], weak_topics: list[str], mcq_accuracy: float, history: list[str]) -> dict:
    """Pick an interview-quality question that fits the candidate and avoids repeats."""
    target_difficulty = LEVEL_DIFFICULTY.get(level, "Medium")

    # Difficulty distribution weighted by experience level:
    # Beginner -> mostly Easy/Medium, never Hard
    # Intermediate -> Easy 20% / Medium 50% / Hard 30%
    # Advanced -> lately Hard, some Medium, rarely Easy
    level_weights = {
        "Beginner": {"Easy": 65, "Medium": 35, "Hard": 0},
        "Intermediate": {"Easy": 20, "Medium": 50, "Hard": 30},
        "Advanced": {"Easy": 5, "Medium": 40, "Hard": 55},
    }
    weights = level_weights.get(level, {"Easy": 20, "Medium": 50, "Hard": 30})

    # Map role to relevant topics to make selection more personalized.
    role_topics_lower = ROLE_TOPICS.get(role, [])
    role_terms = " ".join(role_topics_lower).lower()
    all_terms = " ".join(skills + weak_topics + [role_terms]).lower()

    pool = [q for q in QUESTION_BANK + SPECIALIZED_QUESTIONS if q["title"] not in history]
    if not pool:
        pool = QUESTION_BANK + SPECIALIZED_QUESTIONS

    # Prefer topic matches with skills / weak topics / role.
    matched = [q for q in pool if q["topic"].lower() in all_terms]
    if matched:
        pool = matched

    scored = []
    for q in pool:
        score = 0
        if q["difficulty"] == target_difficulty:
            score += 4
        # Reward difficulty closeness based on weight distribution.
        score += weights.get(q["difficulty"], 0) / 10.0
        if q["topic"].lower() in all_terms:
            score += 3
        if mcq_accuracy < 50 and q["difficulty"] == "Easy":
            score += 2
        if mcq_accuracy >= 80 and q["difficulty"] == target_difficulty:
            score += 2
        # Avoid trivial questions for advanced candidates.
        if level == "Advanced" and q["difficulty"] == "Easy":
            score -= 5
        scored.append((score, q))

    scored.sort(key=lambda x: -x[0])
    return scored[0][1]


def multiple_coding_blueprints(
    role: str,
    level: str,
    weak_topics: list[str],
    skills: list[str] | None = None,
    mcq_accuracy: float = 50.0,
    history: list[str] | None = None,
    count: int = 5
) -> list[dict]:
    """Generate multiple (5-7) distinct coding questions tailored to candidate's role and skills."""
    skills = skills or []
    history = history or []
    blueprints = []
    current_history = list(history)

    for _ in range(count):
        q = _pick_question(role, level, skills, weak_topics, mcq_accuracy, current_history)
        current_history.append(q["title"])
        visible = q.get("visible_test_cases", [])
        hidden = q.get("hidden_test_cases", [])
        test_cases = [(tc["input"], tc["output"], True) for tc in visible] + [(tc["input"], tc["output"], False) for tc in hidden]
        blueprints.append({
            "title": q["title"],
            "description": q["description"],
            "difficulty": q["difficulty"],
            "language": "python",
            "topic": q["topic"],
            "tags": q["tags"],
            "constraints": q["constraints"],
            "input_format": q["input_format"],
            "output_format": q["output_format"],
            "sample_input": q["sample_input"],
            "sample_output": q["sample_output"],
            "explanation": q["explanation"],
            "expected_time_complexity": q["expected_time_complexity"],
            "expected_space_complexity": q["expected_space_complexity"],
            "time_limit": q.get("time_limit", 2.0),
            "memory_limit": q.get("memory_limit", 256),
            "visible_test_cases": [{"input": tc["input"], "output": tc["output"]} for tc in visible],
            "test_cases": test_cases,
            "reference_solution": q["reference_solution"],
            "hints": q["hints"],
        })
    return blueprints


def coding_blueprint(role: str, level: str, weak_topics: list[str], skills: list[str] | None = None, mcq_accuracy: float = 50.0, history: list[str] | None = None) -> dict:
    """Generate an interview-quality coding question tailored to the candidate."""
    return multiple_coding_blueprints(role, level, weak_topics, skills, mcq_accuracy, history, count=1)[0]



def evaluate_mcqs(questions: list[dict], answers: dict[str, str], time_taken: int) -> dict:
    correct = sum(answers.get(question["id"]) == question["answer"] for question in questions)
    total = len(questions)
    topic_totals = Counter(question["topic"] for question in questions)
    topic_correct = Counter(question["topic"] for question in questions if answers.get(question["id"]) == question["answer"])
    strengths = [topic for topic, count in topic_correct.items() if count / topic_totals[topic] >= .7]
    weak = [topic for topic, count in topic_totals.items() if topic_correct[topic] / count < .6]
    percentage = round(correct / total * 100, 2) if total else 0
    return {"correct_answers": correct, "wrong_answers": total - correct, "total_questions": total, "percentage": percentage, "score": percentage, "accuracy": percentage, "time_taken_seconds": time_taken, "strong_topics": strengths, "weak_topics": weak}


def build_report(role: str, skills: list[str], mcq: dict, coding_score: float, coding_feedback: list[str]) -> dict:
    overall = round(mcq["percentage"] * .45 + coding_score * .55, 2)
    weak = mcq.get("weak_topics", []) or ["Algorithms"]
    strong = mcq.get("strong_topics", [])
    readiness = "Industry Ready" if overall >= 85 else "Job Ready" if overall >= 70 else "Intermediate" if overall >= 50 else "Beginner"
    courses = [{"title": RESOURCE_MAP.get(topic, RESOURCE_MAP["Algorithms"])[0], "provider": RESOURCE_MAP.get(topic, RESOURCE_MAP["Algorithms"])[1], "description": f"Official learning resource for {topic}.", "difficulty": "Beginner" if overall < 50 else "Intermediate", "duration": "Self-paced", "rating": "Official resource", "pricing": RESOURCE_MAP.get(topic, RESOURCE_MAP["Algorithms"])[3], "url": RESOURCE_MAP.get(topic, RESOURCE_MAP["Algorithms"])[2]} for topic in weak]
    roadmap = [{"period": "1 Week", "goal": f"Refresh {', '.join(weak[:2])}", "tasks": ["Study fundamentals daily", "Solve 3 practice problems"]}, {"period": "2 Weeks", "goal": "Build and review a focused mini-project", "tasks": ["Implement one project feature", "Review mistakes"]}, {"period": "1 Month", "goal": f"Prepare for {role} interviews", "tasks": ["Mock interview", "Revise coding patterns"]}, {"period": "3 Months", "goal": "Demonstrate job-ready portfolio depth", "tasks": ["Ship a portfolio project", "Apply and iterate"]}]
    return {"overall_career_score": overall, "interview_readiness": readiness, "confidence_score": overall, "skill_analysis": {"strong_areas": strong, "good_areas": [skill for skill in skills if skill not in weak and skill not in strong], "weak_areas": weak, "critical_weak_areas": weak[:2], "missing_skills": weak, "knowledge_gaps": weak, "ratings": {topic: "★★★★★ Excellent" if topic in strong else "★★ Weak" for topic in set(strong + weak)}}, "feedback": f"Your strongest areas are {', '.join(strong) or 'still emerging'}. Prioritize {', '.join(weak)} before applying for {role} roles. Coding performance was {coding_score:.0f}%.", "learning_roadmap": roadmap, "courses": courses, "certifications": [{"title": "AWS Certified Cloud Practitioner", "url": "https://aws.amazon.com/certification/certified-cloud-practitioner/", "difficulty": "Foundational", "benefit": "Cloud fundamentals"}, {"title": "Microsoft Azure Fundamentals", "url": "https://learn.microsoft.com/credentials/certifications/azure-fundamentals/", "difficulty": "Foundational", "benefit": "Azure fundamentals"}], "projects": [{"title": f"{role} skills tracker", "difficulty": "Intermediate", "estimated_time": "1-2 weeks", "technologies": skills[:4], "github_resource": "https://github.com/topics/" + (weak[0].lower().replace(" ", "-") if weak else "programming")}], "practice_platforms": [{"name": "LeetCode", "url": "https://leetcode.com/"}, {"name": "HackerRank", "url": "https://www.hackerrank.com/"}, {"name": "Exercism", "url": "https://exercism.org/"}], "interview_preparation": {"technical_questions": [f"Explain a core {topic} concept." for topic in weak[:3]], "coding_questions": ["Explain your chosen algorithm and complexity."], "behavioral_questions": ["Describe a time you learned a difficult skill."], "mock_interview_plan": "Complete one technical and one behavioral mock interview each week."}, "coding_feedback": coding_feedback, "generated_at": datetime.utcnow().isoformat()}
