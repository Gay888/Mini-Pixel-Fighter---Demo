// Mini Pixel Fighter - single file logic
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const hpPlayerEl = document.querySelector('#player-hp .hp-fill');
const hpEnemyEl = document.querySelector('#enemy-hp .hp-fill');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart');

let W, H, dpr;
function resize(){
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  W = canvas.width / dpr;
  H = canvas.height / dpr;
}
window.addEventListener('resize', resize);
resize();

// ---------- Simple pixel-art sprite generator (offscreen) ----------
// We'll create a small sprite sheet programmatically: each frame is 16x24 "pixels" (logical pixels).
// We draw with a scale factor when rendering to canvas.
function makeSpriteSheet(){
  const frameW = 16, frameH = 24;
  const frames = {
    idle: [0,1], // two frames core
    walk: [2,3,4,5],
    attack: [6,7],
    hurt: [8]
  };
  const totalFrames = 9;
  const off = document.createElement('canvas');
  off.width = frameW * totalFrames;
  off.height = frameH;
  const ox = off.getContext('2d');

  // helper to draw a blocky human-ish sprite at frame index using simple rectangles
  function drawFrame(fi, palette){
    const px = fi * frameW;
    // clear frame
    ox.fillStyle = 'rgba(0,0,0,0)';
    ox.clearRect(px,0,frameW,frameH);

    // background transparent

    // body colors
    const skin = palette.skin;
    const shirt = palette.shirt;
    const pants = palette.pants;
    const shoe = palette.shoe;
    const outline = palette.outline;

    // simple pixel map (array of rectangles): [x,y,w,h,color]
    // we'll draw a very basic humanoid "pixel" sprite (head, torso, arms, legs)
    // head
    ox.fillStyle = outline; ox.fillRect(px+4,2,8,10);
    ox.fillStyle = skin; ox.fillRect(px+5,3,6,8);
    // torso
    ox.fillStyle = outline; ox.fillRect(px+3,12,10,8);
    ox.fillStyle = shirt; ox.fillRect(px+4,13,8,6);
    // pants
    ox.fillStyle = outline; ox.fillRect(px+3,20,10,3);
    ox.fillStyle = pants; ox.fillRect(px+4,20,8,3);
    // shoes
    ox.fillStyle = shoe; ox.fillRect(px+3,23,4,1);
    ox.fillStyle = shoe; ox.fillRect(px+8,23,4,1);

    // arms vary a bit by frame to suggest motion/attack
    // default arms: down
    ox.fillStyle = outline; ox.fillRect(px+1,13,3,2);
    ox.fillStyle = outline; ox.fillRect(px+12,13,3,2);
    ox.fillStyle = shirt; ox.fillRect(px+1,14,3,1);
    ox.fillStyle = shirt; ox.fillRect(px+12,14,3,1);

    // small variation per frame index to simulate walking/attack
    if([2,4].includes(fi)){ // step left
      // left arm forward
      ox.fillStyle = outline; ox.fillRect(px+0,12,3,3);
      ox.fillStyle = shirt; ox.fillRect(px+0,15,3,1);
    }
    if([3,5].includes(fi)){ // step right
      ox.fillStyle = outline; ox.fillRect(px+13,12,3,3);
      ox.fillStyle = shirt; ox.fillRect(px+13,15,3,1);
    }
    if([6,7].includes(fi)){ // attack frames - one arm extended
      // right arm extended as punch
      ox.fillStyle = outline; ox.fillRect(px+13,10,4,2);
      ox.fillStyle = shirt; ox.fillRect(px+13,12,4,2);
      // left arm tucked
      ox.fillStyle = outline; ox.fillRect(px+1,13,2,2);
    }
    if(fi===8){ // hurt - tint darker
      ox.fillStyle = 'rgba(0,0,0,0.35)';
      ox.fillRect(px+4,3,6,6);
    }

    // slight shading: add a darker stripe on torso
    ox.fillStyle = 'rgba(0,0,0,0.12)';
    ox.fillRect(px+6,14,2,4);

    // small face (eyes)
    ox.fillStyle = '#000';
    ox.fillRect(px+6,6,1,1);
    ox.fillRect(px+9,6,1,1);
  }

  // palette for player (blue) and enemy (red) will be created separately by tinting when rendering,
  // but we draw a neutral gray shirt so we can tint later. For simplicity, draw base with neutral colors:
  const basePalette = {
    skin: '#f5c08a',
    shirt: '#7aa7ff',
    pants: '#334455',
    shoe: '#222'
  };

  // draw all frames with basePalette
  for(let fi=0;fi<totalFrames;fi++){
    drawFrame(fi, basePalette);
  }

  return {
    canvas: off,
    frameW,
    frameH,
    frames
  };
}

