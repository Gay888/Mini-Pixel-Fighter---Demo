// --- Setup canvas ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const scoreEl = document.getElementById("score");

let gameRunning = false;
let score = 0;

// --- Game objects ---
const paddle = {
  width: 100,
  height: 12,
  x: (canvas.width - 100) / 2,
  y: canvas.height - 30,
  speed: 7,
  dx: 0
};

const bullets = [];

const blockRowCount = 5;
const blockColumnCount = 8;
const blockWidth = 75;
const blockHeight = 20;
const blockPadding = 10;
const blockOffsetTop = 50;
const blockOffsetLeft = 35;

let blocks = [];

// --- Initialize blocks grid ---
function initBlocks() {
  blocks = [];
  for (let c = 0; c < blockColumnCount; c++) {
    blocks[c] = [];
    for (let r = 0; r < blockRowCount; r++) {
      let blockX = c * (blockWidth + blockPadding) + blockOffsetLeft;
      let blockY = r * (blockHeight + blockPadding) + blockOffsetTop;
      blocks[c][r] = { x: blockX, y: blockY, status: 1 };
    }
  }
}

// --- Draw blocks ---
function drawBlocks() {
  for (let c = 0; c < blockColumnCount; c++) {
    for (let r = 0; r < blockRowCount; r++) {
      let b = blocks[c][r];
      if (b.status === 1) {
        ctx.fillStyle = "#0095DD";
        ctx.fillRect(b.x, b.y, blockWidth, blockHeight);
      }
    }
  }
}

// --- Draw paddle ---
function drawPaddle() {
  ctx.fillStyle = "#00DD95";
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

// --- Bullets ---
function spawnBullet() {
  bullets.push({
    x: paddle.x + paddle.width / 2,
    y: paddle.y,
    radius: 5,
    speed: 6
  });
}

function drawBullets() {
  ctx.fillStyle = "#FFD700";
  bullets.forEach((b, i) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    b.y -= b.speed;

    // Remove bullet if off screen
    if (b.y < 0) {
      bullets.splice(i, 1);
    }
  });
}

// --- Collision detection bullet vs block ---
function collisionDetection() {
  bullets.forEach((b, bi) => {
    for (let c = 0; c < blockColumnCount; c++) {
      for (let r = 0; r < blockRowCount; r++) {
        let bblock = blocks[c][r];
        if (bblock.status === 1) {
          if (
            b.x > bblock.x &&
            b.x < bblock.x + blockWidth &&
            b.y > bblock.y &&
            b.y < bblock.y + blockHeight
          ) {
            bblock.status = 0;
            bullets.splice(bi, 1);
            score += 10;
            scoreEl.textContent = score;
            return;
          }
        }
      }
    }
  });
}

// --- Move paddle ---
function movePaddle() {
  paddle.x += paddle.dx;
  // walls
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.width > canvas.width) {
    paddle.x = canvas.width - paddle.width;
  }
}

// --- Keyboard controls ---
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a") {
    paddle.dx = -paddle.speed;
  } else if (e.key === "ArrowRight" || e.key === "d") {
    paddle.dx = +paddle.speed;
  } else if (e.key === " " || e.key === "Spacebar") {
    spawnBullet();
  }
});
document.addEventListener("keyup", (e) => {
  if (
    e.key === "ArrowLeft" ||
    e.key === "a" ||
    e.key === "ArrowRight" ||
    e.key === "d"
  ) {
    paddle.dx = 0;
  }
});

// --- Game loop ---
function update() {
  if (!gameRunning) return;

  movePaddle();
  collisionDetection();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBlocks();
  drawPaddle();
  drawBullets();

  // Check win condition (all blocks broken)
  let allBroken = true;
  for (let c = 0; c < blockColumnCount; c++) {
    for (let r = 0; r < blockRowCount; r++) {
      if (blocks[c][r].status === 1) {
        allBroken = false;
      }
    }
  }
  if (allBroken) {
    // Win!
    alert("You Win! Score: " + score);
    gameRunning = false;
    restartBtn.style.display = "inline-block";
    return;
  }

  requestAnimationFrame(update);
}

// --- Start / Restart ---
startBtn.addEventListener("click", () => {
  score = 0;
  scoreEl.textContent = score;
  initBlocks();
  gameRunning = true;
  startBtn.style.display = "none";
  restartBtn.style.display = "none";
  update();
});

restartBtn.addEventListener("click", () => {
  initBlocks();
  bullets.length = 0;
  score = 0;
  scoreEl.textContent = score;
  gameRunning = true;
  restartBtn.style.display = "none";
  update();
});
