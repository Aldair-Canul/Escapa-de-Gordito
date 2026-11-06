
const adon = document.getElementById('adon');
const gordito = document.getElementById('gordito');
const gameArea = document.getElementById('game-area');

// MENÚ Y CONTADOR
const gameMenu = document.getElementById('game-menu');
const btnStart = document.getElementById('btn-start');
const gameTimer = document.getElementById('game-timer');
const timeLeft = document.getElementById('time-left');

// AUDIOS
const bgMusic = new Audio('sound/musica-fondo.mp3.mpeg');
const risaSound = new Audio('sound/risa.wav');
const loserSound = new Audio('sound/loser.mp3.mpeg');
const dashSound = new Audio('sound/dash.ogg');

bgMusic.loop = true;
bgMusic.preload = 'auto';
risaSound.preload = 'auto';
loserSound.preload = 'auto';
dashSound.preload = 'auto';

// POSICIONES
let adonPosition = { x: 100, y: 100 };
let gorditoPosition = { x: 400, y: 400 };

const adonSpeed = 45;
const gorditoSpeed = 0.7;

let currentGorditoDir = '';
let lastAdonDir = 'dir-abajo';
let adonStopTimeout = null;

// ESTADO DEL JUEGO
let gameActive = false;

// DURACIÓN DE PARTIDA
const survivalTime = 35000;
let gameStartTime = 0;

// DASH
const dashDistance = 135;
const dashCooldownTime = 5000;

let isDashOnCooldown = false;
let dashCooldownTimeout = null;

// CANSANCIO DE GORDITO
let isGorditoTired = false;
let gorditoTiredTimeout = null;
let gorditoResumeTimeout = null;

// ==========================================
// CAMBIAR SPRITES
// ==========================================

function setDirection(element, dirClass) {

    if (!element.classList.contains(dirClass)) {

        element.classList.remove(
            'dir-abajo',
            'dir-arriba',
            'dir-izquierda',
            'dir-derecha',
            'dir-reposo',
            'dir-mecanse',
            'dir-llorando',
            'dir-celebrar'
        );

        element.classList.add(dirClass);
    }
}

// ==========================================
// INICIAR JUEGO
// ==========================================

function startGame() {

    // REINICIAR PERSONAJES
    adonPosition = { x: 100, y: 100 };
    gorditoPosition = { x: 400, y: 400 };

    lastAdonDir = 'dir-abajo';
    currentGorditoDir = '';

    adon.classList.remove('walking');
    gordito.classList.remove('walking');

    setDirection(adon, 'dir-reposo');
    setDirection(gordito, 'dir-reposo');

    updatePositions();

    // REINICIAR DASH
    clearTimeout(dashCooldownTimeout);
    clearTimeout(adonStopTimeout);
    isDashOnCooldown = false;

    // INICIAR PARTIDA
    gameActive = true;

    gameStartTime = performance.now();
    timeLeft.textContent = 35;

    gameMenu.style.display = 'none';
    gameTimer.hidden = false;

    // INICIAR MÚSICA
    bgMusic.currentTime = 0;

    bgMusic.play().catch(err => {
        console.log('Audio bloqueado:', err);
    });

    startGorditoCycle();
}

btnStart.addEventListener('click', startGame);

// ==========================================
// CANSANCIO DE GORDITO
// ==========================================

function startGorditoCycle() {

    clearTimeout(gorditoTiredTimeout);
    clearTimeout(gorditoResumeTimeout);

    isGorditoTired = false;

    gorditoTiredTimeout = setTimeout(() => {

        if (!gameActive) return;

        isGorditoTired = true;

        gordito.classList.remove('walking');
        setDirection(gordito, 'dir-mecanse');

        // AUDIO DE RISA
        risaSound.currentTime = 0;

        risaSound.play().catch(err => {
            console.log('Audio de risa bloqueado:', err);
        });

        gorditoResumeTimeout = setTimeout(() => {

            if (!gameActive) return;

            isGorditoTired = false;
            currentGorditoDir = '';

            startGorditoCycle();

        }, 3000);

    }, 9000);
}

