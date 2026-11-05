// Accordion-style filters logic
let setFiltersExpanded = () => {};

function isDesktopViewport() {
  return window.matchMedia('(min-width: 900px)').matches;
}

document.addEventListener('DOMContentLoaded', function() {
  const filters = document.getElementById('filters');
  const toggleBtn = document.getElementById('filtersToggleBtn');
  const mobileMoreFiltersBtn = document.getElementById('mobileMoreFiltersBtn');
  const mobileSearchInput = document.getElementById('mobileFilterSearch');
  const filtersBackdrop = document.getElementById('filtersBackdrop');

  if (filters) {
    const label = toggleBtn ? toggleBtn.querySelector('.accordion-label') : null;
    function setExpanded(expanded) {
      const desktopView = isDesktopViewport();
      const nextExpanded = desktopView ? true : !!expanded;

      if (nextExpanded) {
        filters.classList.add('expanded');
      } else {
        filters.classList.remove('expanded');
      }

      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
      if (mobileMoreFiltersBtn) {
        mobileMoreFiltersBtn.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
        mobileMoreFiltersBtn.textContent = nextExpanded ? 'Hide extra search options' : 'More search options';
      }
      if (label) label.textContent = nextExpanded ? 'Hide Filters' : 'Show Filters';
      document.body.classList.toggle('filters-sheet-open', !desktopView && nextExpanded);

      if (filtersBackdrop) {
        const showBackdrop = !desktopView && nextExpanded;
        filtersBackdrop.hidden = !showBackdrop;
        filtersBackdrop.setAttribute('aria-hidden', showBackdrop ? 'false' : 'true');
      }

      if (desktopView) {
        document.body.style.overflow = '';
      } else {
        document.body.style.overflow = nextExpanded ? 'hidden' : '';
      }
    }
    setFiltersExpanded = setExpanded;

    setExpanded(isDesktopViewport());

    if (toggleBtn) {
      toggleBtn.addEventListener('click', function() {
        setExpanded(!filters.classList.contains('expanded'));
      });
    }

    if (mobileMoreFiltersBtn) {
      mobileMoreFiltersBtn.addEventListener('click', function() {
        setExpanded(!filters.classList.contains('expanded'));
      });
    }

    if (filtersBackdrop) {
      filtersBackdrop.addEventListener('click', function() {
        setExpanded(false);
      });
    }

    if (mobileSearchInput) {
      mobileSearchInput.value = filterState.search || '';
      mobileSearchInput.addEventListener('input', function() {
        scheduleSearchApply(mobileSearchInput.value);
      });
    }

    window.addEventListener('resize', function() {
      if (isDesktopViewport()) {
        setExpanded(true);
      } else if (filters.classList.contains('expanded')) {
        setExpanded(false);
      }
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
let filterBounds = {
  areaMin: null,
  areaMax: null,
  priceMin: null,
  priceMax: null
};
const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='170' viewBox='0 0 400 170'%3E%3Crect width='400' height='170' fill='%23f4faf4'/%3E%3Ctext x='200' y='90' text-anchor='middle' fill='%23b2dcb2' font-size='14' font-family='system-ui'%3EImage unavailable%3C/text%3E%3C/svg%3E";
// Simple renderer for listings.json and modal behavior
const listingsEl = document.getElementById('listings');
const filterStateBarEl = document.getElementById('filterStateBar');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalTitle = document.getElementById('modalTitle');
const modalImage = document.getElementById('modalImage');
const modalDesc = document.getElementById('modalDesc');
const modalDetails = document.getElementById('modalDetails');
const modalActions = document.getElementById('modalActions');
const yearEl = document.getElementById('year');
const lastUpdatedLabelEl = document.getElementById('lastUpdatedLabel');
const SITE_CONTACT_EMAIL = '';
const SITE_CONTACT_PHONE = '';
const FAVORITES_STORAGE_KEY = 'siaListingsShortlist';
const SEARCH_DEBOUNCE_MS = 180;
const PDF_HTML2CANVAS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
const PDF_HTML2CANVAS_INTEGRITY = 'sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H';
const PDF_JSPDF_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const PDF_JSPDF_INTEGRITY = 'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk';
const externalScriptLoads = new Map();
let searchDebounceTimer = null;
let dataProtectionNoticeTimer = null;
let favoriteListingIds = new Set();

yearEl.textContent = new Date().getFullYear();
favoriteListingIds = loadFavoriteListingIds();

function scheduleSearchApply(rawValue) {
  filterState.search = String(rawValue || '').trim();
  syncSearchInputValues(filterState.search || '');

  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }

  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null;
    applyFilters();
  }, SEARCH_DEBOUNCE_MS);
}

function clearPendingSearchApply() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
}

function loadFavoriteListingIds() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map(id => String(id).trim()).filter(Boolean));
  } catch (error) {
    console.warn('Unable to read shortlist from localStorage.', error);
    return new Set();
  }
}

function saveFavoriteListingIds() {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favoriteListingIds)));
  } catch (error) {
    console.warn('Unable to save shortlist to localStorage.', error);
  }
}

