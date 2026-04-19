import json
import re
from typing import Any

from .model_manager import manager
from .prompts import WORKOUT_SYSTEM_PROMPT
from .rag import retrieve

PLACEHOLDER_RE = re.compile(r"<[^>\n]{1,80}>|\{\{[^}\n]{1,80}\}\}|\[[A-Za-z_ ]{1,40}\]")
CJK_RE = re.compile(r"[\u4e00-\u9fff]")
LATIN_WORD_RE = re.compile(r"\b[A-Za-z]{3,}\b")
NUTRITION_LEAK_RE = re.compile(
    r"\b(?:calories?|kcal|protein|carb(?:s)?|fat(?:s)?|macro(?:s)?|meal(?:s)?|diet|nutrition|breakfast|lunch|dinner|snack|hydration|water)\b|"
    r"(?:热量|卡路里|蛋白|碳水|脂肪|饮食|营养|早餐|午餐|晚餐|加餐|零食|补水|喝水)",
    re.I,
)
EN_SECTION_RE = re.compile(
    r"\b(?:Goal and assumptions|Training plan|Progression rule|Safety and recovery|"
    r"Target calories and protein|Meal plan|Weekly adjustment rule|Snack guardrails)\b",
    re.I,
)
DIRTY_TEMPLATE_RE = re.compile(r"\b(?:WORKOUT ADVICE|NUTRITION ADVICE)\b", re.I)
DAY_COUNT_RE = re.compile(r"\b([3-6])[- ]day\b|([3-6])\s*天", re.I)
DURATION_WEEK_RE = re.compile(r"\b(?:7\s*day|7-day|weekly|week|one week)\b|(?:一周|七天|7天|本周)", re.I)
EN_DAY_LABEL_RE = re.compile(
    r"\b(?:day\s*[1-7]|monday|tuesday|wednesday|thursday|friday|saturday|sunday|rest day|recovery day)\b",
    re.I,
)
ZH_DAY_LABEL_RE = re.compile(
    r"(?:第[1-7]天|周一|周二|周三|周四|周五|周六|周日|星期一|星期二|星期三|星期四|星期五|星期六|星期日|休息日|恢复日)"
)
UPPER_LOWER_RE = re.compile(r"\bupper/?lower\b|(?:上肢下肢|上下肢)", re.I)
HYPERTROPHY_RE = re.compile(r"\bhypertrophy\b|(?:增肌|肌肥大)", re.I)
ZH_SECTION_TITLES = ("目标与前提", "训练安排", "进阶规则", "恢复与注意事项")
EN_SECTION_TITLES = ("Goal and assumptions", "Training plan", "Progression rule", "Safety and recovery")
FOCUS_PATTERNS = {
    "back": re.compile(r"\b(?:back|lats?|latissimus|upper back|mid back)\b|(?:背部|背阔肌|上背|中背)", re.I),
    "chest": re.compile(r"\b(?:chest|pecs?|pectorals?)\b|(?:胸部|胸肌)", re.I),
    "legs": re.compile(
        r"\b(?:legs?|quads?|hamstrings?|glutes?|posterior chain|lower body)\b|(?:腿部|腿|臀部|下肢|股四头|腘绳肌)",
        re.I,
    ),
    "shoulders": re.compile(r"\b(?:shoulders?|delts?|deltoids?)\b|(?:肩部|肩膀|三角肌)", re.I),
    "arms": re.compile(r"\b(?:arms?|biceps|triceps)\b|(?:手臂|二头|三头)", re.I),
    "core": re.compile(r"\b(?:core|abs|abdominals?|waist|midsection)\b|(?:核心|腹肌|腰腹)", re.I),
}
FOCUS_EXERCISE_HINTS = {
    "back": re.compile(
        r"\b(?:pull-?up|chin-?up|lat pulldown|pulldown|row|deadlift|rack pull|face pull|straight-arm pulldown|"
        r"chest-supported row|single-arm row|seated row|cable row)\b|(?:引体|下拉|划船|硬拉|面拉|直臂下拉|背阔)",
        re.I,
    ),
    "chest": re.compile(
        r"\b(?:bench press|incline press|dumbbell press|machine chest press|push-?up|cable fly|pec deck|dips?)\b|"
        r"(?:卧推|上斜卧推|胸推|飞鸟|俯卧撑|双杠臂屈伸)",
        re.I,
    ),
    "legs": re.compile(
        r"\b(?:squat|leg press|lunge|split squat|romanian deadlift|rdl|leg curl|leg extension|calf raise)\b|"
        r"(?:深蹲|腿举|箭步蹲|保加利亚分腿蹲|罗马尼亚硬拉|腿弯举|腿屈伸|提踵)",
        re.I,
    ),
    "shoulders": re.compile(
        r"\b(?:overhead press|shoulder press|lateral raise|rear delt fly|face pull|upright row)\b|"
        r"(?:肩推|侧平举|后束飞鸟|面拉|直立划船)",
        re.I,
    ),
    "arms": re.compile(
        r"\b(?:curl|hammer curl|preacher curl|pushdown|triceps extension|close-grip bench|skullcrusher)\b|"
        r"(?:弯举|锤式弯举|牧师凳弯举|下压|臂屈伸|窄握卧推|法式卧推)",
        re.I,
    ),
    "core": re.compile(
        r"\b(?:plank|ab wheel|crunch|cable crunch|dead bug|hanging knee raise|side plank)\b|"
        r"(?:平板支撑|滚轮|卷腹|绳索卷腹|死虫|悬垂举腿|侧桥)",
        re.I,
    ),
}
FOCUS_CONFLICT_HINTS = {
    "back": re.compile(r"\b(?:bench press|chest press|cable fly|push-?up|dips?)\b|(?:卧推|胸推|飞鸟|俯卧撑|双杠臂屈伸)", re.I),
    "chest": re.compile(r"\b(?:deadlift|lat pulldown|pull-?up|seated row|cable row)\b|(?:硬拉|下拉|引体|划船)", re.I),
    "legs": re.compile(r"\b(?:bench press|chest press|cable fly|push-?up)\b|(?:卧推|胸推|飞鸟|俯卧撑)", re.I),
    "shoulders": re.compile(r"\b(?:squat|leg press|romanian deadlift|bench press)\b|(?:深蹲|腿举|罗马尼亚硬拉|卧推)", re.I),
    "arms": re.compile(r"\b(?:squat|deadlift|leg press)\b|(?:深蹲|硬拉|腿举)", re.I),
    "core": re.compile(r"\b(?:bench press|lat pulldown|seated row|leg press)\b|(?:卧推|下拉|划船|腿举)", re.I),
}