// ==========================================
// CONTROLES DE ADON
// ==========================================

window.addEventListener('keydown', (event) => {

    // NO MOVER SI LA PARTIDA NO HA INICIADO
    if (!gameActive) return;

    // DASH CON SHIFT
    if (event.key === 'Shift') {

        event.preventDefault();

        if (isDashOnCooldown || event.repeat) return;

        isDashOnCooldown = true;

        dashSound.currentTime = 0;

        dashSound.play().catch(err => {
            console.log('Audio dash bloqueado:', err);
        });

        switch (lastAdonDir) {

            case 'dir-arriba':
                adonPosition.y -= dashDistance;
                break;

            case 'dir-abajo':
                adonPosition.y += dashDistance;
                break;

            case 'dir-izquierda':
                adonPosition.x -= dashDistance;
                break;

            case 'dir-derecha':
                adonPosition.x += dashDistance;
                break;
        }

        setDirection(adon, lastAdonDir);
        adon.classList.add('walking');

        clearTimeout(adonStopTimeout);

        adonStopTimeout = setTimeout(() => {

            if (gameActive) {
                adon.classList.remove('walking');
                setDirection(adon, 'dir-reposo');
            }

        }, 250);

        clampAdonPosition();
        updatePositions();
        checkCollision();

        dashCooldownTimeout = setTimeout(() => {
            isDashOnCooldown = false;
        }, dashCooldownTime);

        return;
    }

    // MOVIMIENTO NORMAL
    let dir = null;

    switch (event.key) {

        case 'ArrowUp':
            adonPosition.y -= adonSpeed;
            dir = 'dir-arriba';
            break;

        case 'ArrowDown':
            adonPosition.y += adonSpeed;
            dir = 'dir-abajo';
            break;

        case 'ArrowLeft':
            adonPosition.x -= adonSpeed;
            dir = 'dir-izquierda';
            break;

        case 'ArrowRight':
            adonPosition.x += adonSpeed;
            dir = 'dir-derecha';
            break;

        default:
            return;
    }

    event.preventDefault();

    lastAdonDir = dir;

    setDirection(adon, dir);
    adon.classList.add('walking');

    clearTimeout(adonStopTimeout);

    adonStopTimeout = setTimeout(() => {

        if (gameActive) {
            adon.classList.remove('walking');
            setDirection(adon, 'dir-reposo');
        }

    }, 200);

    clampAdonPosition();
    updatePositions();
    checkCollision();
});

// ==========================================
// LÍMITES DEL ESCENARIO
// ==========================================

function clampAdonPosition() {

    adonPosition.x = Math.max(0, Math.min(
        adonPosition.x,
        gameArea.clientWidth - adon.offsetWidth
    ));

    adonPosition.y = Math.max(0, Math.min(
        adonPosition.y,
        gameArea.clientHeight - adon.offsetHeight
    ));
}

// ==========================================
// MOVIMIENTO DE GORDITO
// ==========================================

function moveGordito() {

    if (!gameActive) return;

    if (isGorditoTired) {
        setDirection(gordito, 'dir-mecanse');
        checkCollision();
        return;
    }

    let deltaX = adonPosition.x - gorditoPosition.x;
    let deltaY = adonPosition.y - gorditoPosition.y;

    if (gorditoPosition.x < adonPosition.x) {
        gorditoPosition.x += gorditoSpeed;
    } else if (gorditoPosition.x > adonPosition.x) {
        gorditoPosition.x -= gorditoSpeed;
    }

    if (gorditoPosition.y < adonPosition.y) {
        gorditoPosition.y += gorditoSpeed;
    } else if (gorditoPosition.y > adonPosition.y) {
        gorditoPosition.y -= gorditoSpeed;
    }

    gordito.classList.add('walking');

    let targetDir = currentGorditoDir;

    if (Math.abs(deltaX) > Math.abs(deltaY) + 8) {
        targetDir = deltaX > 0
            ? 'dir-derecha'
            : 'dir-izquierda';

    } else if (Math.abs(deltaY) > Math.abs(deltaX) + 8) {
        targetDir = deltaY > 0
            ? 'dir-abajo'
            : 'dir-arriba';
    }

    if (targetDir && targetDir !== currentGorditoDir) {
        currentGorditoDir = targetDir;
        setDirection(gordito, currentGorditoDir);
    }

    updatePositions();
    checkCollision();
}

