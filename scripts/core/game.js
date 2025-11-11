import { drawPlayer } from './renderers/player.js';
import { drawProjectile, drawEnemyProjectile } from './renderers/projectiles.js';
import { createFly, updateFly, drawFly } from '../entities/enemies/fly.js';
import { createShooter, updateShooter, drawShooter } from '../entities/enemies/shooter.js';
import { createSpeeder, updateSpeeder, drawSpeeder } from '../entities/enemies/speeder.js';
import {
    drawPowerup,
    maybeDropPowerupFromEnemy,
    applyPowerupPickup,
    tickPowerupEffects
} from '../entities/powerups/powerups.js';

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
    const BASE_PLAYER_SPEED = 3;
    const SPEED_MULTIPLIER = 1.6;

    // Game state
    let gameRunning = false;
    let coins = 0;
    let kills = 0;

    // Player
    let player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 18,
        speed: BASE_PLAYER_SPEED,
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

    // Coins/Helmets
    let helmets = [];
    
    // Particle effects
    let particles = [];
    
    // Hitmarkers
    let hitmarkers = [];
    
    // Powerups
    let powerups = [];
    const powerupEffects = {
        ak47: { active: false, timer: 0 },
        pentagram: { active: false, timer: 0 },
        homing: { active: false, timer: 0 },
        speed: { active: false, timer: 0 }
    };
    
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


    function drawEnemy(enemy) {
        ctx.save();

        if (enemy.hitFlash && enemy.hitFlash > 0) {
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 15;
            enemy.hitFlash--;
        }

        const float = Math.sin(Date.now() / 300 + enemy.x) * 2;
        const actualY = enemy.y + float;

        if (enemy.type === 'shooter') {
            drawShooter(ctx, enemy, actualY);
        } else if (enemy.type === 'speeder') {
            drawSpeeder(ctx, enemy, actualY, player);
        } else {
            drawFly(ctx, enemy, actualY);
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
    
    // Update player
    function updatePlayer() {
        // Movement
        let dx = 0;
        let dy = 0;
        
        if (keys['w']) dy -= 1;
        if (keys['s']) dy += 1;
        if (keys['a']) dx -= 1;
        if (keys['d']) dx += 1;

        player.isMoving = dx !== 0 || dy !== 0;
        
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
        const speed = powerupEffects.ak47.active ? projectileSpeed * 1.5 : projectileSpeed;
        const damage = (powerupEffects.ak47.active ? 2 : 1) * (powerupEffects.pentagram.active ? 2 : 1);
        
        projectiles.push({
            x: player.x,
            y: player.y,
            vx: (dirX / length) * speed,
            vy: (dirY / length) * speed,
            damage: damage,
            isAK47: powerupEffects.ak47.active,
            isHoming: powerupEffects.homing.active
        });
        
        shootCooldown = powerupEffects.ak47.active ? shootDelay * 0.5 : shootDelay;
        
        // Add heat (less heat with AK-47)
        weaponHeat += powerupEffects.ak47.active ? heatPerShot * 0.7 : heatPerShot;
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
        
        if (rand < 0.05) {
            enemies.push(createShooter(x, y));
        } else if (rand < 0.15) {
            enemies.push(createSpeeder(x, y));
        } else {
            enemies.push(createFly(x, y));
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
            if (enemy.type === 'shooter') {
                updateShooter(enemy, { player, enemyProjectiles, createHitParticles });
            } else if (enemy.type === 'speeder') {
                updateSpeeder(enemy, { player });
            } else if (enemy.type === 'fly') {
                updateFly(enemy, { player, enemyProjectiles, createHitParticles });
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
                        if (enemy.type === 'speeder' || enemy.type === 'shooter') {
                            maybeDropPowerupFromEnemy({
                                enemy,
                                comboMultiplier,
                                powerups,
                                createTextPopup
                            });
                        } else {
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
        tickPowerupEffects({
            powerupEffects,
            player,
            basePlayerSpeed: BASE_PLAYER_SPEED
        });

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
                applyPowerupPickup({
                    powerup,
                    player,
                    powerupEffects,
                    createHitParticles,
                    createTextPopup,
                    setScreenShake: (value) => {
                        screenShakeIntensity = Math.max(screenShakeIntensity, value);
                    },
                    setFlash: (value) => {
                        flashTimer = Math.max(flashTimer, value);
                    },
                    basePlayerSpeed: BASE_PLAYER_SPEED,
                    speedMultiplier: SPEED_MULTIPLIER
                });
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
        powerups.forEach(powerup => drawPowerup(ctx, powerup));
        particles.forEach(particle => drawParticle(particle));
        enemyProjectiles.forEach(proj => drawEnemyProjectile(ctx, proj));
        projectiles.forEach(proj => drawProjectile(ctx, proj, { pentagramActive: powerupEffects.pentagram.active }));
        enemies.forEach(enemy => drawEnemy(enemy));
        drawPlayer(ctx, canvas, player, {
            pentagramActive: powerupEffects.pentagram.active,
            speedActive: powerupEffects.speed.active,
            isMoving: player.isMoving
        });
        
        // Draw hitmarkers on top of everything
        hitmarkers.forEach(hitmarker => drawHitmarker(hitmarker));
        
        // Draw text popups
        drawTextPopups();
        
        // Draw combo effects
        drawComboEffects();
        
        // Draw heat gauge
        drawHeatGauge();
        
        // Draw powerup timers
        if (powerupEffects.ak47.active || powerupEffects.pentagram.active || powerupEffects.homing.active) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'left';
            
            let yOffset = 20;
            if (powerupEffects.ak47.active) {
                const secondsLeft = Math.ceil(powerupEffects.ak47.timer / 60);
                ctx.fillStyle = '#FFD700';
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 10;
                ctx.fillText(`🔫 AK-47: ${secondsLeft}s`, 10, yOffset);
                yOffset += 25;
            }
            if (powerupEffects.pentagram.active) {
                const secondsLeft = Math.ceil(powerupEffects.pentagram.timer / 60);
                ctx.fillStyle = '#FF0000';
                ctx.shadowColor = '#FF0000';
                ctx.shadowBlur = 10;
                ctx.fillText(`😈 PENTAGRAM: ${secondsLeft}s`, 10, yOffset);
                yOffset += 25;
            }
            if (powerupEffects.homing.active) {
                const secondsLeft = Math.ceil(powerupEffects.homing.timer / 60);
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
        player.speed = BASE_PLAYER_SPEED;
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
        powerupEffects.ak47.active = false;
        powerupEffects.ak47.timer = 0;
        powerupEffects.pentagram.active = false;
        powerupEffects.pentagram.timer = 0;
        powerupEffects.homing.active = false;
        powerupEffects.homing.timer = 0;
        powerupEffects.speed.active = false;
        powerupEffects.speed.timer = 0;
        
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

