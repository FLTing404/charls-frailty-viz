# AgeVital：中国中老年人衰弱轨迹与多维驱动因素可视分析系统

## —— 浙江大学《数据可视化导论》课程大作业设计报告

---

## 1. 项目背景与分析任务定义

### 1.1 背景：中国人口老龄化与衰弱问题

截至 2025 年，中国 60 岁以上人口已超过 3 亿，占总人口比例突破 21%，正式步入"中度老龄化"社会。在老龄化研究中，**衰弱（Frailty）** 被视为比"年龄"更能预测老年人不良预后的核心指标。衰弱指个体因生理储备下降而对外界应激源易感性增加的临床状态，与跌倒、住院、失能甚至死亡高度相关。

CHARLS（中国健康与养老追踪调查）是由北京大学国家发展研究院主持的全国性大型追踪调查项目，覆盖 150 个县、450 个社区，自 2011 年起每 2–3 年追踪一次。本项目基于 CHARLS 2011–2018 年四波调查数据，构建可视分析系统，探索中国中老年人衰弱的空间分布、多维驱动因素及其时间演变。

### 1.2 分析任务定义

| 任务 ID | 分析任务 | 操作类型 | 主要承载页面 |
|---------|---------|---------|-------------|
| **T1** | 探索某一年全国/分省衰弱与慢病负担的空间格局 | 空间/总览 | 快照页 `/snapshot` |
| **T2** | 理解衰弱相关慢病的共病网络结构与并发症风险 | 关系/比较 | 快照页（共病力图） |
| **T3** | 比较不同省份/城乡/性别群体的衰弱状态构成 | 分布/比较 | 轨迹页（旭日图） |
| **T4** | 追踪 2011–2018 衰弱状态转移路径 | 时序/关系 | 轨迹页（桑基图） |
| **T5** | 识别多维驱动因素（ACE、睡眠、社交、抑郁、FI）与衰弱的关联结构 | 相关/探索 | 轨迹页（热力图 + 平行坐标） |
| **T6** | 通过 Brushing & Linking 发现高危亚群体并下钻 | 探索/细节 | 双页联动 |

---

## 2. 数据说明

### 2.1 数据来源

