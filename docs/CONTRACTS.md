# 🤝 养令 YangLing · 模块间数据契约(冻结 v1.0)

> **本文件是并行开发的"宪法"。** 任何模块按此契约实现,靠 mock 数据即可独立开发。
> 契约变更必须:更新本文档 + 通知所有依赖方 + 版本号 +1。
> 状态:🚧 起草中(9/5 前冻结) / ✅ 已冻结

---

## 0. 契约总览

```
M1 输出 ──▶ 状态 JSON(Schema S) ──▶ M2 输入
M2 输出 ──▶ 干预 JSON(Schema I) ──▶ M3/M6 输入
画像    ──▶ 画像 JSON(Schema P)  ──▶ M5 输入(localStorage)
知识库  ──▶ 知识库 JSON(Schema K) ──▶ M2 输入(医学成员编辑)
```

---

## 1. Schema S · 状态 JSON(M1 采集对话输出 → M2 输入)

### 1.1 结构

```json
{
  "schemaVersion": "1.0",
  "capturedAt": "2026-09-05T08:00:00+08:00",
  "rawText": "昨晚3点睡,今天嘴苦、没精神,下午要讲一下午会",
  "userState": {
    "sleep": { "quality": "poor", "hours": 3, "bedtime": "03:00", "notes": "晚睡" },
    "emotion": ["irritated", "tired"],
    "diet": [{ "item": "咖啡", "amount": "2杯", "time": "上午" }],
    "body": [
      { "symptom": "口苦", "severity": 2, "location": "口" },
      { "symptom": "乏力", "severity": 2, "location": "全身" }
    ],
    "schedule": [{ "activity": "会议", "time": "下午", "duration": "3小时", "cognitiveLoad": "high" }]
  },
  "inferred": {
    "solarTerm": "白露",
    "solarTermIndex": 15,
    "hour": "辰时",
    "hourIndex": 7,
    "constitution": "阴虚质",
    "constitutionConfidence": 0.8,
    "matchedState": "熬夜上火",
    "stateTags": ["熬夜", "上火", "阴虚"]
  },
  "profile": {
    "profileId": "local-anon-001",
    "constitutionBaseline": "阴虚质",
    "knownConditions": [],
    "preferences": { "avoid": ["辛辣"], "favor": ["温补"] }
  }
}
```

### 1.2 枚举定义

| 字段 | 取值 | 说明 |
|---|---|---|
| `sleep.quality` | `good` / `fair` / `poor` | 睡眠质量 |
| `emotion[]` | `calm` `happy` `irritated` `anxious` `tired` `sad` `stressed` | 情绪标签(可多选) |
| `body[].symptom` | 自由文本,归一化到已知症状表 | 症状 |
| `body[].severity` | `1`(轻微) / `2`(中度) / `3`(重度) | 严重度 |
| `inferred.constitution` | `平和质` `气虚质` `阳虚质` `阴虚质` `痰湿质` `湿热质` `血瘀质` `气郁质` `特禀质` | 九种体质(国标) |
| `inferred.hour` | `子丑寅卯辰巳午未申酉戌亥` 之一 | 十二时辰 |
| `inferred.solarTerm` | 二十四节气名 | 节气 |

### 1.3 M1 输出契约(实现要求)

- M1 必须输出**完整 Schema S 对象**,缺失字段用 `null`,不省略键。
- `inferred` 是 M2 的**核心输入**:M1 可先跳过推理(置空),由 M2 规则引擎补全;也可由 LLM 一次推理完。
- **M2 只消费 `inferred` + `userState`,不读 `rawText`**。

---

## 2. Schema I · 干预 JSON(M2 引擎输出 → M3/M6 输入)

