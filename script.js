let allMoviesData = [];
let movieList = [];
let currentMovie = null;

// Her aşamanın kendi içindeki sabit akış hızı (Milisaniye cinsinden)
const speedLevels = [100, 200, 300]; 
const MAX_GUESSES_PER_LEVEL = 3;

let currentSpeedIndex = 0;
let currentFrameIndex = 0;
let timerId = null;
let wrongGuessCount = 0; // Her seviyede sıfırlanır
let gameOver = false;

// HTML Elementleri
const imgElement = document.getElementById("film-frame");
const statusText = document.getElementById("status-text");
const guessInput = document.getElementById("guess-input");
const autocompleteList = document.getElementById("autocomplete-list");
const btnPlay = document.getElementById("btn-play");
const btnSubmit = document.getElementById("btn-submit");
const btnSkip = document.getElementById("btn-skip");
const btnReplay = document.getElementById("btn-replay");
const messageElement = document.getElementById("message");

// Oyunu Başlat
initGame();

async function initGame() {
    try {
        statusText.innerText = "Oyun yükleniyor...";
        const response = await fetch("movies.json");
        if (!response.ok) throw new Error("JSON dosyası okunamadı.");

        allMoviesData = await response.json();
        movieList = allMoviesData.map(movie => movie.title);

        startNewRound();
    } catch (error) {
        console.error(error);
        statusText.innerText = "HATA: Veriler yüklenemedi!";
    }
}

// Yeni Tur / Tekrar Oyna
function startNewRound() {
    if (!allMoviesData.length) return;

    currentSpeedIndex = 0;
    currentFrameIndex = 0;
    wrongGuessCount = 0;
    gameOver = false;
    
    if (timerId) clearInterval(timerId);
    timerId = null;

    const randomIndex = Math.floor(Math.random() * allMoviesData.length);
    currentMovie = allMoviesData[randomIndex];

    if (currentMovie && currentMovie.frames.length > 0) {
        imgElement.src = currentMovie.frames[0];
        preloadImages(currentMovie.frames);
    }

    guessInput.value = "";
    guessInput.disabled = false;
    autocompleteList.innerHTML = "";
    messageElement.innerText = "";
    messageElement.style.color = "";

    btnPlay.style.display = "inline-block";
    btnSkip.style.display = "none";
    btnReplay.style.display = "none";
    btnSubmit.disabled = true;
    btnSkip.disabled = true;

    statusText.innerText = "Hazır! Oynat butonuna basarak sahneleri göster.";
}

// Görselleri önbelleğe al
function preloadImages(frameList) {
    frameList.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// Sahneleri Oynatma Mantığı
function playFrames(speed) {
    if (!currentMovie || !currentMovie.frames) return;

    if (timerId) clearInterval(timerId);

    btnSkip.disabled = true;
    btnSubmit.disabled = true;

    currentFrameIndex = 0;
    imgElement.src = currentMovie.frames[0];

    timerId = setInterval(() => {
        currentFrameIndex++;

        if (currentFrameIndex >= currentMovie.frames.length) {
            clearInterval(timerId);
            timerId = null;

            // SON KARE BİTTİKTEN SONRA EKRANI SİYAH YAP (Görseli temizle)
            imgElement.src = "";

            const hakBitti = wrongGuessCount >= MAX_GUESSES_PER_LEVEL;
            const sonSeviye = currentSpeedIndex >= speedLevels.length - 1;

            if (sonSeviye) {
                btnSkip.style.display = "none";
                if (hakBitti) {
                    endGame(false);
                } else {
                    btnSubmit.disabled = false;
                    statusText.innerText = "Son seviye bitti! Tahminini yap.";
                }
            } else {
                btnSkip.disabled = false;
                if (hakBitti) {
                    btnSubmit.disabled = true;
                    statusText.innerText = "Bu seviyedeki hakkın bitti! Hızlandır'a bas.";
                } else {
                    btnSubmit.disabled = false;
                }
            }
            return;
        }

        imgElement.src = currentMovie.frames[currentFrameIndex];
    }, speed);
}

function updateStatusMessage() {
    const levels = [
        "1. Aşama (Hızlı Akış)",
        "2. Aşama (Orta Akış)",
        "3. Aşama (Yavaş Akış)"
    ];
    statusText.innerText = `Oynatılıyor: ${levels[currentSpeedIndex]}`;
}

// Oyun Bitişi (Kazandı / Kaybetti)
function endGame(won) {
    gameOver = true;

    if (timerId) clearInterval(timerId);
    timerId = null;

    btnSubmit.disabled = true;
    guessInput.disabled = true;
    btnSkip.style.display = "none";
    btnReplay.style.display = "inline-block";

    if (won) {
        messageElement.style.color = "#4caf50";
        messageElement.innerText = "TEBRİKLER! Doğru Tahmin 🎉";
    } else {
        messageElement.style.color = "#f44336";
        messageElement.innerText = `Bilemedin! Doğru cevap: ${currentMovie.title}`;
    }
}

// Buton Olayları
btnPlay.addEventListener("click", () => {
    btnPlay.style.display = "none";
    btnSkip.style.display = "inline-block";
    updateStatusMessage();
    messageElement.innerText = "";
    playFrames(speedLevels[currentSpeedIndex]);
});

btnSkip.addEventListener("click", () => {
    if (currentSpeedIndex < speedLevels.length - 1) {
        currentSpeedIndex++;
        wrongGuessCount = 0; // YENİ SEVİYE = YENİ 3 HAK
        updateStatusMessage();
        messageElement.innerText = "";
        playFrames(speedLevels[currentSpeedIndex]);
    }
});

btnSubmit.addEventListener("click", () => {
    if (gameOver || wrongGuessCount >= MAX_GUESSES_PER_LEVEL) return;

    const userGuess = guessInput.value.trim().toLowerCase();
    const correctAnswer = currentMovie.title.toLowerCase();

    if (userGuess === correctAnswer) {
        endGame(true);
    } else {
        wrongGuessCount++;
        const kalanHak = MAX_GUESSES_PER_LEVEL - wrongGuessCount;
        const sonSeviye = currentSpeedIndex >= speedLevels.length - 1;

        if (kalanHak <= 0) {
            btnSubmit.disabled = true;
            if (sonSeviye) {
                if (!timerId) {
                    endGame(false);
                } else {
                    messageElement.style.color = "#f44336";
                    messageElement.innerText = "Bu seviyedeki hakkın bitti!";
                }
            } else {
                messageElement.style.color = "#f44336";
                messageElement.innerText = "Bu seviyedeki hakkın bitti! Hızlandır'a basarak devam et.";
            }
        } else {
            messageElement.style.color = "#f44336";
            messageElement.innerText = `Yanlış tahmin! Bu seviyede kalan hakkın: ${kalanHak}`;
        }
    }
});

btnReplay.addEventListener("click", () => {
    startNewRound();
});

// Otomatik Tamamlama (Autocomplete)
guessInput.addEventListener("input", function() {
    const val = this.value.trim().toLowerCase();
    autocompleteList.innerHTML = "";
    if (!val) return;

    const matches = movieList.filter(m => m.toLowerCase().includes(val));
    matches.forEach(movie => {
        const item = document.createElement("div");
        item.innerText = movie;
        item.addEventListener("click", () => {
            guessInput.value = movie;
            autocompleteList.innerHTML = "";
        });
        autocompleteList.appendChild(item);
    });
});

document.addEventListener("click", (e) => {
    if (e.target !== guessInput) {
        autocompleteList.innerHTML = "";
    }
});