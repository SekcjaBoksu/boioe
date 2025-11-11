export function createFly(x, y) {
    return {
        x,
        y,
        radius: 15,
        speed: 1 + Math.random() * 0.5,
        health: 3,
        color: '#e74c3c',
        type: 'fly',
        hitFlash: 0,
        shootTimer: Math.floor(Math.random() * 60),
        shootCooldown: 120 + Math.floor(Math.random() * 60)
    };
}

export function updateFly(enemy, { player, enemyProjectiles, createHitParticles }) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed;
    }

    enemy.shootTimer++;
    if (enemy.shootTimer >= enemy.shootCooldown) {
        enemy.shootTimer = 0;
        enemy.shootCooldown = 120 + Math.floor(Math.random() * 60);

        if (dist > 0 && enemyProjectiles) {
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

            createHitParticles?.(enemy.x, enemy.y, '#e74c3c');
        }
    }
}

export function drawFly(ctx, enemy, actualY) {
    ctx.fillStyle = '#c0392b';
    ctx.strokeStyle = '#8B0000';
    ctx.lineWidth = 1;

    const wingFlap = Math.sin(Date.now() / 100) * 5;

    ctx.beginPath();
    ctx.ellipse(enemy.x - enemy.radius + 3, actualY, 8, 4, -0.5 + wingFlap * 0.02, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(enemy.x + enemy.radius - 3, actualY, 8, 4, 0.5 - wingFlap * 0.02, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, actualY, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#8B0000';
    ctx.lineWidth = 2;
    ctx.stroke();

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

    ctx.strokeStyle = '#8B0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(enemy.x - 8, actualY - 7);
    ctx.lineTo(enemy.x - 3, actualY - 5);
    ctx.moveTo(enemy.x + 8, actualY - 7);
    ctx.lineTo(enemy.x + 3, actualY - 5);
    ctx.stroke();
}

