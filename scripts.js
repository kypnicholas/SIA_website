// Accordion-style filters logic
document.addEventListener('DOMContentLoaded', function() {
  const filters = document.getElementById('filters');
  const toggleBtn = document.getElementById('filtersToggleBtn');
  if (filters && toggleBtn) {
    const label = toggleBtn.querySelector('.accordion-label');
    function setExpanded(expanded) {
      if (expanded) {
        filters.classList.add('expanded');
        toggleBtn.setAttribute('aria-expanded', 'true');
        if (label) label.textContent = 'Hide Filters';
      } else {
        filters.classList.remove('expanded');
        toggleBtn.setAttribute('aria-expanded', 'false');
        if (label) label.textContent = 'Show Filters';
      }
    }
    setExpanded(false);
    toggleBtn.addEventListener('click', function() {
      setExpanded(!filters.classList.contains('expanded'));
    });
  }
});
// Module-level state
let allListings = [];
let filteredListings = [];
let filterState = {};
let popoverAbortController = null;
let focusTrapAbortController = null;
let modalTriggerEl = null;
let listingQualityById = new Map();
const qualityTooltipContentById = new Map();
let qualityTooltipPortalEl = null;
let qualityTooltipActiveTrigger = null;
let qualityTooltipCloseTimer = null;
let qualityTooltipHandlersBound = false;
const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='170' viewBox='0 0 400 170'%3E%3Crect width='400' height='170' fill='%23f4faf4'/%3E%3Ctext x='200' y='90' text-anchor='middle' fill='%23b2dcb2' font-size='14' font-family='system-ui'%3EImage unavailable%3C/text%3E%3C/svg%3E";
// Simple renderer for listings.json and modal behavior
const listingsEl = document.getElementById('listings');
const qualitySummaryEl = document.getElementById('qualitySummary');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalTitle = document.getElementById('modalTitle');
const modalImage = document.getElementById('modalImage');
const modalDesc = document.getElementById('modalDesc');
const modalDetails = document.getElementById('modalDetails');
const modalActions = document.getElementById('modalActions');
const yearEl = document.getElementById('year');
const DEFAULT_CONTACT_EMAIL = 'kypmaria@cytanet.com.cy';
const DEFAULT_CONTACT_PHONE = '35799697061';

yearEl.textContent = new Date().getFullYear();


// Inline SVG icon functions (must be defined before use)
function svgArea(color = '#2b7a2b') {
  return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><rect x="3" y="3" width="14" height="14" rx="2" stroke="${color}" stroke-width="2" fill="none"/><path d="M3 9h14M9 3v14" stroke="${color}" stroke-width="1.5"/></svg>`;
}
function svgPrice() {
  return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><circle cx="10" cy="10" r="8" stroke="#2b7a2b" stroke-width="2" fill="none"/><text x="10" y="14" text-anchor="middle" font-size="10" fill="#2b7a2b" font-family="Arial">€</text></svg>`;
}
function svgLocation(color = '#2b7a2b') {
  return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><path d="M10 18s6-6.5 6-10A6 6 0 1 0 4 8c0 3.5 6 10 6 10z" stroke="${color}" stroke-width="2" fill="none"/><circle cx="10" cy="8" r="2" stroke="${color}" stroke-width="1.5"/></svg>`;
}
function svgContact() {
  return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><rect x="3" y="5" width="14" height="10" rx="2" stroke="#2b7a2b" stroke-width="2" fill="none"/><path d="M3 5l7 6 7-6" stroke="#2b7a2b" stroke-width="1.5" fill="none"/></svg>`;
}
function svgMailMini() {
  return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M3 5l7 5.5L17 5" stroke="currentColor" stroke-width="1.7"/></svg>`;
}
function svgWhatsAppMini() {
  return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10 2.2C5.69 2.2 2.2 5.62 2.2 9.85c0 1.53.47 2.95 1.28 4.14l-.83 3.81 3.93-.79A7.9 7.9 0 0 0 10 17.5c4.31 0 7.8-3.42 7.8-7.65S14.31 2.2 10 2.2z" stroke="currentColor" stroke-width="1.6"/><path d="M7.15 7.22c.14-.3.3-.31.45-.31h.39c.12 0 .29.04.43.34.14.31.47 1.14.51 1.22.04.08.07.18.01.29-.06.11-.09.18-.18.28-.09.1-.19.22-.27.29-.09.08-.18.16-.08.31.1.15.45.74.96 1.2.66.59 1.2.77 1.38.85.18.08.29.07.4-.04.11-.11.47-.52.59-.7.12-.18.24-.15.41-.09.17.06 1.08.5 1.27.59.18.09.3.14.34.22.04.08.04.47-.11.93-.15.45-.85.88-1.18.93-.3.05-.67.07-1.08-.06a5.94 5.94 0 0 1-1.11-.52c-1.88-1.07-3.1-3.05-3.2-3.18-.1-.13-.77-1.01-.77-1.93 0-.92.48-1.37.65-1.56z" fill="currentColor"/></svg>`;
}
function svgNotes() {
  return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><path d="M15.232 5.232l-10 10V17h1.768l10-10-1.768-1.768zM17.414 3.414a2 2 0 0 0-2.828 0l-1.172 1.172 2.828 2.828 1.172-1.172a2 2 0 0 0 0-2.828z" stroke="#2b7a2b" stroke-width="1.5" fill="#fff"/></svg>`;
}
function svgPhone() {
  return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><rect x="5" y="2" width="10" height="16" rx="2" stroke="#2b7a2b" stroke-width="2" fill="none"/><circle cx="10" cy="15" r="1" fill="#2b7a2b"/></svg>`;
}
function svgTitleDeed() {
  return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><rect x="4" y="3" width="12" height="14" rx="2" stroke="#2b7a2b" stroke-width="2" fill="#fff"/><path d="M7 7h6M7 10h6M7 13h4" stroke="#2b7a2b" stroke-width="1.5"/></svg>`;
}
function svgTick(checked) {
  return checked
    ? `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><path d="M5 10.5l4 4 6-8" stroke="#2b7a2b" stroke-width="2.5" fill="none"/></svg>`
    : '';
}

function parseArea(sizeStr) {
  if (!sizeStr) return NaN;
  let areaStr = sizeStr.replace(/[^\d.,]/g, '');
  if (areaStr.includes(',') && areaStr.includes('.')) {
    areaStr = areaStr.replace(/\./g, '').replace(/,/g, '.');
  } else {
    areaStr = areaStr.replace(/,/g, '');
  }
  const match = areaStr.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : NaN;
}
function parsePrice(priceStr) {
  if (!priceStr) return NaN;
  const str = String(priceStr).replace(/,/g, '');
  const match = str.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : NaN;
}

function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function issue(severity, message) {
  return { severity, message };
}

function qualityCheck(label, status, detail = '') {
  return { label, status, detail };
}

function buildQualityTooltipPanel(quality) {
  const summaryByLevel = {
    verified: 'All automated checks passed. This listing looks consistent.',
    review: 'Most checks passed, but a small number of details should be reviewed.',
    caution: 'Important data checks failed or multiple warnings were detected. Please verify before deciding.'
  };

  const checksHtml = quality.checks.map(check => {
    const statusLabel = check.status.toUpperCase();
    const statusClass = check.status === 'pass' ? 'pass' : (check.status === 'warn' ? 'warn' : 'fail');
    const detail = check.detail ? `: ${escapeHtml(check.detail)}` : '';
    return `<li class="quality-tooltip-item"><span class="quality-tooltip-status quality-tooltip-status--${statusClass}">${statusLabel}</span><span class="quality-tooltip-text">${escapeHtml(check.label)}${detail}</span></li>`;
  }).join('');

  return `
    <p class="quality-tooltip-title">Data Quality Checklist</p>
    <p class="quality-tooltip-summary">${escapeHtml(summaryByLevel[quality.level] || summaryByLevel.review)}</p>
    <ul class="quality-tooltip-list">${checksHtml}</ul>
  `;
}

function isTouchInputMode() {
  return window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches;
}

function getOrCreateQualityTooltipPortal() {
  if (qualityTooltipPortalEl) return qualityTooltipPortalEl;
  qualityTooltipPortalEl = document.createElement('div');
  qualityTooltipPortalEl.id = 'qualityTooltipPortal';
  qualityTooltipPortalEl.className = 'quality-tooltip-panel quality-tooltip-portal';
  qualityTooltipPortalEl.setAttribute('role', 'tooltip');
  qualityTooltipPortalEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(qualityTooltipPortalEl);
  return qualityTooltipPortalEl;
}

function clearQualityTooltipCloseTimer() {
  if (qualityTooltipCloseTimer) {
    clearTimeout(qualityTooltipCloseTimer);
    qualityTooltipCloseTimer = null;
  }
}

function hideQualityTooltipPortal() {
  clearQualityTooltipCloseTimer();
  const panel = getOrCreateQualityTooltipPortal();
  panel.classList.remove('is-open');
  panel.classList.remove('is-mobile-sheet');
  panel.setAttribute('aria-hidden', 'true');
  panel.dataset.sticky = 'false';
  panel.style.left = '-9999px';
  panel.style.top = '-9999px';
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';
  if (qualityTooltipActiveTrigger) {
    qualityTooltipActiveTrigger.setAttribute('aria-expanded', 'false');
    qualityTooltipActiveTrigger = null;
  }
}

function scheduleHideQualityTooltipPortal(delay = 90) {
  clearQualityTooltipCloseTimer();
  qualityTooltipCloseTimer = setTimeout(() => {
    hideQualityTooltipPortal();
  }, delay);
}

function positionQualityTooltipPortal(trigger) {
  const panel = getOrCreateQualityTooltipPortal();
  const touchMode = isTouchInputMode();

  if (touchMode) {
    panel.classList.add('is-mobile-sheet');
    panel.style.left = '12px';
    panel.style.right = '12px';
    panel.style.top = 'auto';
    panel.style.bottom = '12px';
    return;
  }

  panel.classList.remove('is-mobile-sheet');
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';

  const triggerRect = trigger.getBoundingClientRect();
  const viewportMargin = 12;

  panel.style.left = '-9999px';
  panel.style.top = '-9999px';
  const panelRect = panel.getBoundingClientRect();

  let left = triggerRect.left;
  if (left + panelRect.width > window.innerWidth - viewportMargin) {
    left = window.innerWidth - panelRect.width - viewportMargin;
  }
  if (left < viewportMargin) left = viewportMargin;

  let top = triggerRect.bottom + 8;
  if (top + panelRect.height > window.innerHeight - viewportMargin) {
    top = triggerRect.top - panelRect.height - 8;
  }
  if (top < viewportMargin) top = viewportMargin;

  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.round(top)}px`;
}

