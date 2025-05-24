// Game settings
const GRID_SIZE = 20; // Size of each grid cell
const BASE_GAME_SPEED = 150; // Base game speed in milliseconds
const CANVAS_SIZE = 400; // Canvas size in pixels
const LEVEL_UP_SCORE = 20; // Score needed to level up
const BASE_FOOD_SIZE = 1; // Base food size in grid units
const BASE_FOOD_SCORE = 10; // Base score for food
const GOLDEN_APPLE_DURATION = 10000; // Golden apple effect duration in milliseconds
const SLOW_SPEED = 200; // Speed during golden apple effect
const MAX_ITEMS = 5; // Maximum number of items that can exist simultaneously

// High scores management
const MAX_HIGH_SCORES = 10;

// Item types
const ITEM_TYPES = {
    NORMAL: 'normal',
    GOLDEN: 'golden',
    BOMB: 'bomb'
};

// Game variables
let canvas, ctx;
let snake = [];
let items = []; // Array to hold all items
let direction = 'right';
let nextDirection = 'right';
let score = 0;
let level = 1;
let gameRunning = false;
let gameLoop;
let goldenAppleTimer = null;
let isGoldenAppleActive = false;

// Session management
let currentSessionId = null;
let sessions = {};

// Generate a unique session ID
function generateSessionId() {
    return 'session_' + Date.now();
}

// Create a new session
function createNewSession() {
    currentSessionId = generateSessionId();
    sessions[currentSessionId] = {
        id: currentSessionId,
        startTime: new Date(),
        scores: []
    };
    saveSessions();
    updateSessionSelector();
    updateSessionInfo();
    updateHighScoresDisplay();
}

// Save all sessions to localStorage
function saveSessions() {
    const sessionsData = {};
    for (const [id, session] of Object.entries(sessions)) {
        sessionsData[id] = {
            ...session,
            startTime: session.startTime.toISOString()
        };
    }
    localStorage.setItem('snakeSessions', JSON.stringify(sessionsData));
}

// Load all sessions from localStorage
function loadSessions() {
    const savedSessions = localStorage.getItem('snakeSessions');
    if (savedSessions) {
        const sessionsData = JSON.parse(savedSessions);
        for (const [id, session] of Object.entries(sessionsData)) {
            sessions[id] = {
                ...session,
                startTime: new Date(session.startTime)
            };
        }
    }
    // Create new session if none exists
    if (Object.keys(sessions).length === 0) {
        createNewSession();
    } else {
        // Set current session to the most recent one
        currentSessionId = Object.keys(sessions).sort().pop();
    }
    updateSessionSelector();
    updateSessionInfo();
    updateHighScoresDisplay();
}

// Update session selector dropdown
function updateSessionSelector() {
    const selector = document.getElementById('sessionSelector');
    selector.innerHTML = '';
    
    // Sort sessions by start time (newest first)
    const sortedSessions = Object.values(sessions).sort((a, b) => 
        b.startTime - a.startTime
    );

    sortedSessions.forEach(session => {
        const option = document.createElement('option');
        option.value = session.id;
        option.textContent = session.startTime.toLocaleString();
        if (session.id === currentSessionId) {
            option.selected = true;
        }
        selector.appendChild(option);
    });
}

// Update session info display
function updateSessionInfo() {
    const sessionInfo = document.getElementById('sessionInfo');
    const session = sessions[currentSessionId];
    if (session) {
        const duration = Math.floor((new Date() - session.startTime) / 1000 / 60); // in minutes
        sessionInfo.textContent = `Session started: ${session.startTime.toLocaleTimeString()}\nDuration: ${duration} min`;
    }
}

// Change current session
function changeSession() {
    const selector = document.getElementById('sessionSelector');
    currentSessionId = selector.value;
    updateSessionInfo();
    updateHighScoresDisplay();
}

// Add a new score to current session
function addHighScore(score, level) {
    if (!currentSessionId || !sessions[currentSessionId]) {
        createNewSession();
    }

    const newScore = { 
        score, 
        level, 
        date: new Date().toLocaleString(),
        timestamp: Date.now()
    };
    
    sessions[currentSessionId].scores.push(newScore);
    sessions[currentSessionId].scores.sort((a, b) => b.score - a.score);
    
    if (sessions[currentSessionId].scores.length > MAX_HIGH_SCORES) {
        sessions[currentSessionId].scores = sessions[currentSessionId].scores.slice(0, MAX_HIGH_SCORES);
    }
    
    saveSessions();
    updateHighScoresDisplay();
}

// Update the high scores display
function updateHighScoresDisplay() {
    const highScoresList = document.getElementById('highScoresList');
    highScoresList.innerHTML = '';

    if (!currentSessionId || !sessions[currentSessionId]) {
        highScoresList.innerHTML = '<div class="score-entry">No session selected</div>';
        return;
    }

    const scores = sessions[currentSessionId].scores;
    if (scores.length === 0) {
        highScoresList.innerHTML = '<div class="score-entry">No scores yet</div>';
        return;
    }

    scores.forEach((entry, index) => {
        const scoreEntry = document.createElement('div');
        scoreEntry.className = 'score-entry';
        scoreEntry.innerHTML = `
            <span class="rank">#${index + 1}</span>
            <div class="details">
                <div class="score">${entry.score} pts</div>
                <div class="level">Level ${entry.level}</div>
                <div class="time">${entry.date}</div>
            </div>
        `;
        highScoresList.appendChild(scoreEntry);
    });
}

