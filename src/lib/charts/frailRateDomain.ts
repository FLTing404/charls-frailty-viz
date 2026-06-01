/**
 * 2011–2018 四年省域衰弱率全局极值。
 * 地图 visualMap 固定使用此区间，保证切换年份时同色阶可比。
 * 重新跑 preprocess_charls.py 后会写入 public/data/map_frail_rate_domain.json 并应同步更新此处。
 */
export const FRAIL_RATE_COLOR_DOMAIN = {
  min: 0.0858,
  max: 0.4627,
} as const