function isListingShortlisted(id) {
  return favoriteListingIds.has(String(id));
}

function toggleListingShortlist(id) {
  const key = String(id);
  if (favoriteListingIds.has(key)) {
    favoriteListingIds.delete(key);
  } else {
    favoriteListingIds.add(key);
  }
  saveFavoriteListingIds();
}

function setLastUpdatedLabel(date) {
  if (!lastUpdatedLabelEl) return;
  const sourceDate = date instanceof Date && !Number.isNaN(date.valueOf()) ? date : new Date();
  const formatted = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(sourceDate);
  lastUpdatedLabelEl.textContent = formatted;
}

function loadExternalScriptOnce(src, integrity) {
  if (externalScriptLoads.has(src)) return externalScriptLoads.get(src);

  const pending = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    if (integrity) {
      script.integrity = integrity;
      script.crossOrigin = 'anonymous';
    }

    script.onload = () => resolve();
    script.onerror = () => {
      externalScriptLoads.delete(src);
      reject(new Error(`Failed to load external script: ${src}`));
    };

    document.head.appendChild(script);
  });

  externalScriptLoads.set(src, pending);
  return pending;
}

async function ensurePdfLibrariesLoaded() {
  if (window.html2canvas && window.jspdf && window.jspdf.jsPDF) return;

  await Promise.all([
    loadExternalScriptOnce(PDF_HTML2CANVAS_SRC, PDF_HTML2CANVAS_INTEGRITY),
    loadExternalScriptOnce(PDF_JSPDF_SRC, PDF_JSPDF_INTEGRITY)
  ]);

  if (!window.html2canvas || !window.jspdf || !window.jspdf.jsPDF) {
    throw new Error('PDF libraries loaded but not available in window scope.');
  }
}


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

function buildImageFallbackCandidates(imagePath) {
  const source = String(imagePath || '').trim();
  if (!source) return [];

  const candidates = [];
  const addCandidate = (value) => {
    if (!value || candidates.includes(value)) return;
    candidates.push(value);
  };

  addCandidate(source);

  const match = source.match(/^(.*?)(\.[a-zA-Z0-9]+)(\?.*)?$/);
  if (!match) {
    addCandidate(`${source}.webp`);
    addCandidate(`${source}.png`);
    return candidates;
  }

  const base = match[1];
  const ext = match[2].toLowerCase();
  const query = match[3] || '';

  if (ext !== '.webp') addCandidate(`${base}.webp${query}`);
  if (ext !== '.png') addCandidate(`${base}.png${query}`);
  if (ext !== '.jpg') addCandidate(`${base}.jpg${query}`);
  if (ext !== '.jpeg') addCandidate(`${base}.jpeg${query}`);

  return candidates;
}