function showQualityTooltipPortal(trigger, sticky = false) {
  const tooltipId = trigger.getAttribute('data-quality-tooltip-id');
  const tooltipContent = qualityTooltipContentById.get(tooltipId);
  if (!tooltipContent) return;

  clearQualityTooltipCloseTimer();
  const panel = getOrCreateQualityTooltipPortal();
  panel.innerHTML = tooltipContent;
  panel.dataset.sticky = sticky ? 'true' : 'false';
  panel.classList.add('is-open');
  panel.setAttribute('aria-hidden', 'false');

  if (qualityTooltipActiveTrigger && qualityTooltipActiveTrigger !== trigger) {
    qualityTooltipActiveTrigger.setAttribute('aria-expanded', 'false');
  }
  qualityTooltipActiveTrigger = trigger;
  qualityTooltipActiveTrigger.setAttribute('aria-expanded', 'true');

  positionQualityTooltipPortal(trigger);
}

function attachQualityTooltipTriggerListeners(trigger) {
  trigger.addEventListener('mouseenter', () => {
    if (isTouchInputMode()) return;
    showQualityTooltipPortal(trigger, false);
  });

  trigger.addEventListener('mouseleave', (event) => {
    if (isTouchInputMode()) return;
    const panel = getOrCreateQualityTooltipPortal();
    if (event.relatedTarget && panel.contains(event.relatedTarget)) return;
    if (panel.dataset.sticky === 'true') return;
    scheduleHideQualityTooltipPortal();
  });

  trigger.addEventListener('focus', () => {
    showQualityTooltipPortal(trigger, true);
  });

  trigger.addEventListener('blur', () => {
    if (isTouchInputMode()) return;
    scheduleHideQualityTooltipPortal();
  });

  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (qualityTooltipActiveTrigger === trigger) {
      hideQualityTooltipPortal();
      return;
    }
    showQualityTooltipPortal(trigger, true);
  });
}

function initQualityTooltipInteractions() {
  if (qualityTooltipHandlersBound) return;
  qualityTooltipHandlersBound = true;

  const panel = getOrCreateQualityTooltipPortal();

  panel.addEventListener('mouseenter', () => {
    clearQualityTooltipCloseTimer();
  });

  panel.addEventListener('mouseleave', () => {
    if (isTouchInputMode()) return;
    if (panel.dataset.sticky === 'true') return;
    scheduleHideQualityTooltipPortal();
  });

  document.addEventListener('pointerdown', (event) => {
    if (!qualityTooltipActiveTrigger) return;
    const tooltipPanel = getOrCreateQualityTooltipPortal();
    if (qualityTooltipActiveTrigger.contains(event.target) || tooltipPanel.contains(event.target)) return;
    hideQualityTooltipPortal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && qualityTooltipActiveTrigger) {
      hideQualityTooltipPortal();
    }
  });

  window.addEventListener('resize', () => {
    if (qualityTooltipActiveTrigger) hideQualityTooltipPortal();
  });

  window.addEventListener('scroll', (event) => {
    if (!qualityTooltipActiveTrigger) return;
    const scrollTarget = event.target;
    if (scrollTarget instanceof Node && panel.contains(scrollTarget)) return;
    hideQualityTooltipPortal();
  }, true);

  panel.addEventListener('scroll', () => {
    clearQualityTooltipCloseTimer();
  }, { passive: true });
}

