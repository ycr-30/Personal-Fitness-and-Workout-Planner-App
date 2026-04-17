import re

CJK_RE = re.compile(r"[\u4e00-\u9fff]")

# Only explicit single-intent overrides that clearly exclude the other domain may
# outrank dual-intent. Broad topical overlap alone must never override an
# explicit dual-intent request.
NUTRITION_ONLY_OVERRIDE = re.compile(
    r"(?:只要(?:饮食|营养|餐单|食谱)|"
    r"不要(?:训练|运动|健身)|"
    r"仅(?:饮食|营养)|"
    r"只回答(?:饮食|营养)|"
    r"(?:只(?:谈|说|讲))(?:饮食|营养)|"
    r"\b(?:nutrition only|diet only|no workout|no training)\b)",
    re.I,
)

WORKOUT_ONLY_OVERRIDE = re.compile(
    r"(?:只要(?:训练|健身|动作)|"
    r"不要(?:饮食|营养|餐单)|"
    r"仅(?:训练|健身)|"
    r"只回答(?:训练|健身)|"
    r"(?:只(?:谈|说|讲))(?:训练|健身)|"
    r"\b(?:workout only|training only|exercise only|no diet|no nutrition)\b)",
    re.I,
)

NUTRITION_KW = re.compile(
    r"\b(?:calories?|kcal|protein|macro|diet|dietary|nutrition|meal(?:s)?|meal plan|diet plan|"
    r"weekly meal plan|7[- ]day meal plan|seven day meal plan|meal prep|food|recipe|breakfast|"
    r"lunch|dinner|snack|hydration|water)\b|"
    r"(?:饮食|营养|热量|卡路里|蛋白|脂肪|碳水|饮食计划|食谱|餐单|菜谱|早餐|午餐|晚餐|"
    r"加餐|零食|吃什么|食物|补水|喝水|一周饮食|七天饮食|一周餐单|七天餐单|一周食谱|"
    r"七天食谱|饮食安排|营养安排)",
    re.I,
)

WORKOUT_KW = re.compile(
    r"\b(?:workout|training|exercise|sets?|reps?|bench|squat|deadlift|program|training plan|"
    r"workout plan|strength|hypertrophy|1rm|gym|cardio|mobility|split)\b|"
    r"(?:训练|健身|动作|组数|次数|卧推|深蹲|硬拉|力量|肌肥大|训练计划|健身计划|训练安排|"
    r"动作安排|练胸|练背|练腿|有氧|活动度|分化训练)",
    re.I,
)

BOTH_EXPLICIT = re.compile(
    r"(?:训练.*饮食|饮食.*训练|营养.*训练|训练.*营养|"
    r"\b(?:workout.*nutrition|nutrition.*workout|training.*diet|diet.*training|"
    r"workout.*meal|meal.*workout|training.*meal|meal.*training)\b)",
    re.I,
)

STRUCTURED_NUTRITION_ONLY_RE = re.compile(
    r"\b(?:weekly meal plan|7[- ]day meal plan|seven day meal plan|meal plan for a week|"
    r"diet plan|nutrition plan|meal prep plan|food plan)\b|"
    r"(?:一周(?:的)?(?:饮食计划|餐单|食谱)|七天(?:饮食计划|餐单|食谱)|"
    r"(?:饮食|营养|餐单|食谱)(?:计划|安排)?|给我(?:一份)?(?:饮食计划|餐单|食谱))",
    re.I,
)

STRUCTURED_WORKOUT_ONLY_RE = re.compile(
    r"\b(?:training plan|workout plan|upper/lower|push pull legs|ppl|full body plan|"
    r"hypertrophy split|strength program|4[- ]day workout|3[- ]day workout)\b|"
    r"(?:训练计划|健身计划|训练安排|动作安排|四天.*训练计划|三天.*训练计划|"
    r"增肌训练计划|减脂训练计划|上肢下肢分化|推拉腿)",
    re.I,
)


def _contains_cjk(text: str) -> bool:
    return bool(CJK_RE.search(text or ""))


def is_explicit_dual_intent(message: str) -> bool:
    return bool(BOTH_EXPLICIT.search((message or "").strip()))


def is_nutrition_only_request(message: str) -> bool:
    text = (message or "").strip()
    if not text:
        return False
    if is_explicit_dual_intent(text):
        return False
    if NUTRITION_ONLY_OVERRIDE.search(text):
        return True
    if STRUCTURED_NUTRITION_ONLY_RE.search(text) and not WORKOUT_KW.search(text):
        return True
    return bool(NUTRITION_KW.search(text)) and not bool(WORKOUT_KW.search(text))


def is_workout_only_request(message: str) -> bool:
    text = (message or "").strip()
    if not text:
        return False
    if is_explicit_dual_intent(text):
        return False
    if WORKOUT_ONLY_OVERRIDE.search(text):
        return True
    if STRUCTURED_WORKOUT_ONLY_RE.search(text) and not NUTRITION_KW.search(text):
        return True
    return bool(WORKOUT_KW.search(text)) and not bool(NUTRITION_KW.search(text))


def scoped_message(message: str, scope: str) -> str:
    base = (message or "").strip()
    if not base:
        return ""

    is_cjk = _contains_cjk(base)
    language_guard = (
        "语言要求：用户最后一条消息是中文，所以你必须只用中文回答。除非用户明确要求双语，否则不要混用中英。"
        if is_cjk
        else "Language requirement: the latest user message is in English, so you must answer in English only. "
        "Do not mix Chinese and English unless the user explicitly asks for bilingual output."
    )

    if scope == "nutrition":
        instruction = (
            "重要范围说明：这里只回答饮食与营养部分。不要给出训练动作、训练计划、组数、次数、训练安排或有氧安排。"
            "如果用户同时问了训练和饮食，这里忽略训练部分，因为另一个专门代理会处理训练。"
            if is_cjk
            else "Important scope instruction: answer ONLY the nutrition and dietary part of the request. "
            "Do not include exercise names, workout routines, sets, reps, cardio prescriptions, or training instructions. "
            "If the user asked for both workout and nutrition, ignore the workout part here because another specialist will answer it."
        )
    elif scope == "workout":
        instruction = (
            "重要范围说明：这里只回答训练与动作安排部分。不要给出热量、蛋白、碳水、脂肪、餐单、食物示例或饮食建议。"
            "如果用户同时问了训练和饮食，这里忽略饮食部分，因为另一个专门代理会处理饮食。"
            if is_cjk
            else "Important scope instruction: answer ONLY the workout and exercise part of the request. "
            "Do not include meal plans, calorie targets, protein targets, macros, or dietary suggestions. "
            "If the user asked for both workout and nutrition, ignore the nutrition part here because another specialist will answer it."
        )
    else:
        return base

    return f"{base}\n\n{language_guard}\n\n{instruction}"


def route(message: str) -> str:
    text = (message or "").strip()
    if not text:
        return "both"

    if NUTRITION_ONLY_OVERRIDE.search(text) and not is_explicit_dual_intent(text):
        return "nutrition"

    if WORKOUT_ONLY_OVERRIDE.search(text) and not is_explicit_dual_intent(text):
        return "workout"

    if is_explicit_dual_intent(text):
        return "both"

    if is_nutrition_only_request(text):
        return "nutrition"

    if is_workout_only_request(text):
        return "workout"

    n = bool(NUTRITION_KW.search(text))
    w = bool(WORKOUT_KW.search(text))

    if n and not w:
        return "nutrition"
    if w and not n:
        return "workout"
    if n and w:
        return "both"

    return "both"