function setImageSourceWithFallback(imgEl, imagePath) {
  if (!imgEl) return;

  const candidates = buildImageFallbackCandidates(imagePath);
  let candidateIndex = 0;

  if (imgEl._fallbackErrorHandler) {
    imgEl.removeEventListener('error', imgEl._fallbackErrorHandler);
    imgEl._fallbackErrorHandler = null;
  }

  const onError = () => {
    if (candidateIndex < candidates.length) {
      imgEl.src = candidates[candidateIndex];
      candidateIndex += 1;
      return;
    }
    imgEl.removeEventListener('error', onError);
    imgEl._fallbackErrorHandler = null;
    imgEl.src = PLACEHOLDER_IMG;
  };

  imgEl._fallbackErrorHandler = onError;
  imgEl.addEventListener('error', onError);

  if (candidateIndex < candidates.length) {
    imgEl.src = candidates[candidateIndex];
    candidateIndex += 1;
  } else {
    imgEl.removeEventListener('error', onError);
    imgEl._fallbackErrorHandler = null;
    imgEl.src = PLACEHOLDER_IMG;
  }
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
    <p class="quality-tooltip-footnote"><a href="#verificationFooterNote">How verification works</a></p>
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
    // If the trigger is in the lower half of the viewport on mobile, scroll it
    // up so the card sits in the top quarter — this prevents the bottom-sheet
    // tooltip from covering the highlighted card.
    const triggerRect = trigger.getBoundingClientRect();
    const viewportMid = window.innerHeight / 2;
    if (triggerRect.top > viewportMid) {
      const desiredTop = window.scrollY + triggerRect.top - Math.round(window.innerHeight * 0.25);
      try {
        window.scrollTo({ top: Math.max(0, desiredTop), left: 0, behavior: 'smooth' });
      } catch (e) {
        // fallback for older browsers
        window.scrollTo(0, Math.max(0, desiredTop));
      }
      // Position the sheet after a short delay to let the scroll settle.
      setTimeout(() => {
        panel.classList.add('is-mobile-sheet');
        panel.style.left = '12px';
        panel.style.right = '12px';
        panel.style.top = 'auto';
        panel.style.bottom = '12px';
      }, 280);
      return;
    }

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

  // Essential fields
  const requiredFields = [
    ['id', 'ID'],
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
  checks.push(qualityCheck('Core fields present', missingRequired.length ? 'fail' : 'pass', missingRequired.length ? `Missing: ${missingRequired.join(', ')}` : ''));

  // Descriptions & image alt
  const missingDesc = [];
  if (!String(item.description || '').trim() || String(item.description || '').trim().length < 20) missingDesc.push('full description');
  if (!String(item.shortDescription || '').trim() || String(item.shortDescription || '').trim().length < 15) missingDesc.push('summary');
  if (!String(item.imageAlt || '').trim() || String(item.imageAlt || '').trim().length < 6) missingDesc.push('image alt');
  checks.push(qualityCheck('Descriptions & image alt', missingDesc.length ? 'warn' : 'pass', missingDesc.length ? `Missing: ${missingDesc.join(', ')}` : ''));

  // Area (format + plausibility)
  const areaNum = parseArea(item.size);
  if (!Number.isFinite(areaNum) || areaNum <= 0) {
    checks.push(qualityCheck('Area (m²) valid', 'fail', 'Invalid/missing'));
  } else if (areaNum > 500000) {
    checks.push(qualityCheck('Area (m²) valid', 'warn', 'Very large — check units'));
  } else {
    checks.push(qualityCheck('Area (m²) valid', 'pass', ''));
  }

  // Price (format + plausibility)
  const priceNum = parsePrice(item.price);
  if (!Number.isFinite(priceNum) || priceNum <= 0) {
    checks.push(qualityCheck('Price present & formatted', 'fail', 'Invalid/missing'));
  } else if (priceNum > 50000000) {
    checks.push(qualityCheck('Price present & formatted', 'warn', 'Very high'));
  } else {
    checks.push(qualityCheck('Price present & formatted', 'pass', ''));
  }

  // Unit price (€/m²)
  let unitPrice = NaN;
  if (Number.isFinite(areaNum) && Number.isFinite(priceNum) && areaNum > 0) unitPrice = priceNum / areaNum;
  if (!Number.isFinite(unitPrice)) {
    checks.push(qualityCheck('Unit price plausibility (€/m²)', 'warn', 'N/A'));
  } else if (unitPrice < 2 || unitPrice > 120) {
    checks.push(qualityCheck('Unit price plausibility (€/m²)', 'warn', `${unitPrice.toFixed(2)} €/m² (unusual)`));
  } else {
    checks.push(qualityCheck('Unit price plausibility (€/m²)', 'pass', ''));
  }

  // Status & title deed format
  const statusNorm = String(item.status || '').trim().toLowerCase();
  const statusOk = ['available', 'pending', 'sold'].includes(statusNorm);
  const titleDeedStandard = item.titleDeed === 'Yes' || item.titleDeed === true || item.titleDeed === 'No' || item.titleDeed === false;
  const stIssues = [];
  if (!statusOk) stIssues.push('status');
  if (!titleDeedStandard) stIssues.push('titleDeed');
  // map to human-friendly labels for detail
  const stIssuesHuman = stIssues.map(x => x === 'titleDeed' ? 'title deed' : x);
  checks.push(qualityCheck('Status & title-deed info', stIssues.length ? 'warn' : 'pass', stIssues.length ? `Invalid: ${stIssuesHuman.join(', ')}` : ''));

  // Map coordinates (combined checks)
  const hasLat = item.latitude !== '' && item.latitude != null;
  const hasLng = item.longitude !== '' && item.longitude != null;
  if (hasLat !== hasLng) {
    checks.push(qualityCheck('Latitude & longitude', 'fail', 'Incomplete pair'));
  } else if (!hasLat && !hasLng) {
    checks.push(qualityCheck('Latitude & longitude', 'pass', ''));
  } else {
    const lat = Number(item.latitude);
    const lng = Number(item.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      checks.push(qualityCheck('Latitude & longitude', 'fail', 'Not numeric'));
    } else if (lat < 34.4 || lat > 35.8 || lng < 32.1 || lng > 34.9) {
      checks.push(qualityCheck('Latitude & longitude', 'warn', 'Outside Cyprus'));
    } else if (Math.abs(lat - lng) < 0.05) {
      checks.push(qualityCheck('Latitude & longitude', 'warn', 'Lat/lng unusually similar'));
    } else {
      checks.push(qualityCheck('Latitude & longitude', 'pass', ''));
    }
  }

  // Contact info
  const emailRaw = SITE_CONTACT_EMAIL.trim();
  const emailOk = emailRaw && isValidEmail(emailRaw);
  const phoneDigits = SITE_CONTACT_PHONE.replace(/\D/g, '');
  const phoneOk = phoneDigits.length >= 8;
  const contactIssues = [];
  if (emailRaw && !emailOk) contactIssues.push('email');
  if (SITE_CONTACT_PHONE && !phoneOk) contactIssues.push('phone');
  checks.push(qualityCheck('Contact details valid (email/phone)', contactIssues.length ? 'warn' : 'pass', contactIssues.length ? `Invalid: ${contactIssues.join(', ')}` : ''));

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
    checks: [qualityCheck('Quality checks status', 'warn', 'Quality check data unavailable for this listing.')],
    issues: [issue('warning', 'Quality check data unavailable for this listing.')]
  };
}

