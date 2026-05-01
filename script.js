const API_BASE = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';

let rowCriteria = [];
let colCriteria = [];
let attemptsRemaining = 5;

const attributes   = ['DARK','LIGHT','EARTH','WATER','FIRE','WIND','DIVINE'];
const races        = ['Warrior','Spellcaster','Fairy','Fiend','Zombie','Machine','Aqua','Pyro','Rock','Winged Beast','Plant','Insect','Thunder','Dragon','Beast','Beast-Warrior','Dinosaur','Fish','Sea Serpent','Reptile','Psychic','Wyrm','Cyberse'];
const types        = ['Normal Monster','Effect Monster','Synchro Monster','XYZ Monster','Link Monster','Fusion Monster'];

/* ──────────────── CRITERIA ──────────────── */
function generateCriteria() {
    const options = [
        { type: 'attribute', values: [attributes[Math.floor(Math.random() * attributes.length)]] },
        { type: 'race',      values: [races[Math.floor(Math.random() * races.length)]] },
        { type: 'level',     values: [[1,3],[4,6],[7,9],[10,12]][Math.floor(Math.random() * 4)] },
        { type: 'type',      values: [types[Math.floor(Math.random() * types.length)]] },
        { type: 'atk',       values: [[0,1500],[1501,3500],[3501,5000]][Math.floor(Math.random() * 3)] },
        { type: 'def',       values: [[0,1500],[1501,3500],[3501,5000]][Math.floor(Math.random() * 3)] },
    ];
    const shuffled = shuffle(options);
    rowCriteria = shuffled.slice(0, 3);
    colCriteria = shuffled.slice(3, 6);
}

function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getCriteriaLabel(c) {
    if (c.type === 'level') return `LV ${c.values[0]}–${c.values[1]}`;
    if (c.type === 'atk')   return `ATK ${c.values[0]}–${c.values[1]}`;
    if (c.type === 'def')   return `DEF ${c.values[0]}–${c.values[1]}`;
    return c.values[0];
}

function displayCriteria() {
    ['row1-label','row2-label','row3-label'].forEach((id, i) => {
        document.getElementById(id).textContent = getCriteriaLabel(rowCriteria[i]);
    });
    ['col1-label','col2-label','col3-label'].forEach((id, i) => {
        document.getElementById(id).textContent = getCriteriaLabel(colCriteria[i]);
    });
}

/* ──────────────── MATCHING ──────────────── */
function getCardType(card) {
    for (const t of ['Normal Monster','Effect Monster','Synchro Monster','XYZ Monster','Link Monster','Fusion Monster']) {
        const key = t.replace(' Monster','');
        if (card.type.includes(key) || card.type.includes(t)) return t;
    }
    return 'Other';
}

function getLevel(card) {
    if (card.type?.includes('Link') && card.linkval != null) return card.linkval;
    return card.level ?? null;
}

function check(card, c) {
    if (c.type === 'attribute') return card.attribute === c.values[0];
    if (c.type === 'race')      return card.race === c.values[0];
    if (c.type === 'type')      return getCardType(card) === c.values[0];
    if (c.type === 'level') {
        const lv = getLevel(card);
        return lv != null && lv >= c.values[0] && lv <= c.values[1];
    }
    if (c.type === 'atk') return card.atk != null && card.atk >= c.values[0] && card.atk <= c.values[1];
    if (c.type === 'def') return card.def != null && card.def >= c.values[0] && card.def <= c.values[1];
    return false;
}

function matchesCriteria(card, row, col) {
    return check(card, row) && check(card, col);
}

/* ──────────────── CARD DB ──────────────── */
let allMonsterCards = [];

function setLoader(pct, msg) {
    document.getElementById('loader-bar').style.width = pct + '%';
    if (msg) document.getElementById('loader-msg').textContent = msg;
}

async function loadAllMonsterCards() {
    if (allMonsterCards.length > 0) return;

    setLoader(5, 'Fetching card count...');
    const meta = await fetch(`${API_BASE}?num=1&offset=0`).then(r => r.json());
    const total = meta.meta.total_rows;

    const batchSize = 500;
    const batches = Math.ceil(total / batchSize);
    const results = [];

    for (let i = 0; i < batches; i++) {
        const pct = 10 + Math.round((i / batches) * 80);
        setLoader(pct, `Loading cards… (${Math.min((i+1)*batchSize, total)}/${total})`);
        try {
            const d = await fetch(`${API_BASE}?num=${batchSize}&offset=${i * batchSize}`).then(r => r.json());
            results.push(...(d.data || []));
        } catch(e) {}
    }

    allMonsterCards = results.filter(c => c.type?.includes('Monster') && c.name);
    setLoader(100, `${allMonsterCards.length} monsters loaded!`);
}

async function hasSolution(row, col) {
    return allMonsterCards.some(c => matchesCriteria(c, row, col));
}

