(() => {
  'use strict';

  const STORAGE_KEY = 'china_delivery_calc_v1';
  const DEFAULT_RATE = 455;
  const DEFAULT_FEE_PERCENT = 21;
  const DEFAULT_CITY_ID = 'shymkent';

  const CITIES = [
    { id: 'shymkent', name: 'Шымкент', base: 4.29, bulk: 3.59 },
    { id: 'almaty', name: 'Алматы (город и область)', base: 4.09, bulk: 3.29 },
    { id: 'astana', name: 'Астана', base: 4.49, bulk: 3.59 },
    { id: 'karaganda', name: 'Караганда', base: 4.49, bulk: 3.59 },
    { id: 'taraz', name: 'Тараз', base: 4.29, bulk: 3.69 },
    { id: 'aktobe', name: 'Актобе', base: 4.59, bulk: 3.69 },
    { id: 'aktau', name: 'Актау', base: 4.59, bulk: 3.69 },
    { id: 'zhezkazgan', name: 'Жезказган', base: 4.49, bulk: 3.69 },
    { id: 'turkestan', name: 'Туркестан', base: 4.29, bulk: 3.59 },
    { id: 'kyzylorda', name: 'Кызылорда', base: 4.39, bulk: 3.69 },
    { id: 'taldykorgan', name: 'Талдыкорган', base: 4.29, bulk: 3.49 },
    { id: 'pavlodar', name: 'Павлодар', base: 4.49, bulk: 3.59 },
    { id: 'ekibastuz', name: 'Экибастуз', base: 4.49, bulk: 3.59 },
    { id: 'semey', name: 'Семей', base: 4.49, bulk: 3.69 },
    { id: 'oskemen', name: 'Усть-Каменогорск', base: 4.49, bulk: 3.69 },
    { id: 'kokshetau', name: 'Кокшетау', base: 4.49, bulk: 3.59 },
    { id: 'kostanay', name: 'Костанай', base: 4.59, bulk: 3.69 },
    { id: 'petropavl', name: 'Петропавловск', base: 4.59, bulk: 3.69 },
    { id: 'atyrau', name: 'Атырау', base: 4.59, bulk: 3.69 },
    { id: 'uralsk', name: 'Уральск', base: 4.59, bulk: 3.69 },
    { id: 'zhanaozen', name: 'Жанаозен', base: 4.59, bulk: 3.69 },
    { id: 'balkhash', name: 'Балхаш', base: 4.49, bulk: 3.69 },
    { id: 'temirtau', name: 'Темиртау', base: 4.49, bulk: 3.59 },
    { id: 'satpayev', name: 'Сатпаев', base: 4.49, bulk: 3.69 }
  ];

  const dom = {
    priceInput: document.getElementById('priceInput'),
    weightInput: document.getElementById('weightInput'),
    citySelect: document.getElementById('citySelect'),
    rateInput: document.getElementById('rateInput'),
    feePercentInput: document.getElementById('feePercentInput'),
    customRateUsdInput: document.getElementById('customRateUsdInput'),
    refreshRateBtn: document.getElementById('refreshRateBtn'),
    presetExampleRateBtn: document.getElementById('presetExampleRateBtn'),
    resetSettingsBtn: document.getElementById('resetSettingsBtn'),
    rateStatus: document.getElementById('rateStatus'),
    rateUpdatedHint: document.getElementById('rateUpdatedHint'),
    headerRateBadge: document.getElementById('headerRateBadge'),
    settingsSummaryMeta: document.getElementById('settingsSummaryMeta'),
    janaCard: document.getElementById('janaCard'),
    janaWinnerBadge: document.getElementById('janaWinnerBadge'),
    janaTotal: document.getElementById('janaTotal'),
    janaBreakdown: document.getElementById('janaBreakdown'),
    janaTariffNote: document.getElementById('janaTariffNote'),
    freeCard: document.getElementById('freeCard'),
    freeWinnerBadge: document.getElementById('freeWinnerBadge'),
    freeTotal: document.getElementById('freeTotal'),
    freeBreakdown: document.getElementById('freeBreakdown'),
    summaryHeadline: document.getElementById('summaryHeadline'),
    breakEvenNote: document.getElementById('breakEvenNote'),
    installBtn: document.getElementById('installBtn')
  };

  let state = {
    price: '2000',
    weight: '1,5',
    cityId: DEFAULT_CITY_ID,
    rate: DEFAULT_RATE,
    rateMode: 'auto', // 'auto' | 'manual'
    rateFetchedAt: null,
    feePercent: String(DEFAULT_FEE_PERCENT),
    customRateUsd: ''
  };

  let deferredInstallPrompt = null;

  function parseNumber(raw) {
    if (raw === null || raw === undefined) return 0;
    const normalized = String(raw)
      .replace(/\s+/g, '')
      .replace(',', '.')
      .replace(/[^0-9.]/g, '');
    if (!normalized) return 0;
    const parts = normalized.split('.');
    const safe = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : normalized;
    const num = Number.parseFloat(safe);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  }

  function formatKzt(value) {
    const rounded = Math.round(value);
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  }

  function formatRateDisplay(rateNum) {
    const rounded = Math.round(rateNum * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
  }

  function populateCities() {
    const fragment = document.createDocumentFragment();
    for (const city of CITIES) {
      const option = document.createElement('option');
      option.value = city.id;
      option.textContent = `${city.name} — $${city.base.toFixed(2)}/кг (от 10 кг $${city.bulk.toFixed(2)})`;
      fragment.appendChild(option);
    }
    dom.citySelect.appendChild(fragment);
  }

  function getSelectedCity() {
    return CITIES.find((c) => c.id === state.cityId) || CITIES[0];
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.price === 'string') state.price = parsed.price;
        if (typeof parsed.weight === 'string') state.weight = parsed.weight;
        if (typeof parsed.cityId === 'string' && CITIES.some((c) => c.id === parsed.cityId)) {
          state.cityId = parsed.cityId;
        }
        if (typeof parsed.rate === 'number' && parsed.rate > 0) state.rate = parsed.rate;
        if (parsed.rateMode === 'auto' || parsed.rateMode === 'manual') state.rateMode = parsed.rateMode;
        if (typeof parsed.rateFetchedAt === 'string' || parsed.rateFetchedAt === null) {
          state.rateFetchedAt = parsed.rateFetchedAt;
        }
        if (typeof parsed.feePercent === 'string') state.feePercent = parsed.feePercent;
        if (typeof parsed.customRateUsd === 'string') state.customRateUsd = parsed.customRateUsd;
      }
    } catch {
      // Ignore storage read errors
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage write errors
    }
  }

  function syncInputsFromState() {
    dom.priceInput.value = state.price;
    dom.weightInput.value = state.weight;
    dom.citySelect.value = state.cityId;
    dom.rateInput.value = formatRateDisplay(state.rate);
    dom.feePercentInput.value = state.feePercent;
    dom.customRateUsdInput.value = state.customRateUsd;
  }

  function updateRateStatusUI(statusType, message) {
    dom.rateStatus.className = 'rate-status';
    if (statusType === 'ok') {
      dom.rateStatus.classList.add('rate-status--ok');
    } else if (statusType === 'warn') {
      dom.rateStatus.classList.add('rate-status--warn');
    }
    dom.rateStatus.textContent = message;

    if (state.rateMode === 'auto' && state.rateFetchedAt) {
      const dt = new Date(state.rateFetchedAt);
      if (!Number.isNaN(dt.getTime())) {
        const timeStr = dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const dateStr = dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        dom.rateUpdatedHint.textContent = `Обновлено ${dateStr} в ${timeStr}`;
        return;
      }
    }
    dom.rateUpdatedHint.textContent = '';
  }

  function render() {
    const price = parseNumber(state.price);
    const weight = parseNumber(state.weight);
    const rate = state.rate > 0 ? state.rate : DEFAULT_RATE;
    const feePercent = parseNumber(state.feePercent);
    const customRate = parseNumber(state.customRateUsd);
    const city = getSelectedCity();

    const isCustomRate = customRate > 0;
    const isBulkWeight = !isCustomRate && weight >= 10;
    const rateUsd = isCustomRate ? customRate : (isBulkWeight ? city.bulk : city.base);

    const priceRounded = Math.round(price);
    const deliveryKzt = Math.round(weight * rateUsd * rate);
    const totalJana = priceRounded + deliveryKzt;

    const feesKzt = Math.round(price * (feePercent / 100));
    const totalFree = priceRounded + feesKzt;

    // Header & settings meta badges
    const rateDisplay = formatRateDisplay(rate);
    const feeDisplay = formatRateDisplay(feePercent);
    dom.headerRateBadge.textContent = `$1 = ${rateDisplay} ₸`;
    dom.settingsSummaryMeta.textContent = `${rateDisplay} ₸/$ · ${feeDisplay}%`;

    // Jana Post card
    dom.janaTotal.textContent = `${formatKzt(totalJana)} ₸`;
    dom.janaBreakdown.textContent = `товар ${formatKzt(priceRounded)} ₸ + доставка ${formatKzt(deliveryKzt)} ₸`;

    if (isCustomRate) {
      dom.janaTariffNote.hidden = false;
      dom.janaTariffNote.textContent = `Свой тариф: $${rateUsd.toFixed(2)}/кг`;
    } else if (isBulkWeight) {
      dom.janaTariffNote.hidden = false;
      dom.janaTariffNote.textContent = `Оптовый тариф от 10 кг: $${city.bulk.toFixed(2)}/кг`;
    } else {
      dom.janaTariffNote.hidden = true;
    }

    // Official free delivery card
    dom.freeTotal.textContent = `${formatKzt(totalFree)} ₸`;
    dom.freeBreakdown.textContent = `товар ${formatKzt(priceRounded)} ₸ + НДС и комиссии ${formatKzt(feesKzt)} ₸`;

    // Winner highlighting & comparison text
    dom.janaCard.classList.remove('result-option--winner');
    dom.freeCard.classList.remove('result-option--winner');
    dom.janaWinnerBadge.hidden = true;
    dom.freeWinnerBadge.hidden = true;

    if (totalFree < totalJana) {
      dom.freeCard.classList.add('result-option--winner');
      dom.freeWinnerBadge.hidden = false;
      const diff = totalJana - totalFree;
      const pct = totalJana > 0 ? ((diff / totalJana) * 100).toFixed(1).replace('.', ',') : '0,0';
      dom.summaryHeadline.textContent = `Бесплатная доставка выгоднее на ${formatKzt(diff)} ₸ (${pct}%)`;
    } else if (totalJana < totalFree) {
      dom.janaCard.classList.add('result-option--winner');
      dom.janaWinnerBadge.hidden = false;
      const diff = totalFree - totalJana;
      const pct = totalFree > 0 ? ((diff / totalFree) * 100).toFixed(1).replace('.', ',') : '0,0';
      dom.summaryHeadline.textContent = `Jana Post выгоднее на ${formatKzt(diff)} ₸ (${pct}%)`;
    } else {
      dom.summaryHeadline.textContent = `Оба варианта стоят одинаково — ${formatKzt(totalJana)} ₸`;
    }

    // Break-even weight calculation
    const feesExact = price * (feePercent / 100);
    if (price <= 0) {
      dom.breakEvenNote.textContent = 'Введите цену товара, чтобы увидеть порог выгодного веса.';
    } else if (feesExact <= 0) {
      dom.breakEvenNote.textContent = `Для цены ${formatKzt(priceRounded)} ₸ при комиссии 0% бесплатная доставка всегда выгоднее.`;
    } else if (isCustomRate) {
      const be = feesExact / (customRate * rate);
      dom.breakEvenNote.textContent = `Для цены ${formatKzt(priceRounded)} ₸ Jana Post выгоднее, если вес меньше ${be.toFixed(2)} кг.`;
    } else {
      const wBase = feesExact / (city.base * rate);
      const wBulk = feesExact / (city.bulk * rate);
      if (wBase < 10 && wBulk <= 10) {
        dom.breakEvenNote.textContent = `Для цены ${formatKzt(priceRounded)} ₸ Jana Post выгоднее, если вес меньше ${wBase.toFixed(2)} кг.`;
      } else if (wBase >= 10) {
        dom.breakEvenNote.textContent = `Для цены ${formatKzt(priceRounded)} ₸ Jana Post выгоднее, если вес меньше ${wBulk.toFixed(2)} кг.`;
      } else {
        dom.breakEvenNote.textContent = `Для цены ${formatKzt(priceRounded)} ₸ Jana Post выгоднее, если вес меньше ${wBase.toFixed(2)} кг (или от 10 до ${wBulk.toFixed(2)} кг).`;
      }
    }
  }

  async function fetchLiveRate(force) {
    if (!force && state.rateMode !== 'auto') {
      return;
    }

    dom.refreshRateBtn.disabled = true;
    updateRateStatusUI('info', 'обновление...');

    const endpoints = [
      async () => {
        const res = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const kzt = data && data.rates && data.rates.KZT;
        if (typeof kzt !== 'number' || kzt <= 0) throw new Error('Invalid KZT rate');
        return kzt;
      },
      async () => {
        const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const kzt = data && data.usd && data.usd.kzt;
        if (typeof kzt !== 'number' || kzt <= 0) throw new Error('Invalid KZT rate');
        return kzt;
      }
    ];

    for (const loadFromEndpoint of endpoints) {
      try {
        const kzt = await loadFromEndpoint();
        state.rate = Math.round(kzt * 100) / 100;
        state.rateMode = 'auto';
        state.rateFetchedAt = new Date().toISOString();
        dom.rateInput.value = formatRateDisplay(state.rate);
        updateRateStatusUI('ok', 'автокурс');
        saveState();
        render();
        dom.refreshRateBtn.disabled = false;
        return;
      } catch {
        // Try fallback endpoint
      }
    }

    updateRateStatusUI('warn', 'офлайн (кэш)');
    dom.refreshRateBtn.disabled = false;
  }

  function attachEvents() {
    dom.priceInput.addEventListener('input', (e) => {
      state.price = e.target.value;
      saveState();
      render();
    });

    dom.weightInput.addEventListener('input', (e) => {
      state.weight = e.target.value;
      saveState();
      render();
    });

    dom.citySelect.addEventListener('change', (e) => {
      state.cityId = e.target.value;
      saveState();
      render();
    });

    dom.rateInput.addEventListener('input', (e) => {
      const val = parseNumber(e.target.value);
      state.rateMode = 'manual';
      if (val > 0) {
        state.rate = val;
      }
      updateRateStatusUI('info', 'ручной курс');
      saveState();
      render();
    });

    dom.rateInput.addEventListener('blur', () => {
      const val = parseNumber(dom.rateInput.value);
      if (val <= 0) {
        state.rate = DEFAULT_RATE;
        dom.rateInput.value = String(DEFAULT_RATE);
        saveState();
        render();
      }
    });

    dom.feePercentInput.addEventListener('input', (e) => {
      state.feePercent = e.target.value;
      saveState();
      render();
    });

    dom.customRateUsdInput.addEventListener('input', (e) => {
      state.customRateUsd = e.target.value;
      saveState();
      render();
    });

    dom.refreshRateBtn.addEventListener('click', () => {
      state.rateMode = 'auto';
      saveState();
      fetchLiveRate(true);
    });

    dom.presetExampleRateBtn.addEventListener('click', () => {
      state.rate = DEFAULT_RATE;
      state.rateMode = 'manual';
      dom.rateInput.value = String(DEFAULT_RATE);
      updateRateStatusUI('info', 'фиксированный (455 ₸)');
      saveState();
      render();
    });

    dom.resetSettingsBtn.addEventListener('click', () => {
      state.cityId = DEFAULT_CITY_ID;
      state.rate = DEFAULT_RATE;
      state.rateMode = 'auto';
      state.rateFetchedAt = null;
      state.feePercent = String(DEFAULT_FEE_PERCENT);
      state.customRateUsd = '';
      syncInputsFromState();
      saveState();
      render();
      fetchLiveRate(true);
    });

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      dom.installBtn.hidden = false;
    });

    dom.installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      dom.installBtn.hidden = true;
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      dom.installBtn.hidden = true;
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  }

  function init() {
    populateCities();
    loadState();
    syncInputsFromState();

    if (state.rateMode === 'manual') {
      updateRateStatusUI('info', state.rate === DEFAULT_RATE ? 'фиксированный (455 ₸)' : 'ручной курс');
    } else if (state.rateFetchedAt) {
      updateRateStatusUI('ok', 'автокурс');
    } else {
      updateRateStatusUI('info', 'по умолчанию');
    }

    render();
    attachEvents();
    registerServiceWorker();

    if (state.rateMode === 'auto') {
      fetchLiveRate(false);
    }
  }

  init();
})();
