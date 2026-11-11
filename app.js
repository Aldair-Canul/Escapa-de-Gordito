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

// POSICIONES Y VELOCIDADES (CALIBRADAS A 60FPS)
let adonPosition = { x: 100, y: 100 };
let gorditoPosition = { x: 400, y: 400 };

let adonSpeed = 1.5;
let gorditoSpeed = 1.2;

let frameScale = 1;
let lastFrameTime = 0;

let currentGorditoDir = '';
let lastAdonDir = 'dir-abajo';

// ESTADO DE TECLAS PARA MOVIMIENTO CONTINUO
const keysPressed = {};

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
            'dir-risa',
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

    // LIMPIAR ESTADO DE TECLAS
    for (let key in keysPressed) {
        delete keysPressed[key];
    }

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
// CANSANCIO DE GORDITO Y RISA DE ADON
// ==========================================

function startGorditoCycle() {

    clearTimeout(gorditoTiredTimeout);
    clearTimeout(gorditoResumeTimeout);

    isGorditoTired = false;

    gorditoTiredTimeout = setTimeout(() => {

        if (!gameActive) return;

        isGorditoTired = true;

        // GORDITO SE CANSA Y ADON SE QUEDA PARADO BURLÁNDOSE
        gordito.classList.remove('walking');
        setDirection(gordito, 'dir-mecanse');

        adon.classList.remove('walking');
        setDirection(adon, 'dir-risa');

        // AUDIO DE RISA
        risaSound.currentTime = 0;

        risaSound.play().catch(err => {
            console.log('Audio de risa bloqueado:', err);
        });

        gorditoResumeTimeout = setTimeout(() => {

            if (!gameActive) return;

            isGorditoTired = false;
            currentGorditoDir = '';

            // RESTAURAR ESTADO DE ADON
            setDirection(adon, 'dir-reposo');

            startGorditoCycle();

        }, 3000);

    }, 9000);
}

// ==========================================
// EVENTOS DE TECLADO (KEYDOWN / KEYUP)
// ==========================================

window.addEventListener('keydown', (event) => {

    if (!gameActive) return;

    // DASH CON SHIFT (BLOQUEADO SI GORDITO ESTÁ CANSADO)
    if (event.key === 'Shift') {

        event.preventDefault();

        if (isGorditoTired || isDashOnCooldown || event.repeat) return;

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

        clampAdonPosition();
        updatePositions();
        checkCollision();

        dashCooldownTimeout = setTimeout(() => {
            isDashOnCooldown = false;
        }, dashCooldownTime);

        return;
    }

    // REGISTRAR TECLAS DE DIRECCIÓN PRESIONADAS
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        keysPressed[event.key] = true;
    }
});

window.addEventListener('keyup', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        keysPressed[event.key] = false;
    }
});

// ==========================================
// MOVIMIENTO DE ADON
// ==========================================

function moveAdon() {

    if (!gameActive) return;

    // BLOQUEAR MOVIMIENTO SI GORDITO ESTÁ CANSADO 
    if (isGorditoTired) {
        adon.classList.remove('walking');
        setDirection(adon, 'dir-risa');
        return;
    }

    let isMoving = false;
    let dir = null;

    const adonStep = adonSpeed * frameScale;

    if (keysPressed['ArrowUp']) {
        adonPosition.y -= adonStep;
        dir = 'dir-arriba';
        isMoving = true;
    } else if (keysPressed['ArrowDown']) {
        adonPosition.y += adonStep;
        dir = 'dir-abajo';
        isMoving = true;
    }

    if (keysPressed['ArrowLeft']) {
        adonPosition.x -= adonStep;
        dir = 'dir-izquierda';
        isMoving = true;
    } else if (keysPressed['ArrowRight']) {
        adonPosition.x += adonStep;
        dir = 'dir-derecha';
        isMoving = true;
    }

    if (isMoving) {
        lastAdonDir = dir;
        setDirection(adon, dir);
        adon.classList.add('walking');

        clampAdonPosition();
        updatePositions();
        checkCollision();

    } else {
        adon.classList.remove('walking');
        setDirection(adon, 'dir-reposo');
    }
}

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
    let distance = Math.hypot(deltaX, deltaY);

    if (distance > 0) {
        const gorditoStep = gorditoSpeed * frameScale;
        gorditoPosition.x += (deltaX / distance) * gorditoStep;
        gorditoPosition.y += (deltaY / distance) * gorditoStep;
    }

    gordito.classList.add('walking');

    let targetDir = currentGorditoDir;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        targetDir = deltaX > 0 ? 'dir-derecha' : 'dir-izquierda';
    } else {
        targetDir = deltaY > 0 ? 'dir-abajo' : 'dir-arriba';
    }

    if (targetDir && targetDir !== currentGorditoDir) {
        currentGorditoDir = targetDir;
        setDirection(gordito, currentGorditoDir);
    }

    updatePositions();
    checkCollision();
}

// ==========================================
// ACTUALIZAR POSICIONES EN EL DOM
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

    for (let key in keysPressed) {
        delete keysPressed[key];
    }

    clearTimeout(gorditoTiredTimeout);
    clearTimeout(gorditoResumeTimeout);
    clearTimeout(dashCooldownTimeout);

    bgMusic.pause();
    risaSound.pause();
    dashSound.pause();

    gameTimer.hidden = true;

    adon.classList.remove('walking');
    gordito.classList.remove('walking');

    if (victory) {

        // ADON SOBREVIVIÓ 35 SEGUNDOS
        setDirection(adon, 'dir-risa');
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

function gameLoop(now = performance.now()) {

    if (lastFrameTime) {
        frameScale = Math.min((now - lastFrameTime) / (1000 / 60), 3);
    }
    lastFrameTime = now;

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

            moveAdon();
            moveGordito();
        }
    }

    requestAnimationFrame(gameLoop);
}

// =======================
// PANEL DE CONFIGURACIÓN 
// =======================

const adonSpeedInput = document.getElementById('adon-speed-input');
const gorditoSpeedInput = document.getElementById('gordito-speed-input');
const volumeInput = document.getElementById('volume-input');

// LOS SLIDERS ARRANCAN CON LOS VALORES REALES DEL JUEGO
if (adonSpeedInput) adonSpeedInput.value = adonSpeed;
if (gorditoSpeedInput) gorditoSpeedInput.value = gorditoSpeed;

if (adonSpeedInput) {
    adonSpeedInput.addEventListener('input', (e) => {
        adonSpeed = parseFloat(e.target.value);
    });
}

if (gorditoSpeedInput) {
    gorditoSpeedInput.addEventListener('input', (e) => {
        gorditoSpeed = parseFloat(e.target.value);
    });
}

if (volumeInput) {
    volumeInput.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value);
        bgMusic.volume = vol;
        risaSound.volume = vol;
        loserSound.volume = vol;
        dashSound.volume = vol;
    });
}

// ================
// INICIAR EL MENÚ
// ================

setDirection(adon, 'dir-reposo');
setDirection(gordito, 'dir-reposo');

updatePositions();

gameTimer.hidden = true;

gameLoop();