def _contains_cjk(text: str) -> bool:
    return bool(CJK_RE.search(text or ""))


def _latin_word_count(text: str) -> int:
    return len(LATIN_WORD_RE.findall(text or ""))


def _is_cjk_user_message(text: str) -> bool:
    return _contains_cjk(text)


def _original_user_message(text: str) -> str:
    source = str(text or "").strip()
    if not source:
        return ""
    head = source.split("\n\n", 1)[0].strip()
    return head or source


def _requested_training_days(text: str) -> int | None:
    match = DAY_COUNT_RE.search(text or "")
    if not match:
        return None
    for group in match.groups():
        if group:
            try:
                return int(group)
            except Exception:
                return None
    return None


def _is_weekly_request(text: str) -> bool:
    return bool(DURATION_WEEK_RE.search(text or ""))


def _has_expected_sections(text: str, is_cjk: bool) -> bool:
    body = str(text or "")
    titles = ZH_SECTION_TITLES if is_cjk else EN_SECTION_TITLES
    return all(title in body for title in titles)


def _has_weekly_structure(text: str, is_cjk: bool) -> bool:
    body = str(text or "")
    matches = ZH_DAY_LABEL_RE.findall(body) if is_cjk else EN_DAY_LABEL_RE.findall(body)
    cleaned = {str(item).strip().lower() for item in matches if str(item).strip()}
    return len(cleaned) >= 5


def _requested_focus_area(text: str) -> str:
    source = str(text or "")
    for focus_area, pattern in FOCUS_PATTERNS.items():
        if pattern.search(source):
            return focus_area
    return ""


def _focus_display_name(focus_area: str, is_cjk: bool) -> str:
    labels = {
        "back": ("背部", "back"),
        "chest": ("胸部", "chest"),
        "legs": ("腿部", "legs"),
        "shoulders": ("肩部", "shoulders"),
        "arms": ("手臂", "arms"),
        "core": ("核心", "core"),
    }
    zh_label, en_label = labels.get(focus_area, ("训练部位", "training area"))
    return zh_label if is_cjk else en_label


def _looks_like_markdown_table(text: str) -> bool:
    lines = [line.strip() for line in str(text or "").splitlines() if line.strip()]
    if len(lines) < 2:
        return False
    if "|" not in lines[0]:
        return False
    return any(re.match(r"^\|?\s*:?-{3,}", line.replace("|", "").strip()) for line in lines[1:3])


def _needs_rewrite(user_message: str, text: str) -> bool:
    original_message = _original_user_message(user_message)
    body = (text or "").strip()
    is_cjk = _is_cjk_user_message(original_message)
    focus_area = _requested_focus_area(original_message)
    if not body:
        return True
    if PLACEHOLDER_RE.search(body):
        return True
    if len(body) < 60:
        return True
    if _looks_like_markdown_table(body):
        return True
    if DIRTY_TEMPLATE_RE.search(body):
        return True
    if NUTRITION_LEAK_RE.search(body):
        return True
    if not _has_expected_sections(body, is_cjk):
        return True
    if _is_weekly_request(original_message) and not _has_weekly_structure(body, is_cjk):
        return True
    if focus_area:
        if not FOCUS_EXERCISE_HINTS[focus_area].search(body):
            return True
        conflict_pattern = FOCUS_CONFLICT_HINTS.get(focus_area)
        if conflict_pattern and conflict_pattern.search(body):
            return True
    if is_cjk:
        if EN_SECTION_RE.search(body):
            return True
        english_words = re.findall(r"[A-Za-z]{3,}", body)
        if len(english_words) >= 4:
            return True
    elif _contains_cjk(body):
        return True
    return False


