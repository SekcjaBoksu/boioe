export function createGame({
    canvas,
    heartsContainer,
    coinsElement,
    killsElement,
    onGameOver
}) {
    const ctx = canvas.getContext('2d');
    const gameOverHandler = typeof onGameOver === 'function' ? onGameOver : () => {};
    const BASE_CANVAS_WIDTH = canvas.width || 600;
    const BASE_CANVAS_HEIGHT = canvas.height || 500;

    // Game state
    let gameRunning = false;
    let coins = 0;
    let kills = 0;

    // Player
    let player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 18,
        speed: 3,
        health: 6,
        maxHealth: 6,
        color: '#667eea',
        invulnerable: false,
        invulnerableTime: 0
    };

    // Input
    let keys = {};
    let shootKeys = {
        up: false,
        down: false,
        left: false,
        right: false
    };

    // Projectiles
    let projectiles = [];
    let projectileSpeed = 6;
    let shootCooldown = 0;
    let shootDelay = 15; // frames between shots
    
    // Weapon heat system
    let weaponHeat = 0;
    let maxHeat = 100;
    let heatPerShot = 15;
    let cooldownRate = 1; // heat reduction per frame
    let overheated = false;

    // Enemies
    let enemies = [];
    let enemySpawnTimer = 0;
    let enemySpawnRate = 120; // frames
    let baseSpawnRate = 120;
    let minSpawnRate = 30; // Maksymalna trudność
    let difficultyTimer = 0;
    
    // Enemy projectiles
    let enemyProjectiles = [];

    function shadeColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        let r = (num >> 16) + amt;
        let g = ((num >> 8) & 0x00ff) + amt;
        let b = (num & 0x0000ff) + amt;
        r = Math.max(Math.min(255, r), 0);
        g = Math.max(Math.min(255, g), 0);
        b = Math.max(Math.min(255, b), 0);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    // Coins/Helmets
    let helmets = [];
    
    // Particle effects
    let particles = [];
    
    // Hitmarkers
    let hitmarkers = [];
    
    // Powerups
    let powerups = [];
    let ak47Active = false;
    let ak47Timer = 0;
    let pentagramActive = false;
    let pentagramTimer = 0;
    let homingActive = false;
    let homingTimer = 0;
    
    // Dopamine mechanics
    let comboCount = 0;
    let comboTimer = 0;
    let comboMultiplier = 1;
    let screenShakeIntensity = 0;
    let slowMotionTimer = 0;
    let flashTimer = 0;
    let killStreak = 0;
    let lastKillTime = 0;

    // Create text popup
    let textPopups = [];

    // Initialize hearts display
    function updateHeartsDisplay() {
        heartsContainer.innerHTML = '';
        for (let i = 0; i < player.maxHealth; i++) {
            const heart = document.createElement('div');
            heart.className = i < player.health ? 'heart' : 'heart empty';
            heartsContainer.appendChild(heart);
        }
    }
    
    // Create hit particles
    function createHitParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const speed = 2 + Math.random() * 3;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 30,
                maxLife: 30,
                size: 3 + Math.random() * 3,
                color: color
            });
        }
    }
    
    // Create hitmarker
    function createHitmarker(x, y, isKill = false) {
        hitmarkers.push({
            x: x,
            y: y,
            life: 20,
            maxLife: 20,
            isKill: isKill
        });
    }
    
    // Draw hitmarker (X shape)
    function drawHitmarker(hitmarker) {
        const alpha = hitmarker.life / hitmarker.maxLife;
        const size = 15 + (1 - alpha) * 5; // Grows as it fades
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = hitmarker.isKill ? '#FFD700' : 'white';
        ctx.lineWidth = hitmarker.isKill ? 4 : 3;
        ctx.lineCap = 'round';
        
        // X shape
        ctx.beginPath();
        ctx.moveTo(hitmarker.x - size, hitmarker.y - size);
        ctx.lineTo(hitmarker.x + size, hitmarker.y + size);
        ctx.moveTo(hitmarker.x + size, hitmarker.y - size);
        ctx.lineTo(hitmarker.x - size, hitmarker.y + size);
        ctx.stroke();
        
        // Circle around kill marker
        if (hitmarker.isKill) {
            ctx.beginPath();
            ctx.arc(hitmarker.x, hitmarker.y, size * 1.5, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    // Update hitmarkers
    function updateHitmarkers() {
        hitmarkers.forEach((hitmarker, index) => {
            hitmarker.life--;
            if (hitmarker.life <= 0) {
                hitmarkers.splice(index, 1);
            }
        });
    }
    
    // Draw particle
    function drawParticle(particle) {
        const alpha = particle.life / particle.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    // Update particles
    function updateParticles() {
        particles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.95;
            particle.vy *= 0.95;
            particle.life--;
            
            if (particle.life <= 0) {
                particles.splice(index, 1);
            }
        });
    }
    
    // Draw weapon heat gauge
    function drawHeatGauge() {
        const gaugeWidth = 200;
        const gaugeHeight = 20;
        const x = canvas.width / 2 - gaugeWidth / 2;
        const y = canvas.height - 40;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x - 2, y - 2, gaugeWidth + 4, gaugeHeight + 4);
        
        // Border
        ctx.strokeStyle = overheated ? '#FF3333' : '#667eea';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 2, y - 2, gaugeWidth + 4, gaugeHeight + 4);
        
        // Heat bar
        const heatPercent = weaponHeat / maxHeat;
        const barWidth = gaugeWidth * heatPercent;
        
        // Gradient based on heat level
        const gradient = ctx.createLinearGradient(x, y, x + gaugeWidth, y);
        if (overheated) {
            gradient.addColorStop(0, '#FF3333');
            gradient.addColorStop(1, '#FF0000');
        } else if (heatPercent > 0.8) {
            gradient.addColorStop(0, '#FF8C42');
            gradient.addColorStop(1, '#FF3333');
        } else if (heatPercent > 0.5) {
            gradient.addColorStop(0, '#FFD700');
            gradient.addColorStop(1, '#FF8C42');
        } else {
            gradient.addColorStop(0, '#4ECDC4');
            gradient.addColorStop(1, '#667eea');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, gaugeHeight);
        
        // Overheat warning
        if (overheated) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PRZEGRZANIE!', canvas.width / 2, y - 10);
        }
        
        // Heat segments
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 5; i++) {
            const segmentX = x + (gaugeWidth / 5) * i;
            ctx.beginPath();
            ctx.moveTo(segmentX, y);
            ctx.lineTo(segmentX, y + gaugeHeight);
            ctx.stroke();
        }
    }

    // Draw player
    function drawPlayer() {
        ctx.save();
        
        // Flashing when invulnerable
        if (player.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        // Pentagram effect
        if (pentagramActive) {
            // Red demonic aura
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 30;
            
            // Particles around player
            for (let i = 0; i < 3; i++) {
                const angle = (Date.now() / 500 + i * Math.PI * 2 / 3);
                const distance = 25 + Math.sin(Date.now() / 200) * 5;
                const px = player.x + Math.cos(angle) * distance;
                const py = player.y + Math.sin(angle) * distance;
                
                ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.beginPath();
                ctx.arc(px, py, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Walking animation
        const walkCycle = Math.sin(Date.now() / 100) * 3;
        
        // Size multiplier for pentagram
        const sizeMultiplier = pentagramActive ? 1.3 : 1;
        const actualRadius = player.radius * sizeMultiplier;
        
        // Player color based on pentagram
        const playerColor = pentagramActive ? '#8B0000' : player.color;
        const accentColor = pentagramActive ? '#FF0000' : '#4A5FC1';
        
        // Legs
        ctx.fillStyle = pentagramActive ? '#6B0000' : '#4A5FC1';
        ctx.strokeStyle = pentagramActive ? '#8B0000' : '#2c3e80';
        ctx.lineWidth = 2;
        
        // Left leg
        ctx.beginPath();
        ctx.ellipse(player.x - 6 * sizeMultiplier, player.y + actualRadius - 5 + walkCycle, 4 * sizeMultiplier, 10 * sizeMultiplier, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Right leg
        ctx.beginPath();
        ctx.ellipse(player.x + 6 * sizeMultiplier, player.y + actualRadius - 5 - walkCycle, 4 * sizeMultiplier, 10 * sizeMultiplier, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Body (circle with gradient)
        const gradient = ctx.createRadialGradient(
            player.x - 5, player.y - 5, 3,
            player.x, player.y, actualRadius
        );
        if (pentagramActive) {
            gradient.addColorStop(0, '#C41E3A');
            gradient.addColorStop(1, playerColor);
        } else {
            gradient.addColorStop(0, '#8B9FEE');
            gradient.addColorStop(1, playerColor);
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(player.x, player.y, actualRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Arms
        ctx.fillStyle = pentagramActive ? '#8B0000' : '#667eea';
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        
        // Left arm
        ctx.beginPath();
        ctx.ellipse(player.x - actualRadius + 2, player.y + 5 - walkCycle, 6 * sizeMultiplier, 4 * sizeMultiplier, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Right arm
        ctx.beginPath();
        ctx.ellipse(player.x + actualRadius - 2, player.y + 5 + walkCycle, 6 * sizeMultiplier, 4 * sizeMultiplier, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Eyes
        const eyeColor = pentagramActive ? '#FFD700' : 'white';
        const pupilColor = pentagramActive ? '#FF0000' : 'black';
        
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(player.x - 6 * sizeMultiplier, player.y - 4, 5 * sizeMultiplier, 0, Math.PI * 2);
        ctx.arc(player.x + 6 * sizeMultiplier, player.y - 4, 5 * sizeMultiplier, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils
        ctx.fillStyle = pupilColor;
        ctx.beginPath();
        ctx.arc(player.x - 6 * sizeMultiplier, player.y - 4, 3 * sizeMultiplier, 0, Math.PI * 2);
        ctx.arc(player.x + 6 * sizeMultiplier, player.y - 4, 3 * sizeMultiplier, 0, Math.PI * 2);
        ctx.fill();
        
        // Mouth (evil grin when pentagram active)
        ctx.strokeStyle = pupilColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (pentagramActive) {
            // Evil grin
            ctx.arc(player.x, player.y + 4, 8 * sizeMultiplier, 0.2, Math.PI - 0.2);
        } else {
            // Normal smile
            ctx.arc(player.x, player.y + 4, 6, 0, Math.PI);
        }
        ctx.stroke();
        
        // Horns when pentagram active
        if (pentagramActive) {
            ctx.fillStyle = '#8B0000';
            ctx.strokeStyle = '#6B0000';
            ctx.lineWidth = 2;
            
            // Left horn
            ctx.beginPath();
            ctx.moveTo(player.x - 12, player.y - actualRadius + 5);
            ctx.quadraticCurveTo(player.x - 15, player.y - actualRadius - 5, player.x - 10, player.y - actualRadius - 10);
            ctx.lineTo(player.x - 8, player.y - actualRadius - 8);
            ctx.quadraticCurveTo(player.x - 12, player.y - actualRadius - 3, player.x - 10, player.y - actualRadius + 5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Right horn
            ctx.beginPath();
            ctx.moveTo(player.x + 12, player.y - actualRadius + 5);
            ctx.quadraticCurveTo(player.x + 15, player.y - actualRadius - 5, player.x + 10, player.y - actualRadius - 10);
            ctx.lineTo(player.x + 8, player.y - actualRadius - 8);
            ctx.quadraticCurveTo(player.x + 12, player.y - actualRadius - 3, player.x + 10, player.y - actualRadius + 5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        
        ctx.restore();
    }

    // Draw projectile (tear)
    function drawProjectile(proj) {
        if (proj.isHoming) {
            // Homing missile - green with trail
            ctx.save();
            
            // Trail effect
            ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            for (let i = 1; i <= 4; i++) {
                const trailX = proj.x - proj.vx * i * 0.3;
                const trailY = proj.y - proj.vy * i * 0.3;
                ctx.beginPath();
                ctx.arc(trailX, trailY, 6 - i, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Missile body
            const angle = Math.atan2(proj.vy, proj.vx);
            ctx.translate(proj.x, proj.y);
            ctx.rotate(angle);
            
            // Missile shape
            ctx.fillStyle = '#00FF00';
            ctx.strokeStyle = '#00AA00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(-6, -4);
            ctx.lineTo(-6, 4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Exhaust flames
            ctx.fillStyle = '#FFAA00';
            ctx.beginPath();
            ctx.moveTo(-6, -2);
            ctx.lineTo(-10 - Math.random() * 3, 0);
            ctx.lineTo(-6, 2);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        } else if (proj.isAK47) {
            // AK-47 bullet - golden
            ctx.fillStyle = '#FFD700';
            ctx.strokeStyle = '#FF8C00';
            ctx.lineWidth = 2;
            
            // Bullet shape
            ctx.beginPath();
            ctx.ellipse(proj.x, proj.y, 7, 3, Math.atan2(proj.vy, proj.vx), 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Trail
            ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            for (let i = 1; i <= 3; i++) {
                const trailX = proj.x - proj.vx * i * 0.5;
                const trailY = proj.y - proj.vy * i * 0.5;
                ctx.beginPath();
                ctx.arc(trailX, trailY, 4 - i, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Normal tear
            ctx.fillStyle = pentagramActive ? '#FF0000' : '#4ECDC4';
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, pentagramActive ? 7 : 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(proj.x - 2, proj.y - 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw enemy projectile
    function drawEnemyProjectile(proj) {
        const baseColor = proj.color || '#9b59b6';
        const strokeColor = proj.color ? shadeColor(proj.color, -25) : '#6C3483';
        const innerColor = proj.color ? shadeColor(proj.color, 40) : '#BB8FCE';
        const radius = proj.radius ?? 6;
        
        ctx.fillStyle = baseColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Inner glow
        ctx.fillStyle = innerColor;
        ctx.beginPath();
        ctx.arc(proj.x - radius * 0.33, proj.y - radius * 0.33, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw enemy
    function drawEnemy(enemy) {
        ctx.save();
        
        // Hit flash effect
        if (enemy.hitFlash && enemy.hitFlash > 0) {
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 15;
            enemy.hitFlash--;
        }
        
        // Floating animation
        const float = Math.sin(Date.now() / 300 + enemy.x) * 2;
        const actualY = enemy.y + float;
        
        if (enemy.type === 'shooter') {
            // SHOOTER - fioletowy strzelający przeciwnik
            
            // Charging indicator
            const chargePercent = (enemy.shootCooldown - enemy.shootTimer) / enemy.shootCooldown;
            if (chargePercent > 0.7) {
                const pulseSize = Math.sin(Date.now() / 50) * 3;
                ctx.strokeStyle = `rgba(155, 89, 182, ${chargePercent})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(enemy.x, actualY, enemy.radius + 8 + pulseSize, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            // Warning lines when about to shoot
            if (chargePercent > 0.85) {
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 2;
                for (let i = 0; i < 4; i++) {
                    const angle = (Math.PI * 2 * i) / 4 + Date.now() / 200;
                    ctx.beginPath();
                    ctx.moveTo(enemy.x, actualY);
                    ctx.lineTo(
                        enemy.x + Math.cos(angle) * 30,
                        actualY + Math.sin(angle) * 30
                    );
                    ctx.stroke();
                }
            }
            
            // Body - gradient purple
            const gradient = ctx.createRadialGradient(
                enemy.x - 5, actualY - 5, 3,
                enemy.x, actualY, enemy.radius
            );
            gradient.addColorStop(0, '#BB8FCE');
            gradient.addColorStop(1, enemy.color);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(enemy.x, actualY, enemy.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Border
            ctx.strokeStyle = '#6C3483';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Gun barrels (3 tubes)
            ctx.fillStyle = '#2c3e50';
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 2;
            
            for (let i = -1; i <= 1; i++) {
                const gunY = actualY + i * 6;
                ctx.fillRect(enemy.x + enemy.radius - 5, gunY - 2, 12, 4);
                ctx.strokeRect(enemy.x + enemy.radius - 5, gunY - 2, 12, 4);
            }
            
            // Eyes (menacing)
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(enemy.x - 5, actualY - 4, 5, 0, Math.PI * 2);
            ctx.arc(enemy.x + 5, actualY - 4, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#8B0000';
            ctx.beginPath();
            ctx.arc(enemy.x - 5, actualY - 4, 2.5, 0, Math.PI * 2);
            ctx.arc(enemy.x + 5, actualY - 4, 2.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Antenna
            ctx.strokeStyle = '#9b59b6';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(enemy.x, actualY - enemy.radius);
            ctx.lineTo(enemy.x, actualY - enemy.radius - 8);
            ctx.stroke();
            
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(enemy.x, actualY - enemy.radius - 8, 3, 0, Math.PI * 2);
            ctx.fill();
            
        } else if (enemy.type === 'speeder') {
            // SPEEDER - szybki zielony przeciwnik
        
            // Energia/aura wokół speedera
            const pulseSize = Math.sin(Date.now() / 100) * 3;
            ctx.strokeStyle = 'rgba(46, 204, 113, 0.5)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(enemy.x, actualY, enemy.radius + 5 + pulseSize, 0, Math.PI * 2);
            ctx.stroke();
            
            // Speed lines (ślady ruchu)
            ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
            ctx.lineWidth = 2;
            for (let i = 1; i <= 3; i++) {
                const offsetX = (player.x - enemy.x) * -0.1 * i;
                const offsetY = (player.y - enemy.y) * -0.1 * i;
                ctx.beginPath();
                ctx.arc(enemy.x + offsetX, actualY + offsetY, enemy.radius - i, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            // Body
            const gradient = ctx.createRadialGradient(
                enemy.x - 5, actualY - 5, 3,
                enemy.x, actualY, enemy.radius
            );
            gradient.addColorStop(0, '#A8E6CF');
            gradient.addColorStop(1, enemy.color);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(enemy.x, actualY, enemy.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Border
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Eyes (focused/aggressive)
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(enemy.x - 4, actualY - 3, 3, 0, Math.PI * 2);
            ctx.arc(enemy.x + 4, actualY - 3, 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(enemy.x - 4, actualY - 3, 1.5, 0, Math.PI * 2);
            ctx.arc(enemy.x + 4, actualY - 3, 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Lightning bolts around body
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 1.5;
            const boltCount = 3;
            for (let i = 0; i < boltCount; i++) {
                const angle = (Math.PI * 2 * i) / boltCount + Date.now() / 100;
                const startX = enemy.x + Math.cos(angle) * (enemy.radius + 2);
                const startY = actualY + Math.sin(angle) * (enemy.radius + 2);
                const endX = enemy.x + Math.cos(angle) * (enemy.radius + 8);
                const endY = actualY + Math.sin(angle) * (enemy.radius + 8);
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
            
        } else {
            // NORMAL FLY - czerwony zwykły przeciwnik
            
            // Wings/tentacles
            ctx.fillStyle = '#c0392b';
            ctx.strokeStyle = '#8B0000';
            ctx.lineWidth = 1;
            
            const wingFlap = Math.sin(Date.now() / 100) * 5;
            
            // Left wing
            ctx.beginPath();
            ctx.ellipse(enemy.x - enemy.radius + 3, actualY, 8, 4, -0.5 + wingFlap * 0.02, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Right wing
            ctx.beginPath();
            ctx.ellipse(enemy.x + enemy.radius - 3, actualY, 8, 4, 0.5 - wingFlap * 0.02, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Enemy body
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.arc(enemy.x, actualY, enemy.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Border
            ctx.strokeStyle = '#8B0000';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Eyes (angry)
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(enemy.x - 5, actualY - 3, 4, 0, Math.PI * 2);
            ctx.arc(enemy.x + 5, actualY - 3, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(enemy.x - 5, actualY - 3, 2, 0, Math.PI * 2);
            ctx.arc(enemy.x + 5, actualY - 3, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Angry eyebrows
            ctx.strokeStyle = '#8B0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(enemy.x - 8, actualY - 7);
            ctx.lineTo(enemy.x - 3, actualY - 5);
            ctx.moveTo(enemy.x + 8, actualY - 7);
            ctx.lineTo(enemy.x + 3, actualY - 5);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    // Draw combo counter and effects
    function drawComboEffects() {
        if (comboCount > 1) {
            const alpha = Math.min(comboTimer / 60, 1);
            const scale = 1 + (comboCount / 20);
            
            ctx.save();
            ctx.globalAlpha = alpha;
            
            // Combo text - below HUD
            const comboX = canvas.width / 2;
            const comboY = 140;
            
            // Shadow/glow
            ctx.shadowColor = comboCount >= 10 ? '#FFD700' : comboCount >= 5 ? '#FF6B35' : 'white';
            ctx.shadowBlur = 20 * scale;
            
            // Combo number
            ctx.fillStyle = comboCount >= 10 ? '#FFD700' : comboCount >= 5 ? '#FF6B35' : 'white';
            ctx.font = `bold ${40 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(`${comboCount}x COMBO!`, comboX, comboY);
            
            // Combo multiplier bonus
            if (comboMultiplier > 1) {
                ctx.font = `bold ${20}px Arial`;
                ctx.fillStyle = '#00FF00';
                ctx.fillText(`+${Math.floor((comboMultiplier - 1) * 100)}% COINS!`, comboX, comboY + 30);
            }
            
            // "GODLIKE" messages
            if (comboCount >= 20) {
                ctx.fillStyle = '#FF00FF';
                ctx.font = 'bold 35px Arial';
                ctx.fillText('🔥 UNSTOPPABLE! 🔥', comboX, comboY - 40);
            } else if (comboCount >= 15) {
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 30px Arial';
                ctx.fillText('⚡ GODLIKE! ⚡', comboX, comboY - 35);
            } else if (comboCount >= 10) {
                ctx.fillStyle = '#FF6B35';
                ctx.font = 'bold 25px Arial';
                ctx.fillText('💥 RAMPAGE! 💥', comboX, comboY - 30);
            } else if (comboCount >= 5) {
                ctx.fillStyle = '#FF8C42';
                ctx.font = 'bold 20px Arial';
                ctx.fillText('🎯 KILLING SPREE!', comboX, comboY - 25);
            }
            
            ctx.restore();
        }
        
        // Screen flash effect
        if (flashTimer > 0) {
            ctx.save();
            ctx.globalAlpha = flashTimer / 10;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
            flashTimer--;
        }
    }
    
    function createTextPopup(x, y, text, color, size = 20) {
        textPopups.push({
            x: x,
            y: y,
            text: text,
            color: color,
            size: size,
            life: 60,
            maxLife: 60,
            vy: -2
        });
    }
    
    // Draw and update text popups
    function updateTextPopups() {
        textPopups.forEach((popup, index) => {
            popup.y += popup.vy;
            popup.vy *= 0.95;
            popup.life--;
            
            if (popup.life <= 0) {
                textPopups.splice(index, 1);
            }
        });
    }
    
    function drawTextPopups() {
        textPopups.forEach(popup => {
            const alpha = popup.life / popup.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = popup.color;
            ctx.font = `bold ${popup.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.strokeText(popup.text, popup.x, popup.y);
            ctx.fillText(popup.text, popup.x, popup.y);
            ctx.restore();
        });
    }
    
    // Draw coin
    function drawHelmet(helmet) {
        const x = helmet.x;
        const y = helmet.y;
        const size = helmet.size;
        
        ctx.save();
        
        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#E5B100';
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(x, y, size / 2.5, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFEE88';
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(x - size * 0.15, y - size * 0.15, size * 0.15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowColor = 'transparent';
        ctx.restore();
    }
    
    // Draw powerup
    function drawPowerup(powerup) {
        const x = powerup.x;
        const y = powerup.y;
        const floatOffset = Math.sin(Date.now() / 300) * 5;
        const actualY = y + floatOffset;
        
        ctx.save();
        
        // Glow effect
        ctx.shadowColor = powerup.type === 'ak47' ? '#FFD700' : '#8B0000';
        ctx.shadowBlur = 20;
        
        if (powerup.type === 'ak47') {
            // AK-47
            const scale = 1.2;
            
            // Gun body
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(x - 15 * scale, actualY - 3 * scale, 30 * scale, 6 * scale);
            
            // Barrel
            ctx.fillStyle = '#34495e';
            ctx.fillRect(x + 10 * scale, actualY - 2 * scale, 10 * scale, 4 * scale);
            
            // Stock
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x - 20 * scale, actualY - 5 * scale, 8 * scale, 10 * scale);
            
            // Magazine
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x - 5 * scale, actualY + 3 * scale, 8 * scale, 10 * scale);
            
            // Gold accent
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(x - 12 * scale, actualY - 1 * scale, 20 * scale, 2 * scale);
            
            // "AK-47" text
            ctx.shadowBlur = 5;
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('AK-47', x, actualY - 20);
            
        } else if (powerup.type === 'pentagram') {
            // Pentagram
            const size = 25;
            const rotation = Date.now() / 1000;
            
            ctx.translate(x, actualY);
            ctx.rotate(rotation);
            
            // Outer circle
            ctx.strokeStyle = '#8B0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.stroke();
            
            // Pentagram star
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                const px = Math.cos(angle) * size * 0.8;
                const py = Math.sin(angle) * size * 0.8;
                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            ctx.rotate(-rotation);
            ctx.translate(-x, -actualY);
            
            // "PENTAGRAM" text
            ctx.shadowBlur = 5;
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PENTAGRAM', x, actualY + 35);
        } else if (powerup.type === 'homing') {
            // HOMING MISSILES - samonaprowadzające pociski
            const size = 20;
            const rotation = Date.now() / 1000;
            
            ctx.translate(x, actualY);
            ctx.rotate(rotation);
            
            // Target reticle circles
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 3;
            for (let i = 1; i <= 3; i++) {
                ctx.beginPath();
                ctx.arc(0, 0, size * 0.3 * i, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            // Crosshair
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-size, 0);
            ctx.lineTo(size, 0);
            ctx.moveTo(0, -size);
            ctx.lineTo(0, size);
            ctx.stroke();
            
            // Center dot
            ctx.fillStyle = '#00FF00';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.rotate(-rotation);
            ctx.translate(-x, -actualY);
            
            // "HOMING" text
            ctx.shadowBlur = 5;
            ctx.fillStyle = '#00FF00';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('HOMING', x, actualY + 35);
        }
        
        ctx.restore();
    }

    // Update player
    function updatePlayer() {
        // Movement
        let dx = 0;
        let dy = 0;
        
        if (keys['w']) dy -= 1;
        if (keys['s']) dy += 1;
        if (keys['a']) dx -= 1;
        if (keys['d']) dx += 1;
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }
        
        player.x += dx * player.speed;
        player.y += dy * player.speed;
        clampPlayerPosition();
        
        // Invulnerability timer
        if (player.invulnerable) {
            player.invulnerableTime--;
            if (player.invulnerableTime <= 0) {
                player.invulnerable = false;
            }
        }
    }

    // Shoot projectile
    function shoot(dirX, dirY) {
        if (shootCooldown > 0 || overheated) return;
        
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        if (length === 0) return;
        
        // AK-47 stats
        const speed = ak47Active ? projectileSpeed * 1.5 : projectileSpeed;
        const damage = (ak47Active ? 2 : 1) * (pentagramActive ? 2 : 1);
        
        projectiles.push({
            x: player.x,
            y: player.y,
            vx: (dirX / length) * speed,
            vy: (dirY / length) * speed,
            damage: damage,
            isAK47: ak47Active,
            isHoming: homingActive
        });
        
        shootCooldown = ak47Active ? shootDelay * 0.5 : shootDelay;
        
        // Add heat (less heat with AK-47)
        weaponHeat += ak47Active ? heatPerShot * 0.7 : heatPerShot;
        if (weaponHeat >= maxHeat) {
            weaponHeat = maxHeat;
            overheated = true;
        }
    }

    // Update projectiles
    function updateProjectiles() {
        if (shootCooldown > 0) shootCooldown--;
        
        // Weapon heat cooldown
        if (weaponHeat > 0) {
            weaponHeat -= cooldownRate;
            if (weaponHeat < 0) weaponHeat = 0;
        }
        
        // Check if cooled down from overheat
        if (overheated && weaponHeat <= 0) {
            overheated = false;
        }
        
        // Arrow key shooting
        if (shootKeys.up) shoot(0, -1);
        if (shootKeys.down) shoot(0, 1);
        if (shootKeys.left) shoot(-1, 0);
        if (shootKeys.right) shoot(1, 0);
        
        // Update player projectiles
        projectiles.forEach((proj, index) => {
            // Homing logic
            if (proj.isHoming && enemies.length > 0) {
                // Find closest enemy
                let closest = null;
                let closestDist = Infinity;
                
                enemies.forEach(enemy => {
                    const dist = Math.sqrt(
                        Math.pow(proj.x - enemy.x, 2) +
                        Math.pow(proj.y - enemy.y, 2)
                    );
                    if (dist < closestDist) {
                        closestDist = dist;
                        closest = enemy;
                    }
                });
                
                if (closest) {
                    // Turn towards enemy
                    const dx = closest.x - proj.x;
                    const dy = closest.y - proj.y;
                    const angle = Math.atan2(dy, dx);
                    const turnSpeed = 0.1;
                    
                    const currentAngle = Math.atan2(proj.vy, proj.vx);
                    let angleDiff = angle - currentAngle;
                    
                    // Normalize angle
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    const newAngle = currentAngle + angleDiff * turnSpeed;
                    const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
                    
                    proj.vx = Math.cos(newAngle) * speed;
                    proj.vy = Math.sin(newAngle) * speed;
                }
            }
            
            proj.x += proj.vx;
            proj.y += proj.vy;
            
            // Remove if off screen
            if (proj.x < -50 || proj.x > canvas.width + 50 || proj.y < -50 || proj.y > canvas.height + 50) {
                projectiles.splice(index, 1);
            }
        });
        
        // Update enemy projectiles
        enemyProjectiles.forEach((proj, index) => {
            proj.x += proj.vx;
            proj.y += proj.vy;

            if (proj.maxDistance !== undefined) {
                const stepDistance = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
                proj.distanceTraveled = (proj.distanceTraveled || 0) + stepDistance;
                const lifeRatio = Math.max(0, 1 - (proj.distanceTraveled / proj.maxDistance));
                if (proj.radius !== undefined) {
                    proj.radius = Math.max(2, (proj.baseRadius || proj.radius) * lifeRatio);
                }
                if (proj.distanceTraveled >= proj.maxDistance) {
                    enemyProjectiles.splice(index, 1);
                    return;
                }
            }
            
            // Check collision with player
            const dist = Math.sqrt(
                Math.pow(proj.x - player.x, 2) +
                Math.pow(proj.y - player.y, 2)
            );
            
            if (dist < player.radius && !player.invulnerable) {
                player.health--;
                updateHeartsDisplay();
                player.invulnerable = true;
                player.invulnerableTime = 60;
                enemyProjectiles.splice(index, 1);
                
                createHitParticles(player.x, player.y, '#FF6B35');
                screenShakeIntensity = 6;
                
                if (player.health <= 0) {
                    gameOver();
                }
                return;
            }
            
            // Remove if off screen
            if (proj.x < -50 || proj.x > canvas.width + 50 || proj.y < -50 || proj.y > canvas.height + 50) {
                enemyProjectiles.splice(index, 1);
            }
        });
    }

    // Spawn enemy
    function spawnEnemy() {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch(side) {
            case 0: // top
                x = Math.random() * canvas.width;
                y = -20;
                break;
            case 1: // right
                x = canvas.width + 20;
                y = Math.random() * canvas.height;
                break;
            case 2: // bottom
                x = Math.random() * canvas.width;
                y = canvas.height + 20;
                break;
            case 3: // left
                x = -20;
                y = Math.random() * canvas.height;
                break;
        }
        
        const rand = Math.random();
        
        // 5% szansa na strzelającego przeciwnika (rzadki!)
        if (rand < 0.05) {
            enemies.push({
                x: x,
                y: y,
                radius: 16,
                speed: 0.8, // Wolniejszy
                health: 5, // Więcej HP
                color: '#9b59b6', // Fioletowy
                type: 'shooter',
                hitFlash: 0,
                shootTimer: 0,
                shootCooldown: 90, // czas między seriami
                burstShotsRemaining: 0,
                burstDelayTimer: 0,
                burstSpacing: 8,
                burstCount: 3
            });
        }
        // 10% szansa na szybkiego zielonego przeciwnika
        else if (rand < 0.15) {
            enemies.push({
                x: x,
                y: y,
                radius: 13,
                speed: 2.5 + Math.random() * 1,
                health: 2,
                color: '#2ecc71',
                type: 'speeder',
                hitFlash: 0
            });
        } else {
            // Zwykły przeciwnik
            enemies.push({
                x: x,
                y: y,
                radius: 15,
                speed: 1 + Math.random() * 0.5,
                health: 3,
                color: '#e74c3c',
                type: 'fly',
                hitFlash: 0,
                shootTimer: Math.floor(Math.random() * 60),
                shootCooldown: 120 + Math.floor(Math.random() * 60)
            });
        }
    }

    // Update enemies
    function updateEnemies() {
        // DIFFICULTY SCALING - coraz szybciej spawnują się przeciwnicy!
        difficultyTimer++;
        if (difficultyTimer >= 300) { // Co 5 sekund
            difficultyTimer = 0;
            if (enemySpawnRate > minSpawnRate) {
                enemySpawnRate -= 2; // Przyspiesz spawn
                if (enemySpawnRate < minSpawnRate) {
                    enemySpawnRate = minSpawnRate;
                }
            }
        }
        
        enemySpawnTimer++;
        if (enemySpawnTimer >= enemySpawnRate) {
            spawnEnemy();
            enemySpawnTimer = 0;
        }
        
        enemies.forEach((enemy, eIndex) => {
            // Shooter enemy AI
            if (enemy.type === 'shooter') {
                enemy.shootTimer++;
                
                if (enemy.burstShotsRemaining > 0) {
                    enemy.burstDelayTimer--;
                    if (enemy.burstDelayTimer <= 0) {
                        const dx = player.x - enemy.x;
                        const dy = player.y - enemy.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        
                        if (dist > 0) {
                            const speed = 4.5;
                            enemyProjectiles.push({
                                x: enemy.x,
                                y: enemy.y,
                                vx: (dx / dist) * speed,
                                vy: (dy / dist) * speed,
                                damage: 1,
                                radius: 6,
                                baseRadius: 6
                            });
                            
                            createHitParticles(enemy.x, enemy.y, '#9b59b6');
                        }
                        
                        enemy.burstShotsRemaining--;
                        enemy.burstDelayTimer = enemy.burstSpacing;
                    }
                } else if (enemy.shootTimer >= enemy.shootCooldown) {
                    enemy.shootTimer = 0;
                    enemy.burstShotsRemaining = enemy.burstCount;
                    enemy.burstDelayTimer = 0;
                }
                
                // Slower movement, try to keep distance
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
                    // Keep at medium distance
                    if (dist < 150) {
                        // Move away if too close
                        enemy.x -= (dx / dist) * enemy.speed;
                        enemy.y -= (dy / dist) * enemy.speed;
                    } else if (dist > 250) {
                        // Move closer if too far
                        enemy.x += (dx / dist) * enemy.speed;
                        enemy.y += (dy / dist) * enemy.speed;
                    }
                }
            } else {
                // Normal movement - chase player
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
                    enemy.x += (dx / dist) * enemy.speed;
                    enemy.y += (dy / dist) * enemy.speed;
                }

                if (enemy.type === 'fly') {
                    enemy.shootTimer++;
                    if (enemy.shootTimer >= enemy.shootCooldown) {
                        enemy.shootTimer = 0;
                        enemy.shootCooldown = 120 + Math.floor(Math.random() * 60);

                        if (dist > 0) {
                            const speed = 3.2;
                            enemyProjectiles.push({
                                x: enemy.x,
                                y: enemy.y,
                                vx: (dx / dist) * speed,
                                vy: (dy / dist) * speed,
                                damage: 1,
                                color: '#e74c3c',
                                maxDistance: 660,
                                distanceTraveled: 0,
                                radius: 6,
                                baseRadius: 6
                            });

                            createHitParticles(enemy.x, enemy.y, '#e74c3c');
                        }
                    }
                }
            }
            
            // Check collision with player
            const playerDist = Math.sqrt(
                Math.pow(player.x - enemy.x, 2) + 
                Math.pow(player.y - enemy.y, 2)
            );
            
            if (playerDist < player.radius + enemy.radius && !player.invulnerable) {
                player.health--;
                updateHeartsDisplay();
                player.invulnerable = true;
                player.invulnerableTime = 60; // 1 second at 60fps
                
                if (player.health <= 0) {
                    gameOver();
                }
            }
            
            // Check collision with projectiles
            projectiles.forEach((proj, pIndex) => {
                const projDist = Math.sqrt(
                    Math.pow(proj.x - enemy.x, 2) + 
                    Math.pow(proj.y - enemy.y, 2)
                );
                
                if (projDist < enemy.radius + 5) {
                    enemy.health -= proj.damage;
                    projectiles.splice(pIndex, 1);
                    
                    // HIT EFFECT!
                    enemy.hitFlash = 10;
                    createHitParticles(enemy.x, enemy.y, 'white');
                    
                    // Screen shake effect
                    canvas.style.transform = 'translate(' + (Math.random() * 4 - 2) + 'px, ' + (Math.random() * 4 - 2) + 'px)';
                    setTimeout(() => {
                        canvas.style.transform = 'translate(0, 0)';
                    }, 50);
                    
                    if (enemy.health <= 0) {
                        // Enemy died - bigger explosion + KILL HITMARKER
                        createHitParticles(enemy.x, enemy.y, '#e74c3c');
                        createHitParticles(enemy.x, enemy.y, 'white');
                        createHitmarker(enemy.x, enemy.y, true); // KILL marker
                        
                        kills++;
                        killsElement.textContent = kills;
                        
                        // COMBO SYSTEM!
                        const now = Date.now();
                        if (now - lastKillTime < 2000) { // 2 seconds window
                            comboCount++;
                            comboTimer = 120; // 2 seconds to maintain combo
                            
                            // Combo multiplier
                            comboMultiplier = 1 + (comboCount * 0.1);
                            
                            // Screen effects based on combo
                            if (comboCount >= 10) {
                                screenShakeIntensity = 8;
                                flashTimer = 10;
                                slowMotionTimer = 30;
                            } else if (comboCount >= 5) {
                                screenShakeIntensity = 5;
                                flashTimer = 5;
                            }
                            
                            // Combo text popup
                            if (comboCount >= 5) {
                                const comboTexts = [
                                    'BRUTAL!', 'SAVAGE!', 'INSANE!', 'LEGENDARY!',
                                    'UNSTOPPABLE!', 'GODLIKE!', 'RAMPAGE!', 'ULTRA KILL!'
                                ];
                                const randomText = comboTexts[Math.floor(Math.random() * comboTexts.length)];
                                createTextPopup(enemy.x, enemy.y - 30, randomText, '#FFD700', 25);
                            }
                        } else {
                            comboCount = 1;
                            comboTimer = 120;
                            comboMultiplier = 1;
                        }
                        lastKillTime = now;
                        
                        // Kill streak rewards
                        killStreak++;
                        if (killStreak % 5 === 0) {
                            // Bonus coins every 5 kills!
                            const bonusCoins = Math.floor(killStreak / 5);
                            coins += bonusCoins;
                            coinsElement.textContent = coins;
                            createTextPopup(enemy.x, enemy.y, `+${bonusCoins} 💰 BONUS!`, '#FFD700', 20);
                        }
                        
                        // Speeders drop powerups!
                        if (enemy.type === 'speeder') {
                            const powerupType = Math.random() < 0.5 ? 'ak47' : 'pentagram';
                            powerups.push({
                                x: enemy.x,
                                y: enemy.y,
                                type: powerupType
                            });
                            createTextPopup(enemy.x, enemy.y + 20, 'POWERUP!', '#00FF00', 18);
                        }
                        // Shooters drop homing missiles!
                        else if (enemy.type === 'shooter') {
                            powerups.push({
                                x: enemy.x,
                                y: enemy.y,
                                type: 'homing'
                            });
                            createTextPopup(enemy.x, enemy.y + 20, 'HOMING!', '#00FF00', 18);
                        }
                        else {
                            // Normal enemies spawn helmet with combo multiplier
                            const helmetsToSpawn = Math.floor(comboMultiplier);
                            for (let i = 0; i < helmetsToSpawn; i++) {
                                helmets.push({
                                    x: enemy.x + (Math.random() - 0.5) * 20,
                                    y: enemy.y + (Math.random() - 0.5) * 20,
                                    size: 22,
                                    life: 480 // 8 seconds at 60fps
                                });
                            }
                            
                            if (comboMultiplier > 1) {
                                createTextPopup(enemy.x, enemy.y, `x${helmetsToSpawn} COINS!`, '#FFD700', 16);
                            }
                        }
                        
                        enemies.splice(eIndex, 1);
                    } else {
                        // Just hit, not killed - regular HITMARKER
                        createHitmarker(enemy.x, enemy.y, false);
                    }
                }
            });
        });
    }

    // Update helmets (coins)
    function updateHelmets() {
        helmets.forEach((helmet, index) => {
            helmet.life--;

            if (helmet.life <= 0) {
                helmets.splice(index, 1);
                return;
            }

            const dist = Math.sqrt(
                Math.pow(player.x - helmet.x, 2) + 
                Math.pow(player.y - helmet.y, 2)
            );
            
            if (dist < player.radius + helmet.size / 2) {
                coins++;
                coinsElement.textContent = coins;
                helmets.splice(index, 1);
            }
        });
    }
    
    // Update powerups
    function updatePowerups() {
        // Update timers
        if (ak47Active) {
            ak47Timer--;
            if (ak47Timer <= 0) {
                ak47Active = false;
            }
        }
        
        if (pentagramActive) {
            pentagramTimer--;
            if (pentagramTimer <= 0) {
                pentagramActive = false;
            }
        }
        
        if (homingActive) {
            homingTimer--;
            if (homingTimer <= 0) {
                homingActive = false;
            }
        }
        
        // Combo timer decay
        if (comboTimer > 0) {
            comboTimer--;
            if (comboTimer <= 0) {
                if (comboCount > 3) {
                    createTextPopup(canvas.width / 2, canvas.height / 2, 'COMBO LOST!', '#FF0000', 30);
                }
                comboCount = 0;
                comboMultiplier = 1;
            }
        }
        
        // Screen shake decay
        if (screenShakeIntensity > 0) {
            canvas.style.transform = `translate(${(Math.random() - 0.5) * screenShakeIntensity}px, ${(Math.random() - 0.5) * screenShakeIntensity}px)`;
            screenShakeIntensity *= 0.9;
            if (screenShakeIntensity < 0.1) {
                screenShakeIntensity = 0;
                canvas.style.transform = 'translate(0, 0)';
            }
        }
        
        // Slow motion effect
        if (slowMotionTimer > 0) {
            slowMotionTimer--;
        }
        
        // Check collection
        powerups.forEach((powerup, index) => {
            const dist = Math.sqrt(
                Math.pow(player.x - powerup.x, 2) + 
                Math.pow(player.y - powerup.y, 2)
            );
            
            if (dist < player.radius + 25) {
                if (powerup.type === 'ak47') {
                    ak47Active = true;
                    ak47Timer = 600; // 10 seconds at 60fps
                    createHitParticles(powerup.x, powerup.y, '#FFD700');
                    createTextPopup(powerup.x, powerup.y, '🔫 AK-47!', '#FFD700', 25);
                    screenShakeIntensity = 10;
                    flashTimer = 15;
                } else if (powerup.type === 'pentagram') {
                    pentagramActive = true;
                    pentagramTimer = 600; // 10 seconds
                    createHitParticles(powerup.x, powerup.y, '#FF0000');
                    createTextPopup(powerup.x, powerup.y, '😈 PENTAGRAM!', '#FF0000', 25);
                    screenShakeIntensity = 10;
                    flashTimer = 15;
                } else if (powerup.type === 'homing') {
                    homingActive = true;
                    homingTimer = 600; // 10 seconds
                    createHitParticles(powerup.x, powerup.y, '#00FF00');
                    createTextPopup(powerup.x, powerup.y, '🎯 HOMING!', '#00FF00', 25);
                    screenShakeIntensity = 10;
                    flashTimer = 15;
                }
                powerups.splice(index, 1);
            }
        });
    }

    // Draw everything
    function draw() {
        // Clear
        ctx.fillStyle = '#2c2c2c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Grid
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 50) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }
        
        // Draw game objects
        helmets.forEach(helmet => drawHelmet(helmet));
        powerups.forEach(powerup => drawPowerup(powerup));
        particles.forEach(particle => drawParticle(particle));
        enemyProjectiles.forEach(proj => drawEnemyProjectile(proj));
        projectiles.forEach(proj => drawProjectile(proj));
        enemies.forEach(enemy => drawEnemy(enemy));
        drawPlayer();
        
        // Draw hitmarkers on top of everything
        hitmarkers.forEach(hitmarker => drawHitmarker(hitmarker));
        
        // Draw text popups
        drawTextPopups();
        
        // Draw combo effects
        drawComboEffects();
        
        // Draw heat gauge
        drawHeatGauge();
        
        // Draw powerup timers
        if (ak47Active || pentagramActive || homingActive) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'left';
            
            let yOffset = 20;
            if (ak47Active) {
                const secondsLeft = Math.ceil(ak47Timer / 60);
                ctx.fillStyle = '#FFD700';
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 10;
                ctx.fillText(`🔫 AK-47: ${secondsLeft}s`, 10, yOffset);
                yOffset += 25;
            }
            if (pentagramActive) {
                const secondsLeft = Math.ceil(pentagramTimer / 60);
                ctx.fillStyle = '#FF0000';
                ctx.shadowColor = '#FF0000';
                ctx.shadowBlur = 10;
                ctx.fillText(`😈 PENTAGRAM: ${secondsLeft}s`, 10, yOffset);
                yOffset += 25;
            }
            if (homingActive) {
                const secondsLeft = Math.ceil(homingTimer / 60);
                ctx.fillStyle = '#00FF00';
                ctx.shadowColor = '#00FF00';
                ctx.shadowBlur = 10;
                ctx.fillText(`🎯 HOMING: ${secondsLeft}s`, 10, yOffset);
            }
            ctx.shadowBlur = 0;
        }
        
        // Slow motion overlay
        if (slowMotionTimer > 0) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#00FFFF';
            ctx.fillRect(0, 0, 5, canvas.height);
            ctx.fillRect(canvas.width - 5, 0, 5, canvas.height);
            ctx.fillRect(0, 0, canvas.width, 5);
            ctx.fillRect(0, canvas.height - 5, canvas.width, 5);
            ctx.restore();
        }
    }

    function clampPlayerPosition() {
        if (!player) return;
        player.x = Math.max(player.radius + 10, Math.min(canvas.width - player.radius - 10, player.x));
        player.y = Math.max(player.radius + 10, Math.min(canvas.height - player.radius - 10, player.y));
    }

    function scaleGameObjects(scaleX, scaleY) {
        if (!isFinite(scaleX) || !isFinite(scaleY) || (scaleX === 1 && scaleY === 1)) {
            return;
        }

        player.x *= scaleX;
        player.y *= scaleY;

        projectiles.forEach((proj) => {
            proj.x *= scaleX;
            proj.y *= scaleY;
        });

        enemyProjectiles.forEach((proj) => {
            proj.x *= scaleX;
            proj.y *= scaleY;
        });

        enemies.forEach((enemy) => {
            enemy.x *= scaleX;
            enemy.y *= scaleY;
        });

        helmets.forEach((helmet) => {
            helmet.x *= scaleX;
            helmet.y *= scaleY;
        });

        particles.forEach((particle) => {
            particle.x *= scaleX;
            particle.y *= scaleY;
        });

        hitmarkers.forEach((marker) => {
            marker.x *= scaleX;
            marker.y *= scaleY;
        });

        powerups.forEach((powerup) => {
            powerup.x *= scaleX;
            powerup.y *= scaleY;
        });

        textPopups.forEach((popup) => {
            popup.x *= scaleX;
            popup.y *= scaleY;
        });

        clampPlayerPosition();
    }

    function resizeCanvas() {
        const oldWidth = canvas.width || BASE_CANVAS_WIDTH;
        const oldHeight = canvas.height || BASE_CANVAS_HEIGHT;

        const aspect = 16 / 9;
        let targetWidth = window.innerWidth;
        let targetHeight = targetWidth / aspect;

        if (targetHeight > window.innerHeight) {
            targetHeight = window.innerHeight;
            targetWidth = targetHeight * aspect;
        }

        targetWidth = Math.max(Math.floor(targetWidth), 320);
        targetHeight = Math.max(Math.floor(targetHeight), 180);

        const scaleX = targetWidth / oldWidth;
        const scaleY = targetHeight / oldHeight;

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            canvas.style.width = `${targetWidth}px`;
            canvas.style.height = `${targetHeight}px`;

            scaleGameObjects(scaleX, scaleY);

            if (!gameRunning) {
                draw();
            }
        }
    }

    // Game loop
    function gameLoop() {
        if (!gameRunning) return;
        
        updatePlayer();
        updateProjectiles();
        updateEnemies();
        updateHelmets();
        updatePowerups();
        updateParticles();
        updateHitmarkers();
        updateTextPopups();
        draw();
        
        requestAnimationFrame(gameLoop);
    }

    // Game over
    function gameOver() {
        gameRunning = false;
        gameOverHandler({
            kills,
            coins
        });
    }

    function resetGameState() {
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
        player.health = player.maxHealth;
        player.invulnerable = false;
        player.invulnerableTime = 0;
        clampPlayerPosition();
        
        projectiles = [];
        enemies = [];
        enemyProjectiles = [];
        helmets = [];
        particles = [];
        hitmarkers = [];
        powerups = [];
        textPopups = [];
        
        weaponHeat = 0;
        overheated = false;
        ak47Active = false;
        ak47Timer = 0;
        pentagramActive = false;
        pentagramTimer = 0;
        homingActive = false;
        homingTimer = 0;
        
        comboCount = 0;
        comboTimer = 0;
        comboMultiplier = 1;
        screenShakeIntensity = 0;
        slowMotionTimer = 0;
        flashTimer = 0;
        killStreak = 0;
        lastKillTime = 0;
        
        coins = 0;
        kills = 0;
        enemySpawnRate = baseSpawnRate;
        enemySpawnTimer = 0;
        difficultyTimer = 0;
        
        canvas.style.transform = 'translate(0, 0)';
        
        coinsElement.textContent = coins;
        killsElement.textContent = kills;
        updateHeartsDisplay();
        
        gameRunning = false;
    }

    function startRun() {
        if (gameRunning) return;
        gameRunning = true;
        gameLoop();
    }

    // Input handling
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        
        // Shooting with arrow keys or IJKL
        if (e.key === 'ArrowUp' || e.key === 'i') shootKeys.up = true;
        if (e.key === 'ArrowDown' || e.key === 'k') shootKeys.down = true;
        if (e.key === 'ArrowLeft' || e.key === 'j') shootKeys.left = true;
        if (e.key === 'ArrowRight' || e.key === 'l') shootKeys.right = true;
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
        
        if (e.key === 'ArrowUp' || e.key === 'i') shootKeys.up = false;
        if (e.key === 'ArrowDown' || e.key === 'k') shootKeys.down = false;
        if (e.key === 'ArrowLeft' || e.key === 'j') shootKeys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'l') shootKeys.right = false;
    });

    // Mouse input temporarily disabled

    resizeCanvas();
    resetGameState();
    draw();
    window.addEventListener('resize', resizeCanvas);

    return {
        prepareForNewRun: resetGameState,
        startRun,
        getStats: () => ({ kills, coins }),
        resize: resizeCanvas
    };
}