function evaluateListingQuality(item) {
  const checks = [];

  const requiredFields = [
    ['id', 'Listing ID'],
    ['title', 'Title'],
    ['location', 'Location'],
    ['size', 'Area'],
    ['price', 'Price'],
    ['status', 'Status'],
    ['image', 'Image']
  ];
  const missingRequired = requiredFields
    .filter(([field]) => !String(item[field] || '').trim())
    .map(([, label]) => label);
  checks.push(qualityCheck(
    'Essential listing details are present',
    missingRequired.length ? 'fail' : 'pass',
    missingRequired.length ? `Missing: ${missingRequired.join(', ')}` : ''
  ));

  const hasDescription = String(item.description || '').trim().length >= 20;
  checks.push(qualityCheck(
    'Full plot description is available',
    hasDescription ? 'pass' : 'warn',
    hasDescription ? '' : 'Description missing or too short.'
  ));

  const hasShortDescription = String(item.shortDescription || '').trim().length >= 15;
  checks.push(qualityCheck(
    'Short card summary is available',
    hasShortDescription ? 'pass' : 'warn',
    hasShortDescription ? '' : 'Short description missing or too short.'
  ));

  const hasImageAlt = String(item.imageAlt || '').trim().length >= 6;
  checks.push(qualityCheck(
    'Image text description is set',
    hasImageAlt ? 'pass' : 'warn',
    hasImageAlt ? '' : 'Image alt text missing or very short.'
  ));

  const areaNum = parseArea(item.size);
  const areaValid = Number.isFinite(areaNum) && areaNum > 0;
  checks.push(qualityCheck(
    'Area value format is valid',
    areaValid ? 'pass' : 'fail',
    areaValid ? '' : 'Area is not a valid positive number.'
  ));
  const areaInExpectedRange = areaValid && areaNum <= 500000;
  checks.push(qualityCheck(
    'Area looks realistic',
    !areaValid ? 'fail' : (areaInExpectedRange ? 'pass' : 'warn'),
    !areaValid ? 'Cannot assess plausibility due to invalid area.' : (areaInExpectedRange ? '' : 'Area is unusually large; please confirm units (m²).')
  ));

  const priceNum = parsePrice(item.price);
  const priceValid = Number.isFinite(priceNum) && priceNum > 0;
  checks.push(qualityCheck(
    'Price value format is valid',
    priceValid ? 'pass' : 'fail',
    priceValid ? '' : 'Price is not a valid positive number.'
  ));
  const priceInExpectedRange = priceValid && priceNum <= 50000000;
  checks.push(qualityCheck(
    'Price looks realistic',
    !priceValid ? 'fail' : (priceInExpectedRange ? 'pass' : 'warn'),
    !priceValid ? 'Cannot assess plausibility due to invalid price.' : (priceInExpectedRange ? '' : 'Price is unusually high; please verify source data.')
  ));

  let unitPrice = NaN;
  if (areaValid && priceValid) unitPrice = priceNum / areaNum;
  const unitPriceOk = Number.isFinite(unitPrice) && unitPrice >= 2 && unitPrice <= 120;
  checks.push(qualityCheck(
    'Price per m² is in expected range',
    !Number.isFinite(unitPrice) ? 'fail' : (unitPriceOk ? 'pass' : 'warn'),
    !Number.isFinite(unitPrice) ? 'Cannot calculate price per m².' : (unitPriceOk ? '' : `Unusual value (${unitPrice.toFixed(2)} EUR/m²).`)
  ));

  const statusNorm = String(item.status || '').trim().toLowerCase();
  const statusOk = ['available', 'pending', 'sold'].includes(statusNorm);
  checks.push(qualityCheck(
    'Availability status uses standard values',
    statusOk ? 'pass' : 'warn',
    statusOk ? '' : 'Status should be Available, Pending, or Sold.'
  ));

  const hasLat = item.latitude !== '' && item.latitude != null;
  const hasLng = item.longitude !== '' && item.longitude != null;
  const coordinatePairComplete = hasLat === hasLng;
  checks.push(qualityCheck(
    'Map coordinates are complete (lat + lng)',
    coordinatePairComplete ? 'pass' : 'fail',
    coordinatePairComplete ? '' : 'Latitude/longitude pair is incomplete.'
  ));

  const coordinatesProvided = hasLat && hasLng;
  const lat = Number(item.latitude);
  const lng = Number(item.longitude);
  const coordsNumeric = !coordinatesProvided || (Number.isFinite(lat) && Number.isFinite(lng));
  checks.push(qualityCheck(
    'Map coordinates are valid numbers',
    coordsNumeric ? 'pass' : 'fail',
    coordsNumeric ? '' : 'Coordinates are not numeric values.'
  ));

  const inCyprusBounds = !coordinatesProvided || (lat >= 34.4 && lat <= 35.8 && lng >= 32.1 && lng <= 34.9);
  checks.push(qualityCheck(
    'Map coordinates are within Cyprus range',
    inCyprusBounds ? 'pass' : 'fail',
    inCyprusBounds ? '' : 'Coordinates fall outside expected Cyprus bounds.'
  ));

  const coordsDistinct = !coordinatesProvided || Math.abs(lat - lng) >= 0.05;
  checks.push(qualityCheck(
    'Map coordinates look plausible',
    coordsDistinct ? 'pass' : 'warn',
    coordsDistinct ? '' : 'Latitude and longitude are suspiciously similar.'
  ));

  const titleDeedStandard = item.titleDeed === 'Yes' || item.titleDeed === true || item.titleDeed === 'No' || item.titleDeed === false;
  checks.push(qualityCheck(
    'Title deed field uses standard format',
    titleDeedStandard ? 'pass' : 'warn',
    titleDeedStandard ? '' : 'Title deed should be Yes/No (or true/false).'
  ));

  const emailRaw = String(item.contactEmail || '').trim();
  const emailOk = emailRaw && isValidEmail(emailRaw);
  checks.push(qualityCheck(
    'Contact email is valid',
    emailOk ? 'pass' : 'warn',
    emailOk ? '' : 'Email missing or invalid format.'
  ));

  const phoneDigits = String(item.contactPhone || '').replace(/\D/g, '');
  const phoneOk = phoneDigits.length >= 8;
  checks.push(qualityCheck(
    'Contact phone is complete',
    phoneOk ? 'pass' : 'warn',
    phoneOk ? '' : 'Phone number missing or too short.'
  ));

  const failCount = checks.filter(x => x.status === 'fail').length;
  const warnCount = checks.filter(x => x.status === 'warn').length;
  const issues = checks
    .filter(x => x.status !== 'pass')
    .map(x => issue(x.status === 'fail' ? 'error' : 'warning', `${x.label}${x.detail ? `: ${x.detail}` : ''}`));

  let level = 'verified';
  let label = 'Data verified';

  if (failCount > 0 || warnCount >= 2) {
    level = 'caution';
    label = 'Check details';
  } else if (warnCount > 0) {
    level = 'review';
    label = 'Needs review';
  }

  return { level, label, checks, issues };
}

