import re

NUTRITION_KW = re.compile(
    r"(calorie|kcal|protein|macro|diet|nutrition|meal|fat loss|lose fat|cofid|nhs|eatwell|"
    r"nutrition|food|carb|饮食|营养|热量|卡路里|蛋白|脂肪|碳水|减脂|增肌餐|餐单|食谱)",
    re.I,
)
WORKOUT_KW = re.compile(
    r"(workout|training|sets|reps|bench|squat|deadlift|program|strength|hypertrophy|pr|1rm|"
    r"exercise|gym|训练|健身|动作|组数|次数|卧推|深蹲|硬拉|力量|肌肥大|计划|增肌|减脂训练)",
    re.I,
)


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
