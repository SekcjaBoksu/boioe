export function createSpeeder(x, y) {
    return {
        x,
        y,
        radius: 13,
        speed: 2.5 + Math.random() * 1,
        health: 2,
        color: '#2ecc71',
        type: 'speeder',
        hitFlash: 0
    };
}

export function updateSpeeder(enemy, { player }) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed;
    }
}

export function drawSpeeder(ctx, enemy, actualY, player) {
    const pulseSize = Math.sin(Date.now() / 100) * 3;
    ctx.strokeStyle = 'rgba(46, 204, 113, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(enemy.x, actualY, enemy.radius + 5 + pulseSize, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
        const offsetX = (player.x - enemy.x) * -0.1 * i;
        const offsetY = (player.y - enemy.y) * -0.1 * i;
        ctx.beginPath();
        ctx.arc(enemy.x + offsetX, actualY + offsetY, enemy.radius - i, 0, Math.PI * 2);
        ctx.stroke();
    }

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

    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 2;
    ctx.stroke();

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
}