def _fallback_clean(text: str) -> str:
    return PLACEHOLDER_RE.sub("（请补充具体信息）", text or "")


def _strip_nutrition_leak(text: str) -> str:
    kept_lines = []
    for raw_line in str(text or "").splitlines():
        line = raw_line.strip()
        if line and NUTRITION_LEAK_RE.search(line):
            continue
        kept_lines.append(raw_line)
    return "\n".join(kept_lines)


def _fallback_focus_weekly_plan(focus_area: str, is_cjk: bool) -> str:
    if focus_area == "back":
        if is_cjk:
            return "\n".join(
                [
                    "- 第1天 背部力量：负重引体向上 4x5-6，胸托划船 4x6-8，单臂哑铃划船 3x8-10，面拉 3x15，复合动作休 90-120 秒。",
                    "- 第2天 下肢与核心：深蹲 4x6-8，罗马尼亚硬拉 3x8-10，分腿蹲 3x10/侧，平板支撑 3x40 秒。",
                    "- 第3天 恢复：快走 30-40 分钟，加胸椎和背阔肌活动度练习。",
                    "- 第4天 背部增肌：高位下拉 4x8-10，坐姿划船 4x10-12，直臂下拉 3x12-15，后束飞鸟 3x15-20。",
                    "- 第5天 手臂与上背辅助：锤式弯举 3x10-12，上斜弯举 3x10-12，面拉 3x15-20，耸肩 3x12-15。",
                    "- 第6天 背部技术与泵感：中立握下拉 3x10-12，器械划船 3x10-12，反向飞鸟 3x15-20，背伸 3x12-15。",
                    "- 第7天 休息：轻松步行和拉伸，避免再做高强度拉练。",
                ]
            )
        return "\n".join(
            [
                "- Day 1 Back strength: weighted pull-up 4x5-6, chest-supported row 4x6-8, one-arm dumbbell row 3x8-10, face pull 3x15. Rest 90-120s on the first two lifts.",
                "- Day 2 Lower body and trunk: squat 4x6-8, Romanian deadlift 3x8-10, split squat 3x10/side, plank 3x40s.",
                "- Day 3 Recovery: 30-40 minutes of easy walking plus thoracic and lat mobility.",
                "- Day 4 Back hypertrophy: lat pulldown 4x8-10, seated cable row 4x10-12, straight-arm pulldown 3x12-15, rear-delt fly 3x15-20.",
                "- Day 5 Arms and upper-back support: hammer curl 3x10-12, incline curl 3x10-12, face pull 3x15-20, shrug 3x12-15.",
                "- Day 6 Back technique and pump: neutral-grip pulldown 3x10-12, machine row 3x10-12, reverse fly 3x15-20, back extension 3x12-15.",
                "- Day 7 Rest: easy walking and light stretching only.",
            ]
        )

    if focus_area == "chest":
        if is_cjk:
            return "\n".join(
                [
                    "- 第1天 胸部力量：卧推 4x5-6，上斜哑铃卧推 4x8-10，双杠臂屈伸 3x8-10，复合动作休 90-120 秒。",
                    "- 第2天 下肢：深蹲 4x6-8，腿举 3x10-12，腿弯举 3x10-12，小腿提踵 3x12-15。",
                    "- 第3天 恢复：快走 30 分钟，加胸椎和肩前侧放松。",
                    "- 第4天 胸部增肌：上斜器械推胸 4x8-10，平板哑铃卧推 3x10-12，绳索飞鸟 3x12-15，俯卧撑 2 组接近力竭。",
                    "- 第5天 肩部与三头辅助：肩推 3x6-8，侧平举 3x12-15，绳索下压 3x10-12，过顶臂屈伸 3x12-15。",
                    "- 第6天 胸部泵感：器械夹胸 3x12-15，地板哑铃卧推 3x10-12，俯卧撑 3 组，组间休 45-60 秒。",
                    "- 第7天 休息：轻松活动，避免再做大重量推举。",
                ]
            )
        return "\n".join(
            [
                "- Day 1 Chest strength: bench press 4x5-6, incline dumbbell press 4x8-10, dips 3x8-10. Rest 90-120s on compound lifts.",
                "- Day 2 Lower body: squat 4x6-8, leg press 3x10-12, leg curl 3x10-12, calf raise 3x12-15.",
                "- Day 3 Recovery: 30 minutes of easy walking plus thoracic and anterior-shoulder mobility.",
                "- Day 4 Chest hypertrophy: incline machine press 4x8-10, flat dumbbell press 3x10-12, cable fly 3x12-15, push-up 2 sets close to failure.",
                "- Day 5 Shoulder and triceps support: overhead press 3x6-8, lateral raise 3x12-15, rope pushdown 3x10-12, overhead extension 3x12-15.",
                "- Day 6 Chest pump: pec-deck 3x12-15, floor dumbbell press 3x10-12, push-up 3 rounds with 45-60s rest.",
                "- Day 7 Rest: light movement only and no hard pressing.",
            ]
        )

    if focus_area == "legs":
        if is_cjk:
            return "\n".join(
                [
                    "- 第1天 腿部力量：深蹲 4x5-6，罗马尼亚硬拉 4x6-8，腿举 3x10-12，小腿提踵 3x12-15。",
                    "- 第2天 上肢拉：引体向上 3x6-8，坐姿划船 3x8-10，面拉 3x15，弯举 3x10-12。",
                    "- 第3天 恢复：轻松步行 30-40 分钟，加髋和踝活动度。",
                    "- 第4天 腿后侧主导：硬拉 3x4-6，臀桥 4x8-10，腿弯举 3x10-12，反向箭步蹲 3x10/侧。",
                    "- 第5天 上肢推：卧推 3x6-8，肩推 3x8-10，侧平举 3x12-15，绳索下压 3x10-12。",
                    "- 第6天 腿部容量：前蹲 3x8-10，保加利亚分腿蹲 3x10/侧，腿屈伸 3x12-15，坐姿提踵 3x12-15。",
                    "- 第7天 休息：轻松拉伸和恢复，不做高冲击跑跳。",
                ]
            )
        return "\n".join(
            [
                "- Day 1 Leg strength: squat 4x5-6, Romanian deadlift 4x6-8, leg press 3x10-12, calf raise 3x12-15.",
                "- Day 2 Upper pull: pull-up 3x6-8, seated row 3x8-10, face pull 3x15, curl 3x10-12.",
                "- Day 3 Recovery: 30-40 minutes of easy walking plus hip and ankle mobility.",
                "- Day 4 Posterior-chain bias: deadlift 3x4-6, hip thrust 4x8-10, leg curl 3x10-12, reverse lunge 3x10/side.",
                "- Day 5 Upper push: bench press 3x6-8, overhead press 3x8-10, lateral raise 3x12-15, rope pushdown 3x10-12.",
                "- Day 6 Leg volume: front squat 3x8-10, Bulgarian split squat 3x10/side, leg extension 3x12-15, seated calf raise 3x12-15.",
                "- Day 7 Rest: light stretching only and no hard impact work.",
            ]
        )

    if focus_area == "shoulders":
        if is_cjk:
            return "\n".join(
                [
                    "- 第1天 肩部力量：站姿肩推 4x5-6，哑铃肩推 3x8-10，侧平举 4x12-15。",
                    "- 第2天 下肢：深蹲 4x6-8，罗马尼亚硬拉 3x8-10，腿举 3x10-12。",
                    "- 第3天 恢复：快走 30 分钟，加肩关节活动度和胸椎伸展。",
                    "- 第4天 肩部增肌：器械肩推 4x8-10，侧平举机械递减 3 轮，后束飞鸟 3x15-20，面拉 3x15-20。",
                    "- 第5天 手臂辅助：弯举 3x10-12，绳索下压 3x10-12，锤式弯举 2x12-15，过顶臂屈伸 2x12-15。",
                    "- 第6天 肩部泵感：阿诺德推举 3x10-12，绳索侧平举 3x12-15，后束飞鸟 3x15-20。",
                    "- 第7天 休息：避免再做大重量推举，保留轻量活动。",
                ]
            )
        return "\n".join(
            [
                "- Day 1 Shoulder strength: standing overhead press 4x5-6, dumbbell shoulder press 3x8-10, lateral raise 4x12-15.",
                "- Day 2 Lower body: squat 4x6-8, Romanian deadlift 3x8-10, leg press 3x10-12.",
                "- Day 3 Recovery: 30 minutes of easy walking plus shoulder mobility and thoracic extension.",
                "- Day 4 Shoulder hypertrophy: machine shoulder press 4x8-10, lateral-raise drop set 3 rounds, rear-delt fly 3x15-20, face pull 3x15-20.",
                "- Day 5 Arm support: curl 3x10-12, rope pushdown 3x10-12, hammer curl 2x12-15, overhead extension 2x12-15.",
                "- Day 6 Shoulder pump: Arnold press 3x10-12, cable lateral raise 3x12-15, rear-delt fly 3x15-20.",
                "- Day 7 Rest: no heavy pressing and keep movement easy.",
            ]
        )

    if focus_area == "arms":
        if is_cjk:
            return "\n".join(
                [
                    "- 第1天 手臂力量：窄握卧推 4x6-8，EZ 杠弯举 4x8-10，绳索下压 3x10-12，组间休 75-90 秒。",
                    "- 第2天 下肢：深蹲 4x6-8，腿举 3x10-12，腿弯举 3x10-12。",
                    "- 第3天 恢复：轻松步行 30 分钟，加肘腕活动度。",
                    "- 第4天 手臂容量：上斜弯举 3x10-12，锤式弯举 3x10-12，过顶臂屈伸 3x12-15，反手下压 3x12-15。",
                    "- 第5天 上背和肩部辅助：坐姿划船 3x8-10，面拉 3x15，侧平举 3x12-15。",
                    "- 第6天 手臂泵感：牧师凳弯举 3x12-15，绳索弯举 3x12-15，绳索下压 3x12-15，双凳臂屈伸 2 组。",
                    "- 第7天 休息：如果肘部紧张，只做轻量拉伸和放松。",
                ]
            )
        return "\n".join(
            [
                "- Day 1 Arm strength: close-grip bench press 4x6-8, EZ-bar curl 4x8-10, rope pushdown 3x10-12 with 75-90s rest.",
                "- Day 2 Lower body: squat 4x6-8, leg press 3x10-12, leg curl 3x10-12.",
                "- Day 3 Recovery: 30 minutes of easy walking plus elbow and wrist mobility.",
                "- Day 4 Arm volume: incline curl 3x10-12, hammer curl 3x10-12, overhead triceps extension 3x12-15, reverse-grip pushdown 3x12-15.",
                "- Day 5 Upper-back and shoulder support: seated row 3x8-10, face pull 3x15, lateral raise 3x12-15.",
                "- Day 6 Arm pump: preacher curl 3x12-15, cable curl 3x12-15, rope pushdown 3x12-15, bench dip 2 rounds.",
                "- Day 7 Rest: keep movement easy and avoid pushing through elbow irritation.",
            ]
        )

    if focus_area == "core":
        if is_cjk:
            return "\n".join(
                [
                    "- 第1天 核心抗伸展：悬垂举腿 4x10-12，绳索卷腹 4x12-15，死虫 3x10/侧。",
                    "- 第2天 下肢：前蹲 4x6-8，罗马尼亚硬拉 3x8-10，行走箭步蹲 3x10/侧。",
                    "- 第3天 恢复：轻松步行 30 分钟，加髋屈肌和胸椎活动度。",
                    "- 第4天 核心旋转与侧向稳定：俄罗斯转体 3x16，侧桥 3x30-45 秒/侧，Pallof Press 3x12/侧。",
                    "- 第5天 上肢：引体向上 3x6-8，肩推 3x8-10，坐姿划船 3x10-12。",
                    "- 第6天 核心耐力：平板支撑 3x45-60 秒，滚轮 3x8-10，登山跑 3x30 秒。",
                    "- 第7天 休息：保持轻松活动，不做高疲劳腹部训练。",
                ]
            )
        return "\n".join(
            [
                "- Day 1 Anti-extension core: hanging knee raise 4x10-12, cable crunch 4x12-15, dead bug 3x10/side.",
                "- Day 2 Lower body: front squat 4x6-8, Romanian deadlift 3x8-10, walking lunge 3x10/side.",
                "- Day 3 Recovery: 30 minutes of easy walking plus hip-flexor and thoracic mobility.",
                "- Day 4 Rotation and lateral stability: Russian twist 3x16, side plank 3x30-45s per side, Pallof press 3x12/side.",
                "- Day 5 Upper body: pull-up 3x6-8, overhead press 3x8-10, seated row 3x10-12.",
                "- Day 6 Core endurance: plank 3x45-60s, ab wheel 3x8-10, mountain climber 3x30s.",
                "- Day 7 Rest: keep movement easy and skip high-fatigue ab work.",
            ]
        )

    return ""


