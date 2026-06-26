import Game from './game/Game';

const container = document.getElementById('game-container')!;
const menu = document.getElementById('menu-overlay')!;
const startBtn = document.getElementById('start-btn')!;

const versionLabel = `v${__APP_VERSION__}`;
document.querySelectorAll('.version-label').forEach((el) => {
  el.textContent = versionLabel;
});

let game: Game | null = null;

startBtn.addEventListener('click', () => {
  menu.classList.add('hidden');
  if (!game) {
    game = new Game(container);
  }
  game.start();
});