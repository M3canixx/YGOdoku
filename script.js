const API_BASE = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';

let dailyCard;
let rowCriteria = [];
let colCriteria = [];
let attemptsRemaining = 3;

const attributes = ['DARK', 'LIGHT', 'EARTH', 'WATER', 'FIRE', 'WIND', 'DIVINE'];
const races = ['Warrior', 'Spellcaster', 'Fairy', 'Fiend', 'Zombie', 'Machine', 'Aqua', 'Pyro', 'Rock', 'Winged Beast', 'Plant', 'Insect', 'Thunder', 'Dragon', 'Beast', 'Beast-Warrior', 'Dinosaur', 'Fish', 'Sea Serpent', 'Reptile', 'Psychic', 'Divine-Beast', 'Creator-God', 'Wyrm', 'Cyberse'];
const types = ['Normal Monster', 'Effect Monster', 'Synchro Monster', 'XYZ Monster', 'Link Monster', 'Fusion Monster'];
const releaseYearRanges = [[1996,2000], [2001,2005], [2006,2010], [2011,2015], [2016,2020], [2021,2024]];

async function getTotalCards() {
    try {
        const response = await fetch(`${API_BASE}?num=1&offset=0`);
        const data = await response.json();
        return data.meta.total_rows;
    } catch (error) {
        return 12000;
    }
}

function getDailyIndex(total) {
    const today = new Date().toDateString();
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
        hash = ((hash << 5) - hash) + today.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash) % total;
}

function generateCriteria() {
    const Options = [
        { type: 'attribute', values: [attributes[Math.floor(Math.random() * attributes.length)], 'Attribute'] },
        { type: 'race', values: [races[Math.floor(Math.random() * races.length)], 'Race'] },
        { type: 'level', values: [[1,3], [4,6], [7,12]][Math.floor(Math.random() * 3)].concat(['Level']) },
        { type: 'year', values: releaseYearRanges[Math.floor(Math.random() * releaseYearRanges.length)].concat(['Year'])},
        { type: 'type', values: [types[Math.floor(Math.random() * types.length)], 'Type'] },
        { type: 'atk', values: [[0,1000], [1001,2500], [2501,4000]][Math.floor(Math.random() * 3)].concat(['ATK']) },
        { type: 'def', values: [[0,1000], [1001,2500], [2501,4000]][Math.floor(Math.random() * 3)].concat(['DEF']) }
    ];

    const shuffled = shuffleArray(Options);
    rowCriteria = shuffled.slice(0, 3);
    colCriteria = shuffled.slice(3, 6);
}

function shuffleArray(array) {
    const result = array.slice();
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function matchesCriteria(card, rowCrit, colCrit) {
    return checkCardAgainstCrit(card, rowCrit) && checkCardAgainstCrit(card, colCrit);
}

function checkCardAgainstCrit(card, crit) {
    if (crit.type === 'attribute' && card.attribute !== crit.values[0]) return false;
    if (crit.type === 'race' && card.race !== crit.values[0]) return false;
    if (crit.type === 'level') {
        const cardLevel = getCardEffectiveLevel(card);
        if (cardLevel === null || cardLevel < crit.values[0] || cardLevel > crit.values[1]) return false;
    }
    if (crit.type === 'year' && !cardMatchesYear(card, crit.values[0], crit.values[1])) return false;
    if (crit.type === 'type') {
        const cardType = getCardType(card);
        if (cardType !== crit.values[0]) return false;
    }
    if (crit.type === 'atk' && (card.atk < crit.values[0] || card.atk > crit.values[1])) return false;
    if (crit.type === 'def' && card.def !== undefined && (card.def < crit.values[0] || card.def > crit.values[1])) return false;
    return true;
}

function getCardType(card) {
    if (card.type.includes('Normal Monster')) return 'Normal Monster';
    if (card.type.includes('Effect Monster')) return 'Effect Monster';
    if (card.type.includes('Synchro')) return 'Synchro Monster';
    if (card.type.includes('XYZ')) return 'XYZ Monster';
    if (card.type.includes('Link')) return 'Link Monster';
    if (card.type.includes('Fusion')) return 'Fusion Monster';
    return 'Other';
}

function getCardEffectiveLevel(card) {
    if (card.type && card.type.includes('Link Monster') && card.linkval !== undefined && card.linkval !== null) {
        return card.linkval;
    }
    return card.level !== undefined && card.level !== null ? card.level : null;
}

function cardMatchesYear(card, fromYear, toYear) {
    const releaseYear = getCardReleaseYear(card);
    if (!releaseYear) return false;
    return releaseYear >= fromYear && releaseYear <= toYear;
}

function getCardReleaseYear(card) {
    if (!card.card_sets || !Array.isArray(card.card_sets)) return null;
    for (const set of card.card_sets) {
        if (!set.set_name) continue;
        const match = set.set_name.match(/(19|20)\d{2}/);
        if (match) {
            return parseInt(match[0], 10);
        }
    }
    return null;
}

async function fetchCardsForCriteria(rowCrit, colCrit) {
    const params = buildCriteriaQuery(rowCrit, colCrit);

    try {
        const response = await fetch(`${API_BASE}${params}`);
        const data = await response.json();
        return data.data.filter(card => {
            if (!card.type.includes('Monster')) return false;
            return matchesCriteria(card, rowCrit, colCrit);
        }).slice(0, 10);
    } catch (error) {
        console.error('Error fetching cards:', error);
        return [];
    }
}

function buildCriteriaQuery(rowCrit, colCrit) {
    const params = [];
    if (rowCrit.type === 'attribute') params.push(`attribute=${encodeURIComponent(rowCrit.values[0].toLowerCase())}`);
    if (rowCrit.type === 'race') params.push(`race=${encodeURIComponent(rowCrit.values[0].toLowerCase())}`);
    if (colCrit.type === 'attribute') params.push(`attribute=${encodeURIComponent(colCrit.values[0].toLowerCase())}`);
    if (colCrit.type === 'race') params.push(`race=${encodeURIComponent(colCrit.values[0].toLowerCase())}`);
    return params.length ? `?${params.join('&')}&num=100&offset=0` : '?num=200&offset=0';
}

async function validatePuzzle() {
    // Check if all 9 cells have at least one valid card
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const cards = await fetchCardsForCriteria(rowCriteria[row], colCriteria[col]);
            if (cards.length === 0) {
                return false; // No valid cards for this cell
            }
        }
    }
    return true;
}