def _fallback_focus_single_plan(focus_area: str, is_cjk: bool) -> str:
    plans = {
        "back": (
            "- 主训练：引体向上 4x6-8，胸托划船 4x8-10，高位下拉 3x10-12，直臂下拉 3x12-15，面拉 3x15-20，复合动作休 90 秒，辅助动作休 60 秒。",
            "- Main session: pull-up 4x6-8, chest-supported row 4x8-10, lat pulldown 3x10-12, straight-arm pulldown 3x12-15, face pull 3x15-20. Rest 90s on compound lifts and 60s on accessories.",
        ),
        "chest": (
            "- 主训练：卧推 4x6-8，上斜哑铃卧推 4x8-10，器械推胸 3x10-12，绳索飞鸟 3x12-15，俯卧撑 2 组接近力竭。",
            "- Main session: bench press 4x6-8, incline dumbbell press 4x8-10, machine chest press 3x10-12, cable fly 3x12-15, push-up 2 sets close to failure.",
        ),
        "legs": (
            "- 主训练：深蹲 4x6-8，罗马尼亚硬拉 4x8-10，行走箭步蹲 3x10/侧，腿举 3x10-12，腿弯举 3x12-15，小腿提踵 3x12-15。",
            "- Main session: squat 4x6-8, Romanian deadlift 4x8-10, walking lunge 3x10/side, leg press 3x10-12, leg curl 3x12-15, calf raise 3x12-15.",
        ),
        "shoulders": (
            "- 主训练：肩推 4x6-8，哑铃肩推 3x8-10，侧平举 4x12-15，后束飞鸟 3x12-15，面拉 3x15-20。",
            "- Main session: overhead press 4x6-8, dumbbell shoulder press 3x8-10, lateral raise 4x12-15, rear-delt fly 3x12-15, face pull 3x15-20.",
        ),
        "arms": (
            "- 主训练：窄握卧推 3x6-8，EZ 杠弯举 3x8-10，绳索下压 3x10-12，上斜弯举 3x10-12，过顶臂屈伸 3x12-15，锤式弯举 2x12-15。",
            "- Main session: close-grip bench press 3x6-8, EZ-bar curl 3x8-10, rope pushdown 3x10-12, incline curl 3x10-12, overhead extension 3x12-15, hammer curl 2x12-15.",
        ),
        "core": (
            "- 主训练：悬垂举腿 4x10-12，绳索卷腹 4x12-15，侧桥 3x30-45 秒/侧，滚轮 3x8-10，死虫 3x10/侧。",
            "- Main session: hanging knee raise 4x10-12, cable crunch 4x12-15, side plank 3x30-45s per side, ab wheel 3x8-10, dead bug 3x10/side.",
        ),
    }
    zh_plan, en_plan = plans.get(
        focus_area,
        (
            "- 主训练：选择 4-5 个围绕目标部位的动作，先做 2 个复合动作，再做 2-3 个孤立或稳定性动作。",
            "- Main session: choose 4-5 lifts around the target area, starting with 2 compound lifts and finishing with 2-3 isolation or stability drills.",
        ),
    )
    return zh_plan if is_cjk else en_plan


