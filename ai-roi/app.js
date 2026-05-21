/* AI Audit Checklist v5 — application logic (data in data.js) */
const STORAGE_KEY = 'ai-audit-checklist-v5';
const STORAGE_KEY_V4 = 'ai-audit-checklist-v4';
/** 暂时关闭「自行添加场景」；改 true 可恢复表单与 Tab */
const ENABLE_CUSTOM = false;

let state = defaultState();

function defaultState() {
  return {
    items: {},
    tools: {},
    overrides: {},
    customItems: [],
    misDelegation: {},
    toolPriceOverrides: {},
    hourlyRate: 100,
    monthlyCost: 300,
    autoCost: true,
    riskCost: 0,
    workType: 'all',
    searchQuery: '',
    entryMode: false,
    onboardingDone: false,
    onboardStep: 0,
    snapshots: [],
    lang: 'zh',
  };
}

function loadState() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(STORAGE_KEY_V4);
      if (raw) {
        state = migrateFromV4(JSON.parse(raw));
        saveState();
        return;
      }
    }
    if (raw) {
      state = { ...defaultState(), ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('loadState failed', e);
    state = defaultState();
  }
}

function migrateFromV4(v4) {
  return {
    ...defaultState(),
    items: v4.items || {},
    tools: v4.tools || {},
    overrides: v4.overrides || {},
    customItems: v4.customItems || [],
    misDelegation: v4.misDelegation || {},
    toolPriceOverrides: v4.toolPriceOverrides || {},
    hourlyRate: v4.hourlyRate ?? 100,
    monthlyCost: v4.monthlyCost ?? 300,
    autoCost: v4.autoCost ?? true,
    riskCost: v4.riskCost ?? 0,
    workType: v4.workType || 'all',
    searchQuery: v4.searchQuery || '',
    onboardingDone: v4.onboardingDone ?? false,
    onboardStep: v4.onboardStep ?? 0,
    snapshots: v4.snapshots || [],
    lang: v4.lang || 'zh',
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('saveState failed', e);
  }
}

function fmtMin(m) {
  if (m == null || isNaN(m)) return '—';
  if (m >= 120) return (m / 60).toFixed(1).replace(/\.0$/, '') + 'h';
  return Math.round(m) + ' min';
}

function fmtMoney(n) {
  return '¥' + Math.round(n).toLocaleString();
}

function allItemsFlat() {
  return getAllCategories().flatMap(c => c.items);
}

function getAllCategories() {
  const cats = CATEGORIES.slice();
  if (ENABLE_CUSTOM) {
    cats.push({
      id: 'custom',
      name: '自定义',
      icon: '✨',
      desc: '你添加的独有场景 — 在上方表单添加',
      items: state.customItems.map(c => ({
        id: c.id,
        title: c.title,
        problem: c.problem || '自定义工作场景',
        tools: c.tools || '自选 AI 工具',
        base: Number(c.base) || 60,
        now: Number(c.now) || 15,
        freq: c.freq != null ? Number(c.freq) : 1,
        humanOnly: c.type === 'human',
        aiRole: c.type === 'human' ? '仅辅助备料，你决策终审' : undefined,
        custom: true,
      })),
    });
  }
  return cats;
}

function buildAllBuiltinCategory() {
  const items = [];
  CATEGORIES.forEach(cat => {
    cat.items.forEach(item => {
      items.push({
        ...item,
        _catName: cat.name,
        _catIcon: cat.icon,
        _catId: cat.id,
      });
    });
  });
  return {
    id: 'allbuiltin',
    name: t('catAllBuiltin'),
    icon: '📑',
    desc: t('catAllBuiltinDesc'),
    items,
  };
}

function buildMyEntryCategory() {
  const items = allItemsFlat().filter(item => {
    if (item.isTool) return !!state.tools[item.id];
    const st = getItemStatus(item.id);
    const ov = state.overrides[item.id];
    return st >= 1 || (ov && Object.keys(ov).length) || state.misDelegation[item.id] || item.custom;
  });
  return {
    id: 'myentry',
    name: t('catMyEntry'),
    icon: '📋',
    desc: t('catMyEntryDesc'),
    items,
  };
}

function getEffectiveItem(item) {
  const ov = state.overrides[item.id] || {};
  const eff = { ...item };
  if (ov.base != null && ov.base !== '') eff.base = Number(ov.base);
  if (ov.now != null && ov.now !== '') eff.now = Number(ov.now);
  if (ov.actualWeeklyMin != null && ov.actualWeeklyMin !== '') {
    eff.actualWeeklyMin = Number(ov.actualWeeklyMin);
  }
  return eff;
}

function getAllSceneItems() {
  return allItemsFlat()
    .filter(i => !i.isTool)
    .map(i => getEffectiveItem(i));
}

function itemCategoryId(itemId) {
  for (const cat of getAllCategories()) {
    if (cat.items.some(i => i.id === itemId)) return cat.id;
  }
  return null;
}

function getAllowedCatIds() {
  const wt = state.workType || 'all';
  return ROLE_CATS[wt] || ROLE_CATS.all || null;
}

function isCategoryVisible(catId) {
  if (catId === 'myentry' || catId === 'allbuiltin') return true;
  const allowed = getAllowedCatIds();
  if (!allowed) return true;
  return allowed.includes(catId);
}

