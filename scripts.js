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
const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='170' viewBox='0 0 400 170'%3E%3Crect width='400' height='170' fill='%23f4faf4'/%3E%3Ctext x='200' y='90' text-anchor='middle' fill='%23b2dcb2' font-size='14' font-family='system-ui'%3EImage unavailable%3C/text%3E%3C/svg%3E";
// Simple renderer for listings.json and modal behavior
const listingsEl = document.getElementById('listings');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalTitle = document.getElementById('modalTitle');
const modalImage = document.getElementById('modalImage');
const modalDesc = document.getElementById('modalDesc');
const modalDetails = document.getElementById('modalDetails');
const yearEl = document.getElementById('year');

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
        <input type="text" id="filterSearch" class="search-input" placeholder="Title or description…" value="${escapeHtml(filterState?.search || '')}">
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
  const searchVal = (filterState.search || '').trim().toLowerCase();

  const withParsed = allListings.map(item => {
    const areaNum = parseArea(item.size);
    const rawPrice = parsePrice(item.price);
    const priceNum = Number.isFinite(rawPrice) ? rawPrice : Infinity;
    return { item, areaNum, priceNum };
  });

  filteredListings = withParsed
    .filter(({ item, areaNum, priceNum }) => {
      if (isNaN(areaNum)) return false;
      const areaOk = (isNaN(areaMinVal) || areaNum >= areaMinVal) && (isNaN(areaMaxVal) || areaNum <= areaMaxVal);
      const priceOk = (isNaN(priceMinVal) || priceNum >= priceMinVal) && (isNaN(priceMaxVal) || priceNum <= priceMaxVal);
      const locOk = !locVal || item.location === locVal;
      const searchOk = !searchVal ||
        (item.title || '').toLowerCase().includes(searchVal) ||
        (item.shortDescription || '').toLowerCase().includes(searchVal);
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
    listingsEl.innerHTML = `
      <div class="empty-listings-message">
        <span class="empty-icon">${svgEmptyState()}</span>
        <span>No listings available. <br>Please redefine your search criteria.</span>
      </div>
    `;
    return;
  }
  listingsEl.innerHTML = '';
  data.forEach(item => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-status-sticker card-status-sticker--${escapeHtml((item.status || '').toLowerCase())}">${escapeHtml(item.status || '')}</div>
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.imageAlt || item.title)}" loading="lazy" width="800" height="600" />
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(item.title)}</h3>
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
          ${(item.latitude && item.longitude) ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.latitude + ',' + item.longitude)}" target="_blank" title="View on Google Maps" class="map-pin-link"><span class="map-pin-icon">📌</span></a>` : ''}
        </div>
      </div>
    `;
    listingsEl.appendChild(card);

    // Replace broken images with an inline SVG placeholder — no extra network request
    const img = card.querySelector('img');
    img.addEventListener('error', () => { img.src = PLACEHOLDER_IMG; }, { once: true });

    const btn = card.querySelector('button');
    btn.addEventListener('click', () => openModal(item));
  });
}

function openModal(item){
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
    <li><span class="icon-attr" title="Email">${svgContact()}</span> <a href="mailto:${escapeHtml(item.contactEmail || 'kypmaria@cytanet.com.cy')}">${escapeHtml(item.contactEmail || '—')}</a></li>
  `;
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

