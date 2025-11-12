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
// Simple renderer for listings.json and modal behavior
const listingsEl = document.getElementById('listings');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalTitle = document.getElementById('modalTitle');
const modalImage = document.getElementById('modalImage');
const modalDesc = document.getElementById('modalDesc');
const modalDetails = document.getElementById('modalDetails');
const modalEmail = document.getElementById('modalEmail');
const modalPhone = document.getElementById('modalPhone');
const modalMap = document.getElementById('modalMap');
const yearEl = document.getElementById('year');

yearEl.textContent = new Date().getFullYear();


// Inline SVG icon functions (must be defined before use)
function svgArea() {
  return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><rect x="3" y="3" width="14" height="14" rx="2" stroke="#2b7a2b" stroke-width="2" fill="none"/><path d="M3 9h14M9 3v14" stroke="#2b7a2b" stroke-width="1.5"/></svg>`;
}
function svgPrice() {
  return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><circle cx="10" cy="10" r="8" stroke="#2b7a2b" stroke-width="2" fill="none"/><text x="10" y="14" text-anchor="middle" font-size="10" fill="#2b7a2b" font-family="Arial">€</text></svg>`;
}
function svgLocation() {
  return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><path d="M10 18s6-6.5 6-10A6 6 0 1 0 4 8c0 3.5 6 10 6 10z" stroke="#2b7a2b" stroke-width="2" fill="none"/><circle cx="10" cy="8" r="2" stroke="#2b7a2b" stroke-width="1.5"/></svg>`;
}
function svgContact() {
  return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><rect x="3" y="5" width="14" height="10" rx="2" stroke="#2b7a2b" stroke-width="2" fill="none"/><path d="M3 5l7 6 7-6" stroke="#2b7a2b" stroke-width="1.5" fill="none"/></svg>`;
}

