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

  // Approved common model. Old sheets are retained only as a load-error fallback.
  const UNIFIED_ACTIONS = {
    idle: { frames: [0, 1, 0, 0, 0, 0], fps: 2 },
    right: { frames: [2, 3], fps: 4 },
    left: { frames: [2, 3], fps: 4, mirror: true },
    wave: { frames: [4, 5], fps: 4 },
    jump: { frames: [6, 7, 8, 9, 0, 0], fps: 5, lift: [0, 10, 28, 0, 0, 0] },
    wait: { frames: [10, 11], fps: 1.5 },
    sit: { frames: [12, 12, 12, 13], fps: 2 },
    sleep: { frames: [14, 15], fps: 1 },
    stretch: { frames: [16, 17], fps: 2 },
    groom: { frames: [18, 19, 20, 21, 20, 19], fps: 3 },
    peek: { frames: [22, 22, 22, 23], fps: 2 }
  };

  function readUnifiedAtlas(image) {
    const scan = document.createElement('canvas');
    scan.width = image.width; scan.height = image.height;
    const ctx = scan.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    const rgba = ctx.getImageData(0, 0, scan.width, scan.height).data;
    // Use the actual empty gutters so adjacent paws and forehead tips stay out.
    const rows = [0, 256, 520, 780, 1024, 1260, 1536].map(y => Math.round(y * image.height / 1536));
    return Array.from({ length: 24 }, (_, index) => {
      const col = index % 4, row = Math.floor(index / 4);
      const start = Math.round(col * image.width / 4), end = Math.round((col + 1) * image.width / 4);
      let l = end, r = -1, t = rows[row + 1], b = -1;
      for (let y = rows[row]; y < rows[row + 1]; y++) for (let x = start; x < end; x++) {
        if (rgba[(y * image.width + x) * 4 + 3] <= 90) continue;
        l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y);
      }
      if (r < l) throw new Error('Empty MORJIA animation cell');
      return { x: l, y: t, width: r - l + 1, height: b - t + 1, center: (start + end) / 2 };
    });
  }

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
    constructor({ canvas, speech, sprite, extraSprite, unifiedSprite, walkSprite, sleepSprite }) {
      this.canvas = canvas;
      this.speech = speech;
      this.ctx = canvas.getContext('2d');
      // Keep positioning consistent even when an older stylesheet is cached.
      this.canvas.style.left = '0px';
      this.canvas.style.top = '0px';
      this.extraReady = false;
      this.sprites = { main: new Image(), extra: new Image(), unified: new Image() };
      this.unifiedReady = false;
      this.unifiedFrames = [];
      this.strips = { walk: null, sleep: null };
      this.motionReady = false;
      this.walkSeconds = 0;
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
      const fallback = () => {
        console.warn('Morjia: unified animation unavailable; using the original sheets.');
        this.sprites.main.src = sprite;
        this.sprites.extra.src = extraSprite;
      };
      this.sprites.unified.addEventListener('load', async () => {
        try { this.unifiedFrames = readUnifiedAtlas(this.sprites.unified); }
        catch { fallback(); return; }
        if (!window.MorjiaMotion) { fallback(); return; }
        this.unifiedReady = true; this.extraReady = true;
        const supplemental = await Promise.allSettled([
          window.MorjiaMotion.loadStrip(walkSprite), window.MorjiaMotion.loadStrip(sleepSprite)
        ]);
        ['walk', 'sleep'].forEach((name, i) => {
          if (supplemental[i].status === 'fulfilled') this.strips[name] = supplemental[i].value;
          else console.warn('Morjia: ' + name + ' supplement unavailable; using unified sheet.');
        });
        this.motionReady = true;
        this.keepInside(); this.target = { x: this.x, y: this.y };
        this.lastFrameAt = performance.now();
        requestAnimationFrame(time => this.tick(time));
      }, { once: true });
      this.sprites.unified.addEventListener('error', fallback, { once: true });
      this.sprites.unified.src = unifiedSprite;
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
        this.target.y = this.unifiedReady ? this.y : b.minY + Math.random() * (b.maxY - b.minY);
        this.actionUntil = performance.now() + 5000;
      } else if (choice.name === 'peek') {
        const b = this.bounds();
        const fromLeft = Math.random() < 0.5;
        this.target.x = fromLeft ? -this.canvas.clientWidth * 0.5 : innerWidth - this.canvas.clientWidth * 0.5;
        this.target.y = this.unifiedReady ? this.y : b.minY + Math.random() * (b.maxY - b.minY);
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

    walkingHeight() {
      const image = this.sprites.unified;
      const scale = Math.min(CELL.width / (image.width / 4), CELL.height / (image.height / 6));
      return Math.max(this.unifiedFrames[2].height, this.unifiedFrames[3].height) * scale;
    }

    walkingSpeed() {
      const displayHeight = this.walkingHeight() * this.canvas.clientHeight / CELL.height;
      return window.MorjiaMotion.speedAt(displayHeight) * this.speed / 54;
    }

    move(delta) {
      const dx = this.target.x - this.x;
      if (this.unifiedReady) {
        // The approved two-frame gait is horizontal, not diagonal/upward skating.
        this.target.y = this.y;
        if (Math.abs(dx) <= 1) return false;
        const pixelsPerSecond = this.walkingSpeed();
        const step = Math.min(Math.abs(dx), pixelsPerSecond * delta);
        const wasWalking = this.action === 'left' || this.action === 'right';
        const action = dx >= 0 ? 'right' : 'left';
        if (this.action !== action) this.setAction(action);
        if (!wasWalking) this.walkSeconds = 0;
        this.x += Math.sign(dx) * step;
        this.walkSeconds += step / pixelsPerSecond;
        return true;
      }
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
      const unified = this.unifiedReady ? UNIFIED_ACTIONS[this.action] : null;
      const count = unified ? unified.frames.length : action.frames;
      const frameDuration = 1000 / (unified ? unified.fps : action.fps);
      const elapsed = Math.max(0, time - this.lastFrameAt);
      if (elapsed >= frameDuration) {
        const steps = Math.floor(elapsed / frameDuration);
        this.frame = (this.frame + steps) % count;
        this.lastFrameAt += steps * frameDuration;
      }
      this.frame %= count;
      const walking = unified && (this.action === 'left' || this.action === 'right');
      if (walking) this.frame = window.MorjiaMotion.frameAt(this.walkSeconds);
      this.ctx.clearRect(0, 0, CELL.width, CELL.height);
      this.ctx.save();
      const strip = walking ? this.strips.walk : this.action === 'sleep' ? this.strips.sleep : null;
      if (strip) {
        let height = this.walkingHeight();
        if (this.action === 'sleep') {
          const image = this.sprites.unified;
          height = Math.max(this.unifiedFrames[14].height, this.unifiedFrames[15].height) *
            Math.min(CELL.width / (image.width / 4), CELL.height / (image.height / 6));
        }
        // Keep one resting head angle; breathe subtly instead of rotating faces.
        const sleep = this.action === 'sleep';
        const ground = CELL.height - 8 + (sleep ? Math.sin(time / 1100) * .5 : 0);
        window.MorjiaMotion.drawFrame(this.ctx, strip, sleep ? 1 : this.frame, CELL.width / 2, ground,
          height, this.action === 'left' ? -1 : 1);
        this.ctx.restore(); return;
      }
      if (unified?.mirror || (this.action === 'peek' && this.peekMirror)) {
        this.ctx.translate(CELL.width, 0);
        this.ctx.scale(-1, 1);
      }
      this.ctx.globalAlpha = 1;
      this.ctx.globalCompositeOperation = 'source-over';
      if (unified) {
        const image = this.sprites.unified, rect = this.unifiedFrames[unified.frames[this.frame]];
        // One shared scale for every pose; never enlarge sleeping/sitting to fit.
        const scale = Math.min(CELL.width / (image.width / 4), CELL.height / (image.height / 6));
        const lift = unified.lift?.[this.frame] || 0;
        this.ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height,
          CELL.width / 2 + (rect.x - rect.center) * scale,
          CELL.height - 8 - rect.height * scale - lift, rect.width * scale, rect.height * scale);
      } else {
        this.ctx.drawImage(this.sprites[action.sheet], this.frame * CELL.width, action.row * CELL.height,
          CELL.width, CELL.height, 0, 0, CELL.width, CELL.height);
      }
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
      extraSprite: pet.extraSprite || 'assets/morjia_extra_actions.webp',
      unifiedSprite: pet.unifiedSprite || 'assets/morjia_unified_v3.png',
      walkSprite: 'assets/morjia_walk_v5b.png',
      sleepSprite: 'assets/morjia_sleep_v5.png'
    });
  } else document.querySelector('.morjia-pet-layer').hidden = true;
})();
