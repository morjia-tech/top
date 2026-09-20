(() => {
  'use strict';

  const CELL = { width: 192, height: 208 };

  // New actions can be added here without changing the wandering engine.
  const ACTIONS = {
    idle:    { sheet: 'main', row: 0, frames: 6, fps: 3, duration: [1200, 2600] },
    right:   { sheet: 'main', row: 1, frames: 8, fps: 9 },
    left:    { sheet: 'main', row: 2, frames: 8, fps: 9 },
    wave:    { sheet: 'main', row: 3, frames: 4, fps: 5, duration: [1100, 1600] },
    jump:    { sheet: 'main', row: 4, frames: 5, fps: 7, duration: [800, 1100] },
    wait:    { sheet: 'main', row: 6, frames: 6, fps: 4, duration: [1400, 2300] },
    sit:     { sheet: 'extra', row: 0, frames: 6, fps: 4, duration: [2600, 4300], setting: 'sit' },
    sleep:   { sheet: 'extra', row: 1, frames: 8, fps: 3, duration: [4200, 7000], setting: 'sleep' },
    stretch: { sheet: 'extra', row: 2, frames: 6, fps: 5, duration: [1700, 2400], setting: 'stretch' },
    groom:   { sheet: 'extra', row: 3, frames: 8, fps: 5, duration: [3000, 4800], setting: 'groom' },
    peek:    { sheet: 'extra', row: 4, frames: 6, fps: 4, duration: [2400, 3800], setting: 'peek' }
  };

  const RANDOM_ACTIONS = [
    { name: 'wave', weight: 0.18, message: 'にゃ。' },
    { name: 'jump', weight: 0.12 },
    { name: 'wait', weight: 0.12, message: 'ふーん、そういうことね。' },
    { name: 'sit', weight: 0.11 },
    { name: 'sleep', weight: 0.07 },
    { name: 'stretch', weight: 0.09 },
    { name: 'groom', weight: 0.10 },
    { name: 'peek', weight: 0.09 },
    { name: 'wander', weight: 0.12 }
  ];

  class MorjiaPet {
    constructor({ canvas, speech, sprite, extraSprite }) {
      this.canvas = canvas;
      this.speech = speech;
      this.ctx = canvas.getContext('2d');
      // Keep positioning consistent even when an older stylesheet is cached.
      this.canvas.style.left = '0px';
      this.canvas.style.top = '0px';
      this.extraReady = false;
      this.sprites = { main: new Image(), extra: new Image() };
      this.x = innerWidth * 0.72;
      this.y = innerHeight * 0.68;
      this.target = { x: this.x, y: this.y };
      this.action = 'idle';
      this.frame = 0;
      this.lastFrameAt = performance.now();
      this.lastTickAt = 0;
      this.actionUntil = performance.now() + 1400;
      this.speed = Math.max(1, Number(window.SITE_DATA?.pet?.speed) || 54);
      this.speechTimer = 0;
      this.pendingAction = '';
      this.peekMirror = false;
      this.drag = null;

      const greet = () => {
        this.target = { x: this.x, y: this.y };
        this.pendingAction = '';
        const messages = window.SITE_DATA?.pet?.clickMessages || ['にゃ。', 'どうしたの。', '見てるよ。'];
        this.say(messages[Math.floor(Math.random() * messages.length)] || 'にゃ。');
        this.setAction('wave', 1300);
      };
      this.canvas.addEventListener('pointerdown', event => {
        if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault();
        this.drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: this.x, y: this.y, moved: false };
        this.canvas.setPointerCapture(event.pointerId);
        this.target = { x: this.x, y: this.y }; this.pendingAction = ''; this.setAction('idle');
      });
      this.canvas.addEventListener('pointermove', event => {
        if (!this.drag || event.pointerId !== this.drag.id) return;
        const dx = event.clientX - this.drag.startX, dy = event.clientY - this.drag.startY;
        if (Math.hypot(dx, dy) > 5) this.drag.moved = true;
        if (!this.drag.moved) return;
        this.x = Math.max(0, Math.min(innerWidth - this.canvas.clientWidth, this.drag.x + dx));
        this.y = Math.max(0, Math.min(innerHeight - this.canvas.clientHeight, this.drag.y + dy));
        this.target = { x: this.x, y: this.y }; this.position();
      });
      const release = (event, cancelled = false) => {
        if (!this.drag || event.pointerId !== this.drag.id) return;
        const moved = this.drag.moved; this.drag = null;
        if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
        this.target = { x: this.x, y: this.y }; this.setAction('idle', 3000);
        if (!moved && !cancelled) greet();
      };
      this.canvas.addEventListener('pointerup', event => release(event));
      this.canvas.addEventListener('pointercancel', event => release(event, true));
      this.canvas.addEventListener('lostpointercapture', event => release(event, true));
      this.canvas.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); greet(); }
      });
      addEventListener('resize', () => this.keepInside());
      this.sprites.main.addEventListener('load', () => {
        this.keepInside();
        this.target = { x: this.x, y: this.y };
        requestAnimationFrame(time => this.tick(time));
      }, { once: true });
      this.sprites.extra.addEventListener('load', () => { this.extraReady = true; }, { once: true });
      this.sprites.extra.addEventListener('error', () => {
        console.warn('Morjia: extra animation image unavailable; using standard animations.');
      }, { once: true });
      this.sprites.main.src = sprite;
      this.sprites.extra.src = extraSprite;
    }

    bounds() {
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;
      return {
        minX: 8,
        maxX: Math.max(8, innerWidth - width - 8),
        minY: Math.min(110, innerHeight * 0.25),
        maxY: Math.max(120, innerHeight - height - 10)
      };
    }

    keepInside() {
      const b = this.bounds();
      this.x = Math.min(b.maxX, Math.max(b.minX, this.x));
      this.y = Math.min(b.maxY, Math.max(b.minY, this.y));
      this.target = { x: this.x, y: this.y };
    }

    randomDuration(action) {
      const [min, max] = ACTIONS[action].duration || [1200, 2000];
      return min + Math.random() * (max - min);
    }

    setAction(name, duration = this.randomDuration(name)) {
      this.action = name;
      this.frame = 0;
      this.lastFrameAt = performance.now();
      this.actionUntil = performance.now() + duration;
    }

    chooseNext() {
      if (this.action === 'peek') {
        const bounds = this.bounds();
        this.target.x = this.x < 0 ? bounds.minX + 30 : Math.max(bounds.minX, bounds.maxX - 30);
        this.target.y = this.y;
        return;
      }
      const settings = window.SITE_DATA?.pet?.actions || {};
      const choices = RANDOM_ACTIONS.filter(item =>
        (ACTIONS[item.name]?.sheet !== 'extra' || this.extraReady) &&
        (!ACTIONS[item.name]?.setting || settings[ACTIONS[item.name].setting] !== false));
      let roll = Math.random() * choices.reduce((sum, item) => sum + item.weight, 0);
      const choice = choices.find(item => (roll -= item.weight) <= 0) || choices.at(-1);
      if (choice.name === 'wander') {
        const b = this.bounds();
        this.target.x = b.minX + Math.random() * (b.maxX - b.minX);
        this.target.y = b.minY + Math.random() * (b.maxY - b.minY);
        this.actionUntil = performance.now() + 5000;
      } else if (choice.name === 'peek') {
        const b = this.bounds();
        const fromLeft = Math.random() < 0.5;
        this.target.x = fromLeft ? -this.canvas.clientWidth * 0.5 : innerWidth - this.canvas.clientWidth * 0.5;
        this.target.y = b.minY + Math.random() * (b.maxY - b.minY);
        this.peekMirror = !fromLeft;
        this.pendingAction = 'peek';
        this.actionUntil = performance.now() + 7000;
      } else {
        this.setAction(choice.name);
        if (choice.message && Math.random() < 0.55) {
          const messages = window.SITE_DATA?.pet?.idleMessages || [choice.message];
          this.say(messages[Math.floor(Math.random() * messages.length)] || choice.message);
        }
      }
    }

    say(text, duration = 1700) {
      clearTimeout(this.speechTimer);
      this.speech.textContent = text;
      this.speech.classList.add('is-visible');
      this.speechTimer = setTimeout(() => this.speech.classList.remove('is-visible'), duration);
    }

    move(delta) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= 7) return false;
      const step = Math.min(distance, this.speed * delta);
      this.x += (dx / distance) * step;
      this.y += (dy / distance) * step;
      const action = dx >= 0 ? 'right' : 'left';
      if (this.action !== action) this.setAction(action);
      return true;
    }

    draw(time) {
      const action = ACTIONS[this.action];
      const frameDuration = 1000 / action.fps;
      const elapsed = Math.max(0, time - this.lastFrameAt);
      if (elapsed >= frameDuration) {
        const steps = Math.floor(elapsed / frameDuration);
        this.frame = (this.frame + steps) % action.frames;
        this.lastFrameAt += steps * frameDuration;
      }
      this.frame %= action.frames;
      this.ctx.clearRect(0, 0, CELL.width, CELL.height);
      this.ctx.save();
      if (this.action === 'peek' && this.peekMirror) {
        this.ctx.translate(CELL.width, 0);
        this.ctx.scale(-1, 1);
      }
      this.ctx.globalAlpha = 1;
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.drawImage(this.sprites[action.sheet], this.frame * CELL.width, action.row * CELL.height,
        CELL.width, CELL.height, 0, 0, CELL.width, CELL.height);
      this.ctx.restore();
    }

    position() {
      this.canvas.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
      this.speech.style.left = `${Math.min(innerWidth - 205, this.x + this.canvas.clientWidth * .62)}px`;
      this.speech.style.top = `${Math.max(12, this.y - 24)}px`;
    }

    tick(time) {
      const delta = Math.min(0.04, this.lastTickAt ? (time - this.lastTickAt) / 1000 : 0.016);
      this.lastTickAt = time;
      if (this.drag) {
        this.draw(time); this.position(); requestAnimationFrame(next => this.tick(next)); return;
      }
      const walking = this.move(delta);
      if (!walking && this.pendingAction) {
        const pending = this.pendingAction;
        this.pendingAction = '';
        this.setAction(pending);
      } else if (!walking && (this.action === 'left' || this.action === 'right')) this.setAction('idle');
      if (!walking && time > this.actionUntil) this.chooseNext();
      this.draw(time);
      this.position();
      requestAnimationFrame(next => this.tick(next));
    }
  }

  const pet = window.SITE_DATA?.pet || {};
  if (pet.enabled !== false) {
    document.querySelector('#morjia-pet').setAttribute('aria-label', pet.label || 'モルジアくん');
    new MorjiaPet({
      canvas: document.querySelector('#morjia-pet'),
      speech: document.querySelector('#morjia-pet-speech'),
      sprite: pet.sprite || 'assets/morjia_spritesheet.webp',
      extraSprite: pet.extraSprite || 'assets/morjia_extra_actions.webp'
    });
  } else document.querySelector('.morjia-pet-layer').hidden = true;
})();
