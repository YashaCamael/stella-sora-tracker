/* --- 0. PWA SERVICE WORKER --- */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Failed', err));
    });
}

/* --- 1. CONFIG & DATA --- */
// Data is now loaded from gameData.js
const MAX_LEVEL = GameData.config.MAX_LEVEL;
const BASE_CAP_MAIN = GameData.config.BASE_CAP_MAIN;
const BASE_CAP_SUPP = GameData.config.BASE_CAP_SUPP;

// Use the global GameData object
const gameData = {
    characters: GameData.characters,
    potentials: GameData.potentials
};

/* --- 2. STATE --- */
let trackers = JSON.parse(localStorage.getItem('stella_trackers')) || [];
let currentTrackerId = null;

// Ensure DOM is loaded before running
document.addEventListener('DOMContentLoaded', () => {
    populateSelects();
    showDashboard();
});

/* --- 3. HELPER FUNCTIONS --- */
function getFaceImage(char) {
    // Updated to use GameData config
    const realUrl = `${GameData.config.ASSET_BASE_URL}${char.id}_face.png`;
    const placeholder = `https://placehold.co/100x100/333/fff?text=${char.name.substring(0, 2)}`;
    const onError = `this.onerror=null;this.src='${placeholder}';`;
    return { url: realUrl, onError: onError };
}

function getCharStats(tracker, charId, role) {
    const charTargets = tracker.targets.filter(t => t.charId === charId);
    const maxedItems = charTargets.filter(t => t.level === MAX_LEVEL).length;
    const baseCap = role === 'main' ? BASE_CAP_MAIN : BASE_CAP_SUPP;
    const currentCap = baseCap + maxedItems;
    const totalCost = charTargets.reduce((sum, t) => sum + t.level, 0);

    return {
        usedSlots: charTargets.length,
        cap: currentCap,
        totalCost: totalCost,
        isFull: charTargets.length >= currentCap
    };
}

function resolveDescription(potential, level) {
    if (!potential.values || !potential.descTemplate) return "No description.";
    const vals = potential.values[level - 1];
    let text = potential.descTemplate;
    if (vals) {
        vals.forEach((v, index) => {
            text = text.replace(`{${index}}`, `<span>${v}</span>`);
        });
    }
    return text;
}

function calculateRunStats(tracker) {
    let totals = {};
    tracker.targets.forEach(t => {
        const pot = gameData.potentials.find(p => p.id === t.potentialId);
        if (pot && pot.statData) {
            const statInfo = pot.statData[t.level - 1];
            if (statInfo) {
                totals[statInfo.type] = (totals[statInfo.type] || 0) + statInfo.value;
            }
        }
    });
    return totals;
}

function openStatsModal() {
    const tracker = trackers.find(t => t.id === currentTrackerId);
    if (!tracker) return;
    const totals = calculateRunStats(tracker);
    const modalBody = document.getElementById('statsModalBody');

    if (Object.keys(totals).length === 0) {
        modalBody.innerHTML = '<p class="text-center text-muted">No stats active yet.</p>';
    } else {
        let html = '';
        Object.keys(totals).sort().forEach(key => {
            html += `
                <div class="stat-row">
                    <span class="text-secondary">${key}</span>
                    <span class="stat-val">+${totals[key]}%</span>
                </div>`;
        });
        modalBody.innerHTML = html;
    }
    const modal = new bootstrap.Modal(document.getElementById('statsModal'));
    modal.show();
}

/* --- 4. VIEW LOGIC --- */
function switchView(viewName) {
    ['viewDashboard', 'viewSetup', 'viewTracker'].forEach(id => {
        document.getElementById(id).classList.add('d-none');
    });
    document.getElementById(viewName).classList.remove('d-none');
    updateNavbar(viewName);

    // FIXED: Only scroll to top if we are NOT in the tracker view (prevents jump on reload)
    if (viewName !== 'viewTracker') {
        window.scrollTo(0, 0);
    }
}