async function generateValidPuzzle() {
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
        generateCriteria();
        const isValid = await validatePuzzle();
        
        if (isValid) {
            console.log(`✓ Valid puzzle generated on attempt ${attempts + 1}`);
            return true;
        }
        
        console.log(`✗ Invalid puzzle on attempt ${attempts + 1}, trying again...`);
        attempts++;
    }
    
    console.error('Could not generate a valid puzzle after max attempts');
    return false;
}

async function populateSelects() {
    // Create search result containers for each cell
    const searches = document.querySelectorAll('.grid-search');
    searches.forEach(search => {
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results';
        search.parentElement.appendChild(resultsContainer);
        
        // Add event listener for search input
        search.addEventListener('input', (e) => handleSearch(e, search));
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('grid-search')) {
            document.querySelectorAll('.search-results').forEach(results => {
                results.classList.remove('show');
            });
        }
    });
}

async function handleSearch(event, searchInput) {
    const query = event.target.value.trim();
    const row = parseInt(searchInput.dataset.row);
    const col = parseInt(searchInput.dataset.col);
    const resultsContainer = searchInput.parentElement.querySelector('.search-results');

    if (query.length < 2) {
        resultsContainer.classList.remove('show');
        return;
    }

    // Search ALL monster cards (no criteria filtering here)
    const cards = await searchCardsForCell(query, row, col);

    // Display results
    resultsContainer.innerHTML = '';
    if (cards.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item">No monsters found</div>';
    }

    cards.forEach(card => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.textContent = card.name;
        item.data = card;

        item.addEventListener('click', () => {
            searchInput.value = card.name;
            searchInput.dataset.cardId = card.id;
            resultsContainer.classList.remove('show');
        });

        resultsContainer.appendChild(item);
    });

    resultsContainer.classList.add('show');
}

let allMonsterCards = []; // Cache for all monster cards

async function loadAllMonsterCards() {
    if (allMonsterCards.length > 0) return allMonsterCards; // Already loaded

    try {
        // Load MANY MORE cards to get comprehensive database
        const batchSize = 500;
        const batches = 25; // Load 12,500 cards total for near-complete coverage
        let allCards = [];

        console.log('Loading comprehensive monster cards database...');

        for (let i = 0; i < batches; i++) {
            const response = await fetch(`${API_BASE}?num=${batchSize}&offset=${i * batchSize}`);
            if (!response.ok) {
                console.warn(`Failed to load batch ${i}, continuing...`);
                continue;
            }

            const data = await response.json();
            if (data && data.data) {
                allCards = allCards.concat(data.data);
            }

            // Progress update every 5 batches
            if ((i + 1) % 5 === 0) {
                console.log(`Loaded ${allCards.length} cards so far...`);
            }
        }

        // Filter to only monster cards
        allMonsterCards = allCards.filter(card => {
            return card.type && card.type.includes('Monster') && card.name;
        });

        console.log(`✅ Loaded ${allMonsterCards.length} monster cards for search (comprehensive database)`);
        return allMonsterCards;
    } catch (error) {
        console.error('Error loading monster cards:', error);
        return [];
    }
}