// `renderQualitySummary` removed — summary UI disabled per user request.

function normalizeWhatsAppPhone(phoneRaw) {
  const digits = String(phoneRaw || '').replace(/\D/g, '');
  if (!digits) return '';
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
  const email = SITE_CONTACT_EMAIL.trim();
  const waPhone = normalizeWhatsAppPhone(SITE_CONTACT_PHONE);

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
    mailtoHref: email ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}` : '',
    whatsappHref: waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}` : ''
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

function findSearchMatchesByField(item, searchTokens) {
  if (!Array.isArray(searchTokens) || !searchTokens.length) return [];

  const fields = [
    ['ID', item.id],
    ['Title', item.title],
    ['Location', item.location],
    ['Status', item.status],
    ['Area', item.size],
    ['Price', item.price ? `€${item.price}` : ''],
    ['Notes', item.notes],
    ['Summary', item.shortDescription],
    ['Description', item.description]
  ].filter(([, value]) => String(value || '').trim());

  const matches = [];

  searchTokens.forEach(token => {
    for (const [label, value] of fields) {
      const fieldIndex = normalizeSearchText(value);
      if (!fieldIndex) continue;
      const fieldWords = buildSearchWords(fieldIndex);

      if (tokenMatchesSearchData(token, fieldIndex, fieldWords)) {
        matches.push({ token, label, value: String(value).trim() });
        break;
      }
    }
  });

  return matches;
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
  if (params.get('shortlist') === '1') filterState.shortlistOnly = true;
  syncSearchInputValues(filterState.search || '');
}

function syncSearchInputValues(value) {
  const safeValue = String(value || '');
  const filterSearchInput = document.getElementById('filterSearch');
  const mobileSearchInput = document.getElementById('mobileFilterSearch');

  if (filterSearchInput && filterSearchInput.value !== safeValue) filterSearchInput.value = safeValue;
  if (mobileSearchInput && mobileSearchInput.value !== safeValue) mobileSearchInput.value = safeValue;
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
  if (filterState.shortlistOnly) params.set('shortlist', '1');
  const qs = params.toString();
  history.replaceState(null, '', qs ? '?' + qs : window.location.pathname);
}

function formatCurrencyCompact(value) {
  if (!Number.isFinite(value)) return '';
  return `€${Math.round(value).toLocaleString()}`;
}

function getSortLabel(sortValue) {
  const labels = {
    'size-asc': 'Area: smallest first',
    'size-desc': 'Area: largest first',
    'price-asc': 'Price: lowest first',
    'price-desc': 'Price: highest first'
  };
  return labels[sortValue] || 'Custom sort';
}

function getActiveFilterDescriptors() {
  const descriptors = [];

  const searchVal = String(filterState.search || '').trim();
  if (searchVal) descriptors.push({ key: 'search', label: `Search: ${searchVal}` });

  const locationVal = String(filterState.location || '').trim();
  if (locationVal) descriptors.push({ key: 'location', label: `Location: ${locationVal}` });

  if (filterState.sort) descriptors.push({ key: 'sort', label: getSortLabel(filterState.sort) });
  if (filterState.shortlistOnly) descriptors.push({ key: 'shortlist', label: 'Shortlist only' });

  const areaMinSet = Number.isFinite(filterState.areaMin) && Number.isFinite(filterBounds.areaMin) && filterState.areaMin > filterBounds.areaMin;
  const areaMaxSet = Number.isFinite(filterState.areaMax) && Number.isFinite(filterBounds.areaMax) && filterState.areaMax < filterBounds.areaMax;
  if (areaMinSet || areaMaxSet) {
    const areaMin = areaMinSet ? Math.round(filterState.areaMin) : Math.round(filterBounds.areaMin || 0);
    const areaMax = areaMaxSet ? Math.round(filterState.areaMax) : Math.round(filterBounds.areaMax || 0);
    descriptors.push({ key: 'area', label: `Area: ${areaMin}–${areaMax} m²` });
  }

  const priceMinSet = Number.isFinite(filterState.priceMin) && Number.isFinite(filterBounds.priceMin) && filterState.priceMin > filterBounds.priceMin;
  const priceMaxSet = Number.isFinite(filterState.priceMax) && Number.isFinite(filterBounds.priceMax) && filterState.priceMax < filterBounds.priceMax;
  if (priceMinSet || priceMaxSet) {
    const priceMin = priceMinSet ? filterState.priceMin : filterBounds.priceMin;
    const priceMax = priceMaxSet ? filterState.priceMax : filterBounds.priceMax;
    descriptors.push({ key: 'price', label: `Price: ${formatCurrencyCompact(priceMin)}–${formatCurrencyCompact(priceMax)}` });
  }

  return descriptors;
}

