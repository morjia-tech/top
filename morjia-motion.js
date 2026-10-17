/* One shared two-frame player for the site and the comparison preview. */
(() => {
  'use strict';
  const walk = Object.freeze({ fps: 4, referenceHeight: 190, referenceSpeed: 48 });
  function readStrip(image) {
    const scan = document.createElement('canvas');
    scan.width = image.width; scan.height = image.height;
    const ctx = scan.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, scan.width, scan.height).data;
    const frames = [0, 1].map(n => {
      const start = Math.round(n * image.width / 2), end = Math.round((n + 1) * image.width / 2);
      let l = end, r = -1, t = image.height, b = -1;
      for (let y = 0; y < image.height; y++) for (let x = start; x < end; x++) {
        if (pixels[(y * image.width + x) * 4 + 3] <= 90) continue;
        l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y);
      }
      if (r < l) throw new Error('Empty MORJIA two-frame cell');
      return { x: l, y: t, width: r - l + 1, height: b - t + 1 };
    });
    return { image, frames, maxHeight: Math.max(...frames.map(f => f.height)) };
  }
  function loadStrip(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => { try { resolve(readStrip(image)); } catch (error) { reject(error); } };
      image.onerror = () => reject(new Error('Could not load MORJIA motion: ' + src));
      image.src = src;
    });
  }
  function frameAt(seconds) { return Math.floor(Math.max(0, seconds) * walk.fps) % 2; }
  function speedAt(displayHeight) { return walk.referenceSpeed * displayHeight / walk.referenceHeight; }
  function drawFrame(ctx, strip, index, center, ground, height, direction = 1) {
    const frame = strip.frames[index % 2], scale = height / strip.maxHeight;
    ctx.save(); ctx.translate(center, ground); ctx.scale(direction, 1);
    // Same whole-sprite centering and baseline as the originally approved demo.
    ctx.drawImage(strip.image, frame.x, frame.y, frame.width, frame.height,
      -frame.width * scale / 2, -frame.height * scale, frame.width * scale, frame.height * scale);
    ctx.restore();
  }
  window.MorjiaMotion = Object.freeze({ walk, readStrip, loadStrip, frameAt, speedAt, drawFrame });
})();
