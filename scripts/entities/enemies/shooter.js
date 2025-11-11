export function createShooter(x, y) {
    return {
        x,
        y,
        radius: 16,
        speed: 0.8,
        health: 5,
        color: '#9b59b6',
        type: 'shooter',
        hitFlash: 0,
        shootTimer: 0,
        shootCooldown: 90,
        burstShotsRemaining: 0,
        burstDelayTimer: 0,
        burstSpacing: 8,
        burstCount: 3
    };
}

export function updateShooter(enemy, { player, enemyProjectiles, createHitParticles }) {
    enemy.shootTimer++;

    if (enemy.burstShotsRemaining > 0) {
        enemy.burstDelayTimer--;
        if (enemy.burstDelayTimer <= 0) {
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                const speed = 4.5;
                enemyProjectiles?.push({
                    x: enemy.x,
                    y: enemy.y,
                    vx: (dx / dist) * speed,
                    vy: (dy / dist) * speed,
                    damage: 1,
                    radius: 6,
                    baseRadius: 6
                });

                createHitParticles?.(enemy.x, enemy.y, '#9b59b6');
            }

            enemy.burstShotsRemaining--;
            enemy.burstDelayTimer = enemy.burstSpacing;
        }
    } else if (enemy.shootTimer >= enemy.shootCooldown) {
        enemy.shootTimer = 0;
        enemy.burstShotsRemaining = enemy.burstCount;
        enemy.burstDelayTimer = 0;
    }

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
        if (dist < 150) {
            enemy.x -= (dx / dist) * enemy.speed;
            enemy.y -= (dy / dist) * enemy.speed;
        } else if (dist > 250) {
            enemy.x += (dx / dist) * enemy.speed;
            enemy.y += (dy / dist) * enemy.speed;
        }
    }
}

export function drawShooter(ctx, enemy, actualY) {
    const chargePercent = (enemy.shootCooldown - enemy.shootTimer) / enemy.shootCooldown;
    if (chargePercent > 0.7) {
        const pulseSize = Math.sin(Date.now() / 50) * 3;
        ctx.strokeStyle = `rgba(155, 89, 182, ${chargePercent})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(enemy.x, actualY, enemy.radius + 8 + pulseSize, 0, Math.PI * 2);
        ctx.stroke();
    }

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

    ctx.strokeStyle = '#6C3483';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#2c3e50';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;

    for (let i = -1; i <= 1; i++) {
        const gunY = actualY + i * 6;
        ctx.fillRect(enemy.x + enemy.radius - 5, gunY - 2, 12, 4);
        ctx.strokeRect(enemy.x + enemy.radius - 5, gunY - 2, 12, 4);
    }

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
}

