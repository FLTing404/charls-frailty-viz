# AgeVital — Visual Analysis of Frailty in Aging China

> Zhejiang University · *Introduction to Data Visualization* — Course Project · 2026
> Editorial-style infographic dashboard built from **CHARLS 2011 / 2013 / 2015 / 2018**

![screenshot](./screenshot.png)

The dashboard is organised as a **single-page editorial infographic**, stitched together from
two cleanly separated sections that share a global state:

- **Part A · One-Year Snapshot** — controlled by a Wave selector (2011 / 2013 / 2015 / 2018).
  Map + KPIs + body metaphor + syringe-style factor viz + small-multiples answer
  "Where is frailty heaviest *this* wave?".
- **Part B · Multi-Year Trends** — fixed cross-wave panels: stacked-area growth, severity-band
  cohorts, state-transition Sankey, region box plots, and a ridgeline showing FI density drift.

---

## 1 · 项目特性

- **信息图式仪表盘**：单页响应式布局，借鉴公共卫生 Infographic 叙事范式（参考糖尿病全球负担图），以**地图 + 人体隐喻 + 桑基 + 脊线图**完成"空间—身体—时间"三维穿透。
- **统一温暖配色**：以**黄色 / Amber** 为主色调，亮度梯度承担有序 FI 编码，符合 Mackinlay / Ware 的视觉通道原则。
- **15 个协调视图**，类型覆盖：
  - 中国 Choropleth + 区域气泡叠加（geo + scatter）
  - 堆叠面积 + 折线双编码
  - 桑基状态迁移图（4 波 × 3 类）
  - 箱线图小倍数（区域 × 年份）
  - 脊线图（Joy Plot）
  - 自定义 SVG 人体隐喻图（D3）
  - 9 慢病 + ADL + IADL + 物理功能多维条带
  - KPI 卡 / 4 地球图标 / Isotype 图标网格
- **跨视图联动**：年份切换、区域筛选、人体器官点击均通过单一 `setState` 触发增量重绘。
- **完全离线运行**：ECharts / D3 / 中国 GeoJSON 全部本地化，无需互联网。

---

## 2 · 快速开始（≤ 3 分钟）

仅依赖 Python（用于本地静态服务器与可选的数据预处理）。

```bash
# 1. 在仓库根目录启动本地服务器
cd agevital
python -m http.server 8765

# 2. 浏览器访问
#    http://localhost:8765/index.html
```

> 注：因浏览器同源策略，直接双击 `index.html` 会因 `fetch('./data/...')` 失败。
> 必须用本地 HTTP 服务（`python -m http.server` 或任何静态服务器）。

### 数据已包含在 `agevital/data/`

仓库已包含 9 个预聚合后的 JSON 文件（合计 < 35 kB），可直接运行。

### 重新生成数据（可选）

如需从 `清洗过后数据/CHARLS/` 中重新构建 JSON：

```bash
python scripts/preprocess.py
```

无第三方依赖，仅用 Python 3.8+ 标准库（`csv` / `json` / `statistics`），运行 < 15 秒。

---

## 3 · 目录结构

```
code/
├── 清洗过后数据/CHARLS/           # 来自团队的清洗后 CSV（保留原状）
│   ├── charls_frailty/             # 衰弱核心数据 ×4 波
│   ├── charls_socialeconomic_status/
│   ├── charls_sleep_by_wave/
│   ├── charls_social_participation_by_wave/
│   ├── charls_healthcare_system/
│   └── charls_material_circumstances/
├── agevital/
│   ├── index.html                 # 单页信息图式仪表盘
│   ├── styles.css                 # 黄色 / Amber 主题
│   ├── app.js                     # 全部图表 + 状态机
│   ├── data/                      # 9 个预聚合 JSON
│   │   ├── overview.json
│   │   ├── diseases.json
│   │   ├── regions.json
│   │   ├── ridgeline.json
│   │   ├── sankey.json
│   │   ├── factors.json
│   │   ├── body.json
│   │   ├── psu_box.json
│   │   ├── age_cohort.json
│   │   └── china.geo.json         # 中国地图 GeoJSON
│   ├── vendor/                    # 本地 ECharts + D3
│   │   ├── echarts.min.js
│   │   └── d3.min.js
│   └── README.md
├── scripts/
│   └── preprocess.py              # 数据预处理流水线
└── design_report.md               # 中期设计文档（团队既有）
```