function buildListingQualityMap(data) {
  const byId = new Map();
  data.forEach(item => {
    byId.set(item.id, evaluateListingQuality(item));
  });
  return byId;
}

function getListingQuality(item) {
  return listingQualityById.get(item.id) || {
    level: 'review',
    label: 'Needs review',
    checks: [qualityCheck('Quality checks availability', 'warn', 'Quality check data unavailable for this listing.')],
    issues: [issue('warning', 'Quality check data unavailable for this listing.')]
  };
}

function renderQualitySummary(data) {
  if (!qualitySummaryEl) return;

  if (!Array.isArray(data) || data.length === 0) {
    qualitySummaryEl.style.display = 'none';
    qualitySummaryEl.innerHTML = '';
    return;
  }

  let verified = 0;
  let review = 0;
  let caution = 0;

  data.forEach(item => {
    const quality = getListingQuality(item);
    if (quality.level === 'verified') verified += 1;
    else if (quality.level === 'review') review += 1;
    else caution += 1;
  });

  qualitySummaryEl.style.display = 'flex';
  qualitySummaryEl.innerHTML = `
    <span class="quality-summary-label">Listing data trust checks (${data.length})</span>
    <div class="quality-summary-counts">
      <span class="quality-pill quality-pill--verified">${verified} verified</span>
      <span class="quality-pill quality-pill--review">${review} needs review</span>
      <span class="quality-pill quality-pill--caution">${caution} check details</span>
    </div>
  `;
}

function normalizeWhatsAppPhone(phoneRaw) {
  const digits = String(phoneRaw || '').replace(/\D/g, '');
  if (!digits) return DEFAULT_CONTACT_PHONE;
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('357')) return digits;
  if (digits.length === 8) return `357${digits}`;
  if (digits.length === 9 && digits.startsWith('0')) return `357${digits.slice(1)}`;
  return digits;
}

function buildEnquiryLinks(item) {
  const listingId = item.id || 'N/A';
  const listingTitle = item.title || 'Agricultural plot';
  const listingLocation = item.location || 'N/A';
  const listingSize = item.size || 'N/A';
  const listingPrice = item.price ? `€${item.price}` : 'N/A';
  const email = item.contactEmail || DEFAULT_CONTACT_EMAIL;
  const waPhone = normalizeWhatsAppPhone(item.contactPhone);

  const subject = `Enquiry: ${listingTitle} (${listingId})`;
  const message = [
    'Hello,',
    '',
    'I am interested in this listing:',
    `- Title: ${listingTitle}`,
    `- Listing ID: ${listingId}`,
    `- Location: ${listingLocation}`,
    `- Size: ${listingSize}`,
    `- Price: ${listingPrice}`,
    '',
    'Please share the next steps and current availability.',
    '',
    'Thank you.'
  ].join('\n');

  return {
    mailtoHref: `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`,
    whatsappHref: `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`
  };
}

function normalizeSearchText(value) {
  if (value == null) return '';
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchIndex(item) {
  const hasTitleDeed = item.titleDeed === 'Yes' || item.titleDeed === true;
  const titleDeedTerms = hasTitleDeed
    ? 'title deed yes available'
    : 'title deed no unavailable';

  return normalizeSearchText([
    item.id,
    item.title,
    item.shortDescription,
    item.description,
    item.location,
    item.notes,
    item.status,
    item.size,
    item.price,
    `€${item.price || ''}`,
    item.contactEmail,
    item.contactPhone,
    item.latitude,
    item.longitude,
    titleDeedTerms
  ].filter(Boolean).join(' '));
}

function buildSearchWords(searchIndex) {
  return Array.from(new Set(
    searchIndex
      .split(' ')
      .map(word => word.trim())
      .filter(word => word.length >= 2)
  ));
}

function getTokenMaxDistance(token) {
  if (token.length <= 4) return 1;
  if (token.length <= 8) return 2;
  return 3;
}

function levenshteinWithin(a, b, maxDistance) {
  if (Math.abs(a.length - b.length) > maxDistance) return false;
  if (a === b) return true;

  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);

  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let minInRow = curr[0];

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
      if (curr[j] < minInRow) minInRow = curr[j];
    }

    if (minInRow > maxDistance) return false;

    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }

  return prev[b.length] <= maxDistance;
}

function tokenMatchesSearchData(token, searchIndex, searchWords) {
  if (!token) return true;

  // Keep numeric/id-like queries strict to avoid surprising matches.
  if (/\d/.test(token)) return searchIndex.includes(token);

  if (searchIndex.includes(token)) return true;
  if (token.length <= 3) return false;

  const maxDistance = getTokenMaxDistance(token);

  for (const word of searchWords) {
    if (Math.abs(word.length - token.length) > maxDistance) continue;
    if (levenshteinWithin(token, word, maxDistance)) return true;
  }

  return false;
}

// Persist filter state in the URL so links can be shared / bookmarked
function readFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('location')) filterState.location = params.get('location');
  if (params.has('sort'))     filterState.sort     = params.get('sort');
  if (params.has('areaMin'))  filterState.areaMin  = parseFloat(params.get('areaMin'));
  if (params.has('areaMax'))  filterState.areaMax  = parseFloat(params.get('areaMax'));
  if (params.has('priceMin')) filterState.priceMin = parseFloat(params.get('priceMin'));
  if (params.has('priceMax')) filterState.priceMax = parseFloat(params.get('priceMax'));
  if (params.has('search'))   filterState.search   = params.get('search');
}
function writeFiltersToURL() {
  const params = new URLSearchParams();
  if (filterState.location) params.set('location', filterState.location);
  if (filterState.sort)     params.set('sort',     filterState.sort);
  if (filterState.areaMin  != null) params.set('areaMin',  filterState.areaMin);
  if (filterState.areaMax  != null) params.set('areaMax',  filterState.areaMax);
  if (filterState.priceMin != null) params.set('priceMin', filterState.priceMin);
  if (filterState.priceMax != null) params.set('priceMax', filterState.priceMax);
  if (filterState.search)   params.set('search',   filterState.search);
  const qs = params.toString();
  history.replaceState(null, '', qs ? '?' + qs : window.location.pathname);
}

// Show shimmer skeleton cards while listings.json is loading
function showSkeleton(count = 4) {
  listingsEl.innerHTML = Array.from({ length: count }, () => `
    <div class="card skeleton-card" aria-hidden="true">
      <div class="skeleton skeleton-img"></div>
      <div class="card-body">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line skeleton-line--short"></div>
      </div>
    </div>
  `).join('');
}

