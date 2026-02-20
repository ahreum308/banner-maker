// ==========================================
// SNS Banner Template Definitions
// ==========================================

const SIZE_PRESETS = {
  'instagram-post':  { name: '인스타그램 피드',     width: 1080, height: 1080 },
  'instagram-story': { name: '인스타그램 스토리',    width: 1080, height: 1920 },
  'facebook-post':   { name: '페이스북 게시물',     width: 1200, height: 630  },
  'naver-blog':      { name: '네이버 블로그 썸네일',  width: 1200, height: 628  },
  'kakao':           { name: '카카오톡 공유',        width: 800,  height: 400  },
};

// ========== Google Fonts ==========
const AVAILABLE_FONTS = [
  { name: 'Noto Sans KR', label: 'Noto Sans KR (기본)' },
  { name: 'Noto Serif KR', label: 'Noto Serif KR (명조)' },
  { name: 'Gothic A1', label: 'Gothic A1' },
  { name: 'Jua', label: '주아 (Jua)' },
  { name: 'Do Hyeon', label: '도현 (Do Hyeon)' },
  { name: 'Black Han Sans', label: 'Black Han Sans' },
  { name: 'Sunflower', label: '해바라기 (Sunflower)' },
  { name: 'Nanum Gothic', label: '나눔고딕' },
  { name: 'Nanum Myeongjo', label: '나눔명조' },
  { name: 'Nanum Pen Script', label: '나눔펜스크립트' },
  { name: 'Gaegu', label: '개구 (Gaegu)' },
  { name: 'Gamja Flower', label: '감자꽃' },
  { name: 'Poor Story', label: '풍년체 (Poor Story)' },
  { name: 'IBM Plex Sans KR', label: 'IBM Plex Sans KR' },
  { name: 'Roboto', label: 'Roboto' },
  { name: 'Montserrat', label: 'Montserrat' },
  { name: 'Playfair Display', label: 'Playfair Display' },
  { name: 'Oswald', label: 'Oswald' },
  { name: 'Poppins', label: 'Poppins' },
];