async function searchCardsForCell(query, row, col) {
    // Load all monster cards if not already loaded
    const cards = await loadAllMonsterCards();

    // Search among ALL monster cards using fuzzy matching
    // NO criteria filtering - show ALL monsters that match the search
    const searchTerm = query.toLowerCase();
    const matchingCards = cards.filter(card => {
        return card.name.toLowerCase().includes(searchTerm);
    });

    console.log(`Found ${matchingCards.length} monsters matching "${query}"`);

    return matchingCards.slice(0, 50); // Return top 50 matches for comprehensive search
}

async function fetchCardById(cardId) {
    try {
        const response = await fetch(`${API_BASE}?id=${cardId}`);
        const data = await response.json();
        return data.data[0] || null;
    } catch (error) {
        console.error('Error fetching card by ID:', error);
        return null;
    }
}

function getCriteriaLabel(criteria) {
    if (criteria.type === 'level' || criteria.type === 'atk' || criteria.type === 'def' || criteria.type === 'year') {
        return `${criteria.values[0]}-${criteria.values[1]} ${criteria.values[2]}`;
    }
    return `${criteria.values[0]}`;
}

function displayCriteria() {
    // Row criteria labels
    document.getElementById('row1-label').textContent = getCriteriaLabel(rowCriteria[0]);
    document.getElementById('row2-label').textContent = getCriteriaLabel(rowCriteria[1]);
    document.getElementById('row3-label').textContent = getCriteriaLabel(rowCriteria[2]);
    
    // Column criteria labels
    document.getElementById('col1-label').textContent = getCriteriaLabel(colCriteria[0]);
    document.getElementById('col2-label').textContent = getCriteriaLabel(colCriteria[1]);
    document.getElementById('col3-label').textContent = getCriteriaLabel(colCriteria[2]);
}

async function submitGuess() {
    const inputs = document.querySelectorAll('.grid-search');
    let allFilled = true;
    
    // First check if all inputs are filled
    inputs.forEach(input => {
        if (!input.value || !input.dataset.cardId) {
            allFilled = false;
            input.style.borderColor = '#999';
            input.style.borderWidth = '2px';
            input.style.backgroundColor = '';
        }
    });
    
    if (!allFilled) {
        document.getElementById('feedback-area').textContent = 'Please select all cards!';
        return;
    }
    
    // Validate each card against its criteria
    const validationPromises = Array.from(inputs).map(async (input, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        const rowCrit = rowCriteria[row];
        const colCrit = colCriteria[col];
        const selectedCardId = parseInt(input.dataset.cardId);
        
        const card = await fetchCardById(selectedCardId);
        const isCorrect = card && matchesCriteria(card, rowCrit, colCrit);
        
        if (isCorrect) {
            input.style.borderColor = '#4CAF50';
            input.style.borderWidth = '2px';
            input.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
        } else {
            input.style.borderColor = '#999';
            input.style.borderWidth = '2px';
            input.style.backgroundColor = '';
        }
        
        return isCorrect;
    });
    
    // Wait for all validations to complete
    const results = await Promise.all(validationPromises);
    const correctCount = results.filter(result => result).length;
    
    if (correctCount === 9) {
        document.getElementById('feedback-area').textContent = '🎉 Perfect! All cards match the criteria!';
        document.getElementById('submit-guess').disabled = true;
        return;
    }
    
    // Wrong answers - deduct attempt
    attemptsRemaining--;
    document.getElementById('feedback-area').textContent = `${correctCount}/9 correct. Attempts remaining: ${attemptsRemaining}`;
    
    if (attemptsRemaining <= 0) {
        document.getElementById('feedback-area').textContent = '❌ Game Over! No more attempts.';
        document.getElementById('submit-guess').disabled = true;
    }
}

async function init() {
    // Show loading message
    document.getElementById('feedback-area').textContent = 'Loading comprehensive monster database...';

    // Reset attempts for new puzzle
    attemptsRemaining = 3;

    // Load monster cards for search functionality
    await loadAllMonsterCards();

    // Generate a valid puzzle
    document.getElementById('feedback-area').textContent = 'Generating puzzle...';
    const puzzleGenerated = await generateValidPuzzle();

    if (!puzzleGenerated) {
        document.getElementById('feedback-area').textContent = 'Error generating puzzle. Try refreshing.';
        document.getElementById('submit-guess').disabled = true;
        return;
    }

    displayCriteria();
    await populateSelects();
    document.getElementById('feedback-area').textContent = `Attempts: ${attemptsRemaining}`;
    document.getElementById('submit-guess').disabled = false;
    document.getElementById('submit-guess').addEventListener('click', submitGuess);
}

init();