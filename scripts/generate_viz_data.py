#!/usr/bin/env python3
"""
Generate all viz data JSON files for the CHARLS frailty dashboard.
Province + City mapping via PSU.dta communityID lookup.
"""
import json
import math
import warnings
from pathlib import Path
from collections import defaultdict

import pandas as pd
import numpy as np
from scipy import stats as scipy_stats

warnings.filterwarnings('ignore')

BASE = Path(__file__).resolve().parent.parent
DATA = BASE / 'data'
DATA_JSON = BASE / 'data_json'
OUT = BASE / 'Agevital' / 'public' / 'data'
OUT.mkdir(parents=True, exist_ok=True)

# ── Province constants ────────────────────────────────────────────────────────

PROVINCE_NORM = {'Neimenggu': 'Inner Mongolia'}

PROVINCE_REGION = {
    'Beijing': 'East', 'Tianjin': 'East', 'Hebei': 'East',
    'Liaoning': 'East', 'Jilin': 'East', 'Heilongjiang': 'East',
    'Shanghai': 'East', 'Jiangsu': 'East', 'Zhejiang': 'East',
    'Fujian': 'East', 'Shandong': 'East', 'Guangdong': 'East', 'Hainan': 'East',
    'Shanxi': 'Central', 'Anhui': 'Central', 'Jiangxi': 'Central',
    'Henan': 'Central', 'Hubei': 'Central', 'Hunan': 'Central',
    'Inner Mongolia': 'West', 'Guangxi': 'West', 'Chongqing': 'West',
    'Sichuan': 'West', 'Guizhou': 'West', 'Yunnan': 'West', 'Tibet': 'West',
    'Shaanxi': 'West', 'Gansu': 'West', 'Qinghai': 'West',
    'Ningxia': 'West', 'Xinjiang': 'West',
}

PROVINCE_CODE = {
    'Beijing': '11', 'Tianjin': '12', 'Hebei': '13', 'Shanxi': '14',
    'Inner Mongolia': '15', 'Liaoning': '21', 'Jilin': '22', 'Heilongjiang': '23',
    'Shanghai': '31', 'Jiangsu': '32', 'Zhejiang': '33', 'Anhui': '34',
    'Fujian': '35', 'Jiangxi': '36', 'Shandong': '37', 'Henan': '41',
    'Hubei': '42', 'Hunan': '43', 'Guangdong': '44', 'Guangxi': '45',
    'Hainan': '46', 'Chongqing': '50', 'Sichuan': '51', 'Guizhou': '52',
    'Yunnan': '53', 'Tibet': '54', 'Shaanxi': '61', 'Gansu': '62',
    'Qinghai': '63', 'Ningxia': '64', 'Xinjiang': '65',
}

# ── City coordinates (lng, lat) for CHARLS PSU cities ──────────────────────────
CITY_COORDS = {
    'Akesu': (80.26, 41.17), 'Anqing': (117.05, 30.53), 'Anshan': (122.99, 41.11),
    'Anyang': (114.39, 36.10), 'Baoding': (115.47, 38.87), 'Baoji': (107.24, 34.36),
    'Baoshan': (99.18, 25.12), 'Beijing': (116.41, 39.90), 'Benxi': (123.77, 41.29),
    'Binzhou': (117.97, 37.38), 'Bozhou': (115.78, 33.84), 'Cangzhou': (116.84, 38.30),
    'Changde': (111.70, 29.03), 'Changsha': (112.94, 28.23), 'Chaohu': (117.87, 31.60),
    'Chaoyang': (120.45, 41.57), 'Chaozhou': (116.62, 23.66), 'Chengde': (117.96, 40.95),
    'Chengdu': (104.07, 30.57), 'Chifeng': (118.89, 42.26), 'Chongqing': (106.55, 29.57),
    'Chuxiong': (101.55, 25.04), 'Dalian': (121.61, 38.91), 'Dezhou': (116.36, 37.43),
    'Dingxi': (104.62, 35.58), 'Enshi': (109.49, 30.27), 'Foshan': (113.12, 23.02),
    'Fuyang': (115.81, 32.89), 'Fuzhou': (119.30, 26.07), 'Ganzhou': (114.93, 25.83),
    'Ganzi': (101.96, 30.05), 'Guangan': (106.63, 30.46), 'Guangzhou': (113.26, 23.13),
    'Guilin': (110.29, 25.27), 'Haidong': (102.10, 36.50), 'Hangzhou': (120.15, 30.28),
    'Hanzhong': (107.02, 33.07), 'Harbin': (126.64, 45.80), 'Hechi': (108.06, 24.69),
    'Hinggan': (122.04, 46.08), 'Hohhot': (111.75, 40.84), 'Huainan': (117.00, 32.63),
    'Huanggang': (114.87, 30.45), 'Hulunbuir': (119.77, 49.21), 'Huzhou': (120.09, 30.89),
    'Jiamusi': (130.32, 46.80), 'Jian': (114.97, 27.09), 'Jiangmen': (113.08, 22.58),
    'Jiaozuo': (113.24, 35.22), 'Jiaxing': (120.76, 30.75), 'Jilin': (126.55, 43.84),
    'Jinan': (117.00, 36.67), 'Jingdezhen': (117.18, 29.27), 'Jingmen': (112.20, 31.04),
    'Jinzhou': (121.13, 41.10), 'Jiujiang': (115.99, 29.70), 'Jixi': (130.97, 45.30),
    'Kunming': (102.83, 24.88), 'Lanzhou': (103.83, 36.06), 'Liangshan': (102.27, 27.88),
    'Lianyungang': (119.22, 34.60), 'Liaocheng': (115.99, 36.46), 'Lijiang': (100.23, 26.88),
    'Lincang': (100.09, 23.88), 'Linfen': (111.52, 36.09), 'Linyi': (118.36, 35.10),
    'Lishui': (119.92, 28.47), 'Liuan': (116.50, 31.73), 'Loudi': (112.00, 27.73),
    'Luoyang': (112.45, 34.62), 'Maoming': (110.92, 21.66), 'Meishan': (103.85, 30.08),
    'Mianyang': (104.68, 31.47), 'Nanchang': (115.86, 28.68), 'Nanchong': (106.11, 30.80),
    'Nanning': (108.37, 22.82), 'Neijiang': (105.06, 29.58), 'Ningbo': (121.54, 29.87),
    'Ningde': (119.55, 26.67), 'Pingdingshan': (113.19, 33.77), 'Pingliang': (106.67, 35.54),
    'Putian': (119.01, 25.45), 'Puyang': (115.03, 35.76), 'Qiandongnan': (107.98, 26.58),
    'Qiannan': (107.52, 26.25), 'Qingdao': (120.38, 36.07), 'Qingyuan': (113.06, 23.68),
    'Qiqihar': (123.92, 47.35), 'Shanghai': (121.47, 31.23), 'Shangrao': (117.94, 28.45),
    'Shaoyang': (111.47, 27.24), 'Shenzhen': (114.07, 22.54), 'Shijiazhuang': (114.51, 38.04),
    'Siping': (124.37, 43.17), 'Suqian': (118.28, 33.93), 'Suzhou': (120.58, 31.30),
    'Taizhou': (119.92, 32.46), 'Tianjin': (117.20, 39.13), 'Weifang': (119.11, 36.71),
    'Weihai': (122.12, 37.51), 'Weinan': (109.51, 34.50), 'Xiangfan': (112.15, 32.01),
    'Xilingol': (116.05, 43.93), 'Xinyang': (114.07, 32.13), 'Xinzhou': (112.73, 38.42),
    'Xuzhou': (117.18, 34.27), 'Yancheng': (120.16, 33.35), 'Yangquan': (113.58, 37.86),
    'Yangzhou': (119.41, 32.39), 'Yibin': (104.62, 28.77), 'Yichun': (114.39, 27.80),
    'Yiyang': (112.36, 28.55), 'Yueyang': (113.13, 29.36), 'Yulin': (110.18, 22.65),
    'Yuncheng': (111.00, 35.03), 'Zaozhuang': (117.32, 34.86), 'Zhangye': (100.46, 38.93),
    'Zhangzhou': (117.65, 24.51), 'Zhaotong': (103.72, 27.34), 'Zhengzhou': (113.63, 34.75),
    'Zhoukou': (114.70, 33.63), 'Ziyang': (104.65, 30.13),
}