function clearFilterByKey(key) {
  if (key === 'search') filterState.search = '';
  if (key === 'location') filterState.location = '';
  if (key === 'sort') filterState.sort = '';
  if (key === 'shortlist') filterState.shortlistOnly = false;
  if (key === 'area') {
    filterState.areaMin = null;
    filterState.areaMax = null;
  }
  if (key === 'price') {
    filterState.priceMin = null;
    filterState.priceMax = null;
  }

  renderFilters(allListings);
  applyFilters();
}

function buildSearchMatchSummary(matchGroups) {
  if (!Array.isArray(matchGroups) || !matchGroups.length) return [];

  const counts = new Map();

  matchGroups.forEach(matches => {
    const seenInListing = new Set();
    const safeMatches = Array.isArray(matches) ? matches : [];

    safeMatches.forEach(match => {
      const label = String(match.label || '').trim();
      const value = String(match.value || '').trim();
      if (!label || !value) return;

      const key = `${label}||${value}`;
      if (seenInListing.has(key)) return;

      seenInListing.add(key);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([key, count]) => {
      const parts = key.split('||');
      return { label: parts[0], value: parts[1], count };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.label !== b.label) return a.label.localeCompare(b.label);
      return a.value.localeCompare(b.value);
    })
    .slice(0, 4);
}

function renderFilterStateBar(currentCount, totalCount, searchSummary = []) {
  if (!filterStateBarEl) return;

  const active = getActiveFilterDescriptors();
  if (!active.length) {
    filterStateBarEl.classList.add('is-hidden');
    filterStateBarEl.innerHTML = '';
    return;
  }

  filterStateBarEl.classList.remove('is-hidden');
  const hasSearch = String(filterState.search || '').trim().length > 0;

  const chipsHtml = active.length
    ? active.map(item => `<button type="button" class="filter-state-chip" data-filter-key="${escapeHtml(item.key)}" aria-label="Remove ${escapeHtml(item.label)}">${escapeHtml(item.label)} <span aria-hidden="true">x</span></button>`).join('')
    : '<span class="filter-state-none">No active filters</span>';

  const searchSummaryHtml = hasSearch
    ? `<div class="filter-search-match-row"><span class="filter-search-match-label">Search matches:</span><div class="filter-search-match-list">${searchSummary.length ? searchSummary.map(entry => `<span class="filter-search-match-chip"><strong>${escapeHtml(entry.label)}</strong> = ${escapeHtml(entry.value)} (${entry.count})</span>`).join('') : '<span class="filter-search-match-empty">No field/value hint in current results</span>'}</div></div>`
    : '';

  filterStateBarEl.innerHTML = `
    <div class="filter-state-count">Showing <strong>${currentCount}</strong> of <strong>${totalCount}</strong> plots</div>
    <div class="filter-state-chips">${chipsHtml}${active.length ? '<button type="button" class="filter-state-clear-all" data-filter-key="all">Clear all</button>' : ''}</div>
    ${searchSummaryHtml}
  `;

  filterStateBarEl.querySelectorAll('[data-filter-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-filter-key');
      if (key === 'all') {
        filterState = {};
        renderFilters(allListings);
        applyFilters();
        return;
      }
      clearFilterByKey(key);
    });
  });
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
        if (!isDesktopViewport()) setFiltersExpanded(false);
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
        if (!isDesktopViewport()) setFiltersExpanded(false);
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
        scheduleSearchApply(searchInput.value);
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

  filterBounds = { areaMin, areaMax, priceMin, priceMax };

  // Compute current filter values for placeholders
  const areaMinVal = filterState?.areaMin ?? areaMin;
  const areaMaxVal = filterState?.areaMax ?? areaMax;
  const priceMinVal = filterState?.priceMin ?? priceMin;
  const priceMaxVal = filterState?.priceMax ?? priceMax;
  const shortlistCount = data.filter(item => isListingShortlisted(item.id)).length;

  filtersEl.innerHTML = `
    <div class="filters-mobile-sheet-top">
      <h3>Search filters</h3>
      <button type="button" id="mobileFiltersCloseBtn" class="filters-mobile-close-btn">Close</button>
    </div>
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
      <label class="shortlist-toggle" for="filterShortlistOnly">
        <input type="checkbox" id="filterShortlistOnly" ${filterState.shortlistOnly ? 'checked' : ''}>
        <span>Shortlist (${shortlistCount})</span>
      </label>
      <button type="reset">Reset all</button>
    </form>
  `;
  // Pre-fill dropdowns synchronously so applyFilters() on initial URL-restore reads correct values
  const _locationSelect = document.getElementById('filterLocation');
  if (_locationSelect) _locationSelect.value = filterState.location || '';
  const _sortSelect = document.getElementById('sortSelect');
  if (_sortSelect) _sortSelect.value = filterState.sort || '';
  const mobileFiltersCloseBtn = document.getElementById('mobileFiltersCloseBtn');
  if (mobileFiltersCloseBtn) {
    mobileFiltersCloseBtn.addEventListener('click', () => setFiltersExpanded(false), { signal });
  }
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
  const shortlistCheckbox = document.getElementById('filterShortlistOnly');
  if (shortlistCheckbox) {
    shortlistCheckbox.checked = !!filterState.shortlistOnly;
    shortlistCheckbox.addEventListener('change', () => {
      filterState.shortlistOnly = shortlistCheckbox.checked;
      applyFilters();
    }, { signal });
  }

  // Optionally, add input validation or UI feedback here
  // (e.g., prevent min > max, clamp to allowed range, etc.)
  if (form) {
    form.addEventListener('reset', (e) => {
      setTimeout(() => {
        filterState = {};
        writeFiltersToURL();
        setFiltersExpanded(isDesktopViewport());
        renderFilters(allListings);
        renderListings(allListings);
        renderFilterStateBar(allListings.length, allListings.length, []);
      }, 0);
    });
  }
}

