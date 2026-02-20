// ==========================================
// SNS Banner Maker - Image Export
// ==========================================

async function exportBanner() {
  const canvas = document.getElementById('preview-canvas');
  const downloadBtn = document.getElementById('download-btn');

  // Disable button during export
  downloadBtn.disabled = true;
  const originalText = downloadBtn.innerHTML;
  downloadBtn.innerHTML = '<span class="download-icon">&#x23F3;</span> 이미지 생성 중...';

  // Save and remove scale transform
  const originalTransform = canvas.style.transform;
  canvas.style.transform = 'none';

  // Temporarily make the wrapper match full size
  const wrapper = document.getElementById('preview-wrapper');
  const originalWrapperW = wrapper.style.width;
  const originalWrapperH = wrapper.style.height;
  wrapper.style.width = canvas.style.width;
  wrapper.style.height = canvas.style.height;
  wrapper.style.overflow = 'visible';

  try {
    // Wait for fonts to load
    await document.fonts.ready;

    // Small delay for rendering
    await new Promise(r => setTimeout(r, 100));

    const result = await html2canvas(canvas, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      width: parseInt(canvas.style.width),
      height: parseInt(canvas.style.height),
      logging: false,
    });

    // Generate filename
    const filename = generateFilename();

    // Download
    const link = document.createElement('a');
    link.download = filename;
    link.href = result.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (err) {
    console.error('Export failed:', err);
    alert('이미지 생성에 실패했습니다. 다시 시도해주세요.');
  } finally {
    // Restore scale
    canvas.style.transform = originalTransform;
    wrapper.style.width = originalWrapperW;
    wrapper.style.height = originalWrapperH;
    wrapper.style.overflow = 'hidden';

    // Restore button
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = originalText;
  }
}

function generateFilename() {
  const templateNames = {
    mainPage: '인스타그램',
    detailPage: '상세페이지',
    popupBanner: '팝업배너',
    freeForm: '자유제작'
  };

  const sizeSelect = document.getElementById('size-select');
  const canvas = document.getElementById('preview-canvas');
  const w = parseInt(canvas.style.width);
  const h = parseInt(canvas.style.height);
  const templateKey = document.querySelector('.template-card.active')?.dataset.template || 'banner';
  const templateName = templateNames[templateKey] || '배너';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  return `배너_${templateName}_${w}x${h}_${date}.png`;
}