---

## 4 · 视图列表与分析任务对应

| 模块                           | 图表类型                     | 对应分析任务 |
|--------------------------------|------------------------------|---------------|
| Top Strip                      | KPI + Mini Choropleth        | T1 总览       |
| Frailty Basic Data             | KPI 卡 (×4)                 | T1            |
| Projected growth rate          | Stacked Area + Line Overlay  | T4 时序       |
| Comprehensive deficit rate     | 横向条带 (排序)              | T2            |
| Daily Management               | Isotype + Bar                | T2 / T3       |
| China Frailty Map              | Choropleth + Scatter Bubbles | T1 / T6       |
| Frail rate by region (Globes)  | 自定义圆形象形图             | T3            |
| FI cohort distribution         | Stacked Bar                  | T4            |
| Frailty Classic Symptom        | Icon Grid                    | T2 (定性导览) |
| Risk & Further Complication    | 自定义 SVG 人体隐喻图        | T2 / T6       |
| Effects of Lifestyle Factors   | Diverging Bar (Robust/Frail) | T5            |
| Frailty State Transitions      | Sankey / Alluvial            | T4 / T6       |
| FI Distribution by Region      | Box-and-Whisker × 4×4 小倍数 | T3            |
| FI Distribution Drift          | Ridgeline / Joy Plot         | T4            |

分析任务编号 (T1–T6) 见 `design_report.md` §1.3。

---

## 5 · 交互说明

| 控件                | 行为                                                                 |
|---------------------|----------------------------------------------------------------------|
| **年份按钮**（顶部） | 切换 2011 / 2013 / 2015 / 2018，**触发左/中/右三栏全部视图重绘**。 |
| **气泡 / 地球图标** | 点击切换"区域筛选"状态（再次点击取消）。                          |
| **人体器官**        | 鼠标悬停显示该域损伤率；点击高亮选中域。                             |
| **图表 tooltip**    | 所有 ECharts 视图自带 tooltip；自定义 SVG 通过统一 `#ttip` 浮层。   |

---

## 6 · 设计要点（节选）

详细设计动机见 `design_report.md`，本节列出与图表行为直接相关的核心决策：

1. **色相为何选择黄色 / Amber 而非青绿？**
   - 区别于参考的糖尿病信息图（青绿），强调 **温暖 / 老龄群体关怀** 的人文叙事；
   - 单一色相的明度梯度承担 FI 有序编码，符合 Munzner 的 *Sequential Colormap* 推荐；
   - 三色 Frailty 分类用 `#FCD34D / #F59E0B / #B45309`（同色相不同明度）保持视觉一致性。

2. **为何用"区域 × PSU"而非省份做地图？**
   - CHARLS 公开数据中 PSU 代码不直接映射官方省码（隐私设计）；
   - 通过 `mc_2018.csv` 中的 `region` 字段，已对 28 个 PSU 前缀进行了 East/Mid/West/Northeast 4 分；
   - 在地图上以"区域均值填色 + 4 气泡"避免虚假的省级精度承诺，同时保留中国地理叙事的视觉冲击力。

3. **为何 Pre-Frail 段采用渐进色而非告警红？**
   - Pre-Frail 是**可逆窗口**（reversible），用"中性提示"色而非"警告"色，符合 Few 的 *Information Dashboard* 设计原则。