- **数据集：** CHARLS（China Health and Retirement Longitudinal Study）
- **来源机构：** 北京大学国家发展研究院
- **数据许可：** 学术研究免费开放，需在 [charls.pku.edu.cn](https://charls.pku.edu.cn) 注册申请
- **调查波次：** 2011（Wave 1）、2013（Wave 2）、2015（Wave 3）、2018（Wave 4）

### 2.2 核心变量与维度

**衰弱指数（Frailty Index, FI）：** 基于 Rockwood 缺陷累积模型，由 26 项缺陷（10 种慢病 + 6 项 ADL + 5 项 IADL + 认知 + 自评健康等）计算得到，范围 [0, 1]，阈值 ≥0.25 为衰弱。

**十大驱动维度（Driver Dimensions）：**

| 维度 | 缩写 | 方向 | 说明 |
|------|------|------|------|
| 童年逆境 | ACE | → | 24 项童年不良经历 PCA 得分，高值=逆境严重 |
| 社会经济地位 | SES | → | 教育年限 + 非农户籍 + 就业状态复合分 |
| 睡眠质量 | sleep | → | 自报睡眠时长 + CESD-10 抑郁量表 |
| 社会联系 | social | → | 社会参与频率 + 社交网络强度 + 社会支持 |
| 抑郁水平 | depression | → | CESD-10 抑郁量表总分 |
| 医疗可及性 | healthcare | → | 医保覆盖 + 常规医疗来源 |
| 活动参与 | activity | → | 10 类社会活动频率复合分 |
| 社会资本 | scap | → | 社会资本 Z 分数 |
| 物质条件 | material | → | 住房设施（自来水/洗浴/燃气/网络/厕所/清洁能源） |
| 衰弱指数 | FI | ← | 26 项缺陷累积，始终作为结果变量 |

### 2.3 数据统计摘要

**衰弱分类分布（2011–2018，追踪队列口径）：**

| 年份 | 健壮 (Robust) | 衰弱前期 (Pre-Frail) | 衰弱 (Frail) |
|------|:----------:|:-------------:|:--------:|
| 2011 | 58.2% | 11.4% | 11.8% |
| 2013 | 38.4% | 22.2% | 11.7% |
| 2015 | 42.7% | 24.7% | 14.6% |
| 2018 | 36.0% | 25.2% | **16.3%** |

> 趋势：衰弱率持续上升（11.8% → 16.3%），衰弱前期占比翻倍（11.4% → 25.2%），提示"衰弱蓄水池"效应。

### 2.4 数据处理流水线

```
原始 CHARLS 数据 (CSV/XLSX)
    → Python (generate_viz_data.py): 多域合并、Spearman 相关、Phi 系数共现、省级聚合
    → 输出 44 个预聚合 JSON 文件至 Agevital/public/data/
    → 前端按年 fetch，无客户端计算
```

---

## 3. 系统架构

### 3.1 双页面路由设计

系统采用 **React Router v6** 单页应用架构，包含两个核心页面：

```
/                    → 自动重定向至 /trajectories
/trajectories        → 轨迹页（多维驱动因素分析）
/snapshot            → 快照页（衰弱空间分布）
```

**路由入口** 位于 [App.tsx](Agevital/src/App.tsx)，全局注册水墨主题（`ensureInkWashTheme()`）与 Tooltip 提供者。

### 3.2 全局状态管理

系统使用 **Zustand** 实现双 Store 架构：

**globalStore** ([globalStore.ts](Agevital/src/lib/store/globalStore.ts)) — 跨页面共享状态：
- `year`: 当前调查波次（2011/2013/2015/2018）
- `province`: 地理筛选（省份名或 null=全国）
- `brushedIds`: 平行坐标刷选 ID 集合（跨图表联动）

**trajectoryStore** ([trajectoryStore.ts](Agevital/src/lib/store/trajectoryStore.ts)) — 轨迹页专用状态：
- `focusDimension`: 聚焦的驱动维度（排除 FI，因其始终为结果变量）
- `detailTab`: 详情面板当前标签（sankey/bubble/sunburst/chord）

**跨页面联动机制：**

```
快照页 点击省份
  → 设置 globalStore.province
  → 导航至 /trajectories?province=<province>
  → 轨迹页读取 province，所有图表自动过滤该省数据
  → 左侧地图高亮选中省份，顶部 badge 显示筛选范围
  → 点击 badge × 清除 province，恢复全国视图
```

### 3.3 组件层次结构

```
App.tsx
├── Header.tsx                    # 导航栏（龄健 logo + 页面切换）
├── SnapshotPage.tsx              # /snapshot
│   ├── TopBar.tsx                #   年份滑动选择器
│   └── SnapshotGeoStage.tsx      #   地图 + 共病力图叠加
│       ├── ChinaVisGeoMap.tsx    #     ECharts 中国 choropleth
│       └── DeficitForceGraph.tsx #     ECharts 力导向共病网络
└── TrajectoriesPage.tsx          # /trajectories
    ├── WaveSelector.tsx          #   波次年份选择器
    ├── ProvinceMapPanel.tsx      #   省份选择地图
    ├── CorrelationHeatmap.tsx    #   Spearman 相关热力图
    ├── ParallelCoordinatesChart.tsx  # 平行坐标刷选
    └── DriverDetailTabs.tsx      #   详情面板（桑基+散点 | 旭日+和弦）
        ├── DriverSankeyChart.tsx
        ├── DriverScatterBubble.tsx
        ├── SunburstChart.tsx
        └── DriverChordChart.tsx
```

### 3.4 数据加载层

[loaders.ts](Agevital/src/lib/data/loaders.ts) 提供约 17 个类型安全的异步加载函数，按需 fetch 预聚合 JSON。数据格式为列式存储（`fields` + `rows`），由 [driverRecords.ts](Agevital/src/lib/data/driverRecords.ts) 解析为结构化 `DriverRecord[]` 对象。

---

## 4. 视觉设计：水墨主题系统

### 4.1 设计理念

系统整体采用**中国传统水墨画（Ink-Wash）美学**——宣纸底色、墨色文字、朱砂强调、竹青健康——为公共卫生数据赋予东方叙事气质。

### 4.2 色彩系统

| 令牌 | 色值 | 语义 | 使用场景 |
|------|------|------|---------|
| `paper` | `#F7F3EB` | 宣纸底色 | 全局背景、卡片底色 |
| `ink` | `#1C1C1C` | 墨色 | 文字、轴线 |
| `cinnabar` | `#B83B3B` | 朱砂红 | 强调色、衰弱标记、选中态 |
| `indigo` | `#3D5A80` | 靛青 | 负相关（热力图）、东部地区 |
| `bamboo` | `#5C7A6B` | 竹青 | 健壮状态（robust）、正性指标 |
| `amber` | `#C4A35A` | 琥珀 | 衰弱前期（pre-frail）、中部地区 |

**衰弱语义色映射：**

| 衰弱状态 | 颜色 | 色值 |
|---------|------|------|
| 健壮 (Robust) | 竹青 | `#5C7A6B` |
| 衰弱前期 (Pre-Frail) | 琥珀 | `#C4A35A` |
| 衰弱 (Frail) | 朱砂 | `#B83B3B` |

### 4.3 ECharts 主题注册

[inkWash.ts](Agevital/src/lib/theme/inkWash.ts) 通过 `ensureInkWashTheme()` 全局注册自定义 ECharts 主题，覆盖默认的白色背景、无衬线字体、高对比配色为水墨风格。字体堆栈 `"Inter", "Noto Serif SC", sans-serif` 兼顾西文可读性与中文优雅排版。

### 4.4 装饰元素

- **InkDecor** — SVG 墨晕背景（模糊椭圆叠加，模拟水墨渗透效果）
- **InkBorder** — 带 L 形角标的画框容器
- **Seal** — 朱砂色印章 favicon

---

## 5. 案例研究（Case Studies）

### 案例 1：中国 Choropleth 地图 + 共病网络气泡叠加

**对应图表：** [SnapshotGeoStage.tsx](Agevital/src/components/snapshot/SnapshotGeoStage.tsx)（含 [ChinaVisGeoMap.tsx](Agevital/src/components/charts/ChinaVisGeoMap.tsx) + [DeficitForceGraph.tsx](Agevital/src/components/charts/DeficitForceGraph.tsx)）

**可视化类型：** Choropleth（省级填色）+ Force-Directed Graph（共病网络）+ Proportional Symbol（城市气泡）

**数据流：**
1. `loadProvinces(year)` 获取 28 省衰弱率、FI、样本量等
2. `loadDeficitNetwork(year)` 获取 26 项缺陷的共病网络（节点=缺陷，边=Phi 系数共现强度）
3. `loadDeficitCity(year)` 获取各城市各缺陷患病率（含 GPS 坐标）
4. 用户点击共病节点 → 派生气泡数据叠加至地图

**视觉编码：**
- 省份面积色 = 衰弱率（固定全域色标域 [0.086, 0.463]，跨年可比）
- 力导向节点大小 = 该缺陷全国患病率（sqrt 缩放，10–38px）
- 边粗细 = 共现 Phi 系数（0.5–4.5px）
- 节点颜色 = 6 类缺陷分类（慢性病/自报/ADL/IADL/躯体功能/感官）
- 城市气泡面积 = 该城市该缺陷患病率

**交互设计：**
- **省份点击：** 选中高亮（朱砂描边 + 阴影），跳转轨迹页并设置 `province` 筛选
- **共病节点点击：** 在地图上叠加城市级气泡，显示该缺陷的地理分布
- **图例筛选：** 点击图例按缺陷类别 filter，如只看"慢性病"子网络
- **年份切换：** TopBar 滑块切换波次，地图与力图同步更新

**为什么不用简单的柱状图？**
共病关系是网络结构数据——26 种缺陷之间两两共现形成 325 对关系，柱状图/pie 图无法表达这种结构。力导向布局让高共现缺陷自然聚集（如高血压–糖尿病–心脏病形成慢性病簇），低共现缺陷被推远，视觉上直接呈现"共病模块"。

---

### 案例 2：平行坐标 Brushing & Linking 跨视图联动

**对应图表：** [ParallelCoordinatesChart.tsx](Agevital/src/components/trajectories/ParallelCoordinatesChart.tsx)

**可视化类型：** Parallel Coordinates Plot + 10 维轴

**数据流：**
1. `loadDriverRecords(year)` 获取个体级 10 维记录
2. 若 `province` 非空，过滤至该省数据
3. 缺失值用列均值 imputation（本地计算，不修改原始数据）
4. 用户拖拽刷选 → `setBrushedIds(ids)` → 桑基/散点/旭日/和弦同步过滤

**视觉编码：**
- 每线 = 一个体（N = 15,000–20,000/波）
- 线色 = 衰弱类别（竹青 robust / 琥珀 pre-frail / 朱砂 frail）
- Alpha Blending（透明度混合）缓解过绘制（overplotting）
- 聚焦维度轴标签高亮为朱砂，引导注意力
- 刷选计数 badge："已刷选 N / M 人"

**交互模式：**
1. **热力图选维度：** 点击热力图单元格 → `focusDimension` 高亮对应轴
2. **轴间刷选：** 在任意轴上拖拽范围 → 选中穿过该范围的个体线 → `brushedIds` 更新
3. **下钻：** 刷选结果传递至桑基图（看流向）、散点图（看分布）、旭日图（看构成）
4. **清除：** 点击空白处清除刷选，恢复全量

**设计原理：**
平行坐标是探索高维数据的最强工具之一（Inselberg, 1985），本项目用它作为"查询构建器"——分析师在轴上拖拽，定义"低教育 + 高抑郁 + 高 FI"子群，然后在下方面板观察该子群的特征画像。这比写 SQL WHERE 子句直观得多。

**技术挑战与解决：**
- **过绘制：** 15,000 条线重叠 → 使用 `echarts-gl` 非必需（ECharts 已优化 Canvas 渲染）+ alpha=0.3 透明度
- **刷选回调闭包：** ECharts 事件回调捕获旧的 records → 使用 `useRef` 保持最新 records 引用

---

### 案例 3：桑基图 — 衰弱状态跨波转移

**对应图表：** [DriverSankeyChart.tsx](Agevital/src/components/trajectories/DriverSankeyChart.tsx)

**可视化类型：** 双模式 Sankey（ECharts 模式：ACE → 衰弱；D3 模式：2011→2013→2015→2018 时态桑基）

**D3 时态桑基实现：**

使用 `d3-sankey` 布局 + 自定义 SVG 渲染（[temporalSankey.ts](Agevital/src/lib/charts/temporalSankey.ts)）：
- 4 列 = 4 个调查波次
- 每列 4 行节点 = 健壮/衰弱前期/衰弱/失访
- 流束宽度 = 转移人数
- **关键设计：** 使用自定义 cubic bezier 路径 (`ribbonPath()`) 替代 d3-sankey 默认直线，使得交叉流束可区分
- 颜色映射：流入健壮=竹青，流入衰弱=朱砂，流入衰弱前期=琥珀，失访=灰

**洞察发现：**
1. **"蓄水池"效应：** 2011 Robust → 2013 Pre-Frail 流束最宽，且后续流向 Frail 的概率远高于维持在 Pre-Frail
2. **不可逆性：** 2013 Frail → 2015 Robust 流束极细（<3%），验证衰弱一旦形成难以逆转
3. **失访偏倚：** 各波失访率 18–28%，失访者基线 FI 均值高于留存者 0.03

---

### 案例 4：和弦图 — 驱动因素关联结构

**对应图表：** [DriverChordChart.tsx](Agevital/src/components/trajectories/DriverChordChart.tsx)

**可视化类型：** Chord Diagram（D3 原生实现）

**数据流：**
- 数据源：`driver_chord_{year}.json` — 5×5 驱动因素 Spearman ρ 矩阵
- D3 `chord()` 布局计算弧与弦的几何
- 自定义 SVG 渲染

**视觉编码：**
- 外弧 = 各驱动因素（5 色，来自 inkWash 调色板）
- 弦 = 两两关联强度（ρ 的绝对值映射为弦粗细）
- 弦色渐变 = source→target 颜色插值
- 弧标签径向旋转，中点翻转确保可读

**选择理由：**
和弦图能同时显示变量的自身重要性和变量间关联——弧长 ∝ 该因素与其他所有因素的总关联强度，弦粗细 ∝ 两因素特定关联。对于"哪些因素形成驱动簇？"这类分析问题，和弦图比相关矩阵更直观。

---

### 案例 5：旭日图 — 衰弱状态构成层次分解

**对应图表：** [SunburstChart.tsx](Agevital/src/components/charts/SunburstChart.tsx)

**可视化类型：** Sunburst Chart（ECharts）

**层次结构：**
```
衰弱状态 (Frailty Cat)
├── 性别 (Gender)
│   ├── Male
│   └── Female
└── 城乡 (Rural/Urban)
    ├── Rural
    └── Urban
```

**实现特点：**
- 所有聚合在客户端从 `DriverRecord[]` 即时计算（3 层嵌套 `tree[frailty_cat][gender][rural]`）
- 内圈颜色 = 衰弱语义色（竹青/琥珀/朱砂）
- 外圈颜色 = 性别/城乡分别编码
- Tooltip 显示计数 + 百分比

**洞察：** 点击某一扇区可视觉放大，下钻观察该子群的人口学构成。例如，Frail 扇区放大后发现女性 + 农村组合占比最高。

---

## 6. 可视化设计理论支撑

### 6.1 信息寻求 Mantra（Shneiderman, 1996）

| 层次 | 轨迹页 `/trajectories` | 快照页 `/snapshot` |
|------|--------|--------|
| **Overview** | 相关热力图 + 平行坐标 | 中国地图 + KPI 数据 |
| **Zoom & Filter** | 省份地图筛选、平行坐标 Brush、年份切换 | 共病节点点击、省份点击、年份切换 |
| **Details-on-Demand** | 桑基流向细节、散点个体值 | 城市气泡叠加、tooltip 详细统计 |

### 6.2 视觉通道选择（Mackinlay, 1986; Cleveland & McGill, 1984）

| 数据类型 | 通道 | 使用场景 |
|---------|------|---------|
| 分类（衰弱类别） | 色相 | 平行坐标线条、旭日内圈、桑基节点 |
| 有序（FI 水平） | 饱和度 | 地图 choropleth 填色 |
| 定量（患病率/人数） | 面积/位置 | 力导向节点大小、气泡面积、散点位置 |
| 关系（共现/相关） | 粗细/透明度 | 和弦弦宽、力导向边宽、热力图颜色 |
| 时间（波次） | 水平位置 | 桑基列 |
| 地理（省份） | 空间位置 | Choropleth 地图 |

### 6.3 多视图协调（Roberts, 2007）

系统实现了三种联动机制：

1. **Store 驱动的全局筛选：** `globalStore.province` 变更 → 所有图表同步过滤
2. **Brushing & Linking：** 平行坐标刷选 → `brushedIds` → 桑基/散点/旭日/和弦过滤
3. **跨页面联动：** 快照页省份点击 → URL 参数 → 轨迹页自动筛选

三种联动通过 Zustand 的不可变更新 + React 的依赖订阅机制，确保`setState` 时所有订阅组件同步重渲染。

---

## 7. 技术实现

### 7.1 技术栈

| 层级 | 选型 | 版本 | 用途 |
|------|------|------|------|
| 构建工具 | Vite | 5.3 | 开发服务器 + 生产打包 |
| 前端框架 | React | 18.3 | UI 组件 + 状态订阅 |
| 类型系统 | TypeScript | 5.5 | 全量类型定义（strict 模式） |
| 路由 | React Router | 6.24 | 双页面导航 + URL 参数 |
| 状态管理 | Zustand | 4.5 | 全局/页面级状态 |
| 图表引擎 | ECharts | 5.5 | 地图、力导向、旭日、热力图、散点、平行坐标 |
| 图表引擎 | D3.js | 7.9 | 桑基布局、和弦布局 |
| CSS | Tailwind CSS | 3.4 | 原子化样式 + 水墨主题扩展 |
| UI 基础 | shadcn/ui (Radix) | — | Badge、Button、Tooltip |
| 图标 | Lucide React | 0.408 | 矢量图标 |
| 字体 | Inter + Noto Serif SC | — | 西文无衬线 + 中文衬线 |
| 数据处理 | Python (pandas/scipy) | 3.10+ | 预聚合 + Spearman 相关计算 |

### 7.2 关键架构决策

**决策 1：所有数据预聚合为 JSON，前端不做统计计算。**
- 理由：Spearman ρ、Phi 系数、省级 FI 均值等统计指标的计算需完整数据集，放在 Python 预处理阶段效率最高，前端仅负责数据绑定的可视化渲染。
- 代价：无法在客户端实时切换聚合粒度（如从省级下钻到市级需重新运行预处理脚本）。
- 应对：提供城市级数据（`map_city_{year}.json`、`deficit_city_{year}.json`），通过气泡叠加实现"伪下钻"。

**决策 2：双图表引擎并存（ECharts + D3）。**
- ECharts 负责"声明式"图表（地图、力导向、旭日、热力图、平行坐标），利用其内置交互和响应式。
- D3 负责"命令式"图表（桑基、和弦），利用其布局算法和 SVG 精确控制，实现自定义渐变、动画、交互行为。

**决策 3：列式数据格式（`fields` + `rows`）。**
- 个体级数据（15,000–20,000 行 × 10 列）如存储为对象数组，JSON 体积约为列式格式的 1.5 倍（字段名重复）。
- 前端解析时构建列索引表（`Object.fromEntries(fields.map(...))`），按索引取值，O(1) 列查找。

### 7.3 性能策略

| 场景 | 策略 |
|------|------|
| 平行坐标 15,000 线 | ECharts Canvas 渲染 + alpha 透明度缓解过绘制 |
| 力导向图 26 节点 + 300 边 | 数据更新用 `notMerge: false` 保留布局位置，高亮用 `dispatchAction` 避免重布局 |
| 地图 GeoJSON 加载 | 惰性加载 + 注册锁（`mapsRegistered` flag）+ 错误 HTML 防护 |
| 列式数据解析 | 一次性构建列索引表，每条记录按索引取值（无重复哈希查找） |

---

## 8. 项目结构

```
code/
├── data/                              # 原始 CHARLS 数据（需申请获取）
├── scripts/
│   └── generate_viz_data.py           # Python 预处理脚本 → Agevital/public/data/
├── README.md                          # 项目说明文档
└── Agevital/
    ├── index.html                     # HTML 入口
    ├── package.json                   # 依赖 & scripts
    ├── tsconfig.json                  # TypeScript 配置
    ├── vite.config.ts                 # Vite 配置（@/ 路径别名）
    ├── tailwind.config.ts             # Tailwind 水墨主题扩展
    ├── public/
    │   ├── data/                      # 44 个预聚合 JSON（11 类 × 4 波）
    │   ├── geo/                       # 中国省份 + 世界 GeoJSON
    │   └── textures/                  # SVG 装饰纹理
    └── src/
        ├── App.tsx                    # 路由入口
        ├── main.tsx                   # React 挂载入口
        ├── index.css                  # 全局样式 + Tailwind
        ├── types/
        │   └── data.d.ts              # 30+ 类型接口
        ├── pages/
        │   ├── SnapshotPage.tsx       # 快照页
        │   └── TrajectoriesPage.tsx   # 轨迹页
        ├── components/
        │   ├── charts/                # 4 个图表组件
        │   ├── layout/                # 5 个布局组件
        │   ├── snapshot/              # 2 个快照页组件
        │   ├── trajectories/          # 8 个轨迹页组件
        │   └── ui/                    # 3 个 UI 基础组件
        └── lib/
            ├── store/                 # Zustand 双 Store
            ├── data/                  # 加载器 + 解析器
            ├── charts/                # ECharts option 构建
            ├── geo/                   # 省份坐标 + 名称映射
            ├── theme/                 # 水墨 ECharts 主题
            └── i18n/                  # 中文字符串
```

---

## 9. AI 使用声明

| 工具 | 使用场景 |
|------|---------|
| Claude (Anthropic) | ECharts/D3 组件初版生成、TypeScript 类型推导、README 撰写、代码清理建议 |
| GitHub Copilot | 行内代码补全 |
| Cursor IDE | 编码辅助与重构 |

**团队自行决策：** 双页面架构、水墨主题设计、图表类型选型、跨页联动逻辑、数据预处理流水线、分析任务定义。

---

## 10. 参考文献

1. Shneiderman, B. (1996). The eyes have it: A task by data type taxonomy for information visualizations. *IEEE Symposium on Visual Languages*.
2. Mackinlay, J. (1986). Automating the design of graphical presentations of relational information. *ACM Transactions on Graphics*.
3. Cleveland, W. S., & McGill, R. (1984). Graphical perception: Theory, experimentation, and application to the development of graphical methods. *Journal of the American Statistical Association*.
4. Tufte, E. R. (1983). *The Visual Display of Quantitative Information*. Graphics Press.
5. Inselberg, A. (1985). The plane with parallel coordinates. *The Visual Computer*.
6. Roberts, J. C. (2007). State of the art: Coordinated & multiple views in exploratory visualization. *IEEE CMV*.
7. Riehmann, P., Hanfler, M., & Froehlich, B. (2005). Interactive sankey diagrams. *IEEE INFOVIS*.
8. Rockwood, K., & Mitnitski, A. (2007). Frailty in relation to the accumulation of deficits. *Journal of Gerontology: Medical Sciences*.
9. Munzner, T. (2014). *Visualization Analysis and Design*. A K Peters/CRC Press.
10. Ware, C. (2012). *Information Visualization: Perception for Design* (3rd ed.). Morgan Kaufmann.
