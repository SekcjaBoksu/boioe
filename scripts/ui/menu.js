const STORAGE_KEY = 'tbok_highscore';

function readHighScore() {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return Number.isFinite(Number(value)) ? Number(value) : 0;
    } catch {
        return 0;
    }
}

function writeHighScore(value) {
    try {
        localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
        // Ignore storage errors (private browsing etc.)
    }
}

export function createMenuController({
    menuOverlay,
    gameOverOverlay,
    countdownOverlay,
    countdownValueElement,
    highScoreValueElement,
    finalKillsElement,
    finalCoinsElement,
    finalHighScoreElement,
    startButton,
    restartButton
}) {
    let highScore = readHighScore();
    let countdownInterval = null;
    let countdownTimeout = null;

    const startHandlers = {
        onPrepare: null,
        onStart: null
    };

    const restartHandlers = {
        onPrepare: null,
        onStart: null
    };

    function updateHighScoreDisplay() {
        if (highScoreValueElement) {
            highScoreValueElement.textContent = String(highScore);
        }
        if (finalHighScoreElement) {
            finalHighScoreElement.textContent = String(highScore);
        }
    }

    function showMenu() {
        updateHighScoreDisplay();
        if (menuOverlay) {
            menuOverlay.classList.remove('hidden');
        }
    }

    function hideMenu() {
        if (menuOverlay) {
            menuOverlay.classList.add('hidden');
        }
    }

    function showGameOver() {
        if (gameOverOverlay) {
            gameOverOverlay.classList.remove('hidden');
        }
    }

    function hideGameOver() {
        if (gameOverOverlay) {
            gameOverOverlay.classList.add('hidden');
        }
    }

    function clearCountdownTimers() {
        if (countdownInterval !== null) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        if (countdownTimeout !== null) {
            clearTimeout(countdownTimeout);
            countdownTimeout = null;
        }
    }

    function hideCountdown() {
        clearCountdownTimers();
        if (countdownOverlay) {
            countdownOverlay.classList.add('hidden');
        }
    }

    function startCountdown(onComplete, seconds = 3) {
        if (!countdownOverlay || !countdownValueElement) {
            onComplete?.();
            return;
        }

        clearCountdownTimers();
        countdownOverlay.classList.remove('hidden');

        let current = seconds;
        countdownValueElement.textContent = String(current);

        countdownInterval = setInterval(() => {
            current -= 1;
            if (current > 0) {
                countdownValueElement.textContent = String(current);
            } else {
                clearCountdownTimers();
                countdownValueElement.textContent = 'START!';
                countdownTimeout = setTimeout(() => {
                    hideCountdown();
                    onComplete?.();
                }, 600);
            }
        }, 1000);
    }

    function handleStartRequest() {
        hideMenu();
        if (typeof startHandlers.onPrepare === 'function') {
            startHandlers.onPrepare();
        }
        startCountdown(() => {
            if (typeof startHandlers.onStart === 'function') {
                startHandlers.onStart();
            }
        });
    }

    function handleRestartRequest() {
        hideGameOver();
        if (typeof restartHandlers.onPrepare === 'function') {
            restartHandlers.onPrepare();
        }
        startCountdown(() => {
            if (typeof restartHandlers.onStart === 'function') {
                restartHandlers.onStart();
            }
        });
    }

    if (startButton) {
        startButton.addEventListener('click', handleStartRequest);
    }

    if (restartButton) {
        restartButton.addEventListener('click', handleRestartRequest);
    }

    function handleGameOver({ kills = 0, coins = 0 } = {}) {
        if (finalKillsElement) {
            finalKillsElement.textContent = String(kills);
        }
        if (finalCoinsElement) {
            finalCoinsElement.textContent = String(coins);
        }

        if (kills > highScore) {
            highScore = kills;
            writeHighScore(highScore);
        }

        updateHighScoreDisplay();
        hideCountdown();
        showGameOver();
    }

    return {
        showMenu,
        hideMenu,
        handleGameOver,
        setStartHandlers(handlers) {
            startHandlers.onPrepare = handlers?.onPrepare ?? null;
            startHandlers.onStart = handlers?.onStart ?? null;
        },
        setRestartHandlers(handlers) {
            restartHandlers.onPrepare = handlers?.onPrepare ?? null;
            restartHandlers.onStart = handlers?.onStart ?? null;
        },
        getHighScore() {
            return highScore;
        },
        refreshHighScore: updateHighScoreDisplay
    };
}