function applyFilters() {
  clearPendingSearchApply();
  syncSearchInputValues(filterState.search || '');
  const areaMinVal = parseFloat(document.getElementById('filterAreaMinInput')?.value);
  const areaMaxVal = parseFloat(document.getElementById('filterAreaMaxInput')?.value);
  const locVal = document.getElementById('filterLocation')?.value || '';
  const priceMinVal = parseFloat(document.getElementById('filterPriceMinInput')?.value);
  const priceMaxVal = parseFloat(document.getElementById('filterPriceMaxInput')?.value);
  const sortVal = document.getElementById('sortSelect')?.value || '';
  const shortlistOnly = !!document.getElementById('filterShortlistOnly')?.checked;
  filterState.shortlistOnly = shortlistOnly;
  const searchQuery = normalizeSearchText(filterState.search || '');
  const searchTokens = searchQuery ? searchQuery.split(' ').filter(Boolean) : [];

  const withParsed = allListings.map(item => {
    const areaNum = parseArea(item.size);
    const rawPrice = parsePrice(item.price);
    const priceNum = Number.isFinite(rawPrice) ? rawPrice : Infinity;
    const searchMatches = findSearchMatchesByField(item, searchTokens);
    return { item, areaNum, priceNum, searchMatches };
  });

  const filteredWithMeta = withParsed
    .filter(({ item, areaNum, priceNum, searchMatches }) => {
      if (isNaN(areaNum)) return false;
      const areaOk = (isNaN(areaMinVal) || areaNum >= areaMinVal) && (isNaN(areaMaxVal) || areaNum <= areaMaxVal);
      const priceOk = (isNaN(priceMinVal) || priceNum >= priceMinVal) && (isNaN(priceMaxVal) || priceNum <= priceMaxVal);
      const locOk = !locVal || item.location === locVal;
      const shortlistOk = !shortlistOnly || isListingShortlisted(item.id);
      const searchOk = !searchTokens.length ||
        searchTokens.every(token => searchMatches.some(match => match.token === token));
      return areaOk && priceOk && locOk && shortlistOk && searchOk;
    })
    .sort((a, b) => {
      if (sortVal === 'size-asc') return a.areaNum - b.areaNum;
      if (sortVal === 'size-desc') return b.areaNum - a.areaNum;
      if (sortVal === 'price-asc') return a.priceNum - b.priceNum;
      if (sortVal === 'price-desc') return b.priceNum - a.priceNum;
      return 0;
    })

  const searchSummary = searchTokens.length
    ? buildSearchMatchSummary(filteredWithMeta.map(entry => entry.searchMatches))
    : [];

  filteredListings = filteredWithMeta.map(({ item }) => item);

  writeFiltersToURL();
  renderListings(filteredListings);
  renderFilterStateBar(filteredListings.length, allListings.length, searchSummary);
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

function flashDataProtectionNotice() {
  const noticeEl = document.getElementById('dataProtectionNotice') || document.getElementById('verificationFooterNote');
  if (!noticeEl) return;

  noticeEl.classList.add('is-visible');
  if (dataProtectionNoticeTimer) clearTimeout(dataProtectionNoticeTimer);

  dataProtectionNoticeTimer = setTimeout(() => {
    noticeEl.classList.remove('is-visible');
    dataProtectionNoticeTimer = null;
  }, 2200);
}

function isNodeInsideProtectedListingData(node) {
  if (!node) return false;

  const el = node instanceof Element ? node : node.parentElement;
  if (!el) return false;

  return Boolean(
    el.closest('#listings') ||
    el.closest('#modalDesc') ||
    el.closest('#modalDetails')
  );
}

function setupDataProtectionGuards() {
  ['#listings', '#modalDesc', '#modalDetails'].forEach((selector) => {
    const protectedEl = document.querySelector(selector);
    if (protectedEl) protectedEl.classList.add('copy-protected');
  });

  // Deter casual copying of listing text from cards and modal details.
  ['copy', 'cut'].forEach((eventName) => {
    document.addEventListener(eventName, (event) => {
      const selection = window.getSelection();
      const selectionNode = (selection && selection.rangeCount > 0) ? selection.anchorNode : null;

      if (!isNodeInsideProtectedListingData(event.target) && !isNodeInsideProtectedListingData(selectionNode)) return;

      event.preventDefault();
      flashDataProtectionNotice();
    });
  });

  // Prevent drag-and-drop image export from listing/media areas.
  document.addEventListener('dragstart', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    if (!target.closest('#listings') && !target.closest('.modal-hero-media')) return;

    event.preventDefault();
    flashDataProtectionNotice();
  });

  // Reduce right-click save options on listing images.
  document.addEventListener('contextmenu', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest('#listings img, .modal-hero-media img')) return;

    event.preventDefault();
    flashDataProtectionNotice();
  });
}

