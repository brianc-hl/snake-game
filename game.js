// Game settings
const GRID_SIZE = 20; // Size of each grid cell
const GAME_SPEED = 150; // Game speed in milliseconds
const CANVAS_SIZE = 400; // Canvas size in pixels

// Game variables
let canvas, ctx;
let snake = [];
let food = {};
let direction = 'right';
let nextDirection = 'right';
let score = 0;
let gameRunning = false;
let gameLoop;

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

    // Generate initial food
    generateFood();

    // Reset game state
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    updateScore();
    gameRunning = true;

    // Hide game over screen
    document.getElementById('gameOver').style.display = 'none';

    // Start game loop
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, GAME_SPEED);

    // Draw initial state
    draw();
}

// Generate food at random position
function generateFood() {
    const maxPos = CANVAS_SIZE / GRID_SIZE - 1;
    food = {
        x: Math.floor(Math.random() * maxPos),
        y: Math.floor(Math.random() * maxPos)
    };

    // Make sure food doesn't spawn on snake
    while (snake.some(segment => segment.x === food.x && segment.y === food.y)) {
        food = {
            x: Math.floor(Math.random() * maxPos),
            y: Math.floor(Math.random() * maxPos)
        };
    }
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = `Score: ${score}`;
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

    // Check if food is eaten
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        updateScore();
        generateFood();
    } else {
        // Remove tail if no food was eaten
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

    // Draw food
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(
        food.x * GRID_SIZE,
        food.y * GRID_SIZE,
        GRID_SIZE - 1,
        GRID_SIZE - 1
    );
}

// Game over function
function gameOver() {
    gameRunning = false;
    clearInterval(gameLoop);
    document.getElementById('finalScore').textContent = score;
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
    initGame();
}); 