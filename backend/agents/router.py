import re

NUTRITION_KW = re.compile(
    r"\b(?:calorie|kcal|protein|macro|diet|nutrition|meal|fat loss|lose fat|cofid|nhs|eatwell|food|carb)\b|"
    r"(?:饮食|营养|热量|卡路里|蛋白|脂肪|碳水|减脂|增肌餐|餐单|食谱)",
    re.I,
)
WORKOUT_KW = re.compile(
    r"\b(?:workout|training|sets|reps|bench|squat|deadlift|program|strength|hypertrophy|pr|1rm|exercise|gym)\b|"
    r"(?:训练|健身|动作|组数|次数|卧推|深蹲|硬拉|力量|肌肥大|计划|增肌|减脂训练)",
    re.I,
)


def scoped_message(message: str, scope: str) -> str:
    base = (message or "").strip()
    if scope == "nutrition":
        instruction = (
            "Important scope instruction: answer ONLY the nutrition and dietary part of the request. "
            "Do not include exercise names, workout routines, sets, reps, or training instructions. "
            "If the user asked for both workout and nutrition, ignore the workout part here because another specialist will answer it."
        )
    elif scope == "workout":
        instruction = (
            "Important scope instruction: answer ONLY the workout and exercise part of the request. "
            "Do not include meal plans, calorie targets, protein targets, macros, or dietary suggestions. "
            "If the user asked for both workout and nutrition, ignore the nutrition part here because another specialist will answer it."
        )
    else:
        return base
    return f"{base}\n\n{instruction}"


def route(message: str) -> str:
    n = bool(NUTRITION_KW.search(message or ""))
    w = bool(WORKOUT_KW.search(message or ""))
    if n and w:
        return "both"
    if n:
        return "nutrition"
    if w:
        return "workout"
    # Default to both to reduce missed intent cases.
    return "both"