function updateNavbar(viewName) {
    const navActions = document.getElementById('navActions');
    navActions.innerHTML = '';

    if (viewName === 'viewDashboard') {
        navActions.innerHTML = `
            <button class="btn btn-outline-info me-2" onclick="triggerImport()">
                <i class="fa-solid fa-file-import me-2"></i><span class="d-none d-sm-inline">Import</span>
            </button>
            <button class="btn btn-primary" onclick="showCreateForm()">
                <i class="fa-solid fa-plus me-2"></i><span class="d-none d-sm-inline">New</span>
            </button>`;
    } else if (viewName === 'viewTracker') {
        navActions.innerHTML = `
            <button class="btn btn-success me-2" onclick="openStatsModal()">
                <i class="fa-solid fa-chart-simple"></i>
            </button>
            <button class="btn btn-outline-light" onclick="showDashboard()">
                <i class="fa-solid fa-arrow-left"></i>
            </button>`;
    }
}

/* --- 5. TRACKER RENDER --- */
// FIXED: Added 'preserveScroll' parameter
function loadTracker(id, preserveScroll = false) {
    currentTrackerId = id;
    const tracker = trackers.find(t => t.id === id);
    if (!tracker) return showDashboard();

    // Save scroll positions before clearing
    let scrollMap = {};
    let winScroll = 0;
    if (preserveScroll) {
        winScroll = window.scrollY;
        document.querySelectorAll('.target-list-container').forEach(el => {
            scrollMap[el.id] = el.scrollTop;
        });
    }

    const container = document.getElementById('runColumns');
    container.innerHTML = '';
    renderColumn(container, tracker.main, 'main', tracker);
    renderColumn(container, tracker.sup1, 'support', tracker);
    renderColumn(container, tracker.sup2, 'support', tracker);

    switchView('viewTracker');

    // Restore scroll positions
    if (preserveScroll) {
        setTimeout(() => {
            window.scrollTo(0, winScroll);
            Object.keys(scrollMap).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.scrollTop = scrollMap[id];
            });
        }, 0);
    }
}