def _fallback_general_weekly_plan(is_cjk: bool) -> str:
    if is_cjk:
        return "\n".join(
            [
                "- 第1天 上肢力量：卧推 4x6-8，划船 4x8-10，肩推 3x8-10，面拉 3x15。",
                "- 第2天 下肢力量：深蹲 4x6-8，罗马尼亚硬拉 4x8-10，腿举 3x10-12，提踵 3x12-15。",
                "- 第3天 恢复：快走 30 分钟，加活动度练习。",
                "- 第4天 拉训练：引体向上 4x6-8，坐姿划船 4x10-12，下拉 3x10-12，弯举 3x10-12。",
                "- 第5天 腿部容量：前蹲 3x8-10，保加利亚分腿蹲 3x10/侧，腿弯举 3x12-15，核心 3 组。",
                "- 第6天 轻度有氧和核心：单车或快走 25-35 分钟，平板支撑和死虫各 3 组。",
                "- 第7天 休息：轻松活动即可。",
            ]
        )
    return "\n".join(
        [
            "- Day 1 Upper strength: bench press 4x6-8, row 4x8-10, overhead press 3x8-10, face pull 3x15.",
            "- Day 2 Lower strength: squat 4x6-8, Romanian deadlift 4x8-10, leg press 3x10-12, calf raise 3x12-15.",
            "- Day 3 Recovery: 30 minutes of easy walking plus mobility work.",
            "- Day 4 Pull session: pull-up 4x6-8, seated row 4x10-12, pulldown 3x10-12, curl 3x10-12.",
            "- Day 5 Leg volume: front squat 3x8-10, Bulgarian split squat 3x10/side, leg curl 3x12-15, core 3 rounds.",
            "- Day 6 Light conditioning and core: bike or brisk walk 25-35 minutes, then plank and dead bug for 3 rounds each.",
            "- Day 7 Rest: easy movement only.",
        ]
    )