function loadGoogleFont(fontName) {
  if (!fontName) return;
  const id = 'gfont-' + fontName.replace(/\s/g, '-');
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;700;900&display=swap`;
  document.head.appendChild(link);
}

// Field visibility per template
const TEMPLATE_FIELDS = {
  mainPage: {
    show: ['brandName', 'ctaText'],
    hide: ['productName', 'eventPeriod', 'discountBadge', 'originalPrice', 'salePrice', 'giftName', 'condition', 'giftImage']
  },
  freeForm: {
    show: ['brandName'],
    hide: ['productName', 'discountBadge', 'originalPrice', 'salePrice', 'ctaText', 'eventPeriod', 'giftName', 'condition', 'giftImage']
  },
  detailPage: {
    show: [],
    hide: ['productName', 'brandName', 'ctaText', 'eventPeriod', 'discountBadge', 'originalPrice', 'salePrice', 'giftName', 'condition', 'giftImage']
  },
  popupBanner: {
    show: [],
    hide: ['productName', 'brandName', 'ctaText', 'eventPeriod', 'discountBadge', 'originalPrice', 'salePrice', 'giftName', 'condition', 'giftImage']
  }
};

// Instagram page type labels for tabs
const INSTA_PAGE_LABELS = ['메인', '결제혜택', '사은품', '이벤트'];

// ========== Shared Brand Renderer ==========
function renderBrand(data, s) {
  const pos = data.brandPosition || 'top-left';
  const [vAlign, hAlign] = pos.split('-');
  const off = data.brandOffset || { top: 0, bottom: 0, left: 0, right: 0 };

  const posStyles = [];
  if (vAlign === 'top') {
    posStyles.push(`top:${(24 - off.top + off.bottom) * s}px`);
  } else {
    posStyles.push(`bottom:${(24 + off.top - off.bottom) * s}px`);
  }
  if (hAlign === 'left') {
    posStyles.push(`left:${(32 - off.left + off.right) * s}px`);
  } else if (hAlign === 'right') {
    posStyles.push(`right:${(32 + off.left - off.right) * s}px`);
  } else {
    const hShift = (-off.left + off.right) * s;
    posStyles.push(`left:calc(50% + ${hShift}px); transform:translateX(-50%)`);
  }

  const textAlign = hAlign === 'left' ? 'left' : hAlign === 'right' ? 'right' : 'center';

  let content;
  if (data.brandType === 'image' && data.brandImage) {
    const h = (data.brandLogoHeight || 60) * s;
    content = `<img src="${data.brandImage}" style="height:${h}px; width:auto; display:block; object-fit:contain; pointer-events:none;">`;
  } else {
    const bfs = (data.brandFontSize || 14) * s;
    content = `<span style="font-size:${bfs}px; font-weight:700; letter-spacing:${2*s}px; opacity:0.9;
      border:${1.5*s}px solid rgba(255,255,255,0.5); padding:${4*s}px ${12*s}px; border-radius:${4*s}px;">
      ${data.brandName || ''}
    </span>`;
  }

  return `
    <div data-draggable="brand" style="
      position:absolute; ${posStyles.join('; ')};
      z-index:10; text-align:${textAlign};
      cursor:move; pointer-events:auto;
    ">${content}</div>
  `;
}

// ========== Shared Text Blocks Renderer ==========
function renderTextBlocks(data, s) {
  const pos = data.headlinePosition || 'bottom-left';
  const [vAlign, hAlign] = pos.split('-');
  const off = data.headlineOffset || { top: 0, bottom: 0, left: 0, right: 0 };

  const posStyles = [];
  if (vAlign === 'top') {
    posStyles.push(`top:${(60 - off.top + off.bottom) * s}px`);
  } else {
    posStyles.push(`bottom:${(60 + off.top - off.bottom) * s}px`);
  }
  if (hAlign === 'left') {
    posStyles.push(`left:${(40 - off.left + off.right) * s}px`);
    posStyles.push(`right:${40 * s}px`);
  } else if (hAlign === 'right') {
    posStyles.push(`right:${(40 + off.left - off.right) * s}px`);
    posStyles.push(`left:${40 * s}px`);
  } else {
    posStyles.push(`left:${(40 - off.left + off.right) * s}px`);
    posStyles.push(`right:${(40 + off.left - off.right) * s}px`);
  }

  const textAlign = hAlign === 'left' ? 'left' : hAlign === 'right' ? 'right' : 'center';
  const blocks = data.textBlocks || [];

  let blocksHtml = '';
  blocks.forEach((block, i) => {
    const content = (block.content || '').replace(/\n/g, '<br>');
    if (!content) return;
    const fs = block.fontSize || 18;
    const fw = block.fontWeight || 400;
    const color = block.color || data.textColor || '#000000';
    const ff = block.fontFamily ? `'${block.fontFamily}', sans-serif` : 'inherit';
    const mt = i === 0 ? 0 : 8 * s;
    blocksHtml += `<div style="font-size:${fs}px; font-weight:${fw}; line-height:${fw >= 700 ? 1.15 : 1.6}; color:${color}; font-family:${ff}; margin-top:${mt}px;">${content}</div>`;
  });

  return `
    <div style="
      position:absolute; ${posStyles.join('; ')};
      z-index:5; text-align:${textAlign};
    ">
      ${blocksHtml}
    </div>
  `;
}

// ========== Shared Images Renderer ==========
function renderImages(data, s) {
  const images = data.images || [];
  if (images.length === 0) return '';

  let html = '';
  images.forEach(img => {
    if (!img.src) return;
    const x = (img.x || 0) * s;
    const y = (img.y || 0) * s;
    const w = img.width || 300;
    const h = img.height || 300;
    const z = img.zIndex || 1;
    const br = (img.borderRadius || 0) * s;
    html += `<div style="position:absolute; left:${x}px; top:${y}px; width:${w * s}px; height:${h * s}px; z-index:${z}; pointer-events:none; border-radius:${br}px; overflow:hidden;">
      <img src="${img.src}" style="width:100%; height:100%; object-fit:contain;">
    </div>`;
  });
  return html;
}

// ========== Shared Benefit Cards Renderer ==========
function highlightNumbers(text, color) {
  return text.replace(/(\d[\d,.]*\s*(%|원|만원|천원)?)/g, `<span style="color:${color};">$1</span>`);
}

function renderBenefitCards(data, s) {
  const benefits = data.benefits || [];
  if (benefits.length === 0) return '';

  const bs = data.benefitStyle || {};
  const tagBg = bs.tagColor || adjustColor(data.bgColor || '#6B705C', -15);
  const titleSize = (bs.titleSize || 32) * s;
  const detailSize = (bs.detailSize || 16) * s;
  const tagSize = (bs.tagSize || 16) * s;
  const titleColor = bs.titleColor || '#222222';
  const detailColor = bs.detailColor || '#777777';
  const pointSize = (bs.pointSize || 22) * s;
  const pointColor = bs.pointColor || data.accentColor || '#D4634A';
  const ff = bs.fontFamily ? `font-family:'${bs.fontFamily}',sans-serif;` : '';

  // Manual card height (0 = auto / flex:1)
  const cardHeight = data.benefitCardHeight || 0;
  const heightStyle = cardHeight > 0
    ? `height:${cardHeight * s}px; flex:none;`
    : `flex:1; min-height:0;`;

  // Card border-radius (default 24)
  const cardRadius = data.benefitCardRadius != null ? data.benefitCardRadius : 24;

  // Text left padding (extra indent)
  const textPadLeft = data.benefitTextPadLeft || 0;

  // Auto-adjust image size and padding based on benefit count
  const count = benefits.length;
  const autoImgSize = count <= 3 ? 180 : (count <= 5 ? 140 : 110);
  const padV = count <= 3 ? 10 : (count <= 5 ? 8 : 6);
  const padH = count <= 3 ? 20 : (count <= 5 ? 16 : 12);
  const gap = count <= 3 ? 14 : (count <= 5 ? 10 : 8);

  let html = '';
  benefits.forEach((b, i) => {
    const detail = (b.detail || '').replace(/\n/g, '<br>');
    const label = b.label || `혜택 ${String(i + 1).padStart(2, '0')}.`;
    const titleHtml = highlightNumbers(b.title || '', pointColor);
    const itemImgSize = b.imgSize > 0 ? b.imgSize : autoImgSize;
    const imgOffX = (b.imgOffsetX || 0) * s;

    const imgBlock = `<div style="width:${itemImgSize * s}px; height:${itemImgSize * s}px; flex-shrink:0; border-radius:${16 * s}px; overflow:hidden; position:relative; right:${-imgOffX}px;">
        ${b.image ? `<img src="${b.image}" style="width:100%; height:100%; object-fit:contain;">` :
        `<div style="width:100%; height:100%; background:#f0ece4; border-radius:${16 * s}px;"></div>`}
      </div>`;

    const textBlock = `<div style="flex:1; min-width:0; padding-left:${textPadLeft * s}px;">
        <div style="margin-bottom:${6 * s}px;">
          <span style="
            display:inline-block;
            background:${tagBg};
            color:#fff;
            font-size:${tagSize}px;
            font-weight:700;
            padding:${5 * s}px ${16 * s}px;
            border-radius:${20 * s}px;
          ">${label}</span>
        </div>
        <div style="
          font-size:${titleSize}px;
          font-weight:800;
          color:${titleColor};
          line-height:1.3;
        ">${titleHtml}</div>
        ${detail ? `<div style="
          font-size:${detailSize}px;
          color:${detailColor};
          margin-top:${4 * s}px;
          line-height:1.4;
        ">${detail}</div>` : ''}
      </div>`;

    html += `
    <div style="
      background:rgba(255,255,255,0.93);
      border-radius:${cardRadius * s}px;
      padding:${padV * s}px ${padH * s}px;
      display:flex;
      align-items:center;
      gap:${gap * s}px;
      position:relative;
      ${heightStyle}
      overflow:hidden;
      ${ff}
    ">
      ${textBlock}
      ${imgBlock}
      ${b.point ? `<div style="
        position:absolute;
        top:${padV * s}px; right:${padH * s}px;
        background:${pointColor};
        color:#fff;
        font-size:${pointSize}px;
        font-weight:800;
        padding:${6 * s}px ${16 * s}px;
        border-radius:${16 * s}px;
        line-height:1;
      ">${b.point}</div>` : ''}
    </div>`;
  });

  return html;
}

// ========== Extra Texts Renderer ==========
function renderExtraTexts(data, s) {
  const extras = data.extraTexts || [];
  const accent = data.accentColor || '#D4634A';
  let html = '';
  extras.forEach(et => {
    if (!et.content) return;
    const fs = (et.fontSize || 18) * s;
    const y = (et.y || 500) * s;
    const highlighted = highlightNumbers(et.content, accent);
    const etColor = et.color || data.textColor;
    html += `<div style="position:absolute; top:${y}px; left:0; right:0; text-align:center; z-index:4;">
      <span style="font-size:${fs}px; font-weight:${et.fontWeight || 600}; color:${etColor}; letter-spacing:${1*s}px;">
        ${highlighted}
      </span>
    </div>`;
  });
  return html;
}

// Backward compat
function renderHeadline(data, s) {
  return renderTextBlocks(data, s);
}

// ========== Templates ==========
const TEMPLATES = {

  // ========== 1. 인스타그램 (4페이지: 메인/결제혜택/사은품/이벤트) ==========
  mainPage: {
    id: 'mainPage',
    name: '인스타그램',
    defaultData: {
      pageType: 'main',
      brandName: '로고이미지',
      brandFontSize: 32,
      headline: '쇼핑라이브',
      subtext: '',
      productName: '',
      ctaText: '',
      ctaFontSize: 16,
      ctaBottomOffset: 80,
      eventPeriod: '',
      extraTexts: [],
      bgColor: '#5A5E4A',
      accentColor: '#D4634A',
      textColor: '#FFFFFF',
      headlineSize: 64,
      headlinePosition: 'top-center',
      headlineOffset: { top: 0, bottom: 100, left: 0, right: 0 },
      brandPosition: 'top-center',
      brandOffset: { top: 0, bottom: 60, left: 0, right: 0 },
      textBlocks: [
        { id: 1, type: 'subtext', content: '행사 소개문구', fontSize: 24, fontWeight: 500, color: '#FFFFFF', fontFamily: '' },
        { id: 2, type: 'headline', content: '행사타이틀', fontSize: 64, fontWeight: 900, color: '#FFFFFF', fontFamily: '' },
        { id: 3, type: 'subtext', content: '날짜 및 시간 정보', fontSize: 18, fontWeight: 400, color: '#FFFFFF', fontFamily: '' }
      ]
    },

    // Defaults for benefit pages (결제혜택/사은품/이벤트)
    benefitDefaults: {
      pageType: 'benefit',
      brandName: '',
      brandFontSize: 22,
      headline: '결제혜택',
      subtext: '',
      productName: '',
      ctaText: '',
      eventPeriod: '',
      bgColor: '#6B705C',
      accentColor: '#D4634A',
      textColor: '#FFFFFF',
      headlineSize: 68,
      headlinePosition: 'top-center',
      headlineOffset: { top: 0, bottom: 30, left: 0, right: 0 },
      brandPosition: 'top-center',
      brandOffset: { top: 0, bottom: 30, left: 0, right: 0 },
      benefitCardHeight: 0,
      benefitCardRadius: 24,
      benefitTextPadLeft: 0,
      benefitImgSize: 0,
      textBlocks: [
        { id: 1, type: 'headline', content: '결제혜택', fontSize: 68, fontWeight: 900, color: '#FFFFFF', fontFamily: '' }
      ],
      benefitStyle: {
        tagSize: 16,
        titleSize: 32,
        detailSize: 16,
        titleColor: '#222222',
        detailColor: '#777777',
        pointSize: 22,
        pointColor: '#D4634A',
        fontFamily: ''
      },
      benefits: [
        { id: 1, label: '혜택 01.', title: '혜택 내용을 입력하세요', detail: '', point: '', image: null },
        { id: 2, label: '혜택 02.', title: '혜택 내용을 입력하세요', detail: '', point: '', image: null },
        { id: 3, label: '혜택 03.', title: '혜택 내용을 입력하세요', detail: '', point: '', image: null }
      ]
    },

    render(data, size) {
      const pt = data.pageType || 'main';
      if (pt === 'benefit') return this.renderBenefit(data, size);
      return this.renderMain(data, size);
    },

    renderMain(data, size) {
      const s = size.width / 1080;

      return `
        <div class="template-root tpl-main-page" style="
          width:${size.width}px; height:${size.height}px;
          background: ${getBackgroundCSS(data)};
          color:${data.textColor};
          font-family:'Noto Sans KR',sans-serif;
          position:relative; overflow:hidden;
        ">
          ${renderBrand(data, s)}

          ${(!data.images || data.images.length === 0) ? `
          <div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
            width:${450*s}px; height:${450*s}px;
            border:${2*s}px dashed rgba(255,255,255,0.3); border-radius:${16*s}px;
            display:flex; align-items:center; justify-content:center; z-index:2;">
            <span style="font-size:${20*s}px; color:rgba(255,255,255,0.4); font-weight:600;">제품이미지</span>
          </div>` : ''}

          ${renderImages(data, s)}
          ${renderTextBlocks(data, s)}

          ${data.ctaText ? `
          <div style="position:absolute; bottom:${(data.ctaBottomOffset || 80)*s}px; left:0; right:0; text-align:center; z-index:4;">
            <span style="display:inline-block; padding:${14*s}px ${40*s}px; background:${data.accentColor}; color:#fff; border-radius:${8*s}px; font-size:${(data.ctaFontSize || 16)*s}px; font-weight:700;">
              ${data.ctaText}
            </span>
          </div>` : ''}

          ${renderExtraTexts(data, s)}
        </div>
      `;
    },

    renderBenefit(data, size) {
      const s = size.width / 1080;
      const benefitsHtml = renderBenefitCards(data, s);
      const bCount = (data.benefits || []).length;
      const bGap = bCount <= 3 ? 16 : (bCount <= 5 ? 12 : 8);
      const bPadSide = bCount <= 3 ? 80 : (bCount <= 5 ? 60 : 50);

      // 타이틀 높이에 따라 혜택 카드 시작 위치 동적 계산
      const hOff = data.headlineOffset || { top: 0, bottom: 0, left: 0, right: 0 };
      const blocks = data.textBlocks || [];
      let titleHeight = 0;
      blocks.forEach((b, i) => {
        const fs = b.fontSize || 18;
        const lh = (b.fontWeight || 400) >= 700 ? 1.15 : 1.6;
        titleHeight += fs * lh + (i > 0 ? 8 : 0);
      });
      const titleTop = 60 - (hOff.top || 0) + (hOff.bottom || 0);
      const benefitTop = Math.max(180, titleTop + titleHeight + 40);
      const benefitBottom = 50;

      return `
        <div class="template-root tpl-event-page" style="
          width:${size.width}px; height:${size.height}px;
          background:${getBackgroundCSS(data)};
          color:${data.textColor};
          font-family:'Noto Sans KR',sans-serif;
          position:relative; overflow:hidden;
        ">
          ${renderImages(data, s)}
          ${renderTextBlocks(data, s)}

          ${data.productName ? `
          <div style="position:absolute; top:${200 * s}px; left:0; right:0; text-align:center; z-index:4;">
            <span style="font-size:${16*s}px; font-weight:600; color:${data.textColor}; opacity:0.75; letter-spacing:${1*s}px;">
              ${data.productName}
            </span>
          </div>` : ''}

          <!-- Benefits Section -->
          <div style="
            position:absolute;
            top:${benefitTop * s}px;
            left:${bPadSide * s}px;
            right:${bPadSide * s}px;
            bottom:${benefitBottom * s}px;
            display:flex;
            flex-direction:column;
            gap:${bGap * s}px;
            justify-content:center;
            z-index:3;
          ">
            ${benefitsHtml}
          </div>

          ${data.ctaText ? `
          <div style="position:absolute; bottom:${50 * s}px; left:0; right:0; text-align:center; z-index:4;">
            <span style="
              display:inline-block;
              padding:${10 * s}px ${32 * s}px;
              background:${data.textColor}; color:${data.bgColor};
              border-radius:${24 * s}px;
              font-size:${14 * s}px; font-weight:700;
            ">${data.ctaText}</span>
          </div>` : ''}

          ${data.eventPeriod ? `
          <div style="position:absolute; bottom:${16 * s}px; left:0; right:0; text-align:center; font-size:${12 * s}px; opacity:0.5; z-index:4;">
            ${data.eventPeriod}
          </div>` : ''}
        </div>
      `;
    }
  },

  // ========== 2. 자유 제작 ==========
  freeForm: {
    id: 'freeForm',
    name: '자유 제작',
    defaultData: {
      brandName: '',
      headline: '',
      subtext: '',
      productName: '',
      discountBadge: '',
      originalPrice: '',
      salePrice: '',
      ctaText: '',
      eventPeriod: '',
      bgColor: '#FFFFFF',
      accentColor: '#4A6CF7',
      textColor: '#1A1A1A',
      headlineSize: 48,
      textBlocks: [
        { id: 1, type: 'headline', content: '', fontSize: 48, fontWeight: 900, color: '#1A1A1A', fontFamily: '' }
      ]
    },

    render(data, size) {
      const s = size.width / 1080;

      return `
        <div class="template-root tpl-free-form" style="
          width:${size.width}px; height:${size.height}px;
          background:${getBackgroundCSS(data)};
          color:${data.textColor};
          font-family:'Noto Sans KR',sans-serif;
          position:relative; overflow:hidden;
        ">
          ${renderBrand(data, s)}
          ${renderImages(data, s)}
          ${renderTextBlocks(data, s)}
        </div>
      `;
    }
  },

  // ========== 3. 상세페이지 (인스타그램 4페이지 세로 합본) ==========
  detailPage: {
    id: 'detailPage',
    name: '상세페이지',
    defaultData: {}
  },

  // ========== 4. 팝업배너 (인스타 메인페이지 1080x1080) ==========
  popupBanner: {
    id: 'popupBanner',
    name: '팝업배너',
    defaultData: {}
  }
};

// Utility: darken/lighten a hex color
function adjustColor(hex, amount) {
  hex = hex.replace('#', '');
  const num = parseInt(hex, 16);
  let r = Math.min(255, Math.max(0, (num >> 16) + amount));
  let g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  let b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Shared: get background CSS from data
function getBackgroundCSS(data) {
  if (data.bgGradient && data.bgColor2) {
    const angle = data.bgGradientAngle !== undefined ? data.bgGradientAngle : 135;
    return `linear-gradient(${angle}deg, ${data.bgColor}, ${data.bgColor2})`;
  }
  return data.bgColor;
}