function renderFilters(data) {
  if (popoverAbortController) popoverAbortController.abort();
  popoverAbortController = new AbortController();
  const signal = popoverAbortController.signal;
  // All DOM-dependent logic must come after filtersEl.innerHTML
  setTimeout(() => {
    // Helper to update area button placeholder
    function updateAreaBtnPlaceholder(forceDefault = false) {
      const areaBtn = document.getElementById('areaDropdownBtn');
      const areaMinInput = document.getElementById('filterAreaMinInput');
      const areaMaxInput = document.getElementById('filterAreaMaxInput');
      let min = parseInt(areaMinInput.value);
      let max = parseInt(areaMaxInput.value);
      if (forceDefault) {
        min = areaMin;
        max = areaMax;
        areaMinInput.value = areaMin;
        areaMaxInput.value = areaMax;
      }
      areaBtn.innerHTML = `${min === areaMin && max === areaMax ? `${areaMin}–${areaMax} m²` : `${min}–${max} m²`} <span class="area-caret">▼</span>`;
    }
    function formatPrice(num) {
      if (typeof num !== 'number' || isNaN(num) || num === Infinity || num === -Infinity) return '';
      return '€' + num.toLocaleString();
    }
    function updatePriceBtnPlaceholder(forceDefault = false) {
      const priceBtn = document.getElementById('priceDropdownBtn');
      const priceMinInput = document.getElementById('filterPriceMinInput');
      const priceMaxInput = document.getElementById('filterPriceMaxInput');
      let min = parseFloat(priceMinInput.value);
      let max = parseFloat(priceMaxInput.value);
      if (forceDefault) {
        min = priceMin;
        max = priceMax;
        priceMinInput.value = priceMin;
        priceMaxInput.value = priceMax;
      }
      let label = '';
      if ((min === priceMin || isNaN(min)) && (max === priceMax || isNaN(max))) {
        label = 'Any price';
      } else if ((min !== priceMin && !isNaN(min)) && (max === priceMax || isNaN(max))) {
        label = `From ${formatPrice(min)}`;
      } else if ((min === priceMin || isNaN(min)) && (max !== priceMax && !isNaN(max))) {
        label = `Up to ${formatPrice(max)}`;
      } else if ((min !== priceMin && !isNaN(min)) && (max !== priceMax && !isNaN(max))) {
        label = `${formatPrice(min)}–${formatPrice(max)}`;
      } else {
        label = 'Any price';
      }
      priceBtn.innerHTML = `${label} <span class="price-caret">▼</span>`;
    }

    // Area input events
    const areaMinInput = document.getElementById('filterAreaMinInput');
    const areaMaxInput = document.getElementById('filterAreaMaxInput');
    if (areaMinInput && areaMaxInput) {
      areaMinInput.addEventListener('input', () => {
        let min = parseInt(areaMinInput.value);
        let max = parseInt(areaMaxInput.value);
        if (min > max) {
          areaMinInput.value = max;
        }
        updateAreaBtnPlaceholder();
      });
      areaMaxInput.addEventListener('input', () => {
        let min = parseInt(areaMinInput.value);
        let max = parseInt(areaMaxInput.value);
        if (max < min) {
          areaMaxInput.value = min;
        }
        updateAreaBtnPlaceholder();
      });
    }
    // Price input events
    const priceMinInput = document.getElementById('filterPriceMinInput');
    const priceMaxInput = document.getElementById('filterPriceMaxInput');
    if (priceMinInput && priceMaxInput) {
      priceMinInput.addEventListener('input', () => {
        let min = parseInt(priceMinInput.value);
        let max = parseInt(priceMaxInput.value);
        if (min > max) {
          priceMinInput.value = max;
        }
        updatePriceBtnPlaceholder();
      });
      priceMaxInput.addEventListener('input', () => {
        let min = parseInt(priceMinInput.value);
        let max = parseInt(priceMaxInput.value);
        if (max < min) {
          priceMaxInput.value = min;
        }
        updatePriceBtnPlaceholder();
      });
    }

    // Apply buttons update filters and listings
    const areaApplyBtn = document.getElementById('areaApplyBtn');
    if (areaApplyBtn) {
      areaApplyBtn.addEventListener('click', () => {
        const areaMinInput = document.getElementById('filterAreaMinInput');
        const areaMaxInput = document.getElementById('filterAreaMaxInput');
        areaPopover.style.display = 'none';
        filterState.areaMin = parseInt(areaMinInput.value);
        filterState.areaMax = parseInt(areaMaxInput.value);
        applyFilters();
        updateAreaBtnPlaceholder();
      });
    }
    const priceApplyBtn = document.getElementById('priceApplyBtn');
    if (priceApplyBtn) {
      priceApplyBtn.addEventListener('click', () => {
        const priceMinInput = document.getElementById('filterPriceMinInput');
        const priceMaxInput = document.getElementById('filterPriceMaxInput');
        pricePopover.style.display = 'none';
        let min = parseFloat(priceMinInput.value);
        let max = parseFloat(priceMaxInput.value);
        if (min > max) {
          min = max;
          priceMinInput.value = min;
        }
        if (max < min) {
          max = min;
          priceMaxInput.value = max;
        }
        filterState.priceMin = min;
        filterState.priceMax = max;
        applyFilters();
        updatePriceBtnPlaceholder();
      });
    }
    // Attach event listener to location dropdown after rendering
    const locationSelect = document.getElementById('filterLocation');
    if (locationSelect) {
      locationSelect.value = filterState?.location || '';
      locationSelect.addEventListener('change', () => {
        filterState.location = locationSelect.value;
        applyFilters();
      });
    }

    // Add event listener for sort dropdown
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.value = filterState?.sort || '';
      sortSelect.addEventListener('change', () => {
        filterState.sort = sortSelect.value;
        applyFilters();
      });
    }
    // Text search — live filter on every keystroke
    const searchInput = document.getElementById('filterSearch');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        filterState.search = searchInput.value.trim();
        applyFilters();
      });
    }
  }, 0);
  // Dual-handle logic for area
  // (removed duplicate/early declarations; all slider variables are declared after DOM update below)
  // (removed duplicate/early declarations; all slider variables are declared after DOM update below)
  // bringToFrontPrice and event listeners are now only defined after priceMinSlider/priceMaxSlider are declared below
  const filtersEl = document.getElementById('filters');
  if (!filtersEl) return;
  // Get unique locations
  const locations = Array.from(new Set(data.map(item => item.location).filter(Boolean)));
  // Compute min/max for area and price from data
  const areaVals = data.map(item => parseArea(item.size)).filter(x => !isNaN(x));
  const priceVals = data.map(item => parsePrice(item.price)).filter(x => !isNaN(x));
  const areaMin = areaVals.length ? areaVals.reduce((a, b) => Math.min(a, b)) : 0;
  const areaMax = areaVals.length ? areaVals.reduce((a, b) => Math.max(a, b)) : 0;
  const priceMin = priceVals.length ? priceVals.reduce((a, b) => Math.min(a, b)) : 0;
  const priceMax = priceVals.length ? priceVals.reduce((a, b) => Math.max(a, b)) : 0;

  // Compute current filter values for placeholders
  const areaMinVal = filterState?.areaMin ?? areaMin;
  const areaMaxVal = filterState?.areaMax ?? areaMax;
  const priceMinVal = filterState?.priceMin ?? priceMin;
  const priceMaxVal = filterState?.priceMax ?? priceMax;

  filtersEl.innerHTML = `
    <form id="filterForm" class="filter-form">
      <div class="search-group">
        <label for="filterSearch">Search:</label>
        <input type="text" id="filterSearch" class="search-input" placeholder="Title, location, zone, notes, ID..." value="${escapeHtml(filterState?.search || '')}">
      </div>
      <label>
        Location:
        <select id="filterLocation">
          <option value="">All</option>
          ${locations.map(loc => `<option value="${escapeHtml(loc)}">${escapeHtml(loc)}</option>`).join('')}
        </select>
      </label>
      <div class="area-dropdown-group">
        <span class="filter-label">Area (m²)</span>
        <button type="button" id="areaDropdownBtn" class="area-dropdown-btn">
          ${areaMinVal === areaMin && areaMaxVal === areaMax ? `${areaMin}–${areaMax} m²` : `${areaMinVal}–${areaMaxVal} m²`} <span class="area-caret">▼</span>
        </button>
        <div id="areaPopover" class="area-popover" style="display:none;">
          <div class="area-popover-fields popover-fields-col">
            <div class="popover-minmax-row">
              <div class="popover-field-col">
                <span>Min:</span>
                <input type="number" id="filterAreaMinInput" min="${areaMin}" max="${areaMax}" value="${areaMinVal}" class="popover-number-input">
              </div>
              <div class="popover-field-col">
                <span>Max:</span>
                <input type="number" id="filterAreaMaxInput" min="${areaMin}" max="${areaMax}" value="${areaMaxVal}" class="popover-number-input">
              </div>
            </div>
          </div>
          <button type="button" id="areaApplyBtn" class="area-apply-btn">Apply</button>
        </div>
      </div>
      <div class="price-dropdown-group">
        <span class="filter-label">Price (€)</span>
        <button type="button" id="priceDropdownBtn" class="price-dropdown-btn">
          ${priceMinVal === priceMin && priceMaxVal === priceMax ? `€${priceMin}–€${priceMax}` : `€${priceMinVal}–€${priceMaxVal}`} <span class="price-caret">▼</span>
        </button>
        <div id="pricePopover" class="price-popover" style="display:none;">
          <div class="price-popover-fields popover-fields-col">
            <div class="popover-minmax-row">
              <div class="popover-field-col">
                <span>Min:</span>
                <input type="number" id="filterPriceMinInput" min="${priceMin}" max="${priceMax}" value="${priceMinVal}" class="popover-number-input">
              </div>
              <div class="popover-field-col">
                <span>Max:</span>
                <input type="number" id="filterPriceMaxInput" min="${priceMin}" max="${priceMax}" value="${priceMaxVal}" class="popover-number-input">
              </div>
            </div>
          </div>
          <button type="button" id="priceApplyBtn" class="price-apply-btn">Apply</button>
        </div>
      </div>
      <div class="sort-group">
        <label for="sortSelect">Sort by:</label>
        <select id="sortSelect">
          <option value="">Default</option>
          <option value="size-asc">Area (min first)</option>
          <option value="size-desc">Area (max first)</option>
          <option value="price-asc">Price (min first)</option>
          <option value="price-desc">Price (max first)</option>
        </select>
      </div>
      <button type="reset">Reset all</button>
    </form>
  `;
  // Pre-fill dropdowns synchronously so applyFilters() on initial URL-restore reads correct values
  const _locationSelect = document.getElementById('filterLocation');
  if (_locationSelect) _locationSelect.value = filterState.location || '';
  const _sortSelect = document.getElementById('sortSelect');
  if (_sortSelect) _sortSelect.value = filterState.sort || '';
  // Add event listeners
  const form = document.getElementById('filterForm');
  // Area popover logic
  const areaDropdownBtn = document.getElementById('areaDropdownBtn');
  const areaPopover = document.getElementById('areaPopover');
  const areaApplyBtn = document.getElementById('areaApplyBtn');
  areaDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close price popover if open
    if (pricePopover.style.display === 'block') pricePopover.style.display = 'none';
    areaPopover.style.display = areaPopover.style.display === 'none' ? 'block' : 'none';
  });
  // Price popover logic
  const priceDropdownBtn = document.getElementById('priceDropdownBtn');
  const pricePopover = document.getElementById('pricePopover');
  const priceApplyBtn = document.getElementById('priceApplyBtn');
  priceDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close area popover if open
    if (areaPopover.style.display === 'block') areaPopover.style.display = 'none';
    pricePopover.style.display = pricePopover.style.display === 'none' ? 'block' : 'none';
  });
  // Hide popovers when clicking outside
  document.addEventListener('click', (e) => {
    // If click is outside both popovers and buttons, close both
    if (!areaPopover.contains(e.target) && e.target !== areaDropdownBtn) {
      areaPopover.style.display = 'none';
    }
    if (!pricePopover.contains(e.target) && e.target !== priceDropdownBtn) {
      pricePopover.style.display = 'none';
    }
  }, { signal });
  // Text input logic for area and price
  const areaMinInput = document.getElementById('filterAreaMinInput');
  const areaMaxInput = document.getElementById('filterAreaMaxInput');
  const priceMinInput = document.getElementById('filterPriceMinInput');
  const priceMaxInput = document.getElementById('filterPriceMaxInput');

  // Optionally, add input validation or UI feedback here
  // (e.g., prevent min > max, clamp to allowed range, etc.)
  if (form) {
    form.addEventListener('reset', (e) => {
      setTimeout(() => {
        filterState = {};
        writeFiltersToURL();
        renderFilters(allListings);
        renderListings(allListings);
      }, 0);
    });
  }
}