def _fallback_training_plan(user_message: str, is_cjk: bool) -> str:
    original = _original_user_message(user_message)
    day_count = _requested_training_days(original) or 4
    weekly = _is_weekly_request(original)
    focus_area = _requested_focus_area(original)
    upper_lower = bool(UPPER_LOWER_RE.search(original))

    if weekly and focus_area:
        return _fallback_focus_weekly_plan(focus_area, is_cjk)

    if weekly:
        return _fallback_general_weekly_plan(is_cjk)

    if focus_area:
        return _fallback_focus_single_plan(focus_area, is_cjk)

    if day_count == 4 or upper_lower:
        if is_cjk:
            return "\n".join(
                [
                    f"- 第1天 上肢：卧推 4x6-8，划船 4x8-10，上斜哑铃卧推 3x8-10，下拉 3x10-12，侧平举 3x12-15。",
                    "- 第2天 下肢：深蹲 4x6-8，罗马尼亚硬拉 4x8-10，腿举 3x10-12，腿弯举 3x10-12，小腿提踵 3x12-15。",
                    "- 第3天 上肢：肩推 4x6-8，坐姿划船 4x8-10，双杠臂屈伸或俯卧撑 3x8-12，面拉 3x12-15，弯举 3x10-12。",
                    "- 第4天 下肢：硬拉 3x4-6，保加利亚分腿蹲 3x8-10，臀桥 3x8-10，腿屈伸 3x12-15，核心训练 3组。",
                ]
            )
        return "\n".join(
            [
                "- Day 1 Upper: bench press 4x6-8, row 4x8-10, incline dumbbell press 3x8-10, lat pulldown 3x10-12, lateral raise 3x12-15.",
                "- Day 2 Lower: squat 4x6-8, Romanian deadlift 4x8-10, leg press 3x10-12, leg curl 3x10-12, calf raise 3x12-15.",
                "- Day 3 Upper: overhead press 4x6-8, seated row 4x8-10, dips or push-ups 3x8-12, face pulls 3x12-15, curls 3x10-12.",
                "- Day 4 Lower: deadlift 3x4-6, Bulgarian split squat 3x8-10, hip thrust 3x8-10, leg extension 3x12-15, core work 3 rounds.",
            ]
        )

    if is_cjk:
        return (
            "- 训练日A：深蹲 4x6-8，卧推 4x6-8，划船 4x8-10，腿弯举 3x10-12，平板支撑 3组。\n"
            "- 训练日B：硬拉 3x4-6，肩推 4x6-8，下拉 4x8-10，箭步蹲 3x8-10，卷腹 3组。\n"
            "- 每周按 A-B-A / B-A-B 轮换。"
        )
    return (
        "- Day A: squat 4x6-8, bench press 4x6-8, row 4x8-10, leg curl 3x10-12, plank 3 rounds.\n"
        "- Day B: deadlift 3x4-6, overhead press 4x6-8, lat pulldown 4x8-10, lunges 3x8-10, crunches 3 rounds.\n"
        "- Alternate A-B-A and B-A-B across weeks."
    )


