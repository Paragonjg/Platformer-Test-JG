// Game configuration
const config = {
    type: Phaser.AUTO,
    parent: 'game',
    width: 800,
    height: 800,  // Increased from 600 to 800 for more vertical space
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Initialize the game
const game = new Phaser.Game(config);

// Game variables
let player;
let platforms;
let cursors;
let coins;
let enemies;
let score = 0;
let scoreText;
let targetScore = 100;
let targetScoreText;
let gameOver = false;
let gameWon = false;
let worldWidth = 3200; // 4 screen widths
let timeLeft = 30;
let timeText;
let countdownTimer;
let backgroundMusic;

function preload() {
    // Load images
    this.load.image('sky', 'https://labs.phaser.io/assets/skies/space3.png');
    this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
    this.load.spritesheet('coin', 
        'https://labs.phaser.io/assets/sprites/coin.png',
        { frameWidth: 32, frameHeight: 32 }
    );
    this.load.spritesheet('dude', 
        'https://labs.phaser.io/assets/sprites/dude.png',
        { frameWidth: 32, frameHeight: 48 }
    );

    // Load background music
    this.load.audio('bgMusic', 'https://labs.phaser.io/assets/audio/cyber-city.mp3');

    // Create rock platform texture
    const platformGraphics = this.add.graphics();
    
    // Main platform body (light grey)
    platformGraphics.fillStyle(0xb8b8b8, 1);
    platformGraphics.fillRect(0, 0, 400, 32);
    
    // Add darker edges for depth
    platformGraphics.fillStyle(0x999999, 1);
    platformGraphics.fillRect(0, 0, 400, 4);  // Top edge
    platformGraphics.fillRect(0, 28, 400, 4); // Bottom edge
    platformGraphics.fillRect(0, 0, 4, 32);   // Left edge
    platformGraphics.fillRect(396, 0, 4, 32); // Right edge
    
    // Add some subtle texture details
    platformGraphics.fillStyle(0xa8a8a8, 1);
    for (let i = 0; i < 20; i++) {
        // Random small rectangles for texture
        const x = Phaser.Math.Between(20, 380);
        const y = Phaser.Math.Between(8, 24);
        const width = Phaser.Math.Between(20, 40);
        const height = Phaser.Math.Between(2, 6);
        platformGraphics.fillRect(x, y, width, height);
    }

    // Generate platform texture
    platformGraphics.generateTexture('rockPlatform', 400, 32);
    platformGraphics.destroy();

    // Create enemy texture using graphics (Goomba-like)
    const graphics = this.add.graphics();
    
    // Draw body (brown mushroom shape)
    graphics.fillStyle(0x8B4513, 1);  // Brown color
    graphics.fillRect(4, 16, 24, 16);  // Body
    graphics.fillEllipse(16, 16, 32, 24);  // Head/cap

    // Add feet
    graphics.fillStyle(0x000000, 1);  // Black color
    graphics.fillRect(4, 28, 10, 4);  // Left foot
    graphics.fillRect(18, 28, 10, 4);  // Right foot

    // Add eyes
    graphics.fillStyle(0xFFFFFF, 1);  // White color
    graphics.fillCircle(10, 20, 4);   // Left eye white
    graphics.fillCircle(22, 20, 4);   // Right eye white
    
    graphics.fillStyle(0x000000, 1);  // Black color
    graphics.fillCircle(10, 20, 2);   // Left eye pupil
    graphics.fillCircle(22, 20, 2);   // Right eye pupil

    // Add angry eyebrows
    graphics.lineStyle(2, 0x000000);
    graphics.beginPath();
    graphics.moveTo(6, 14);
    graphics.lineTo(14, 16);
    graphics.moveTo(18, 16);
    graphics.lineTo(26, 14);
    graphics.strokePath();

    // Generate texture
    graphics.generateTexture('enemy', 32, 32);
    graphics.destroy();
}

// Set up the game world
function create() {
    // Add repeating background
    for (let i = 0; i < worldWidth/800; i++) {
        this.add.image(400 + (i * 800), 400, 'sky').setScale(1, 1.33);
    }

    // Set world bounds
    this.physics.world.setBounds(0, 0, worldWidth, 800);

    // Create platforms group
    platforms = this.physics.add.staticGroup();

    // Create ground across entire world width (keep original texture)
    for (let i = 0; i < worldWidth/400; i++) {
        platforms.create(400 + (i * 800), 768, 'ground').setScale(2).refreshBody();
    }

    // Create platforms with rock texture
    // Lower platforms
    platforms.create(600, 600, 'rockPlatform');
    platforms.create(1300, 600, 'rockPlatform');
    platforms.create(1900, 600, 'rockPlatform');
    platforms.create(2500, 600, 'rockPlatform');

    // Middle height platforms
    platforms.create(200, 450, 'rockPlatform');
    platforms.create(800, 450, 'rockPlatform');
    platforms.create(2200, 450, 'rockPlatform');

    // Higher platforms
    platforms.create(450, 300, 'rockPlatform');
    platforms.create(1050, 300, 'rockPlatform');
    platforms.create(1600, 300, 'rockPlatform');
    platforms.create(2750, 300, 'rockPlatform');

    // Create player with gravity
    player = this.physics.add.sprite(100, 450, 'dude');
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);
    player.body.setGravityY(300);

    // Set up camera to follow player
    this.cameras.main.setBounds(0, 0, worldWidth, 800);
    this.cameras.main.startFollow(player, true, 0.5, 0.5);

    // Create score text that stays fixed on screen
    scoreText = this.add.text(16, 16, 'Score: 0', { 
        fontSize: '32px', 
        fill: '#fff',
        fontFamily: 'Arial'
    }).setScrollFactor(0);  // Make score stay fixed on screen

    // Create target score text that stays fixed on screen
    targetScoreText = this.add.text(16, 48, 'Target Score: 100', { 
        fontSize: '32px', 
        fill: '#fff',
        fontFamily: 'Arial'
    }).setScrollFactor(0);

    // Create timer text
    timeText = this.add.text(16, 80, 'Time: ' + timeLeft, {
        fontSize: '32px',
        fill: '#fff',
        fontFamily: 'Arial'
    }).setScrollFactor(0);

    // Create game over text (hidden by default)
    this.gameOverText = this.add.text(400, 300, 'Game Over\nClick to restart', {
        fontSize: '64px',
        fill: '#fff',
        fontFamily: 'Arial',
        align: 'center'
    }).setScrollFactor(0).setOrigin(0.5);
    this.gameOverText.visible = false;

    // Create win text (hidden by default)
    this.winText = this.add.text(400, 300, 'You Win!\nClick to restart', {
        fontSize: '64px',
        fill: '#fff',
        fontFamily: 'Arial',
        align: 'center'
    }).setScrollFactor(0).setOrigin(0.5);
    this.winText.visible = false;

    // Player animations
    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'turn',
        frames: [{ key: 'dude', frame: 4 }],
        frameRate: 20
    });

    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    // Create enemies group
    enemies = this.physics.add.group();

    // Create initial enemies - adjust positions to match new platform positions
    createEnemy.call(this, 600, 550, 500, 700);     // Lower platform enemy
    createEnemy.call(this, 200, 400, 100, 300);     // Middle platform enemy
    createEnemy.call(this, 450, 250, 350, 550);     // Upper platform enemy

    // Create additional enemies on new platforms - adjusted positions
    createEnemy.call(this, 800, 400, 700, 900);     // Middle platform enemy
    createEnemy.call(this, 1050, 250, 950, 1150);   // Upper platform enemy
    createEnemy.call(this, 1300, 550, 1200, 1400);  // Lower platform enemy
    createEnemy.call(this, 1600, 250, 1500, 1700);  // Upper platform enemy
    createEnemy.call(this, 1900, 550, 1800, 2000);  // Lower platform enemy
    createEnemy.call(this, 2200, 400, 2100, 2300);  // Middle platform enemy
    createEnemy.call(this, 2500, 550, 2400, 2600);  // Lower platform enemy
    createEnemy.call(this, 2750, 250, 2650, 2850);  // Upper platform enemy

    // Create coins group
    coins = this.physics.add.group();

    // Helper function to create coins
    function createCoin(x, y) {
        const coin = coins.create(x, y, 'coin');
        coin.setScale(0.8);
        coin.body.setAllowGravity(false);
        coin.setImmovable(true);
        
        this.tweens.add({
            targets: coin,
            y: y - 10,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.tweens.add({
            targets: coin,
            angle: 360,
            duration: 1500,
            repeat: -1,
            ease: 'Linear'
        });
    }

    // Create initial coins - adjust positions
    createCoin.call(this, 600, 550);  // Above lower platform
    createCoin.call(this, 200, 400);  // Above middle platform
    createCoin.call(this, 450, 250);  // Above upper platform
    createCoin.call(this, 300, 650);  // Single ground coin, spaced out
    createCoin.call(this, 700, 650);  // Single ground coin, spaced out

    // Create additional coins throughout the level - adjusted positions
    createCoin.call(this, 800, 400);   // Above middle platform
    createCoin.call(this, 1050, 250);  // Above upper platform
    createCoin.call(this, 1300, 550);  // Above lower platform
    createCoin.call(this, 1600, 250);  // Above upper platform
    createCoin.call(this, 1900, 550);  // Above lower platform
    createCoin.call(this, 2200, 400);  // Above middle platform
    createCoin.call(this, 2500, 550);  // Above lower platform
    createCoin.call(this, 2750, 250);  // Above upper platform

    // Just a few strategic extra coins on harder-to-reach platforms
    createCoin.call(this, 1150, 250);  // Extra upper platform coin
    createCoin.call(this, 2000, 550);  // Extra lower platform coin

    // Add collisions
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(enemies, platforms);

    // Add overlaps
    this.physics.add.overlap(player, coins, collectCoin, null, this);
    this.physics.add.overlap(player, enemies, hitEnemy, null, this);

    // Set up keyboard input
    cursors = this.input.keyboard.createCursorKeys();

    // Start countdown timer
    countdownTimer = this.time.addEvent({
        delay: 1000,
        callback: updateTimer,
        callbackScope: this,
        loop: true
    });

    // Add background music
    try {
        backgroundMusic = this.sound.add('bgMusic', {
            volume: 0.2,
            loop: true
        });
        backgroundMusic.play();
    } catch (error) {
        console.log('Error playing background music:', error);
    }

    // Modify restart handler
    this.input.on('pointerdown', function() {
        if (gameOver || gameWon) {
            timeLeft = 30;  // Reset timer
            score = 0;     // Reset score
            if (backgroundMusic) {
                backgroundMusic.stop();
            }
            this.scene.restart();
            gameOver = false;
            gameWon = false;
        }
    }, this);
}

// Create enemy function
function createEnemy(x, y, leftBound, rightBound) {
    const enemy = enemies.create(x, y, 'enemy');
    enemy.setCollideWorldBounds(false);  // Disable world bounds collision
    enemy.setVelocityX(100);
    enemy.leftBound = leftBound;
    enemy.rightBound = rightBound;
    
    // Add walking animation
    this.tweens.add({
        targets: enemy,
        y: y - 4,  // Smaller bounce height
        duration: 300,
        yoyo: true,
        repeat: -1,
        ease: 'Quad.easeInOut'
    });
}

// Game loop
function update() {
    if (gameOver || gameWon) {
        return;
    }

    // Handle player movement
    if (cursors.left.isDown) {
        player.setVelocityX(-160);
        player.anims.play('left', true);
    } else if (cursors.right.isDown) {
        player.setVelocityX(160);
        player.anims.play('right', true);
    } else {
        player.setVelocityX(0);
        player.anims.play('turn');
    }

    // Handle jumping
    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-460);
    }

    // Update enemy movement with strict boundary enforcement
    enemies.children.iterate(function(enemy) {
        // Check if enemy has reached bounds and reverse direction
        if (enemy.x <= enemy.leftBound) {
            enemy.setVelocityX(100);
            enemy.x = enemy.leftBound + 1;  // Prevent sticking at boundary
            enemy.flipX = false;
        } else if (enemy.x >= enemy.rightBound) {
            enemy.setVelocityX(-100);
            enemy.x = enemy.rightBound - 1;  // Prevent sticking at boundary
            enemy.flipX = true;
        }
    });
}

// Timer update function
function updateTimer() {
    if (gameOver || gameWon) {
        return;
    }

    timeLeft--;
    timeText.setText('Time: ' + timeLeft);

    if (timeLeft <= 0) {
        gameOver = true;
        this.physics.pause();
        player.setTint(0xff0000);
        this.gameOverText.setText('Time Up!\nClick to restart');
        this.gameOverText.visible = true;
        countdownTimer.remove();
        if (backgroundMusic) {
            backgroundMusic.stop();
        }
    }
}

// Coin collection function
function collectCoin(player, coin) {
    coin.destroy();
    score += 10;
    scoreText.setText('Score: ' + score);

    // Check for win condition
    if (score >= targetScore && !gameWon) {
        gameWon = true;
        this.physics.pause();
        this.winText.visible = true;
        countdownTimer.remove();
        if (backgroundMusic) {
            backgroundMusic.stop();
        }
    }
}

// Enemy collision function
function hitEnemy(player, enemy) {
    this.physics.pause();
    player.setTint(0xff0000);
    player.anims.play('turn');
    gameOver = true;
    this.gameOverText.visible = true;
    if (backgroundMusic) {
        backgroundMusic.stop();
    }
} 