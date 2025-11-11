export function drawPlayer(ctx, canvas, player, options = {}) {
    const { pentagramActive = false, speedActive = false } = options;

    ctx.save();

    if (player.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }

    if (pentagramActive) {
        ctx.shadowColor = '#FF0000';
        ctx.shadowBlur = 30;

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

    const walkCycle = Math.sin(Date.now() / 100) * 3;
    const sizeMultiplier = pentagramActive ? 1.3 : 1;
    const actualRadius = player.radius * sizeMultiplier;
    const playerColor = pentagramActive ? '#8B0000' : player.color;
    const accentColor = pentagramActive ? '#FF0000' : '#4A5FC1';

    ctx.fillStyle = pentagramActive ? '#6B0000' : '#4A5FC1';
    ctx.strokeStyle = pentagramActive ? '#8B0000' : '#2c3e80';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(player.x - 6 * sizeMultiplier, player.y + actualRadius - 5 + walkCycle, 4 * sizeMultiplier, 10 * sizeMultiplier, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(player.x + 6 * sizeMultiplier, player.y + actualRadius - 5 - walkCycle, 4 * sizeMultiplier, 10 * sizeMultiplier, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

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

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = pentagramActive ? '#8B0000' : '#667eea';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(player.x - actualRadius + 2, player.y + 5 - walkCycle, 6 * sizeMultiplier, 4 * sizeMultiplier, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(player.x + actualRadius - 2, player.y + 5 + walkCycle, 6 * sizeMultiplier, 4 * sizeMultiplier, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const eyeColor = pentagramActive ? '#FFD700' : 'white';
    const pupilColor = pentagramActive ? '#FF0000' : 'black';
    const pupilRadius = (speedActive ? 4 : 3) * sizeMultiplier;

    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(player.x - 6 * sizeMultiplier, player.y - 4, 5 * sizeMultiplier, 0, Math.PI * 2);
    ctx.arc(player.x + 6 * sizeMultiplier, player.y - 4, 5 * sizeMultiplier, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = pupilColor;
    ctx.beginPath();
    ctx.arc(player.x - 6 * sizeMultiplier, player.y - 4, pupilRadius, 0, Math.PI * 2);
    ctx.arc(player.x + 6 * sizeMultiplier, player.y - 4, pupilRadius, 0, Math.PI * 2);
    ctx.fill();

    if (speedActive && !pentagramActive) {
        const mouthWidth = 7 * sizeMultiplier;
        const mouthHeight = 4 * sizeMultiplier;
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(player.x, player.y + 6, mouthWidth, mouthHeight, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(player.x - mouthWidth, player.y + 6);
        ctx.lineTo(player.x + mouthWidth, player.y + 6);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(player.x, player.y + 6 - mouthHeight);
        ctx.lineTo(player.x, player.y + 6 + mouthHeight);
        ctx.stroke();
    } else {
        ctx.strokeStyle = pupilColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (pentagramActive) {
            ctx.arc(player.x, player.y + 4, 8 * sizeMultiplier, 0.2, Math.PI - 0.2);
        } else {
            ctx.arc(player.x, player.y + 4, 6, 0, Math.PI);
        }
        ctx.stroke();
    }

    if (pentagramActive) {
        ctx.fillStyle = '#8B0000';
        ctx.strokeStyle = '#6B0000';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(player.x - 12, player.y - actualRadius + 5);
        ctx.quadraticCurveTo(player.x - 15, player.y - actualRadius - 5, player.x - 10, player.y - actualRadius - 10);
        ctx.lineTo(player.x - 8, player.y - actualRadius - 8);
        ctx.quadraticCurveTo(player.x - 12, player.y - actualRadius - 3, player.x - 10, player.y - actualRadius + 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

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

