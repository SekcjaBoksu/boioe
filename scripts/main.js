import { createGame } from './core/game.js';
import { createMenuController } from './ui/menu.js';

function init() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Nie znaleziono elementu canvas dla gry.');
        return;
    }

    const heartsContainer = document.getElementById('hearts');
    const coinsElement = document.getElementById('coins');
    const killsElement = document.getElementById('kills');

    let menuController;

    const game = createGame({
        canvas,
        heartsContainer,
        coinsElement,
        killsElement,
        onGameOver: (stats) => {
            menuController?.handleGameOver(stats);
        }
    });

    menuController = createMenuController({
        menuOverlay: document.getElementById('menuOverlay'),
        gameOverOverlay: document.getElementById('gameOverOverlay'),
        countdownOverlay: document.getElementById('countdownOverlay'),
        countdownValueElement: document.getElementById('countdownValue'),
        highScoreValueElement: document.getElementById('highScoreValue'),
        finalKillsElement: document.getElementById('finalKills'),
        finalCoinsElement: document.getElementById('finalCoins'),
        finalHighScoreElement: document.getElementById('finalHighScore'),
        startButton: document.getElementById('menuStartButton'),
        restartButton: document.getElementById('restartButton')
    });

    menuController.setStartHandlers({
        onPrepare: () => {
            game.prepareForNewRun();
        },
        onStart: () => {
            game.startRun();
        }
    });

    menuController.setRestartHandlers({
        onPrepare: () => {
            game.prepareForNewRun();
        },
        onStart: () => {
            game.startRun();
        }
    });

    menuController.refreshHighScore();
    menuController.showMenu();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