const spriteSheet = makeSpriteSheet();

// ---------- Entities (player & enemy) ----------
function makeEntity(opts){
  return {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    vx: 0,
    vy: 0,
    dir: opts.dir||1, // 1 = facing right, -1 = left
    state: 'idle', // idle, walk, jump, attack, hurt
    frameTime: 0,
    frameIndex: 0,
    hp: 100,
    colorTint: opts.tint || {r:120,g:160,b:255}, // used to tint the shirt
    name: opts.name || 'actor',
    canAttack: true,
    attackCooldown: 0
  };
}

let player, enemy;
const gravity = 0.9;
const groundYPercent = 0.7;

function resetGame(){
  resize();
  const groundY = H * groundYPercent;
  player = makeEntity({
    x: W*0.25,
    y: groundY,
    w: 48, h: 72,
    dir: 1,
    tint: {r:120,g:160,b:255},
    name: 'Player'
  });
  enemy = makeEntity({
    x: W*0.75,
    y: groundY,
    w: 48, h: 72,
    dir: -1,
    tint: {r:230,g:110,b:110},
    name: 'Enemy'
  });
  player.hp = enemy.hp = 100;
  hpPlayerEl.style.width = '100%';
  hpEnemyEl.style.width = '100%';
  statusEl.textContent = 'Play! Controls: A/D or ←→ = move, W/↑ = jump, J = attack';
}
resetGame();
restartBtn.addEventListener('click', resetGame);

// ---------- Input ----------
const keys = {};
window.addEventListener('keydown', e=>{
  keys[e.key.toLowerCase()] = true;
  // prevent scrolling on arrows/space
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', e=>{
  keys[e.key.toLowerCase()] = false;
});

