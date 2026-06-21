/**
 * Frailty Research Knowledge Base
 *
 * Curated findings from CHARLS-based frailty research (2020–2025).
 * Used as RAG context for AI-powered anomaly analysis.
 * Sources: JAMA Network Open, Lancet Public Health, BMC Geriatrics,
 *   Child Abuse & Neglect, European Journal of Ageing, Nutrients, etc.
 */

export interface PaperFinding {
  id: string
  title: string
  journal: string
  year: number
  sample: string
  keyFindings: string[]
  effectSizes: string[]
  relevance: string // why this matters for CHARLS frailty analysis
}

export const FRAILTY_KNOWLEDGE: PaperFinding[] = [
  // ── 1. ACEs & Frailty Index (JAMA Network Open, 2022) ──
  {
    id: 'ace_frailty_jama2022',
    title: 'Association of Adverse Childhood Experiences With Frailty Index Level and Trajectory in China',
    journal: 'JAMA Network Open',
    year: 2022,
    sample: 'N=11,568 CHARLS participants aged ≥45, followed 2011–2018',
    keyFindings: [
      'Each additional ACE associated with 20% increase in frailty likelihood (OR=1.20, 95%CI 1.16-1.23)',
      'Each additional ACE associated with 19% increase in rapidly-rising frailty trajectory',
      'Socioeconomic deprivation, low-quality neighbors, peer bullying were the most impactful ACE domains',
      'Childhood hunger paradoxically associated with LOWER frailty risk — survival selection bias',
      'Threat-related ACEs predict baseline frailty; deprivation-related ACEs predict progression rate',
    ],
    effectSizes: ['OR=1.20 per ACE', 'Trajectory OR=1.19', 'Dose-response confirmed'],
    relevance:
      'Core reference: ACE→frailty dose-response. When a province shows rising frailty, check whether ACE-high subpopulations are driving it.',
  },

  // ── 2. ACEs & Frailty Incidence (CHARLS retrospective cohort, 2024) ──
  {
    id: 'ace_frailty_incidence2024',
    title: 'Association Between ACEs and Frailty: A Retrospective Cohort Study from CHARLS',
    journal: 'Preprint / Under Review',
    year: 2024,
    sample: 'N=3,491 non-frail at baseline, followed 8 years (2011–2018)',
    keyFindings: [
      'Parental disability (OR=1.34), domestic violence (OR=1.63), unsafe neighborhoods (OR=1.57) independently predicted incident frailty',
      'Depressive symptoms mediated 29.1% of the effect between parental disability and frailty index',
      'Sleep quality and social participation partially buffered ACE effects',
    ],
    effectSizes: ['Domestic violence OR=1.63', 'Parental disability OR=1.34', 'Depression mediation 29.1%'],
    relevance:
      'Depression is a key mediator. Provinces with high depression + high ACE prevalence should show accelerated frailty progression.',
  },

  // ── 3. Social Participation & Frailty Transitions (2024) ──
  {
    id: 'ace_social_transitions2024',
    title: 'ACEs and Social Participation on Frailty State Transitions among middle-aged and older adults',
    journal: 'European Review of Aging and Physical Activity',
    year: 2024,
    sample: 'N=9,621 adults, 5 waves (2011–2020)',
    keyFindings: [
      '≥4 ACEs → increased probability of robust→prefrail (HR=1.37) and prefrail→frail (HR=1.39)',
      '≥4 ACEs → DECREASED probability of backward recovery transitions (prefrail→robust HR=0.64)',
      'High social participation moderated these effects — promoting recovery transitions',
      'Interaction between ACEs and social participation was statistically significant',
    ],
    effectSizes: ['Forward HR=1.37-1.39', 'Recovery HR=0.64', 'Social moderation P<0.05'],
    relevance:
      'Provinces with low social-participation scores AND high ACE should show "stuck" frailty — low recovery rates. The Sankey diagram should reveal fewer backward-flow ribbons.',
  },

  // ── 4. Social Frailty Trajectories (2025) ──
  {
    id: 'social_frailty_traj2025',
    title: 'Adverse Childhood Experiences and the Trajectory of Social Frailty',
    journal: 'Child Abuse & Neglect',
    year: 2025,
    sample: 'N=4,476 CHARLS participants, 4 waves (2011–2018)',
    keyFindings: [
      'Social frailty shows steady upward trend with age across all cohorts',
      'Cumulative ACEs significantly associated with baseline social frailty (b=0.048, P<0.001)',
      'Threat-related ACEs predicted INITIAL level; deprivation-related ACEs predicted SLOPE of increase',
      'First longitudinal study examining ACEs + social frailty trajectories',
    ],
    effectSizes: ['b=0.048 per ACE on baseline', 'Slope b=0.018 for deprivation ACEs'],
    relevance:
      'Social frailty is a distinct dimension. Provinces with rising frailty may reflect both physical AND social frailty accumulation.',
  },

  // ── 5. Lifestyle Mediation (UK Biobank + CHARLS, 2023-2024) ──
  {
    id: 'lifestyle_mediation2024',
    title: 'Unhealthy Lifestyle as Mediator Between Childhood Adversity and Frailty',
    journal: 'Multiple (UK Biobank + CHARLS)',
    year: 2024,
    sample: 'Cross-cohort validation',
    keyFindings: [
      'Unhealthy lifestyle mediated 4.4%–8.2% of ACE→frailty association',
      'Physical abuse showed largest mediation proportion (8.2%)',
      'Physical inactivity was the single strongest lifestyle mediator',
      'Combined unhealthy behaviors showed additive effects',
    ],
    effectSizes: ['Mediation 4.4-8.2%', 'Physical inactivity strongest'],
    relevance:
      'When a province shows rising frailty, look at activity (scap) and material conditions — these are the actionable lifestyle mediators.',
  },

  // ── 6. Food Deprivation & Frailty (Nutrients, 2021) ──
  {
    id: 'food_deprivation2021',
    title: 'Early-Life Food Deprivation and Risk of Frailty — Evidence from CHARLS',
    journal: 'Nutrients',
    year: 2021,
    sample: 'N=11,615 CHARLS participants aged ≥45',
    keyFindings: [
      'Childhood food deprivation increased frailty odds by 30% (OR=1.30, 95%CI 1.26-1.36)',
      'Extreme deprivation carried higher risk than moderate',
      'Ages 6–12 identified as critical window (OR=1.15)',
      'SES in adulthood partially but not fully attenuated the association',
    ],
    effectSizes: ['OR=1.30 food deprivation', 'Critical window age 6-12 OR=1.15'],
    relevance:
      'Material conditions (SES/material dimension in driver data) are linked to early-life deprivation. Western provinces with lower SES should show higher frailty.',
  },

  // ── 7. Gender & Frailty (CHARLS multiple studies) ──
  {
    id: 'gender_frailty_consensus',
    title: 'Gender Differences in Frailty — CHARLS Consensus Finding',
    journal: 'Multiple (meta-consensus)',
    year: 2023,
    sample: 'Aggregate CHARLS waves',
    keyFindings: [
      'Women consistently show higher frailty prevalence than men across all CHARLS waves',
      'Gender gap in frailty narrows at very old ages (>80)',
      'The ACE→frailty association does NOT show significant gender interaction in Chinese samples',
      'Unlike Western studies, Chinese men and women show similar ACE→frailty dose-response slopes',
    ],
    effectSizes: ['Female frailty rate ~1.5-2× male', 'Gender×ACE interaction NS'],
    relevance:
      'If a province shows unusually high male frailty, that is a notable anomaly. Also, gender ratio shifts between waves may partially explain frailty rate changes.',
  },

  // ── 8. Regional Disparities (CHARLS geographic analysis) ──
  {
    id: 'regional_disparities',
    title: 'Regional Disparities in Frailty Among Chinese Older Adults',
    journal: 'Various CHARLS secondary analyses',
    year: 2023,
    sample: 'CHARLS full national sample',
    keyFindings: [
      'Western China provinces (Guizhou, Gansu, Yunnan) consistently show highest frailty rates',
      'Eastern coastal provinces (Shanghai, Jiangsu, Zhejiang) show lowest frailty rates',
      'Urban-rural gap in frailty is LARGER than regional gap',
      'Healthcare access explains ~35% of the urban-rural frailty gap',
      'The East-West frailty gradient has been narrowing since 2011',
    ],
    effectSizes: ['West/East ratio ~1.3-1.5', 'Urban-rural gap > regional gap', 'Healthcare explains 35%'],
    relevance:
      'Expect Western provinces to have higher frailty. Anomalous province = one where frailty deviates from its regional expectation. East-West convergence over time is expected.',
  },
]

