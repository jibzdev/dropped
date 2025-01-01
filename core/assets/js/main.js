// Game configuration
const config = {
    canvas: null,
    ctx: null,
    width: window.innerWidth,
    height: window.innerHeight,
    grid: {
        rows: 6,
        cols: 5,
        cellSize: Math.min(60, Math.min(window.innerWidth * 0.15, window.innerHeight * 0.1)), // Reduced cell size
        gap: Math.min(8, window.innerWidth * 0.02) // Responsive gap size
    },
    blocks: [],
    currentBlock: null,
    isGameActive: false,
    score: 0,
    possibleValues: [2], // Start with only '2' as a possible block value
    animations: [], // Track active animations
    dropSpeed: 0.2, // Speed of block dropping (seconds)
    mergeSpeed: 0.3, // Speed of merge animation (seconds)
    pendingMergeCheck: false, // Flag to track if we need to check for matches after animations
    mouseX: 0, // Track mouse X position
    processingMoves: false // Flag to prevent multiple simultaneous updates
};

// Initialize game
function startGame() {
    const gameContainer = document.getElementById('gameContainer');

    // Create score display with improved styling
    const scoreDisplay = document.createElement('div');
    scoreDisplay.id = 'scoreDisplay';
    scoreDisplay.style.cssText = `
        color: white;
        font-size: ${window.innerWidth < 768 ? '20px' : '28px'};
        margin: 10px;
        font-family: Arial, sans-serif;
        font-weight: bold;
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        background: rgba(75, 114, 185, 0.2);
        padding: 8px 20px;
        border-radius: 15px;
        backdrop-filter: blur(5px);
        transition: transform 0.3s ease;
    `;
    scoreDisplay.textContent = 'Score: 0';
    gameContainer.appendChild(scoreDisplay);

    initGame();
}

