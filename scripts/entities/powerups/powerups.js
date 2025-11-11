const POWERUP_DURATION = 600; // 10 seconds at 60 FPS

export function maybeDropPowerupFromEnemy({
    enemy,
    comboMultiplier,
    powerups,
    createTextPopup
}) {
    if (enemy.type === 'speeder') {
        const dropRand = Math.random();
        const powerupType = dropRand < 0.33 ? 'ak47' : dropRand < 0.66 ? 'pentagram' : 'speed';
        powerups.push(createPowerup(powerupType, enemy.x, enemy.y));
        const popupText = powerupType === 'speed' ? 'SPEED BOOST!' : 'POWERUP!';
        createTextPopup?.(enemy.x, enemy.y + 20, popupText, '#00FF00', 18);
    } else if (enemy.type === 'shooter') {
        powerups.push(createPowerup('homing', enemy.x, enemy.y));
        createTextPopup?.(enemy.x, enemy.y + 20, 'HOMING!', '#00FF00', 18);
    }
}

export function createPowerup(type, x, y) {
    return { type, x, y };
}

export function drawPowerup(ctx, powerup) {
    const x = powerup.x;
    const y = powerup.y;
    const floatOffset = Math.sin(Date.now() / 300) * 5;
    const actualY = y + floatOffset;

    ctx.save();

    if (powerup.type === 'ak47') {
        ctx.shadowColor = '#FFD700';
    } else if (powerup.type === 'pentagram') {
        ctx.shadowColor = '#8B0000';
    } else if (powerup.type === 'homing') {
        ctx.shadowColor = '#00FF00';
    } else if (powerup.type === 'speed') {
        ctx.shadowColor = '#FFE066';
    } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    }
    ctx.shadowBlur = 20;

    if (powerup.type === 'ak47') {
        const scale = 1.2;
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(x - 15 * scale, actualY - 3 * scale, 30 * scale, 6 * scale);
        ctx.fillStyle = '#34495e';
        ctx.fillRect(x + 10 * scale, actualY - 2 * scale, 10 * scale, 4 * scale);
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x - 20 * scale, actualY - 5 * scale, 8 * scale, 10 * scale);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - 5 * scale, actualY + 3 * scale, 8 * scale, 10 * scale);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x - 12 * scale, actualY - 1 * scale, 20 * scale, 2 * scale);
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('AK-47', x, actualY - 20);
    } else if (powerup.type === 'pentagram') {
        const size = 25;
        const rotation = Date.now() / 1000;
        ctx.translate(x, actualY);
        ctx.rotate(rotation);
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const px = Math.cos(angle) * size * 0.8;
            const py = Math.sin(angle) * size * 0.8;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.rotate(-rotation);
        ctx.translate(-x, -actualY);
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PENTAGRAM', x, actualY + 35);
    } else if (powerup.type === 'homing') {
        const size = 20;
        const rotation = Date.now() / 1000;
        ctx.translate(x, actualY);
        ctx.rotate(rotation);
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 3;
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.3 * i, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.lineTo(size, 0);
        ctx.moveTo(0, -size);
        ctx.lineTo(0, size);
        ctx.stroke();
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.rotate(-rotation);
        ctx.translate(-x, -actualY);
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('HOMING', x, actualY + 35);
    } else if (powerup.type === 'speed') {
        const size = 24;
        const rotation = Math.sin(Date.now() / 200) * 0.2;
        ctx.translate(x, actualY);
        ctx.rotate(rotation);
        ctx.fillStyle = '#FFE066';
        ctx.strokeStyle = '#FFB703';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-size * 0.25, -size * 0.45);
        ctx.lineTo(size * 0.1, -size * 0.05);
        ctx.lineTo(-size * 0.05, -size * 0.05);
        ctx.lineTo(size * 0.25, size * 0.5);
        ctx.lineTo(-size * 0.1, size * 0.1);
        ctx.lineTo(size * 0.05, size * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.rotate(-rotation);
        ctx.translate(-x, -actualY);
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#FFE066';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SPEED', x, actualY + 32);
    }

    ctx.restore();
}

export function tickPowerupEffects({ powerupEffects, player, basePlayerSpeed }) {
    if (powerupEffects.ak47.active) {
        powerupEffects.ak47.timer--;
        if (powerupEffects.ak47.timer <= 0) {
            powerupEffects.ak47.active = false;
        }
    }

    if (powerupEffects.pentagram.active) {
        powerupEffects.pentagram.timer--;
        if (powerupEffects.pentagram.timer <= 0) {
            powerupEffects.pentagram.active = false;
        }
    }

    if (powerupEffects.homing.active) {
        powerupEffects.homing.timer--;
        if (powerupEffects.homing.timer <= 0) {
            powerupEffects.homing.active = false;
        }
    }

    if (powerupEffects.speed.active) {
        powerupEffects.speed.timer--;
        if (powerupEffects.speed.timer <= 0) {
            powerupEffects.speed.active = false;
            player.speed = basePlayerSpeed;
        }
    }
}

export function applyPowerupPickup({
    powerup,
    player,
    powerupEffects,
    createHitParticles,
    createTextPopup,
    setScreenShake,
    setFlash,
    basePlayerSpeed,
    speedMultiplier
}) {
    switch (powerup.type) {
        case 'ak47':
            powerupEffects.ak47.active = true;
            powerupEffects.ak47.timer = POWERUP_DURATION;
            createHitParticles?.(powerup.x, powerup.y, '#FFD700');
            createTextPopup?.(powerup.x, powerup.y, '🔫 AK-47!', '#FFD700', 25);
            setScreenShake?.(10);
            setFlash?.(15);
            break;
        case 'pentagram':
            powerupEffects.pentagram.active = true;
            powerupEffects.pentagram.timer = POWERUP_DURATION;
            createHitParticles?.(powerup.x, powerup.y, '#FF0000');
            createTextPopup?.(powerup.x, powerup.y, '😈 PENTAGRAM!', '#FF0000', 25);
            setScreenShake?.(10);
            setFlash?.(15);
            break;
        case 'homing':
            powerupEffects.homing.active = true;
            powerupEffects.homing.timer = POWERUP_DURATION;
            createHitParticles?.(powerup.x, powerup.y, '#00FF00');
            createTextPopup?.(powerup.x, powerup.y, '🎯 HOMING!', '#00FF00', 25);
            setScreenShake?.(10);
            setFlash?.(15);
            break;
        case 'speed':
            powerupEffects.speed.active = true;
            powerupEffects.speed.timer = POWERUP_DURATION;
            player.speed = basePlayerSpeed * speedMultiplier;
            createHitParticles?.(powerup.x, powerup.y, '#FFD700');
            createTextPopup?.(powerup.x, powerup.y, '⚡ SPEED!', '#FFD700', 25);
            setScreenShake?.(6);
            break;
        default:
            break;
    }
}