# ── Deficit metadata ──────────────────────────────────────────────────────────

WAVE_PREFIX = {2011: 'r1', 2013: 'r2', 2015: 'r3', 2018: 'r4'}
DEFICIT_BASE = [
    'hibpe', 'diabe', 'hearte', 'stroke', 'cancre', 'arthre', 'lunge',
    'psyche', 'memrye', 'shlta', 'dressa', 'batha', 'eata', 'beda', 'toilta',
    'mealsa', 'shopa', 'moneya', 'medsa', 'walk1kma', 'chaira', 'climsa',
    'stoopa', 'armsa', 'lifta', 'dimea',
]
DEFICIT_LABELS = {
    'hibpe': '高血压', 'diabe': '糖尿病', 'hearte': '心脏病', 'stroke': '中风',
    'cancre': '癌症', 'arthre': '关节炎', 'lunge': '肺病', 'psyche': '精神病',
    'memrye': '记忆问题', 'shlta': '自评健康差', 'dressa': '穿衣ADL',
    'batha': '洗澡ADL', 'eata': '进食ADL', 'beda': '起床ADL', 'toilta': '如厕ADL',
    'mealsa': '做饭IADL', 'shopa': '购物IADL', 'moneya': '理财IADL',
    'medsa': '用药IADL', 'walk1kma': '步行1km', 'chaira': '从椅起身',
    'climsa': '爬楼梯', 'stoopa': '弯腰', 'armsa': '举臂', 'lifta': '提重物',
    'dimea': '视力',
}
DEFICIT_CATEGORY = {
    'hibpe': '慢性病', 'diabe': '慢性病', 'hearte': '慢性病', 'stroke': '慢性病',
    'cancre': '慢性病', 'arthre': '慢性病', 'lunge': '慢性病', 'psyche': '慢性病',
    'memrye': '慢性病', 'shlta': '自评',
    'dressa': 'ADL', 'batha': 'ADL', 'eata': 'ADL', 'beda': 'ADL', 'toilta': 'ADL',
    'mealsa': 'IADL', 'shopa': 'IADL', 'moneya': 'IADL', 'medsa': 'IADL',
    'walk1kma': '体能', 'chaira': '体能', 'climsa': '体能', 'stoopa': '体能',
    'armsa': '体能', 'lifta': '体能', 'dimea': '感官',
}

def safe(v, default=None):
    try:
        f = float(v)
        return default if math.isnan(f) else f
    except (TypeError, ValueError):
        return default

def write_json(data, name):
    p = OUT / name
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
    print(f'  ✓ {name} ({p.stat().st_size // 1024} KB)')

# ── 1. Build province + city lookup ───────────────────────────────────────────
print('Loading province & city mapping...')
try:
    import pyreadstat
    # CHARLS PSU.dta uses GBK encoding for Chinese strings
    psu, _ = pyreadstat.read_dta(DATA / 'charls/2011/PSU.dta', encoding='gbk')
    psu = pd.DataFrame(psu)
