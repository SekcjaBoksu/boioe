import { shadeColor } from '../utils/color.js';

export function drawProjectile(ctx, proj, options = {}) {
    const { pentagramActive = false } = options;

    if (proj.isHoming) {
        ctx.save();

        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        for (let i = 1; i <= 4; i++) {
            const trailX = proj.x - proj.vx * i * 0.3;
            const trailY = proj.y - proj.vy * i * 0.3;
            ctx.beginPath();
            ctx.arc(trailX, trailY, 6 - i, 0, Math.PI * 2);
            ctx.fill();
        }

        const angle = Math.atan2(proj.vy, proj.vx);
        ctx.translate(proj.x, proj.y);
        ctx.rotate(angle);

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

        ctx.fillStyle = '#FFAA00';
        ctx.beginPath();
        ctx.moveTo(-6, -2);
        ctx.lineTo(-10 - Math.random() * 3, 0);
        ctx.lineTo(-6, 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    } else if (proj.isAK47) {
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#FF8C00';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.ellipse(proj.x, proj.y, 7, 3, Math.atan2(proj.vy, proj.vx), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        for (let i = 1; i <= 3; i++) {
            const trailX = proj.x - proj.vx * i * 0.5;
            const trailY = proj.y - proj.vy * i * 0.5;
            ctx.beginPath();
            ctx.arc(trailX, trailY, 4 - i, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        ctx.fillStyle = pentagramActive ? '#FF0000' : '#4ECDC4';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, pentagramActive ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(proj.x - 2, proj.y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

export function drawEnemyProjectile(ctx, proj) {
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

    ctx.fillStyle = innerColor;
    ctx.beginPath();
    ctx.arc(proj.x - radius * 0.33, proj.y - radius * 0.33, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
}

