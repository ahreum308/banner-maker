// ==========================================
// SNS Banner Maker - App Controller
// ==========================================

(function() {
  'use strict';

  let nextBlockId = 10;
  let nextImageId = 10;
  let nextBenefitId = 10;

  // ========== 이미지 압축 유틸 ==========
  function compressImage(dataUrl, maxSize, quality) {
    maxSize = maxSize || 400;
    quality = quality || 0.7;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  // Pages system: multiple pages per template
  // Instagram (mainPage) has 4 fixed pages: 메인/결제혜택/사은품/이벤트
  // detailPage and popupBanner are auto-generated composites from Instagram pages
  const pages = { mainPage: [], freeForm: [] };
  const currentPageIdx = { mainPage: 0, freeForm: 0 };

  // ========== 추천 컬러 세트 (10가지) ==========
  let COLOR_THEMES = [
    { name: '차콜',      bg: '#2D2D2D', text: '#D0D0D0', title: '#FF6B5A', accent: '#FF6B5A' },
    { name: '슬레이트',  bg: '#4A4E54', text: '#CCCCCC', title: '#7ECFC0', accent: '#7ECFC0' },
    { name: '웜그레이',  bg: '#8C8578', text: '#F0EBE3', title: '#FFD2A8', accent: '#E8956D' },
    { name: '실버',      bg: '#E0E0E0', text: '#555555', title: '#4A6AE8', accent: '#5B7FFF' },
    { name: '아이보리',  bg: '#F5F0E8', text: '#7A7068', title: '#C76A4A', accent: '#C76A4A' },
    { name: '파스텔블루', bg: '#D6E6F2', text: '#5A6A7B', title: '#D4503E', accent: '#E87461' },
    { name: '파스텔핑크', bg: '#F4DEDE', text: '#8A6A6A', title: '#2D5A7B', accent: '#2D5A7B' },
    { name: '파스텔민트', bg: '#D4EDDA', text: '#4A6B52', title: '#B8623E', accent: '#D4764E' },
    { name: '라벤더',    bg: '#E4DAF0', text: '#6B5F80', title: '#9B59B6', accent: '#D4A03C' },
    { name: '스노우',    bg: '#FAFAFA', text: '#888888', title: '#E84D3D', accent: '#E84D3D' },
  ];

  // ========== 랜덤 컬러 세트 생성 ==========
  const THEME_NAMES = [
    '코랄', '민트', '체리', '바이올렛', '오션', '선셋', '모카', '올리브', '로즈', '스카이',
    '블러쉬', '포레스트', '머스타드', '인디고', '피치', '세이지', '루비', '사파이어', '앰버', '제이드',
    '플럼', '시트러스', '마젠타', '토프', '테라코타', '에메랄드', '버건디', '아쿠아', '샌드', '네이비',
    '카키', '크림', '탄저린', '라즈베리', '틸', '마룬', '샴페인', '코발트', '사이프러스', '하늘'
  ];

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
  }

  function generateRandomColorThemes() {
    const themes = [];
    const usedNames = new Set();
    for (let i = 0; i < 10; i++) {
      const hue = Math.floor(Math.random() * 360);
      const isDark = Math.random() < 0.4;
      let bg, text, title, accent;
      if (isDark) {
        const bgL = 10 + Math.random() * 20;
        bg = hslToHex(hue, 15 + Math.random() * 30, bgL);
        text = hslToHex(hue, 5 + Math.random() * 15, 75 + Math.random() * 15);
        const accentHue = (hue + 120 + Math.random() * 120) % 360;
        title = hslToHex(accentHue, 55 + Math.random() * 35, 55 + Math.random() * 20);
        accent = hslToHex(accentHue, 55 + Math.random() * 35, 50 + Math.random() * 20);
      } else {
        const bgL = 85 + Math.random() * 12;
        bg = hslToHex(hue, 15 + Math.random() * 40, bgL);
        text = hslToHex(hue, 10 + Math.random() * 25, 30 + Math.random() * 20);
        const accentHue = (hue + 150 + Math.random() * 60) % 360;
        title = hslToHex(accentHue, 50 + Math.random() * 40, 40 + Math.random() * 20);
        accent = hslToHex(accentHue, 50 + Math.random() * 40, 45 + Math.random() * 15);
      }
      let name;
      do { name = THEME_NAMES[Math.floor(Math.random() * THEME_NAMES.length)]; } while (usedNames.has(name));
      usedNames.add(name);
      themes.push({ name, bg, text, title, accent });
    }
    COLOR_THEMES = themes;
  }

  const state = {
    currentTemplate: 'mainPage',
    currentSize: 'instagram-post',
    customWidth: 1080,
    customHeight: 1080,
    data: {},
    textBlocks: [],
    images: [],
    benefits: [],
    brandImage: null,
    brandType: 'image',
    brandPosition: 'top-center',
    brandFontSize: 14,
    brandLogoHeight: 60,
    brandOffset: { top: 0, bottom: 0, left: 0, right: 0 },
    headlinePosition: 'top-center',
    headlineOffset: { top: 0, bottom: 0, left: 0, right: 0 },
    basicInfoMode: true,
    biBrandImage: null,
    biSelectedBrandId: null,
    biSelectedLogoId: null,
    biBrandLogoHeight: 60,
    currentBrandLogoId: null,
    biActiveTab: 0,
    biTabs: [
      { id: 'payment', title: '결제혜택', labelPrefix: '혜택', cardHeight: 0, benefits: [
        { title: '', detail: '', point: '' },
        { title: '', detail: '', point: '' },
        { title: '', detail: '', point: '' }
      ]},
      { id: 'gift', title: '사은품', labelPrefix: '사은품', cardHeight: 0, benefits: [
        { title: '', detail: '', point: '' },
        { title: '', detail: '', point: '' },
        { title: '', detail: '', point: '' }
      ]},
      { id: 'event', title: '이벤트', labelPrefix: '이벤트', cardHeight: 0, benefits: [
        { title: '', detail: '', point: '' },
        { title: '', detail: '', point: '' },
        { title: '', detail: '', point: '' }
      ]}
    ]
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const previewCanvas = $('#preview-canvas');
  const previewWrapper = $('#preview-wrapper');
  const sizeSelect = $('#size-select');
  const customSizeDiv = $('#custom-size');
  const customWidthInput = $('#custom-width');
  const customHeightInput = $('#custom-height');
  const sizeInfo = $('#size-info');
  const downloadBtn = $('#download-btn');

  function buildFontOptions(selectedFont) {
    let html = '<option value="">기본 (Noto Sans KR)</option>';
    AVAILABLE_FONTS.forEach(f => {
      if (f.name === 'Noto Sans KR') return;
      const sel = f.name === selectedFont ? 'selected' : '';
      html += `<option value="${f.name}" ${sel}>${f.label}</option>`;
    });
    return html;
  }

  // ========== Init ==========
  function init() {
    // Initialize 4 Instagram pages with defaults
    initInstaPages();

    populateControls();
    updateVisibleControls();
    bindEvents();
    loadSavedColors();
    renderColorThemes();
    renderTextBlocksUI();
    renderBenefitsUI();
    renderImagesUI();
    renderExtraTextsUI();
    renderPageTabs();
    updatePreview();

    // Start in basicInfo mode
    enterBasicInfoMode();
  }

  // Create 4 default Instagram pages
  function initInstaPages() {
    const tpl = TEMPLATES.mainPage;
    const benefitTitles = ['결제혜택', '사은품', '이벤트'];

    // Page 1: Main page
    const mainDefaults = tpl.defaultData;
    loadFromDefaults(mainDefaults);
    pages.mainPage = [null]; // Will be saved on first switch

    // Build all 4 pages
    const page1 = buildSnapshotFromDefaults(mainDefaults);
    const pageSnapshots = [page1];
    benefitTitles.forEach(title => {
      const bd = { ...tpl.benefitDefaults };
      bd.textBlocks = [
        { id: 1, type: 'headline', content: title, fontSize: 68, fontWeight: 900, color: '#FFFFFF', fontFamily: '' }
      ];
      bd.benefits = (tpl.benefitDefaults.benefits || []).map(b => ({ ...b }));
      if (tpl.benefitDefaults.benefitStyle) bd.benefitStyle = { ...tpl.benefitDefaults.benefitStyle };
      pageSnapshots.push(buildSnapshotFromDefaults(bd));
    });

    pages.mainPage = pageSnapshots;
    currentPageIdx.mainPage = 0;
    loadPageState(pages.mainPage[0]);
  }

  // Build a snapshot from template defaults
  function buildSnapshotFromDefaults(defaults) {
    const data = { ...defaults };
    if (defaults.benefitStyle) data.benefitStyle = { ...defaults.benefitStyle };
    if (defaults.extraTexts) data.extraTexts = defaults.extraTexts.map(t => ({ ...t }));
    return {
      data: data,
      textBlocks: (defaults.textBlocks || []).map(b => ({ ...b })),
      benefits: (defaults.benefits || []).map(b => ({ ...b })),
      images: [],
      headlinePosition: defaults.headlinePosition || 'top-center',
      headlineOffset: defaults.headlineOffset ? { ...defaults.headlineOffset } : { top: 0, bottom: 0, left: 0, right: 0 },
      brandPosition: defaults.brandPosition || 'top-center',
      brandOffset: defaults.brandOffset ? { ...defaults.brandOffset } : { top: 0, bottom: 0, left: 0, right: 0 },
      brandImage: null,
      brandType: 'image',
      brandFontSize: defaults.brandFontSize || 32,
      brandLogoHeight: 60,
    };
  }

  // Load state from defaults (for initial load)
  function loadFromDefaults(defaults) {
    state.data = { ...defaults };
    state.textBlocks = (defaults.textBlocks || []).map(b => ({ ...b }));
    state.benefits = (defaults.benefits || []).map(b => ({ ...b }));
    state.images = [];
    if (defaults.headlinePosition) {
      state.headlinePosition = defaults.headlinePosition;
      state.headlineOffset = defaults.headlineOffset ? { ...defaults.headlineOffset } : { top: 0, bottom: 0, left: 0, right: 0 };
    }
    if (defaults.brandPosition) {
      state.brandPosition = defaults.brandPosition;
      state.brandOffset = defaults.brandOffset ? { ...defaults.brandOffset } : { top: 0, bottom: 0, left: 0, right: 0 };
    }
    if (defaults.brandFontSize) state.brandFontSize = defaults.brandFontSize;
  }

  // ========== Populate Controls ==========
  function populateControls() {
    const data = state.data;

    $$('.form-group input[data-field], .form-group textarea[data-field]').forEach(el => {
      const field = el.dataset.field;
      if (data[field] !== undefined) el.value = data[field];
    });

    ['bgColor', 'accentColor', 'textColor'].forEach(field => {
      const colorEl = $(`#color-${field}`);
      const hexEl = $(`#hex-${field}`);
      if (colorEl && data[field]) colorEl.value = data[field];
      if (hexEl && data[field]) hexEl.value = data[field];
    });

    // Gradient controls
    const bgGrad = data.bgGradient || false;
    $$('.bg-type-btn').forEach(b => {
      b.classList.toggle('active', (b.dataset.bgType === 'gradient') === bgGrad);
    });
    $('#gradient-options').classList.toggle('hidden', !bgGrad);
    if (data.bgColor2) {
      $('#color-bgColor2').value = data.bgColor2;
      $('#hex-bgColor2').value = data.bgColor2;
    }
    if (data.bgGradientAngle !== undefined) {
      $('#input-gradientAngle').value = data.bgGradientAngle;
      $('#gradient-angle-display').textContent = data.bgGradientAngle;
    }

    // Brand font size
    const bfsSlider = $('#input-brandFontSize');
    if (bfsSlider) {
      bfsSlider.value = state.brandFontSize;
      $('#brand-font-size-display').textContent = state.brandFontSize;
    }

    // Brand logo height
    const blhSlider = $('#input-brandLogoHeight');
    if (blhSlider) {
      blhSlider.value = state.brandLogoHeight;
      $('#brand-logo-height-display').textContent = state.brandLogoHeight;
    }

    ['top', 'bottom', 'left', 'right'].forEach(dir => {
      const input = $(`#brand-offset-${dir}`);
      if (input) input.value = state.brandOffset[dir] || 0;
    });

    $$('.pos-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.pos === state.brandPosition);
    });

    ['top', 'bottom', 'left', 'right'].forEach(dir => {
      const input = $(`#offset-${dir}`);
      if (input) input.value = state.headlineOffset[dir] || 0;
    });

    $$('.hpos-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.pos === state.headlinePosition);
    });

    $$('.swatch').forEach(swatch => {
      swatch.style.backgroundColor = swatch.dataset.color;
    });

    // CTA controls
    const ctaFS = $('#cta-fontSize');
    if (ctaFS) {
      ctaFS.value = state.data.ctaFontSize || 16;
      $('#cta-fontSize-val').textContent = ctaFS.value;
    }
    const ctaBO = $('#cta-bottomOffset');
    if (ctaBO) {
      ctaBO.value = state.data.ctaBottomOffset || 80;
      $('#cta-bottomOffset-val').textContent = ctaBO.value;
    }

    // Benefit style controls
    const bs = state.data.benefitStyle || {};
    const bsDefaults = { titleSize: 32, detailSize: 16, tagSize: 16, pointSize: 22, titleColor: '#222222', detailColor: '#777777', pointColor: '#D4634A', fontFamily: '' };
    ['titleSize', 'detailSize', 'tagSize', 'pointSize'].forEach(key => {
      const slider = $(`#bs-${key}`);
      const valEl = $(`#bs-${key}-val`);
      if (slider) {
        slider.value = bs[key] || bsDefaults[key];
        if (valEl) valEl.textContent = slider.value;
      }
    });
    ['titleColor', 'detailColor', 'pointColor', 'tagColor'].forEach(key => {
      const picker = $(`#bs-${key}`);
      if (picker) picker.value = bs[key] || bsDefaults[key] || '';
    });
    const bsFontSel = $('#bs-fontFamily');
    if (bsFontSel) bsFontSel.value = bs.fontFamily || '';

    // Card height slider
    const bsCardH = $('#bs-cardHeight');
    const bsCardHVal = $('#bs-cardHeight-val');
    if (bsCardH) {
      const ch = state.data.benefitCardHeight || 0;
      bsCardH.value = ch;
      if (bsCardHVal) bsCardHVal.textContent = ch > 0 ? ch + 'px' : '자동';
    }

    // Card radius slider
    const bsCardR = $('#bs-cardRadius');
    const bsCardRVal = $('#bs-cardRadius-val');
    if (bsCardR) {
      const cr = state.data.benefitCardRadius != null ? state.data.benefitCardRadius : 24;
      bsCardR.value = cr;
      if (bsCardRVal) bsCardRVal.textContent = cr;
    }

    // Title Y slider
    const bsTY = $('#bs-titleY');
    const bsTYVal = $('#bs-titleY-val');
    if (bsTY) {
      const v = state.headlineOffset ? state.headlineOffset.bottom || 0 : 0;
      bsTY.value = v;
      if (bsTYVal) bsTYVal.textContent = v;
    }

    // Text pad left slider
    const bsTPL = $('#bs-textPadLeft');
    const bsTPLVal = $('#bs-textPadLeft-val');
    if (bsTPL) {
      const v = state.data.benefitTextPadLeft || 0;
      bsTPL.value = v;
      if (bsTPLVal) bsTPLVal.textContent = v;
    }

  }

  // Check if current template is a composite (auto-generated from Instagram)
  function isCompositeTemplate(tplId) {
    return tplId === 'detailPage' || tplId === 'popupBanner';
  }

  function updateVisibleControls() {
    const tplId = state.currentTemplate;
    const isComposite = isCompositeTemplate(tplId);
    const fields = TEMPLATE_FIELDS[tplId];
    if (!fields) return;

    fields.hide.forEach(field => {
      const group = $(`#group-${field}`);
      if (group) group.classList.add('hidden');
    });
    fields.show.forEach(field => {
      const group = $(`#group-${field}`);
      if (group) group.classList.remove('hidden');
    });

    // For composite templates (detail/popup), hide all normal controls
    const normalControls = $('#normal-controls');
    if (normalControls && !state.basicInfoMode) {
      normalControls.classList.toggle('hidden', isComposite);
    }

    // Show composite info message
    let compositeInfo = $('#composite-info');
    if (!compositeInfo && isComposite) {
      compositeInfo = document.createElement('div');
      compositeInfo.id = 'composite-info';
      compositeInfo.className = 'panel-section composite-info';
      const controlPanel = $('.control-panel');
      const normalCtrl = $('#normal-controls');
      if (controlPanel && normalCtrl) {
        controlPanel.insertBefore(compositeInfo, normalCtrl);
      }
    }
    if (compositeInfo) {
      if (isComposite) {
        const label = tplId === 'detailPage' ? '상세페이지' : '팝업배너';
        const desc = tplId === 'detailPage'
          ? '인스타그램 4페이지를 세로로 합쳐서 표시합니다.<br>내용을 수정하려면 인스타그램 탭에서 편집하세요.'
          : '인스타그램 메인페이지를 1080×1080 사이즈로 표시합니다.<br>내용을 수정하려면 인스타그램 탭에서 편집하세요.';
        compositeInfo.innerHTML = `
          <h2 class="section-title">${label} 미리보기</h2>
          <p class="bi-desc">${desc}</p>
        `;
        compositeInfo.classList.remove('hidden');
      } else {
        compositeInfo.classList.add('hidden');
      }
    }

    // For Instagram template, controls depend on pageType
    const pageType = state.data.pageType || 'main';
    const isMainPage = tplId === 'mainPage' && pageType === 'main';
    const isBenefitPage = tplId === 'mainPage' && pageType === 'benefit';

    // Show/hide benefits section
    const benefitsSection = $('#benefits-section');
    if (benefitsSection) {
      benefitsSection.classList.toggle('hidden', !isBenefitPage);
    }

    // Show/hide extra texts section
    const extraTextsSection = $('#extra-texts-section');
    if (extraTextsSection) {
      extraTextsSection.classList.toggle('hidden', !isMainPage);
    }

    // Show/hide brand section
    const brandSection = $('#brand-section');
    if (brandSection) {
      brandSection.classList.toggle('hidden', isBenefitPage || isComposite);
    }

    // Image section title
    const imgTitle = $('#image-section-title');
    if (imgTitle) {
      imgTitle.textContent = isMainPage ? '제품이미지' : '이미지 설정';
    }

    // Show/hide button text section
    const buttonSection = $('#button-text-section');
    if (buttonSection) {
      buttonSection.classList.toggle('hidden', tplId === 'freeForm' || isComposite);
    }

    // Show/hide size selector for fixed-size templates
    const headerRight = $('.header-right');
    if (headerRight) {
      const sizeControls = headerRight.querySelectorAll('.size-label, .size-select, #custom-size');
      const isFixed = tplId === 'mainPage' || isComposite;
      sizeControls.forEach(el => el.style.display = isFixed ? 'none' : '');
    }

    // Show/hide page tabs section
    const pageTabsSection = $('#page-tabs-section');
    if (pageTabsSection) {
      pageTabsSection.classList.toggle('hidden', isComposite);
    }
  }

  function getCurrentSize() {
    // Fixed sizes for specific templates
    if (state.currentTemplate === 'mainPage') {
      return { width: 1080, height: 1350 };
    }
    if (state.currentTemplate === 'popupBanner') {
      return { width: 1080, height: 1080 };
    }
    if (state.currentTemplate === 'detailPage') {
      const instaPages = (pages.mainPage || []).filter(p => p !== null);
      const pageH = Math.round(860 * 1350 / 1080);
      const count = Math.max(1, instaPages.length);
      return { width: 860, height: pageH * count };
    }
    // freeForm and others use selector
    if (state.currentSize === 'custom') {
      return { width: state.customWidth, height: state.customHeight };
    }
    return SIZE_PRESETS[state.currentSize];
  }

  function getPreviewScale(w, h) {
    const area = $('.preview-area');
    const maxW = area.clientWidth - 80;
    const maxH = area.clientHeight - 120;
    return Math.min(maxW / w, maxH / h, 1);
  }

  // ========== Update Preview ==========
  function updatePreview() {
    // Composite templates: detail and popup render from Instagram pages
    if (state.currentTemplate === 'detailPage') {
      updateDetailPreview();
      return;
    }
    if (state.currentTemplate === 'popupBanner') {
      updatePopupPreview();
      return;
    }

    const template = TEMPLATES[state.currentTemplate];
    const size = getCurrentSize();

    previewCanvas.style.width = size.width + 'px';
    previewCanvas.style.height = size.height + 'px';

    const renderData = buildCurrentRenderData();
    previewCanvas.innerHTML = template.render(renderData, size);

    const scale = getPreviewScale(size.width, size.height);
    previewCanvas.style.transform = `scale(${scale})`;
    previewWrapper.style.width = (size.width * scale) + 'px';
    previewWrapper.style.height = (size.height * scale) + 'px';
    sizeInfo.textContent = `${size.width} x ${size.height} px`;
  }

  function buildCurrentRenderData() {
    const renderData = { ...state.data };
    renderData.productImage = null;
    renderData.giftImage = null;
    renderData.brandType = state.brandType;
    renderData.brandPosition = state.brandPosition;
    renderData.brandImage = state.brandImage;
    renderData.brandFontSize = state.brandFontSize;
    renderData.brandLogoHeight = state.brandLogoHeight;
    renderData.brandOffset = { ...state.brandOffset };
    renderData.headlinePosition = state.headlinePosition;
    renderData.headlineOffset = { ...state.headlineOffset };
    renderData.textBlocks = state.textBlocks;
    renderData.images = state.images;
    renderData.benefits = state.benefits;
    return renderData;
  }

  // Build renderData from a saved page snapshot
  function buildRenderDataFromSnapshot(snapshot) {
    const renderData = { ...snapshot.data };
    renderData.brandType = snapshot.brandType;
    renderData.brandPosition = snapshot.brandPosition;
    renderData.brandImage = snapshot.brandImage;
    renderData.brandFontSize = snapshot.brandFontSize;
    renderData.brandLogoHeight = snapshot.brandLogoHeight;
    renderData.brandOffset = snapshot.brandOffset ? { ...snapshot.brandOffset } : { top: 0, bottom: 0, left: 0, right: 0 };
    renderData.headlinePosition = snapshot.headlinePosition;
    renderData.headlineOffset = snapshot.headlineOffset ? { ...snapshot.headlineOffset } : { top: 0, bottom: 0, left: 0, right: 0 };
    renderData.textBlocks = snapshot.textBlocks || [];
    renderData.images = snapshot.images || [];
    renderData.benefits = snapshot.benefits || [];
    return renderData;
  }

  // Detail page: render all 4 Instagram pages stacked vertically at 860px
  function updateDetailPreview() {
    const pageW = 860;
    const pageH = Math.round(860 * 1350 / 1080);
    const instaPages = (pages.mainPage || []).filter(p => p !== null);

    if (instaPages.length === 0) {
      showComposePlaceholder(pageW, pageH, '인스타그램 페이지를 먼저 작성해주세요');
      return;
    }

    const totalH = pageH * instaPages.length;
    previewCanvas.style.width = pageW + 'px';
    previewCanvas.style.height = totalH + 'px';

    let html = '';
    instaPages.forEach(snapshot => {
      const renderData = buildRenderDataFromSnapshot(snapshot);
      html += TEMPLATES.mainPage.render(renderData, { width: pageW, height: pageH });
    });

    previewCanvas.innerHTML = html;

    const scale = getPreviewScale(pageW, totalH);
    previewCanvas.style.transform = `scale(${scale})`;
    previewWrapper.style.width = (pageW * scale) + 'px';
    previewWrapper.style.height = (totalH * scale) + 'px';
    sizeInfo.textContent = `${pageW} x ${totalH} px`;
  }

  // Popup: render Instagram page 1 at 1080x1080
  function updatePopupPreview() {
    const size = { width: 1080, height: 1080 };
    const instaPages = (pages.mainPage || []).filter(p => p !== null);
    const firstPage = instaPages[0];

    if (!firstPage) {
      showComposePlaceholder(size.width, size.height, '인스타그램 메인 페이지를 먼저 작성해주세요');
      return;
    }

    const renderData = buildRenderDataFromSnapshot(firstPage);

    // 팝업배너 전용 조정
    renderData.ctaText = '';

    // 텍스트 크기를 팝업에 맞게 90% 축소
    if (renderData.textBlocks && renderData.textBlocks.length > 0) {
      renderData.textBlocks = renderData.textBlocks.map(b => ({
        ...b,
        fontSize: Math.round((b.fontSize || 18) * 0.9)
      }));
    }

    // 텍스트 영역 높이 추정
    const hPos = renderData.headlinePosition || 'bottom-left';
    const hOff = renderData.headlineOffset || { top: 0, bottom: 0, left: 0, right: 0 };
    const vAlign = hPos.split('-')[0];
    let textAreaBottom = 0;
    if (vAlign === 'top') {
      const textTop = 60 - (hOff.top || 0) + (hOff.bottom || 0);
      let textHeight = 0;
      (renderData.textBlocks || []).forEach((b, i) => {
        const fs = b.fontSize || 18;
        const lh = (b.fontWeight || 400) >= 700 ? 1.15 : 1.6;
        textHeight += fs * lh + (i > 0 ? 8 : 0);
      });
      textAreaBottom = textTop + textHeight + 40;
    } else {
      textAreaBottom = size.height * 0.35;
    }

    // 이미지: 텍스트 아래 남은 공간 정중앙 배치
    if (renderData.images && renderData.images.length > 0) {
      const remainTop = textAreaBottom;
      const remainH = size.height - remainTop - 40;

      renderData.images = renderData.images.map(img => {
        const adj = { ...img };
        const w = adj.width || 300;
        const h = adj.height || 300;

        // 남은 공간에 맞게 비율 유지 축소
        const maxW = size.width * 0.85;
        const maxH = remainH * 0.9;
        const ratio = Math.min(maxW / w, maxH / h, 1);
        adj.width = Math.round(w * ratio);
        adj.height = Math.round(h * ratio);

        // 남은 공간 정중앙
        adj.x = (size.width - adj.width) / 2;
        adj.y = remainTop + (remainH - adj.height) / 2;
        return adj;
      });
    }

    previewCanvas.style.width = size.width + 'px';
    previewCanvas.style.height = size.height + 'px';
    previewCanvas.innerHTML = TEMPLATES.mainPage.render(renderData, size);

    const scale = getPreviewScale(size.width, size.height);
    previewCanvas.style.transform = `scale(${scale})`;
    previewWrapper.style.width = (size.width * scale) + 'px';
    previewWrapper.style.height = (size.height * scale) + 'px';
    sizeInfo.textContent = `${size.width} x ${size.height} px`;
  }

  function showComposePlaceholder(w, h, msg) {
    previewCanvas.style.width = w + 'px';
    previewCanvas.style.height = h + 'px';
    const s = w / 1080;
    previewCanvas.innerHTML = `
      <div style="width:${w}px; height:${h}px; background:#f0f0f0;
        display:flex; align-items:center; justify-content:center;
        font-family:'Noto Sans KR',sans-serif;">
        <div style="text-align:center; color:#888;">
          <div style="font-size:${60*s}px; margin-bottom:${20*s}px;">📄</div>
          <div style="font-size:${24*s}px; font-weight:500;">${msg}</div>
        </div>
      </div>`;
    const scale = getPreviewScale(w, h);
    previewCanvas.style.transform = `scale(${scale})`;
    previewWrapper.style.width = (w * scale) + 'px';
    previewWrapper.style.height = (h * scale) + 'px';
    sizeInfo.textContent = `${w} x ${h} px`;
  }

  // ========== Render Text Blocks UI ==========
  function renderTextBlocksUI() {
    const container = $('#text-blocks-list');
    container.innerHTML = '';

    state.textBlocks.forEach((block, idx) => {
      const div = document.createElement('div');
      div.className = 'text-block-item';
      div.dataset.blockId = block.id;

      const typeLabel = block.type === 'headline' ? '제목' : '부제목';
      const isFirst = idx === 0;
      const isLast = idx === state.textBlocks.length - 1;
      const effectiveColor = block.color || state.data.textColor || '#000000';

      div.innerHTML = `
        <div class="text-block-header">
          <span class="block-type">${typeLabel}</span>
          <div class="block-actions">
            <button class="block-action-btn move-up-btn" title="위로" ${isFirst ? 'disabled' : ''}>&#9650;</button>
            <button class="block-action-btn move-down-btn" title="아래로" ${isLast ? 'disabled' : ''}>&#9660;</button>
            <button class="block-action-btn delete-btn" title="삭제">&#10005;</button>
          </div>
        </div>
        <textarea class="block-content" rows="1">${block.content || ''}</textarea>
        <div class="text-block-controls">
          <label>크기</label>
          <input type="range" class="block-size-slider" min="10" max="120" value="${block.fontSize || 18}">
          <span class="size-val">${block.fontSize || 18}</span>
          <select class="block-weight-select">
            <option value="300" ${block.fontWeight == 300 ? 'selected' : ''}>Light</option>
            <option value="400" ${block.fontWeight == 400 ? 'selected' : ''}>Regular</option>
            <option value="500" ${block.fontWeight == 500 ? 'selected' : ''}>Medium</option>
            <option value="700" ${block.fontWeight == 700 ? 'selected' : ''}>Bold</option>
            <option value="900" ${block.fontWeight == 900 ? 'selected' : ''}>Black</option>
          </select>
        </div>
        <div class="block-color-row">
          <label>색상</label>
          <input type="color" class="block-color-picker" value="${effectiveColor}">
          <input type="text" class="block-color-hex" value="${effectiveColor}" maxlength="7">
        </div>
        <div class="block-font-row">
          <label>폰트</label>
          <select class="block-font-select">
            ${buildFontOptions(block.fontFamily || '')}
          </select>
        </div>
      `;
      container.appendChild(div);
    });
  }

  // ========== Render Color Theme Presets ==========
  function renderColorThemes() {
    const container = $('#color-theme-presets');
    if (!container) return;
    container.innerHTML = COLOR_THEMES.map((theme, i) => `
      <button class="color-theme-btn" data-theme-index="${i}" title="${theme.name}">
        <span class="theme-bg" style="background:${theme.bg}"></span>
        <span class="theme-accent" style="background:${theme.accent}"></span>
        <span class="theme-label">${theme.name}</span>
      </button>
    `).join('');
  }

  function applyColorTheme(index) {
    const theme = COLOR_THEMES[index];
    if (!theme) return;

    state.data.bgColor = theme.bg;
    state.data.accentColor = theme.accent;
    state.data.textColor = theme.text;

    // headline → title color, subtext → text color
    state.textBlocks.forEach(b => {
      b.color = b.type === 'headline' ? theme.title : theme.text;
    });

    // Update color pickers
    ['bgColor', 'accentColor', 'textColor'].forEach(field => {
      const colorEl = $(`#color-${field}`);
      const hexEl = $(`#hex-${field}`);
      if (colorEl) colorEl.value = state.data[field];
      if (hexEl) hexEl.value = state.data[field];
    });

    renderTextBlocksUI();
    updatePreview();
  }

  // Apply current page's colors to all Instagram pages (결제혜택/사은품/이벤트)
  function applyColorThemeToAllPages() {
    if (state.currentTemplate !== 'mainPage') return;
    const instaPages = pages.mainPage;
    if (!instaPages || instaPages.length < 2) return;

    // Save current page first
    saveCurrentPage();

    const bgColor = state.data.bgColor;
    const accentColor = state.data.accentColor;
    const textColor = state.data.textColor;
    const bgGradient = state.data.bgGradient;
    const bgColor2 = state.data.bgColor2;
    const bgGradientAngle = state.data.bgGradientAngle;

    // Apply to benefit pages (index 1, 2, 3)
    for (let i = 1; i < instaPages.length; i++) {
      const page = instaPages[i];
      if (!page) continue;
      page.data.bgColor = bgColor;
      page.data.accentColor = accentColor;
      page.data.textColor = textColor;
      page.data.bgGradient = bgGradient;
      page.data.bgColor2 = bgColor2;
      page.data.bgGradientAngle = bgGradientAngle;
      // Update text block colors on benefit pages
      if (page.textBlocks) {
        page.textBlocks.forEach(b => {
          b.color = textColor;
        });
      }
    }

    // If we're on the main page, also apply to current state for benefit pages reference
    updatePreview();
  }

  // ========== Render Images UI ==========
  function renderImagesUI() {
    const container = $('#images-list');
    container.innerHTML = '';

    state.images.forEach((img, idx) => {
      const div = document.createElement('div');
      div.className = 'image-item';
      div.dataset.imgId = img.id;

      const scalePercent = img.origWidth
        ? Math.round((img.width / img.origWidth) * 100)
        : 100;

      const size = getCurrentSize();
      const xVal = img.x || 0;
      const yVal = img.y || 0;

      div.innerHTML = `
        <div class="image-item-header">
          <span class="img-label">이미지 ${idx + 1}</span>
          <div class="block-actions">
            <button class="block-action-btn center-btn" title="정중앙 배치">중앙</button>
            <button class="block-action-btn delete-btn" title="삭제">&#10005;</button>
          </div>
        </div>
        <img class="image-item-thumb" src="${img.src}" alt="이미지">
        <div class="img-slider-row">
          <label>좌우</label>
          <input type="range" class="img-x-slider" min="${-img.width}" max="${size.width}" value="${xVal}">
          <input type="number" class="img-x" value="${xVal}">
        </div>
        <div class="img-slider-row">
          <label>상하</label>
          <input type="range" class="img-y-slider" min="${-img.height}" max="${size.height}" value="${yVal}">
          <input type="number" class="img-y" value="${yVal}">
        </div>
        <div class="img-slider-row">
          <label>크기</label>
          <input type="range" class="img-scale-slider" min="10" max="500" value="${scalePercent}">
          <span class="img-scale-val">${scalePercent}%</span>
        </div>
        <div class="img-slider-row">
          <label>모서리</label>
          <input type="range" class="img-border-radius" min="0" max="200" value="${img.borderRadius || 0}">
          <span class="img-br-val">${img.borderRadius || 0}px</span>
        </div>
        <div class="image-item-controls">
          <div class="img-ctrl-group"><label>W</label><input type="number" class="img-w" value="${img.width || 300}" min="10"></div>
          <div class="img-ctrl-group"><label>H</label><input type="number" class="img-h" value="${img.height || 300}" min="10"></div>
          <div class="img-ctrl-group"><label>Z</label><input type="number" class="img-z" value="${img.zIndex || 1}" min="0" max="100"></div>
        </div>
      `;
      container.appendChild(div);
    });
  }

  // ========== Render Benefits UI ==========
  // ========== Render Extra Texts UI ==========
  let nextExtraId = 10;

  function renderExtraTextsUI() {
    const container = $('#extra-texts-list');
    if (!container) return;
    const extras = state.data.extraTexts || [];
    container.innerHTML = '';

    extras.forEach((et, idx) => {
      const div = document.createElement('div');
      div.className = 'extra-text-item';
      div.dataset.extraId = et.id;
      const size = getCurrentSize();

      div.innerHTML = `
        <div class="extra-text-header">
          <span class="extra-text-label">텍스트 ${idx + 1}</span>
          <button class="block-action-btn extra-delete-btn" title="삭제">&#10005;</button>
        </div>
        <input type="text" class="extra-content" value="${et.content || ''}" placeholder="텍스트 입력">
        <div class="block-color-row">
          <label>색상</label>
          <input type="color" class="extra-color" value="${et.color || state.data.textColor || '#FFFFFF'}">
        </div>
        <div class="img-slider-row">
          <label>크기</label>
          <input type="range" class="extra-fontSize" min="10" max="80" value="${et.fontSize || 18}">
          <span class="extra-fontSize-val">${et.fontSize || 18}</span>
        </div>
        <div class="img-slider-row">
          <label>위치</label>
          <input type="range" class="extra-y" min="0" max="${size.height}" value="${et.y || 500}">
          <input type="number" class="extra-y-num" value="${et.y || 500}" style="width:52px;">
        </div>
      `;
      container.appendChild(div);
    });
  }

  function renderBenefitsUI() {
    const container = $('#benefits-list');
    if (!container) return;
    container.innerHTML = '';

    const savedBenImgs = getSavedBenefitImages();

    state.benefits.forEach((ben, idx) => {
      const div = document.createElement('div');
      div.className = 'benefit-item';
      div.dataset.benefitId = ben.id;

      const isFirst = idx === 0;
      const isLast = idx === state.benefits.length - 1;

      const savedThumbsHtml = savedBenImgs.length > 0 ? `
        <div class="benefit-saved-row">
          ${savedBenImgs.map(si => `
            <img class="benefit-saved-thumb" src="${si.image}" data-saved-img-id="${si.id}" title="클릭하여 적용">
          `).join('')}
        </div>
      ` : '';

      div.innerHTML = `
        <div class="benefit-item-header">
          <span class="benefit-num">혜택 ${idx + 1}</span>
          <div class="block-actions">
            <button class="block-action-btn move-up-btn" title="위로" ${isFirst ? 'disabled' : ''}>&#9650;</button>
            <button class="block-action-btn move-down-btn" title="아래로" ${isLast ? 'disabled' : ''}>&#9660;</button>
            <button class="block-action-btn delete-btn" title="삭제">&#10005;</button>
          </div>
        </div>
        <div class="benefit-fields">
          <div class="benefit-field">
            <label>소제목</label>
            <input type="text" class="benefit-label-input" value="${ben.label || ''}">
          </div>
          <div class="benefit-field">
            <label>내용</label>
            <input type="text" class="benefit-title-input" value="${ben.title || ''}">
          </div>
          <div class="benefit-field">
            <label>세부내용</label>
            <textarea class="benefit-detail-input" rows="2">${ben.detail || ''}</textarea>
          </div>
          <div class="benefit-bottom-row">
            <div class="benefit-field" style="flex:1;">
              <label>포인트 수치</label>
              <input type="text" class="benefit-point-input" value="${ben.point || ''}" placeholder="2만원, 5% 등">
            </div>
            <div class="benefit-img-area">
              ${ben.image
                ? `<img class="benefit-img-thumb" src="${ben.image}">
                   <div class="benefit-img-btns">
                     <button class="benefit-img-remove">제거</button>
                     <button class="benefit-img-save-btn">저장</button>
                   </div>`
                : `<button class="benefit-img-add">이미지<br>추가</button>
                   ${savedThumbsHtml}`
              }
            </div>
          </div>
          ${ben.image ? `<div class="benefit-img-size-row">
            <label>이미지 크기</label>
            <input type="range" class="benefit-img-size" min="0" max="600" step="5" value="${ben.imgSize || 0}">
            <span class="benefit-img-size-val">${ben.imgSize ? ben.imgSize : '자동'}</span>
          </div>
          <div class="benefit-img-size-row">
            <label>이미지 좌우</label>
            <input type="range" class="benefit-img-offsetX" min="-200" max="200" step="5" value="${ben.imgOffsetX || 0}">
            <span class="benefit-img-offsetX-val">${ben.imgOffsetX || 0}</span>
          </div>` : ''}
        </div>
      `;
      container.appendChild(div);
    });

    renderSavedBenefitImages();
  }

  // ========== Bind Events ==========
  function bindEvents() {
    // Template selector
    $$('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        $$('.template-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        if (card.dataset.template === 'basicInfo') {
          enterBasicInfoMode();
        } else {
          exitBasicInfoMode();
          switchTemplate(card.dataset.template);
        }
      });
    });

    // Random color theme button
    const randomColorBtn = $('#color-theme-random-btn');
    if (randomColorBtn) {
      randomColorBtn.addEventListener('click', () => {
        generateRandomColorThemes();
        renderColorThemes();
      });
    }

    // Apply color theme to all Instagram pages
    const applyAllBtn = $('#color-theme-apply-all');
    if (applyAllBtn) {
      applyAllBtn.addEventListener('click', () => {
        applyColorThemeToAllPages();
      });
    }

    // Size selector
    sizeSelect.addEventListener('change', () => {
      state.currentSize = sizeSelect.value;
      customSizeDiv.classList.toggle('hidden', state.currentSize !== 'custom');
      updatePreview();
    });

    customWidthInput.addEventListener('input', () => {
      state.customWidth = parseInt(customWidthInput.value) || 1080;
      updatePreview();
    });

    customHeightInput.addEventListener('input', () => {
      state.customHeight = parseInt(customHeightInput.value) || 1080;
      updatePreview();
    });

    // Non-textBlock text inputs
    $$('.form-group input[data-field], .form-group textarea[data-field]').forEach(el => {
      el.addEventListener('input', () => {
        state.data[el.dataset.field] = el.value;
        updatePreview();
      });
    });

    // ===== CTA font size & position =====
    const ctaFontSizeSlider = $('#cta-fontSize');
    if (ctaFontSizeSlider) {
      ctaFontSizeSlider.addEventListener('input', () => {
        state.data.ctaFontSize = parseInt(ctaFontSizeSlider.value);
        $('#cta-fontSize-val').textContent = ctaFontSizeSlider.value;
        updatePreview();
      });
    }
    const ctaBottomSlider = $('#cta-bottomOffset');
    if (ctaBottomSlider) {
      ctaBottomSlider.addEventListener('input', () => {
        state.data.ctaBottomOffset = parseInt(ctaBottomSlider.value);
        $('#cta-bottomOffset-val').textContent = ctaBottomSlider.value;
        updatePreview();
      });
    }

    // ===== Background type toggle =====
    $$('.bg-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.bg-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const isGradient = btn.dataset.bgType === 'gradient';
        state.data.bgGradient = isGradient;
        $('#gradient-options').classList.toggle('hidden', !isGradient);
        if (isGradient && !state.data.bgColor2) {
          state.data.bgColor2 = adjustColor(state.data.bgColor || '#000000', -40);
          $('#color-bgColor2').value = state.data.bgColor2;
          $('#hex-bgColor2').value = state.data.bgColor2;
        }
        updatePreview();
      });
    });

    // Gradient second color
    $('#color-bgColor2').addEventListener('input', () => {
      state.data.bgColor2 = $('#color-bgColor2').value;
      $('#hex-bgColor2').value = state.data.bgColor2;
      updatePreview();
    });
    $('#hex-bgColor2').addEventListener('input', () => {
      const val = $('#hex-bgColor2').value;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        state.data.bgColor2 = val;
        $('#color-bgColor2').value = val;
        updatePreview();
      }
    });

    // Gradient angle
    $('#input-gradientAngle').addEventListener('input', () => {
      state.data.bgGradientAngle = parseInt($('#input-gradientAngle').value);
      $('#gradient-angle-display').textContent = state.data.bgGradientAngle;
      updatePreview();
    });

    // Color pickers (bgColor, accentColor, textColor)
    ['bgColor', 'accentColor', 'textColor'].forEach(field => {
      const colorEl = $(`#color-${field}`);
      const hexEl = $(`#hex-${field}`);
      if (colorEl) {
        colorEl.addEventListener('input', () => {
          state.data[field] = colorEl.value;
          if (hexEl) hexEl.value = colorEl.value;
          updatePreview();
        });
      }
      if (hexEl) {
        hexEl.addEventListener('input', () => {
          const val = hexEl.value;
          if (/^#[0-9a-fA-F]{6}$/.test(val)) {
            state.data[field] = val;
            if (colorEl) colorEl.value = val;
            updatePreview();
          }
        });
      }
    });

    // Color theme presets
    const themeContainer = $('#color-theme-presets');
    if (themeContainer) {
      themeContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.color-theme-btn');
        if (!btn) return;
        applyColorTheme(parseInt(btn.dataset.themeIndex));
      });
    }

    // Color swatches
    $$('.color-swatches').forEach(container => {
      const target = container.dataset.target;
      container.addEventListener('click', (e) => {
        const swatch = e.target.closest('.swatch');
        if (!swatch) return;
        const color = swatch.dataset.color;
        state.data[target] = color;
        const colorEl = $(`#color-${target}`);
        const hexEl = $(`#hex-${target}`);
        if (colorEl) colorEl.value = color;
        if (hexEl) hexEl.value = color;
        updatePreview();
      });
    });

    // Headline position grid
    $$('.hpos-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.hpos-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.headlinePosition = btn.dataset.pos;
        updatePreview();
      });
    });

    ['top', 'bottom', 'left', 'right'].forEach(dir => {
      const input = $(`#offset-${dir}`);
      if (input) {
        input.addEventListener('input', () => {
          state.headlineOffset[dir] = parseInt(input.value) || 0;
          updatePreview();
        });
      }
    });

    // Brand type toggle
    $$('.brand-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.brand-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.brandType = btn.dataset.brandType;
        $('#brand-text-group').classList.toggle('hidden', state.brandType !== 'text');
        $('#brand-logo-group').classList.toggle('hidden', state.brandType !== 'image');
        updatePreview();
      });
    });

    $$('.pos-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.pos-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.brandPosition = btn.dataset.pos;
        updatePreview();
      });
    });

    ['top', 'bottom', 'left', 'right'].forEach(dir => {
      const input = $(`#brand-offset-${dir}`);
      if (input) {
        input.addEventListener('input', () => {
          state.brandOffset[dir] = parseInt(input.value) || 0;
          updatePreview();
        });
      }
    });

    // Brand font size slider
    const brandFontSlider = $('#input-brandFontSize');
    const brandFontDisplay = $('#brand-font-size-display');
    brandFontSlider.addEventListener('input', () => {
      state.brandFontSize = parseInt(brandFontSlider.value);
      brandFontDisplay.textContent = brandFontSlider.value;
      updatePreview();
    });

    const brandLogoSlider = $('#input-brandLogoHeight');
    const brandLogoDisplay = $('#brand-logo-height-display');
    brandLogoSlider.addEventListener('input', () => {
      state.brandLogoHeight = parseInt(brandLogoSlider.value);
      brandLogoDisplay.textContent = brandLogoSlider.value;
      updatePreview();
    });

    setupImageUpload('brand-zone', 'brand-file', 'brand-preview', 'brand-thumb', 'remove-brand', 'brandImage');

    // Save brand logo
    $('#save-brand-logo').addEventListener('click', saveBrandLogo);

    $$('.save-color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const color = state.data[target];
        if (color) saveColor(target, color);
      });
    });

    downloadBtn.addEventListener('click', exportBanner);
    window.addEventListener('resize', () => updatePreview());

    // ===== Brand Logo Drag on Preview =====
    let dragState = null;
    previewCanvas.addEventListener('mousedown', (e) => {
      const target = e.target.closest('[data-draggable="brand"]');
      if (!target) return;
      e.preventDefault();
      const size = getCurrentSize();
      const scale = getPreviewScale(size.width, size.height);
      const s = size.width / 1080;
      dragState = {
        type: 'brand',
        startX: e.clientX,
        startY: e.clientY,
        origRight: state.brandOffset.right || 0,
        origBottom: state.brandOffset.bottom || 0,
        scale: scale,
        s: s
      };
      previewCanvas.style.cursor = 'move';
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragState) return;
      e.preventDefault();
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      // Convert screen pixels to base coordinate offset
      const factor = dragState.scale * dragState.s;
      const deltaX = Math.round(dx / factor);
      const deltaY = Math.round(dy / factor);

      if (dragState.type === 'brand') {
        state.brandOffset.right = dragState.origRight + deltaX;
        state.brandOffset.bottom = dragState.origBottom + deltaY;
        // Sync UI inputs
        const rInput = $(`#brand-offset-right`);
        const bInput = $(`#brand-offset-bottom`);
        if (rInput) rInput.value = state.brandOffset.right;
        if (bInput) bInput.value = state.brandOffset.bottom;
        updatePreview();
      }
    });

    document.addEventListener('mouseup', () => {
      if (dragState) {
        dragState = null;
        previewCanvas.style.cursor = '';
      }
    });

    // ===== Text Blocks: event delegation =====
    const textBlocksList = $('#text-blocks-list');

    textBlocksList.addEventListener('input', (e) => {
      const item = e.target.closest('.text-block-item');
      if (!item) return;
      const blockId = parseInt(item.dataset.blockId);
      const block = state.textBlocks.find(b => b.id === blockId);
      if (!block) return;

      if (e.target.classList.contains('block-content')) {
        block.content = e.target.value;
        updatePreview();
      } else if (e.target.classList.contains('block-size-slider')) {
        block.fontSize = parseInt(e.target.value);
        item.querySelector('.size-val').textContent = block.fontSize;
        updatePreview();
      } else if (e.target.classList.contains('block-color-picker')) {
        block.color = e.target.value;
        const hexInput = item.querySelector('.block-color-hex');
        if (hexInput) hexInput.value = e.target.value;
        updatePreview();
      } else if (e.target.classList.contains('block-color-hex')) {
        const val = e.target.value;
        if (/^#[0-9a-fA-F]{6}$/.test(val)) {
          block.color = val;
          const picker = item.querySelector('.block-color-picker');
          if (picker) picker.value = val;
          updatePreview();
        }
      }
    });

    textBlocksList.addEventListener('change', (e) => {
      const item = e.target.closest('.text-block-item');
      if (!item) return;
      const blockId = parseInt(item.dataset.blockId);
      const block = state.textBlocks.find(b => b.id === blockId);
      if (!block) return;

      if (e.target.classList.contains('block-weight-select')) {
        block.fontWeight = parseInt(e.target.value);
        updatePreview();
      } else if (e.target.classList.contains('block-font-select')) {
        block.fontFamily = e.target.value;
        if (block.fontFamily) {
          loadGoogleFont(block.fontFamily);
          setTimeout(() => updatePreview(), 300);
        }
        updatePreview();
      }
    });

    textBlocksList.addEventListener('click', (e) => {
      const item = e.target.closest('.text-block-item');
      if (!item) return;
      const blockId = parseInt(item.dataset.blockId);
      const idx = state.textBlocks.findIndex(b => b.id === blockId);

      if (e.target.closest('.move-up-btn') && idx > 0) {
        [state.textBlocks[idx - 1], state.textBlocks[idx]] = [state.textBlocks[idx], state.textBlocks[idx - 1]];
        renderTextBlocksUI();
        updatePreview();
      } else if (e.target.closest('.move-down-btn') && idx < state.textBlocks.length - 1) {
        [state.textBlocks[idx], state.textBlocks[idx + 1]] = [state.textBlocks[idx + 1], state.textBlocks[idx]];
        renderTextBlocksUI();
        updatePreview();
      } else if (e.target.closest('.delete-btn')) {
        state.textBlocks.splice(idx, 1);
        renderTextBlocksUI();
        updatePreview();
      }
    });

    $('#add-text-block').addEventListener('click', () => {
      state.textBlocks.push({
        id: nextBlockId++,
        type: 'subtext',
        content: '',
        fontSize: 18,
        fontWeight: 400,
        color: state.data.textColor || '#000000',
        fontFamily: ''
      });
      renderTextBlocksUI();
      updatePreview();
    });

    // ===== Images: event delegation =====
    const imagesList = $('#images-list');
    const globalFileInput = $('#global-image-file');

    imagesList.addEventListener('input', (e) => {
      const item = e.target.closest('.image-item');
      if (!item) return;
      const imgId = parseInt(item.dataset.imgId);
      const img = state.images.find(i => i.id === imgId);
      if (!img) return;

      if (e.target.classList.contains('img-x-slider')) {
        const val = parseInt(e.target.value) || 0;
        img.x = val;
        item.querySelector('.img-x').value = val;
        updatePreview();
      } else if (e.target.classList.contains('img-y-slider')) {
        const val = parseInt(e.target.value) || 0;
        img.y = val;
        item.querySelector('.img-y').value = val;
        updatePreview();
      } else if (e.target.classList.contains('img-x')) {
        img.x = parseInt(e.target.value) || 0;
        item.querySelector('.img-x-slider').value = img.x;
        updatePreview();
      } else if (e.target.classList.contains('img-y')) {
        img.y = parseInt(e.target.value) || 0;
        item.querySelector('.img-y-slider').value = img.y;
        updatePreview();
      } else if (e.target.classList.contains('img-w')) {
        img.width = parseInt(e.target.value) || 100;
        updatePreview();
      } else if (e.target.classList.contains('img-h')) {
        img.height = parseInt(e.target.value) || 100;
        updatePreview();
      } else if (e.target.classList.contains('img-z')) {
        img.zIndex = parseInt(e.target.value) || 1;
        updatePreview();
      } else if (e.target.classList.contains('img-scale-slider')) {
        const pct = parseInt(e.target.value);
        if (img.origWidth && img.origHeight) {
          // Keep center fixed
          const cx = img.x + img.width / 2;
          const cy = img.y + img.height / 2;
          img.width = Math.round(img.origWidth * pct / 100);
          img.height = Math.round(img.origHeight * pct / 100);
          img.x = Math.round(cx - img.width / 2);
          img.y = Math.round(cy - img.height / 2);
        }
        item.querySelector('.img-scale-val').textContent = pct + '%';
        item.querySelector('.img-w').value = img.width;
        item.querySelector('.img-h').value = img.height;
        item.querySelector('.img-x').value = img.x;
        item.querySelector('.img-y').value = img.y;
        item.querySelector('.img-x-slider').value = img.x;
        item.querySelector('.img-y-slider').value = img.y;
        updatePreview();
      } else if (e.target.classList.contains('img-border-radius')) {
        const br = parseInt(e.target.value) || 0;
        img.borderRadius = br;
        item.querySelector('.img-br-val').textContent = br + 'px';
        updatePreview();
      }
    });

    imagesList.addEventListener('click', (e) => {
      const item = e.target.closest('.image-item');
      if (!item) return;
      const imgId = parseInt(item.dataset.imgId);

      if (e.target.closest('.center-btn')) {
        const img = state.images.find(i => i.id === imgId);
        if (!img) return;
        const size = getCurrentSize();
        img.x = Math.round((size.width - img.width) / 2);
        img.y = Math.round((size.height - img.height) / 2);
        item.querySelector('.img-x').value = img.x;
        item.querySelector('.img-y').value = img.y;
        item.querySelector('.img-x-slider').value = img.x;
        item.querySelector('.img-y-slider').value = img.y;
        updatePreview();
      } else if (e.target.closest('.delete-btn')) {
        const idx = state.images.findIndex(i => i.id === imgId);
        if (idx !== -1) {
          state.images.splice(idx, 1);
          renderImagesUI();
          updatePreview();
        }
      }
    });

    $('#add-image').addEventListener('click', () => {
      globalFileInput.click();
    });

    globalFileInput.addEventListener('change', () => {
      const file = globalFileInput.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        // Detect natural size
        const tempImg = new Image();
        tempImg.onload = () => {
          const natW = tempImg.naturalWidth;
          const natH = tempImg.naturalHeight;
          // Scale to fit 300px on the longer side
          const maxDim = state.currentTemplate === 'mainPage' ? 450 : 300;
          const ratio = Math.min(maxDim / natW, maxDim / natH, 1);
          const w = Math.round(natW * ratio);
          const h = Math.round(natH * ratio);

          // Auto-center image on canvas
          const size = getCurrentSize();
          const cx = Math.round((size.width - w) / 2);
          const cy = Math.round((size.height - h) / 2);
          state.images.push({
            id: nextImageId++,
            src: dataUrl,
            x: cx,
            y: cy,
            width: w,
            height: h,
            origWidth: w,
            origHeight: h,
            zIndex: 1
          });
          renderImagesUI();
          updatePreview();
        };
        tempImg.src = dataUrl;
      };
      reader.readAsDataURL(file);
      globalFileInput.value = '';
    });

    // ===== Benefit Style Controls =====
    const bsFontSelect = $('#bs-fontFamily');
    if (bsFontSelect) {
      bsFontSelect.innerHTML = buildFontOptions('');
    }

    ['titleSize', 'detailSize', 'tagSize', 'pointSize'].forEach(key => {
      const slider = $(`#bs-${key}`);
      if (slider) {
        slider.addEventListener('input', () => {
          if (!state.data.benefitStyle) state.data.benefitStyle = {};
          state.data.benefitStyle[key] = parseInt(slider.value);
          $(`#bs-${key}-val`).textContent = slider.value;
          updatePreview();
        });
      }
    });

    ['titleColor', 'detailColor', 'pointColor', 'tagColor'].forEach(key => {
      const picker = $(`#bs-${key}`);
      if (picker) {
        picker.addEventListener('input', () => {
          if (!state.data.benefitStyle) state.data.benefitStyle = {};
          state.data.benefitStyle[key] = picker.value;
          updatePreview();
        });
      }
    });

    // Card height slider in normal benefit controls
    const bsCardHeight = $('#bs-cardHeight');
    if (bsCardHeight) {
      bsCardHeight.addEventListener('input', () => {
        const v = parseInt(bsCardHeight.value);
        state.data.benefitCardHeight = v;
        $('#bs-cardHeight-val').textContent = v > 0 ? v + 'px' : '자동';
        updatePreview();
      });
    }

    // Card radius slider in normal benefit controls
    const bsCardRadius = $('#bs-cardRadius');
    if (bsCardRadius) {
      bsCardRadius.addEventListener('input', () => {
        const v = parseInt(bsCardRadius.value);
        state.data.benefitCardRadius = v;
        $('#bs-cardRadius-val').textContent = v;
        updatePreview();
      });
    }

    // Title Y position slider
    const bsTitleY = $('#bs-titleY');
    if (bsTitleY) {
      bsTitleY.addEventListener('input', () => {
        const v = parseInt(bsTitleY.value);
        if (!state.headlineOffset) state.headlineOffset = { top: 0, bottom: 0, left: 0, right: 0 };
        state.headlineOffset.bottom = v;
        $('#bs-titleY-val').textContent = v;
        updatePreview();
      });
    }

    // Text pad left slider
    const bsTextPadLeft = $('#bs-textPadLeft');
    if (bsTextPadLeft) {
      bsTextPadLeft.addEventListener('input', () => {
        const v = parseInt(bsTextPadLeft.value);
        state.data.benefitTextPadLeft = v;
        $('#bs-textPadLeft-val').textContent = v;
        updatePreview();
      });
    }


    if (bsFontSelect) {
      bsFontSelect.addEventListener('change', () => {
        if (!state.data.benefitStyle) state.data.benefitStyle = {};
        state.data.benefitStyle.fontFamily = bsFontSelect.value;
        if (bsFontSelect.value) loadGoogleFont(bsFontSelect.value);
        updatePreview();
      });
    }

    // ===== Benefits: event delegation =====
    const benefitsList = $('#benefits-list');
    const benefitImageInput = $('#benefit-image-file');
    let activeBenefitImgId = null;

    if (benefitsList) {
      benefitsList.addEventListener('input', (e) => {
        const item = e.target.closest('.benefit-item');
        if (!item) return;
        const benId = parseInt(item.dataset.benefitId);
        const ben = state.benefits.find(b => b.id === benId);
        if (!ben) return;

        if (e.target.classList.contains('benefit-label-input')) {
          ben.label = e.target.value;
          updatePreview();
        } else if (e.target.classList.contains('benefit-title-input')) {
          ben.title = e.target.value;
          updatePreview();
        } else if (e.target.classList.contains('benefit-detail-input')) {
          ben.detail = e.target.value;
          updatePreview();
        } else if (e.target.classList.contains('benefit-point-input')) {
          ben.point = e.target.value;
          updatePreview();
        } else if (e.target.classList.contains('benefit-img-size')) {
          const v = parseInt(e.target.value);
          ben.imgSize = v;
          const valSpan = item.querySelector('.benefit-img-size-val');
          if (valSpan) valSpan.textContent = v > 0 ? v : '자동';
          updatePreview();
        } else if (e.target.classList.contains('benefit-img-offsetX')) {
          const v = parseInt(e.target.value);
          ben.imgOffsetX = v;
          const valSpan = item.querySelector('.benefit-img-offsetX-val');
          if (valSpan) valSpan.textContent = v;
          updatePreview();
        }
      });

      benefitsList.addEventListener('click', (e) => {
        const item = e.target.closest('.benefit-item');
        if (!item) return;
        const benId = parseInt(item.dataset.benefitId);
        const idx = state.benefits.findIndex(b => b.id === benId);

        if (e.target.closest('.move-up-btn') && idx > 0) {
          [state.benefits[idx - 1], state.benefits[idx]] = [state.benefits[idx], state.benefits[idx - 1]];
          renderBenefitsUI();
          updatePreview();
        } else if (e.target.closest('.move-down-btn') && idx < state.benefits.length - 1) {
          [state.benefits[idx], state.benefits[idx + 1]] = [state.benefits[idx + 1], state.benefits[idx]];
          renderBenefitsUI();
          updatePreview();
        } else if (e.target.closest('.delete-btn')) {
          state.benefits.splice(idx, 1);
          renderBenefitsUI();
          updatePreview();
        } else if (e.target.closest('.benefit-img-add')) {
          activeBenefitImgId = benId;
          benefitImageInput.click();
        } else if (e.target.closest('.benefit-img-remove')) {
          const ben = state.benefits.find(b => b.id === benId);
          if (ben) {
            ben.image = null;
            renderBenefitsUI();
            updatePreview();
          }
        } else if (e.target.closest('.benefit-img-save-btn')) {
          const ben = state.benefits.find(b => b.id === benId);
          if (ben && ben.image) {
            saveBenefitImage(ben.image);
          }
        } else if (e.target.closest('.benefit-saved-thumb')) {
          const thumbEl = e.target.closest('.benefit-saved-thumb');
          const savedImgId = parseInt(thumbEl.dataset.savedImgId);
          const savedImgs = getSavedBenefitImages();
          const savedImg = savedImgs.find(si => si.id === savedImgId);
          const ben = state.benefits.find(b => b.id === benId);
          if (ben && savedImg) {
            ben.image = savedImg.image;
            renderBenefitsUI();
            updatePreview();
          }
        }
      });
    }

    if (benefitImageInput) {
      benefitImageInput.addEventListener('change', () => {
        const file = benefitImageInput.files[0];
        if (!file || !file.type.startsWith('image/') || activeBenefitImgId === null) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const ben = state.benefits.find(b => b.id === activeBenefitImgId);
          if (ben) {
            ben.image = ev.target.result;
            renderBenefitsUI();
            updatePreview();
          }
          activeBenefitImgId = null;
        };
        reader.readAsDataURL(file);
        benefitImageInput.value = '';
      });
    }

    $('#add-benefit').addEventListener('click', () => {
      const num = state.benefits.length + 1;
      state.benefits.push({
        id: nextBenefitId++,
        label: `혜택 ${String(num).padStart(2, '0')}.`,
        title: '혜택 내용을 입력하세요',
        detail: '',
        point: '',
        image: null
      });
      renderBenefitsUI();
      updatePreview();
    });

    // ===== Benefit Style Save/Load =====
    $('#save-benefit-style').addEventListener('click', saveBenefitStyle);

    // ===== Extra Texts: events =====
    const extraTextsList = $('#extra-texts-list');
    if (extraTextsList) {
      extraTextsList.addEventListener('input', (e) => {
        const item = e.target.closest('.extra-text-item');
        if (!item) return;
        const etId = parseInt(item.dataset.extraId);
        if (!state.data.extraTexts) state.data.extraTexts = [];
        const et = state.data.extraTexts.find(t => t.id === etId);
        if (!et) return;

        if (e.target.classList.contains('extra-content')) {
          et.content = e.target.value;
          updatePreview();
        } else if (e.target.classList.contains('extra-fontSize')) {
          et.fontSize = parseInt(e.target.value);
          item.querySelector('.extra-fontSize-val').textContent = et.fontSize;
          updatePreview();
        } else if (e.target.classList.contains('extra-y')) {
          et.y = parseInt(e.target.value);
          item.querySelector('.extra-y-num').value = et.y;
          updatePreview();
        } else if (e.target.classList.contains('extra-y-num')) {
          et.y = parseInt(e.target.value) || 0;
          item.querySelector('.extra-y').value = et.y;
          updatePreview();
        } else if (e.target.classList.contains('extra-color')) {
          et.color = e.target.value;
          updatePreview();
        }
      });

      extraTextsList.addEventListener('click', (e) => {
        if (e.target.closest('.extra-delete-btn')) {
          const item = e.target.closest('.extra-text-item');
          const etId = parseInt(item.dataset.extraId);
          if (!state.data.extraTexts) return;
          const idx = state.data.extraTexts.findIndex(t => t.id === etId);
          if (idx !== -1) {
            state.data.extraTexts.splice(idx, 1);
            renderExtraTextsUI();
            updatePreview();
          }
        }
      });
    }

    $('#add-extra-text').addEventListener('click', () => {
      if (!state.data.extraTexts) state.data.extraTexts = [];
      state.data.extraTexts.push({
        id: nextExtraId++,
        content: '',
        fontSize: 18,
        fontWeight: 600,
        y: 800
      });
      renderExtraTextsUI();
      updatePreview();
    });

    // ===== Page Tabs =====
    const pageTabsEl = $('#page-tabs');
    if (pageTabsEl) {
      pageTabsEl.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.page-tab-delete');
        if (deleteBtn) {
          e.stopPropagation();
          deletePage(parseInt(deleteBtn.dataset.delIdx));
          return;
        }
        const tab = e.target.closest('.page-tab');
        if (tab) {
          switchPage(parseInt(tab.dataset.pageIdx));
        }
      });
    }

    $('#add-page-btn').addEventListener('click', duplicatePage);

    // ===== Save / Load =====
    $('#save-project-btn').addEventListener('click', saveProject);
    $('#load-project-btn').addEventListener('click', () => {
      $('#load-project-file').click();
    });
    $('#load-project-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      loadProject(file);
      e.target.value = '';
    });

    // Basic Info events
    setupBasicInfoEvents();
  }

  // ========== Save Project ==========
  function saveProject() {
    if (!isCompositeTemplate(state.currentTemplate)) {
      saveCurrentPage();
    }

    const projectPages = {};
    for (const tpl in pages) {
      projectPages[tpl] = pages[tpl].map(p => p ? JSON.parse(JSON.stringify(p)) : null);
    }

    const project = {
      version: 5,
      currentTemplate: state.currentTemplate,
      currentSize: state.currentSize,
      customWidth: state.customWidth,
      customHeight: state.customHeight,
      pages: projectPages,
      currentPageIdx: { ...currentPageIdx }
    };

    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const tplName = TEMPLATES[state.currentTemplate]?.name || '배너';
    const filename = `배너_${tplName}_${date}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ========== Load Project ==========
  function loadProject(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const project = JSON.parse(e.target.result);
        if (!project.version || !project.currentTemplate) {
          alert('올바른 프로젝트 파일이 아닙니다.');
          return;
        }
        // Map old eventPage to mainPage
        if (project.currentTemplate === 'eventPage') {
          project.currentTemplate = 'mainPage';
        }
        if (!TEMPLATES[project.currentTemplate]) {
          project.currentTemplate = 'mainPage';
        }

        state.currentTemplate = project.currentTemplate;
        state.currentSize = project.currentSize || 'instagram-post';
        state.customWidth = project.customWidth || 1080;
        state.customHeight = project.customHeight || 1080;

        if (project.version >= 4 && project.pages) {
          // Version 4+: multi-page format
          for (const tpl in pages) {
            pages[tpl] = (project.pages[tpl] || []).map(p => p ? JSON.parse(JSON.stringify(p)) : null);
            if (pages[tpl].length === 0) pages[tpl] = [];
          }
          // Migrate old eventPage pages into mainPage if present
          if (project.pages.eventPage && project.pages.eventPage.length > 0) {
            const oldEventPages = project.pages.eventPage.map(p => p ? JSON.parse(JSON.stringify(p)) : null);
            // If mainPage has only 1 page (old structure), append eventPage as benefit pages
            if (pages.mainPage.length <= 1) {
              oldEventPages.forEach(ep => {
                if (ep && ep.data) ep.data.pageType = 'benefit';
                pages.mainPage.push(ep);
              });
            }
          }
          // Ensure mainPage has 4 pages
          while (pages.mainPage.length < 4) {
            const bd = { ...TEMPLATES.mainPage.benefitDefaults };
            bd.textBlocks = [{ id: 1, type: 'headline', content: INSTA_PAGE_LABELS[pages.mainPage.length] || '라이브 혜택', fontSize: 68, fontWeight: 900, color: '#FFFFFF', fontFamily: '' }];
            bd.benefits = (TEMPLATES.mainPage.benefitDefaults.benefits || []).map(b => ({ ...b }));
            if (TEMPLATES.mainPage.benefitDefaults.benefitStyle) bd.benefitStyle = { ...TEMPLATES.mainPage.benefitDefaults.benefitStyle };
            pages.mainPage.push(buildSnapshotFromDefaults(bd));
          }
          // Ensure all mainPage pages have pageType
          if (pages.mainPage[0] && pages.mainPage[0].data && !pages.mainPage[0].data.pageType) {
            pages.mainPage[0].data.pageType = 'main';
          }
          for (let i = 1; i < pages.mainPage.length; i++) {
            if (pages.mainPage[i] && pages.mainPage[i].data && !pages.mainPage[i].data.pageType) {
              pages.mainPage[i].data.pageType = 'benefit';
            }
          }

          Object.assign(currentPageIdx, project.currentPageIdx || {});
          // Clean up old keys
          delete currentPageIdx.eventPage;
          delete currentPageIdx.detailPage;
          delete currentPageIdx.popupBanner;

          const tpl = state.currentTemplate;
          if (!isCompositeTemplate(tpl) && pages[tpl] && pages[tpl].length > 0 && pages[tpl][currentPageIdx[tpl]]) {
            loadPageState(pages[tpl][currentPageIdx[tpl]]);
          } else if (!isCompositeTemplate(tpl)) {
            if (tpl === 'mainPage') {
              initInstaPages();
            } else {
              loadTemplateDefaults(tpl);
              pages[tpl] = [null];
              currentPageIdx[tpl] = 0;
            }
          }
        } else {
          // Version 3 backward compat: single page per template
          state.data = project.data || {};
          state.data.pageType = 'main';
          state.textBlocks = (project.textBlocks || []).map(b => ({ ...b }));
          state.images = (project.images || []).map(i => ({ ...i }));
          state.benefits = (project.benefits || []).map(b => ({ ...b }));
          state.brandImage = project.brandImage || null;
          state.brandType = project.brandType || 'text';
          state.brandPosition = project.brandPosition || 'top-left';
          state.brandFontSize = project.brandFontSize || 14;
          state.brandLogoHeight = project.brandLogoHeight || 60;
          state.brandOffset = project.brandOffset || { top: 0, bottom: 0, left: 0, right: 0 };
          state.headlinePosition = project.headlinePosition || 'bottom-left';
          state.headlineOffset = project.headlineOffset || { top: 0, bottom: 0, left: 0, right: 0 };

          // Set up pages
          for (const tpl in pages) { pages[tpl] = []; currentPageIdx[tpl] = 0; }
          pages.mainPage = [null];
          currentPageIdx.mainPage = 0;
          // Create remaining 3 default benefit pages
          const tpl = TEMPLATES.mainPage;
          const benefitTitles = ['결제혜택', '사은품', '이벤트'];
          benefitTitles.forEach(title => {
            const bd = { ...tpl.benefitDefaults };
            bd.textBlocks = [{ id: 1, type: 'headline', content: title, fontSize: 68, fontWeight: 900, color: '#FFFFFF', fontFamily: '' }];
            bd.benefits = (tpl.benefitDefaults.benefits || []).map(b => ({ ...b }));
            if (tpl.benefitDefaults.benefitStyle) bd.benefitStyle = { ...tpl.benefitDefaults.benefitStyle };
            pages.mainPage.push(buildSnapshotFromDefaults(bd));
          });
        }

        const maxBlockId = state.textBlocks.reduce((m, b) => Math.max(m, b.id || 0), 0);
        const maxImgId = state.images.reduce((m, i) => Math.max(m, i.id || 0), 0);
        const maxBenId = state.benefits.reduce((m, b) => Math.max(m, b.id || 0), 0);
        nextBlockId = maxBlockId + 1;
        nextImageId = maxImgId + 1;
        nextBenefitId = maxBenId + 1;

        state.textBlocks.forEach(b => { if (b.fontFamily) loadGoogleFont(b.fontFamily); });

        $$('.template-card').forEach(c => {
          c.classList.toggle('active', c.dataset.template === state.currentTemplate);
        });
        state.basicInfoMode = false;
        const biPanel = $('#basic-info-panel');
        if (biPanel) biPanel.classList.add('hidden');
        const normalControls = $('#normal-controls');
        if (normalControls && !isCompositeTemplate(state.currentTemplate)) {
          normalControls.classList.remove('hidden');
        }

        sizeSelect.value = state.currentSize;
        customSizeDiv.classList.toggle('hidden', state.currentSize !== 'custom');
        if (state.currentSize === 'custom') {
          customWidthInput.value = state.customWidth;
          customHeightInput.value = state.customHeight;
        }

        $('#input-brandLogoHeight').value = state.brandLogoHeight;
        $('#brand-logo-height-display').textContent = state.brandLogoHeight;

        refreshAllUI();
        setTimeout(() => updatePreview(), 500);

      } catch (err) {
        console.error('Load failed:', err);
        alert('프로젝트 파일을 불러오는데 실패했습니다.');
      }
    };
    reader.readAsText(file);
  }

  // ========== Saved Colors ==========
  function getSavedColors(target) {
    try { return JSON.parse(localStorage.getItem(`banner_colors_${target}`)) || []; }
    catch { return []; }
  }

  function saveColor(target, color) {
    const colors = getSavedColors(target);
    if (colors.includes(color)) return;
    colors.push(color);
    localStorage.setItem(`banner_colors_${target}`, JSON.stringify(colors));
    renderSavedColors(target);
  }

  function deleteColor(target, color) {
    let colors = getSavedColors(target);
    colors = colors.filter(c => c !== color);
    localStorage.setItem(`banner_colors_${target}`, JSON.stringify(colors));
    renderSavedColors(target);
  }

  function renderSavedColors(target) {
    const container = $(`#saved-${target}`);
    if (!container) return;
    const colors = getSavedColors(target);
    container.innerHTML = colors.map(c => `
      <button class="saved-swatch" data-color="${c}" style="background:${c};" title="${c}">
        <span class="delete-saved" data-del="${c}">&times;</span>
      </button>
    `).join('');

    container.querySelectorAll('.saved-swatch').forEach(swatch => {
      swatch.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-saved')) return;
        const color = swatch.dataset.color;
        state.data[target] = color;
        const colorEl = $(`#color-${target}`);
        const hexEl = $(`#hex-${target}`);
        if (colorEl) colorEl.value = color;
        if (hexEl) hexEl.value = color;
        updatePreview();
      });
    });

    container.querySelectorAll('.delete-saved').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteColor(target, btn.dataset.del);
      });
    });
  }

  function loadSavedColors() {
    ['bgColor', 'accentColor', 'textColor'].forEach(renderSavedColors);
    renderSavedLogos();
    renderSavedBenefitStyles();
    renderSavedBenefitImages();
  }

  // ========== Saved Benefit Styles ==========
  function getSavedBenefitStyles() {
    try { return JSON.parse(localStorage.getItem('banner_saved_benefit_styles')) || []; }
    catch { return []; }
  }

  function saveBenefitStyle() {
    const bs = state.data.benefitStyle;
    if (!bs) {
      alert('저장할 혜택 스타일이 없습니다.');
      return;
    }
    const name = prompt('스타일 이름을 입력하세요:', `혜택스타일 ${getSavedBenefitStyles().length + 1}`);
    if (!name) return;

    const styles = getSavedBenefitStyles();
    styles.push({
      id: Date.now(),
      name: name,
      style: { ...bs }
    });
    try {
      localStorage.setItem('banner_saved_benefit_styles', JSON.stringify(styles));
    } catch (e) {
      alert('저장 공간이 부족합니다. 기존 저장 항목을 삭제해주세요.');
      return;
    }
    renderSavedBenefitStyles();
  }

  function deleteSavedBenefitStyle(id) {
    let styles = getSavedBenefitStyles();
    styles = styles.filter(s => s.id !== id);
    localStorage.setItem('banner_saved_benefit_styles', JSON.stringify(styles));
    renderSavedBenefitStyles();
  }

  function applyBenefitStyle(id) {
    const styles = getSavedBenefitStyles();
    const saved = styles.find(s => s.id === id);
    if (!saved) return;

    state.data.benefitStyle = { ...saved.style };
    populateControls();
    updatePreview();
  }

  function renderSavedBenefitStyles() {
    const container = $('#saved-benefit-styles');
    if (!container) return;
    const styles = getSavedBenefitStyles();
    if (styles.length === 0) { container.innerHTML = ''; return; }

    container.innerHTML = '<div class="saved-bs-label">저장된 스타일</div><div class="saved-bs-grid">' +
      styles.map(s => `
        <div class="saved-bs-item" data-bs-id="${s.id}">
          <div class="saved-bs-colors">
            <span class="saved-bs-dot" style="background:${s.style.titleColor || '#222'}"></span>
            <span class="saved-bs-dot" style="background:${s.style.tagColor || '#5A5E4A'}"></span>
            <span class="saved-bs-dot" style="background:${s.style.pointColor || '#D4634A'}"></span>
          </div>
          <span class="saved-bs-name">${s.name}</span>
          <span class="saved-bs-delete" data-del="${s.id}">&times;</span>
        </div>
      `).join('') + '</div>';

    container.querySelectorAll('.saved-bs-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('saved-bs-delete')) return;
        applyBenefitStyle(parseInt(item.dataset.bsId));
      });
    });

    container.querySelectorAll('.saved-bs-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSavedBenefitStyle(parseInt(btn.dataset.del));
      });
    });
  }

  // ========== Saved Benefit Images ==========
  function getSavedBenefitImages() {
    try { return JSON.parse(localStorage.getItem('banner_saved_benefit_images')) || []; }
    catch { return []; }
  }

  async function saveBenefitImage(dataUrl) {
    const compressed = await compressImage(dataUrl, 400, 0.7);
    const images = getSavedBenefitImages();
    if (images.some(i => i.image === compressed)) return;
    images.push({ id: Date.now(), image: compressed });
    try {
      localStorage.setItem('banner_saved_benefit_images', JSON.stringify(images));
    } catch (e) {
      alert('저장 공간이 부족합니다. 기존 저장된 이미지를 삭제해주세요.');
      return;
    }
    renderBenefitsUI();
  }

  function deleteSavedBenefitImage(id) {
    let images = getSavedBenefitImages();
    images = images.filter(i => i.id !== id);
    localStorage.setItem('banner_saved_benefit_images', JSON.stringify(images));
    renderBenefitsUI();
  }

  function renderSavedBenefitImages() {
    const container = $('#saved-benefit-images');
    if (!container) return;
    const images = getSavedBenefitImages();
    if (images.length === 0) { container.innerHTML = ''; return; }

    container.innerHTML = '<div class="saved-bi-label">저장된 이미지</div><div class="saved-bi-grid">' +
      images.map(img => `
        <div class="saved-bi-item" data-bi-id="${img.id}">
          <img class="saved-bi-thumb" src="${img.image}">
          <span class="saved-bi-delete" data-del="${img.id}">&times;</span>
        </div>
      `).join('') + '</div>';

    container.querySelectorAll('.saved-bi-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSavedBenefitImage(parseInt(btn.dataset.del));
      });
    });
  }

  // ========== Saved Brand Logos ==========
  function getSavedLogos() {
    try { return JSON.parse(localStorage.getItem('banner_saved_logos')) || []; }
    catch { return []; }
  }

  async function saveBrandLogo() {
    if (!state.brandImage) {
      alert('저장할 로고 이미지가 없습니다. 먼저 로고를 업로드하세요.');
      return;
    }

    // If editing a brand logo, save height to brand logo entry
    if (state.currentBrandLogoId && state.biSelectedBrandId) {
      updateBrandLogoHeight(state.biSelectedBrandId, state.currentBrandLogoId, state.brandLogoHeight);
      renderSavedLogos();
      alert('로고 크기가 저장되었습니다.');
      return;
    }

    // Fallback: save to banner_saved_logos
    const compressed = await compressImage(state.brandImage, 300, 0.8);
    const logos = getSavedLogos();
    logos.push({
      id: Date.now(),
      image: compressed,
      position: state.brandPosition,
      height: state.brandLogoHeight,
      offset: { ...state.brandOffset }
    });
    try {
      localStorage.setItem('banner_saved_logos', JSON.stringify(logos));
    } catch (e) {
      alert('저장 공간이 부족합니다. 기존 저장된 로고를 삭제해주세요.');
      return;
    }
    renderSavedLogos();
  }

  function deleteSavedLogo(id) {
    let logos = getSavedLogos();
    logos = logos.filter(l => l.id !== id);
    localStorage.setItem('banner_saved_logos', JSON.stringify(logos));
    renderSavedLogos();
  }

  function renderSavedLogos() {
    const container = $('#saved-logos-container');
    if (!container) return;

    // Show logos from selected brand if available
    if (state.biSelectedBrandId) {
      const brands = getSavedBrands();
      const brand = brands.find(b => b.id === state.biSelectedBrandId);
      if (brand && brand.logos.length > 0) {
        container.innerHTML = '<div class="saved-logos-label">' + brand.name + ' 로고</div><div class="saved-logos-grid">' +
          brand.logos.map(l => {
            const selCls = state.currentBrandLogoId === l.id ? ' saved-logo-item--selected' : '';
            return `
            <div class="saved-logo-item${selCls}" data-logo-id="${l.id}">
              <img class="saved-logo-thumb" src="${l.image}" title="클릭하여 불러오기">
              <span class="saved-logo-delete" data-del="${l.id}">&times;</span>
            </div>`;
          }).join('') + '</div>';

        container.querySelectorAll('.saved-logo-item').forEach(item => {
          item.addEventListener('click', (e) => {
            if (e.target.classList.contains('saved-logo-delete')) return;
            const id = parseInt(item.dataset.logoId);
            const logo = brand.logos.find(l => l.id === id);
            if (!logo) return;

            state.brandImage = logo.image;
            state.brandType = 'image';
            state.brandLogoHeight = logo.height || 60;
            state.currentBrandLogoId = id;

            // Update UI
            $('#brand-thumb').src = logo.image;
            $('#brand-zone').classList.add('hidden');
            $('#brand-preview').classList.remove('hidden');
            $$('.brand-type-btn').forEach(b => b.classList.toggle('active', b.dataset.brandType === 'image'));
            $('#brand-text-group').classList.add('hidden');
            $('#brand-logo-group').classList.remove('hidden');
            $('#input-brandLogoHeight').value = state.brandLogoHeight;
            $('#brand-logo-height-display').textContent = state.brandLogoHeight;

            updatePreview();
            renderSavedLogos(); // Re-render to show selection
          });
        });

        container.querySelectorAll('.saved-logo-delete').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const logoId = parseInt(btn.dataset.del);
            if (state.currentBrandLogoId === logoId) {
              state.currentBrandLogoId = null;
            }
            deleteLogoFromBrand(state.biSelectedBrandId, logoId);
            renderSavedLogos();
          });
        });
        return;
      } else {
        container.innerHTML = '';
        return;
      }
    }

    // Fallback: show saved logos from banner_saved_logos
    const logos = getSavedLogos();
    if (logos.length === 0) { container.innerHTML = ''; return; }

    container.innerHTML = '<div class="saved-logos-label">저장된 로고</div><div class="saved-logos-grid">' +
      logos.map(l => `
        <div class="saved-logo-item" data-logo-id="${l.id}">
          <img class="saved-logo-thumb" src="${l.image}" title="클릭하여 불러오기">
          <span class="saved-logo-delete" data-del="${l.id}">&times;</span>
        </div>
      `).join('') + '</div>';

    container.querySelectorAll('.saved-logo-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('saved-logo-delete')) return;
        const id = parseInt(item.dataset.logoId);
        const logo = logos.find(l => l.id === id);
        if (!logo) return;

        state.brandImage = logo.image;
        state.brandType = 'image';
        state.brandPosition = logo.position || 'top-left';
        state.brandLogoHeight = logo.height || 60;
        state.brandOffset = logo.offset ? { ...logo.offset } : { top: 0, bottom: 0, left: 0, right: 0 };

        // Update UI
        $('#brand-thumb').src = logo.image;
        $('#brand-zone').classList.add('hidden');
        $('#brand-preview').classList.remove('hidden');
        $$('.brand-type-btn').forEach(b => b.classList.toggle('active', b.dataset.brandType === 'image'));
        $('#brand-text-group').classList.add('hidden');
        $('#brand-logo-group').classList.remove('hidden');
        $('#input-brandLogoHeight').value = state.brandLogoHeight;
        $('#brand-logo-height-display').textContent = state.brandLogoHeight;
        $$('.pos-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.pos === state.brandPosition));
        ['top', 'bottom', 'left', 'right'].forEach(dir => {
          const input = $(`#brand-offset-${dir}`);
          if (input) input.value = state.brandOffset[dir] || 0;
        });

        updatePreview();
      });
    });

    container.querySelectorAll('.saved-logo-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSavedLogo(parseInt(btn.dataset.del));
      });
    });
  }

  // ========== Brand Image Upload ==========
  function setupImageUpload(zoneId, fileId, previewId, thumbId, removeId, stateKey) {
    const zone = $(`#${zoneId}`);
    const fileInput = $(`#${fileId}`);
    const previewDiv = $(`#${previewId}`);
    const thumbImg = $(`#${thumbId}`);
    const removeBtn = $(`#${removeId}`);
    if (!zone || !fileInput) return;

    zone.addEventListener('click', () => fileInput.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => { zone.classList.remove('dragover'); });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) loadBrandImage(file, stateKey, zone, previewDiv, thumbImg);
    });
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) loadBrandImage(file, stateKey, zone, previewDiv, thumbImg);
    });
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        state[stateKey] = null;
        zone.classList.remove('hidden');
        previewDiv.classList.add('hidden');
        updatePreview();
      });
    }
  }

  function loadBrandImage(file, stateKey, zone, previewDiv, thumbImg) {
    const reader = new FileReader();
    reader.onload = (e) => {
      state[stateKey] = e.target.result;
      thumbImg.src = e.target.result;
      zone.classList.add('hidden');
      previewDiv.classList.remove('hidden');
      updatePreview();
    };
    reader.readAsDataURL(file);
  }

  // ========== Page Management ==========
  function createStateSnapshot() {
    const dataCopy = { ...state.data };
    if (state.data.benefitStyle) dataCopy.benefitStyle = { ...state.data.benefitStyle };
    if (state.data.extraTexts) dataCopy.extraTexts = state.data.extraTexts.map(t => ({ ...t }));
    return {
      data: dataCopy,
      textBlocks: state.textBlocks.map(b => ({ ...b })),
      benefits: state.benefits.map(b => ({ ...b })),
      images: state.images.map(i => ({ ...i })),
      headlinePosition: state.headlinePosition,
      headlineOffset: { ...state.headlineOffset },
      brandPosition: state.brandPosition,
      brandOffset: { ...state.brandOffset },
      brandImage: state.brandImage,
      brandType: state.brandType,
      brandFontSize: state.brandFontSize,
      brandLogoHeight: state.brandLogoHeight,
    };
  }

  function saveCurrentPage() {
    const tpl = state.currentTemplate;
    if (isCompositeTemplate(tpl)) return; // Composite templates have no editable pages
    if (!pages[tpl]) return;
    pages[tpl][currentPageIdx[tpl]] = createStateSnapshot();
  }

  function loadPageState(saved) {
    state.data = { ...saved.data };
    if (saved.data.benefitStyle) state.data.benefitStyle = { ...saved.data.benefitStyle };
    if (saved.data.extraTexts) state.data.extraTexts = saved.data.extraTexts.map(t => ({ ...t }));
    state.textBlocks = saved.textBlocks.map(b => ({ ...b }));
    state.benefits = saved.benefits.map(b => ({ ...b }));
    state.images = saved.images.map(i => ({ ...i }));
    state.headlinePosition = saved.headlinePosition;
    state.headlineOffset = { ...saved.headlineOffset };
    state.brandPosition = saved.brandPosition;
    state.brandOffset = { ...saved.brandOffset };
    state.brandImage = saved.brandImage;
    state.brandType = saved.brandType;
    state.brandFontSize = saved.brandFontSize;
    state.brandLogoHeight = saved.brandLogoHeight;
  }

  function loadTemplateDefaults(templateId) {
    const tpl = TEMPLATES[templateId];
    if (!tpl || !tpl.defaultData) return;
    loadFromDefaults(tpl.defaultData);
  }

  function syncBrandUI() {
    if (state.brandImage) {
      $('#brand-thumb').src = state.brandImage;
      $('#brand-zone').classList.add('hidden');
      $('#brand-preview').classList.remove('hidden');
    } else {
      $('#brand-zone').classList.remove('hidden');
      $('#brand-preview').classList.add('hidden');
    }
    $$('.brand-type-btn').forEach(b => b.classList.toggle('active', b.dataset.brandType === state.brandType));
    $('#brand-text-group').classList.toggle('hidden', state.brandType !== 'text');
    $('#brand-logo-group').classList.toggle('hidden', state.brandType !== 'image');

    // Update save button text based on context
    const saveBtn = $('#save-brand-logo');
    if (saveBtn) {
      saveBtn.textContent = (state.currentBrandLogoId && state.biSelectedBrandId) ? '크기 저장' : '로고 저장';
    }
  }

  function refreshAllUI() {
    syncBrandUI();
    populateControls();
    updateVisibleControls();
    renderTextBlocksUI();
    renderBenefitsUI();
    renderImagesUI();
    renderExtraTextsUI();
    renderSavedLogos();
    renderPageTabs();
    updatePreview();
  }

  function switchTemplate(templateId) {
    // Save current page (only for non-composite templates)
    if (!isCompositeTemplate(state.currentTemplate)) {
      saveCurrentPage();
    }
    state.currentTemplate = templateId;

    // Composite templates don't have their own pages
    if (isCompositeTemplate(templateId)) {
      // Make sure current Instagram edits are saved
      if (pages.mainPage && pages.mainPage.length > 0) {
        // Already saved above if we were on Instagram
      }
      refreshAllUI();
      return;
    }

    if (!pages[templateId] || pages[templateId].length === 0) {
      if (templateId === 'mainPage') {
        initInstaPages();
      } else {
        loadTemplateDefaults(templateId);
        pages[templateId] = [null];
        currentPageIdx[templateId] = 0;
      }
    } else {
      const page = pages[templateId][currentPageIdx[templateId]];
      if (page) {
        loadPageState(page);
      } else {
        loadTemplateDefaults(templateId);
      }
    }

    refreshAllUI();
  }

  function switchPage(pageIdx) {
    const tpl = state.currentTemplate;
    if (pageIdx === currentPageIdx[tpl]) return;
    if (pageIdx < 0 || pageIdx >= pages[tpl].length) return;
    saveCurrentPage();
    currentPageIdx[tpl] = pageIdx;
    const page = pages[tpl][pageIdx];
    if (page) {
      loadPageState(page);
    }
    refreshAllUI();
  }

  function duplicatePage() {
    saveCurrentPage();
    const tpl = state.currentTemplate;
    const currentPage = pages[tpl][currentPageIdx[tpl]];
    const newPage = JSON.parse(JSON.stringify(currentPage));
    pages[tpl].push(newPage);
    currentPageIdx[tpl] = pages[tpl].length - 1;
    loadPageState(newPage);
    refreshAllUI();
  }

  function deletePage(pageIdx) {
    const tpl = state.currentTemplate;
    if (pages[tpl].length <= 1) return;
    pages[tpl].splice(pageIdx, 1);
    if (currentPageIdx[tpl] >= pages[tpl].length) {
      currentPageIdx[tpl] = pages[tpl].length - 1;
    }
    const page = pages[tpl][currentPageIdx[tpl]];
    if (page) {
      loadPageState(page);
    }
    refreshAllUI();
  }

  function renderPageTabs() {
    const tpl = state.currentTemplate;
    const container = $('#page-tabs');
    const addBtn = $('#add-page-btn');
    if (!container) return;

    // Hide tabs for composite templates
    if (isCompositeTemplate(tpl)) {
      container.innerHTML = '';
      if (addBtn) addBtn.style.display = 'none';
      return;
    }

    const pageList = pages[tpl] || [];
    const isInsta = tpl === 'mainPage';

    // For Instagram, use named labels and hide delete/add buttons (fixed 4 pages)
    if (isInsta) {
      if (addBtn) addBtn.style.display = 'none';
      container.innerHTML = pageList.map((_, idx) => {
        const label = INSTA_PAGE_LABELS[idx] || `페이지 ${idx + 1}`;
        return `
          <button class="page-tab ${idx === currentPageIdx[tpl] ? 'active' : ''}" data-page-idx="${idx}">
            <span class="page-tab-num">${label}</span>
          </button>`;
      }).join('');
    } else {
      if (addBtn) addBtn.style.display = '';
      container.innerHTML = pageList.map((_, idx) => `
        <button class="page-tab ${idx === currentPageIdx[tpl] ? 'active' : ''}" data-page-idx="${idx}">
          <span class="page-tab-num">페이지 ${idx + 1}</span>
          ${pageList.length > 1 ? `<span class="page-tab-delete" data-del-idx="${idx}">&times;</span>` : ''}
        </button>
      `).join('');
    }
  }

  // ========== Basic Info Mode ==========
  function enterBasicInfoMode() {
    state.basicInfoMode = true;
    const biPanel = $('#basic-info-panel');
    const normalControls = $('#normal-controls');
    if (biPanel) biPanel.classList.remove('hidden');
    if (normalControls) normalControls.classList.add('hidden');
    // Show usage guide
    const usageGuide = $('#usage-guide');
    if (usageGuide) usageGuide.style.display = '';
    // Hide download & size info
    const previewActions = $('.preview-actions');
    if (previewActions) previewActions.style.display = 'none';
    renderBrandSelector();
    showBasicInfoPreview();
  }

  function exitBasicInfoMode() {
    state.basicInfoMode = false;
    const biPanel = $('#basic-info-panel');
    const normalControls = $('#normal-controls');
    if (biPanel) biPanel.classList.add('hidden');
    // Only show normal controls for non-composite templates
    if (normalControls && !isCompositeTemplate(state.currentTemplate)) {
      normalControls.classList.remove('hidden');
    }
    // Hide usage guide
    const usageGuide = $('#usage-guide');
    if (usageGuide) usageGuide.style.display = 'none';
    // Restore preview UI
    const previewActions = $('.preview-actions');
    if (previewActions) previewActions.style.display = '';
    previewWrapper.style.boxShadow = '';
    previewWrapper.style.background = '';
    previewWrapper.style.borderRadius = '';
    previewWrapper.style.overflow = '';
  }

  function showBasicInfoPreview() {
    // Make wrapper transparent — no white card
    previewWrapper.style.boxShadow = 'none';
    previewWrapper.style.background = 'transparent';
    previewWrapper.style.borderRadius = '0';
    previewWrapper.style.overflow = 'visible';
    previewWrapper.style.width = '';
    previewWrapper.style.height = '';

    previewCanvas.style.width = '';
    previewCanvas.style.height = '';
    previewCanvas.style.transform = 'none';

    const selectedBrandId = state.biSelectedBrandId;
    const brands = getSavedBrands();
    const selectedBrand = brands.find(b => b.id === selectedBrandId);
    const brandLogo = state.biBrandImage;

    if (selectedBrand) {
      // Brand selected mode — show logo, brand name, generate button
      let logoHtml = '';
      if (brandLogo) {
        logoHtml = `<img src="${brandLogo}" style="max-width:240px; max-height:160px; object-fit:contain;">`;
      } else {
        logoHtml = `<div style="width:120px; height:120px; border-radius:16px; background:#e0e3e8; display:flex; align-items:center; justify-content:center; font-size:40px; color:#adb5bd;">🏷️</div>`;
      }
      previewCanvas.innerHTML = `
        <div style="
          display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          font-family:'Noto Sans KR',sans-serif;
          gap:20px;
          padding:60px 40px;
        ">
          ${logoHtml}
          <div style="font-size:24px; font-weight:600; color:#444; text-align:center; line-height:1.6; margin-top:8px;">
            ${selectedBrand.name} 브랜드<br>행사배너 생성페이지 입니다
          </div>
          <button class="preview-generate-btn" style="
            margin-top:16px;
            padding:14px 48px;
            background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color:#fff;
            border:none;
            border-radius:10px;
            font-size:17px;
            font-weight:700;
            cursor:pointer;
            font-family:'Noto Sans KR',sans-serif;
            box-shadow:0 4px 15px rgba(102,126,234,0.4);
            transition: transform 0.15s, box-shadow 0.15s;
          ">행사배너 생성하기</button>
        </div>
      `;
      // Bind click on in-preview generate button
      const previewGenBtn = previewCanvas.querySelector('.preview-generate-btn');
      if (previewGenBtn) {
        previewGenBtn.addEventListener('click', generateFromBasicInfo);
        previewGenBtn.addEventListener('mouseenter', () => {
          previewGenBtn.style.transform = 'scale(1.05)';
          previewGenBtn.style.boxShadow = '0 6px 20px rgba(102,126,234,0.5)';
        });
        previewGenBtn.addEventListener('mouseleave', () => {
          previewGenBtn.style.transform = 'scale(1)';
          previewGenBtn.style.boxShadow = '0 4px 15px rgba(102,126,234,0.4)';
        });
      }
    } else {
      // Default mode — no brand selected
      previewCanvas.innerHTML = `
        <div style="
          display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          font-family:'Noto Sans KR',sans-serif;
          gap:16px;
          padding:80px 40px;
        ">
          <div style="font-size:28px; font-weight:700; color:#444;">행사배너 간편 메이커 입니다</div>
          <div style="font-size:16px; color:#999;">왼쪽 패널에서 행사 정보를 입력하세요.</div>
        </div>
      `;
    }

    // Toggle left panel generate button visibility
    const leftGenBtn = $('#generate-banner-btn');
    if (leftGenBtn) {
      leftGenBtn.style.display = selectedBrand ? 'none' : '';
    }

    sizeInfo.textContent = '';
  }

  // ========== Benefit Tabs (Basic Info) ==========
  function saveBenefitInputs() {
    const activeIdx = state.biActiveTab || 0;
    const activeTab = state.biTabs[activeIdx];
    if (!activeTab) return;
    const container = $('#bi-benefits-section');
    if (!container) return;
    const titleInput = container.querySelector('.bi-tab-title-input');
    if (titleInput) activeTab.title = titleInput.value;
    container.querySelectorAll('.bi-benefit-item').forEach((item) => {
      const idx = parseInt(item.dataset.benefitIdx);
      if (!activeTab.benefits[idx]) return;
      const t = item.querySelector('.bi-benefit-title');
      const d = item.querySelector('.bi-benefit-detail');
      const p = item.querySelector('.bi-benefit-point');
      if (t) activeTab.benefits[idx].title = t.value;
      if (d) activeTab.benefits[idx].detail = d.value;
      if (p) activeTab.benefits[idx].point = p.value;
    });
  }

  function renderBenefitTabs() {
    const container = $('#bi-benefits-section');
    if (!container) return;
    const tabs = state.biTabs;
    const activeIdx = state.biActiveTab || 0;
    const activeTab = tabs[activeIdx];
    if (!activeTab) return;

    let html = '';

    // Tab bar
    html += '<div class="bi-tab-bar">';
    tabs.forEach((tab, i) => {
      const cls = i === activeIdx ? ' bi-tab--active' : '';
      html += `<button class="bi-tab${cls}" data-tab-idx="${i}">${tab.title}</button>`;
    });
    html += '</div>';

    // Tab title edit
    html += `<div class="bi-tab-title-edit">
      <label>탭 제목</label>
      <input type="text" class="bi-tab-title-input" value="${activeTab.title}">
    </div>`;

    // Benefit items
    activeTab.benefits.forEach((b, i) => {
      html += `<div class="bi-benefit-item" data-benefit-idx="${i}">
        <div class="bi-benefit-header-row">
          <span class="bi-benefit-header">${activeTab.labelPrefix} ${String(i + 1).padStart(2, '0')}</span>
          <button class="bi-benefit-delete" data-benefit-idx="${i}" title="삭제">&times;</button>
        </div>
        <div class="form-group">
          <label>내용</label>
          <input type="text" class="bi-benefit-title" data-benefit-idx="${i}" value="${b.title || ''}" placeholder="예: 알림받기 20,000원">
        </div>
        <div class="form-group">
          <label>세부내용</label>
          <textarea class="bi-benefit-detail" data-benefit-idx="${i}" rows="2" placeholder="예: 라이브 방송 알림받기 시 적립금 지급">${b.detail || ''}</textarea>
        </div>
        <div class="form-group">
          <label>포인트 수치</label>
          <input type="text" class="bi-benefit-point" data-benefit-idx="${i}" value="${b.point || ''}" placeholder="예: 2만원">
        </div>
      </div>`;
    });

    // Add benefit button
    html += '<button class="bi-benefit-add-btn" id="bi-add-benefit">+ 혜택 추가</button>';

    container.innerHTML = html;

    // --- Bind events ---

    // Tab click
    container.querySelectorAll('.bi-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        saveBenefitInputs();
        state.biActiveTab = parseInt(btn.dataset.tabIdx);
        renderBenefitTabs();
      });
    });

    // Tab title input → live update tab title + tab button
    const titleInput = container.querySelector('.bi-tab-title-input');
    if (titleInput) {
      titleInput.addEventListener('input', () => {
        activeTab.title = titleInput.value;
        const activeBtn = container.querySelector('.bi-tab--active');
        if (activeBtn) activeBtn.textContent = titleInput.value;
      });
    }

    // Benefit input → save to state on input
    container.querySelectorAll('.bi-benefit-title, .bi-benefit-detail, .bi-benefit-point').forEach(el => {
      el.addEventListener('input', () => {
        const idx = parseInt(el.dataset.benefitIdx);
        if (!activeTab.benefits[idx]) return;
        if (el.classList.contains('bi-benefit-title')) activeTab.benefits[idx].title = el.value;
        else if (el.classList.contains('bi-benefit-detail')) activeTab.benefits[idx].detail = el.value;
        else if (el.classList.contains('bi-benefit-point')) activeTab.benefits[idx].point = el.value;
      });
    });

    // Delete benefit
    container.querySelectorAll('.bi-benefit-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.benefitIdx);
        if (activeTab.benefits.length <= 1) return; // keep at least 1
        activeTab.benefits.splice(idx, 1);
        renderBenefitTabs();
      });
    });

    // Add benefit
    const addBtn = container.querySelector('#bi-add-benefit');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        activeTab.benefits.push({ title: '', detail: '', point: '' });
        renderBenefitTabs();
      });
    }

  }

  // ========== Brand Management (localStorage) ==========
  function getSavedBrands() {
    try { return JSON.parse(localStorage.getItem('banner_brands')) || []; }
    catch { return []; }
  }

  function saveBrandsToStorage(brands) {
    try {
      localStorage.setItem('banner_brands', JSON.stringify(brands));
    } catch (e) {
      alert('저장 공간이 부족합니다. 기존 저장 항목을 삭제해주세요.');
    }
  }

  function addBrandEntry(name) {
    const brands = getSavedBrands();
    const newBrand = { id: Date.now(), name: name, logos: [] };
    brands.push(newBrand);
    saveBrandsToStorage(brands);
    return newBrand;
  }

  function deleteBrandEntry(brandId) {
    let brands = getSavedBrands();
    brands = brands.filter(b => b.id !== brandId);
    saveBrandsToStorage(brands);
  }

  async function addLogoToBrand(brandId, imageData) {
    const compressed = await compressImage(imageData, 300, 0.8);
    const brands = getSavedBrands();
    const brand = brands.find(b => b.id === brandId);
    if (!brand) return;
    const newLogo = { id: Date.now(), image: compressed, height: 60 };
    brand.logos.push(newLogo);
    saveBrandsToStorage(brands);
    return newLogo;
  }

  function updateBrandLogoHeight(brandId, logoId, height) {
    const brands = getSavedBrands();
    const brand = brands.find(b => b.id === brandId);
    if (!brand) return;
    const logo = brand.logos.find(l => l.id === logoId);
    if (!logo) return;
    logo.height = height;
    saveBrandsToStorage(brands);
  }

  function deleteLogoFromBrand(brandId, logoId) {
    const brands = getSavedBrands();
    const brand = brands.find(b => b.id === brandId);
    if (!brand) return;
    brand.logos = brand.logos.filter(l => l.id !== logoId);
    saveBrandsToStorage(brands);
  }

  function renderBrandSelector() {
    const container = $('#bi-brand-selector');
    if (!container) return;
    const brands = getSavedBrands();
    const selectedId = state.biSelectedBrandId;
    const selectedBrand = brands.find(b => b.id === selectedId);

    // If selectedId doesn't exist in brands, clear selection
    if (selectedId && !selectedBrand) {
      state.biSelectedBrandId = null;
    }

    let html = '<div class="brand-chips">';
    brands.forEach(b => {
      const cls = b.id === selectedId ? ' brand-chip--active' : '';
      html += `<button class="brand-chip${cls}" data-brand-id="${b.id}">${b.name}</button>`;
    });
    html += '<button class="brand-chip brand-chip--add" id="bi-add-brand">+ 추가</button>';
    html += '</div>';

    if (selectedBrand) {
      html += '<div class="brand-logos-area">';
      html += '<div class="brand-logos-header">';
      html += `<span class="brand-logos-title">${selectedBrand.name} 로고</span>`;
      html += '</div>';
      html += '<div class="brand-logo-grid">';
      selectedBrand.logos.forEach(logo => {
        const selCls = state.biSelectedLogoId === logo.id ? ' brand-logo-item--selected' : '';
        html += `
          <div class="brand-logo-item${selCls}" data-logo-id="${logo.id}">
            <img src="${logo.image}">
            <span class="brand-logo-delete" data-del-logo="${logo.id}">&times;</span>
          </div>`;
      });
      html += '<button class="brand-logo-add" id="bi-add-logo">+ 로고<br>추가</button>';
      html += '</div>';
      if (selectedBrand.logos.length === 0) {
        html += '<div class="brand-empty-msg">로고를 추가해주세요</div>';
      }
      html += '<div class="brand-bottom-actions">';
      html += `<button class="brand-delete-btn" id="bi-delete-brand">브랜드 삭제</button>`;
      html += '</div>';
      html += '</div>';
    } else if (brands.length === 0) {
      html += '<div class="brand-empty-msg">브랜드를 추가하면 로고를 등록할 수 있습니다.</div>';
    }

    container.innerHTML = html;

    // --- Bind events ---

    // Brand chip click → select brand
    container.querySelectorAll('.brand-chip[data-brand-id]').forEach(chip => {
      chip.addEventListener('click', () => {
        const brandId = parseInt(chip.dataset.brandId);
        if (state.biSelectedBrandId === brandId) {
          // Toggle off if clicking the same brand
          state.biSelectedBrandId = null;
          state.biBrandImage = null;
          state.biSelectedLogoId = null;
          state.biBrandLogoHeight = 60;
        } else {
          state.biSelectedBrandId = brandId;
          state.biBrandImage = null;
          state.biSelectedLogoId = null;
          state.biBrandLogoHeight = 60;
        }
        renderBrandSelector();
      });
    });

    // Add brand
    const addBrandBtn = container.querySelector('#bi-add-brand');
    if (addBrandBtn) {
      addBrandBtn.addEventListener('click', () => {
        const name = prompt('브랜드 이름을 입력하세요:');
        if (!name || !name.trim()) return;
        const newBrand = addBrandEntry(name.trim());
        state.biSelectedBrandId = newBrand.id;
        state.biBrandImage = null;
        renderBrandSelector();
      });
    }

    // Logo click → select logo
    container.querySelectorAll('.brand-logo-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.brand-logo-delete')) return;
        const logoId = parseInt(item.dataset.logoId);
        const logo = selectedBrand && selectedBrand.logos.find(l => l.id === logoId);
        if (logo) {
          // Toggle: click again to deselect
          if (state.biSelectedLogoId === logoId) {
            state.biBrandImage = null;
            state.biSelectedLogoId = null;
            state.biBrandLogoHeight = 60;
          } else {
            state.biBrandImage = logo.image;
            state.biSelectedLogoId = logoId;
            state.biBrandLogoHeight = logo.height || 60;
          }
          renderBrandSelector();
        }
      });
    });

    // Delete logo
    container.querySelectorAll('.brand-logo-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const logoId = parseInt(btn.dataset.delLogo);
        if (state.biSelectedLogoId === logoId) {
          state.biBrandImage = null;
          state.biSelectedLogoId = null;
          state.biBrandLogoHeight = 60;
        }
        deleteLogoFromBrand(selectedId, logoId);
        renderBrandSelector();
      });
    });

    // Add logo button
    const addLogoBtn = container.querySelector('#bi-add-logo');
    if (addLogoBtn) {
      addLogoBtn.addEventListener('click', () => {
        $('#bi-brand-logo-file').click();
      });
    }

    // Delete brand
    const deleteBrandBtn = container.querySelector('#bi-delete-brand');
    if (deleteBrandBtn) {
      deleteBrandBtn.addEventListener('click', () => {
        if (!confirm(`'${selectedBrand.name}' 브랜드를 삭제하시겠습니까?`)) return;
        deleteBrandEntry(selectedId);
        state.biSelectedBrandId = null;
        state.biBrandImage = null;
        state.biSelectedLogoId = null;
        state.biBrandLogoHeight = 60;
        renderBrandSelector();
      });
    }

    // Update preview when brand/logo selection changes
    if (state.basicInfoMode) {
      showBasicInfoPreview();
    }
  }

  function setupBasicInfoEvents() {
    // Logo file input for adding logos to brands
    const brandLogoFile = $('#bi-brand-logo-file');
    if (brandLogoFile) {
      brandLogoFile.addEventListener('change', () => {
        const file = brandLogoFile.files[0];
        if (!file || !file.type.startsWith('image/') || !state.biSelectedBrandId) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const newLogo = await addLogoToBrand(state.biSelectedBrandId, ev.target.result);
          state.biBrandImage = ev.target.result;
          state.biSelectedLogoId = newLogo ? newLogo.id : null;
          state.biBrandLogoHeight = 60;
          renderBrandSelector();
        };
        reader.readAsDataURL(file);
        brandLogoFile.value = '';
      });
    }

    const generateBtn = $('#generate-banner-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', generateFromBasicInfo);
    }

    renderBrandSelector();
    renderBenefitTabs();
  }

  function generateFromBasicInfo() {
    // Save any unsaved inputs
    saveBenefitInputs();

    const biData = {
      brandImage: state.biBrandImage,
      intro: ($('#bi-intro').value || '').trim(),
      title: ($('#bi-title').value || '').trim(),
      datetime: ($('#bi-datetime').value || '').trim(),
    };

    // --- Get selected brand name ---
    const brands = getSavedBrands();
    const selectedBrand = brands.find(b => b.id === state.biSelectedBrandId);
    const brandName = selectedBrand ? selectedBrand.name : '';
    const logoHeight = state.biBrandLogoHeight || 60;

    // --- Build benefits from each tab ---
    function tabBenefits(tab) {
      return tab.benefits.map((b, i) => ({
        id: i + 1,
        label: `${tab.labelPrefix} ${String(i + 1).padStart(2, '0')}.`,
        title: (b.title || '').trim(),
        detail: (b.detail || '').trim(),
        point: (b.point || '').trim(),
        image: null
      }));
    }

    // --- Build 4 Instagram pages ---
    const tpl = TEMPLATES.mainPage;

    // Page 1: Main (image & title)
    const mainData = { ...tpl.defaultData };
    mainData.pageType = 'main';
    if (mainData.extraTexts) mainData.extraTexts = [];
    if (brandName) mainData.brandName = brandName;

    const mainSnapshot = {
      data: mainData,
      textBlocks: [
        { id: 1, type: 'subtext', content: biData.intro || '행사 소개문구', fontSize: 24, fontWeight: 500, color: '#FFFFFF', fontFamily: '' },
        { id: 2, type: 'headline', content: biData.title || '행사타이틀', fontSize: 64, fontWeight: 900, color: '#FFFFFF', fontFamily: '' },
        { id: 3, type: 'subtext', content: biData.datetime || '날짜 및 시간 정보', fontSize: 18, fontWeight: 400, color: '#FFFFFF', fontFamily: '' }
      ],
      benefits: [],
      images: [],
      headlinePosition: mainData.headlinePosition || 'top-center',
      headlineOffset: mainData.headlineOffset ? { ...mainData.headlineOffset } : { top: 0, bottom: 0, left: 0, right: 0 },
      brandPosition: mainData.brandPosition || 'top-center',
      brandOffset: mainData.brandOffset ? { ...mainData.brandOffset } : { top: 0, bottom: 0, left: 0, right: 0 },
      brandImage: biData.brandImage,
      brandType: biData.brandImage ? 'image' : 'text',
      brandFontSize: mainData.brandFontSize || 32,
      brandLogoHeight: logoHeight,
    };

    // Helper to build a benefit page snapshot from a tab
    function buildBenefitSnapshot(tab) {
      const bd = { ...tpl.benefitDefaults };
      bd.pageType = 'benefit';
      if (tpl.benefitDefaults.benefitStyle) bd.benefitStyle = { ...tpl.benefitDefaults.benefitStyle };
      if (brandName) bd.brandName = brandName;
      if (tab.cardHeight > 0) bd.benefitCardHeight = tab.cardHeight;
      return {
        data: bd,
        textBlocks: [
          { id: 1, type: 'headline', content: tab.title, fontSize: 68, fontWeight: 900, color: '#FFFFFF', fontFamily: '' }
        ],
        benefits: tabBenefits(tab),
        images: [],
        headlinePosition: bd.headlinePosition || 'top-center',
        headlineOffset: bd.headlineOffset ? { ...bd.headlineOffset } : { top: 0, bottom: 0, left: 0, right: 0 },
        brandPosition: bd.brandPosition || 'top-center',
        brandOffset: bd.brandOffset ? { ...bd.brandOffset } : { top: 0, bottom: 0, left: 0, right: 0 },
        brandImage: biData.brandImage,
        brandType: biData.brandImage ? 'image' : 'text',
        brandFontSize: bd.brandFontSize || 22,
        brandLogoHeight: logoHeight,
      };
    }

    // Page 2: 결제혜택, Page 3: 사은품, Page 4: 이벤트
    const page2 = buildBenefitSnapshot(state.biTabs[0]);
    const page3 = buildBenefitSnapshot(state.biTabs[1]);
    const page4 = buildBenefitSnapshot(state.biTabs[2]);

    // Set 4 Instagram pages
    pages.mainPage = [mainSnapshot, page2, page3, page4];
    currentPageIdx.mainPage = 0;

    // --- Switch to Instagram template ---
    state.currentTemplate = 'mainPage';
    state.currentBrandLogoId = state.biSelectedLogoId;
    loadPageState(mainSnapshot);
    $$('.template-card').forEach(c => {
      c.classList.toggle('active', c.dataset.template === 'mainPage');
    });
    exitBasicInfoMode();
    refreshAllUI();

    nextBlockId = 10;
    nextImageId = 10;
    nextBenefitId = 10;
  }

  document.addEventListener('DOMContentLoaded', init);

})();
