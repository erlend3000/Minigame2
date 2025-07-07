var CANVAS_BG_COLOR = "#000";
var PLAYER_NAME = "Erlend Klouman Høiner";
var BOX_WIDTH = 400;
var BOX_HEIGHT = 80;
var NAME_PADDING = 24;
var NAME_FONT = "bold 28px Helvetica, Arial, sans-serif";
var SMALL_TEXT = "Teams are created when all students have joined.";
var SMALL_FONT = "16px Helvetica, Arial, sans-serif";
var SMALL_TEXT_COLOR = "#fff";
var SMALL_TEXT_Y_OFFSET = 18; // px gap from box to small text
var SMALL_TEXT_HEIGHT = 18; // estimate for vertical centering
// Physics constants - ENHANCED FOR SPEED
var ROTATION_SPEED = 0.008; // Increased rotation speed for faster control
var MAX_ROTATION = Infinity; // No limit - allow full 360-degree rotation
var RANDOM_TILT_STRENGTH = 0.0002; // Random tilt for initial movement
var LETTER_BASE_GRAVITY = 0.4; // MUCH higher gravity for faster response
var LETTER_FRICTION = 0.9; // REDUCED friction for faster sliding
var LETTER_VARIATION = 0.25; // Variation in letter weights
var GRAVITY = 0.4; // Gravity for falling letters
var CENTRIFUGAL_FORCE = 0.1; // INCREASED centrifugal effect
var EXIT_VELOCITY_PRESERVATION = 0.98; // Better preservation of exit velocity
// Auto-tilt settings
var AUTO_TILT_ENABLED = true; // Enable auto-tilt
var BOARD_GRAVITY = 0.0008; // How strongly gravity affects the board
var BOARD_FRICTION = 0.995; // Damping for board movement
// Start-up settings
var INITIAL_TILT = 0.0; // Start perfectly horizontal
var INITIAL_TILT_VELOCITY = 0.000001; // Extremely small initial velocity
var STARTUP_DURATION = 5000; // Gradual startup over 5 seconds
var startupProgress = 0; // Tracks startup progress (0-1)
var canvas;
var ctx;
var CANVAS_WIDTH = window.innerWidth;
var CANVAS_HEIGHT = window.innerHeight;
var gameActive = false;
var boardRotation = 0; // Current board rotation in radians
var boardAngularVelocity = 0; // Current rotation velocity
var prevAngularVelocity = 0; // Previous angular velocity for acceleration calculation
var letters = [];
var keyLeft = false;
var keyRight = false;
var gameStart = 0;
var boardCenterX = CANVAS_WIDTH / 2;
var boardCenterY = 0;
var boxTop = 0; // Global tracking of box position
var lastFrameTime = 0;
// Calculate vertical center for both box and small text as a group
function getPaddleGroupY() {
    var groupHeight = BOX_HEIGHT + SMALL_TEXT_Y_OFFSET + SMALL_TEXT_HEIGHT;
    return (CANVAS_HEIGHT - groupHeight) / 2;
}
function initializeLetters() {
    letters = [];
    // Measure each letter's width
    ctx.font = NAME_FONT;
    // Calculate total width of the name
    var totalWidth = ctx.measureText(PLAYER_NAME).width;
    var startX = -totalWidth / 2; // Relative to center
    var currentX = startX;
    // Create letter objects
    for (var i = 0; i < PLAYER_NAME.length; i++) {
        var char = PLAYER_NAME[i];
        var letterWidth = ctx.measureText(char).width;
        // Skip spaces but maintain their width
        if (char === " ") {
            currentX += letterWidth;
            continue;
        }
        letters.push({
            char: char,
            x: currentX,
            y: 0, // Centered vertically
            vx: 0,
            vy: 0,
            width: letterWidth,
            height: 28, // Approximate height based on font size
            active: true,
            // Add variation to each letter's weight (gravity response)
            gravity: LETTER_BASE_GRAVITY * (1 + (Math.random() - 0.5) * LETTER_VARIATION)
        });
        currentX += letterWidth;
    }
}
function drawLobby(ctx) {
    ctx.fillStyle = CANVAS_BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    var groupY = getPaddleGroupY();
    boxTop = groupY;
    var centerX = CANVAS_WIDTH / 2;
    boardCenterY = groupY + BOX_HEIGHT / 2;
    // White box (paddle)
    ctx.fillStyle = "#fff";
    ctx.fillRect(centerX - BOX_WIDTH / 2, groupY, BOX_WIDTH, BOX_HEIGHT);
    // Name with padding
    ctx.font = NAME_FONT;
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.beginPath();
    ctx.rect(centerX - BOX_WIDTH / 2 + NAME_PADDING, groupY + NAME_PADDING, BOX_WIDTH - 2 * NAME_PADDING, BOX_HEIGHT - 2 * NAME_PADDING);
    ctx.clip();
    ctx.fillText(PLAYER_NAME, centerX, groupY + BOX_HEIGHT / 2);
    ctx.restore();
    // Small text underneath
    ctx.font = SMALL_FONT;
    ctx.fillStyle = SMALL_TEXT_COLOR;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(SMALL_TEXT, centerX, groupY + BOX_HEIGHT + SMALL_TEXT_Y_OFFSET);
}
function drawGame(ctx) {
    // Clear canvas
    ctx.fillStyle = CANVAS_BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    var groupY = getPaddleGroupY();
    boxTop = groupY;
    boardCenterY = groupY + BOX_HEIGHT / 2;
    // Draw rotated box
    ctx.save();
    ctx.translate(boardCenterX, boardCenterY);
    ctx.rotate(boardRotation);
    // White box (balance board)
    ctx.fillStyle = "#fff";
    ctx.fillRect(-BOX_WIDTH / 2, -BOX_HEIGHT / 2, BOX_WIDTH, BOX_HEIGHT);
    // Draw small text as part of the box
    ctx.font = SMALL_FONT;
    ctx.fillStyle = SMALL_TEXT_COLOR;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(SMALL_TEXT, 0, BOX_HEIGHT / 2 + SMALL_TEXT_Y_OFFSET);
    // Draw only active letters WITHOUT clipping
    ctx.font = NAME_FONT;
    ctx.fillStyle = "#000";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    // Draw each active letter - allowing visibility outside the box
    for (var _i = 0, letters_1 = letters; _i < letters_1.length; _i++) {
        var letter = letters_1[_i];
        if (letter.active) {
            ctx.fillText(letter.char, letter.x, letter.y);
        }
    }
    ctx.restore();
    // Draw falling letters outside the box
    ctx.font = NAME_FONT;
    ctx.fillStyle = "#fff";
    for (var _a = 0, letters_2 = letters; _a < letters_2.length; _a++) {
        var letter = letters_2[_a];
        if (!letter.active && letter.worldY < CANVAS_HEIGHT) {
            ctx.fillText(letter.char, letter.worldX, letter.worldY);
        }
    }
}
function updatePhysics(deltaTime) {
    // Update startup progress
    if (gameStart > 0) {
        var timeSinceStart = performance.now() - gameStart;
        startupProgress = Math.min(1, timeSinceStart / STARTUP_DURATION);
    }
    // Store previous angular velocity for acceleration calculation
    prevAngularVelocity = boardAngularVelocity;
    // Calculate torque based on board orientation
    // The board's stable equilibrium is at ±90 degrees (π/2 or 3π/2)
    var torque = 0;
    // Handle user input for rotation
    if (keyLeft && !keyRight) {
        boardAngularVelocity -= ROTATION_SPEED;
    }
    else if (keyRight && !keyLeft) {
        boardAngularVelocity += ROTATION_SPEED;
    }
    // Apply auto-tilt if enabled - with smooth startup
    if (AUTO_TILT_ENABLED) {
        // Calculate angle difference from nearest vertical position (π/2 or 3π/2)
        var normalizedAngle = boardRotation % (Math.PI * 2);
        // Distance from 90° (π/2)
        var distToRight = Math.abs(normalizedAngle - Math.PI / 2);
        // Distance from 270° (3π/2)
        var distToLeft = Math.abs(normalizedAngle - 3 * Math.PI / 2);
        if (distToRight < distToLeft) {
            // Closer to right vertical (90°)
            torque = Math.sin(normalizedAngle - Math.PI / 2) * BOARD_GRAVITY;
        }
        else {
            // Closer to left vertical (270°)
            torque = Math.sin(normalizedAngle - 3 * Math.PI / 2) * BOARD_GRAVITY;
        }
        // Apply torque to angular velocity - scaled by startup progress
        boardAngularVelocity -= torque * startupProgress;
    }
    // Apply friction/damping to board rotation
    boardAngularVelocity *= BOARD_FRICTION;
    // Add small random tilt for initial instability - scaled by startup progress
    boardAngularVelocity += (Math.random() - 0.5) * RANDOM_TILT_STRENGTH * startupProgress;
    // Calculate angular acceleration (for centrifugal effect)
    var angularAcceleration = boardAngularVelocity - prevAngularVelocity;
    // Apply angular velocity to rotation
    boardRotation += boardAngularVelocity * deltaTime / 16; // Time-based update
    // Keep rotation within 0-2π range for easier calculations
    boardRotation = boardRotation % (Math.PI * 2);
    if (boardRotation < 0)
        boardRotation += Math.PI * 2;
    // Box boundaries - using FULL box width for falling out
    var boxLeft = -BOX_WIDTH / 2;
    var boxRight = BOX_WIDTH / 2;
    var boxTop = -BOX_HEIGHT / 2 + NAME_PADDING;
    var boxBottom = BOX_HEIGHT / 2 - NAME_PADDING;
    // Calculate additional gravity components based on rotation
    var gravityX = Math.sin(boardRotation);
    var gravityY = Math.cos(boardRotation);
    // Update letters physics
    for (var _i = 0, letters_3 = letters; _i < letters_3.length; _i++) {
        var letter = letters_3[_i];
        if (!letter.active) {
            // Handle falling letters in world space - only affected by gravity
            letter.vy += GRAVITY; // Gravity for falling
            letter.worldX += letter.vx;
            letter.worldY += letter.vy;
            // Remove letters that fall off screen
            if (letter.worldY > CANVAS_HEIGHT) {
                letter.worldY = CANVAS_HEIGHT * 2; // Move far away
            }
            continue;
        }
        // Apply gravity based on tilt for active letters (scaled by startup progress)
        var gravityFactor = startupProgress * 2;
        letter.vx += gravityX * letter.gravity * gravityFactor;
        letter.vy += gravityY * letter.gravity * gravityFactor;
        // CENTRIFUGAL FORCE: Calculate distance from center
        var distanceX = letter.x;
        var distanceY = letter.y;
        var distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        if (distance > 0) {
            // Direction vector pointing outward from center
            var dirX = distanceX / distance;
            var dirY = distanceY / distance;
            // Centrifugal force = mass * radius * angular_velocity^2
            // Angular velocity squared - stronger effect for faster rotation
            var centrifugalStrength = CENTRIFUGAL_FORCE * distance * boardAngularVelocity * boardAngularVelocity * letter.gravity;
            // Apply centrifugal force - scaled by startup progress
            letter.vx += dirX * centrifugalStrength * startupProgress;
            letter.vy += dirY * centrifugalStrength * startupProgress;
            // Additional force from angular acceleration (like being pushed sideways during acceleration)
            var tangentialX = -dirY;
            var tangentialY = dirX;
            var tangentialForce = angularAcceleration * distance * letter.gravity * 5;
            letter.vx += tangentialX * tangentialForce * startupProgress;
            letter.vy += tangentialY * tangentialForce * startupProgress;
        }
        // Apply friction (reduced for faster sliding)
        letter.vx *= LETTER_FRICTION;
        letter.vy *= LETTER_FRICTION;
        // Update position
        letter.x += letter.vx;
        letter.y += letter.vy;
        // Check boundaries - ONLY ALLOW FALLING FROM SHORT ENDS (left/right)
        // CRITICAL CHANGE: Allow letters to extend half their width past the box edge
        // Left boundary - allow falling out when letter is half past the box edge
        if (letter.x + letter.width / 2 < boxLeft) {
            // Calculate world position for falling letter
            var worldX = boardCenterX + letter.x * Math.cos(boardRotation) - letter.y * Math.sin(boardRotation);
            var worldY = boardCenterY + letter.x * Math.sin(boardRotation) + letter.y * Math.cos(boardRotation);
            // Calculate exit velocity with better momentum preservation
            var worldVX = letter.vx * Math.cos(boardRotation) - letter.vy * Math.sin(boardRotation);
            var worldVY = letter.vx * Math.sin(boardRotation) + letter.vy * Math.cos(boardRotation);
            // Letter falls out from left edge
            letter.active = false;
            letter.worldX = worldX;
            letter.worldY = worldY;
            // Better preserve horizontal velocity
            letter.vx = worldVX * EXIT_VELOCITY_PRESERVATION;
            letter.vy = worldVY * EXIT_VELOCITY_PRESERVATION;
            continue;
        }
        // Right boundary - allow falling out when letter is half past the box edge
        if (letter.x - letter.width / 2 > boxRight) {
            // Calculate world position for falling letter
            var worldX = boardCenterX + letter.x * Math.cos(boardRotation) - letter.y * Math.sin(boardRotation);
            var worldY = boardCenterY + letter.x * Math.sin(boardRotation) + letter.y * Math.cos(boardRotation);
            // Calculate exit velocity with better momentum preservation
            var worldVX = letter.vx * Math.cos(boardRotation) - letter.vy * Math.sin(boardRotation);
            var worldVY = letter.vx * Math.sin(boardRotation) + letter.vy * Math.cos(boardRotation);
            // Letter falls out from right edge
            letter.active = false;
            letter.worldX = worldX;
            letter.worldY = worldY;
            // Better preserve horizontal velocity
            letter.vx = worldVX * EXIT_VELOCITY_PRESERVATION;
            letter.vy = worldVY * EXIT_VELOCITY_PRESERVATION;
            continue;
        }
        // Top boundary - ALWAYS BOUNCE (treat as enclosed side regardless of rotation)
        if (letter.y - letter.height / 2 < boxTop) {
            letter.y = boxTop + letter.height / 2;
            letter.vy = Math.abs(letter.vy) * 0.5; // Bounce with dampening
        }
        // Bottom boundary - ALWAYS BOUNCE (treat as enclosed side regardless of rotation)
        if (letter.y + letter.height / 2 > boxBottom) {
            letter.y = boxBottom - letter.height / 2;
            letter.vy = -Math.abs(letter.vy) * 0.5; // Bounce with dampening
        }
    }
    // No auto-restart - game continues with empty board when all letters fall
}
function handleKeyDown(e) {
    if (e.key === "ArrowLeft" || e.key === "a")
        keyLeft = true;
    if (e.key === "ArrowRight" || e.key === "d")
        keyRight = true;
}
function handleKeyUp(e) {
    if (e.key === "ArrowLeft" || e.key === "a")
        keyLeft = false;
    if (e.key === "ArrowRight" || e.key === "d")
        keyRight = false;
}
function resizeCanvas() {
    CANVAS_WIDTH = window.innerWidth;
    CANVAS_HEIGHT = window.innerHeight;
    if (canvas) {
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
    }
    boardCenterX = CANVAS_WIDTH / 2;
}
function gameLoop(timestamp) {
    // Calculate delta time
    var deltaTime = lastFrameTime ? timestamp - lastFrameTime : 16;
    lastFrameTime = timestamp;
    if (!gameActive) {
        drawLobby(ctx);
        return;
    }
    updatePhysics(deltaTime);
    drawGame(ctx);
}
function main() {
    canvas = document.createElement("canvas");
    resizeCanvas();
    document.body.style.background = CANVAS_BG_COLOR;
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("resize", function () {
        resizeCanvas();
        if (gameActive) {
            // Recalculate board center on resize
            boardCenterY = boxTop + BOX_HEIGHT / 2;
        }
    });
    // Start in lobby mode
    drawLobby(ctx);
    // Start game after a short delay
    setTimeout(function () {
        gameActive = true;
        gameStart = performance.now();
        // Start completely horizontal with very tiny velocity
        boardRotation = INITIAL_TILT;
        boardAngularVelocity = INITIAL_TILT_VELOCITY;
        initializeLetters();
    }, 1000);
    function loop(timestamp) {
        gameLoop(timestamp);
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}
main();