def _fallback_answer(user_message: str, user_profile: dict[str, Any] | None = None) -> str:
    original = _original_user_message(user_message)
    is_cjk = _is_cjk_user_message(original)
    day_count = _requested_training_days(original) or 4
    weekly = _is_weekly_request(original)
    focus_area = _requested_focus_area(original)
    focus_label = _focus_display_name(focus_area, is_cjk) if focus_area else ""
    goal = "增肌" if HYPERTROPHY_RE.search(original) else "提升力量与训练一致性"
    goal_en = "hypertrophy" if HYPERTROPHY_RE.search(original) else "strength and consistency"
    scope_line_zh = (
        f"- 先按一周{focus_label}聚焦训练处理。"
        if weekly and focus_label
        else "- 先按一周训练安排处理。"
        if weekly
        else f"- 先按{focus_label}聚焦训练处理。"
        if focus_label
        else f"- 先给你一个最适合的 {day_count} 天训练安排；如有伤病或器械限制，再单独调整。"
    )
    scope_line_en = (
        f"- Treat this as a one-week {focus_label}-focused plan first."
        if weekly and focus_label
        else "- Treat this as a one-week training schedule first."
        if weekly
        else f"- Treat this as a {focus_label}-focused plan first."
        if focus_label
        else f"- Start with one best-fit {day_count}-day plan and adjust later if you have injury limits or equipment constraints."
    )

    if is_cjk:
        return (
            "目标与前提\n"
            f"- 目标先按{goal}处理。\n"
            f"{scope_line_zh}\n\n"
            "训练安排\n"
            f"{_fallback_training_plan(original, True)}\n\n"
            "进阶规则\n"
            "- 当同一动作在所有工作组都达到次数上限且动作稳定时，下次加重 2.5-5%。\n\n"
            "恢复与注意事项\n"
            "- 每次训练前做 5-8 分钟热身；主动作保留 1-2 次余力；连续疲劳明显时先减一组而不是硬顶。"
        )
    return (
        "Goal and assumptions\n"
        f"- Treat the main goal as {goal_en}.\n"
        f"{scope_line_en}\n\n"
        "Training plan\n"
        f"{_fallback_training_plan(original, False)}\n\n"
        "Progression rule\n"
        "- Increase load by 2.5-5% once every work set reaches the top of the rep range with solid form.\n\n"
        "Safety and recovery\n"
        "- Warm up for 5-8 minutes, leave 1-2 reps in reserve on main lifts, and reduce one set before pushing through obvious fatigue."
    )


