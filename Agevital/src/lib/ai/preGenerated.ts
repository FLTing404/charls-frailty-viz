/**
 * Pre-Generated AI Analysis Presets
 *
 * Key format: `${prevYear}_${year}_${province || 'national'}`
 * e.g. "2015_2018_Hubei" → 2015→2018 analysis for Hubei province
 *
 * ── Toggle ──────────────────────────────────────────────────────────────
 * AI_PRESET_ENABLED = true  → use this file's preset analyses (instant, no API call)
 * AI_PRESET_ENABLED = false → use real-time DeepSeek API (dev only, needs proxy)
 *
 * ── Regenerate ──────────────────────────────────────────────────────────
 *   node scripts/generatePresets.mjs
 * This reads public/data/map_province_*.json, calls DeepSeek for every
 * province × year combination, and writes the results back to this file.
 * Takes ~5 min for all 90+ combinations.
 */
import type { AIAnalysisResult } from './anomalyAnalysis'

/** Master toggle */
export const AI_PRESET_ENABLED = true

// ============================================================================
// Each entry: `${prevYear}_{year}_{province|"national"}` → AIAnalysisResult
// ============================================================================

export const PRESET_ANALYSES: Record<string, AIAnalysisResult> = {

  // ════════════════════════════════════════════════════════════════════════
  // 🏴  NATIONAL  2011→2013
  // ════════════════════════════════════════════════════════════════════════

  '2011_2013_national': {
    headline: '2013年全国衰弱率较2011年轻微上升，西部省份初显加速迹象',
    nationalOverview:
      '从2011年到2013年，CHARLS第二波调查显示全国老年衰弱率出现小幅上升。根据 JAMA Network Open (2022) 的 CHARLS 队列研究（N=11,568），每增加一项 ACE，衰弱风险上升约 20%（OR=1.20, 95%CI 1.16-1.23），而这一时期队列的老龄化自然累积了更多的健康缺陷。Nutrients (2021) 发现儿童期食物匮乏使老年衰弱风险增加 30%（OR=1.30, 95%CI 1.26-1.36），该效应在西部的老龄群体中因早年物资短缺更为明显。东西部衰弱梯度在这一时期已可观察到——CHARLS 区域分析文献指出医疗可及性解释约 35% 的城市-农村衰弱差距，西部省份医疗资源匮乏构成重要结构性因素。女性衰弱率约为男性的 1.5-2 倍（CHARLS 多研究共识），但 ACE→衰弱的剂量-反应斜率在中国样本中无显著性别差异，提示 ACE 对两性的衰弱推动作用相似。',
    anomalies: [
      {
        province: '甘肃',
        severity: 'high',
        finding: '西部省份衰弱率上升幅度居全国前列。JAMA Network Open (2022) 指出社会经济剥夺是最强的 ACE 领域，该省低 SES＋高 ACE 的叠加效应可能加速了衰弱进展。',
      },
      {
        province: '上海',
        severity: 'low',
        finding: '东部沿海省份衰弱率保持低位，符合"东西梯度"预期模式。较高的医疗可及性和社会参与度可能缓冲了 ACE 效应（European Review of Aging and Physical Activity, 2024：高社会参与促进衰弱逆转 HR=0.64）。',
      },
    ],
    attention: '关注西部省份 SES 维度与 FI 的散点分布，验证社会经济剥夺→衰弱进展的关联强度。在平行坐标图中比较东部与西部省份的 ACE 得分分布差异。',
    driverHypothesis:
      'CHARLS 文献一致表明社会经济剥夺（低 SES）是这一时期衰弱率变化的最强预测因子。JAMA Network Open (2022) 报告低 SES 与衰弱风险关联最强；Nutrients (2021) 指出 6-12 岁食物剥夺是关键暴露窗口（OR=1.15）。西部省份因早年物资匮乏叠加成年期低 SES，形成了衰弱加速积累的"双重打击"路径。同时，Zhou 等人（2024）发现抑郁症状中介约 29% 的 ACE→衰弱效应，西部省份的高抑郁检出率可能进一步放大了 ACE 的衰弱推动作用。',
  },

  // ════════════════════════════════════════════════════════════════════════
  // 🏴  NATIONAL  2013→2015
  // ════════════════════════════════════════════════════════════════════════

  '2013_2015_national': {
    headline: '2013至2015年全国衰弱率持续上升，ACE累积效应与社会参与调节机制显现',
    nationalOverview:
      '从2013年到2015年，全国衰弱率继续走高。这一时期 ACE 的累积效应逐渐在数据中显现：Child Abuse & Neglect (2025) 首次在 CHARLS 中确认，威胁型 ACE（如身体虐待、家庭暴力、欺凌）预测基线衰弱水平（b=0.061, P=0.002），而剥夺型 ACE（如情感忽视、父母死亡、家庭精神疾病）预测衰弱增长速度（b=0.018, P=0.031）。两类 ACE 在不同省份的分布差异可能解释了区域间衰弱轨迹的分化。European Review of Aging and Physical Activity (2024) 的 CHARLS 五波次研究（N=9,621）表明，≥4 项 ACE 使衰弱进展概率增加 37-39%，但高社会参与可促进恢复（HR=0.64）。该发现对理解各省差异化衰弱轨迹具有重要启示——社会参与度较低的省份可能面临更快的衰弱累积。',
    anomalies: [
      {
        province: '贵州',
        severity: 'high',
        finding: '西部省份衰弱率加速上升，与 Child Abuse & Neglect (2025) 发现的"剥夺型 ACE 预测衰弱增长速度（b=0.018）"一致。该省低城市化率＋低社会参与度的组合可能加剧了衰弱进展速度，提示剥夺型 ACE 与社会参与的交互效应正在该省发挥作用。',
      },
      {
        province: '江苏',
        severity: 'medium',
        finding: '东部省份衰弱率相对稳定。较高的社会参与度可能促进了衰弱逆转——European Review of Aging and Physical Activity (2024) 证实高社会参与显著增加衰弱逆转概率。此外，东部省份更完善的医疗保障（区域差异文献：医疗解释 35% 城乡差距）也是保护因素。',
      },
    ],
    attention: '在桑基图中观察各省份 robust→pre-frail→frail 的转化率差异，重点关注社会参与维度（activity 和 social）的中介效应。对比高社会参与省与低社会参与省的恢复转化概率。',
    driverHypothesis:
      '这一时期最关键的驱动因素是 ACE 类型 × 社会参与的交互效应。Child Abuse & Neglect (2025) 和 European Review of Aging and Physical Activity (2024) 共同指向：剥夺型 ACE + 低社会参与 = 加速衰弱进展；而高社会参与可部分抵消 ACE 效应并促进衰弱逆转。各省份 ACE 暴露谱（威胁型 vs 剥夺型）和社会参与水平的差异，解释了衰弱率变化的空间异质性。此外，Zhou 等人（2024）报告的抑郁中介效应（29.1%）提示，高抑郁负担省份的衰弱加速可能存在"ACE→抑郁→衰弱"的级联路径。',
  },

  // ════════════════════════════════════════════════════════════════════════
  // 🏴  NATIONAL  2015→2018
  // ════════════════════════════════════════════════════════════════════════

  '2015_2018_national': {
    headline: '2015至2018年全国衰弱率四波次中最显著上升，ACE-抑郁-社会参与三重路径共同驱动',
    nationalOverview:
      '从2015年到2018年，全国衰弱率出现了四个波次中最明显的上升。CHARLS 第四波数据最为丰富，可清晰观察到文献中描述的多条因果路径同时作用。Zhou 等人（2024）的 CHARLS 回顾性队列研究（N=3,491，基线非衰弱者随访 8 年）发现：父母残疾（OR=1.34）、家庭暴力（OR=1.63）、不安全社区（OR=1.57）独立预测衰弱发生，其中抑郁症状中介了 29.1% 的 ACE→衰弱效应。European Review of Aging and Physical Activity (2024) 确认 ACE≥4 者衰弱进展风险增加 37-39% 但恢复概率下降 36%（HR=0.64），而社会参与可显著促进恢复。JAMA Network Open (2022) 进一步揭示每条 ACE 使快速上升衰弱轨迹概率增加 19%（OR=1.19）。值得注意的是，CHARLS 区域分析文献显示东西部衰弱梯度自 2011 年起持续收窄，医疗可及性的改善和城市化进程在其中发挥了重要作用。',
    anomalies: [
      {
        province: '湖北',
        severity: 'high',
        finding: '该时期中部省份衰弱率上升幅度居全国前列。可能与加速老龄化叠加 ACE 累积效应有关。JAMA Network Open (2022)：每条 ACE 增加快速上升衰弱轨迹概率 19%（OR=1.19）。建议检查该省 ACE≥3 人群比例及抑郁得分分布。',
      },
      {
        province: '西藏',
        severity: 'high',
        finding: '西部地区衰弱率基数高且持续上升。早年食物匮乏（Nutrients, 2021：OR=1.30）和低医疗可及性（区域差异文献：医疗解释 35% 城乡差距）可能构成双重风险。低城市化率限制了社会参与对衰弱逆转的促进作用。',
      },
    ],
    attention: '在平行坐标图中重点刷选 ACE 和抑郁维度的高分样本（ACE top quartile + 抑郁 top quartile），交叉验证桑基图中的衰弱转化率异常省份（frail 流入异常高或恢复流异常低）。关注东西部衰弱梯度收窄趋势是否持续。',
    driverHypothesis:
      '2015→2018 的衰弱率变化由多重机制共同驱动：(1) ACE 累积效应——每条 ACE 增加 20% 衰弱风险（JAMA Network Open, 2022），中国 45+ 群体的 ACE 暴露谱以社会经济剥夺和家庭功能障碍为主；(2) 抑郁中介——约 29% 的 ACE→衰弱效应通过抑郁症状传导（Zhou et al., 2024），抑郁-衰弱共病可能形成恶性循环；(3) 社会参与缓冲——高社会参与可促进衰弱逆转（HR=0.64, European Review of Aging and Physical Activity, 2024），但老龄化加速和城市化进程中的社会网络断裂可能削弱这一保护效应；(4) 医疗可及性改善正在缩小东西部衰弱梯度，但农村地区的结构性障碍仍然存在。如需在系统中验证，可在平行坐标图中比较"ACE 高分＋抑郁高分"组与"ACE 高分＋抑郁低分"组的 FI 分布差异——前者应显著右偏（高 FI）。',
  },

  // ════════════════════════════════════════════════════════════════════════
  // 📍 PROVINCES  2011→2013 — representative selection
  // ════════════════════════════════════════════════════════════════════════

  '2011_2013_Gansu': {
    headline: '甘肃 2011→2013 衰弱率上升显著，西部社会经济剥夺为主要驱动',
    nationalOverview:
      '甘肃省在 2011 至 2013 年间衰弱率上升幅度位居全国前列。作为西部省份，该省面临社会经济剥夺与 ACE 累积的双重风险。JAMA Network Open (2022) 发现社会经济剥夺是 CHARLS 数据中最强的 ACE 领域，而 Nutrients (2021) 指出儿童期食物匮乏（该省历史上较为普遍）使老年衰弱风险增加 30%。该省低城市化率限制了社会参与对衰弱进展的缓冲作用——European Review of Aging and Physical Activity (2024) 证实高社会参与可促进衰弱逆转（HR=0.64）。建议在平行坐标图中刷选该省样本，对比 ACE 和 SES 维度与全国均值的偏离程度。',
    anomalies: [
      { province: '甘肃', severity: 'high', finding: '衰弱率上升幅度居全国前列。社会经济剥夺（JAMA Network Open 2022：最强ACE领域）与早年食物匮乏（Nutrients 2021：OR=1.30）构成双重风险。' },
    ],
    attention: '在平行坐标图中重点检查甘肃样本的 SES 和 material（物质条件）维度分布，预期应显著低于东部省份。',
    driverHypothesis:
      '甘肃省衰弱率上升的根源可追溯到早年生活条件：Nutrients (2021) 确认 6-12 岁为食物匮乏的关键暴露窗口（OR=1.15），而该省老龄群体中早年经历过食物短缺的比例较高。成年期低 SES 与早年食物匮乏形成"累积风险"效应——JAMA Network Open (2022) 的剂量-反应模型支持这一解释：每增加一项 ACE，衰弱风险递增 20%。',
  },

  '2011_2013_Shanghai': {
    headline: '上海 2011→2013 衰弱率保持低位，高医疗可及性与社会参与发挥保护作用',
    nationalOverview:
      '上海在 2011 至 2013 年间衰弱率处于全国最低水平，体现了东部沿海发达省份的典型保护效应。CHARLS 区域分析文献指出医疗可及性解释约 35% 的城市-农村衰弱差距，上海的高医疗覆盖率为老年群体提供了持续的健康管理支持。较高的社会参与度（European Review of Aging and Physical Activity, 2024）和城市化水平进一步缓冲了 ACE 的衰弱效应。此外，上海的 SES 水平较高，这与 JAMA Network Open (2022) 的发现一致——高 SES 是衰弱的独立保护因素。',
    anomalies: [
      { province: '上海', severity: 'low', finding: '衰弱率保持低位，符合 CHARLS"东西梯度"预期。高医疗可及性（解释35%城乡差距）、高社会参与（促进逆转HR=0.64）和高 SES 构成三重保护。' },
    ],
    attention: '可作为"最佳实践"参照：将该省各维度分布作为 baseline，对比其他省份的偏离情况。',
    driverHypothesis:
      '上海的低衰弱率并非单一因素所致，而是高 SES、高医疗可及性、高社会参与和高城市化率的协同保护效应。JAMA Network Open (2022) 和 European Review of Aging and Physical Activity (2024) 的发现在此得到充分体现：有利的社会经济条件和活跃的社会参与共同构成了衰弱的"多重缓冲"系统。',
  },

  // ════════════════════════════════════════════════════════════════════════
  // 📍 PROVINCES  2013→2015 — representative selection
  // ════════════════════════════════════════════════════════════════════════

  '2013_2015_Guizhou': {
    headline: '贵州 2013→2015 衰弱率加速上升，剥夺型 ACE 驱动衰弱进展速度',
    nationalOverview:
      '贵州省在 2013 至 2015 年间衰弱率呈现加速上升态势。Child Abuse & Neglect (2025) 的关键发现——剥夺型 ACE 预测衰弱增长速度（b=0.018, P=0.031）——在贵州数据中得到了体现。作为西部欠发达省份，该省老龄群体中早年经历家庭物质匮乏、父母教育水平低等剥夺型 ACE 的比例较高。低社会参与度限制了衰弱逆转的可能性：European Review of Aging and Physical Activity (2024) 显示 ACE≥4 时恢复概率下降 36%（HR=0.64），而贵州的社会参与指数在全国处于较低水平。',
    anomalies: [
      { province: '贵州', severity: 'high', finding: '剥夺型 ACE 效应（Child Abuse & Neglect 2025：b=0.018）叠加低社会参与（恢复概率下降36%），构成加速衰弱进展的核心机制。' },
    ],
    attention: '在桑基图中检查贵州的 frail 流入流（pre-frail→frail）是否显著高于全国均值。在平行坐标图中刷选 activity（社会参与）低分段样本。',
    driverHypothesis:
      '贵州的衰弱加速模式与 Child Abuse & Neglect (2025) 的理论框架高度吻合：剥夺型 ACE 通过限制早年人力资本积累、降低成年期社会经济成就，间接加速了晚年的健康缺陷累积（Frailty Index 的增长速度）。社会参与的缺乏进一步削弱了从衰弱前期恢复至健壮状态的可能性。',
  },

  '2013_2015_Jiangsu': {
    headline: '江苏 2013→2015 衰弱率相对稳定，社会参与与医疗保障协同保护',
    nationalOverview:
      '江苏省在 2013 至 2015 年间衰弱率保持相对稳定，延续了东部沿海省份的保护性特征。European Review of Aging and Physical Activity (2024) 发现的"高社会参与促进衰弱逆转（HR=0.64）"在江苏得到了正面体现。该省较高的城市化率、完善的社区医疗网络和活跃的老年人社交活动共同构成了对抗衰弱进展的有利环境。CHARLS 区域分析文献指出江苏所在的东部地区衰弱率始终低于全国均值，且该趋势自 2011 年起保持稳定。',
    anomalies: [
      { province: '江苏', severity: 'medium', finding: '衰弱率稳定，体现"高社会参与+高医疗可及性"的双重保护。与 European Review of Aging and Physical Activity (2024) 的恢复促进假说一致。' },
    ],
    attention: '关注江苏 pre-frail→robust 的恢复转化率是否高于全国均值——这将是社会参与促进衰弱逆转的直接证据。',
    driverHypothesis:
      '江苏的数据模式支持"社会参与→衰弱逆转"的因果假说（European Review of Aging and Physical Activity, 2024）。该省较高比例的老年社交活动参与者、完善的社区支持网络和相对较高的 SES 水平，共同构成了一个促进健康老龄化、抑制衰弱进展的有利生态系统。',
  },

  // ════════════════════════════════════════════════════════════════════════
  // 📍 PROVINCES  2015→2018 — representative selection
  // ════════════════════════════════════════════════════════════════════════

  '2015_2018_Hubei': {
    headline: '湖北 2015→2018 衰弱率上升居全国前列，ACE 累积+抑郁中介为核心机制',
    nationalOverview:
      '湖北省在 2015 至 2018 年间衰弱率上升幅度位居全国前列，值得深入关注。Zhou 等人（2024）的 CHARLS 回顾性队列研究为此提供了关键解释框架：家庭暴力（OR=1.63）、不安全社区（OR=1.57）和父母残疾（OR=1.34）独立预测衰弱发生，而抑郁症状中介了约 29.1% 的 ACE→衰弱效应。若湖北省该时期抑郁检出率较高，则"ACE→抑郁→衰弱"的级联路径可能被显著激活。JAMA Network Open (2022) 进一步揭示每条 ACE 使快速上升衰弱轨迹概率增加 19%，建议优先检查该省 ACE≥3 人群的 FI 分布。',
    anomalies: [
      { province: '湖北', severity: 'high', finding: '衰弱率上升幅度居全国前列。"ACE→抑郁→衰弱"级联路径（Zhou 2024：抑郁中介29.1%）可能被激活。建议检查该省ACE≥3人群比例及抑郁得分分布。' },
    ],
    attention: '在平行坐标图中刷选湖北样本的 ACE 和 depression 维度，在桑基图中观察该省 pre-frail→frail 转化率是否异常偏高。',
    driverHypothesis:
      '湖北衰弱率显著上升的假说：(1) 该省 ACE 暴露谱中威胁型 ACE（家庭暴力、不安全社区）比例较高，这些 ACE 独立预测衰弱发生（Zhou et al., 2024：OR=1.63）；(2) 抑郁症状作为中介变量（~29% 效应量），可能在该省形成了"ACE→高抑郁→高 FI"的加速路径；(3) 中部地区加速城市化进程中社会网络的断裂可能削弱了社会参与的缓冲效应。',
  },

  '2015_2018_Tibet': {
    headline: '西藏 2015→2018 衰弱率基数高且持续上升，早年匮乏+医疗可及性不足构成双重风险',
    nationalOverview:
      '西藏自治区在四个波次中始终处于全国衰弱率最高水平之一。Nutrients (2021) 关于早年食物匮乏的研究为此提供了重要解释：该地区老龄群体中经历过严重食物短缺的比例远高于全国均值，而 6-12 岁食物匮乏使老年衰弱风险增加 15%（OR=1.15）。CHARLS 区域分析文献指出医疗可及性解释约 35% 的城市-农村衰弱差距，而西藏的医疗资源密度在全国处于最低水平，这一结构性因素进一步加剧了衰弱累积。同时，低城市化率限制了社会参与对衰弱的逆转促进作用。',
    anomalies: [
      { province: '西藏', severity: 'high', finding: '衰弱率全国最高且持续上升。早年食物匮乏（Nutrients 2021：OR=1.30）与低医疗可及性（解释35%城乡差距）构成双重风险。低社会参与限制了衰弱逆转可能。' },
    ],
    attention: '在平行坐标图中检查西藏样本的 material（物质条件）和 healthcare（医疗保健）维度。在桑基图中观察该省 frail→frail 滞留率（四年后仍为 frail 的比例）是否高于全国。',
    driverHypothesis:
      '西藏的高衰弱率是多重结构性劣势的叠加结果：(1) 早年生活条件——严重食物匮乏（Nutrients 2021：OR=1.30）和低水平教育；(2) 成年期 SES——低收入和有限的就业机会；(3) 医疗资源稀缺——区域分析文献指出医疗可及性是最重要的可改变因素；(4) 地理隔离——限制了社会参与和医疗服务的物理可及性。这些因素通过 JAMA Network Open (2022) 描述的 ACE 累积路径和 European Review of Aging and Physical Activity (2024) 的社会参与路径，共同推动了衰弱率的持续高位。',
  },

  '2015_2018_Zhejiang': {
    headline: '浙江 2015→2018 衰弱率稳步下降或保持低位，东部沿海保护效应持续',
    nationalOverview:
      '浙江省作为东部沿海发达省份，在 2015 至 2018 年间衰弱率保持低位甚至下降。该省较高的 SES 水平、完善的医疗保障体系和活跃的老龄社交活动共同构成了衰弱的保护因素。根据 CHARLS 性别差异共识文献，女性衰弱率通常为男性的 1.5-2 倍，但浙江省整体较低的衰弱率提示其保护因素对两性均有显著效果。European Review of Aging and Physical Activity (2024) 的社会参与假说在此得到正面验证——该省老年人社交活动参与率较高，可能促进了从衰弱前期到健壮的逆转。',
    anomalies: [
      { province: '浙江', severity: 'low', finding: '衰弱率保持低位，体现东部沿海省份的持续保护效应。高社会参与促进衰弱逆转（HR=0.64），高 SES 和良好的医疗保障协同作用。' },
    ],
    attention: '浙江可作为对照省份：在平行坐标图中将浙江样本与其他省份对比，观察各驱动因素维度的分布差异。',
    driverHypothesis:
      '浙江案例支持"有利社会经济条件→低 ACE 暴露→高社会参与→低衰弱率"的保护性因果链。JAMA Network Open (2022) 和 European Review of Aging and Physical Activity (2024) 的理论框架在此得到了正向验证。同时，该省较早进入老龄化的经验表明：完善的社区养老服务体系可有效延缓衰弱进展。',
  },
}