function svgNotes() {
  // Pencil icon for notes
  return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><path d="M15.232 5.232l-10 10V17h1.768l10-10-1.768-1.768zM17.414 3.414a2 2 0 0 0-2.828 0l-1.172 1.172 2.828 2.828 1.172-1.172a2 2 0 0 0 0-2.828z" stroke="#2b7a2b" stroke-width="1.5" fill="#fff"/></svg>`;
}


function renderFilters(data) {
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
    function updatePriceBtnPlaceholder(forceDefault = false) {
      const priceBtn = document.getElementById('priceDropdownBtn');
      const priceMinInput = document.getElementById('filterPriceMinInput');
      const priceMaxInput = document.getElementById('filterPriceMaxInput');
      let min = parseInt(priceMinInput.value);
      let max = parseInt(priceMaxInput.value);
      if (forceDefault) {
        min = priceMin;
        max = priceMax;
        priceMinInput.value = priceMin;
        priceMaxInput.value = priceMax;
      }
      priceBtn.innerHTML = `${min === priceMin && max === priceMax ? `€${priceMin}–€${priceMax}` : `€${min}–€${max}`} <span class="price-caret">▼</span>`;
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
        filters = filters || {};
        filters.areaMin = parseInt(areaMinInput.value);
        filters.areaMax = parseInt(areaMaxInput.value);
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
        filters = filters || {};
        filters.priceMin = parseInt(priceMinInput.value);
        filters.priceMax = parseInt(priceMaxInput.value);
        applyFilters();
        updatePriceBtnPlaceholder();
      });
    }
  }, 0);
  // Attach event listener to location dropdown after rendering
  setTimeout(() => {
    const locationSelect = document.getElementById('filterLocation');
    if (locationSelect) {
      locationSelect.value = filters?.location || '';
      locationSelect.addEventListener('change', () => {
        filters = filters || {};
        filters.location = locationSelect.value;
        applyFilters();
      });
    }

    // Add event listener for sort dropdown
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.value = filters?.sort || '';
      sortSelect.addEventListener('change', () => {
        filters = filters || {};
        filters.sort = sortSelect.value;
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
  const areaVals = data.map(item => {
    if (!item.size) return NaN;
    let areaStr = item.size.replace(/[^\d.,]/g, '');
    if (areaStr.includes(',') && areaStr.includes('.')) {
      areaStr = areaStr.replace(/\./g, '').replace(/,/g, '.');
    } else {
      areaStr = areaStr.replace(/,/g, '');
    }
    const match = areaStr.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : NaN;
  }).filter(x => !isNaN(x));
  const priceVals = data.map(item => {
    if (!item.price) return NaN;
    const match = item.price.replace(/,/g, '').match(/€([\d.]+)/);
    return match ? parseFloat(match[1]) : NaN;
  }).filter(x => !isNaN(x));
  const areaMin = Math.min(...areaVals);
  const areaMax = Math.max(...areaVals);
  const priceMin = Math.min(...priceVals);
  const priceMax = Math.max(...priceVals);

  // Compute current filter values for placeholders
  const areaMinVal = filters?.areaMin ?? areaMin;
  const areaMaxVal = filters?.areaMax ?? areaMax;
  const priceMinVal = filters?.priceMin ?? priceMin;
  const priceMaxVal = filters?.priceMax ?? priceMax;

  filtersEl.innerHTML = `
    <form id="filterForm" class="filter-form">
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
      <label>
        Location:
        <select id="filterLocation">
          <option value="">All</option>
          ${locations.map(loc => `<option value="${escapeHtml(loc)}">${escapeHtml(loc)}</option>`).join('')}
        </select>
      </label>
      <div class="area-dropdown-group">
        <label for="areaDropdownBtn" class="filter-label">Area (m²)</label>
        <button type="button" id="areaDropdownBtn" class="area-dropdown-btn">
          ${areaMinVal === areaMin && areaMaxVal === areaMax ? `${areaMin}–${areaMax} m²` : `${areaMinVal}–${areaMaxVal} m²`} <span class="area-caret">▼</span>
        </button>
        <div id="areaPopover" class="area-popover" style="display:none;">
          <div class="area-popover-fields" style="flex-direction:column;align-items:stretch;gap:6px;">
            <div style="display:flex;justify-content:space-between;font-size:0.98em;margin-bottom:2px;gap:8px;">
              <div style="display:flex;flex-direction:column;align-items:flex-start;width:50%;min-width:0;">
                <span>Min:</span>
                <input type="number" id="filterAreaMinInput" min="${areaMin}" max="${areaMax}" value="${areaMinVal}" style="width:90px;">
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-start;width:50%;min-width:0;">
                <span>Max:</span>
                <input type="number" id="filterAreaMaxInput" min="${areaMin}" max="${areaMax}" value="${areaMaxVal}" style="width:90px;">
              </div>
            </div>
          </div>
          <button type="button" id="areaApplyBtn" class="area-apply-btn">Apply</button>
        </div>
      </div>
      <div class="price-dropdown-group">
        <label for="priceDropdownBtn" class="filter-label">Price (€)</label>
        <button type="button" id="priceDropdownBtn" class="price-dropdown-btn">
          ${priceMinVal === priceMin && priceMaxVal === priceMax ? `€${priceMin}–€${priceMax}` : `€${priceMinVal}–€${priceMaxVal}`} <span class="price-caret">▼</span>
        </button>
        <div id="pricePopover" class="price-popover" style="display:none;">
          <div class="price-popover-fields" style="flex-direction:column;align-items:stretch;gap:10px;">
            <div style="display:flex;justify-content:space-between;font-size:0.98em;margin-bottom:2px;">
              <span>Min: <input type="number" id="filterPriceMinInput" min="${priceMin}" max="${priceMax}" value="${priceMinVal}" style="width:90px;"></span>
              <span>Max: <input type="number" id="filterPriceMaxInput" min="${priceMin}" max="${priceMax}" value="${priceMaxVal}" style="width:90px;"></span>
            </div>
          </div>
          <button type="button" id="priceApplyBtn" class="price-apply-btn">Apply</button>
        </div>
      </div>
      <button type="reset">Reset all</button>
    </form>
  `;
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
  });
  // Text input logic for area and price
  const areaMinInput = document.getElementById('filterAreaMinInput');
  const areaMaxInput = document.getElementById('filterAreaMaxInput');
  const priceMinInput = document.getElementById('filterPriceMinInput');
  const priceMaxInput = document.getElementById('filterPriceMaxInput');

  // Optionally, add input validation or UI feedback here
  // (e.g., prevent min > max, clamp to allowed range, etc.)
  // Apply buttons
  if (areaApplyBtn) {
    areaApplyBtn.addEventListener('click', () => {
      areaPopover.style.display = 'none';
      applyFilters();
    });
  }
  if (priceApplyBtn) {
    priceApplyBtn.addEventListener('click', () => {
      pricePopover.style.display = 'none';
      applyFilters();
    });
  }
  if (form) {
    form.addEventListener('reset', (e) => {
      setTimeout(() => {
        // Reset filters object and force full filter UI re-render
        filters = {};
        renderFilters(allListings);
        renderListings(allListings);
      }, 0);
    });
  }
}

function applyFilters() {
  let areaMinVal = parseFloat(document.getElementById('filterAreaMinInput')?.value);
  let areaMaxVal = parseFloat(document.getElementById('filterAreaMaxInput')?.value);
  const locVal = document.getElementById('filterLocation').value;
  let priceMinVal = parseFloat(document.getElementById('filterPriceMinInput')?.value);
  let priceMaxVal = parseFloat(document.getElementById('filterPriceMaxInput')?.value);
  filteredListings = allListings.filter(item => {
    // Parse area (e.g. "10703 m²", "1,234.56 m²", "1.234,56 m²") robustly
    let areaNum = NaN;
    if (item.size) {
      // Extract the first valid number (integer or decimal, with optional comma or dot)
      let areaStr = item.size.replace(/[^\d.,]/g, '');
      // If both , and . exist, assume . is thousand and , is decimal (European style)
      if (areaStr.includes(',') && areaStr.includes('.')) {
        areaStr = areaStr.replace(/\./g, '').replace(/,/g, '.');
      } else {
        areaStr = areaStr.replace(/,/g, '');
      }
      const match = areaStr.match(/([\d.]+)/);
      if (match) areaNum = parseFloat(match[1]);
    }
    // If areaNum is not a valid number, exclude this listing
    if (isNaN(areaNum)) return false;
    // Parse price (e.g. "€102,700 (2021 valuation)")
    let priceNum = Infinity;
    if (item.price) {
      const match = item.price.replace(/,/g, '').match(/€([\d.]+)/);
      if (match) priceNum = parseFloat(match[1]);
    }
    const areaOk = (isNaN(areaMinVal) || areaNum >= areaMinVal) && (isNaN(areaMaxVal) || areaNum <= areaMaxVal);
    const priceOk = (isNaN(priceMinVal) || priceNum >= priceMinVal) && (isNaN(priceMaxVal) || priceNum <= priceMaxVal);
    const locOk = !locVal || item.location === locVal;
    // Attach parsed values for sorting
    item._areaNum = areaNum;
    item._priceNum = priceNum;
    return areaOk && priceOk && locOk;
  });
  // Sorting
  const sortVal = document.getElementById('sortSelect')?.value || '';
  if (sortVal === 'size-asc') {
    filteredListings.sort((a, b) => a._areaNum - b._areaNum);
  } else if (sortVal === 'size-desc') {
    filteredListings.sort((a, b) => b._areaNum - a._areaNum);
  } else if (sortVal === 'price-asc') {
    filteredListings.sort((a, b) => a._priceNum - b._priceNum);
  } else if (sortVal === 'price-desc') {
    filteredListings.sort((a, b) => b._priceNum - a._priceNum);
  }
  renderListings(filteredListings);
}

async function loadListings(){
  try{
    const res = await fetch('listings.json', {cache: "no-cache"});
    if(!res.ok) throw new Error('Failed to load listings.json');
    const data = await res.json();
    allListings = data;
    renderFilters(data);
    renderListings(data);
  }catch(err){
    listingsEl.innerHTML = `<p class="error">Unable to load listings. (${err.message})</p>`;
    console.error(err);
  }
}

function renderListings(data){
  if(!Array.isArray(data) || data.length === 0){
    listingsEl.innerHTML = `
      <div class="empty-listings-message">
        <span class="empty-icon">${svgEmptyState()}</span>
        <span>No listings available. <br>Please redefine your search criteria.</span>
      </div>
    `;
    return;
  }

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
  listingsEl.innerHTML = '';
  data.forEach(item => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-status-sticker">${escapeHtml(item.status || '')}</div>
      <img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.imageAlt || item.title)}" loading="lazy" />
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
          <button class="button" data-id="${escapeAttr(item.id)}">View details</button>
          <a class="secondary" href="mailto:${encodeURIComponent(item.contactEmail || 'contact@example.com')}">
            <span class="icon-attr">${svgContact()}</span> Email
          </a>
        </div>
      </div>
    `;
    listingsEl.appendChild(card);

    const btn = card.querySelector('button');
    btn.addEventListener('click', () => openModal(item));
  });
}

