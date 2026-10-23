
"use strict";

// ===== ELEMENTS =====
const cells = document.querySelectorAll(".cell");
const pvpBtn = document.getElementById("pvp-btn");
const aiBtn = document.getElementById("ai-btn");
const difficultySection = document.getElementById("difficulty-section");
const difficultySelect = document.getElementById("difficulty");
const turnIndicator = document.getElementById("turn-indicator");
const resultMessage = document.getElementById("result-message");
const restartBtn = document.getElementById("restart-btn");
const resetBtn = document.getElementById("reset-btn");
const soundButton = document.getElementById("sound-btn");
const container = document.querySelector(".game-container");

const scoreXElement = document.getElementById("score-x");
const scoreOElement = document.getElementById("score-o");
const scoreDrawElement = document.getElementById("score-draw");
const playerXName = document.getElementById("player-x-name");
const playerOName = document.getElementById("player-o-name");

const timerBox = document.getElementById("move-timer");
const timerCount = document.getElementById("timer-count");
const timerLabel = document.getElementById("timer-label");

const welcomeScreen = document.getElementById("welcome-screen");
const playNowButton = document.getElementById("play-now-btn");

// ===== GAME SETTINGS =====
const MOVE_TIME = 5; // Five seconds per human move

const winningCombinations = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

let board = Array(9).fill("");
let currentPlayer = "X";
let gameOver = false;
let gameMode = "pvp";
let scores = { X: 0, O: 0, draw: 0 };
let soundEnabled = true;
let audioContext = null;
let computerTimer = null;
let countdownInterval = null;
let timeLeft = MOVE_TIME;
let turnId = 0;

// ===== SCORES AND TURN =====
function updateScores() {
  scoreXElement.textContent = scores.X;
  scoreOElement.textContent = scores.O;
  scoreDrawElement.textContent = scores.draw;
}

function updateTurn() {
  if (gameOver) return;

  const name = currentPlayer === "X"
    ? playerXName.textContent
    : playerOName.textContent;

  turnIndicator.textContent =
    gameMode === "ai" && currentPlayer === "O"
      ? "🤖 COMPUTER IS THINKING..."
      : `${name}'S TURN`;
}

function setResult(message, isWin = false) {
  resultMessage.textContent = message;
  resultMessage.classList.toggle("win", isWin);
}

// ===== COUNTDOWN TIMER =====
function stopTimer() {
  if (countdownInterval !== null) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function clearComputerTimer() {
  if (computerTimer !== null) {
    clearTimeout(computerTimer);
    computerTimer = null;
  }
}

function updateTimerDisplay() {
  if (timerCount) timerCount.textContent = timeLeft;

  if (timerBox) {
    timerBox.classList.toggle("timer-warning", timeLeft <= 2);
  }

  if (timerLabel) timerLabel.textContent = "Time left";
}

function startTimer() {
  stopTimer();
  timeLeft = MOVE_TIME;
  updateTimerDisplay();

  if (gameOver) return;

  // The computer does not need a human countdown.
  if (gameMode === "ai" && currentPlayer === "O") {
    if (timerLabel) timerLabel.textContent = "CPU turn";
    if (timerCount) timerCount.textContent = "…";
    if (timerBox) timerBox.classList.remove("timer-warning");
    return;
  }

  const thisTurn = turnId;

  countdownInterval = setInterval(() => {
    if (gameOver || thisTurn !== turnId) {
      stopTimer();
      return;
    }

    timeLeft--;
    updateTimerDisplay();

    if (timeLeft <= 0) {
      stopTimer();
      handleTimeout(thisTurn);
    }
  }, 1000);
}

function handleTimeout(thisTurn) {
  if (gameOver || thisTurn !== turnId) return;

  setResult(`${currentPlayer} ran out of time! Turn skipped.`);
  playSound("draw");

  if (gameMode === "ai" && currentPlayer === "X") {
    currentPlayer = "O";
    updateTurn();
    startTimer();
    scheduleComputerMove();
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  turnId++;
  updateTurn();
  startTimer();
}

// ===== WIN CHECKING =====
function getWinningCombination(state) {
  return winningCombinations.find(([a, b, c]) =>
    state[a] &&
    state[a] === state[b] &&
    state[a] === state[c]
  );
}

// ===== SOUND EFFECTS =====
function playSound(type) {
  if (!soundEnabled) return;

  try {
    const AudioClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioClass) return;

    if (!audioContext) audioContext = new AudioClass();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const sounds = {
      move: { frequency: 500, duration: 0.08 },
      win: { frequency: 780, duration: 0.22 },
      draw: { frequency: 320, duration: 0.18 }
    };

    const sound = sounds[type];
    if (!sound) return;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.value = sound.frequency;
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + sound.duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + sound.duration);
  } catch (error) {
    console.warn("Sound could not be played:", error);
  }
}

soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;

  soundButton.textContent = soundEnabled
    ? "🔊 Sound On"
    : "🔇 Sound Off";

  soundButton.setAttribute(
    "aria-pressed",
    String(soundEnabled)
  );

  if (soundEnabled) playSound("move");
});

// ===== CONFETTI AND CELEBRATION =====
function launchConfetti() {
  if (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) return;

  const colors = [
    "#00f5ff", "#a855f7", "#ff4ecd",
    "#facc15", "#ffffff"
  ];

  for (let i = 0; i < 70; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.setAttribute("aria-hidden", "true");
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];

    piece.style.setProperty(
      "--drift",
      (Math.random() * 200 - 100) + "px"
    );

    piece.style.setProperty(
      "--fall-duration",
      (2 + Math.random() * 2) + "s"
    );

    document.body.appendChild(piece);

    piece.addEventListener(
      "animationend",
      () => piece.remove(),
      { once: true }
    );
  }
}

function celebrateWinner() {
  container.classList.remove("winner-celebration");
  void container.offsetWidth;
  container.classList.add("winner-celebration");
}

// ===== FINISH GAME =====
function finishGame(winner, combination = null) {
  gameOver = true;
  turnId++;

  stopTimer();
  clearComputerTimer();

  if (timerLabel) timerLabel.textContent = "Game over";
  if (timerCount) timerCount.textContent = "—";
  if (timerBox) timerBox.classList.remove("timer-warning");

  cells.forEach(cell => {
    cell.disabled = true;
  });

  if (winner) {
    scores[winner]++;
    updateScores();

    if (combination) {
      combination.forEach(index => {
        cells[index].classList.add("winning");
      });
    }

    const winnerName = winner === "X"
      ? playerXName.textContent
      : playerOName.textContent;

    turnIndicator.textContent = "GAME OVER";
    setResult(`🎉 ${winnerName} WINS!`, true);

    playSound("win");
    launchConfetti();
    celebrateWinner();
  } else {
    scores.draw++;
    updateScores();

    turnIndicator.textContent = "GAME OVER";
    setResult("🤝 It's a draw! Great game.");

    playSound("draw");
  }
}

// ===== PLAY A MOVE =====
function playMove(index, player) {
  if (gameOver || board[index] !== "") return false;

  stopTimer();
  turnId++;

  board[index] = player;
  cells[index].textContent = player;
  cells[index].classList.add(
    "marked",
    player.toLowerCase()
  );
  cells[index].disabled = true;

  playSound("move");

  const combination = getWinningCombination(board);

  if (combination) {
    finishGame(player, combination);
    return true;
  }

  if (board.every(cell => cell !== "")) {
    finishGame(null);
    return true;
  }

  currentPlayer = player === "X" ? "O" : "X";
  updateTurn();
  startTimer();

  if (gameMode === "ai" && currentPlayer === "O") {
    scheduleComputerMove();
  }

  return true;
}

// ===== COMPUTER AI =====
function getEmptyCells(state) {
  return state
    .map((value, index) => value === "" ? index : -1)
    .filter(index => index !== -1);
}

function findWinningMove(state, player) {
  for (const index of getEmptyCells(state)) {
    const testBoard = [...state];
    testBoard[index] = player;

    if (getWinningCombination(testBoard)) return index;
  }

  return -1;
}