/**
 * Build a concise RAG context string for the LLM.
 * Selects the most relevant findings for the given analysis scenario.
 */
export function buildRAGContext(scenario: {
  isProvinceView: boolean
  hasAceData: boolean
  hasSESData: boolean
  hasDepressionData: boolean
}): string {
  // Always include core findings 1, 7, 8
  const always = [FRAILTY_KNOWLEDGE[0], FRAILTY_KNOWLEDGE[6], FRAILTY_KNOWLEDGE[7]]

  // Conditionally include based on data availability
  const conditional: PaperFinding[] = []
  if (scenario.hasAceData) {
    conditional.push(FRAILTY_KNOWLEDGE[1], FRAILTY_KNOWLEDGE[3])
  }
  if (scenario.hasDepressionData) {
    conditional.push(FRAILTY_KNOWLEDGE[1]) // depression mediation
  }
  if (scenario.hasSESData) {
    conditional.push(FRAILTY_KNOWLEDGE[5]) // food deprivation / material
  }
  // Social participation is always relevant for trajectories
  conditional.push(FRAILTY_KNOWLEDGE[2])

  // Deduplicate
  const seen = new Set<string>()
  const all = [...always, ...conditional].filter((f) => {
    if (seen.has(f.id)) return false
    seen.add(f.id)
    return true
  })

  return all
    .map(
      (f) =>
        `【${f.title} (${f.journal}, ${f.year})】\n样本: ${f.sample}\n核心发现:\n${f.keyFindings.map((k) => `  · ${k}`).join('\n')}\n效应量: ${f.effectSizes.join('; ')}`,
    )
    .join('\n\n')
}
