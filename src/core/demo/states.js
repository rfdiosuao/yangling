/**
 * demo 数据:预置状态脚本(演示/录屏兜底)
 * 对应 CONTRACTS.md 的预置 demo 场景
 */
export const DEMO_STATES = [
  {
    id: 'aoye-shanghuo',
    title: '熬夜上火',
    input: '昨晚 3 点睡,今天嘴苦、没精神,下午还要讲一下午会,有点上火',
    constitution: '阴虚质',
    tags: ['熬夜', '上火', '阴虚'],
  },
  {
    id: 'shoujiao-bingliang',
    title: '手脚冰凉',
    input: '一到秋天手脚就冰凉,晚上更明显,总怕冷,想调理一下',
    constitution: '阳虚质',
    tags: ['怕冷', '阳虚'],
  },
  {
    id: 'jiuzuo-jianjing',
    title: '久坐肩颈',
    input: '天天坐办公室,肩颈又酸又硬,转脖子都咔咔响',
    constitution: '平和质',
    tags: ['久坐', '肩颈'],
  },
  {
    id: 'shimian-qian',
    title: '失眠浅睡',
    input: '最近总是睡不着,睡着了也很浅,半夜容易醒,白天没精神',
    constitution: '平和质',
    tags: ['失眠', '浅睡'],
  },
]

/** 演示金句(一键填充对话输入框) */
export const DEMO_QUOTES = DEMO_STATES.map((d) => d.input)
