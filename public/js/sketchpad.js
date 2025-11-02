(() => {
  // Stav
  const state = {
    tool: 'draw', // draw | text | shape
    shape: 'rect', // rect | circle | line
    color: '#22223b',
    lineWidth: 4,
    drawing: false,
    startX: 0,
    startY: 0,
    undoStack: [],
    redoStack: [],
    maxSnapshots: 30
  };

  const canvas = document.getElementById('drawCanvas');
  const overlay = document.getElementById('overlayCanvas');
  const container = document.querySelector('.canvas-wrap');
  if (!canvas || !container) return; // sanity
  const ctx = canvas.getContext('2d');
  const octx = overlay ? overlay.getContext('2d') : null;

  // Menu prvky
  const colorInput = document.getElementById('colorInput');
  const widthInput = document.getElementById('widthRange');
  const textColorInput = document.getElementById('textColorInput');
  const textWidthInput = document.getElementById('textWidthRange');
  const shapeColorInput = document.getElementById('shapeColorInput');
  const shapeWidthInput = document.getElementById('shapeWidthRange');
  const shapeRadios = document.querySelectorAll('input[name="shapeType"]');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const clearBtn = document.getElementById('clearBtn');
  const saveBtn = document.getElementById('saveBtn');

  // Topdown menu přepínání
  const drawBtn = document.getElementById('showDrawMenu');
  const textBtn = document.getElementById('showTextMenu');
  const shapeBtn = document.getElementById('showShapeMenu');
  const drawMenu = document.getElementById('drawMenu');
  const textMenu = document.getElementById('textMenu');
  const shapeMenu = document.getElementById('shapeMenu');

  function setTool(tool) {
    state.tool = tool;
    if (tool === 'draw') {
      drawMenu.classList.remove('d-none');
      textMenu.classList.add('d-none');
      shapeMenu.classList.add('d-none');
      drawBtn.classList.add('active');
      textBtn.classList.remove('active');
      shapeBtn.classList.remove('active');
      container.style.cursor = 'crosshair';
    } else if (tool === 'text') {
      drawMenu.classList.add('d-none');
      textMenu.classList.remove('d-none');
      shapeMenu.classList.add('d-none');
      drawBtn.classList.remove('active');
      textBtn.classList.add('active');
      shapeBtn.classList.remove('active');
      container.style.cursor = 'text';
    } else if (tool === 'shape') {
      drawMenu.classList.add('d-none');
      textMenu.classList.add('d-none');
      shapeMenu.classList.remove('d-none');
      drawBtn.classList.remove('active');
      textBtn.classList.remove('active');
      shapeBtn.classList.add('active');
      container.style.cursor = 'crosshair';
    }
  }

  drawBtn.addEventListener('click', () => setTool('draw'));
  textBtn.addEventListener('click', () => setTool('text'));
  shapeBtn.addEventListener('click', () => setTool('shape'));

  // Výchozí
  setTool('draw');

  // High-DPI canvas scaling
  function sizeCanvas() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    [canvas, overlay].forEach(cv => {
      if (!cv) return;
      cv.width = Math.floor(width * dpr);
      cv.height = Math.floor(height * dpr);
      cv.style.width = width + 'px';
      cv.style.height = height + 'px';
      const c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    // Redraw content snapshot after resize
    if (state._lastImage) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0,0,width,height);
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = state._lastImage;
    }
  }

  function snapshot() {
    try {
      state.undoStack.push(canvas.toDataURL('image/png'));
      if (state.undoStack.length > state.maxSnapshots) state.undoStack.shift();
      state.redoStack = [];
      state._lastImage = state.undoStack[state.undoStack.length - 1];
    } catch (e) { console.warn('Snapshot failed', e); }
  }

  function restore(dataUrl) {
    return new Promise(resolve => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const cssW = canvas.width / dpr;
      const cssH = canvas.height / dpr;
      const img = new Image();
      img.onload = () => { ctx.clearRect(0,0,cssW,cssH); ctx.drawImage(img, 0, 0, cssW, cssH); resolve(); };
      img.src = dataUrl;
    });
  }

  function setStyle() {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = state.color;
    ctx.fillStyle = state.color;
    ctx.lineWidth = state.lineWidth;
  }

  function clearOverlay() { if (octx) octx.clearRect(0,0,overlay.width, overlay.height); }

  // Drawing handlers
  function pointerDown(x, y) {
    if (state.tool === 'draw' || state.tool === 'shape') {
      state.drawing = true; state.startX = x; state.startY = y; setStyle();
      snapshot();
      if (state.tool === 'draw') {
        ctx.beginPath(); ctx.moveTo(x, y);
      }
    }
  }

  function pointerMove(x, y) {
    if (!state.drawing) return;
    if (state.tool === 'draw') {
      ctx.lineTo(x, y); ctx.stroke();
      state._lastImage = canvas.toDataURL('image/png');
    } else if (state.tool === 'shape' && octx) {
      clearOverlay();
      octx.lineCap = 'round';
      octx.lineJoin = 'round';
      // použij barvu a šířku z shape menu pokud existují
      octx.strokeStyle = shapeColorInput && shapeColorInput.value ? shapeColorInput.value : state.color;
      octx.lineWidth = shapeWidthInput && shapeWidthInput.value ? parseInt(shapeWidthInput.value, 10) : state.lineWidth;
      const w = x - state.startX; const h = y - state.startY;
      if (state.shape === 'rect') {
        octx.strokeRect(state.startX, state.startY, w, h);
      } else if (state.shape === 'circle') {
        const rx = w; const ry = h; const r = Math.hypot(rx, ry);
        octx.beginPath(); octx.arc(state.startX, state.startY, r, 0, Math.PI*2); octx.stroke();
      } else if (state.shape === 'line') {
        octx.beginPath(); octx.moveTo(state.startX, state.startY); octx.lineTo(x, y); octx.stroke();
      }
    }
  }

  function pointerUp(x, y) {
    if (!state.drawing) return; state.drawing = false;
    if (state.tool === 'shape') {
      // při potvrzení tvaru použij nastavení shape menu
      const prevColor = state.color; const prevLine = state.lineWidth;
      if (shapeColorInput && shapeColorInput.value) state.color = shapeColorInput.value;
      if (shapeWidthInput && shapeWidthInput.value) state.lineWidth = parseInt(shapeWidthInput.value, 10);
      setStyle();
      const w = x - state.startX; const h = y - state.startY;
      if (state.shape === 'rect') {
        ctx.strokeRect(state.startX, state.startY, w, h);
      } else if (state.shape === 'circle') {
        const r = Math.hypot(w, h);
        ctx.beginPath(); ctx.arc(state.startX, state.startY, r, 0, Math.PI*2); ctx.stroke();
      } else if (state.shape === 'line') {
        ctx.beginPath(); ctx.moveTo(state.startX, state.startY); ctx.lineTo(x, y); ctx.stroke();
      }
      // restore
      state.color = prevColor; state.lineWidth = prevLine; setStyle();
      clearOverlay();
    }
    state._lastImage = canvas.toDataURL('image/png');
  }

  // Text tool – create floating input
  function createTextInput(x, y) {
    const input = document.createElement('input');
    input.type = 'text'; input.placeholder = 'Napište text a stiskněte Enter';
    input.className = 'form-control form-control-sm shadow-soft';
    Object.assign(input.style, { position: 'absolute', left: x + 'px', top: y + 'px', width: '220px', zIndex: 10 });
    container.appendChild(input);
    input.focus();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        // použij barvu a velikost z text menu pokud existují
        const prevColor = state.color; const prevLine = state.lineWidth;
        if (textColorInput && textColorInput.value) state.color = textColorInput.value;
        if (textWidthInput && textWidthInput.value) state.lineWidth = parseInt(textWidthInput.value, 10);
        setStyle();
        // font size derived from textWidthInput
        ctx.font = `${Math.max(12, state.lineWidth*6)}px Inter, system-ui, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(input.value, x, y);
        snapshot();
        state._lastImage = canvas.toDataURL('image/png');
        input.remove();
        // restore previous
        state.color = prevColor; state.lineWidth = prevLine; setStyle();
      } else if (e.key === 'Escape') {
        input.remove();
      }
    });
  }

  // Pointer utils (support mouse + touch + pen)
  function getXY(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return { x: (e.clientX - rect.left), y: (e.clientY - rect.top) };
  }

  function attachEvents() {
    // vyčti počáteční hodnoty z DOM, pokud existují
    if (colorInput && colorInput.value) state.color = colorInput.value;
    if (widthInput && widthInput.value) state.lineWidth = parseInt(widthInput.value, 10);
    if (textColorInput && textColorInput.value) {/* nothing, used on demand */}
    if (textWidthInput && textWidthInput.value) {/* nothing, used on demand */}
    if (shapeColorInput && shapeColorInput.value) {/* nothing, used on demand */}
    if (shapeWidthInput && shapeWidthInput.value) {/* nothing, used on demand */}

    // Mouse
    canvas.addEventListener('mousedown', e => { const {x,y} = getXY(e); pointerDown(x,y); });
    window.addEventListener('mousemove', e => { const {x,y} = getXY(e); pointerMove(x,y); });
    window.addEventListener('mouseup',   e => { const {x,y} = getXY(e); pointerUp(x,y); });

    // Touch
    canvas.addEventListener('touchstart', e => { const {x,y} = getXY(e); pointerDown(x,y); });
    canvas.addEventListener('touchmove',  e => { const {x,y} = getXY(e); pointerMove(x,y); e.preventDefault(); }, { passive:false });
    canvas.addEventListener('touchend',   e => { const touch = (e.changedTouches && e.changedTouches[0]) || e; const {x,y} = getXY(touch); pointerUp(x,y); });

    // Text placing
    canvas.addEventListener('dblclick', e => {
      if (state.tool !== 'text') return; const {x,y} = getXY(e); createTextInput(x, y);
    });

    // Controls
    if (colorInput) colorInput.addEventListener('input', e => state.color = e.target.value);
    if (widthInput) widthInput.addEventListener('input', e => state.lineWidth = parseInt(e.target.value, 10));
    if (textColorInput) textColorInput.addEventListener('input', e => {/* updated on demand when inserting text */});
    if (textWidthInput) textWidthInput.addEventListener('input', e => {/* updated on demand when inserting text */});
    if (shapeColorInput) shapeColorInput.addEventListener('input', e => {/* used on shape draw */});
    if (shapeWidthInput) shapeWidthInput.addEventListener('input', e => {/* used on shape draw */});
    if (shapeRadios) shapeRadios.forEach(r => r.addEventListener('change', e => { state.shape = e.target.value; }));

    if (undoBtn) undoBtn.addEventListener('click', async () => {
      if (!state.undoStack.length) return;
      const latest = state.undoStack.pop();
      state.redoStack.push(canvas.toDataURL('image/png'));
      await restore(latest);
    });
    if (redoBtn) redoBtn.addEventListener('click', async () => {
      if (!state.redoStack.length) return;
      const latest = state.redoStack.pop();
      state.undoStack.push(canvas.toDataURL('image/png'));
      await restore(latest);
    });
    if (clearBtn) clearBtn.addEventListener('click', () => { ctx.clearRect(0,0,canvas.width,canvas.height); snapshot(); });
    if (saveBtn) saveBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'sketch.png'; a.click();
    });

    // Shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (undoBtn) undoBtn.click(); }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); if (redoBtn) redoBtn.click(); }
    });

    // Resize
    window.addEventListener('resize', () => { state._lastImage = canvas.toDataURL('image/png'); sizeCanvas(); });
  }

  // Inicializace
  function init() {
    sizeCanvas();
    attachEvents();
    snapshot();
  }

  document.addEventListener('DOMContentLoaded', init);
 })();