// ==========================================
// ACTUALIZAR POSICIONES
// ==========================================

function updatePositions() {

    adon.style.transform =
        `translate(${adonPosition.x}px, ${adonPosition.y}px)`;

    gordito.style.transform =
        `translate(${gorditoPosition.x}px, ${gorditoPosition.y}px)`;
}

// ==========================================
// TERMINAR PARTIDA
// ==========================================

function finishGame(victory) {

    if (!gameActive) return;

    gameActive = false;

    clearTimeout(gorditoTiredTimeout);
    clearTimeout(gorditoResumeTimeout);
    clearTimeout(adonStopTimeout);
    clearTimeout(dashCooldownTimeout);

    bgMusic.pause();
    risaSound.pause();
    dashSound.pause();

    gameTimer.hidden = true;

    adon.classList.remove('walking');
    gordito.classList.remove('walking');

    if (victory) {

        // ADON SOBREVIVIÓ 35 SEGUNDOS
        setDirection(adon, 'dir-reposo');
        setDirection(gordito, 'dir-mecanse');

    } else {

        // GORDITO ATRAPÓ A ADON
        setDirection(adon, 'dir-llorando');
        setDirection(gordito, 'dir-celebrar');

        loserSound.currentTime = 0;

        loserSound.play().catch(err => {
            console.log('Audio loser bloqueado:', err);
        });
    }

    // MOSTRAR MENSAJE DESPUÉS DE LA ANIMACIÓN
    setTimeout(() => {

        if (victory) {
            alert('¡Felicidades! ¡Sobreviviste a Gordito!');
        } else {
            alert('¡Gordito te atrapó! ¡Game Over!');
        }

        // REINICIAR POSICIONES
        adonPosition = { x: 100, y: 100 };
        gorditoPosition = { x: 400, y: 400 };

        adon.classList.remove('walking');
        gordito.classList.remove('walking');

        setDirection(adon, 'dir-reposo');
        setDirection(gordito, 'dir-reposo');

        updatePositions();

        // VOLVER AL MENÚ
        gameMenu.style.display = 'flex';

    }, 1200);
}

// ==========================================
// DETECTAR COLISIONES
// ==========================================

function checkCollision() {

    if (!gameActive) return;

    if (
        Math.abs(adonPosition.x - gorditoPosition.x) < 45 &&
        Math.abs(adonPosition.y - gorditoPosition.y) < 45
    ) {
        finishGame(false);
    }
}

// ==========================================
// CICLO DEL JUEGO Y CONTADOR
// ==========================================

function gameLoop() {

    if (gameActive) {

        // CALCULAR TIEMPO RESTANTE
        const elapsedTime = performance.now() - gameStartTime;

        const remainingTime = Math.max(
            0,
            35000 - elapsedTime
        );

        timeLeft.textContent = Math.ceil(remainingTime / 1000);

        // VICTORIA AL LLEGAR A CERO
        if (remainingTime <= 0) {

            finishGame(true);

        } else {

            moveGordito();
        }
    }

    requestAnimationFrame(gameLoop);
}

// ==========================================
// INICIAR EL MENÚ
// ==========================================

setDirection(adon, 'dir-reposo');
setDirection(gordito, 'dir-reposo');

updatePositions();

gameTimer.hidden = true;

gameLoop();
