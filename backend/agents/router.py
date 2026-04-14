import re

CJK_RE = re.compile(r"[\u4e00-\u9fff]")

NUTRITION_ONLY_OVERRIDE = re.compile(
    r"(?:只要(?:饮食|营养|餐单|食谱)|"
    r"不要(?:训练|运动|健身)|"
    r"仅(?:饮食|营养)|"
    r"只回答(?:饮食|营养)|"
    r"(?:给我|帮我).{0,12}(?:饮食计划|食谱|餐单|一周饮食|七天饮食)|"
    r"\b(?:meal plan|diet plan|nutrition plan|meal prep|nutrition only|diet only|no workout|no training)\b)",
    re.I,
)

WORKOUT_ONLY_OVERRIDE = re.compile(
    r"(?:只要(?:训练|健身|动作)|"
    r"不要(?:饮食|营养|餐单)|"
    r"仅(?:训练|健身)|"
    r"只回答(?:训练|健身)|"
    r"\b(?:workout only|training only|exercise only|no diet|no nutrition)\b)",
    re.I,
)

NUTRITION_KW = re.compile(
    r"\b(?:calories?|kcal|protein|macro|diet|dietary|nutrition|meal(?:s)?|meal plan|diet plan|"
    r"meal prep|food|recipe|breakfast|lunch|dinner|snack|hydration|water)\b|"
    r"(?:饮食|营养|热量|卡路里|蛋白|脂肪|碳水|饮食计划|食谱|餐单|菜谱|早餐|午餐|晚餐|"
    r"加餐|零食|吃什么|食物|补水|喝水|一周饮食|七天饮食)",
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

NUTRITION_EXCLUSIVE_RE = re.compile(
    r"(?:只要(?:饮食|营养|餐单|食谱)|"
    r"不要(?:训练|运动|健身)|"
    r"仅(?:饮食|营养)|"
    r"只回答(?:饮食|营养)|"
    r"\b(?:nutrition only|diet only|no workout|no training)\b)",
    re.I,
)

WORKOUT_EXCLUSIVE_RE = re.compile(
    r"(?:只要(?:训练|健身|动作)|"
    r"不要(?:饮食|营养|餐单)|"
    r"仅(?:训练|健身)|"
    r"只回答(?:训练|健身)|"
    r"\b(?:workout only|training only|exercise only|no diet|no nutrition)\b)",
    re.I,
)


def _contains_cjk(text: str) -> bool:
    return bool(CJK_RE.search(text or ""))


def scoped_message(message: str, scope: str) -> str:
    base = (message or "").strip()
    if not base:
        return ""

    is_cjk = _contains_cjk(base)

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

    return f"{base}\n\n{instruction}"


def route(message: str) -> str:
    text = (message or "").strip()
    if not text:
        return "both"

    if NUTRITION_EXCLUSIVE_RE.search(text):
        return "nutrition"

    if WORKOUT_EXCLUSIVE_RE.search(text):
        return "workout"

    if BOTH_EXPLICIT.search(text):
        return "both"

    n = bool(NUTRITION_KW.search(text))
    w = bool(WORKOUT_KW.search(text))

    if NUTRITION_ONLY_OVERRIDE.search(text) and not w:
        return "nutrition"

    if WORKOUT_ONLY_OVERRIDE.search(text) and not n:
        return "workout"

    if n and not w:
        return "nutrition"
    if w and not n:
        return "workout"
    if n and w:
        return "both"

    return "both"