function applyFilters() {
  const areaMinVal = parseFloat(document.getElementById('filterAreaMinInput')?.value);
  const areaMaxVal = parseFloat(document.getElementById('filterAreaMaxInput')?.value);
  const locVal = document.getElementById('filterLocation')?.value || '';
  const priceMinVal = parseFloat(document.getElementById('filterPriceMinInput')?.value);
  const priceMaxVal = parseFloat(document.getElementById('filterPriceMaxInput')?.value);
  const sortVal = document.getElementById('sortSelect')?.value || '';
  const searchQuery = normalizeSearchText(filterState.search || '');
  const searchTokens = searchQuery ? searchQuery.split(' ').filter(Boolean) : [];

  const withParsed = allListings.map(item => {
    const areaNum = parseArea(item.size);
    const rawPrice = parsePrice(item.price);
    const priceNum = Number.isFinite(rawPrice) ? rawPrice : Infinity;
    const searchIndex = buildSearchIndex(item);
    const searchWords = buildSearchWords(searchIndex);
    return { item, areaNum, priceNum, searchIndex, searchWords };
  });

  filteredListings = withParsed
    .filter(({ item, areaNum, priceNum, searchIndex, searchWords }) => {
      if (isNaN(areaNum)) return false;
      const areaOk = (isNaN(areaMinVal) || areaNum >= areaMinVal) && (isNaN(areaMaxVal) || areaNum <= areaMaxVal);
      const priceOk = (isNaN(priceMinVal) || priceNum >= priceMinVal) && (isNaN(priceMaxVal) || priceNum <= priceMaxVal);
      const locOk = !locVal || item.location === locVal;
      const searchOk = !searchTokens.length ||
        searchTokens.every(token => tokenMatchesSearchData(token, searchIndex, searchWords));
      return areaOk && priceOk && locOk && searchOk;
    })
    .sort((a, b) => {
      if (sortVal === 'size-asc') return a.areaNum - b.areaNum;
      if (sortVal === 'size-desc') return b.areaNum - a.areaNum;
      if (sortVal === 'price-asc') return a.priceNum - b.priceNum;
      if (sortVal === 'price-desc') return b.priceNum - a.priceNum;
      return 0;
    })
    .map(({ item }) => item);

  writeFiltersToURL();
  renderListings(filteredListings);
}