except Exception:
    # Fallback: pandas read_stata (may produce garbled Chinese)
    psu = pd.read_stata(DATA / 'charls/2011/PSU.dta', convert_categoricals=False)
psu['comm_id'] = pd.to_numeric(psu['communityID'], errors='coerce').astype('Int64')
psu['province_std'] = psu['province_eng'].map(lambda x: PROVINCE_NORM.get(x, x))
COMM_TO_PROV = dict(zip(psu['comm_id'].dropna().astype(int).astype(str), psu['province_std']))
COMM_TO_CITY = dict(zip(psu['comm_id'].dropna().astype(int).astype(str), psu['city_eng']))
COMM_TO_CITY_CN = dict(zip(psu['comm_id'].dropna().astype(int).astype(str), psu['city']))

# Demographics: ID → gender from Demographic_Backgrounds
print('Loading demographics...')
demo = pd.read_stata(DATA / 'charls/Demographic_Backgrounds.dta', convert_categoricals=False)
demo['ID_n'] = pd.to_numeric(demo['ID'], errors='coerce').astype('Int64')
DEMO_GENDER = dict(zip(demo['ID_n'].dropna().astype(int), demo['rgender']))  # 1=male, 2=female

# ── 2. Per-wave processing ────────────────────────────────────────────────────

