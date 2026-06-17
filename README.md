# AgeVital

**中国中老年人衰弱状态及驱动因素可视化分析**

浙江大学 · 数据可视化导论 · CHARLS 2011–2018

---

## 快速上手

### 前置要求

| 工具 | 版本 |
|------|------|
| Node.js | ≥ 18 |
| Python | ≥ 3.10 |
| pip 包 | pandas · numpy · scipy · pyreadstat |

```bash
pip install pandas numpy scipy pyreadstat
```

---

### 第一步：准备原始数据

<<<<<<< HEAD
原始 CHARLS 数据需从 [charls.pku.edu.cn](https://charls.pku.edu.cn) 申请获取，放置在以下目录（相对于项目根目录）：

```
data/
├── charls_ace/
│   └── charls_ace_after_pca.csv       ← 童年逆境指数（已预处理）
=======
原始 CHARLS 数据需从 [charls.pku.edu.cn](https://charls.pku.edu.cn) 申请获取，放置在以下目录（相对于项目根目录 `Agevital/`）：

```
data/
├── charls/
│   ├── 2011/
│   │   └── PSU.dta                      ← 社区-省份编码映射（必需）
│   └── Demographic_Backgrounds.dta      ← 性别信息（必需）
>>>>>>> bb84fb01edd0f3ca75cc927cd56c61580105766c
├── charls_frailty/
│   ├── charls_frailty_2011.csv
│   ├── charls_frailty_2013.csv
│   ├── charls_frailty_2015.csv
│   └── charls_frailty_2018.csv
├── charls_socialeconomic_status/
│   ├── ses_2011.csv  ses_2013.csv  ses_2015.csv  ses_2018.csv
├── charls_sleep_by_wave/
│   ├── sleep_2011_all_variables.csv  ...（四波次）
<<<<<<< HEAD
└── charls_social_participation_by_wave/
    ├── socc_2011.csv  socc_2013.csv  socc_2015.csv  socc_2018.csv
=======
├── charls_social_participation_by_wave/
│   ├── socc_2011.csv  socc_2013.csv  socc_2015.csv  socc_2018.csv
└── data_json/
    └── charls_ace/
        └── charls_ace_after_pca.json    ← 童年逆境指数（已预处理）
>>>>>>> bb84fb01edd0f3ca75cc927cd56c61580105766c
```

> 请勿将含个人标识的原始数据提交至公开仓库。

---

### 第二步：生成可视化数据

<<<<<<< HEAD
在项目根目录运行：
=======
在项目根目录 `Agevital/` 运行：
>>>>>>> bb84fb01edd0f3ca75cc927cd56c61580105766c

```bash
python scripts/generate_viz_data.py
```

<<<<<<< HEAD
脚本输出 44 个 JSON 文件到 `Agevital/public/data/`，每个调查波次（2011/2013/2015/2018）11 个：
=======
脚本输出 32 个 JSON 文件到 `viz-app/public/data/`，每个调查波次（2011/2013/2015/2018）8 个：
>>>>>>> bb84fb01edd0f3ca75cc927cd56c61580105766c

| 文件 | 内容 |
|------|------|
| `map_province_{year}.json` | 28 省份衰弱率、衰弱前期率、样本量、男性比、城镇比 |
<<<<<<< HEAD
| `map_city_{year}.json` | 城市级衰弱率统计（含 GPS 坐标，用于气泡定位） |
| `deficit_network_{year}.json` | 26 项缺陷共病力导向图（节点 + 边） |
| `deficit_province_{year}.json` | 各省各缺陷患病率 |
| `deficit_city_{year}.json` | 各城市各缺陷患病率（含 GPS 坐标，用于地图气泡叠加） |
| `driver_records_{year}.json` | 个体级五维驱动因素记录（含省份 + 城市字段） |
=======
| `deficit_network_{year}.json` | 26 项缺陷共病力导向图（节点 + 边） |
| `driver_records_{year}.json` | 个体级五维驱动因素记录（含省份字段） |
>>>>>>> bb84fb01edd0f3ca75cc927cd56c61580105766c
| `correlation_matrix_{year}.json` | ACE / 睡眠 / 社会联系 / 抑郁 / FI 的 Spearman ρ 矩阵 |
| `driver_chord_{year}.json` | 驱动因素关联强度（和弦图格式） |
| `driver_sankey_{year}.json` | ACE 分组 → 衰弱状态流向（桑基格式） |
| `factor_matrix_{year}.json` | 各因素与 FI 的 Spearman ρ |
| `kpi_{year}.json` | 全国整体衰弱率、样本量等摘要指标 |

---

### 第三步：放置地图 GeoJSON

<<<<<<< HEAD
地图需要两个文件，手动放到 `Agevital/public/geo/`：

```bash
mkdir -p Agevital/public/geo

# 中国省级行政区划
curl -L -o Agevital/public/geo/china-provinces.json \
  "https://raw.githubusercontent.com/apache/echarts/master/test/data/map/json/china.json"

# 世界地图（背景底图）
curl -L -o Agevital/public/geo/world.json \
=======
地图需要两个文件，手动放到 `viz-app/public/geo/`：

```bash
mkdir -p viz-app/public/geo

# 中国省级行政区划
curl -L -o viz-app/public/geo/china-provinces.json \
  "https://raw.githubusercontent.com/apache/echarts/master/test/data/map/json/china.json"

# 世界地图（背景底图）
curl -L -o viz-app/public/geo/world.json \
>>>>>>> bb84fb01edd0f3ca75cc927cd56c61580105766c
  "https://raw.githubusercontent.com/apache/echarts/master/test/data/map/json/world.json"
```

如网络受限，从 [ECharts 地图下载页](https://echarts.apache.org/zh/download-map.html) 手动下载后重命名放入即可。

放置完成后确认可访问：`http://localhost:5173/geo/china-provinces.json`

---

### 第四步：安装前端依赖并启动

```bash
<<<<<<< HEAD
cd Agevital
=======
cd viz-app
>>>>>>> bb84fb01edd0f3ca75cc927cd56c61580105766c
npm install
npm run dev
```

浏览器打开：

<<<<<<< HEAD
- **快照页（空间分布）**：http://localhost:5173/snapshot
- **轨迹页（多维分析）**：http://localhost:5173/trajectories

首页自动重定向到 `/trajectories`。

=======
- **第一页（空间分布）**：http://localhost:5173/snapshot
- **第二页（多维分析）**：http://localhost:5173/trajectories

>>>>>>> bb84fb01edd0f3ca75cc927cd56c61580105766c
---

### 生产构建

```bash
<<<<<<< HEAD
cd Agevital
=======
cd viz-app
>>>>>>> bb84fb01edd0f3ca75cc927cd56c61580105766c
npm run build    # 类型检查 + 打包到 dist/
npm run preview  # 本地预览构建产物
```

---

## 页面说明

<<<<<<< HEAD
### 快照页 `/snapshot` — 衰弱空间分布

| 区域 | 功能 |
|------|------|
| **中国 choropleth 地图** | 颜色深浅反映各省衰弱率；悬停显示省份名、衰弱率、FI 值；**点击省份 → 跳转轨迹页并自动筛选** |
| **共病力导向图（右侧浮层）** | 26 项衰弱缺陷构成的共病网络；节点大小 = 患病率，边粗细 = 共现程度；**图例点击可筛选类别**（如只看慢性病）；**点击节点 → 地图叠加气泡** |
| **地图气泡叠加** | 点击共病节点后，地图上各**城市**出现气泡，气泡大小 = 该城市该缺陷的患病率；地图本身仍显示衰弱率不变 |
| **顶部年份选择器** | 切换 2011 / 2013 / 2015 / 2018，地图与力图同步更新 |

### 轨迹页 `/trajectories` — 多维驱动因素分析
=======
### 第一页 `/snapshot` — 衰弱空间分布

| 区域 | 功能 |
|------|------|
| **中国 choropleth 地图** | 颜色深浅反映各省衰弱率；悬停显示详细数据；**点击省份 → 跳转第二页并自动筛选** |
| **缺陷力导向图（右侧浮层）** | 26 项衰弱缺陷构成的共病网络；节点大小 = 患病率，边粗细 = 共现程度 |
| **顶部年份选择器** | 切换 2011 / 2013 / 2015 / 2018，地图与力图同步更新 |

### 第二页 `/trajectories` — 多维驱动因素分析
>>>>>>> bb84fb01edd0f3ca75cc927cd56c61580105766c

| 区域 | 功能 |
|------|------|
| **左侧 省份地图** | 点击省份设置筛选范围；悬停 tooltip 显示衰弱率 / 样本量 / 男女比 / 城乡比 |
| **左侧 统计卡** | 实时显示当前范围（全国或选定省份）的五项摘要指标 |
| **右上 相关性热力图** | 点击方格设置聚焦变量，平行坐标图对应轴高亮 |
| **右上 平行坐标图** | 个体级五维轨迹；在轴上拖拽框选子群，刷选结果传递到下方图表 |
| **右下 Panel B1** | **[桑基图]** ACE 分组 → 衰弱状态流向 ｜ **[散点/气泡]** 抑郁×ACE，气泡=FI 衰弱指数 |
| **右下 Panel B2** | **[旭日图]** 衰弱状态 → 性别 → 城乡三层构成 ｜ **[和弦图]** 五项驱动因素间关联强度 |

**跨页面联动：**

```
<<<<<<< HEAD
快照页 点击省份
  → 设置全局 province 筛选
  → 跳转 /trajectories?province=Sichuan
  → 轨迹页读取 URL 参数，所有图表自动过滤该省数据
=======
第一页 点击省份
  → 设置全局 province 筛选
  → 跳转 /trajectories?province=Sichuan
  → 第二页读取 URL 参数，所有图表自动过滤该省数据
>>>>>>> bb84fb01edd0f3ca75cc927cd56c61580105766c
  → 左侧地图高亮选中省份，顶部显示范围 badge
  → 点击 badge 上的 × 清除筛选，恢复全国视图
```

---

## 项目结构

```
<<<<<<< HEAD
.
├── data/                              # 原始 CHARLS 数据（需自行获取）
├── scripts/
│   └── generate_viz_data.py           # 数据处理脚本 → Agevital/public/data/
└── Agevital/
    ├── public/
    │   ├── data/                      # 生成的可视化 JSON（44 个文件，含城市级数据）
    │   ├── geo/                       # 地图 GeoJSON（需手动放置）
    │   └── textures/                  # SVG 纹理（纸张、印章）
    └── src/
        ├── App.tsx                    # 路由入口（/ → /trajectories, /snapshot）
        ├── main.tsx                   # React 入口
        ├── pages/
        │   ├── SnapshotPage.tsx       # 快照页：地图 + 共病力图 + 气泡叠加
        │   └── TrajectoriesPage.tsx   # 轨迹页：多维分析
        ├── components/
        │   ├── charts/                # ECharts 封装（地图、力图、旭日图等）
        │   ├── layout/                # 布局组件（Header、PageShell）
        │   ├── snapshot/              # 快照页专用组件（SnapshotGeoStage）
        │   └── trajectories/          # 轨迹页专用组件（ProvinceMapPanel 等）
        ├── lib/
        │   ├── store/                 # Zustand 全局状态
        │   ├── data/                  # JSON 加载器
        │   ├── charts/                # ECharts option 构建函数
        │   ├── geo/                   # 省份名称映射 & GPS 坐标
        │   └── theme/                 # ink-wash 色彩系统
        └── types/
            └── data.d.ts              # 全部 TypeScript 类型定义
=======
Agevital/
├── data/                              # 原始 CHARLS 数据（需自行获取）
├── data_json/                         # 中间 JSON（原始数据转换版）
├── scripts/
│   └── generate_viz_data.py           # 数据处理脚本 → viz-app/public/data/
└── viz-app/
    ├── public/
    │   ├── data/                      # 生成的可视化 JSON（32 个文件）
    │   └── geo/                       # 地图 GeoJSON（需手动放置）
    └── src/
        ├── pages/
        │   ├── SnapshotPage.tsx       # 第一页：地图 + 力导向图
        │   └── TrajectoriesPage.tsx   # 第二页：多维分析
        ├── components/
        │   ├── charts/                # ECharts 封装（地图、力图、旭日图等）
        │   ├── snapshot/              # 第一页专用组件
        │   └── trajectories/          # 第二页专用组件（含 ProvinceMapPanel）
        └── lib/
            ├── store/                 # Zustand 全局状态（year / province / brushedIds）
            ├── data/                  # JSON 加载器 + driver records 解析
            ├── charts/                # ECharts option 构建函数
            └── theme/                 # ink-wash 色彩系统
>>>>>>> bb84fb01edd0f3ca75cc927cd56c61580105766c
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vite 5 + React 18 + TypeScript |
| 路由 | React Router v6 |
| 样式 | Tailwind CSS + shadcn/ui + ink-wash 主题 |
| 图表 | ECharts 5（地图 / 力导向 / 旭日 / 桑基 / 和弦 / 平行坐标） |
| 状态管理 | Zustand（province 省份筛选 + 平行坐标刷选 ID 同步） |
| 数据处理 | Python · pandas · scipy（Spearman ρ 计算）· pyreadstat（读取 .dta） |

---

## 常见问题

**地图空白 / 加载失败**
<<<<<<< HEAD
检查 `Agevital/public/geo/` 目录是否存在 `china-provinces.json` 和 `world.json`，可直接访问 `http://localhost:5173/geo/china-provinces.json` 验证。

**数据全部 404**
先运行 `python scripts/generate_viz_data.py`，确认 `Agevital/public/data/` 下有 44 个 `.json` 文件。
=======
检查 `viz-app/public/geo/` 目录是否存在 `china-provinces.json` 和 `world.json`，可直接访问 `http://localhost:5173/geo/china-provinces.json` 验证。

**数据全部 404**
先运行 `python scripts/generate_viz_data.py`，确认 `viz-app/public/data/` 下有 32 个 `.json` 文件。
>>>>>>> bb84fb01edd0f3ca75cc927cd56c61580105766c

**省份点击后第二页无数据**
检查 `driver_records_{year}.json` 的 `fields` 数组中是否包含 `"province"`。若无，重新运行数据脚本。

**Python 报 `No module named 'pyreadstat'`**
运行 `pip install pyreadstat`（用于读取 `.dta` 格式 Stata 文件）。

**Python 报 `No module named 'scipy'`**
运行 `pip install scipy`（用于 Spearman 相关系数计算）。

---

## 数据来源

CHARLS（中国健康与养老追踪调查）2011–2018，由北京大学国家发展研究院管理。  
申请地址：[charls.pku.edu.cn](https://charls.pku.edu.cn)

衰弱指数基于 26 项缺陷累积模型（Deficit Accumulation Frailty Index）。

> 本项目为课程作业，代码仅供学术参考，请勿将 CHARLS 原始微观数据公开分发。