function renderColumn(container, charId, role, tracker) {
    const char = gameData.characters.find(c => c.id === charId);
    const availablePots = gameData.potentials.filter(p => p.charId === charId && p.type === role);

    const faceData = getFaceImage(char);
    const stats = getCharStats(tracker, charId, role);

    const col = document.createElement('div');
    col.className = 'col-lg-4 col-md-12';
    const badgeClass = role === 'main' ? 'bg-warning text-dark' : 'bg-info text-dark';

    const searchId = `search-${charId}-${role}`;

    // Added unique ID for stats bar to update it easily
    const statsId = `stats-bar-${charId}-${role}`;

    col.innerHTML = `
        <div class="card bg-dark border-secondary h-100">
            <div class="card-header border-secondary d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center gap-2">
                    <img src="${faceData.url}" onerror="${faceData.onError}" class="rounded-circle border border-secondary" style="width: 40px; height: 40px; object-fit: cover;">
                    <h5 class="mb-0 text-white">${char.name}</h5>
                </div>
                <span class="badge ${badgeClass}">${role.toUpperCase()}</span>
            </div>
            <div class="card-body d-flex flex-column p-2">
                <div class="stats-bar" id="${statsId}">
                    ${renderStatsBarContent(stats)}
                </div>

                <div class="mb-2">
                    <input type="text" id="${searchId}" class="form-control form-control-sm pool-search" placeholder="Search..." onkeyup="filterPotentials('${charId}', '${role}')">
                </div>

                <div id="pools-${charId}-${role}"></div>
                <div class="border-bottom border-secondary my-2"></div>
                
                <small class="text-muted text-uppercase fw-bold mb-1 ps-1" style="font-size:0.7rem;">Target Build</small>
                <div class="target-list-container" id="target-${charId}-${role}"></div>
            </div>
        </div>
    `;
    container.appendChild(col);

    const poolsContainer = col.querySelector(`#pools-${charId}-${role}`);
    const roleTitle = role === 'main' ? 'Main' : 'Support';
    const groups = [
        { title: `${roleTitle} Build 1`, data: availablePots.slice(0, 6) },
        { title: `${roleTitle} Build 2`, data: availablePots.slice(6, 12) },
        { title: `General`, data: availablePots.slice(12, 18) },
        { title: null, data: availablePots.slice(18) }
    ];

    groups.forEach(group => {
        if (group.data.length === 0) return;
        const section = document.createElement('div');
        section.className = 'pool-section';
        if (group.title) section.innerHTML = `<div class="pool-section-title">${group.title}</div>`;

        const row = document.createElement('div');
        row.className = 'pool-row';

        group.data.forEach(pot => {
            const isSelected = tracker.targets.find(t => t.potentialId === pot.id);
            const placeholder = `https://placehold.co/100x150/${pot.color}/ffffff?text=${pot.displayNum}`;
            const onError = `this.onerror=null;this.src='${placeholder}';`;

            let classes = `pool-card ${pot.rarity}`;
            if (isSelected) classes += ` selected`;

            const card = document.createElement('div');
            card.className = classes;
            card.title = pot.name;

            card.dataset.name = pot.name.toLowerCase();
            card.dataset.desc = pot.descTemplate.toLowerCase();

            card.innerHTML = `<img src="${pot.imgUrl}" onerror="${onError}"><div class="pool-overlay">#${pot.displayNum}</div>`;

            card.onclick = () => {
                if (!isSelected) {
                    if (stats.isFull) {
                        Swal.fire({ icon: 'warning', title: 'Capacity Reached', timer: 2000, showConfirmButton: false });
                    } else {
                        addPotential(tracker.id, pot.id, charId);
                    }
                }
            };
            row.appendChild(card);
        });
        section.appendChild(row);
        poolsContainer.appendChild(section);
    });

    const targetContainer = col.querySelector(`#target-${charId}-${role}`);
    const charTargets = tracker.targets.filter(t => t.charId === charId);

    if (charTargets.length === 0) {
        targetContainer.innerHTML = '<div class="text-center text-muted fst-italic py-4" style="font-size:0.8rem">Click cards above to add</div>';
    }

    charTargets.forEach(t => {
        const pot = gameData.potentials.find(p => p.id === t.potentialId);
        const placeholder = `https://placehold.co/50x50/${pot.color}/ffffff?text=${pot.displayNum}`;
        const onError = `this.onerror=null;this.src='${placeholder}';`;

        const isMaxed = t.level === MAX_LEVEL;
        const borderClass = isMaxed ? "border-warning border-2" : "border-0";
        const descHtml = resolveDescription(pot, t.level);

        const item = document.createElement('div');
        item.id = `target-item-${pot.id}`; // Add ID for direct update
        item.className = `card bg-secondary bg-opacity-10 ${borderClass} p-2 mb-2`;
        item.innerHTML = `
            <div class="d-flex align-items-center gap-2 mb-1">
                <img src="${pot.imgUrl}" onerror="${onError}" width="35" height="35" class="rounded">
                <div class="flex-grow-1" style="line-height:1.1;">
                    <div class="text-white fw-bold" style="font-size:0.8rem;">${pot.name}</div>
                    <span id="badge-${pot.id}">${isMaxed ? '<span class="badge bg-warning text-dark" style="font-size:0.6rem">MAX</span>' : ''}</span>
                </div>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary py-0" id="btn-minus-${pot.id}" onclick="updateLevel('${tracker.id}', '${pot.id}', -1, '${charId}', '${role}')">-</button>
                    <button class="btn btn-dark disabled text-white fw-bold py-0" style="width:25px; font-size:0.8rem;" id="lvl-display-${pot.id}">${t.level}</button>
                    <button class="btn btn-outline-secondary py-0" id="btn-plus-${pot.id}" onclick="updateLevel('${tracker.id}', '${pot.id}', 1, '${charId}', '${role}')" ${isMaxed ? 'disabled' : ''}>+</button>
                </div>
                <button class="btn btn-sm text-danger py-0 px-1" onclick="removePotential('${tracker.id}', '${pot.id}')"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="desc-text" id="desc-${pot.id}">${descHtml}</div>
        `;
        targetContainer.appendChild(item);
    });
}

function renderStatsBarContent(stats) {
    return `
        <div class="stat-item text-warning" title="Slots Used / Max Capacity">
            <i class="fa-solid fa-layer-group"></i> 
            Slots: <b>${stats.usedSlots} / ${stats.cap}</b>
        </div>
        <div class="stat-item text-info" title="Total Potential Cost">
            <i class="fa-solid fa-bolt"></i> 
            Cost: <b>${stats.totalCost}</b>
        </div>
    `;
}