function renderHeroStats(data) {
  const statsEl = document.getElementById('heroStats');
  if (!statsEl) return;
  const total = data.length;
  const available = data.filter(x => x.status === 'Available').length;
  const pending = data.filter(x => x.status === 'Pending').length;
  const withDeeds = data.filter(x => x.titleDeed === 'Yes' || x.titleDeed === true).length;
  const iconPlots = svgArea('#fff');
  const iconPin = svgLocation('#fff');
  const iconCheck = `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><path d="M4 10.5l4.5 4.5 7.5-9" stroke="#6de06d" stroke-width="2.2" fill="none"/></svg>`;
  const iconClock = `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><circle cx="10" cy="10" r="8" stroke="#f5c842" stroke-width="2"/><path d="M10 6v4l3 2" stroke="#f5c842" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  statsEl.innerHTML = `
    <span class="hero-stat">${iconPlots} ${total} plots listed</span>
    <span class="hero-stat">${iconPin} Sia, Nicosia</span>
    <span class="hero-stat">${iconCheck} ${withDeeds} with title deeds</span>
    <span class="hero-stat">${iconCheck} ${available} available now</span>
    ${pending > 0 ? `<span class="hero-stat">${iconClock} ${pending} pending — enquiries welcome</span>` : ''}
  `;
}

async function loadListings(){
  showSkeleton();        // show shimmer cards immediately while fetch is in-flight
  readFiltersFromURL();  // restore any filter state from the URL before rendering
  try{
    const res = await fetch('listings.json', {cache: "default"});
    if(!res.ok) throw new Error('Failed to load listings.json');
    const data = await res.json();
    allListings = data;
    listingQualityById = buildListingQualityMap(data);
    renderHeroStats(data);
    renderFilters(data);
    injectListingsSchema(data);
    // If URL params were present, apply them now; otherwise show all listings
    if (Object.keys(filterState).length > 0) {
      applyFilters();
    } else {
      renderListings(data);
    }
  }catch(err){
    listingsEl.innerHTML = `<p class="error">Unable to load listings. (${err.message})</p>`;
    console.error(err);
  }
}

function injectListingsSchema(data) {
  const availabilityMap = {
    'available': 'https://schema.org/InStock',
    'pending':   'https://schema.org/LimitedAvailability',
    'sold':      'https://schema.org/SoldOut'
  };
  const items = data.map((item, i) => ({
    '@type': 'ListItem',
    'position': i + 1,
    'item': {
      '@type': 'Product',
      'name': item.title,
      'description': item.description || item.shortDescription || '',
      'image': item.image,
      'offers': {
        '@type': 'Offer',
        'price': parsePrice(item.price),
        'priceCurrency': 'EUR',
        'availability': availabilityMap[(item.status || '').toLowerCase()] || 'https://schema.org/InStock'
      }
    }
  }));
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Agricultural Plots for Sale — Sia, Nicosia, Cyprus',
    'numberOfItems': data.length,
    'itemListElement': items
  };
  let el = document.getElementById('listings-schema');
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'listings-schema';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(schema);
}

function renderListings(data){
  // Professional empty state SVG icon
  function svgEmptyState() {
    return `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="12" width="32" height="28" rx="4" fill="#f4faf4" stroke="#b2dcb2" stroke-width="2"/>
    <rect x="14" y="18" width="20" height="4" rx="2" fill="#b2dcb2"/>
    <rect x="14" y="26" width="12" height="3" rx="1.5" fill="#dbeedd"/>
    <rect x="14" y="32" width="16" height="3" rx="1.5" fill="#dbeedd"/>
    <rect x="12" y="8" width="24" height="6" rx="3" fill="#b2dcb2"/>
    <circle cx="38" cy="16" r="2" fill="#b2dcb2"/>
  </svg>`;
  }
  if(!Array.isArray(data) || data.length === 0){
    renderQualitySummary([]);
    listingsEl.innerHTML = `
      <div class="empty-listings-message">
        <span class="empty-icon">${svgEmptyState()}</span>
        <span>No listings available. <br>Please redefine your search criteria.</span>
      </div>
    `;
    return;
  }
  renderQualitySummary(data);
  initQualityTooltipInteractions();
  qualityTooltipContentById.clear();
  hideQualityTooltipPortal();
  listingsEl.innerHTML = '';
  data.forEach((item, index) => {
    const enquiry = buildEnquiryLinks(item);
    const quality = getListingQuality(item);
    const safeQualityId = String(item.id || `listing-${index}`).replace(/[^a-zA-Z0-9_-]/g, '');
    const qualityTooltipId = `qualityTooltip-${safeQualityId}-${index}`;
    qualityTooltipContentById.set(qualityTooltipId, buildQualityTooltipPanel(quality));
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-status-sticker card-status-sticker--${escapeHtml((item.status || '').toLowerCase())}">${escapeHtml(item.status || '')}</div>
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.imageAlt || item.title)}" loading="lazy" width="800" height="600" />
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(item.title)}</h3>
        <div class="quality-chip-wrap">
          <button type="button" class="quality-chip quality-chip--${escapeHtml(quality.level)} quality-chip-trigger" data-quality-tooltip-id="${escapeHtml(qualityTooltipId)}" aria-controls="qualityTooltipPortal" aria-expanded="false">${escapeHtml(quality.label)}</button>
        </div>
        <div class="card-meta">
          <span class="icon-attr">${svgArea()}</span> ${escapeHtml(item.size)}
          <span class="icon-attr">${svgPrice()}</span> ${escapeHtml(item.price)}
        </div>
        <div class="card-location">
          <span class="icon-attr">${svgLocation()}</span> <span>${escapeHtml(item.location)}</span>
        </div>
        <div class="card-desc">${escapeHtml(item.shortDescription)}</div>
        <div class="card-actions">
          <button class="button" data-id="${escapeHtml(item.id)}">View details</button>
          <div class="card-quick-actions">
            <a href="${escapeHtml(enquiry.mailtoHref)}" class="button button-secondary button-compact button-with-icon" aria-label="Send email enquiry for ${escapeHtml(item.title || 'listing')}"><span class="cta-icon">${svgMailMini()}</span><span class="cta-label-desktop">Email</span><span class="cta-label-mobile">Mail</span></a>
            <a href="${escapeHtml(enquiry.whatsappHref)}" target="_blank" rel="noopener noreferrer" class="button button-whatsapp-inline button-compact button-with-icon" aria-label="Send WhatsApp enquiry for ${escapeHtml(item.title || 'listing')}"><span class="cta-icon">${svgWhatsAppMini()}</span><span class="cta-label-desktop">WhatsApp</span><span class="cta-label-mobile">WA</span></a>
            ${(item.latitude && item.longitude) ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.latitude + ',' + item.longitude)}" target="_blank" rel="noopener noreferrer" title="View on Google Maps" class="map-pin-link"><span class="map-pin-icon">📌</span></a>` : ''}
          </div>
        </div>
      </div>
    `;
    listingsEl.appendChild(card);

    // Replace broken images with an inline SVG placeholder — no extra network request
    const img = card.querySelector('img');
    img.addEventListener('error', () => { img.src = PLACEHOLDER_IMG; }, { once: true });

    const qualityTrigger = card.querySelector('.quality-chip-trigger');
    if (qualityTrigger) attachQualityTooltipTriggerListeners(qualityTrigger);

    const btn = card.querySelector('.card-actions > .button[data-id]');
    btn.addEventListener('click', () => openModal(item));
  });
}

function openModal(item){
  const enquiry = buildEnquiryLinks(item);
  modalTitle.textContent = item.title;
  modalImage.src = item.image;
  modalImage.alt = item.imageAlt || item.title;
  modalDesc.textContent = item.description;
  modalDetails.innerHTML = `
    <li><span class="icon-attr" title="Area">${svgArea()}</span> ${escapeHtml(item.size)}</li>
    <li><span class="icon-attr" title="Price">${svgPrice()}</span> ${escapeHtml(item.price)}</li>
    <li><span class="icon-attr" title="Location">${svgLocation()}</span> ${escapeHtml(item.location || '—')}</li>
  <li><span class="icon-attr" title="Title Deeds">${svgTitleDeed()}</span> Title deeds available ${svgTick(item.titleDeed === 'Yes' || item.titleDeed === true)}</li>
    <li><span class="icon-attr" title="Notes">${svgNotes()}</span> ${escapeHtml(item.notes || '—')}</li>
    <li><span class="icon-attr" title="Telephone">${svgPhone()}</span> <a href="tel:${escapeHtml(item.contactPhone || '')}">${escapeHtml(item.contactPhone || '—')}</a></li>
    <li><span class="icon-attr" title="Email">${svgContact()}</span> <a href="mailto:${escapeHtml(item.contactEmail || DEFAULT_CONTACT_EMAIL)}">${escapeHtml(item.contactEmail || DEFAULT_CONTACT_EMAIL)}</a></li>
  `;
  if (modalActions) {
    modalActions.innerHTML = `
      <a href="${escapeHtml(enquiry.mailtoHref)}" class="button button-secondary button-with-icon"><span class="cta-icon">${svgMailMini()}</span>Email This Plot</a>
      <a href="${escapeHtml(enquiry.whatsappHref)}" target="_blank" rel="noopener noreferrer" class="button button-whatsapp-inline button-with-icon"><span class="cta-icon">${svgWhatsAppMini()}</span>WhatsApp This Plot</a>
    `;
  }
  // Attach PDF export event listener (ensure button exists)
  const pdfBtn = document.getElementById('downloadPdfBtn');
  if (pdfBtn && window.html2canvas && window.jspdf) {
    pdfBtn.onclick = async function() {
      pdfBtn.style.display = 'none';
      await new Promise(r => setTimeout(r, 100));
      const modalContent = document.querySelector('.modal-content');
      if (!modalContent) { pdfBtn.style.display = ''; return; }
      html2canvas(modalContent, { scale: 2, useCORS: true }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        let imgWidth = canvas.width;
        let imgHeight = canvas.height;
        if (imgWidth > pageWidth) {
          imgHeight = imgHeight * (pageWidth / imgWidth);
          imgWidth = pageWidth;
        }
        if (imgHeight > pageHeight) {
          imgWidth = imgWidth * (pageHeight / imgHeight);
          imgHeight = pageHeight;
        }
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save((modalTitle.textContent || 'listing') + '.pdf');
        pdfBtn.style.display = '';
      }).catch(err => {
        console.error('PDF export failed', err);
        pdfBtn.style.display = '';
      });
    };
  }

  modal.setAttribute('aria-hidden', 'false');

  // Save the element that triggered the modal so we can restore focus on close
  modalTriggerEl = document.activeElement;

  // Full WCAG focus trap: Tab/Shift+Tab cycle stays inside the modal
  if (focusTrapAbortController) focusTrapAbortController.abort();
  focusTrapAbortController = new AbortController();
  const focusableEls = Array.from(modal.querySelectorAll(
    'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
  ));
  const firstFocusable = focusableEls[0];
  const lastFocusable  = focusableEls[focusableEls.length - 1];
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) { e.preventDefault(); lastFocusable.focus(); }
    } else {
      if (document.activeElement === lastFocusable)  { e.preventDefault(); firstFocusable.focus(); }
    }
  }, { signal: focusTrapAbortController.signal });

  modalClose.focus();
}

function closeModal(){
  modal.setAttribute('aria-hidden', 'true');
  // Abort the focus trap and return focus to the element that opened the modal
  if (focusTrapAbortController) { focusTrapAbortController.abort(); focusTrapAbortController = null; }
  if (modalTriggerEl) { modalTriggerEl.focus(); modalTriggerEl = null; }
}

if (modalClose) {
  modalClose.addEventListener('click', closeModal);
}
modal.addEventListener('click', (e) => {
  if(e.target === modal) closeModal();
});
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
});

// basic escaping to avoid injecting HTML from JSON
function escapeHtml(str){
  if(str == null) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
loadListings();

