document.addEventListener("DOMContentLoaded", () => {
    let score = 100;
    let decayStarted = false;
    let gameOver = false;
    let decayStartTime = null;
    let secretWord = "";
    let hints = [];
    let hintIndex = 0;
    let lastHintScore = 100;
    let firstGuessMade = false;
    let pausedTime = null;
    let allGames = [];

    console.log("Hungry Shark Version: Updated with Anagram/Snakebite screens and end screen links");

    async function fetchGameData() {
        const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vThRLyZdJhT8H1_VEHQ1OuFi9tOB6QeRDIDD0PZ9PddetHpLybJG8mAjMxTtFsDpxWBx7v4eQOTaGyI/pub?gid=0&single=true&output=csv";
        try {
            const response = await fetch(csvUrl);
            const text = await response.text();
            const rows = text.split("\n").map(row => row.split(","));
            const headers = rows[0];
            allGames = rows.slice(1).map(row => {
                let obj = {};
                headers.forEach((header, i) => obj[header.trim()] = row[i] ? row[i].trim() : "");
                return obj;
            });

            const latestEntry = allGames.reduce((latest, current) => {
                return new Date(current.Date) > new Date(latest.Date) ? current : latest;
            }, allGames[0]);

            secretWord = latestEntry["Secret Word"].toUpperCase();
            hints = [
                latestEntry["Hint 1"], latestEntry["Hint 2"], latestEntry["Hint 3"],
                latestEntry["Hint 4"], latestEntry["Hint 5"], latestEntry["Hint 6"],
                latestEntry["Hint 7"], latestEntry["Hint 8"], latestEntry["Hint 9"]
            ].filter(hint => hint).map(hint => hint.toUpperCase());

            while (hints.length < 7) hints.push("");
            setupHints();
            populatePreviousGames();
        } catch (error) {
            console.error("Failed to fetch game data:", error);
            secretWord = "ERROR";
            hints = ["UNABLE", "TO", "LOAD", "HINTS", "FROM", "SHEET", "CHECK"];
            setupHints();
        }
    }

    function setupHints() {
        const hintElements = [
            document.getElementById("hint-row-1").children[0],
            document.getElementById("hint-row-2").children[0],
            document.getElementById("hint-row-2").children[2],
            document.getElementById("hint-row-3").children[0],
            document.getElementById("hint-row-4").children[0],
            document.getElementById("hint-row-4").children[2],
            document.getElementById("hint-row-5").children[0]
        ];
        
        hintElements.forEach((span, index) => {
            span.textContent = hints[index] || "";
            if (index > 0 && span.textContent) span.style.visibility = "hidden";
        });
    }

    function populatePreviousGames() {
        const gameList = document.querySelector("#previous-games-screen .game-list");
        gameList.innerHTML = "";
        allGames.sort((a, b) => new Date(b.Date) - new Date(a.Date));
        allGames.forEach(game => {
            const link = document.createElement("a");
            link.href = "#";
            link.textContent = game.Date;
            link.addEventListener("click", (e) => {
                e.preventDefault();
                loadGame(game);
                document.getElementById("previous-games-screen").style.display = "none";
                document.getElementById("game-screen").style.display = "flex";
            });
            gameList.appendChild(link);
        });
    }

    function loadGame(game) {
        resetGame();
        secretWord = game["Secret Word"].toUpperCase();
        hints = [
            game["Hint 1"], game["Hint 2"], game["Hint 3"],
            game["Hint 4"], game["Hint 5"], game["Hint 6"],
            game["Hint 7"], game["Hint 8"], game["Hint 9"]
        ].filter(hint => hint).map(hint => hint.toUpperCase());
        while (hints.length < 7) hints.push("");
        setupHints();
    }

    fetchGameData().then(() => {
        const startScreen = document.getElementById("start-screen");
        const gameScreen = document.getElementById("game-screen");
        const go = document.getElementById("game-over");
        const playNowBtn = document.getElementById("play-now-btn");
        const pauseScreen = document.getElementById("pause-screen");

        playNowBtn.addEventListener("click", () => {
            startScreen.style.display = "none";
            gameScreen.style.display = "flex";
            document.getElementById("guess-input").focus();
        });

        const menuModeButton = document.getElementById("menu-dark-mode-btn");
        const menuModeIcon = document.getElementById("menu-mode-icon");
        const sharkIcon = document.getElementById("shark-icon");
        const swimmerIcon = document.getElementById("man-icon");

        function toggleDarkMode() {
            document.body.classList.toggle("dark-mode");
            const isDarkMode = document.body.classList.contains("dark-mode");
            menuModeIcon.classList.toggle("fa-moon", !isDarkMode);
            menuModeIcon.classList.toggle("fa-sun", isDarkMode);
            sharkIcon.src = isDarkMode ? "shark_dark_bk.png" : "shark_light_bk.png";
            swimmerIcon.src = isDarkMode ? "swimmer_dark_bk.png" : "swimmer_light_bk.png";
        }

        menuModeButton.addEventListener("click", toggleDarkMode);

        document.addEventListener("click", () => {
            const input = document.getElementById("guess-input");
            if (!gameOver && gameScreen.style.display === "flex" && pauseScreen.style.display === "none") {
                input.focus();
            }
        });

        setInterval(() => {
            if (decayStarted && score > 0 && !gameOver) {
                const elapsed = (Date.now() - decayStartTime) / 1000;
                score = Math.max(0, Math.floor(100 - elapsed));
                document.getElementById("score").textContent = `Score: ${score}`;
                updateGraphic();

                if (score < 100 && score % 10 === 0 && score < lastHintScore && hintIndex < hints.length - 1) {
                    hintIndex++;
                    revealHint(hintIndex);
                    lastHintScore = score;
                }

                if (score <= 0) endGame(false);
            }
        }, 50);

        function revealHint(index) {
            const allHints = document.querySelectorAll(".hint-line span");
            const visibleHints = Array.from(allHints).filter(span => span.textContent);
            if (index < visibleHints.length) {
                visibleHints[index].style.visibility = "visible";
                setTimeout(() => {
                    visibleHints[index].classList.add("hint-burst");
                    setTimeout(() => {
                        visibleHints[index].classList.remove("hint-burst");
                    }, 2000);
                }, 100);
            }
        }

        const input = document.getElementById("guess-input");
        const guessBackground = document.getElementById("guess-background");
        const guessLine = document.getElementById("guess-line");

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !gameOver) {
                handleGuess(input.value);
            }
        });

        function handleGuess(guess) {
            const guessDisplay = input;
            const shark = document.getElementById("shark-icon");
            if (!firstGuessMade) {
                firstGuessMade = true;
                decayStarted = true;
                decayStartTime = Date.now();
            }

            guessDisplay.value = guess.toUpperCase();
            guessDisplay.classList.remove("wrong-guess", "correct-guess");
            guessDisplay.style.opacity = "1";
            void guessDisplay.offsetWidth;

            if (guess.toUpperCase() === secretWord) {
                guessDisplay.classList.add("correct-guess");
                guessBackground.classList.add("flash-green");
                guessLine.style.opacity = "0";
                const currentWidth = shark.offsetWidth;
                shark.style.width = `${currentWidth}px`;
                shark.classList.add("shark-exit");
                setTimeout(() => {
                    guessDisplay.classList.remove("correct-guess");
                    guessBackground.classList.remove("flash-green");
                    shark.classList.remove("shark-exit");
                    endGame(true);
                }, 1500);
            } else {
                guessDisplay.classList.add("wrong-guess");
                setTimeout(() => {
                    guessDisplay.classList.remove("wrong-guess");
                    guessDisplay.style.opacity = "1";
                    guessDisplay.style.color = document.body.classList.contains("dark-mode") ? "#FFFFFF" : "#000000";
                    guessDisplay.value = "";
                    if (!gameOver) guessDisplay.focus();
                }, 500);
            }
        }

        function updateGraphic() {
            const shark = document.getElementById("shark-icon");
            const graphic = document.getElementById("graphic");
            const graphicWidth = graphic.offsetWidth;
            const sharkWidth = shark.offsetWidth;

            if (decayStarted && !shark.classList.contains("shark-exit")) {
                const elapsed = (Date.now() - decayStartTime) / 1000;
                const progress = Math.min(elapsed / 100, 1);
                const sharkMaxX = graphicWidth - sharkWidth;
                const sharkX = progress * sharkMaxX;
                shark.style.left = `${sharkX}px`;
                const sharkSize = 45 + (progress * (300 - 45));
                shark.style.width = `${sharkSize}px`;
            }
        }

        function endGame(won) {
            gameOver = true;
            const endMessage = document.getElementById("end-message");
            const shareText = document.getElementById("share-text");
            const shareScore = document.getElementById("share-score");
            const shareLink = document.getElementById("share-link");
            const shareWhatsApp = document.getElementById("share-whatsapp");
            const shareTelegram = document.getElementById("share-telegram");
            const shareTwitter = document.getElementById("share-twitter");

            gameScreen.style.display = "none";
            go.style.display = "flex";
            document.getElementById("guess-input").blur();

            if (won) {
                endMessage.textContent = "You survived the hungry shark";
                shareText.textContent = "Hungry Shark Survivor";
            } else {
                endMessage.textContent = score === 0 ? "You are shark food\n\nnhom-nhom" : "You are shark food!\nnhom-nhom!";
                shareText.textContent = "I am shark food";
            }

            shareScore.textContent = `${score}`;
            shareLink.href = "https://your-game-url.com";
            shareLink.textContent = "Can you beat my score? Click here";
            const shareMessage = `${shareText.textContent}\nScore: ${score}\nCan you beat my score? Play now: https://your-game-url.com`;
            shareWhatsApp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
            shareTelegram.href = `https://t.me/share/url?url=${encodeURIComponent("https://your-game-url.com")}&text=${encodeURIComponent(shareMessage)}`;
            shareTwitter.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`;
        }

        const pauseBtn = document.getElementById("pause-btn");
        const resumeBtn = document.getElementById("resume-btn");
        const countdown = document.getElementById("countdown");

        function pauseGame() {
            if (!gameOver && decayStarted) {
                decayStarted = false;
                pausedTime = Date.now() - decayStartTime;
                pauseScreen.style.display = "flex";
                resumeBtn.style.display = "block";
                countdown.style.display = "none";
            }
        }

        pauseBtn.addEventListener("click", pauseGame);

        resumeBtn.addEventListener("click", () => {
            resumeBtn.style.display = "none";
            countdown.style.display = "block";
            let timeLeft = 5;
            countdown.textContent = timeLeft;
            const interval = setInterval(() => {
                timeLeft--;
                countdown.textContent = timeLeft;
                if (timeLeft <= 0) {
                    clearInterval(interval);
                    pauseScreen.style.display = "none";
                    if (!gameOver) {
                        decayStarted = true;
                        decayStartTime = Date.now() - pausedTime;
                        document.getElementById("guess-input").focus();
                    }
                }
            }, 1000);
        });

        const hamburgerBtn = document.getElementById("hamburger-btn");
        const menuContent = document.getElementById("menu-content");
        const menuCloseBtn = document.getElementById("menu-close-btn");
        const homeLink = document.getElementById("home-link");
        const languageLink = document.getElementById("language-link");
        const hungrySharkLink = document.getElementById("hungry-shark-link");
        const subMenu = document.querySelector(".sub-menu");
        const todayGame = document.getElementById("today-game");
        const previousGames = document.getElementById("previous-games");
        const createGame = document.getElementById("create-game");
        const anagramLink = document.getElementById("anagram-link");
        const snakebiteLink = document.getElementById("snakebite-link");
        const advertiseLink = document.getElementById("advertise-link");

        function collapseMenu() {
            menuContent.style.display = "none";
            subMenu.style.display = "none";
            hamburgerBtn.querySelector("i").classList.remove("fa-times");
            hamburgerBtn.querySelector("i").classList.add("fa-bars");
            if (gameScreen.style.display === "flex" && !gameOver && firstGuessMade) {
                pauseScreen.style.display = "flex";
                resumeBtn.style.display = "block";
                countdown.style.display = "none";
            }
        }

        hamburgerBtn.addEventListener("click", () => {
            if (menuContent.style.display === "none") {
                menuContent.style.display = "flex";
                hamburgerBtn.querySelector("i").classList.remove("fa-bars");
                hamburgerBtn.querySelector("i").classList.add("fa-times");
                if (gameScreen.style.display === "flex" && !gameOver && firstGuessMade) {
                    pauseGame();
                }
            } else {
                collapseMenu();
            }
        });

        menuCloseBtn.addEventListener("click", collapseMenu);

        homeLink.addEventListener("click", (e) => {
            e.preventDefault();
            resetGame();
            startScreen.style.display = "flex";
            gameScreen.style.display = "none";
            go.style.display = "none";
            collapseMenu();
        });

        languageLink.addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("language-screen").style.display = "flex";
            collapseMenu();
        });

        hungrySharkLink.addEventListener("click", (e) => {
            e.preventDefault();
            subMenu.style.display = subMenu.style.display === "none" ? "flex" : "none";
        });

        todayGame.addEventListener("click", (e) => {
            e.preventDefault();
            resetGame();
            const latestEntry = allGames.reduce((latest, current) => {
                return new Date(current.Date) > new Date(latest.Date) ? current : latest;
            }, allGames[0]);
            loadGame(latestEntry);
            startScreen.style.display = "flex";
            gameScreen.style.display = "none";
            go.style.display = "none";
            collapseMenu();
        });

        previousGames.addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("previous-games-screen").style.display = "flex";
            collapseMenu();
        });

        createGame.addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("create-game-screen").style.display = "flex";
            collapseMenu();
        });

        anagramLink.addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("anagram-screen").style.display = "flex";
            collapseMenu();
        });

        snakebiteLink.addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("snakebite-screen").style.display = "flex";
            collapseMenu();
        });

        advertiseLink.addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("advertise-screen").style.display = "flex";
            collapseMenu();
        });

        document.getElementById("start-previous-games").addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("previous-games-screen").style.display = "flex";
        });

        document.getElementById("end-previous-games").addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("previous-games-screen").style.display = "flex";
        });

        document.getElementById("end-anagram").addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("anagram-screen").style.display = "flex";
        });

        document.getElementById("end-snakebite").addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("snakebite-screen").style.display = "flex";
        });

        document.getElementById("ad-link").addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("advertise-screen").style.display = "flex";
        });

        document.querySelectorAll(".home-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                resetGame();
                startScreen.style.display = "flex";
                gameScreen.style.display = "none";
                go.style.display = "none";
                document.querySelectorAll(".screen").forEach(screen => screen.style.display = "none");
            });
        });

        document.getElementById("home-btn").addEventListener("click", () => {
            resetGame();
            startScreen.style.display = "flex";
            gameScreen.style.display = "none";
            go.style.display = "none";
        });

        const skipWelcome = document.getElementById("skip-welcome");
        skipWelcome.addEventListener("change", () => {
            localStorage.setItem("skipWelcome", skipWelcome.checked);
        });

        if (localStorage.getItem("skipWelcome") === "true") {
            startScreen.style.display = "none";
            gameScreen.style.display = "flex";
        }
        document.getElementById("guess-input").blur();

        function resetGame() {
            score = 100;
            decayStarted = false;
            gameOver = false;
            decayStartTime = null;
            hintIndex = 0;
            lastHintScore = 100;
            firstGuessMade = false;
            pausedTime = null;
            document.getElementById("score").textContent = `Score: ${score}`;
            document.getElementById("guess-input").value = "";
            document.getElementById("guess-line").style.opacity = "1";
            document.getElementById("shark-icon").style.left = "0px";
            document.getElementById("shark-icon").style.width = "45px";
            setupHints();
        }
    });
});