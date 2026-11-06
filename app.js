const adon = document.getElementById('adon');
const gordito = document.getElementById('gordito');
const gameArea = document.getElementById('game-area');
const bgMusic = new Audio('sound/musica-fondo.mp3.mpeg');
const risaSound = new Audio('sound/risa.wav'); 
const loserSound = new Audio('sound/loser.mp3.mpeg'); 
loserSound.preload = 'auto';
risaSound.preload = 'auto';
bgMusic.loop = true;
bgMusic.preload = 'auto'; 

let musicStarted = false;

// Función para iniciar el audio al instante al presionar cualquier tecla
function playBackgroundMusic() {
    if (!musicStarted) {
        bgMusic.play().then(() => {
            musicStarted = true;
        }).catch(err => {
            console.log("Esperando interacción para reprodución:", err);
        });
    }
}


let adonPosition = { x: 100, y: 100 };
let gorditoPosition = { x: 400, y: 400 };

const adonSpeed = 45;
let currentGorditoDir = '';

// Estado de juego y audio
let isGameOver = false;

// Temporizador para la animación de caminata
let adonStopTimeout = null;

// Rastrear la última dirección de Adon para orientar el impulso
let lastAdonDir = 'dir-abajo';

// CONFIGURACIÓN DEL DASH (IMPULSO)
const dashDistance = 135;       
const dashCooldownTime = 5000;   
let isDashOnCooldown = false;    

// ESTADO DE CANSANCIO DE GORDITO (9s persiguiendo / 3s cansado)
let isGorditoTired = false;
let gorditoTiredTimeout = null;
let gorditoResumeTimeout = null;

function startGorditoCycle() {
    clearTimeout(gorditoTiredTimeout);
    clearTimeout(gorditoResumeTimeout);
    isGorditoTired = false;

    gorditoTiredTimeout = setTimeout(() => {
        if (isGameOver) return;
        isGorditoTired = true;
        setDirection(gordito, 'dir-mecanse');
        gordito.classList.add('walking');

        // Reproducción del audio de risa sin retraso
        risaSound.currentTime = 0;
        risaSound.play().catch(err => console.log("Audio de risa bloqueado:", err));

        gorditoResumeTimeout = setTimeout(() => {
            if (isGameOver) return;
            isGorditoTired = false;
            currentGorditoDir = '';
            startGorditoCycle();
        }, 3000);
    }, 9000);
}

function setDirection(element, dirClass) {
    if (!element.classList.contains(dirClass)) {
        element.classList.remove('dir-abajo',
             'dir-arriba', 'dir-izquierda', 
             'dir-derecha', 'dir-reposo',
             'dir-mecanse', 'dir-llorando',
            'dir-celebrar');
        element.classList.add(dirClass);
    }
}

// Inicializar direcciones por defecto en reposo y comenzar ciclo
setDirection(adon, 'dir-reposo');
setDirection(gordito, 'dir-reposo');
startGorditoCycle();

// Iniciar música de fondo tras la primera interacción del usuario
function playBackgroundMusic() {
    if (!musicStarted && bgMusic) {
        bgMusic.play().then(() => {
            musicStarted = true;
        }).catch(err => {
            console.log("Esperando interacción para reprodución de audio:", err);
        });
    }
}

window.addEventListener('keydown', (event) => {
    playBackgroundMusic();

    if (isGameOver) return; 
    const dashSound = new Audio('sound/dash.ogg'); 
    dashSound.preload = 'auto';
    // --- ACCIÓN DE DASH (SHIFT) ---
    if (event.key === 'Shift') {
        event.preventDefault();

        if (isDashOnCooldown) return;

        dashSound.currentTime = 0;
        dashSound.play().catch(err => console.log("Audio de dash bloqueado:", err));
        isDashOnCooldown = true;

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
            if (!isGameOver) {
                adon.classList.remove('walking');
                setDirection(adon, 'dir-reposo');
            }
        }, 250);

        clampAdonPosition();
        updatePositions();

        setTimeout(() => {
            isDashOnCooldown = false;
        }, dashCooldownTime);

        return;
    }

    // --- MOVIMIENTO CON TECLAS DE DIRECCIÓN ---
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
        if (!isGameOver) {
            adon.classList.remove('walking');
            setDirection(adon, 'dir-reposo');
        }
    }, 200);

    clampAdonPosition();
    updatePositions();
});

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

const gorditoSpeed = 0.7;

function moveGordito() {
    if (isGameOver) return; // Congela el movimiento si Adon fue atrapado

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
        targetDir = deltaX > 0 ? 'dir-derecha' : 'dir-izquierda';
    } else if (Math.abs(deltaY) > Math.abs(deltaX) + 8) {
        targetDir = deltaY > 0 ? 'dir-abajo' : 'dir-arriba';
    }

    if (targetDir && targetDir !== currentGorditoDir) {
        currentGorditoDir = targetDir;
        setDirection(gordito, currentGorditoDir);
    }

    updatePositions();
    checkCollision();
}

function updatePositions() {
    adon.style.transform = `translate(${adonPosition.x}px, ${adonPosition.y}px)`;
    gordito.style.transform = `translate(${gorditoPosition.x}px, ${gorditoPosition.y}px)`;
}

function checkCollision() {
    if (isGameOver) return;

    if (
        Math.abs(adonPosition.x - gorditoPosition.x) < 45 &&
        Math.abs(adonPosition.y - gorditoPosition.y) < 45
    ) {
        isGameOver = true;

        // Reproducir el audio de derrota al instante
        loserSound.currentTime = 0;
        loserSound.play().catch(err => console.log("Audio loser bloqueado:", err));

        // Cambiar sprites
        setDirection(adon, 'dir-llorando');
        setDirection(gordito, 'dir-celebrar');
        adon.classList.add('walking');
        gordito.classList.add('walking');

        setTimeout(() => {
            alert('¡Gordito te atrapó! ¡Game Over!');

            adonPosition = { x: 100, y: 100 };
            gorditoPosition = { x: 400, y: 400 };

            adon.classList.remove('walking');
            gordito.classList.remove('walking');
            setDirection(adon, 'dir-reposo');
            setDirection(gordito, 'dir-reposo');

            updatePositions();
            isGameOver = false;
            startGorditoCycle();
        }, 1200);
    }
}

function gameLoop() {
    moveGordito();
    requestAnimationFrame(gameLoop);
}

updatePositions();
gameLoop();