function initGame() {
    // Create canvas with improved styling
    config.canvas = document.createElement('canvas');
    const totalWidth = (config.grid.cellSize + config.grid.gap) * config.grid.cols - config.grid.gap;
    const totalHeight = (config.grid.cellSize + config.grid.gap) * config.grid.rows - config.grid.gap;
    config.canvas.width = totalWidth + 30; // Reduced padding
    config.canvas.height = totalHeight + 30; // Reduced padding
    config.canvas.style.cssText = `
        background: rgba(26, 26, 26, 0.8);
        border-radius: 15px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: transform 0.3s ease;
        max-width: 95vw;
        max-height: 80vh;
    `;
    
    const canvasContainer = document.createElement('div');
    canvasContainer.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 10px;
        width: 100%;
        height: 100%;
    `;
    canvasContainer.appendChild(config.canvas);
    document.getElementById('gameContainer').appendChild(canvasContainer);
    
    config.ctx = config.canvas.getContext('2d');
    
    // Initialize empty grid and animations array
    for (let i = 0; i < config.grid.rows; i++) {
        config.blocks[i] = new Array(config.grid.cols).fill(null);
        config.animations[i] = new Array(config.grid.cols).fill(null);
    }
    
    // Add touch and click events
    config.canvas.addEventListener('click', handleClick);
    config.canvas.addEventListener('mousemove', (e) => {
        const rect = config.canvas.getBoundingClientRect();
        config.mouseX = e.clientX - rect.left;
        if (config.currentBlock) {
            const col = Math.floor(config.mouseX / (config.grid.cellSize + config.grid.gap));
            config.currentBlock.col = Math.max(0, Math.min(config.grid.cols - 1, col));
        }
    });
    
    config.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = config.canvas.getBoundingClientRect();
        config.mouseX = touch.clientX - rect.left;
        if (config.currentBlock) {
            const col = Math.floor(config.mouseX / (config.grid.cellSize + config.grid.gap));
            config.currentBlock.col = Math.max(0, Math.min(config.grid.cols - 1, col));
        }
    });
    
    config.canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const rect = config.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const col = Math.floor(x / (config.grid.cellSize + config.grid.gap));
        handleColumnClick(col);
    });

    config.isGameActive = true;
    spawnNewBlock();
    gameLoop();
}

function spawnNewBlock() {
    const value = config.possibleValues[Math.floor(Math.random() * config.possibleValues.length)];
    const col = Math.floor(config.mouseX / (config.grid.cellSize + config.grid.gap));
    config.currentBlock = {
        value: value,
        col: Math.max(0, Math.min(config.grid.cols - 1, col)),
        y: -config.grid.cellSize, // Start above the grid
        targetY: 15 // Target preview position (reduced)
    };
    
    // Animate block appearing
    const animation = {
        type: 'spawn',
        startTime: performance.now(),
        duration: 300,
        block: config.currentBlock
    };
    
    if (config.blocks[0][config.currentBlock.col] !== null) {
        gameOver();
    }
}

function gameOver() {
    config.isGameActive = false;
    
    // Animate game over state
    const scoreDisplay = document.getElementById('scoreDisplay');
    scoreDisplay.style.transform = 'scale(1.1)';
    config.canvas.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        alert("Game Over! Your final score is: " + config.score);
        scoreDisplay.style.transform = 'scale(1)';
        config.canvas.style.transform = 'scale(1)';
    }, 500);
}

function handleClick(e) {
    const rect = config.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const col = Math.floor(x / (config.grid.cellSize + config.grid.gap));
    handleColumnClick(col);
}

async function handleColumnClick(col) {
    if (!config.isGameActive || col < 0 || col >= config.grid.cols || config.processingMoves) return;
    
    config.processingMoves = true;
    
    let row = config.grid.rows - 1;
    while (row >= 0 && config.blocks[row][col] !== null) {
        row--;
    }
    
    if (row >= 0) {
        const targetY = row * (config.grid.cellSize + config.grid.gap) + 15; // Reduced offset
        const startY = 15; // Starting from preview position (reduced)
        
        // Create drop animation
        await new Promise(resolve => {
            config.animations[row][col] = {
                type: 'drop',
                value: config.currentBlock.value,
                startTime: performance.now(),
                startY: startY,
                targetY: targetY,
                duration: config.dropSpeed * 1000,
                onComplete: () => {
                    config.blocks[row][col] = config.currentBlock.value;
                    config.animations[row][col] = null;
                    resolve();
                }
            };
        });

        // Process moves until no more changes occur
        let continueProcessing = true;
        while (continueProcessing) {
            continueProcessing = false;

            // Apply gravity first
            if (await applyGravity()) {
                continueProcessing = true;
            }

            // Then check for matches
            if (await checkMatches()) {
                continueProcessing = true;
            }

            // Update score after each iteration
            updateScore();
        }

        config.processingMoves = false;
        spawnNewBlock();
    } else {
        config.processingMoves = false;
    }
}

async function applyGravity() {
    let moved = false;
    
    // Apply gravity column by column
    for (let col = 0; col < config.grid.cols; col++) {
        for (let row = config.grid.rows - 2; row >= 0; row--) {
            if (config.blocks[row][col] !== null) {
                let currentRow = row;
                
                while (currentRow + 1 < config.grid.rows && config.blocks[currentRow + 1][col] === null) {
                    // Animate the falling block
                    await new Promise(resolve => {
                        const startY = currentRow * (config.grid.cellSize + config.grid.gap) + 15;
                        const targetY = (currentRow + 1) * (config.grid.cellSize + config.grid.gap) + 15;
                        
                        config.animations[currentRow + 1][col] = {
                            type: 'drop',
                            value: config.blocks[currentRow][col],
                            startTime: performance.now(),
                            startY: startY,
                            targetY: targetY,
                            duration: config.dropSpeed * 500,
                            onComplete: () => {
                                config.blocks[currentRow + 1][col] = config.blocks[currentRow][col];
                                config.blocks[currentRow][col] = null;
                                config.animations[currentRow + 1][col] = null;
                                resolve();
                            }
                        };
                    });
                    
                    currentRow++;
                    moved = true;
                }
            }
        }
    }
    
    return moved;
}

async function checkMatches() {
    let hasMatches = false;
    const mergePromises = [];
    
    // Check vertical matches
    for (let col = 0; col < config.grid.cols; col++) {
        for (let row = config.grid.rows - 1; row > 0; row--) {
            if (config.blocks[row][col] !== null && 
                config.blocks[row][col] === config.blocks[row-1][col]) {
                
                const newValue = config.blocks[row][col] * 2;
                hasMatches = true;
                
                mergePromises.push(new Promise(resolve => {
                    config.animations[row][col] = {
                        type: 'merge',
                        startTime: performance.now(),
                        duration: config.mergeSpeed * 1000,
                        oldValue: config.blocks[row][col],
                        newValue: newValue,
                        sourceRow: row-1,
                        sourceCol: col,
                        onComplete: () => {
                            config.blocks[row][col] = newValue;
                            config.score += newValue;
                            
                            if (!config.possibleValues.includes(newValue)) {
                                config.possibleValues.push(newValue);
                            }
                            
                            config.blocks[row-1][col] = null;
                            config.animations[row][col] = null;
                            resolve();
                        }
                    };
                }));
            }
        }
    }
    
    // Check horizontal matches
    for (let row = 0; row < config.grid.rows; row++) {
        for (let col = 1; col < config.grid.cols; col++) {
            if (config.blocks[row][col] !== null && 
                config.blocks[row][col] === config.blocks[row][col-1]) {
                
                const newValue = config.blocks[row][col] * 2;
                hasMatches = true;
                
                mergePromises.push(new Promise(resolve => {
                    config.animations[row][col] = {
                        type: 'merge',
                        startTime: performance.now(),
                        duration: config.mergeSpeed * 1000,
                        oldValue: config.blocks[row][col],
                        newValue: newValue,
                        sourceRow: row,
                        sourceCol: col-1,
                        onComplete: () => {
                            config.blocks[row][col] = newValue;
                            config.score += newValue;
                            
                            if (!config.possibleValues.includes(newValue)) {
                                config.possibleValues.push(newValue);
                            }
                            
                            config.blocks[row][col-1] = null;
                            config.animations[row][col] = null;
                            resolve();
                        }
                    };
                }));
            }
        }
    }
    
    // Wait for all merges to complete
    if (mergePromises.length > 0) {
        await Promise.all(mergePromises);
    }
    
    return hasMatches;
}

function drawBlock(row, col, value, scale = 1, alpha = 1) {
    const x = col * (config.grid.cellSize + config.grid.gap) + 15;
    const y = row * (config.grid.cellSize + config.grid.gap) + 15;
    
    config.ctx.save();
    config.ctx.globalAlpha = alpha;
    
    // Apply scale transform
    if (scale !== 1) {
        config.ctx.translate(x + config.grid.cellSize/2, y + config.grid.cellSize/2);
        config.ctx.scale(scale, scale);
        config.ctx.translate(-x - config.grid.cellSize/2, -y - config.grid.cellSize/2);
    }
    
    const hue = (Math.log2(value) * 30) % 360;
    const blockGradient = config.ctx.createLinearGradient(x, y, x + config.grid.cellSize, y + config.grid.cellSize);
    blockGradient.addColorStop(0, `hsl(${hue}, 70%, 50%)`);
    blockGradient.addColorStop(1, `hsl(${hue}, 70%, 40%)`);
    
    // Add glow effect
    config.ctx.shadowColor = `hsl(${hue}, 70%, 60%)`;
    config.ctx.shadowBlur = 10;
    
    config.ctx.fillStyle = blockGradient;
    config.ctx.fillRect(x, y, config.grid.cellSize, config.grid.cellSize);
    
    config.ctx.shadowBlur = 0;
    config.ctx.fillStyle = 'white';
    config.ctx.font = `bold ${config.grid.cellSize/2.5}px Arial`; // Adjusted font size
    config.ctx.textAlign = 'center';
    config.ctx.textBaseline = 'middle';
    config.ctx.fillText(value, x + config.grid.cellSize/2, y + config.grid.cellSize/2);
    
    config.ctx.restore();
}

function gameLoop() {
    if (!config.isGameActive) return;
    
    config.ctx.clearRect(0, 0, config.canvas.width, config.canvas.height);
    
    // Draw grid
    for (let row = 0; row < config.grid.rows; row++) {
        for (let col = 0; col < config.grid.cols; col++) {
            const x = col * (config.grid.cellSize + config.grid.gap) + 15;
            const y = row * (config.grid.cellSize + config.grid.gap) + 15;
            
            // Draw cell background
            const gradient = config.ctx.createLinearGradient(x, y, x + config.grid.cellSize, y + config.grid.cellSize);
            gradient.addColorStop(0, '#2a2a2a');
            gradient.addColorStop(1, '#222222');
            config.ctx.fillStyle = gradient;
            config.ctx.fillRect(x, y, config.grid.cellSize, config.grid.cellSize);
            
            // Draw blocks and handle animations
            if (config.animations[row][col]) {
                const anim = config.animations[row][col];
                const progress = (performance.now() - anim.startTime) / anim.duration;
                
                if (progress >= 1) {
                    anim.onComplete();
                } else {
                    if (anim.type === 'drop') {
                        const currentY = anim.startY + (anim.targetY - anim.startY) * progress;
                        drawBlock(currentY / (config.grid.cellSize + config.grid.gap), col, anim.value);
                    } else if (anim.type === 'merge') {
                        const scale = 1 + 0.2 * Math.sin(progress * Math.PI);
                        drawBlock(row, col, anim.newValue, scale);
                    }
                }
            } else if (config.blocks[row][col] !== null) {
                drawBlock(row, col, config.blocks[row][col]);
            }
        }
    }
    
    // Draw current block preview with animation
    if (config.currentBlock) {
        const x = config.currentBlock.col * (config.grid.cellSize + config.grid.gap) + 15;
        
        // Smooth preview movement
        config.currentBlock.y += (config.currentBlock.targetY - config.currentBlock.y) * 0.2;
        
        const gradient = config.ctx.createLinearGradient(x, config.currentBlock.y, 
            x + config.grid.cellSize, config.currentBlock.y + config.grid.cellSize);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
        
        config.ctx.fillStyle = gradient;
        config.ctx.fillRect(x, config.currentBlock.y, config.grid.cellSize, config.grid.cellSize);
        
        config.ctx.fillStyle = 'white';
        config.ctx.font = `bold ${config.grid.cellSize/2.5}px Arial`; // Adjusted font size
        config.ctx.textAlign = 'center';
        config.ctx.textBaseline = 'middle';
        config.ctx.shadowColor = 'rgba(0,0,0,0.3)';
        config.ctx.shadowBlur = 2;
        config.ctx.fillText(config.currentBlock.value, 
            x + config.grid.cellSize/2, 
            config.currentBlock.y + config.grid.cellSize/2);
        config.ctx.shadowBlur = 0;
    }
    
    requestAnimationFrame(gameLoop);
}

function updateScore() {
    const scoreDisplay = document.getElementById('scoreDisplay');
    scoreDisplay.textContent = `Score: ${config.score}`;
    
    // Animate score update
    scoreDisplay.style.transform = 'scale(1.1)';
    setTimeout(() => {
        scoreDisplay.style.transform = 'scale(1)';
    }, 100);
}

window.addEventListener('load', () => {
    // Create loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(4, 11, 44, 0.95);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        transition: opacity 0.5s ease;
    `;

    // Create loading spinner
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        width: 40px;
        height: 40px;
        border: 3px solid rgba(255,255,255,0.1);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin 1s ease-in-out infinite;
        margin-bottom: 15px;
    `;

    // Add keyframes for spinner
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    // Create loading text
    const loadingText = document.createElement('div');
    loadingText.style.cssText = `
        color: white;
        font-size: ${window.innerWidth < 768 ? '1rem' : '1.2rem'};
        font-family: Arial, sans-serif;
        text-align: center;
    `;

    // Add elements to overlay
    loadingOverlay.appendChild(spinner);
    loadingOverlay.appendChild(loadingText);
    document.body.appendChild(loadingOverlay);

    // Loading sequence
    const loadingSteps = [
        "Generating grid...",
        "Calibrating gravity...",
        "Preparing blocks...",
        "Initializing game..."
    ];

    let currentStep = 0;
    const stepInterval = setInterval(() => {
        if (currentStep < loadingSteps.length) {
            loadingText.textContent = loadingSteps[currentStep];
            currentStep++;
        } else {
            clearInterval(stepInterval);
            // Fade out loading overlay
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.remove();
                startGame();
            }, 500);
        }
    }, 800);
});