You are a senior-level system architect and computer vision engineer.

Build a complete web-based exam checking system similar to EvalBee / DTM OMR logic.

SYSTEM GOAL
- Users register and immediately create exams
- No admin panel
- MongoDB is the main database
- Exams are paper-based OMR (A, B, C, D)
- Camera scanning is used
- Two-stage verification system is mandatory

────────────────────────
STAGE 1 — STRICT OMR ENGINE (NO AI)
────────────────────────

Implement a deterministic OMR engine using OpenCV.

1. Accept a photo of an OMR answer sheet
2. Auto-detect page boundaries and deskew
3. Detect fixed alignment markers
4. Use predefined coordinates for:
   - Question blocks
   - Answer bubbles (A, B, C, D)

For each bubble:
- Convert to grayscale
- Apply adaptive threshold
- Calculate fill_ratio (dark pixels / total pixels)

Classification rules (DO NOT CHANGE):
- fill_ratio < 0.20 → EMPTY
- fill_ratio > 0.70 → SELECTED
- 0.20–0.70 → AMBIGUOUS

For each question output:
{
  question_number,
  detected_answer | null,
  fill_ratios,
  status: CONFIDENT | AMBIGUOUS | MULTIPLE
}

DO NOT guess.
DO NOT apply AI here.
Only pixel math.

────────────────────────
STAGE 2 — AI VERIFICATION (SELECTIVE)
────────────────────────

AI is used ONLY for:
- AMBIGUOUS
- MULTIPLE
- UNCERTAIN cases

AI input MUST include:
- Cropped original image of the question
- Bubble coordinates
- Fill ratios from OMR
- Answer key
- Question number

AI task:
- Determine human intent
- Choose ONLY one answer or declare INVALID
- Explain reasoning briefly

AI output format:
{
  question_number,
  final_answer | null,
  decision_source: "AI",
  confidence: 0–1
}

AI MUST NOT override CONFIDENT OMR answers.

────────────────────────
ANSWER KEY LOGIC
────────────────────────

- Exam creator defines correct answers before exam
- Store answer keys in MongoDB
- After final answers are determined:
  - Compare with key
  - Score based on exam rules
  - Generate detailed report

────────────────────────
DATABASE (MongoDB)
────────────────────────

Collections:
- users
- exams
- answer_keys
- scanned_results
- ai_decisions
- reports

Each scanned result must store:
- raw OMR output
- AI corrections (if any)
- final answers
- timestamps
- image references

────────────────────────
FRONTEND REQUIREMENTS
────────────────────────

- Simple registration
- Exam creation (question count, options, key)
- Camera scanning UI with alignment overlay
- Scan progress indicator
- Error feedback (blur, angle, light)
- Result view:
  - Correct / incorrect
  - AI corrected flags
  - Confidence score

────────────────────────
NON-FUNCTIONAL RULES
────────────────────────

- System must be repeatable and deterministic
- Same image → same result every time
- AI decisions must be auditable
- No magic thresholds except defined ones
- No black-box behavior

────────────────────────
DELIVERABLES
────────────────────────

Generate:
- Backend architecture
- OMR processing pipeline
- AI prompt templates
- MongoDB schemas
- API endpoints
- Frontend flow
- Error handling logic

Think like a national exam system.
Optimize for accuracy over speed.
Avoid shortcuts.
Build it cleanly and correctly.