/* --- 6. ACTIONS --- */
function filterPotentials(charId, role) {
    const searchInput = document.getElementById(`search-${charId}-${role}`);
    const filterText = searchInput.value.toLowerCase();
    const container = document.getElementById(`pools-${charId}-${role}`);

    const cards = container.querySelectorAll('.pool-card');
    cards.forEach(card => {
        const name = card.dataset.name;
        const desc = card.dataset.desc;
        if (name.includes(filterText) || desc.includes(filterText)) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });

    const sections = container.querySelectorAll('.pool-section');
    sections.forEach(section => {
        const visibleCards = section.querySelectorAll('.pool-card:not(.hidden)');
        if (visibleCards.length === 0) {
            section.classList.add('hidden');
        } else {
            section.classList.remove('hidden');
        }
    });
}

function addPotential(trackerId, potId, charId) {
    const tracker = trackers.find(t => t.id === trackerId);
    tracker.targets.push({ potentialId: potId, charId: charId, level: 1 });
    saveData();
    loadTracker(trackerId, true); // preserve scroll
}

// FIXED: Unified update logic (uses loadTracker with preserveScroll)
function updateLevel(trackerId, potId, change, charId, role) {
    const tracker = trackers.find(t => t.id === trackerId);
    const target = tracker.targets.find(t => t.potentialId === potId);

    if (target) {
        let newLevel = target.level + change;
        if (newLevel < 1) newLevel = 1;
        if (newLevel > MAX_LEVEL) newLevel = MAX_LEVEL;

        if (target.level !== newLevel) {
            target.level = newLevel;
            saveData();

            // --- SMART UPDATE (No Re-render) ---
            const pot = gameData.potentials.find(p => p.id === potId);
            const isMaxed = newLevel === MAX_LEVEL;

            // 1. Update Display Number
            const lvlDisp = document.getElementById(`lvl-display-${potId}`);
            if (lvlDisp) lvlDisp.textContent = newLevel;

            // 2. Update Badge & Border
            const badgeContainer = document.getElementById(`badge-${potId}`);
            const itemCard = document.getElementById(`target-item-${potId}`);

            if (isMaxed) {
                if (badgeContainer) badgeContainer.innerHTML = '<span class="badge bg-warning text-dark" style="font-size:0.6rem">MAX</span>';
                if (itemCard) {
                    itemCard.classList.remove('border-0');
                    itemCard.classList.add('border-warning', 'border-2');
                }
            } else {
                if (badgeContainer) badgeContainer.innerHTML = '';
                if (itemCard) {
                    itemCard.classList.remove('border-warning', 'border-2');
                    itemCard.classList.add('border-0');
                }
            }

            // 3. Update Description
            const descContainer = document.getElementById(`desc-${potId}`);
            if (descContainer) descContainer.innerHTML = resolveDescription(pot, newLevel);

            // 4. Update Buttons
            const btnPlus = document.getElementById(`btn-plus-${potId}`);
            if (btnPlus) btnPlus.disabled = isMaxed;

            // 5. Update Stats Bar for this Char/Role
            const stats = getCharStats(tracker, charId, role);
            const statsBar = document.getElementById(`stats-bar-${charId}-${role}`);
            if (statsBar) statsBar.innerHTML = renderStatsBarContent(stats);
        }
    }
}

function removePotential(trackerId, potId) {
    const tracker = trackers.find(t => t.id === trackerId);
    tracker.targets = tracker.targets.filter(t => t.potentialId !== potId);
    saveData();
    loadTracker(trackerId, true); // preserve scroll
}

/* --- 7. UTILS & DASHBOARD --- */
function populateSelects() {
    const selects = ['selectMain', 'selectSup1', 'selectSup2'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        el.innerHTML = '';
        gameData.characters.forEach(char => {
            const opt = document.createElement('option');
            opt.value = char.id;
            opt.textContent = char.name;
            el.appendChild(opt);
        });
    });
}