async function loadListings(){
  showSkeleton();        // show shimmer cards immediately while fetch is in-flight
  readFiltersFromURL();  // restore any filter state from the URL before rendering
  try{
    const res = await fetch('listings.json', {cache: "default"});
    if(!res.ok) throw new Error('Failed to load listings.json');
    const data = await res.json();
    const modifiedHeader = res.headers.get('last-modified');
    setLastUpdatedLabel(modifiedHeader ? new Date(modifiedHeader) : new Date());
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
      renderFilterStateBar(data.length, data.length, []);
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
    listingsEl.innerHTML = `
      <div class="empty-listings-message">
        <span class="empty-icon">${svgEmptyState()}</span>
        <span>No listings available. <br>Please redefine your search criteria.</span>
      </div>
    `;
    return;
  }
  listingsEl.innerHTML = '';
  data.forEach((item) => {
    const enquiry = buildEnquiryLinks(item);
    const quickActions = [];
    if (enquiry.mailtoHref) {
      quickActions.push(`<a href="${escapeHtml(enquiry.mailtoHref)}" class="card-action-icon-link card-action-icon-link--email" aria-label="Send email enquiry for ${escapeHtml(item.title || 'listing')}" title="Email"><span class="cta-icon">${svgMailMini()}</span></a>`);
    }
    if (enquiry.whatsappHref) {
      quickActions.push(`<a href="${escapeHtml(enquiry.whatsappHref)}" target="_blank" rel="noopener noreferrer" class="card-action-icon-link card-action-icon-link--whatsapp" aria-label="Send WhatsApp enquiry for ${escapeHtml(item.title || 'listing')}" title="WhatsApp"><span class="cta-icon">${svgWhatsAppMini()}</span></a>`);
    }
    const card = document.createElement('article');
    card.className = 'card';

    // Compute formatted price and per-m² for quick decision-making display
    const priceNum = parsePrice(item.price);
    const formattedPrice = Number.isFinite(priceNum)
      ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(priceNum)
      : (item.price || '—');
    const areaNumLocal = parseArea(item.size);
    let unitPriceStr = '';
    if (Number.isFinite(priceNum) && Number.isFinite(areaNumLocal) && areaNumLocal > 0) {
      const unit = priceNum / areaNumLocal;
      if (Number.isFinite(unit) && unit > 0) {
        unitPriceStr = unit >= 10 ? `${Math.round(unit)} €/m²` : `${unit.toFixed(2)} €/m²`;
      }
    }
    // Title deed short label
    const titleDeedShort = (item.titleDeed === 'Yes' || item.titleDeed === true) ? 'Yes' : 'No';

    const mapQuery = (item.latitude && item.longitude)
      ? `${item.latitude},${item.longitude}`
      : `${item.location || ''} ${item.title || ''} Cyprus`.trim();
    const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery || 'Cyprus')}`;

    card.innerHTML = `
      <div class="card-status-sticker card-status-sticker--${escapeHtml((item.status || '').toLowerCase())}">${escapeHtml(item.status || '')}</div>
      <div class="card-image-wrap">
        <img src="" alt="${escapeHtml(item.imageAlt || item.title)}" loading="lazy" width="800" height="600" />
        <a href="${escapeHtml(mapHref)}" target="_blank" rel="noopener noreferrer" title="Open in Google Maps" class="card-map-pill" aria-label="Open ${escapeHtml(item.title || 'listing')} in Google Maps"><span class="card-map-pill-label">Open in maps</span></a>
      </div>
      <div class="card-body">
        <div class="card-title-row">
          <h3 class="card-title">${escapeHtml(item.title)}</h3>
        </div>
        <div class="card-facts">
          <span class="card-fact"><span class="attr-text">Deed: ${escapeHtml(titleDeedShort)}</span></span>
          ${unitPriceStr ? `<span class="card-fact"><span class="attr-text">Unit: ${escapeHtml(unitPriceStr)}</span></span>` : ''}
          <span class="card-attr"><span class="icon-attr">${svgArea()}</span><span class="attr-text">${escapeHtml(item.size)}</span></span>
          <span class="card-attr"><span class="attr-text">${escapeHtml(formattedPrice)}</span></span>
        </div>
        <div class="card-location">
          <span class="card-attr"><span class="icon-attr">${svgLocation()}</span><span class="attr-text">${escapeHtml(item.location)}</span></span>
        </div>
        <div class="card-desc">${escapeHtml(item.shortDescription)}</div>
        <div class="card-actions">
          <div class="card-primary-actions">
            <button class="button" data-id="${escapeHtml(item.id)}">View details</button>
            <button type="button" class="button button-secondary favorite-toggle" data-shortlist-id="${escapeHtml(item.id)}" aria-pressed="${isListingShortlisted(item.id) ? 'true' : 'false'}"></button>
          </div>
          ${quickActions.length ? `<div class="card-quick-actions">${quickActions.join('')}</div>` : ''}
        </div>
      </div>
    `;
    listingsEl.appendChild(card);

    const img = card.querySelector('img');
    setImageSourceWithFallback(img, item.image);

    const btn = card.querySelector('.card-primary-actions > .button[data-id]');
    if (btn) btn.addEventListener('click', () => openModal(item));

    const shortlistBtn = card.querySelector('.favorite-toggle');
    if (shortlistBtn) {
      const applyShortlistButtonState = () => {
        const active = isListingShortlisted(item.id);
        shortlistBtn.classList.toggle('is-active', active);
        shortlistBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
        shortlistBtn.textContent = active ? '★ Shortlisted' : '☆ Shortlist';
      };

      applyShortlistButtonState();
      shortlistBtn.addEventListener('click', () => {
        toggleListingShortlist(item.id);
        applyShortlistButtonState();
        renderFilters(allListings);
        applyFilters();
      });
    }
  });
}

function openModal(item){
  const enquiry = buildEnquiryLinks(item);
  const contactDetails = [];
  const email = SITE_CONTACT_EMAIL.trim();
  const phone = SITE_CONTACT_PHONE.trim();
  const phoneDigits = normalizeWhatsAppPhone(phone);
  if (phone) {
    contactDetails.push(`<li><span class="icon-attr" title="Telephone">${svgPhone()}</span> <a href="tel:+${escapeHtml(phoneDigits)}">${escapeHtml(phone)}</a></li>`);
  }
  if (email) {
    contactDetails.push(`<li><span class="icon-attr" title="Email">${svgContact()}</span> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></li>`);
  }
  modalTitle.textContent = item.title;
  modalImage.alt = item.imageAlt || item.title;
  setImageSourceWithFallback(modalImage, item.image);
  modalDesc.textContent = item.description;
  modalDetails.innerHTML = `
    <li><span class="icon-attr" title="Area">${svgArea()}</span> ${escapeHtml(item.size)}</li>
    <li><span class="icon-attr" title="Price">${svgPrice()}</span> ${escapeHtml(item.price)}</li>
    <li><span class="icon-attr" title="Location">${svgLocation()}</span> ${escapeHtml(item.location || '—')}</li>
  <li><span class="icon-attr" title="Title Deeds">${svgTitleDeed()}</span> Title deeds available ${svgTick(item.titleDeed === 'Yes' || item.titleDeed === true)}</li>
    <li><span class="icon-attr" title="Notes">${svgNotes()}</span> ${escapeHtml(item.notes || '—')}</li>
    ${contactDetails.join('')}
  `;
  if (modalActions) {
    const actions = [];
    if (enquiry.mailtoHref) actions.push(`<a href="${escapeHtml(enquiry.mailtoHref)}" class="button button-secondary button-with-icon"><span class="cta-icon">${svgMailMini()}</span>Email This Plot</a>`);
    if (enquiry.whatsappHref) actions.push(`<a href="${escapeHtml(enquiry.whatsappHref)}" target="_blank" rel="noopener noreferrer" class="button button-whatsapp-inline button-with-icon"><span class="cta-icon">${svgWhatsAppMini()}</span>WhatsApp This Plot</a>`);
    modalActions.innerHTML = actions.length ? actions.join('') : '<p>Contact details will be added soon.</p>';
  }

  // Attach PDF export event listener and lazy-load dependencies only when needed.
  const pdfBtn = document.getElementById('downloadPdfBtn');
  const pdfBtnLabel = pdfBtn ? pdfBtn.querySelector('.modal-pdf-btn-label') : null;
  const setPdfButtonState = (label, isBusy) => {
    if (!pdfBtn) return;
    if (pdfBtnLabel) pdfBtnLabel.textContent = label;
    pdfBtn.disabled = !!isBusy;
    pdfBtn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  };

  if (pdfBtn) {
    setPdfButtonState('Download PDF', false);
    pdfBtn.onclick = async function() {
      setPdfButtonState('Preparing PDF...', true);
      const modalContent = document.querySelector('.modal-content');
      if (!modalContent) {
        setPdfButtonState('Download PDF', false);
        return;
      }

      try {
        await ensurePdfLibrariesLoaded();
        const canvas = await window.html2canvas(modalContent, { scale: 2, useCORS: true });
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
      } catch (err) {
        console.error('PDF export failed', err);
      } finally {
        setPdfButtonState('Download PDF', false);
      }
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
  setupDataProtectionGuards();
loadListings();