4. **Sankey 选择 left-align 节点而非自由 layered**：
   - 4 波 × 3 类强行为时间序列，左对齐保证"从左到右=时间向前"的语义直觉。

---

## 7 · AI 使用声明

| 工具                       | 角色                                                                 |
|----------------------------|----------------------------------------------------------------------|
| Claude / GPT (Cursor IDE)  | D3 / ECharts 组件初版骨架；CSS Grid 排版；JSON 数据结构设计辅助。     |
| GitHub Copilot             | 行内代码补全（变量命名、循环结构）。                                  |
| ChatGPT                    | 文档润色、英文术语校对。                                              |

### 团队自行决策
- **核心叙事三轴（空间—身体—时间）的视图组合**
- **跨视图联动逻辑**（`state` 单一仓库 + `subscribe` 增量重绘）
- **PSU → 区域映射策略**（通过 `mc_*.csv` 推断并人工抽样校验）
- **黄色调色板的色阶分配**与**Frailty 三态语义映射**
- **人体五域映射方案**（head=认知/抑郁，chest=心肺，abdomen=代谢，limbs=ADL/IADL/物理，whole=FI）
- **分析任务定义 T1–T6**

### AI 辅助产出后经团队审查
- ECharts 配置 (`visualMap`, `coordinateSystem: 'geo'`) 的官方参数对齐；
- D3 ridgeline area path 数学推导；
- 数据预处理脚本中的统计计算（IQR、quantile 索引）。

### AI 未参与
- 数据所有权与许可声明；
- 课程评分相关的提交决策；
- 数据预处理对原始 CSV 字段语义的解释（来源：CHARLS user manual + 团队领域知识）。

---

## 8 · 数据来源与许可

- **数据集**：CHARLS — China Health and Retirement Longitudinal Study
- **主办单位**：北京大学国家发展研究院
- **许可**：学术研究免费授权（需在 [charls.pku.edu.cn](https://charls.pku.edu.cn) 注册申请）
- **波次**：Wave 1 (2011) / Wave 2 (2013) / Wave 3 (2015) / Wave 4 (2018)
- **预处理后样本规模**：
  - 累计样本人次 119,940 (4 波合计)
  - 追踪队列 25,586 人 × 4 波 (ID 完全一致)
  - 2018 年有效 FI 评估 19,803 人

中国 GeoJSON 来自 [DataV.GeoAtlas](https://datav.aliyun.com/portal/school/atlas/area_selector)（公共服务）。

---

## 9 · 团队分工

| 成员    | 主要负责                                                                  |
|---------|---------------------------------------------------------------------------|
| 成员 A  | 数据预处理流水线 (`scripts/preprocess.py`)、JSON Schema、区域映射推断。   |
| 成员 B  | Page A：地图、KPI、人体隐喻图、ADL/IADL 视图、Classic Symptoms。          |
| 成员 C  | Page B（底部 panel）：桑基、箱线小倍数、脊线、Factors；全局状态与文档。  |

答辩主讲：A 讲数据与衰弱指标；B 讲空间-身体叙事；C 讲时间轨迹与协调联动。

---

## 10 · 已知限制 / 未来工作

- PSU → 行政省的精确映射受限于 CHARLS 数据匿名化设计，目前采用区域 4 分级近似。
- 因数据未提供精确出生年，Age Cohort 视图用 FI 严重度分箱作为代理。
- Brushing & Linking 在桑基与平行坐标之间是单向（桑基 → 其它视图），未来可双向。

---

## 11 · 参考文献

完整参考列表见 `design_report.md` §9。核心理论支持：

- Shneiderman B. *The eyes have it* (1996)
- Munzner T. *Visualization Analysis and Design* (2014)
- Mackinlay J. *Automating the design of graphical presentations* (1986)
- Tufte E. *The Visual Display of Quantitative Information* (1983)
- Rockwood K. & Mitnitski A. *Frailty in relation to deficit accumulation* (2007)
