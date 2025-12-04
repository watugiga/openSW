'use strict';

/* ===== 캔버스 설정 ===== */
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');

// 홀드 캔버스 설정
const holdCanvas = document.getElementById('hold');
const holdCtx = holdCanvas.getContext('2d');

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
canvas.width = COLS * BLOCK;
canvas.height = ROWS * BLOCK;
ctx.scale(BLOCK, BLOCK);

// 오디오 엘리먼트 정의
const gameMusic = document.getElementById('gameMusic');

/* ===== 색상 ===== */
const COLORS = [
  null,
  '#00f0f0', '#0000f0', '#f0a000',
  '#f0f000', '#00f000', '#a000f0', '#f00000'
];

/* ===== 테트로미노 생성 ===== */
function createPiece(type) {
  switch (type) {
    case 'I': return [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]];
    case 'J': return [[2,0,0],[2,2,2],[0,0,0]];
    case 'L': return [[0,0,3],[3,3,3],[0,0,0]];
    case 'O': return [[4,4],[4,4]];
    case 'S': return [[0,5,5],[5,5,0],[0,0,0]];
    case 'T': return [[0,6,0],[6,6,6],[0,0,0]];
    case 'Z': return [[7,7,0],[0,7,7],[0,0,0]];
  }
}

function createMatrix(w, h){
  const m = [];
  while (h--) m.push(new Array(w).fill(0));
  return m;
}

const arena = createMatrix(COLS, ROWS);

const player = { pos: {x:0, y:0}, matrix: null, score: 0, lines: 0 };

let nextPiece = null;
let dropInterval = 1000;
let dropCounter = 0;
let lastTime = 0;
let gameOver = false;
let paused = false;

const pieces = 'IJLOSTZ';
const SCORE_TABLE = [0, 40, 100, 300, 1200];

// 홀드 관련 변수
let heldPiece = null;      
let canHold = true;        

function randomPiece(){
  return pieces[(Math.random() * pieces.length) | 0];
}

/* ===== 충돌 체크 ===== */
function collide(arena, player){
  const m = player.matrix;
  const o = player.pos;
  for (let y=0; y<m.length; ++y){
    for (let x=0; x<m[y].length; ++x){
      if (m[y][x] !== 0 &&
          (arena[y+o.y] && arena[y+o.y][x+o.x]) !== 0)
        return true;
    }
  }
  return false;
}

/* ===== 병합 ===== */
function merge(arena, player){
  player.matrix.forEach((row,y)=>{
    row.forEach((v,x)=>{
      if (v !== 0) arena[y+player.pos.y][x+player.pos.x] = v;
    });
  });
}

/* ===== 라인 제거 ===== */
function sweep(){
  let rowCount = 0;
  outer: for (let y = arena.length -1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) continue outer;
    }
    arena.splice(y, 1);
    arena.unshift(new Array(COLS).fill(0));
    ++y;
    rowCount++;
  }
  if (rowCount > 0) {
    player.lines += rowCount;
    player.score += SCORE_TABLE[rowCount];
    updateScore();
  }
}

/* ===== 회전 ===== */
function rotate(matrix){
  for (let y=0; y<matrix.length; ++y){
    for (let x=0; x<y; ++x){
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  matrix.forEach(row => row.reverse());
}

function playerRotate(){
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix); rotate(player.matrix); rotate(player.matrix);
      player.pos.x = pos;
      return;
    }
  }
}

/* ===== 이동 ===== */
function playerMove(dir){
  player.pos.x += dir;
  if (collide(arena, player)) player.pos.x -= dir;
}

/* ===== 홀드 기능 ===== */
function playerHold(){
    if (gameOver || paused || !canHold) return;

    const currentTypeIndex = player.matrix.flat().find(v => v !== 0);
    const currentType = pieces[currentTypeIndex - 1]; 
    
    const resetPosition = (matrix) => {
        player.pos.y = 0;
        player.pos.x = (COLS / 2 | 0) - (matrix[0].length / 2 | 0);
    };

    if (heldPiece === null) {
        heldPiece = currentType;
        playerReset(); 
    } else {
        const temp = heldPiece;
        heldPiece = currentType;
        player.matrix = createPiece(temp);
        
        resetPosition(player.matrix);
        while (collide(arena, player)) {
             player.pos.y--; 
             if (player.pos.y < -1) { 
                 player.pos.y = 0; 
                 break;
             }
        }
    }
    
    canHold = false; 
    drawHold();
}


/* ===== 드롭 ===== */
function drop(){
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    sweep();
    canHold = true; 
    playerReset();
    if (collide(arena, player)) {
      gameOver = true;
      paused = true;
      gameMusic.pause();
      alert("게임 오버! 점수: " + player.score);
    }
  }
  dropCounter = 0;
}

/* ===== 새 블록 ===== */
function playerReset(){
  const type = nextPiece;
  player.matrix = createPiece(type);
  player.pos.y = 0;
  player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);
  nextPiece = randomPiece();
  drawNext();
}