// Calculate current game speed based on level
function getCurrentGameSpeed() {
    if (isGoldenAppleActive) {
        return SLOW_SPEED;
    }
    return Math.max(BASE_GAME_SPEED - (level - 1) * 15, 50);
}

// Calculate current food size based on level
function getCurrentFoodSize() {
    return Math.max(BASE_FOOD_SIZE - (level - 1) * 0.1, 0.5); // Decrease by 0.1 per level, minimum 0.5
}

// Calculate current food score based on level
function getCurrentFoodScore() {
    return Math.max(BASE_FOOD_SCORE - (level - 1), 1); // Decrease by 1 per level, minimum 1
}

// Calculate bomb spawn chance based on level
function getBombSpawnChance() {
    return Math.min(0.1 + (level - 1) * 0.05, 0.4); // Increases by 5% per level, max 40%
}

// Calculate golden apple spawn chance
function getGoldenAppleSpawnChance() {
    return 0.1; // 10% chance
}

// Generate random item type based on probabilities
function generateItemType() {
    const bombChance = getBombSpawnChance();
    const goldenChance = getGoldenAppleSpawnChance();
    const random = Math.random();

    if (random < bombChance) {
        return ITEM_TYPES.BOMB;
    } else if (random < bombChance + goldenChance) {
        return ITEM_TYPES.GOLDEN;
    }
    return ITEM_TYPES.NORMAL;
}

// Check if a position is occupied by any item
function isPositionOccupied(x, y) {
    return items.some(item => item.x === x && item.y === y) ||
           snake.some(segment => segment.x === x && segment.y === y);
}

// Generate a random position that's not occupied
function generateRandomPosition() {
    const maxPos = CANVAS_SIZE / GRID_SIZE - 1;
    const wallBias = Math.random() < 0.7; // 70% chance to spawn near walls
    
    let position;
    if (wallBias) {
        const wall = Math.floor(Math.random() * 4);
        switch (wall) {
            case 0: // top wall
                position = {
                    x: Math.floor(Math.random() * maxPos),
                    y: Math.floor(Math.random() * 2)
                };
                break;
            case 1: // right wall
                position = {
                    x: maxPos - Math.floor(Math.random() * 2),
                    y: Math.floor(Math.random() * maxPos)
                };
                break;
            case 2: // bottom wall
                position = {
                    x: Math.floor(Math.random() * maxPos),
                    y: maxPos - Math.floor(Math.random() * 2)
                };
                break;
            case 3: // left wall
                position = {
                    x: Math.floor(Math.random() * 2),
                    y: Math.floor(Math.random() * maxPos)
                };
                break;
        }
    } else {
        position = {
            x: Math.floor(Math.random() * maxPos),
            y: Math.floor(Math.random() * maxPos)
        };
    }

    // Keep trying new positions until we find an unoccupied one
    while (isPositionOccupied(position.x, position.y)) {
        position = {
            x: Math.floor(Math.random() * maxPos),
            y: Math.floor(Math.random() * maxPos)
        };
    }

    return position;
}

// Check if there are any apples left (normal or golden)
function hasApples() {
    return items.some(item => item.type === ITEM_TYPES.NORMAL || item.type === ITEM_TYPES.GOLDEN);
}

// Reset and respawn all items
function resetAndRespawnItems() {
    // Clear all items
    items = [];
    
    // Generate new items until we reach MAX_ITEMS
    while (items.length < MAX_ITEMS) {
        generateItem();
    }
}

// Generate a new item
function generateItem() {
    if (items.length >= MAX_ITEMS) return; // Don't generate if at max items

    const position = generateRandomPosition();
    // Generate any type of item with normal probabilities
    const type = generateItemType();
    
    items.push({
        ...position,
        type: type
    });
}

// Initialize the game
function initGame() {
    // Get canvas and context
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get canvas context!');
        return;
    }

    // Set canvas size
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    // Initialize snake
    snake = [
        {x: 6, y: 10},
        {x: 5, y: 10},
        {x: 4, y: 10}
    ];

    // Initialize items
    items = [];
    // Generate initial items
    for (let i = 0; i < MAX_ITEMS; i++) {
        generateItem();
    }

    // Reset game state
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    level = 1;
    updateScore();
    gameRunning = true;

    // Reset golden apple state
    isGoldenAppleActive = false;
    if (goldenAppleTimer) {
        clearTimeout(goldenAppleTimer);
        goldenAppleTimer = null;
    }

    // Hide game over screen
    document.getElementById('gameOver').style.display = 'none';

    // Start game loop with current speed
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, getCurrentGameSpeed());

    // Load sessions and create new one if needed
    loadSessions();

    // Draw initial state
    draw();
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = `Score: ${score} | Level: ${level}`;
}