function matchesSearch(item, q) {
  if (!q) return true;
  const loc = localizeItem(item);
  const hay = [item.id, item.title, item.problem, item.tools, item.aiRole, loc.title, loc.problem, loc.tools, loc.aiRole]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function getFilteredCategories() {
  const q = (state.searchQuery || '').trim().toLowerCase();
  const myEntry = buildMyEntryCategory();
  const rest = getAllCategories()
    .filter(c => isCategoryVisible(c.id))
    .map(c => localizeCategory({
      ...c,
      items: c.items.filter(i => matchesSearch(i, q)),
    }))
    .filter(c => c.items.length > 0 || (ENABLE_CUSTOM && c.id === 'custom'));

  const myFiltered = localizeCategory({
    ...myEntry,
    items: myEntry.items.filter(i => matchesSearch(i, q)),
  });
  const allBuiltin = buildAllBuiltinCategory();
  const allFiltered = localizeCategory({
    ...allBuiltin,
    items: allBuiltin.items.filter(i => matchesSearch(i, q)).map(i => {
      const catMeta = CAT_I18N[i._catId];
      const loc = localizeItem(i);
      if (getLang() === 'en' && catMeta) {
        return { ...loc, _catName: catMeta.name, _catIcon: i._catIcon };
      }
      return loc;
    }),
  });

  return [allFiltered, myFiltered, ...rest];
}

function getStatsScopeItems() {
  const allowed = getAllowedCatIds();
  let items = getAllSceneItems();
  if (allowed) {
    items = items.filter(i => {
      const cid = itemCategoryId(i.id);
      return cid && allowed.includes(cid);
    });
  }
  return items;
}

function getItemStatus(id) {
  return state.items[id] ?? 0;
}

function statusLabels(item) {
  return getStatusLabels(item.humanOnly);
}

function modeBadge(item) {
  if (item.humanOnly) return `<span class="item-mode mode-human">${t('modeHuman')}</span>`;
  if (item.mode === 'direct') return `<span class="item-mode mode-direct">${t('modeDirect')}</span>`;
  if (item.mode === 'transform') return `<span class="item-mode mode-transform">${t('modeTransform')}</span>`;
  if (item.base >= 240) return `<span class="item-mode mode-direct">${t('modeHeavy')}</span>`;
  return '';
}

function getToolPrice(id) {
  if (state.toolPriceOverrides[id] != null && state.toolPriceOverrides[id] !== '') {
    return Number(state.toolPriceOverrides[id]) || 0;
  }
  return DEFAULT_TOOL_PRICES[id] ?? 0;
}

function calcAutoMonthlyCost() {
  let total = 0;
  allItemsFlat()
    .filter(i => i.isTool && state.tools[i.id])
    .forEach(i => {
      total += getToolPrice(i.id);
    });
  return total;
}

function weeklySavedForItem(item, st) {
  if (st < 1 || item.humanOnly) return { saved: 0, isReal: false };
  const eff = getEffectiveItem(item);
  const mul = STATUS_MUL[st] ?? 0;
  if (eff.actualWeeklyMin != null && !isNaN(eff.actualWeeklyMin)) {
    return { saved: eff.actualWeeklyMin * mul, isReal: true };
  }
  if (eff.base > 0) {
    return { saved: (eff.base - eff.now) * (eff.freq || 0) * mul, isReal: false };
  }
  return { saved: 0, isReal: false };
}

function calcStats() {
  const sceneItems = getStatsScopeItems();
  const aiItems = sceneItems.filter(i => !i.humanOnly);
  const humanItems = sceneItems.filter(i => i.humanOnly);
  const toolItems = allItemsFlat().filter(i => i.isTool);

  let connected = 0;
  let regular = 0;
  let star = 0;
  let humanAck = 0;
  let humanReady = 0;
  let weeklyMinSaved = 0;
  let realWeeklyMinSaved = 0;
  let hasRealSavings = false;
  let transformTotal = 0;
  let transformConnected = 0;
  const catStats = {};

  getAllCategories().forEach(cat => {
    if (!isCategoryVisible(cat.id)) return;
    const scene = cat.items.filter(i => !i.isTool);
    if (!scene.length) return;
    let cConnected = 0;
    scene.forEach(raw => {
      const item = getEffectiveItem(raw);
      const st = getItemStatus(item.id);
      if (item.humanOnly) {
        if (st >= 1) {
          humanAck++;
          cConnected++;
        }
        if (st >= 2) humanReady++;
      } else {
        if (st >= 1) {
          connected++;
          cConnected++;
        }
        if (st >= 2) regular++;
        if (st >= 3) star++;
        const { saved, isReal } = weeklySavedForItem(item, st);
        weeklyMinSaved += saved;
        if (isReal) {
          realWeeklyMinSaved += saved;
          hasRealSavings = true;
        }
      }
      if (cat.id === 'transform' && !item.humanOnly) {
        transformTotal++;
        if (st >= 1) transformConnected++;
      }
    });
    catStats[cat.id] = {
      total: scene.length,
      connected: cConnected,
      pct: scene.length ? Math.round((cConnected / scene.length) * 100) : 0,
      isHuman: cat.id === 'human',
    };
  });

  const aiTotal = aiItems.length;
  const humanTotal = humanItems.length;
  const grandTotal = aiTotal + humanTotal;

  let aiTimeWeight = 0;
  let humanTimeWeight = 0;
  aiItems.forEach(item => {
    aiTimeWeight += (item.base || 0) * (item.freq || 0);
  });
  humanItems.forEach(item => {
    humanTimeWeight += item.timeW != null ? Number(item.timeW) : 5.4;
  });
  const timeGrand = aiTimeWeight + humanTimeWeight;
  const aiTimePct = timeGrand ? Math.round((aiTimeWeight / timeGrand) * 100) : 0;
  const humanTimePct = 100 - aiTimePct;

  const aiCoverablePct = grandTotal ? Math.round((aiTotal / grandTotal) * 100) : 0;
  const humanRequiredPct = 100 - aiCoverablePct;

  const toolTotal = toolItems.length;
  const toolsOwned = toolItems.filter(i => state.tools[i.id]).length;

  const hourly = parseFloat(document.getElementById('hourlyRate')?.value) || state.hourlyRate || 100;
  const riskCost = parseFloat(document.getElementById('riskCost')?.value) || state.riskCost || 0;
  let monthlyCost = parseFloat(document.getElementById('monthlyCost')?.value) || state.monthlyCost || 300;
  if (state.autoCost) monthlyCost = calcAutoMonthlyCost();

  const weeklyHoursSaved = weeklyMinSaved / 60;
  const monthlyValue = weeklyHoursSaved * 4.33 * hourly;
  const realMonthlyValue = hasRealSavings
    ? (realWeeklyMinSaved / 60) * 4.33 * hourly
    : monthlyValue;
  const monthlyROI = monthlyValue - monthlyCost - riskCost;
  const roiRatio = monthlyCost + riskCost > 0 ? (monthlyValue / (monthlyCost + riskCost)).toFixed(1) : '∞';

  const connectPct = aiTotal ? Math.round((connected / aiTotal) * 100) : 0;
  const regularPct = aiTotal ? Math.round((regular / aiTotal) * 100) : 0;
  const humanBoundaryPct = humanTotal ? Math.round((humanAck / humanTotal) * 100) : 0;
  const humanReadyPct = humanTotal ? Math.round((humanReady / humanTotal) * 100) : 0;
  const toolPct = toolTotal ? Math.round((toolsOwned / toolTotal) * 100) : 0;
  const transformConnectPct = transformTotal
    ? Math.round((transformConnected / transformTotal) * 100)
    : 0;

  let potentialWeekly = 0;
  aiItems.forEach(item => {
    if (item.base > 0) potentialWeekly += (item.base - item.now) * (item.freq || 0);
  });
  const potentialMonthly = (potentialWeekly / 60) * 4.33 * hourly;
  const unrealizedPct = potentialMonthly > 0 ? Math.round((1 - monthlyValue / potentialMonthly) * 100) : 0;

  const misCount = Object.values(state.misDelegation).filter(Boolean).length;
  const maturity = calcMaturity({
    connectPct,
    humanBoundaryPct,
    monthlyROI,
    transformConnectPct,
    star,
  });

  return {
    total: aiTotal,
    connected,
    regular,
    star,
    connectPct,
    regularPct,
    aiTotal,
    humanTotal,
    grandTotal,
    aiCoverablePct,
    humanRequiredPct,
    aiTimePct,
    humanTimePct,
    aiTimeWeight,
    humanTimeWeight,
    humanAck,
    humanBoundaryPct,
    humanReady,
    humanReadyPct,
    weeklyMinSaved,
    weeklyHoursSaved,
    monthlyValue,
    realMonthlyValue,
    hasRealSavings,
    monthlyROI,
    roiRatio,
    monthlyCost,
    riskCost,
    catStats,
    toolTotal,
    toolsOwned,
    toolPct,
    potentialMonthly,
    unrealizedPct,
    hourly,
    transformTotal,
    transformConnected,
    transformConnectPct,
    misCount,
    maturity,
  };
}

function calcMaturity(stats) {
  const { connectPct, humanBoundaryPct, monthlyROI, transformConnectPct } = stats;
  const levels = getMaturityLabels();
  if (connectPct >= 60 && humanBoundaryPct >= 70) return levels[5];
  if (connectPct >= 55 && transformConnectPct >= 20) return levels[4];
  if (connectPct >= 50) return levels[3];
  if (connectPct >= 40 && monthlyROI > 0) return levels[2];
  if (connectPct >= 20) return levels[1];
  return levels[0];
}

function renderDashboard(stats) {
  const aiW = Math.max(stats.aiCoverablePct, 8);
  const huW = Math.max(stats.humanRequiredPct, 8);
  const roleNote =
    state.workType !== 'all'
      ? `<div class="card-sub">${t('dashFilter', { role: document.getElementById('workType')?.selectedOptions?.[0]?.text || state.workType })}</div>`
      : '';
  document.getElementById('dashboard').innerHTML = `
    <div class="card" style="grid-column: 1 / -1">
      <div class="card-label">${t('dashPanorama')}</div>
      <div class="compare-legend">
        <span>${t('dashAiCover', { n: stats.aiTotal, pct: stats.aiCoverablePct, timePct: stats.aiTimePct })}</span>
        <span>${t('dashHumanReq', { n: stats.humanTotal, pct: stats.humanRequiredPct, timePct: stats.humanTimePct })}</span>
      </div>
      <div class="compare-bar">
        <div class="compare-ai" style="width:${aiW}%">${stats.aiCoverablePct}%</div>
        <div class="compare-human">${stats.humanRequiredPct}%</div>
      </div>
      <div class="card-sub" style="margin-top:0.5rem">
        ${t('dashSummary', { conn: stats.connected, total: stats.aiTotal, pct: stats.connectPct, hAck: stats.humanAck, hTotal: stats.humanTotal, hPct: stats.humanBoundaryPct })}
        <span class="maturity-tag">${stats.maturity.label}</span>
      </div>
      ${roleNote}
    </div>
    <div class="card">
      <div class="card-label">${t('dashAiConnect')}</div>
      <div class="card-value blue">${stats.connectPct}%</div>
      <div class="card-sub">${t('dashAiConnectSub', { conn: stats.connected, total: stats.aiTotal, timePct: stats.aiTimePct })}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${stats.connectPct}%;background:var(--accent)"></div></div>
    </div>
    <div class="card">
      <div class="card-label">${t('dashRegular')}</div>
      <div class="card-value green">${stats.regularPct}%</div>
      <div class="card-sub">${t('dashRegularSub', { n: stats.regular })}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${stats.regularPct}%;background:var(--accent2)"></div></div>
    </div>
    <div class="card">
      <div class="card-label">${t('dashHumanBoundary')}</div>
      <div class="card-value" style="color:var(--warn)">${stats.humanBoundaryPct}%</div>
      <div class="card-sub">${t('dashHumanBoundarySub', { ack: stats.humanAck, total: stats.humanTotal })}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${stats.humanBoundaryPct}%;background:var(--warn)"></div></div>
    </div>
    <div class="card">
      <div class="card-label">${t('dashTools')}</div>
      <div class="card-value purple">${stats.toolPct}%</div>
      <div class="card-sub">${t('dashToolsSub', { owned: stats.toolsOwned, total: stats.toolTotal, cost: fmtMoney(stats.monthlyCost) })}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${stats.toolPct}%;background:var(--star)"></div></div>
    </div>
    <div class="card">
      <div class="card-label">${t('dashMonthlyValue')}</div>
      <div class="card-value green">${fmtMoney(stats.monthlyValue)}</div>
      <div class="card-sub">${t('dashMonthlyValueSub', { real: stats.hasRealSavings ? t('dashRealPrefix') : '', hours: stats.weeklyHoursSaved.toFixed(1) })}</div>
    </div>
    <div class="card">
      <div class="card-label">${t('dashRoi')}</div>
      <div class="card-value ${stats.monthlyROI >= 0 ? 'green' : ''}" style="${stats.monthlyROI < 0 ? 'color:var(--danger)' : ''}">${fmtMoney(stats.monthlyROI)}</div>
      <div class="card-sub">${t('dashRoiSub', { sub: fmtMoney(stats.monthlyCost), risk: fmtMoney(stats.riskCost), ratio: stats.roiRatio })}</div>
    </div>
  `;
}

function renderMaturityBar(stats) {
  const m = stats.maturity;
  const levels = getMaturityLabels().map(l => ({ n: l.level, t: l.short }));
  const steps = levels
    .map(
      l =>
        `<span style="opacity:${l.n <= m.level ? 1 : 0.35};font-size:0.72rem;${l.n === m.level ? 'color:var(--accent2);font-weight:700' : 'color:var(--muted)'}">${l.t}</span>`
    )
    .join('<span style="color:var(--border)"> → </span>');
  document.getElementById('maturityBar').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem">
      <div><strong style="font-size:0.9rem">${t('maturityTitle')}</strong> <span class="maturity-tag">${m.label}</span></div>
      <div style="font-size:0.78rem;color:var(--muted)">${m.desc}</div>
    </div>
    <div style="margin-top:0.5rem;display:flex;flex-wrap:wrap;gap:0.25rem;align-items:center">${steps}</div>
  `;
}

function renderSnapshotHistory() {
  const el = document.getElementById('snapshotHistory');
  if (!state.snapshots.length) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  const rows = state.snapshots
    .slice()
    .reverse()
    .slice(0, 12)
    .map(
      s =>
        `<tr>
          <td>${s.month || s.date || '—'}</td>
          <td>${s.connectPct ?? '—'}%</td>
          <td>${s.humanBoundaryPct ?? '—'}%</td>
          <td>${s.maturity || '—'}</td>
          <td>${s.monthlyROI != null ? fmtMoney(s.monthlyROI) : '—'}</td>
        </tr>`
    )
    .join('');
  el.innerHTML = `
    <strong style="font-size:0.9rem">${t('snapshotTitle')}</strong>
    <table style="width:100%;margin-top:0.5rem;font-size:0.78rem;border-collapse:collapse">
      <thead><tr style="color:var(--muted);text-align:left">
        <th style="padding:0.25rem 0">${t('snapMonth')}</th><th>${t('snapAi')}</th><th>${t('snapHuman')}</th><th>${t('snapMaturity')}</th><th>${t('snapRoi')}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderRoiPanel(stats) {
  const catBars = Object.entries(stats.catStats)
    .map(([id, cs]) => {
      const cat = getFilteredCategories().find(c => c.id === id) || localizeCategory(getAllCategories().find(c => c.id === id) || { id, name: id, items: [] });
      const name = cat ? `${cat.icon || ''} ${cat.name}` : id;
      const color = cs.isHuman ? 'var(--warn)' : 'var(--accent)';
      return `<div class="cat-row">
        <span class="name">${name}</span>
        <span class="bar-wrap"><span class="bar" style="width:${cs.pct}%;background:${color}"></span></span>
        <span class="pct">${cs.pct}%</span>
      </div>`;
    })
    .join('');

  document.getElementById('roiPanel').innerHTML = `
    <h3>${t('roiTitle')}</h3>
    <div class="roi-grid">
      <div class="roi-item"><div class="label">${t('roiTotal')}</div><div class="val">${stats.grandTotal} ${t('itemsUnit')}</div></div>
      <div class="roi-item"><div class="label">${t('roiAiCover')}</div><div class="val" style="color:var(--accent2)">${stats.aiTotal} · ${stats.aiCoverablePct}% / ${stats.aiTimePct}%</div></div>
      <div class="roi-item"><div class="label">${t('roiHumanReq')}</div><div class="val" style="color:var(--warn)">${stats.humanTotal} · ${stats.humanRequiredPct}% / ${stats.humanTimePct}%</div></div>
      <div class="roi-item"><div class="label">${t('roiConnect')}</div><div class="val">${stats.connectPct}% / ${stats.humanBoundaryPct}%</div></div>
      <div class="roi-item"><div class="label">${t('roiTransform')}</div><div class="val">${stats.transformConnectPct}%</div></div>
      <div class="roi-item"><div class="label">${t('roiStar')}</div><div class="val" style="color:var(--star)">${stats.star} ${t('itemsUnit')}</div></div>
      <div class="roi-item"><div class="label">${t('roiMis')}</div><div class="val" style="color:var(--danger)">${stats.misCount} ${t('itemsUnit')}</div></div>
      <div class="roi-item"><div class="label">${t('roiPotential')}</div><div class="val">${fmtMoney(stats.potentialMonthly)}${t('perMonth')}</div></div>
      ${stats.hasRealSavings ? `<div class="roi-item"><div class="label">${t('roiReal')}</div><div class="val" style="color:var(--accent2)">${fmtMoney(stats.realMonthlyValue)}${t('perMonth')}</div></div>` : ''}
    </div>
    <div class="cat-bars">${catBars}</div>
    <p style="font-size:0.78rem;color:var(--muted);margin-top:1rem">
      ${t('roiFootAi')}<br>
      ${t('roiFootHuman')}<br>
      ${t('roiFootWeight')}
    </p>
  `;
}

function renderToolItem(item) {
  const loc = localizeItem(item);
  const checked = state.tools[item.id] ? 'checked' : '';
  const price = getToolPrice(item.id);
  const defaultPrice = DEFAULT_TOOL_PRICES[item.id] ?? 0;
  return `<label class="tool-item">
    <input type="checkbox" ${checked} onchange="toggleTool('${item.id}')" />
    <div>
      <div class="tool-name">${loc.title}<span class="tool-tag">${item.id}</span></div>
      <div class="tool-desc">${loc.problem || loc.tools || ''}</div>
      <div class="tool-price">${t('toolMonthly', { price })}${price !== defaultPrice ? t('toolDefault', { price: defaultPrice }) : ''}
        · <input type="number" min="0" value="${price}" style="width:56px;padding:0.15rem;font-size:0.7rem;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:4px" onchange="setToolPriceOverride('${item.id}', this.value)" onclick="event.preventDefault();event.stopPropagation()" /> ${t('toolYuan')}
      </div>
    </div>
  </label>`;
}

function renderItem(item) {
  if (item.isTool) return renderToolItem(item);

  const loc = localizeItem(item);
  const st = getItemStatus(item.id);
  const eff = getEffectiveItem(loc);
  const ov = state.overrides[item.id] || {};
  const labels = statusLabels(loc);
  const btns = labels
    .map(
      (label, i) =>
        `<button class="status-btn s${i} ${st === i ? 'active' : ''}" onclick="setItemStatus('${item.id}', ${i})">${label}</button>`
    )
    .join('');

  const freqLabel =
    eff.freq != null && eff.freq < 0.15
      ? t('freqPerMonth', { n: (eff.freq * 4.33).toFixed(1) })
      : t('freqPerWeek', { n: eff.freq || 0 });

  const descLine = loc.humanOnly
    ? `<div class="item-desc">${t('aiRole', { role: loc.aiRole || t('aiRoleDefault') })}</div>`
    : `<div class="item-desc">${t('baseline', { base: fmtMin(eff.base), now: fmtMin(eff.now), freq: freqLabel })}</div>`;

  const { saved, isReal } = weeklySavedForItem(eff, st);
  const hourly = parseFloat(document.getElementById('hourlyRate')?.value) || state.hourlyRate || 100;
  const monthlyVal = (saved / 60) * 4.33 * hourly;

  const estimateLine = loc.humanOnly
    ? `<div class="item-human-note">${st >= 1 ? t('boundaryOk') : t('boundaryWarn')} · ${loc.aiRole || ''}</div>`
    : `<div class="item-estimate">${t('estimate', { saved: saved.toFixed(0), real: isReal ? t('estimateReal') : '', money: fmtMoney(monthlyVal) })}</div>`;

  const calibrate = loc.humanOnly
    ? ''
    : `<div class="calibrate">
        ${t('calibrate')} <input type="number" min="0" value="${ov.base != null ? ov.base : eff.base}" onchange="setOverride('${item.id}','base',this.value)" /> ${t('minUnit')}
        ${t('calibrateNow')} <input type="number" min="0" value="${ov.now != null ? ov.now : eff.now}" onchange="setOverride('${item.id}','now',this.value)" /> ${t('minUnit')}
        ${t('calibrateActual')} <input type="number" min="0" placeholder="${t('calibratePerWeek')}" value="${ov.actualWeeklyMin != null ? ov.actualWeeklyMin : ''}" onchange="setOverride('${item.id}','actualWeeklyMin',this.value)" /> ${t('calibratePerWeek')}
      </div>`;

  const promptKey = loc.prompt || item.id;
  const promptLink = PROMPT_LINKS && PROMPT_LINKS[promptKey]
    ? `<div class="prompt-link"><a href="${PROMPT_LINKS[promptKey]}" target="_blank" rel="noopener">${t('promptLink')}</a></div>`
    : '';

  const catTag = loc._catName
    ? `<span class="item-mode mode-transform" style="margin-left:0">${loc._catIcon || ''} ${loc._catName}</span> `
    : '';

  const misDel = loc.humanOnly
    ? `<label style="display:flex;align-items:center;gap:0.35rem;margin-top:0.35rem;font-size:0.75rem;color:var(--danger);cursor:pointer">
        <input type="checkbox" ${state.misDelegation[item.id] ? 'checked' : ''} onchange="toggleMisDelegation('${item.id}')" style="width:auto" />
        ${t('misDelegation')}
      </label>`
    : '';

  return `<div class="item checked-${st}${loc.humanOnly ? ' item-human' : ''}">
    <div class="item-top">
      <span class="item-id">${item.id}</span>
      <div class="item-body">
        <div class="item-title">${catTag}${loc.title}${modeBadge(loc)}</div>
        ${descLine}
        <div class="item-problem">${loc.humanOnly ? t('reason') : t('solve')}：${loc.problem}</div>
        <div class="item-tools">${loc.humanOnly ? t('allow') : t('tools')}：${loc.tools}</div>
        ${promptLink}
        ${calibrate}
        ${estimateLine}
        ${misDel}
      </div>
      <div class="status-btns">${btns}</div>
    </div>
  </div>`;
}

function buildSectionHtml(c, isActive) {
  const isToolCat = c.items.length > 0 && c.items.every(i => i.isTool);
  const scene = c.items.filter(i => !i.isTool);
  const conn = isToolCat
    ? c.items.filter(i => state.tools[i.id]).length
    : scene.filter(i => getItemStatus(i.id) >= 1).length;
  const total = isToolCat ? c.items.length : scene.length;
  const meta = isToolCat
    ? t('toolOwned', { conn, total })
    : c.id === 'human'
      ? t('sectionBoundary', { conn, total, pct: total ? Math.round((conn / total) * 100) : 0 })
      : t('sectionConnect', { conn, total, pct: total ? Math.round((conn / total) * 100) : 0, desc: c.desc ? ' · ' + c.desc : '' });

  const body = isToolCat
    ? `<div class="tool-grid">${c.items.length ? c.items.map(renderItem).join('') : `<div class="empty-hint">${t('emptyTools')}</div>`}</div>`
    : c.items.length
      ? c.items.map(renderItem).join('')
      : c.id === 'custom'
        ? `<div class="empty-hint">${t('emptyCustom')}</div>`
        : c.id === 'myentry'
          ? `<div class="empty-hint">${t('emptyMyEntry')}<br><button class="btn btn-primary" style="margin-top:0.75rem" onclick="switchTab('allbuiltin')">${t('openAllBuiltin')}</button></div>`
          : c.id === 'allbuiltin'
            ? `<div class="empty-hint">${t('emptyAllBuiltin')}</div>`
          : `<div class="empty-hint">${t('emptySearch')}</div>`;

  return `<div class="section ${isActive ? 'active' : ''}" data-id="${c.id}">
    <div class="section-head">
      <h2>${c.icon || ''} ${c.name}</h2>
      <span class="section-meta">${meta}</span>
    </div>
    ${body}
  </div>`;
}

function render() {
  const stats = calcStats();
  renderDashboard(stats);
  renderMaturityBar(stats);
  renderSnapshotHistory();
  renderRoiPanel(stats);

  const cats = getFilteredCategories();
  let tabActive = document.getElementById('tabs')?.dataset.active || cats[0]?.id;
  if (!cats.some(c => c.id === tabActive) && cats.length) {
    tabActive = cats[0].id;
  }
  document.getElementById('tabs').dataset.active = tabActive;

  document.getElementById('legendAi').style.display = tabActive === 'human' ? 'none' : 'flex';
  document.getElementById('legendHuman').style.display = tabActive === 'human' ? 'flex' : 'none';

  document.getElementById('tabs').innerHTML = cats
    .map(c => {
      const scene = c.items.filter(i => !i.isTool);
      const isToolCat = scene.length === 0 && c.items.some(i => i.isTool);
      const conn = isToolCat
        ? c.items.filter(i => state.tools[i.id]).length
        : scene.filter(i => getItemStatus(i.id) >= 1).length;
      const total = isToolCat ? c.items.length : scene.length;
      const meta = `${conn}/${total}`;
      const cls = c.id === tabActive ? 'tab active' : 'tab';
      return `<button class="${cls}" onclick="switchTab('${c.id}')">${c.icon || ''} ${c.name}<span class="badge">${meta}</span></button>`;
    })
    .join('');

  const activeCat = cats.find(c => c.id === tabActive) || cats[0];

  document.getElementById('sections').innerHTML = activeCat
    ? buildSectionHtml(activeCat, true)
    : `<div class="empty-hint">${t('emptySearch')}</div>`;

  requestAnimationFrame(() => {
    const activeTab = document.querySelector(`.tab.active`);
    activeTab?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  });
}

function switchTab(id) {
  document.getElementById('tabs').dataset.active = id;
  render();
  document.querySelector('.tabs-sticky')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setItemStatus(id, st) {
  state.items[id] = st;
  saveState();
  render();
}

function toggleTool(id) {
  state.tools[id] = !state.tools[id];
  if (state.autoCost) {
    state.monthlyCost = calcAutoMonthlyCost();
    const el = document.getElementById('monthlyCost');
    if (el) el.value = state.monthlyCost;
  }
  saveState();
  render();
}

function setOverride(id, field, value) {
  if (!state.overrides[id]) state.overrides[id] = {};
  if (value === '' || value == null) {
    delete state.overrides[id][field];
    if (!Object.keys(state.overrides[id]).length) delete state.overrides[id];
  } else {
    state.overrides[id][field] = Number(value);
  }
  saveState();
  render();
}

function setToolPriceOverride(id, value) {
  if (value === '' || value == null) {
    delete state.toolPriceOverrides[id];
  } else {
    state.toolPriceOverrides[id] = Number(value) || 0;
  }
  if (state.autoCost) {
    state.monthlyCost = calcAutoMonthlyCost();
    const el = document.getElementById('monthlyCost');
    if (el) el.value = state.monthlyCost;
  }
  saveState();
  render();
}

function toggleMisDelegation(id) {
  state.misDelegation[id] = !state.misDelegation[id];
  saveState();
  render();
}

function addCustomItem() {
  if (!ENABLE_CUSTOM) return;
  const title = document.getElementById('customTitle')?.value?.trim();
  if (!title) {
    alert(t('customNameRequired'));
    return;
  }
  const type = document.getElementById('customType')?.value || 'ai';
  const base = Number(document.getElementById('customBase')?.value) || 60;
  const now = Number(document.getElementById('customNow')?.value) || 15;
  const freq = Number(document.getElementById('customFreq')?.value) || 1;
  const tools = document.getElementById('customTools')?.value?.trim() || '';
  const id = 'C' + Date.now().toString(36).toUpperCase();
  state.customItems.push({ id, title, type, base, now, freq, tools, problem: '自定义：' + title });
  state.items[id] = 2;
  document.getElementById('customTitle').value = '';
  document.getElementById('customTools').value = '';
  saveState();
  document.getElementById('tabs').dataset.active = 'custom';
  render();
  alert(t('customAdded', { title }));
}

function setLang(lang) {
  state.lang = lang === 'en' ? 'en' : 'zh';
  setI18nLang(state.lang);
  saveState();
  applyStaticI18n();
  render();
  if (document.getElementById('onboardModal')?.style.display === 'flex') {
    renderOnboardStep();
  }
}

function toggleEntryMode(on) {
  state.entryMode = on;
  document.body.classList.toggle('entry-mode', !!on);
  const el = document.getElementById('entryMode');
  if (el) el.checked = !!on;
  saveState();
  render();
}

function checkLoadError() {
  const el = document.getElementById('loadError');
  if (!el) return;
  if (typeof CATEGORIES === 'undefined') {
    el.style.display = 'block';
    el.innerHTML = `<strong>${t('loadErrorTitle')}</strong><br>${t('loadErrorBody')}`;
  } else {
    el.style.display = 'none';
  }
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ai-audit-checklist-v5-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        state = { ...defaultState(), ...data };
        saveState();
        syncFormFromState();
        render();
        alert(t('importOk'));
      } catch (err) {
        alert(t('importFail') + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function resetAll() {
  if (!confirm(t('resetConfirm'))) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY_V4);
  state = defaultState();
  syncFormFromState();
  saveState();
  render();
}

function exportMarkdownReport() {
  const stats = calcStats();
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const statusArr = getStatusLabelsArr();
  const topAi = getAllSceneItems()
    .filter(i => !i.humanOnly && getItemStatus(i.id) >= 1)
    .map(i => {
      const st = getItemStatus(i.id);
      const loc = localizeItem(i);
      const { saved } = weeklySavedForItem(i, st);
      return { ...loc, saved, st };
    })
    .sort((a, b) => b.saved - a.saved)
    .slice(0, 10);

  const topGap = getAllSceneItems()
    .filter(i => !i.humanOnly && getItemStatus(i.id) === 0)
    .map(i => localizeItem(i))
    .sort((a, b) => (b.base - b.now) * b.freq - ((a.base - a.now) * a.freq))
    .slice(0, 5);

  const humanGap = getAllSceneItems()
    .filter(i => i.humanOnly && getItemStatus(i.id) === 0)
    .map(i => localizeItem(i))
    .slice(0, 5);

  const misList = Object.entries(state.misDelegation)
    .filter(([, v]) => v)
    .map(([id]) => {
      const raw = getAllSceneItems().find(i => i.id === id);
      const item = raw ? localizeItem(raw) : null;
      return item ? `- **${id}** ${item.title}` : `- **${id}**`;
    });

  let md = `# ${t('mdTitle')}

> ${t('mdExported')}：${dateStr} · ${t('mdMaturity')} **${stats.maturity.label}** · v5 · ${getLang() === 'en' ? 'EN' : '中文'}

## ${t('mdSec1')}

| ${t('mdMetric')} | ${t('mdValue')} |
|------|------|
| ${t('roiTotal')} | ${stats.grandTotal} |
| ${t('roiAiCover')} | ${stats.aiTotal} (${stats.aiCoverablePct}%) · ${stats.aiTimePct}% |
| ${t('roiHumanReq')} | ${stats.humanTotal} (${stats.humanRequiredPct}%) · ${stats.humanTimePct}% |
| AI ${t('dashAiConnect')} | ${stats.connectPct}% (${stats.connected}/${stats.aiTotal}) |
| ${t('dashHumanBoundary')} | ${stats.humanBoundaryPct}% (${stats.humanAck}/${stats.humanTotal}) |
| ${t('dashRegular')} | ${stats.regularPct}% |
| ${t('roiStar')} | ${stats.star} |
| ${t('roiTransform')} | ${stats.transformConnectPct}% |
| ${t('dashTools')} | ${stats.toolsOwned}/${stats.toolTotal} (${stats.toolPct}%) |

## ${t('mdSec2')}

| ${t('mdItem')} | ${t('mdAmount')} |
|------|------|
| ${t('mdHourly')} | ¥${stats.hourly}/h |
| ${t('mdSub')} | ${fmtMoney(stats.monthlyCost)}${state.autoCost ? t('mdSubAuto') : ''} |
| ${t('mdRisk')} | ${fmtMoney(stats.riskCost)} |
| ${t('mdMonthlyValue')} | ${fmtMoney(stats.monthlyValue)} |
${stats.hasRealSavings ? `| ${t('mdRealValue')} | ${fmtMoney(stats.realMonthlyValue)} |\n` : ''}| **${t('mdMonthlyRoi')}** | **${fmtMoney(stats.monthlyROI)}** |
| ${t('mdRatio')} | ${stats.roiRatio}x |
| ${t('mdPotential')} | ${fmtMoney(stats.potentialMonthly)}${t('perMonth')} |

## ${t('mdSec3')}

- **${t('mdLevel')}**：${stats.maturity.label}
- **${t('mdDesc')}**：${stats.maturity.desc}

## ${t('mdSec4')}

${topAi.length ? topAi.map((i, n) => `${n + 1}. **${i.id}** ${i.title} — ${t('mdSaved', { n: i.saved.toFixed(0), st: statusArr[i.st] })}`).join('\n') : t('mdNone')}

## ${t('mdSec5')}

${topGap.length ? topGap.map((i, n) => `${n + 1}. **${i.id}** ${i.title} — ${t('mdPotentialItem', { n: fmtMin((i.base - i.now) * i.freq) })}`).join('\n') : t('mdAllConnected')}

## ${t('mdSec6')}

${humanGap.length ? humanGap.map((i, n) => `${n + 1}. **${i.id}** ${i.title}`).join('\n') : t('mdAllBoundary')}

## ${t('mdSec7')}

${misList.length ? misList.join('\n') : t('mdNoMis')}

## ${t('mdSec8')}

${Object.entries(stats.catStats)
  .map(([id, cs]) => {
    const cat = localizeCategory(getAllCategories().find(c => c.id === id) || { id, name: id, items: [] });
    return `- ${cat.name}：${cs.connected}/${cs.total}（${cs.pct}%）`;
  })
  .join('\n')}

---

${t('mdFooter')}
`;

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ai-audit-report-${dateStr}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function saveMonthlySnapshot() {
  const stats = calcStats();
  const month = new Date().toISOString().slice(0, 7);
  const snap = {
    month,
    date: new Date().toISOString(),
    connectPct: stats.connectPct,
    humanBoundaryPct: stats.humanBoundaryPct,
    regularPct: stats.regularPct,
    maturity: stats.maturity.label,
    monthlyROI: stats.monthlyROI,
    monthlyValue: stats.monthlyValue,
    aiCoverablePct: stats.aiCoverablePct,
  };
  state.snapshots = state.snapshots.filter(s => s.month !== month);
  state.snapshots.push(snap);
  saveState();
  renderSnapshotHistory();
  alert(t('snapshotSaved', { month }));
}

function getOnboardContent() {
  return [
    {
      title: t('ob1Title'),
      html: `<p style="font-size:0.88rem;color:var(--muted);line-height:1.6">${t('ob1Html')}</p>
        <p style="font-size:0.85rem;margin-top:0.5rem">${t('ob1Sub')}</p>`,
    },
    {
      title: t('ob2Title'),
      html: `<p style="font-size:0.88rem;color:var(--muted);line-height:1.6">${t('ob2Html')}</p>
        <p style="font-size:0.85rem;margin-top:0.5rem">${t('ob2Sub')}</p>`,
      tab: 'human',
    },
    {
      title: t('ob3Title'),
      html: `<p style="font-size:0.88rem;color:var(--muted);line-height:1.6">${t('ob3Html')}</p>
        <p style="font-size:0.85rem;margin-top:0.5rem">${t('ob3Sub')}</p>`,
      tab: 'office',
    },
  ];
}

function showOnboarding() {
  state.onboardStep = 0;
  document.getElementById('onboardModal').style.display = 'flex';
  renderOnboardStep();
}

function closeOnboarding() {
  state.onboardingDone = true;
  document.getElementById('onboardModal').style.display = 'none';
  saveState();
}

function renderOnboardStep() {
  const steps = getOnboardContent();
  const step = steps[state.onboardStep] || steps[0];
  document.getElementById('onboardStep').innerHTML = `<h3 style="font-size:1rem;margin-bottom:0.5rem">${step.title}</h3>${step.html}`;
  const btn = document.getElementById('onboardNext');
  if (btn) {
    btn.textContent = state.onboardStep >= steps.length - 1 ? t('done') : t('next');
  }
  if (step.tab) {
    document.getElementById('tabs').dataset.active = step.tab;
    render();
  }
}

function nextOnboarding() {
  const steps = getOnboardContent();
  if (state.onboardStep < steps.length - 1) {
    state.onboardStep++;
    saveState();
    renderOnboardStep();
  } else {
    closeOnboarding();
  }
}

function syncFormFromState() {
  const map = {
    hourlyRate: state.hourlyRate,
    monthlyCost: state.autoCost ? calcAutoMonthlyCost() : state.monthlyCost,
    riskCost: state.riskCost,
    autoCost: state.autoCost,
    workType: state.workType,
    searchBox: state.searchQuery,
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!val;
    else el.value = val;
  });
  if (state.autoCost) state.monthlyCost = calcAutoMonthlyCost();
}

let searchRenderTimer;

function bindSettings() {
  document.getElementById('hourlyRate')?.addEventListener('input', e => {
    state.hourlyRate = parseFloat(e.target.value) || 100;
    saveState();
    render();
  });

  document.getElementById('monthlyCost')?.addEventListener('input', e => {
    if (state.autoCost) return;
    state.monthlyCost = parseFloat(e.target.value) || 0;
    saveState();
    render();
  });

  document.getElementById('riskCost')?.addEventListener('input', e => {
    state.riskCost = parseFloat(e.target.value) || 0;
    saveState();
    render();
  });

  document.getElementById('autoCost')?.addEventListener('change', e => {
    state.autoCost = e.target.checked;
    if (state.autoCost) {
      state.monthlyCost = calcAutoMonthlyCost();
      const el = document.getElementById('monthlyCost');
      if (el) el.value = state.monthlyCost;
    }
    saveState();
    render();
  });

  document.getElementById('workType')?.addEventListener('change', e => {
    state.workType = e.target.value;
    saveState();
    render();
  });

  document.getElementById('searchBox')?.addEventListener('input', e => {
    state.searchQuery = e.target.value;
    saveState();
    clearTimeout(searchRenderTimer);
    searchRenderTimer = setTimeout(render, 180);
  });
}

function init() {
  checkLoadError();
  if (typeof CATEGORIES === 'undefined') return;
  loadState();
  setI18nLang(state.lang || 'zh');
  applyStaticI18n();
  syncFormFromState();
  bindSettings();
  document.body.classList.toggle('entry-mode', !!state.entryMode);
  const em = document.getElementById('entryMode');
  if (em) em.checked = !!state.entryMode;
  if (!document.getElementById('tabs').dataset.active) {
    document.getElementById('tabs').dataset.active = 'allbuiltin';
  }
  render();
  if (!state.onboardingDone) showOnboarding();
}

document.addEventListener('DOMContentLoaded', init);

window.exportMarkdownReport = exportMarkdownReport;
window.saveMonthlySnapshot = saveMonthlySnapshot;
window.exportData = exportData;
window.importData = importData;
window.showOnboarding = showOnboarding;
window.closeOnboarding = closeOnboarding;
window.nextOnboarding = nextOnboarding;
window.resetAll = resetAll;
window.addCustomItem = addCustomItem;
window.switchTab = switchTab;
window.setItemStatus = setItemStatus;
window.toggleTool = toggleTool;
window.toggleEntryMode = toggleEntryMode;
window.setOverride = setOverride;
window.setToolPriceOverride = setToolPriceOverride;
window.toggleMisDelegation = toggleMisDelegation;
window.setLang = setLang;