/* ===== 그리기 ===== */
function drawCell(x,y,v,c){
  if (!v) return;

  // 1. 블록 내부 색상 채우기
  c.fillStyle = COLORS[v];
  c.fillRect(x,y,1,1);
  
  // 2. 윤곽선 설정 및 그리기
  c.strokeStyle = '#071023'; 
  c.lineWidth = 0.05;         
  c.strokeRect(x,y,1,1);
}

function draw(){
  // ⭐ 수정된 부분: 캔버스 배경색을 검은색으로 변경하여 주 배경색과 구분합니다.
  ctx.fillStyle = "#000000"; 
  ctx.fillRect(0,0,COLS,ROWS);

  drawMatrix(arena, {x:0,y:0}, ctx);
  drawMatrix(player.matrix, player.pos, ctx);
  
  drawHold(); 
}

function drawMatrix(matrix, offset, c){
  matrix.forEach((row,y)=>{
    row.forEach((value,x)=>{
      if (value !== 0) drawCell(x + offset.x, y + offset.y, value, c);
    });
  });
}

function drawNext(){
  nextCtx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
  const m = createPiece(nextPiece);
  const s = 30;
  const ox = Math.floor((nextCanvas.width/s - m[0].length) / 2);
  const oy = Math.floor((nextCanvas.height/s - m.length) / 2);

  nextCtx.save();
  nextCtx.scale(s,s);
  drawMatrix(m, {x:ox,y:oy}, nextCtx);
  nextCtx.restore();
}

function drawHold(){
    holdCtx.clearRect(0,0,holdCanvas.width,holdCanvas.height);
    
    if (heldPiece) {
        const m = createPiece(heldPiece);
        const s = 30; 
        const ox = Math.floor((holdCanvas.width/s - m[0].length) / 2);
        const oy = Math.floor((holdCanvas.height/s - m.length) / 2);

        holdCtx.save();
        holdCtx.scale(s,s);
        drawMatrix(m, {x:ox,y:oy}, holdCtx);
        holdCtx.restore();
    }
}


/* ===== 점수 갱신 ===== */
function updateScore(){
  document.getElementById("score").innerText = player.score;
  document.getElementById("lines").innerText = player.lines;
}

/* ===== 게임 루프 ===== */
function update(time=0){
  if (paused) {
    gameMusic.pause();
    lastTime = time;
    requestAnimationFrame(update);
    return;
  }

  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;

  if (dropCounter > dropInterval) drop();

  draw();

  if (!gameOver) requestAnimationFrame(update);
}

/* ===== 초기화 ===== */
function initGame(){
  arena.forEach(row => row.fill(0));
  player.score = 0;
  player.lines = 0;
  updateScore();
  dropInterval = 1000;
  gameOver = false;
  paused = false;
  
  heldPiece = null;
  canHold = true;
  drawHold(); 

  nextPiece = randomPiece();
  playerReset();

  lastTime = 0;
  dropCounter = 0;
  
  gameMusic.pause();         
  gameMusic.currentTime = 0; 
  gameMusic.play().catch(e => {
    if (e.name !== "AbortError") {
        console.error("음악 재생 실패:", e); 
    }
  });
  
  requestAnimationFrame(update);
}

/* ===== 입력 ===== */
document.addEventListener("keydown", event => {

  const blocked = ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space", "KeyC", "ShiftLeft", "ShiftRight"];
  if (blocked.includes(event.code)) event.preventDefault();

  if (gameOver) return;

  if (event.code === "ArrowLeft") playerMove(-1);
  else if (event.code === "ArrowRight") playerMove(1);
  else if (event.code === "ArrowDown") drop();
  else if (event.code === "ArrowUp") playerRotate();
  else if (event.code === "Space") hardDrop();
  else if (event.code === "KeyC" || event.code === "ShiftLeft" || event.code === "ShiftRight") playerHold();
  else if (event.code === "KeyP"){ 
    paused = !paused;
    if (paused) gameMusic.pause();
    else gameMusic.play().catch(e => {
        if (e.name !== "AbortError") console.error("음악 재생 실패:", e);
    });
  }
  else if (event.code === "KeyR") initGame();
});

function hardDrop(){
  while (!collide(arena, player)) player.pos.y++;
  player.pos.y--;
  drop();
}

/* ===== 버튼 이벤트 ===== */
document.getElementById("startBtn").onclick = () => initGame();
document.getElementById("restartBtn").onclick = () => initGame();

document.getElementById("pauseBtn").onclick = () => {
  paused = !paused;
  if (paused) gameMusic.pause();
  else gameMusic.play().catch(e => {
        if (e.name !== "AbortError") console.error("음악 재생 실패:", e);
    });
};

/* 초기 화면 */
nextPiece = randomPiece();
playerReset(); 
draw();
drawNext();