### 2.1 结构

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "2026-09-05T08:00:00+08:00",
  "context": {
    "solarTerm": "白露",
    "solarTermIndex": 15,
    "hour": "辰时",
    "hourIndex": 7,
    "constitution": "阴虚质",
    "matchedState": "熬夜上火"
  },
  "cards": [
    {
      "id": "cup-1",
      "type": "cup",
      "timeSlot": "卯时",
      "time": "05:00-07:00",
      "title": "一杯 · 百合莲子饮",
      "ingredients": ["百合 10g", "莲子 10g", "冰糖少许"],
      "method": "沸水冲泡 10 分钟,温饮",
      "reason": "滋阴润肺,清心除烦",
      "animation": "acupoint-baihui",
      "familyVersion": {
        "fontSize": "large",
        "language": "simple",
        "note": "此方案为生活方式建议,不替代诊疗"
      }
    }
  ],
  "summary": {
    "headline": "今日宜滋阴润燥,忌熬夜辛辣",
    "oneLine": "百合莲子饮 + 按揉内关穴 + 4-7-8 呼吸",
    "constitutionTip": "你属阴虚质,今天重点在'滋阴'而非'清热'"
  },
  "disclaimer": "本方案为生活方式建议,不替代专业诊疗。如有不适请就医。"
}
```

### 2.2 `cards[].type` 枚举

| type | 含义 | 必有字段 |
|---|---|---|
| `cup` | 一杯(食疗方) | `ingredients[]` `method` `reason` |
| `move` | 一动(穴位/导引) | `acupoint` `location` `method` `animation` |
| `breath` | 一息(呼吸/作息) | `steps[]` `repeat` `animation` |

### 2.3 M2 输出契约(实现要求)

- M3 只依赖 `cards[]` + `summary` + `disclaimer`,**不读 `context`**(仅调试用)。
- `cards[]` 至少 1 个,至多 6 个(按重要度排序)。
- `animation` 字段引用 M4 素材 id;无素材时 `null`,M3 显示静态图。

---

## 3. Schema K · 知识库 JSON(M2 输入 · 医学成员编辑)

### 3.1 分层结构

```json
{
  "schemaVersion": "1.0",
  "meta": { "name": "养令知识库 v1", "updatedAt": "2026-09-05" },
  "solarTerms": [
    {
      "id": "bailu",
      "name": "白露",
      "index": 15,
      "month": 9,
      "keyTraits": ["昼夜温差大", "秋燥渐显", "宜滋阴润肺"],
      "season": "秋"
    }
  ],
  "constitutions": [
    {
      "id": "yinxu",
      "name": "阴虚质",
      "keyTraits": ["口燥咽干", "手足心热", "喜冷饮"],
      "avoid": ["辛辣", "熬夜", "剧烈运动"]
    }
  ],
  "hours": [
    { "id": "maoshi", "name": "卯时", "index": 5, "timeRange": "05:00-07:00", "organ": "大肠经" }
  ],
  "states": [
    {
      "id": "aoye-shanghuo",
      "name": "熬夜上火",
      "keywords": ["熬夜", "嘴苦", "口苦", "没精神", "上火"],
      "severity": ["mild", "moderate"]
    }
  ],
  "interventions": {
    "aoye-shanghuo": {
      "yinxu": {
        "bailu": {
          "cards": [
            { "type": "cup", "title": "一杯 · 百合莲子饮", "ingredients": ["百合 10g", "莲子 10g"], "method": "沸水冲泡", "reason": "滋阴润肺" },
            { "type": "move", "title": "一动 · 按揉内关穴", "acupoint": "内关穴", "location": "腕横纹上2寸", "method": "拇指按揉1分钟", "animation": "acupoint-neiguan" },
            { "type": "breath", "title": "一息 · 4-7-8 呼吸", "steps": ["吸气4秒", "屏息7秒", "呼气8秒"], "repeat": 4 }
          ]
        }
      },
      "yangxu": {
        "bailu": {
          "cards": []
        }
      }
    }
  },
  "fallback": {
    "cards": [
      { "type": "cup", "title": "一杯 · 温开水", "ingredients": ["温水 300ml"], "method": "小口慢饮", "reason": "基础补水" },
      { "type": "breath", "title": "一息 · 腹式呼吸", "steps": ["吸气4秒", "呼气6秒"], "repeat": 5 }
    ],
    "summary": { "headline": "今日宜规律作息", "oneLine": "多喝水 + 深呼吸 + 早点休息" }
  }
}
```

### 3.2 索引规则(引擎实现)

- `interventions[stateId][constitutionId][solarTermId]` → cards
- **查询路径**:`stateId` 必填(由 `matchedState` 决定)→ `constitutionId` 必填 → `solarTermId` **可选**,缺省用 `*`(通用)。
- **兜底链**:精确匹配 → 该状态通用(constitution=*)→ 该体质通用(state=*)→ `fallback`。
- **医学红线**:任何干预必须含 `disclaimer`;食疗/穴位只收**公开常识性内容**,由医学成员审核。

---

## 4. Schema P · 画像 JSON(M5 使用 · localStorage)

### 4.1 结构

```json
{
  "schemaVersion": "1.0",
  "profileId": "local-anon-001",
  "createdAt": "2026-09-05T08:00:00+08:00",
  "updatedAt": "2026-09-05T08:00:00+08:00",
  "baseline": {
    "constitution": "阴虚质",
    "confirmedAt": "2026-09-05",
    "source": "对话推断/自述"
  },
  "tags": {
    "constitutions": [{ "name": "阴虚质", "confidence": 0.8, "observedAt": "2026-09-05" }],
    "states": [{ "name": "熬夜上火", "count": 3, "lastAt": "2026-09-05" }]
  },
  "records": [
    {
      "id": "rec-001",
      "capturedAt": "2026-09-05T08:00:00+08:00",
      "stateRef": "aoye-shanghuo",
      "cards": ["cup-1", "move-1", "breath-1"],
      "completions": { "cup-1": true, "move-1": false, "breath-1": true },
      "feedback": { "helpful": true, "comment": "百合饮不错" }
    }
  ],
  "calendar": {
    "streak": { "current": 3, "longest": 5 },
    "solarTermProgress": { "bailu": { "completed": 2, "total": 7 } },
    "familyRank": { "enabled": true, "members": ["妈妈", "爸爸"], "myPosition": 2 }
  }
}
```

### 4.2 实现要求

- 单 key `yangling:profile` 存整个对象,JSON 序列化。
- **隐私**:所有数据本地存储,不上传(演示可承诺"隐私本地化"给评委看)。
- M5 消费 `records` + `calendar`;M1 消费 `baseline` + `tags` 做个性化。

---

## 5. 契约版本与变更

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | 9/5 | 初版(本文件) |

> **冻结规则**:9/5 起任何契约变更需团队讨论;未冻结前用 mock 数据先行开发,不阻塞。