function showDashboard() {
    currentTrackerId = null;
    const list = document.getElementById('trackerList');
    if (!list) return; // Guard clause if view not loaded
    list.innerHTML = '';
    if (trackers.length === 0) {
        list.innerHTML = `<div class="col-12 text-center mt-5 text-muted"><h4>No runs found</h4><p>Start a new journey.</p></div>`;
    }
    trackers.forEach(t => {
        const mainChar = gameData.characters.find(c => c.id === t.main);
        const sup1 = gameData.characters.find(c => c.id === t.sup1);
        const sup2 = gameData.characters.find(c => c.id === t.sup2);

        const mainImg = getFaceImage(mainChar);
        const sup1Img = getFaceImage(sup1);
        const sup2Img = getFaceImage(sup2);

        const col = document.createElement('div');
        col.className = 'col-lg-4 col-md-6';
        col.innerHTML = `
            <div class="card run-card p-3 h-100">
                <div class="run-card-actions">
                    <button class="btn btn-sm btn-dark border-secondary" onclick="exportTracker('${t.id}')"><i class="fa-solid fa-download text-info"></i></button>
                    <button class="btn btn-sm btn-dark border-secondary" onclick="deleteTracker('${t.id}')"><i class="fa-solid fa-trash text-danger"></i></button>
                </div>
                <div class="cursor-pointer" onclick="loadTracker('${t.id}')">
                    <h5 class="text-white mb-3 pe-5 text-truncate">${t.name}</h5>
                    <div class="d-flex gap-2 mb-2">
                        <img class="char-icon main" src="${mainImg.url}" onerror="${mainImg.onError}">
                        <img class="char-icon supp" src="${sup1Img.url}" onerror="${sup1Img.onError}">
                        <img class="char-icon supp" src="${sup2Img.url}" onerror="${sup2Img.onError}">
                    </div>
                </div>
            </div>
        `;
        list.appendChild(col);
    });
    switchView('viewDashboard');
}

function exportTracker(id) {
    const tracker = trackers.find(t => t.id === id);
    const exportData = {
        id: tracker.id, name: tracker.name,
        main: tracker.main, sup1: tracker.sup1, sup2: tracker.sup2,
        targets: tracker.targets.map(t => ({ pid: t.potentialId, cid: t.charId, lvl: t.level }))
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `stella_run_${tracker.name}.json`;
    a.click();
}

function triggerImport() { document.getElementById('importFileInput').click(); }

function handleFileImport(input) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imp = JSON.parse(e.target.result);
            trackers.push({
                id: 'imp_' + Date.now(), name: imp.name + " (Imp)",
                main: imp.main, sup1: imp.sup1, sup2: imp.sup2,
                targets: imp.targets.map(t => ({ potentialId: t.pid, charId: t.cid, level: t.lvl }))
            });
            saveData(); showDashboard();
        } catch (err) { Swal.fire('Error', 'Invalid JSON', 'error'); }
    };
    if (file) reader.readAsText(file);
    input.value = '';
}

function showCreateForm() { document.getElementById('runName').value = `Run #${trackers.length + 1}`; switchView('viewSetup'); }

function createTracker() {
    trackers.push({
        id: Date.now().toString(),
        name: document.getElementById('runName').value || 'Untitled',
        main: document.getElementById('selectMain').value,
        sup1: document.getElementById('selectSup1').value,
        sup2: document.getElementById('selectSup2').value,
        targets: []
    });
    saveData(); loadTracker(trackers[trackers.length - 1].id);
}

function deleteTracker(id) {
    event.stopPropagation();
    Swal.fire({ title: 'Delete?', showCancelButton: true, confirmButtonText: 'Yes' }).then((r) => {
        if (r.isConfirmed) { trackers = trackers.filter(t => t.id !== id); saveData(); showDashboard(); }
    });
}
function saveData() { localStorage.setItem('stella_trackers', JSON.stringify(trackers)); }

// Expose functions to global scope for HTML event handlers
window.triggerImport = triggerImport;
window.handleFileImport = handleFileImport;
window.showCreateForm = showCreateForm;
window.createTracker = createTracker;
window.showDashboard = showDashboard;
window.exportTracker = exportTracker;
window.deleteTracker = deleteTracker;
window.loadTracker = loadTracker;
window.openStatsModal = openStatsModal;
window.filterPotentials = filterPotentials;
window.updateLevel = updateLevel;
window.removePotential = removePotential;