async function generateValidPuzzle(maxTries = 60) {
    for (let i = 0; i < maxTries; i++) {
        generateCriteria();
        let valid = true;
        outer:
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (!await hasSolution(rowCriteria[r], colCriteria[c])) {
                    valid = false; break outer;
                }
            }
        }
        if (valid) return true;
    }
    return false;
}

/* ──────────────── MODAL ──────────────── */
const selectedCards = {};
let currentRow = null, currentCol = null;

function openModal(row, col) {
    currentRow = row;
    currentCol = col;
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('modal-search');
    document.getElementById('modal-results').innerHTML = '';
    input.value = '';
    modal.classList.add('open');
    setTimeout(() => input.focus(), 50);
}

function closeModal() {
    document.getElementById('search-modal').classList.remove('open');
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('search-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('search-modal')) closeModal();
});

document.getElementById('modal-search').addEventListener('input', async e => {
    const q = e.target.value.trim();
    const container = document.getElementById('modal-results');
    if (q.length < 2) { container.innerHTML = ''; return; }

    const term = q.toLowerCase();
    const matches = allMonsterCards.filter(c => c.name.toLowerCase().includes(term)).slice(0, 40);

    container.innerHTML = '';
    if (!matches.length) {
        container.innerHTML = '<div class="search-result-item" style="color:#7a9ab8;cursor:default">No cards found</div>';
        return;
    }

    matches.forEach(card => {
        const item = document.createElement('div');
        item.className = 'search-result-item';

        if (card.card_images?.[0]) {
            const img = document.createElement('img');
            img.src = card.card_images[0].image_url_cropped || card.card_images[0].image_url;
            img.alt = card.name;
            img.className = 'search-result-image';
            item.appendChild(img);
        }

        const name = document.createElement('div');
        name.className = 'search-result-name';
        name.textContent = card.name;
        item.appendChild(name);

        item.addEventListener('click', () => selectCard(currentRow, currentCol, card));
        container.appendChild(item);
    });
});

function selectCard(row, col, card) {
    const key = `${row}-${col}`;
    selectedCards[key] = card;

    const cell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
    const span = cell.querySelector('.cell-content');
    span.innerHTML = '';

    if (card.card_images?.[0]) {
        const img = document.createElement('img');
        img.src = card.card_images[0].image_url_cropped || card.card_images[0].image_url;
        img.alt = card.name;
        img.className = 'cell-image';
        span.appendChild(img);
    } else {
        const t = document.createElement('span');
        t.className = 'cell-text';
        t.textContent = card.name;
        span.appendChild(t);
    }

    cell.classList.remove('correct','wrong','close');
    closeModal();
}

/* ──────────────── SUBMIT ──────────────── */
document.getElementById('submit-guess').addEventListener('click', async () => {
    const fb = document.getElementById('feedback-area');

    // check all filled
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        if (!selectedCards[`${r}-${c}`]) {
            fb.textContent = '⚠️ Fill all 9 cells first!';
            fb.className = '';
            return;
        }
    }

    document.getElementById('submit-guess').disabled = true;
    fb.textContent = 'Checking…';
    fb.className = '';

    let correct = 0;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const card = selectedCards[`${r}-${c}`];
            const ok = matchesCriteria(card, rowCriteria[r], colCriteria[c]);
            const cell = document.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
            cell.classList.remove('correct','wrong','close');
            cell.classList.add(ok ? 'correct' : 'wrong');
            if (ok) correct++;
        }
    }

    if (correct === 9) {
        fb.textContent = '🎉 Perfect! All 9 correct!';
        fb.className = 'win';
        return;
    }

    attemptsRemaining--;

    if (attemptsRemaining <= 0) {
        fb.textContent = `❌ Game Over! ${correct}/9 correct.`;
        fb.className = 'lose';
    } else {
        fb.textContent = `${correct}/9 correct — ${attemptsRemaining} attempt${attemptsRemaining > 1 ? 's' : ''} left`;
        fb.className = '';
        document.getElementById('submit-guess').disabled = false;
    }
});

/* ──────────────── INIT ──────────────── */
async function init() {
    await loadAllMonsterCards();

    setLoader(95, 'Generating puzzle...');
    const ok = await generateValidPuzzle();

    document.getElementById('loading-overlay').classList.add('hidden');

    if (!ok) {
        document.getElementById('feedback-area').textContent = '❌ Could not generate puzzle. Refresh to retry.';
        return;
    }

    displayCriteria();

    document.querySelectorAll('.grid-cell').forEach(cell => {
        cell.addEventListener('click', () => openModal(+cell.dataset.row, +cell.dataset.col));
    });

    document.getElementById('feedback-area').textContent = `${attemptsRemaining} attempts remaining`;
    document.getElementById('submit-guess').disabled = false;
}

init();