function openModal(item){
  // SVG for Title Deed (document icon)
  function svgTitleDeed() {
    return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><rect x="4" y="3" width="12" height="14" rx="2" stroke="#2b7a2b" stroke-width="2" fill="#fff"/><path d="M7 7h6M7 10h6M7 13h4" stroke="#2b7a2b" stroke-width="1.5"/></svg>`;
  }
  // SVG for green checkmark (no box)
  function svgTick(checked) {
    return checked
      ? `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><path d="M5 10.5l4 4 6-8" stroke="#2b7a2b" stroke-width="2.5" fill="none"/></svg>`
      : '';
  }
  // PDF export: dynamically create a visible print-friendly container
  function buildPdfContent() {
    // Inline SVG icon functions for PDF context
    function svgArea() {
      return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><rect x="3" y="3" width="14" height="14" rx="2" stroke="#2b7a2b" stroke-width="2" fill="none"/><path d="M3 9h14M9 3v14" stroke="#2b7a2b" stroke-width="1.5"/></svg>`;
    }
    function svgPrice() {
      return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><circle cx="10" cy="10" r="8" stroke="#2b7a2b" stroke-width="2" fill="none"/><text x="10" y="14" text-anchor="middle" font-size="10" fill="#2b7a2b" font-family="Arial">€</text></svg>`;
    }
    function svgLocation() {
      return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><path d="M10 18s6-6.5 6-10A6 6 0 1 0 4 8c0 3.5 6 10 6 10z" stroke="#2b7a2b" stroke-width="2" fill="none"/><circle cx="10" cy="8" r="2" stroke="#2b7a2b" stroke-width="1.5"/></svg>`;
    }
    function svgNotes() {
      // Notepad/memo icon
      return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><rect x="4" y="3" width="12" height="14" rx="2" stroke="#2b7a2b" stroke-width="2" fill="#fff"/><path d="M7 7h6M7 10h6M7 13h4" stroke="#2b7a2b" stroke-width="1.5"/><circle cx="7" cy="5" r="0.7" fill="#2b7a2b"/><circle cx="13" cy="5" r="0.7" fill="#2b7a2b"/></svg>`;
    }
    function svgPhone() {
      return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><rect x="5" y="2" width="10" height="16" rx="2" stroke="#2b7a2b" stroke-width="2" fill="none"/><circle cx="10" cy="15" r="1" fill="#2b7a2b"/></svg>`;
    }
    function svgContact() {
      return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><rect x="3" y="5" width="14" height="10" rx="2" stroke="#2b7a2b" stroke-width="2" fill="none"/><path d="M3 5l7 6 7-6" stroke="#2b7a2b" stroke-width="1.5" fill="none"/></svg>`;
    }
    const div = document.createElement('div');
    div.style.background = '#fff';
    div.style.color = '#222';
    div.style.fontSize = '1rem';
    div.style.width = '600px';
    div.style.margin = '0 auto';
    div.style.padding = '0';
    div.innerHTML = `
      <h3 style="margin-top:0">${escapeHtml(item.title || '—')}</h3>
      <img src="${escapeAttr(item.image || '')}" alt="${escapeAttr(item.imageAlt || item.title || '')}" style="width:100%;max-width:420px;display:block;margin:12px 0;" />
      <p style="margin:12px 0;">${escapeHtml(item.description || '—')}</p>
      <ul style="list-style:none;padding:0;margin:0 0 12px 0;">
        <li><span>${svgArea()}</span> ${escapeHtml(item.size || '—')}</li>
        <li><span>${svgPrice()}</span> ${escapeHtml(item.price || '—')}</li>
        <li><span>${svgLocation()}</span> ${escapeHtml(item.location || '—')}</li>
        <li><span>${svgNotes()}</span> ${escapeHtml(item.notes || '—')}</li>
        <li><span>${svgPhone()}</span> ${escapeHtml(item.contactPhone || '—')}</li>
        <li><span>${svgContact()}</span> ${escapeHtml(item.contactEmail || '—')}</li>
      </ul>
  ${(item.latitude && item.longitude) ? `<div style='margin:8px 0 0 0;'><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.latitude || '') + ',' + (item.longitude || ''))}" target="_blank" title="View on Google Maps" style="display:inline-block;vertical-align:middle;"><img src="https://maps.google.com/mapfiles/ms/icons/red-dot.png" alt="Google Maps" style="width:28px;height:28px;border:none;vertical-align:middle;" /></a></div>` : ''}
    `;
    document.body.appendChild(div);
    return div;
  }
  // Add SVG icon for contact info in modal
  const modalContactIcon = document.getElementById('modalContactIcon');
  if (modalContactIcon) {
    modalContactIcon.innerHTML = svgContact();
  }
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
    <li><span class="icon-attr" title="Email">${svgContact()}</span> <a href="mailto:${escapeHtml(item.contactEmail || 'contact@example.com')}">${escapeHtml(item.contactEmail || '—')}</a></li>
  `;
  // Attach PDF export event listener (ensure button exists)
  const pdfBtn = document.getElementById('downloadPdfBtn');
  if (pdfBtn && window.html2canvas && window.jspdf) {
    // Remove any previous click handler
    pdfBtn.replaceWith(pdfBtn.cloneNode(true));
    const newPdfBtn = document.getElementById('downloadPdfBtn');
    newPdfBtn.onclick = async function() {
      newPdfBtn.style.display = 'none';
      // Wait a tick to ensure button is hidden
      await new Promise(r => setTimeout(r, 100));
      const modalContent = document.querySelector('.modal-content');
      if (!modalContent) return;
      html2canvas(modalContent, { scale: 2, useCORS: true }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
        // Calculate image size to fit A4
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        let imgWidth = canvas.width;
        let imgHeight = canvas.height;
        // Scale to fit width
        if (imgWidth > pageWidth) {
          imgHeight = imgHeight * (pageWidth / imgWidth);
          imgWidth = pageWidth;
        }
        // If still too tall, scale to fit height
        if (imgHeight > pageHeight) {
          imgWidth = imgWidth * (pageHeight / imgHeight);
          imgHeight = pageHeight;
        }
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save((modalTitle.textContent || 'listing') + '.pdf');
        newPdfBtn.style.display = '';
      });
    };
  }
  // SVG for phone icon
  function svgPhone() {
    return `<svg width="1em" height="1em" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle"><rect x="5" y="2" width="10" height="16" rx="2" stroke="#2b7a2b" stroke-width="2" fill="none"/><circle cx="10" cy="15" r="1" fill="#2b7a2b"/></svg>`;
  }
  // Remove old contact line: modalEmail, modalPhone are no longer used in the modal body
  if(item.latitude && item.longitude){
  modalMap.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.latitude + ',' + item.longitude)}`;
  modalMap.innerHTML = `<img src="https://maps.google.com/mapfiles/ms/icons/red-dot.png" alt="Google Maps" style="width:28px;height:28px;border:none;vertical-align:middle;" />`;
  modalMap.style.display = 'inline-block';
  } else {
    modalMap.style.display = 'none';
  }

  modal.setAttribute('aria-hidden', 'false');
  // trap focus briefly (basic)
  modalClose.focus();
}

function closeModal(){
  modal.setAttribute('aria-hidden', 'true');
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
function escapeAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }

loadListings();