// Check for level up
function checkLevelUp() {
    if (score >= level * LEVEL_UP_SCORE) {
        level++;
        // Update game speed
        clearInterval(gameLoop);
        gameLoop = setInterval(update, getCurrentGameSpeed());
        updateScore();
    }
}

// Handle golden apple effect
function activateGoldenApple() {
    isGoldenAppleActive = true;
    
    // Clear any existing timer
    if (goldenAppleTimer) {
        clearTimeout(goldenAppleTimer);
    }

    // Update game speed
    clearInterval(gameLoop);
    gameLoop = setInterval(update, getCurrentGameSpeed());

    // Set timer to deactivate effect
    goldenAppleTimer = setTimeout(() => {
        isGoldenAppleActive = false;
        clearInterval(gameLoop);
        gameLoop = setInterval(update, getCurrentGameSpeed());
    }, GOLDEN_APPLE_DURATION);
}

// Update game state
function update() {
    if (!gameRunning) return;

    // Update direction
    direction = nextDirection;

    // Calculate new head position
    const head = {x: snake[0].x, y: snake[0].y};
    switch (direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
    }

    // Check for collisions
    if (isCollision(head)) {
        gameOver();
        return;
    }

    // Add new head
    snake.unshift(head);

    // Check for item collisions
    const itemIndex = items.findIndex(item => item.x === head.x && item.y === head.y);
    if (itemIndex !== -1) {
        const item = items[itemIndex];
        switch (item.type) {
            case ITEM_TYPES.NORMAL:
                score += getCurrentFoodScore();
                break;
            case ITEM_TYPES.GOLDEN:
                score += getCurrentFoodScore() * 3; // Triple points
                activateGoldenApple();
                break;
            case ITEM_TYPES.BOMB:
                gameOver();
                return;
        }
        // Remove the eaten item
        items.splice(itemIndex, 1);
        
        // Check if we need to reset and respawn items
        if (!hasApples()) {
            resetAndRespawnItems();
        }
        
        updateScore();
        checkLevelUp();
    } else {
        // Remove tail if no item was eaten
        snake.pop();
    }

    // Draw everything
    draw();
}

// Check for collisions
function isCollision(head) {
    // Wall collision
    if (head.x < 0 || head.x >= CANVAS_SIZE / GRID_SIZE ||
        head.y < 0 || head.y >= CANVAS_SIZE / GRID_SIZE) {
        return true;
    }

    // Self collision
    return snake.some(segment => segment.x === head.x && segment.y === head.y);
}

// Draw game state
function draw() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw snake
    snake.forEach((segment, index) => {
        // Make head slightly darker
        ctx.fillStyle = index === 0 ? '#45a049' : '#4CAF50';
        
        // Draw snake segment
        ctx.fillRect(
            segment.x * GRID_SIZE,
            segment.y * GRID_SIZE,
            GRID_SIZE - 1,
            GRID_SIZE - 1
        );
    });

    // Draw all items
    const foodSize = getCurrentFoodSize() * GRID_SIZE;
    const foodOffset = (GRID_SIZE - foodSize) / 2;
    
    items.forEach(item => {
        switch (item.type) {
            case ITEM_TYPES.NORMAL:
                ctx.fillStyle = '#ff0000'; // Red for normal apple
                break;
            case ITEM_TYPES.GOLDEN:
                ctx.fillStyle = '#ffd700'; // Gold for golden apple
                break;
            case ITEM_TYPES.BOMB:
                ctx.fillStyle = '#808080'; // Gray for bomb
                break;
        }

        ctx.fillRect(
            item.x * GRID_SIZE + foodOffset,
            item.y * GRID_SIZE + foodOffset,
            foodSize - 1,
            foodSize - 1
        );
    });

    // Draw golden apple effect indicator if active
    if (isGoldenAppleActive) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.2)'; // Semi-transparent gold
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// Game over function
function gameOver() {
    gameRunning = false;
    clearInterval(gameLoop);
    if (goldenAppleTimer) {
        clearTimeout(goldenAppleTimer);
    }
    
    // Add score to high scores if it's high enough
    if (sessions[currentSessionId].scores.length < MAX_HIGH_SCORES || score > sessions[currentSessionId].scores[sessions[currentSessionId].scores.length - 1].score) {
        addHighScore(score, level);
    }
    
    document.getElementById('finalScore').textContent = `${score} (Level ${level})`;
    document.getElementById('gameOver').style.display = 'block';
}

// Restart game
function restartGame() {
    initGame();
}

// Handle keyboard input
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowUp':
            if (direction !== 'down') nextDirection = 'up';
            break;
        case 'ArrowDown':
            if (direction !== 'up') nextDirection = 'down';
            break;
        case 'ArrowLeft':
            if (direction !== 'right') nextDirection = 'left';
            break;
        case 'ArrowRight':
            if (direction !== 'left') nextDirection = 'right';
            break;
    }
});

// Start the game when the page loads
window.addEventListener('load', () => {
    console.log('Starting Snake Game...');
    loadSessions(); // Load sessions immediately
    initGame();
});

// Make changeSession available globally
window.changeSession = changeSession; 