// ---------- Game loop ----------
let last = performance.now();
function loop(now){
  const dt = Math.min(40, now - last);
  last = now;
  update(dt/16.67); // normalize to ~60fps ticks
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- Update (physics, AI, collisions) ----------
function update(step){
  const groundY = H * groundYPercent;

  // PLAYER INPUT
  const speed = 2.2;
  let moveInput = 0;
  if(keys['a'] || keys['arrowleft']) moveInput -= 1;
  if(keys['d'] || keys['arrowright']) moveInput += 1;

  if(moveInput !== 0){
    player.vx = moveInput * speed;
    player.dir = moveInput>0?1:-1;
    if(player.state !== 'attack' && player.vy===0) player.state = 'walk';
  } else {
    player.vx = 0;
    if(player.vy===0 && player.state !== 'attack') player.state = 'idle';
  }

  // jump
  if((keys['w'] || keys['arrowup']) && player.vy===0){
    player.vy = -7.5;
    player.state = 'jump';
  }

  // attack
  if(keys['j'] && player.canAttack){
    player.state = 'attack';
    player.frameIndex = 6; // attack frames start at index 6
    player.frameTime = 0;
    player.canAttack = false;
    player.attackCooldown = 30; // ticks
  }

  // apply physics (player)
  player.vy += gravity * 0.45;
  player.x += player.vx;
  player.y += player.vy;

  if(player.y > groundY) { player.y = groundY; player.vy = 0; if(player.state==='jump') player.state='idle'; }

  // attack cooldown handler
  if(!player.canAttack){
    player.attackCooldown--;
    if(player.attackCooldown<=0){
      player.canAttack = true;
      player.attackCooldown = 1;
      if(player.state === 'attack') player.state = 'idle';
    }
  }

  // PLAYER FRAME update
  animateEntity(player);

  // ENEMY AI: simple pursuit + attack
  const dx = player.x - enemy.x;
  const dist = Math.abs(dx);
  if(enemy.hp>0){
    if(dist > 120){
      // walk toward player
      enemy.vx = dx>0 ? 1.2 : -1.2;
      enemy.dir = dx>0?1:-1;
      if(enemy.vy===0) enemy.state = 'walk';
    } else {
      // in range: stop and attack sometimes
      enemy.vx = 0;
      if(enemy.canAttack){
        // random chance to attack when near
        if(Math.random() < 0.04){
          enemy.state = 'attack';
          enemy.frameIndex = 6;
          enemy.frameTime = 0;
          enemy.canAttack = false;
          enemy.attackCooldown = 45 + Math.floor(Math.random()*30);
        } else {
          if(enemy.vy===0) enemy.state = 'idle';
        }
      }
    }
  }

  // enemy jump if stuck? (not implemented; simple)

  // apply physics (enemy)
  enemy.vy += gravity * 0.45;
  enemy.x += enemy.vx;
  enemy.y += enemy.vy;
  if(enemy.y > groundY) { enemy.y = groundY; enemy.vy = 0; if(enemy.state==='jump') enemy.state='idle'; }

  // enemy cooldown
  if(!enemy.canAttack){
    enemy.attackCooldown--;
    if(enemy.attackCooldown<=0){
      enemy.canAttack = true;
      enemy.attackCooldown = 0;
      if(enemy.state === 'attack') enemy.state = 'idle';
    }
  }

  animateEntity(enemy);

  // clamp positions to screen
  player.x = Math.max(30, Math.min(W-60, player.x));
  enemy.x = Math.max(30, Math.min(W-60, enemy.x));

  // resolve attacks: check attack frames & hitbox overlap
  resolveAttacks();

  // update HP bars UI
  hpPlayerEl.style.width = Math.max(0, (player.hp/100)*100) + '%';
  hpEnemyEl.style.width = Math.max(0, (enemy.hp/100)*100) + '%';

  // check end
  if (player.hp <= 0 || enemy.hp <= 0) {
    // freeze game
    player.canAttack = false;
    enemy.canAttack = false;
    player.vx = 0;
    enemy.vx = 0;

    // show Game Over screen
    const screen = document.getElementById("gameover-screen");
    screen.classList.remove("hidden");
}

}

function animateEntity(e){
  e.frameTime++;
  const speed = (e.state==='walk') ? 9 : 12;
  if(e.state === 'idle'){
    // idle frames 0-1
    if(e.frameTime > 14){
      e.frameIndex = (e.frameIndex===0) ? 1 : 0;
      e.frameTime = 0;
    }
  } else if(e.state === 'walk'){
    if(e.frameTime > speed){
      // cycle frames 2-5
      e.frameIndex++;
      if(e.frameIndex < 2 || e.frameIndex > 5) e.frameIndex = 2;
      e.frameTime = 0;
    }
  } else if(e.state === 'attack'){
    // attack frames 6-7
    if(e.frameTime > 8){
      e.frameIndex++;
      if(e.frameIndex > 7){
        e.state = 'idle';
        e.frameIndex = 0;
      }
      e.frameTime = 0;
    }
  } else if(e.state === 'hurt'){
    e.frameIndex = 8;
    if(e.frameTime > 12){
      e.state = 'idle';
      e.frameIndex = 0;
    }
  } else if(e.state === 'jump'){
    e.frameIndex = 1; // keep a frame for jump
  }
}

// ---------- Attack/hit logic ----------
function rectsOverlap(a,b){
  return !(a.x+b.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

function getHitbox(e){
  // body hitbox
  return { x: e.x - e.w/2 + 8, y: e.y - e.h + 10, w: e.w - 16, h: e.h - 20 };
}

function getAttackBox(e){
  // attack box extends from right/left depending on dir when in attack frames
  if(e.state !== 'attack') return null;
  // only effective during frameIndex 6 or 7
  if(e.frameIndex < 6 || e.frameIndex > 7) return null;
  const reach = 40;
  const base = { x: e.x - e.w/2 + 8, y: e.y - e.h + 18, w: e.w - 16, h: 18 };
  if(e.dir === 1){
    return { x: base.x + base.w, y: base.y, w: reach, h: base.h };
  } else {
    return { x: base.x - reach, y: base.y, w: reach, h: base.h };
  }
}

function resolveAttacks(){
  if(player.hp<=0 || enemy.hp<=0) return;
  const pAtk = getAttackBox(player);
  const eAtk = getAttackBox(enemy);
  const pHit = getHitbox(player);
  const eHit = getHitbox(enemy);

  // player hitting enemy
  if(pAtk && rectsOverlap(pAtk, eHit)){
    // apply damage once per attack frame: ensure we only damage when frame just started
    if(player.frameTime === 1){ enemy.hp -= 8; enemy.state = 'hurt'; enemy.frameTime = 0; }
  }
  // enemy hitting player
  if(eAtk && rectsOverlap(eAtk, pHit)){
    if(enemy.frameTime === 1){ player.hp -= 8; player.state = 'hurt'; player.frameTime = 0; }
  }
}

// ---------- Render ----------
function render(){
  // clear
  ctx.clearRect(0,0,W,H);

  // draw background (simple parallax sky + ground)
  drawBackground();

  // draw stage line / ground shadow
  const groundY = H * groundYPercent;

  // draw characters (order by x for overlap)
  const pair = (player.x < enemy.x) ? [player, enemy] : [enemy, player];
  pair.forEach(e=> drawEntity(e));

  // draw UI overlays (HP handled by DOM)
  // Draw small names
  ctx.fillStyle = '#ffffffcc';
  ctx.font = '14px monospace';
  ctx.fillText('YOU', 20, 36);
  ctx.fillText('ENEMY', W - 80, 36);
}

function drawBackground(){
  // sky
  const skyH = H * 0.35;
  const g = ctx.createLinearGradient(0,0,0,skyH);
  g.addColorStop(0,'#7ec0ff'); g.addColorStop(1,'#cbe8ff');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,skyH);
  // simple distant city (rects)
  ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#1e2b3c';
  for(let i=0;i<10;i++){
    const rw = 40 + (i%3)*20;
    const rx = (i/10)*W + 20;
    const rh = 40 + (i%4)*40;
    ctx.fillRect(rx, skyH - rh/2 + 14, rw, rh);
  }
  ctx.restore();
  // ground
  const g2 = ctx.createLinearGradient(0,H*groundYPercent,0,H);
  g2.addColorStop(0,'#6a4a2f'); g2.addColorStop(1,'#3f2a1a');
  ctx.fillStyle = g2; ctx.fillRect(0,H*groundYPercent,W,H - H*groundYPercent);
  // grass strip
  for(let i=0;i<Math.floor(W/10);i++){
    ctx.fillStyle = i%2? '#2f7a2f' : '#3a8b3a';
    const gx = i*10 + (Math.sin(i*0.6 + performance.now()/600)*2);
    ctx.fillRect(gx, H*groundYPercent - 6, 6, 6);
  }
}

function drawEntity(e){
  // compute draw position: sprite origin at feet center
  const drawX = e.x;
  const drawY = e.y; // feet y
  const scale = 2.2; // pixel scale for sprite
  const fw = spriteSheet.frameW;
  const fh = spriteSheet.frameH;
  const sx = Math.floor(e.frameIndex) * fw;
  const sy = 0;

  ctx.save();

  // flip horizontally if dir is -1
  ctx.translate(drawX, drawY);
  ctx.scale(e.dir,1);
  // render sprite sheet with tint on shirt area:
  // draw sprite scaled
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spriteSheet.canvas, sx, sy, fw, fh, - (fw/2)*scale, -fh*scale, fw*scale, fh*scale);

  // apply tint for shirt: simple rectangle overlay where shirt sits
  // shirt region approx area: center torso
  const shirtW = 8*scale, shirtH = 6*scale;
  const shirtX = - (4*scale);
  const shirtY = -11*scale;
  // tint using globalCompositeOperation multiply for pixel feel
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgb(${e.colorTint.r},${e.colorTint.g},${e.colorTint.b})`;
  ctx.fillRect(shirtX, shirtY, shirtW, shirtH);
  ctx.globalCompositeOperation = 'source-over';

  // debug: draw hitbox (optional) - commented out
  // const hb = getHitbox(e);
  // ctx.strokeStyle = '#fff'; ctx.strokeRect(hb.x - e.x - e.w/2, hb.y - e.y + fh*scale, hb.w, hb.h);

  ctx.restore();
  document.getElementById("go-home").addEventListener("click", () => {
    window.location.href = "index.html"; // กลับหน้าแรก (หรือ link อื่น)
});

document.getElementById("restart2").addEventListener("click", () => {
    document.getElementById("gameover-screen").classList.add("hidden");
    resetGame();
});

}