def _rewrite_answer(user_message: str, draft_answer: str) -> str:
    original_message = _original_user_message(user_message)
    is_cjk = _is_cjk_user_message(original_message)
    weekly = _is_weekly_request(original_message)
    focus_area = _requested_focus_area(original_message)
    target_language = "Chinese" if is_cjk else "English"

    if is_cjk:
        section_instruction = (
            "必须使用以下四个中文小节标题，且完全按此标题输出：\n"
            "1) 目标与前提\n"
            "2) 训练安排\n"
            "3) 进阶规则\n"
            "4) 恢复与注意事项\n"
        )
    else:
        section_instruction = (
            "Use these exact section titles:\n"
            "1) Goal and assumptions\n"
            "2) Training plan\n"
            "3) Progression rule\n"
            "4) Safety and recovery\n"
        )
    duration_instruction = (
        "用户要求的是一周/七天训练安排，所以训练安排部分必须覆盖完整一周，并明确写出休息日。"
        if weekly and is_cjk
        else "The user asked for a weekly or 7-day plan, so section 2 must cover the full week and clearly label rest days."
        if weekly
        else "如果用户没有要求一周计划，就不要硬写成七天模板。"
        if is_cjk
        else "Do not force a 7-day schedule unless the user asked for it."
    )
    focus_instruction = ""
    if focus_area:
        focus_label = _focus_display_name(focus_area, is_cjk)
        focus_instruction = (
            f"这是一个明确的{focus_label}聚焦请求。训练安排必须围绕{focus_label}展开，不要把无关部位的主动作当作主训练，例如背部请求不要把卧推放进主计划。"
            if is_cjk
            else f"This is an explicitly {focus_label}-focused request. Keep section 2 centered on {focus_label} work and do not use unrelated primary lifts as the main exercises, for example no bench press as a main lift in a back plan."
        )
    extra_focus_rule = f"- {focus_instruction}\n" if focus_instruction else ""

    rewrite_user = (
        "Rewrite the draft answer so it is directly usable.\n"
        "Rules:\n"
        f"- Output only in {target_language}.\n"
        "- Answer ONLY the workout and exercise part of the request.\n"
        "- Do NOT include calories, protein targets, meal plans, food examples, or dietary suggestions.\n"
        "- Give exactly ONE best-fit plan unless the user explicitly asked for alternatives.\n"
        "- Use the user details already provided instead of replacing them with generic advice.\n"
        "- If information is missing, make only ONE conservative assumption and state it briefly.\n"
        f"- {duration_instruction}\n"
        f"{extra_focus_rule}"
        f"- {section_instruction}\n"
        "- In the training plan, include specific sets, reps, and rest when relevant.\n"
        "- Use normal prose unless the user explicitly asked for a table. If they did, use a clean GitHub-flavored Markdown table.\n"
        "- Do not mix languages in the same answer.\n"
        "- Do NOT output placeholders such as <...>, [X], {{...}}, TBD, N/A, null.\n"
        "- Do NOT output JSON.\n"
        "- Keep advice concrete and actionable.\n"
        "- Ask at most ONE concise follow-up question only if critical info is missing and the answer would otherwise be unsafe or unusable.\n\n"
        f"Original user question:\n{original_message}\n\n"
        f"Draft answer:\n{draft_answer}"
    )
    rewrite_msgs = [
        {"role": "system", "content": WORKOUT_SYSTEM_PROMPT},
        {"role": "user", "content": rewrite_user},
    ]
    return manager.generate(rewrite_msgs, adapter="workout")


def _normalize_external_evidence(external_evidence: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for item in external_evidence or []:
        if not isinstance(item, dict):
            continue
        normalized.append(
            {
                "title": str(item.get("title") or "External source"),
                "source_type": str(item.get("source_type") or item.get("sourceType") or "external"),
                "source_uri": str(item.get("source_uri") or item.get("sourceUri") or ""),
                "similarity": float(item.get("similarity") or 0.0),
                "chunk_text": str(item.get("chunk_text") or item.get("chunkText") or "")[:700],
            }
        )
    return normalized


def _build_user_block(message: str, user_profile: dict[str, Any] | None, evidence: list[dict[str, Any]]) -> str:
    chunks = []
    if user_profile:
        chunks.append(f"User profile (JSON): {json.dumps(user_profile, ensure_ascii=False)}")
    chunks.append(message)

    if evidence:
        ev_blocks = []
        for idx, item in enumerate(evidence, 1):
            ev_blocks.append(
                f"[Evidence {idx}] {item['title']} ({item['source_type']}, sim={item['similarity']:.2f})\n"
                f"{item['chunk_text']}"
            )
        chunks.append("EVIDENCE (reference only, do not copy verbatim):\n" + "\n\n".join(ev_blocks))
    return "\n\n".join(chunks)


def answer(
    message: str,
    user_profile: dict[str, Any] | None = None,
    use_rag: bool = False,
    external_evidence: list[dict[str, Any]] | None = None,
):
    original_message = _original_user_message(message)
    evidence = []
    if use_rag:
        evidence.extend(
            retrieve(
                original_message,
                topk=4,
                min_sim=0.72,
                source_types=["exercise", "strength", "workout", "free_exercise_db"],
            )
        )

    evidence.extend(_normalize_external_evidence(external_evidence))
    user_block = _build_user_block(original_message, user_profile, evidence)

    msgs = [
        {"role": "system", "content": WORKOUT_SYSTEM_PROMPT},
        {"role": "user", "content": user_block},
    ]
    out = manager.generate(msgs, adapter="workout")
    if _needs_rewrite(original_message, out):
        rewritten = _rewrite_answer(message, out).strip()
        if rewritten:
            out = rewritten
    if _needs_rewrite(original_message, out):
        out = _fallback_answer(original_message, user_profile)
    out = _strip_nutrition_leak(_fallback_clean(out)).strip()
    return out, evidence