for wave in [2011, 2013, 2015, 2018]:
    pfx = WAVE_PREFIX[wave]
    deficit_cols = [f'{pfx}{b}' for b in DEFICIT_BASE]
    print(f'\n=== Wave {wave} ===')

    # Load frailty
    frailty_path = DATA / f'charls_frailty/charls_frailty_{wave}.csv'
    frailty = pd.read_csv(frailty_path)
    # Standardize deficit col names to base names for easier processing
    col_map = {f'{pfx}{b}': b for b in DEFICIT_BASE if f'{pfx}{b}' in frailty.columns}
    frailty = frailty.rename(columns=col_map)
    actual_deficit_cols = [b for b in DEFICIT_BASE if b in frailty.columns]
    print(f'  Frailty records: {len(frailty)}')

    # Load SES for province
    ses_path = DATA / f'charls_socialeconomic_status/ses_{wave}.csv'
    ses = pd.read_csv(ses_path)
    ses['province'] = ses['communityID'].map(lambda c: COMM_TO_PROV.get(str(int(c)), None))
    ses['city'] = ses['communityID'].map(lambda c: COMM_TO_CITY.get(str(int(c)), None))
    ses['city_cn'] = ses['communityID'].map(lambda c: COMM_TO_CITY_CN.get(str(int(c)), None))

    # Load sleep for demographics
    sleep_path = DATA / f'charls_sleep_by_wave/sleep_{wave}_all_variables.csv'
    sleep = pd.read_csv(sleep_path)
    sleep_cols = ['ID', 'sleep', 'cesd10'] + \
                 [c for c in ['gender', 'rural'] if c in sleep.columns]
    sleep = sleep[sleep_cols].copy()

    # Load social participation
    socc_path = DATA / f'charls_social_participation_by_wave/socc_{wave}.csv'
    socc = pd.read_csv(socc_path)
    socc_id_col = 'id' if 'id' in socc.columns else 'ID'
    socc = socc.rename(columns={socc_id_col: 'ID'})
    activity_cols = [c for c in ['interact_f','majong_f','provhelp_f','sport_f',
                                  'community_f','volunteer_f','sccare_f','course_f',
                                  'stock_f','scinternet_f'] if c in socc.columns]
    socc['social_score'] = socc[activity_cols].apply(
        pd.to_numeric, errors='coerce').gt(0).sum(axis=1)

    # Load ACE (static)
    try:
        ace_path = DATA_JSON / 'charls_ace/charls_ace_after_pca.json'
        ace_raw = pd.DataFrame(json.loads(ace_path.read_text()))
        ace_raw['ID'] = pd.to_numeric(ace_raw['ID'], errors='coerce').astype('Int64')
        ACE = dict(zip(ace_raw['ID'].dropna().astype(int),
                       pd.to_numeric(ace_raw['ace_sum'], errors='coerce')))
    except Exception:
        ACE = {}

    # ── Merge base frame: SES as anchor (has province + city) ──
    base_cols = ['ID', 'communityID', 'province', 'city', 'city_cn', 'raeducl', 'atotb', 'lbrf_c', 'hukou']
    base = ses[[c for c in base_cols if c in ses.columns]].copy()
    base = base.merge(frailty[['ID', 'FI', 'frailty_cat', 'frailty'] + actual_deficit_cols],
                      on='ID', how='left')
    base = base.merge(sleep, on='ID', how='left')
    base = base.merge(socc[['ID', 'social_score'] + activity_cols], on='ID', how='left')
    base['gender_demo'] = base['ID'].map(DEMO_GENDER)  # 1=male 2=female from demo
    base['ace'] = base['ID'].map(ACE)

    # ── Merge healthcare utilization ──
    try:
        hs_path = DATA / f'charls_healthcare_system/hs_{wave}.csv'
        hs = pd.read_csv(hs_path)
        base = base.merge(hs[['ID', 'higov', 'hipriv', 'usualcare']], on='ID', how='left')
    except Exception:
        base['higov'] = None
        base['hipriv'] = None
        base['usualcare'] = None

    # ── Merge material circumstances (on householdID) ──
    try:
        mc_path = DATA / f'charls_material_circumstances/mc_{wave}.csv'
        mc = pd.read_csv(mc_path)
        mc_hh = mc.dropna(subset=['householdID']).groupby('householdID').first().reset_index()
        mc_cols = ['householdID', 'runwater', 'shower', 'gas', 'heat', 'cleancook',
                   'telephone', 'internet', 'toiletseat']
        base = base.merge(mc_hh[[c for c in mc_cols if c in mc_hh.columns]],
                          on='householdID', how='left')
    except Exception:
        for c in ['runwater','shower','gas','heat','cleancook','telephone','internet','toiletseat']:
            base[c] = None

    # ── Merge SC Constructed Z-scores (ID format: 9-digit integer) ──
    try:
        sc_path = DATA / 'charls_social_participation_by_wave/CHARLS_SC_constructed.csv'
        sc_const = pd.read_csv(sc_path)
        sc_id_col = 'id' if 'id' in sc_const.columns else 'ID'
        sc_const['sc_id_int'] = pd.to_numeric(sc_const[sc_id_col], errors='coerce').astype('Int64')
        SC_Z_TOTAL = dict(zip(sc_const['sc_id_int'].dropna().astype(int),
                              pd.to_numeric(sc_const['Z_SC_Total'], errors='coerce')))
        # Convert SES 12-digit string ID → 11-digit integer for matching
        base['sc_id'] = pd.to_numeric(base['ID'], errors='coerce').astype('Int64')
        base['scap'] = base['sc_id'].map(SC_Z_TOTAL)
    except Exception:
        base['scap'] = None

    # ── Compute composite scores ──
    # SES composite (0-3, higher = better)
    base['_edu_num'] = pd.to_numeric(base['raeducl'], errors='coerce')
    base['ses'] = ((base['_edu_num'] > 3).fillna(0).astype(int) +
                   (base['hukou'] == 'nonagri').fillna(0).astype(int) +
                   (base['lbrf_c'] == 'employed').fillna(0).astype(int))

    # Healthcare composite (0-3, higher = better access)
    for hc in ['higov', 'hipriv', 'usualcare']:
        if hc in base.columns:
            base[f'_{hc}'] = pd.to_numeric(base[hc], errors='coerce').fillna(0).clip(0, 1).astype(int)
        else:
            base[f'_{hc}'] = 0
    base['healthcare'] = base['_higov'] + base['_hipriv'] + base['_usualcare']

    # Social activity composite (0-30, higher = more active)
    for ac in activity_cols:
        if ac in base.columns:
            base[f'_act_{ac}'] = (4 - pd.to_numeric(base[ac], errors='coerce').fillna(4)).clip(0, 3)
        else:
            base[f'_act_{ac}'] = 0
    base['activity'] = base[[f'_act_{ac}' for ac in activity_cols]].sum(axis=1)

    # Material composite (0-8, higher = better conditions)
    mat_items = []
    for mc_col in ['runwater','shower','gas','telephone','internet','toiletseat']:
        col = f'_mat_{mc_col}'
        if mc_col in base.columns:
            base[col] = (pd.to_numeric(base[mc_col], errors='coerce') == 1).fillna(0).astype(int)
        else:
            base[col] = 0
        mat_items.append(col)
    # heat: 'clean' counts, cleancook: 1 counts
    base['_mat_heat'] = ((base['heat'] == 'clean') if 'heat' in base.columns else pd.Series(False, index=base.index)).fillna(0).astype(int)
    base['_mat_cleancook'] = ((pd.to_numeric(base['cleancook'], errors='coerce') == 1) if 'cleancook' in base.columns else pd.Series(False, index=base.index)).fillna(0).astype(int)
    mat_items.extend(['_mat_heat', '_mat_cleancook'])
    base['material'] = base[mat_items].sum(axis=1)

    print(f'  Merged base: {len(base)} records')

    # ── 2a. Province stats → map_province_{wave}.json ──────────────────────────
    def prov_agg(g):
        fi = g['FI'].dropna()
        fc = g['frailty_cat'].dropna()
        gd = g['gender_demo'].dropna()
        hk = g['hukou'].dropna()
        sl = g['sleep'].dropna() if 'sleep' in g.columns else pd.Series(dtype=float)
        return pd.Series({
            'n': len(g),
            'n_fi': len(fi),
            'meanFI': fi.mean() if len(fi) else None,
            'frailRate': (g['frailty'] == 1).mean() if 'frailty' in g.columns else None,
            'preFrailRate': (fc == 'pre-frail').sum() / len(g) if len(g) else None,
            'robustRate': (fc == 'robust').sum() / len(g) if len(g) else None,
            'malePct': (gd == 1).sum() / len(gd) if len(gd) else None,
            'urbanPct': (hk == 'nonagri').sum() / len(hk.isin(['agri','nonagri'])) if len(hk) else None,
        })

    prov_stats = base.dropna(subset=['province']).groupby('province').apply(prov_agg).reset_index()

    map_data = []
    for _, row in prov_stats.iterrows():
        p = row['province']
        map_data.append({
            'province': p,
            'code': PROVINCE_CODE.get(p, ''),
            'region': PROVINCE_REGION.get(p, 'Unknown'),
            'n': int(row['n']),
            'meanFI': round(float(row['meanFI']), 4) if pd.notna(row['meanFI']) else 0,
            'frailRate': round(float(row['frailRate']), 4) if pd.notna(row['frailRate']) else 0,
            'preFrailRate': round(float(row['preFrailRate']), 4) if pd.notna(row['preFrailRate']) else 0,
            'robustRate': round(float(row['robustRate']), 4) if pd.notna(row['robustRate']) else 0,
            'malePct': round(float(row['malePct']), 4) if pd.notna(row['malePct']) else None,
            'urbanPct': round(float(row['urbanPct']), 4) if pd.notna(row['urbanPct']) else None,
        })
    write_json(map_data, f'map_province_{wave}.json')

    # ── 2b. Deficit network → deficit_network_{wave}.json ──────────────────────
    valid = base[actual_deficit_cols + ['frailty_cat']].dropna(subset=actual_deficit_cols[:5])
    deficit_arr = valid[actual_deficit_cols].apply(pd.to_numeric, errors='coerce').fillna(0)
    n_valid = len(deficit_arr)

    nodes = []
    for b in actual_deficit_cols:
        col_data = deficit_arr[b]
        n_ones = int(col_data.sum())
        nodes.append({
            'id': b,
            'label': DEFICIT_LABELS.get(b, b),
            'category': DEFICIT_CATEGORY.get(b, '慢性病'),
            'n': n_ones,
            'prevalence': round(n_ones / n_valid, 4) if n_valid > 0 else 0,
        })

    # Co-occurrence links (phi coefficient ≥ 0.08)
    links = []
    for i, b1 in enumerate(actual_deficit_cols):
        for j, b2 in enumerate(actual_deficit_cols):
            if j <= i:
                continue
            a = deficit_arr[b1].values
            b = deficit_arr[b2].values
            both = int((a * b).sum())
            if both < 20:
                continue
            n11 = both
            n10 = int(a.sum()) - both
            n01 = int(b.sum()) - both
            n00 = n_valid - n11 - n10 - n01
            denom = math.sqrt((n11 + n10) * (n01 + n00) * (n11 + n01) * (n10 + n00))
            phi = (n11 * n00 - n10 * n01) / denom if denom > 0 else 0
            if phi >= 0.08:
                links.append({
                    'source': b1, 'target': b2,
                    'value': both,
                    'prob': round(phi, 4),
                })

    write_json({
        'year': wave,
        'sampleN': n_valid,
        'nodes': nodes,
        'links': links,
    }, f'deficit_network_{wave}.json')

    # ── 2b'. Deficit province prevalence → deficit_province_{wave}.json ────────
    dp_base = base.dropna(subset=['province'])[['province'] + actual_deficit_cols].copy()
    for col in actual_deficit_cols:
        dp_base[col] = pd.to_numeric(dp_base[col], errors='coerce')

    deficit_prov_data = {}
    for prov, grp in dp_base.groupby('province'):
        entry = {}
        for d in actual_deficit_cols:
            vals = grp[d].dropna()
            if len(vals) > 0:
                v = float(vals.mean())
                entry[d] = round(v, 4) if not (math.isnan(v) or math.isinf(v)) else None
            else:
                entry[d] = None
        # drop None values to keep JSON compact
        deficit_prov_data[str(prov)] = {k: v for k, v in entry.items() if v is not None}

    write_json({
        'deficits': actual_deficit_cols,
        'labels': {d: DEFICIT_LABELS.get(d, d) for d in actual_deficit_cols},
        'data': deficit_prov_data,
    }, f'deficit_province_{wave}.json')

    # ── 2b''. City stats → map_city_{wave}.json ─────────────────────────────────
    city_base = base.dropna(subset=['city'])
    if 'city_cn' in city_base.columns:
        city_base = city_base.dropna(subset=['city_cn'])

    def city_agg(g):
        fi = g['FI'].dropna()
        fc = g['frailty_cat'].dropna()
        gd = g['gender_demo'].dropna()
        hk = g['hukou'].dropna()
        return pd.Series({
            'n': len(g),
            'n_fi': len(fi),
            'meanFI': fi.mean() if len(fi) else None,
            'frailRate': (g['frailty'] == 1).mean() if 'frailty' in g.columns else None,
            'preFrailRate': (fc == 'pre-frail').sum() / len(g) if len(g) else None,
            'robustRate': (fc == 'robust').sum() / len(g) if len(g) else None,
            'malePct': (gd == 1).sum() / len(gd) if len(gd) else None,
            'urbanPct': (hk == 'nonagri').sum() / len(hk.isin(['agri','nonagri'])) if len(hk) else None,
        })

    city_stats = city_base.groupby('city').apply(city_agg).reset_index()

    # Get Chinese city name + province for each city from the base data
    city_meta = city_base.groupby('city').agg(
        city_cn=('city_cn', 'first') if 'city_cn' in city_base.columns else pd.Series(dtype=str),
        province=('province', 'first'),
    )

    map_city_data = []
    for _, row in city_stats.iterrows():
        c = str(row['city'])
        if row['n'] < 5:   # skip cities with too few respondents
            continue
        cn_row = city_meta.loc[c] if c in city_meta.index else None
        prov = str(cn_row['province']) if cn_row is not None else ''
        cn_str = str(cn_row['city_cn']) if cn_row is not None and 'city_cn' in cn_row.index else c
        coord = CITY_COORDS.get(c, None)
        map_city_data.append({
            'city': c,
            'cityCn': cn_str,
            'province': prov,
            'region': PROVINCE_REGION.get(prov, 'Unknown'),
            'lng': round(coord[0], 4) if coord else None,
            'lat': round(coord[1], 4) if coord else None,
            'n': int(row['n']),
            'meanFI': round(float(row['meanFI']), 4) if pd.notna(row['meanFI']) else 0,
            'frailRate': round(float(row['frailRate']), 4) if pd.notna(row['frailRate']) else 0,
            'preFrailRate': round(float(row['preFrailRate']), 4) if pd.notna(row['preFrailRate']) else 0,
            'robustRate': round(float(row['robustRate']), 4) if pd.notna(row['robustRate']) else 0,
            'malePct': round(float(row['malePct']), 4) if pd.notna(row['malePct']) else None,
            'urbanPct': round(float(row['urbanPct']), 4) if pd.notna(row['urbanPct']) else None,
        })
    write_json(map_city_data, f'map_city_{wave}.json')

    # ── 2b'''. Deficit city prevalence → deficit_city_{wave}.json ────────────────
    dc_base = base.dropna(subset=['city'])[['city', 'city_cn'] + actual_deficit_cols].copy()
    for col in actual_deficit_cols:
        dc_base[col] = pd.to_numeric(dc_base[col], errors='coerce')

    deficit_city_data = {}
    for city, grp in dc_base.groupby('city'):
        if len(grp) < 5:
            continue
        entry = {}
        for d in actual_deficit_cols:
            vals = grp[d].dropna()
            if len(vals) > 0:
                v = float(vals.mean())
                entry[d] = round(v, 4) if not (math.isnan(v) or math.isinf(v)) else None
            else:
                entry[d] = None
        coord = CITY_COORDS.get(str(city), None)
        cn_name = str(grp['city_cn'].iloc[0]) if 'city_cn' in grp.columns and len(grp) > 0 else str(city)
        deficit_city_data[str(city)] = {
            'cityCn': cn_name,
            'lng': round(coord[0], 4) if coord else None,
            'lat': round(coord[1], 4) if coord else None,
            'deficits': {k: v for k, v in entry.items() if v is not None},
        }

    write_json({
        'deficits': actual_deficit_cols,
        'labels': {d: DEFICIT_LABELS.get(d, d) for d in actual_deficit_cols},
        'data': deficit_city_data,
    }, f'deficit_city_{wave}.json')

    # ── 2c. Driver records → driver_records_{wave}.json ────────────────────────
    # 10-axis: ace, sleep, social, depression, fi, ses, healthcare, activity, scap, material
    recs_base_cols = ['ID', 'FI', 'frailty_cat', 'sleep', 'cesd10',
                      'social_score', 'ace', 'gender_demo', 'hukou',
                      'province', 'city', 'ses', 'healthcare', 'activity',
                      'scap', 'material']
    recs_df = base[[c for c in recs_base_cols if c in base.columns]].copy()
    recs_df = recs_df.dropna(subset=['FI', 'frailty_cat'])

    # Compute "alone" proxy from social data (hhres in socc)
    if 'hhres' in socc.columns:
        hhres = dict(zip(socc['ID'], socc['hhres']))
        recs_df['alone'] = recs_df['ID'].map(hhres).apply(
            lambda x: 1 if pd.notna(x) and x <= 1 else 0)
    else:
        recs_df['alone'] = 0

    recs_df['gender_str'] = recs_df['gender_demo'].map({1.0: 'male', 2.0: 'female'})
    recs_df['rural_int'] = recs_df['hukou'].map({'agri': 1, 'nonagri': 0})

    # Normalized value columns
    recs_df['ace_val'] = pd.to_numeric(recs_df['ace'], errors='coerce').fillna(0)
    recs_df['sleep_val'] = pd.to_numeric(recs_df['sleep'], errors='coerce')
    recs_df['social_val'] = pd.to_numeric(recs_df['social_score'], errors='coerce').fillna(0)
    recs_df['dep_val'] = pd.to_numeric(recs_df['cesd10'], errors='coerce')
    recs_df['fi_val'] = pd.to_numeric(recs_df['FI'], errors='coerce')
    recs_df['ses_val'] = pd.to_numeric(recs_df['ses'], errors='coerce').fillna(0)
    recs_df['healthcare_val'] = pd.to_numeric(recs_df['healthcare'], errors='coerce').fillna(0)
    recs_df['activity_val'] = pd.to_numeric(recs_df['activity'], errors='coerce').fillna(0)
    recs_df['scap_val'] = pd.to_numeric(recs_df['scap'], errors='coerce').fillna(0)
    recs_df['material_val'] = pd.to_numeric(recs_df['material'], errors='coerce').fillna(0)

    # Drop rows missing key vars
    recs_df = recs_df.dropna(subset=['fi_val'])

    # Sample if > 4000
    total_n = len(recs_df)
    sampled = total_n > 4000
    sample_df = recs_df.sample(min(4000, total_n), random_state=42) if sampled else recs_df

    fields = ['id', 'ace', 'sleep', 'social', 'depression', 'fi',
              'ses', 'healthcare', 'activity', 'scap', 'material',
              'frailty_cat', 'alone', 'gender', 'rural', 'province', 'city']

    def _r(v):
        if pd.isna(v):
            return None
        if isinstance(v, float):
            return round(v, 4)
        return v

    rows = []
    for _, r in sample_df.iterrows():
        rows.append([
            str(int(r['ID'])),
            _r(r['ace_val']),
            _r(r['sleep_val']),
            _r(r['social_val']),
            _r(r['dep_val']),
            _r(r['fi_val']),
            _r(r['ses_val']),
            _r(r['healthcare_val']),
            _r(r['activity_val']),
            _r(r['scap_val']),
            _r(r['material_val']),
            str(r['frailty_cat']),
            int(r['alone']),
            r['gender_str'] if pd.notna(r['gender_str']) else None,
            int(r['rural_int']) if pd.notna(r['rural_int']) else None,
            r['province'] if pd.notna(r['province']) else None,
            str(r['city']) if pd.notna(r['city']) and r['city'] != 'nan' else None,
        ])

    # Compute ranges from full dataset (10 axes)
    dim_cols = [
        ('ace', 'ace_val'), ('sleep', 'sleep_val'),
        ('social', 'social_val'), ('depression', 'dep_val'),
        ('fi', 'fi_val'), ('ses', 'ses_val'),
        ('healthcare', 'healthcare_val'), ('activity', 'activity_val'),
        ('scap', 'scap_val'), ('material', 'material_val'),
    ]
    ranges = {}
    for dim, col in dim_cols:
        vals = recs_df[col].dropna()
        if len(vals):
            ranges[dim] = [round(float(vals.min()), 4), round(float(vals.max()), 4)]

    write_json({
        'fields': fields,
        'rows': rows,
        'n': len(rows),
        'totalN': total_n,
        'sampled': sampled,
        'ranges': ranges,
    }, f'driver_records_{wave}.json')

    # ── 2d. Correlation matrix → correlation_matrix_{wave}.json ──────────────
    cor_cols = {
        'ace': 'ace_val', 'sleep': 'sleep_val', 'social': 'social_val',
        'depression': 'dep_val', 'fi': 'fi_val',
        'ses': 'ses_val', 'healthcare': 'healthcare_val',
        'activity': 'activity_val', 'scap': 'scap_val', 'material': 'material_val',
    }
    cor_df = recs_df[[c for c in cor_cols.values()]].dropna()
    n_cor = len(cor_df)
    keys = list(cor_cols.keys())
    cols = list(cor_cols.values())
    matrix = []
    for i, c1 in enumerate(cols):
        row_r = []
        for j, c2 in enumerate(cols):
            if i == j:
                row_r.append(1.0)
            else:
                rho, _ = scipy_stats.spearmanr(cor_df[c1], cor_df[c2])
                rho_f = float(rho)
                row_r.append(None if (math.isnan(rho_f) or math.isinf(rho_f)) else round(rho_f, 4))
        matrix.append(row_r)

    labels = ['ACE', '睡眠', '社会联系', '抑郁', 'FI',
              '社会经济', '医疗保健', '社交参与', '社会资本Z', '物质条件']
    write_json({'labels': labels, 'keys': keys, 'matrix': matrix, 'n': n_cor},
               f'correlation_matrix_{wave}.json')

    # ── 2e. Driver chord → driver_chord_{wave}.json ──────────────────────────
    chord_matrix = [
        [(abs(matrix[i][j]) if matrix[i][j] is not None else 0) if i != j else 0 for j in range(len(keys))]
        for i in range(len(keys))
    ]
    write_json({'labels': labels, 'keys': keys, 'matrix': chord_matrix, 'n': n_cor},
               f'driver_chord_{wave}.json')

    # ── 2f. Driver sankey (temporal) → driver_sankey_{wave}.json ─────────────
    # Multi-wave frailty state transitions: 2011→2013→2015→2018
    # Uses the full base (before sampling) to track trajectories
    WAVES_ALL = [2011, 2013, 2015, 2018]
    if wave == 2018:
        # Build wave-to-wave transition matrix across all 4 waves
        frailty_states = ['robust', 'pre-frail', 'frail', 'lost']
        state_labels_cn = {'robust': '健壮', 'pre-frail': '衰弱前期', 'frail': '衰弱', 'lost': '失访/死亡'}
        # Colors for sankey
        state_colors = {'robust': '#2EC4C4', 'pre-frail': '#E8B84A', 'frail': '#D04FA8', 'lost': '#8A8580'}

        # Get frailty status for each wave from frailty files
        wave_ids = set(base['ID'].dropna())
        frailty_by_wave = {}
        for w in WAVES_ALL:
            fp = DATA / f'charls_frailty/charls_frailty_{w}.csv'
            if fp.exists():
                fdf = pd.read_csv(fp)
                # Normalize ID: convert to int to strip leading zeros, then back to str
                fdf['_id_int'] = pd.to_numeric(fdf['ID'], errors='coerce').astype('Int64')
                fdf['_id_key'] = fdf['_id_int'].dropna().astype(int).astype(str)
                frailty_by_wave[w] = dict(zip(fdf['_id_key'], fdf['frailty_cat']))
            else:
                frailty_by_wave[w] = {}

        # Build transition matrix using normalized IDs
        # Normalize SES 2018 IDs similarly
        base_ids_normalized = set()
        for raw_id in wave_ids:
            try:
                base_ids_normalized.add(str(int(raw_id)))
            except (ValueError, TypeError):
                base_ids_normalized.add(str(raw_id))

        # Build transition counts
        from collections import Counter
        layer_nodes = {i: Counter() for i in range(4)}  # layer → state → count
        transition_counts = {}  # (layer, src_state, tgt_state) → count

        for pid in base_ids_normalized:
            if not pid:
                continue
            states = []
            for wi, w in enumerate(WAVES_ALL):
                s = frailty_by_wave[w].get(pid, 'lost')
                if not isinstance(s, str) or s not in frailty_states:
                    s = 'lost'
                states.append(s)
                layer_nodes[wi][s] += 1

            for wi in range(3):
                src = states[wi]
                tgt = states[wi + 1]
                key = (wi, src, tgt)
                transition_counts[key] = transition_counts.get(key, 0) + 1

        # Build SankeyData-compatible output
        temporal_nodes = []
        temporal_links = []
        node_id_map = {}  # (layer, state) → node_id
        nid_counter = 0

        for layer_idx in range(4):
            for state in frailty_states:
                cnt = layer_nodes[layer_idx].get(state, 0)
                node_id = f'L{layer_idx}_{state}'
                node_id_map[(layer_idx, state)] = node_id
                temporal_nodes.append({
                    'id': node_id,
                    'layer': layer_idx,
                    'layerType': 'outcome' if layer_idx == 3 else ('baseline' if layer_idx == 0 else 'evolution'),
                    'state': state,
                    'label': f'{state_labels_cn[state]}',
                    'wave': WAVES_ALL[layer_idx],
                    'count': cnt,
                })
                nid_counter += 1

        # Source totals for conditional probability
        source_totals = {}
        for (layer, src, tgt), cnt in transition_counts.items():
            source_totals[(layer, src)] = source_totals.get((layer, src), 0) + cnt

        for (layer, src, tgt), cnt in transition_counts.items():
            if cnt == 0:
                continue
            total = source_totals.get((layer, src), 1)
            prob = cnt / total if total > 0 else 0
            temporal_links.append({
                'source': node_id_map[(layer, src)],
                'target': node_id_map[(layer + 1, tgt)],
                'value': cnt,
                'prob': round(prob, 4),
                'anomaly': 'jump' if (src in ('robust', 'pre-frail') and tgt == 'frail') else
                           ('recovery' if (src == 'frail' and tgt in ('robust', 'pre-frail')) else None),
            })

        write_json({
            'nodes': temporal_nodes,
            'links': temporal_links,
            'cohort_n': len(wave_ids),
            'generated_at': str(wave),
            'meta': {'startWave': 2011, 'midWave': 2013, 'endWave': 2018},
        }, f'driver_sankey_{wave}.json')
    else:
        # For non-2018 waves, still generate the simple ACE→frailty sankey
        ace_bins = [(0, 0, 'ACE=0'), (1, 2, 'ACE 1-2'), (3, 4, 'ACE 3-4'), (5, 99, 'ACE≥5')]
        status_labels = {'robust': '健壮', 'pre-frail': '衰弱前期', 'frail': '衰弱'}
        sankey_nodes = []
        sankey_links = []
        nid = 0
        ace_node_ids = {}
        for lo, hi, label in ace_bins:
            ace_node_ids[label] = nid
            sankey_nodes.append({
                'id': f'ace_{nid}', 'layer': 0, 'layerType': 'factor',
                'state': label, 'label': label,
                'count': int(((recs_df['ace_val'] >= lo) & (recs_df['ace_val'] <= hi)).sum()),
            })
            nid += 1
        status_node_ids = {}
        for s in ['robust', 'pre-frail', 'frail']:
            status_node_ids[s] = nid
            sankey_nodes.append({
                'id': f'status_{nid}', 'layer': 1, 'layerType': 'outcome',
                'state': s, 'label': status_labels.get(s, s),
                'count': int((recs_df['frailty_cat'] == s).sum()),
            })
            nid += 1
        for lo, hi, label in ace_bins:
            mask = (recs_df['ace_val'] >= lo) & (recs_df['ace_val'] <= hi)
            sub = recs_df[mask]
            total_ace = len(sub)
            for s in ['robust', 'pre-frail', 'frail']:
                cnt = int((sub['frailty_cat'] == s).sum())
                if cnt == 0:
                    continue
                sankey_links.append({
                    'source': f"ace_{ace_node_ids[label]}",
                    'target': f"status_{status_node_ids[s]}",
                    'value': cnt,
                    'prob': round(cnt / total_ace, 4) if total_ace else 0,
                })
        write_json({
            'nodes': sankey_nodes, 'links': sankey_links,
            'cohort_n': total_n, 'generated_at': str(wave),
        }, f'driver_sankey_{wave}.json')

    # ── 2g. Factor matrix → factor_matrix_{wave}.json ────────────────────────
    factor_dims = [
        ('ACE', 'ace_val', 'ACE'),
        ('睡眠时长', 'sleep_val', 'Sleep'),
        ('社会联系', 'social_val', 'Social'),
        ('抑郁', 'dep_val', 'Mood'),
        ('社会经济', 'ses_val', 'SES'),
        ('医疗保健', 'healthcare_val', 'Healthcare'),
        ('社交参与', 'activity_val', 'Social'),
        ('社会资本Z', 'scap_val', 'Social'),
        ('物质条件', 'material_val', 'SES'),
    ]
    factor_rows = []
    for label, col, cat in factor_dims:
        sub = recs_df[['fi_val', col]].dropna()
        if len(sub) < 20:
            continue
        rho, p = scipy_stats.spearmanr(sub['fi_val'], sub[col])
        rho_f, p_f = float(rho), float(p)
        if math.isnan(rho_f) or math.isinf(rho_f):
            continue
        factor_rows.append({
            'factor': label,
            'rho': round(rho_f, 4),
            'pvalue': round(p_f, 6) if not (math.isnan(p_f) or math.isinf(p_f)) else None,
            'category': cat,
        })
    write_json(factor_rows, f'factor_matrix_{wave}.json')

    # ── 2h. KPI → kpi_{wave}.json ────────────────────────────────────────────
    fi_all = base['FI'].dropna()
    frail_all = base['frailty'].dropna()
    write_json({
        'year': wave,
        'status': 'all',
        'n': len(base),
        'frailRate': round(float(frail_all.mean()), 4) if len(frail_all) else 0,
        'preFrailRate': round(float((base['frailty_cat'] == 'pre-frail').mean()), 4),
        'meanFI': round(float(fi_all.mean()), 4) if len(fi_all) else 0,
        'femaleRate': round(float((base['gender_demo'] == 2).sum() / base['gender_demo'].notna().sum()), 4)
                     if base['gender_demo'].notna().sum() > 0 else None,
        'urbanRate': round(float((base['hukou'] == 'nonagri').sum() /
                                  base['hukou'].isin(['agri','nonagri']).sum()), 4),
    }, f'kpi_{wave}.json')

    print(f'  Done wave {wave}')

print('\n✅ All data generated →', OUT)