function minimax(state, isMaximizing, depth) {
  const combination = getWinningCombination(state);

  if (combination) {
    const winner = state[combination[0]];
    return winner === "O" ? 10 - depth : depth - 10;
  }

  const empty = getEmptyCells(state);
  if (!empty.length) return 0;

  if (isMaximizing) {
    let best = -Infinity;

    for (const index of empty) {
      state[index] = "O";
      best = Math.max(
        best,
        minimax(state, false, depth + 1)
      );
      state[index] = "";
    }

    return best;
  }

  let best = Infinity;

  for (const index of empty) {
    state[index] = "X";
    best = Math.min(
      best,
      minimax(state, true, depth + 1)
    );
    state[index] = "";
  }

  return best;
}

function getComputerMove() {
  const empty = getEmptyCells(board);
  if (!empty.length) return -1;

  const difficulty = difficultySelect.value;

  if (difficulty === "easy") {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  const win = findWinningMove(board, "O");
  if (win !== -1) return win;

  const block = findWinningMove(board, "X");
  if (block !== -1) return block;

  if (difficulty === "medium") {
    if (board[4] === "") return 4;

    const corners = [0, 2, 6, 8].filter(
      index => board[index] === ""
    );

    if (corners.length) {
      return corners[Math.floor(Math.random() * corners.length)];
    }

    return empty[Math.floor(Math.random() * empty.length)];
  }

  let bestScore = -Infinity;
  let bestMove = empty[0];

  for (const index of empty) {
    const testBoard = [...board];
    testBoard[index] = "O";

    const score = minimax(testBoard, false, 0);

    if (score > bestScore) {
      bestScore = score;
      bestMove = index;
    }
  }

  return bestMove;
}

function scheduleComputerMove() {
  clearComputerTimer();
  stopTimer();

  if (
    gameOver ||
    gameMode !== "ai" ||
    currentPlayer !== "O"
  ) return;

  if (timerLabel) timerLabel.textContent = "CPU turn";
  if (timerCount) timerCount.textContent = "…";

  const thisTurn = turnId;

  computerTimer = setTimeout(() => {
    computerTimer = null;

    if (
      gameOver ||
      gameMode !== "ai" ||
      currentPlayer !== "O" ||
      thisTurn !== turnId
    ) return;

    const move = getComputerMove();

    if (move !== -1) {
      playMove(move, "O");
    }
  }, 450);
}

function handleMove(index) {
  if (gameOver || board[index] !== "") return;
  if (gameMode === "ai" && currentPlayer === "O") return;

  playMove(index, currentPlayer);
}

// ===== RESTART ROUND =====
function startNewRound() {
  stopTimer();
  clearComputerTimer();

  turnId++;
  board = Array(9).fill("");
  currentPlayer = "X";
  gameOver = false;

  cells.forEach(cell => {
    cell.textContent = "";
    cell.disabled = false;
    cell.classList.remove(
      "x", "o", "marked", "winning"
    );
  });

  container.classList.remove("winner-celebration");
  turnIndicator.textContent = "";
  setResult("Let's start the game!");

  updateTurn();
  startTimer();
}

// ===== GAME MODES =====
function setGameMode(mode) {
  gameMode = mode;

  pvpBtn.classList.toggle("active", mode === "pvp");
  aiBtn.classList.toggle("active", mode === "ai");

  difficultySection.classList.toggle(
    "hidden",
    mode !== "ai"
  );
  difficultySection.hidden = mode !== "ai";

  playerXName.textContent =
    mode === "ai" ? "YOU (X)" : "PLAYER X";

  playerOName.textContent =
    mode === "ai" ? "CPU (O)" : "PLAYER O";

  startNewRound();
}

// ===== EVENT LISTENERS =====
cells.forEach((cell, index) => {
  cell.addEventListener("click", () => handleMove(index));
});

pvpBtn.addEventListener("click", () => setGameMode("pvp"));
aiBtn.addEventListener("click", () => setGameMode("ai"));

difficultySelect.addEventListener("change", startNewRound);
restartBtn.addEventListener("click", startNewRound);

resetBtn.addEventListener("click", () => {
  scores = { X: 0, O: 0, draw: 0 };
  updateScores();
  startNewRound();
});

// ===== WELCOME SCREEN =====
if (welcomeScreen && playNowButton) {
  playNowButton.addEventListener("click", () => {
    welcomeScreen.classList.add("hidden");
  });
}

// ===== INITIALIZE GAME =====
updateScores();
setGameMode("pvp");
