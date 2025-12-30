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
    maxSnapshots: 30,
    points: [],
    boardWidth: 1280,
    boardHeight: 720,
    zoom: 1,
    panning: false,
    // Evidence objektů pro uložení do DB
    canvasObjects: [], // { type, x, y, width, height, color, content, points }
    boardId: null
  };

  const canvas = document.getElementById('drawCanvas');
  const overlay = document.getElementById('overlayCanvas');
  const container = document.querySelector('.canvas-wrap');
  const inner = document.getElementById('canvasInner');
  const scrollHost = document.getElementById('canvasScroll');
  if (!canvas || !container) return; // sanity
  const ctx = canvas.getContext('2d');
  const octx = overlay ? overlay.getContext('2d') : null;
  let socket = null;
  const lastRemotePoint = {}; // map socketId -> {x,y}

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
    const width = state.boardWidth;
    const height = state.boardHeight;
    // aktualizace vnitřního wrapperu na základní rozměr
    if (inner) {
      inner.style.width = width + 'px';
      inner.style.height = height + 'px';
    }
    [canvas, overlay].forEach(cv => {
      if (!cv) return;
      cv.width = Math.floor(width * dpr);
      cv.height = Math.floor(height * dpr);
      cv.style.width = width + 'px';
      cv.style.height = height + 'px';
      const c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
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
  function pointerDown(e, x, y) {
    // kresli jen levým tlačítkem a pokud nejsme v režimu panning
    if (e.button !== 0 || state.panning) return;
    if (state.tool === 'draw' || state.tool === 'shape') {
      state.drawing = true; state.startX = x; state.startY = y; setStyle();
      snapshot();
      if (state.tool === 'draw') {
        state.points = [{ x, y }];
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
  }

  function pointerMove(x, y) {
    if (!state.drawing) return;
    if (state.tool === 'draw') {
      const pts = state.points;
      pts.push({ x, y });
      if (pts.length < 3) {
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        const len = pts.length;
        const prev = pts[len - 2];
        const curr = pts[len - 1];
        const midX = (prev.x + curr.x) / 2;
        const midY = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        ctx.stroke();
      }
      state._lastImage = canvas.toDataURL('image/png');
      if (socket && state.boardId) {
        socket.emit('draw:point', { boardId: state.boardId, x, y, color: state.color, lineWidth: state.lineWidth });
      }
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
        // Uložíme objekt
        state.canvasObjects.push({ type: 'rect', x: state.startX, y: state.startY, width: w, height: h, color: state.color });
        if (socket && state.boardId) socket.emit('shape:add', { boardId: state.boardId, shape: 'rect', x: state.startX, y: state.startY, w, h, color: state.color, lineWidth: state.lineWidth });
      } else if (state.shape === 'circle') {
        const r = Math.hypot(w, h);
        ctx.beginPath(); ctx.arc(state.startX, state.startY, r, 0, Math.PI*2); ctx.stroke();
        // Uložíme objekt (radius jako width)
        state.canvasObjects.push({ type: 'circle', x: state.startX, y: state.startY, width: r, color: state.color });
        if (socket && state.boardId) socket.emit('shape:add', { boardId: state.boardId, shape: 'circle', x: state.startX, y: state.startY, w: r, h: r, color: state.color, lineWidth: state.lineWidth });
      } else if (state.shape === 'line') {
        ctx.beginPath(); ctx.moveTo(state.startX, state.startY); ctx.lineTo(x, y); ctx.stroke();
        // Uložíme objekt: width/height jsou delta hodnoty (koncový bod relativně)
        const dx = x - state.startX; const dy = y - state.startY;
        state.canvasObjects.push({ type: 'line', x: state.startX, y: state.startY, width: dx, height: dy, color: state.color });
        if (socket && state.boardId) socket.emit('shape:add', { boardId: state.boardId, shape: 'line', x: state.startX, y: state.startY, w: dx, h: dy, color: state.color, lineWidth: state.lineWidth });
      }
      // restore
      state.color = prevColor; state.lineWidth = prevLine; setStyle();
      clearOverlay();
    } else if (state.tool === 'draw') {
      const pts = state.points;
      if (pts.length >= 2) {
        const last = pts[pts.length - 1];
        const prev = pts[pts.length - 2];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
        // Uložíme volné kreslení jako objekt s body a lineWidth
        state.canvasObjects.push({ type: 'draw', color: state.color, lineWidth: state.lineWidth, points: [...pts] });
      }
      state.points = [];
      if (socket && state.boardId) socket.emit('draw:stroke:end', { boardId: state.boardId });
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
        const textValue = input.value.trim();
        if (textValue) {
          // použij barvu a velikost z text menu pokud existují
          const prevColor = state.color; const prevLine = state.lineWidth;
          const textColor = (textColorInput && textColorInput.value) ? textColorInput.value : state.color;
          const textSize = (textWidthInput && textWidthInput.value) ? parseInt(textWidthInput.value, 10) : state.lineWidth;
          if (textColorInput && textColorInput.value) state.color = textColorInput.value;
          if (textWidthInput && textWidthInput.value) state.lineWidth = parseInt(textWidthInput.value, 10);
          setStyle();
          // font size derived from textWidthInput
          const fontSize = Math.max(12, state.lineWidth*6);
          ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
          ctx.textBaseline = 'top';
          ctx.fillText(textValue, x, y);
          snapshot();
          state._lastImage = canvas.toDataURL('image/png');
          // Uložíme text jako objekt
          state.canvasObjects.push({ type: 'text', x: x, y: y, color: textColor, fontSize: fontSize, content: textValue });
          if (socket && state.boardId) socket.emit('text:add', { boardId: state.boardId, x, y, text: textValue, color: textColor, fontSize });
          input.remove();
          // restore previous
          state.color = prevColor; state.lineWidth = prevLine; setStyle();
        } else {
          input.remove();
        }
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
        x: (e.touches[0].clientX - rect.left) / state.zoom,
        y: (e.touches[0].clientY - rect.top) / state.zoom
      };
    }
    return { x: (e.clientX - rect.left) / state.zoom, y: (e.clientY - rect.top) / state.zoom };
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
    canvas.addEventListener('mousedown', e => { const {x,y} = getXY(e); pointerDown(e,x,y); });
    window.addEventListener('mousemove', e => { if (!state.panning) { const {x,y} = getXY(e); pointerMove(x,y); } });
    window.addEventListener('mouseup',   e => { const {x,y} = getXY(e); pointerUp(x,y); });

    // Touch
    canvas.addEventListener('touchstart', e => { const {x,y} = getXY(e); pointerDown(e,x,y); });
    canvas.addEventListener('touchmove',  e => { const {x,y} = getXY(e); pointerMove(x,y); e.preventDefault(); }, { passive:false });
    canvas.addEventListener('touchend',   e => { const touch = (e.changedTouches && e.changedTouches[0]) || e; const {x,y} = getXY(touch); pointerUp(x,y); });

    // Text placing
    canvas.addEventListener('dblclick', e => {
      if (state.tool !== 'text') return; const {x,y} = getXY(e); createTextInput(x, y);
    });
    
    // Uložení tabule
    const saveBoardBtn = document.getElementById('saveBoardBtn');
    const boardNameInput = document.getElementById('boardNameInput');
    if (saveBoardBtn && boardNameInput) {
      saveBoardBtn.addEventListener('click', async () => {
        const name = boardNameInput.value.trim();
        const payload = {
          name: name || null,
          size_x: state.boardWidth,
          size_y: state.boardHeight,
          objects: state.canvasObjects
        };
        try {
          const resp = await fetch('/board/save-full', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await resp.json();
          if (data.success) {
            alert('Tabule byla úspěšně uložena! Název: ' + data.name);
            window.boardId = data.board_id;
          } else {
            alert('Chyba při ukládání: ' + (data.error || 'Neznámá chyba'));
          }
        } catch (e) {
          console.error(e);
          alert('Chyba komunikace se serverem.');
        }
      });
    }
    
    // Nová tabule
    const newBoardBtn = document.getElementById('newBoardBtn');
    if (newBoardBtn) {
      newBoardBtn.addEventListener('click', () => {
        if (confirm('Opravdu chcete vytvořit novou tabuli? Neuložené změny budou ztraceny.')) {
          location.reload();
        }
      });
    }

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
    if (clearBtn) clearBtn.addEventListener('click', () => {
      ctx.clearRect(0,0,canvas.width,canvas.height); snapshot();
      if (socket && state.boardId) socket.emit('board:clear', { boardId: state.boardId });
    });
    if (saveBtn) saveBtn.addEventListener('click', () => {
      try {
        // Export s bílým pozadím: složení canvas + overlay na dočasné plátno
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const exCtx = exportCanvas.getContext('2d');
        exCtx.fillStyle = '#ffffff';
        exCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        exCtx.drawImage(canvas, 0, 0);
        if (overlay) {
          exCtx.drawImage(overlay, 0, 0);
        }
        const dataUrl = exportCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'sketchwave.png';
        a.click();
      } catch (e) {
        console.error('Save failed', e);
      }
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
    setupCanvasSizeControls();
    setupZoomControls();
    setupPanControls();
    // Socket.IO klient
    if (typeof io !== 'undefined') {
      socket = io();
      window.SW_SOCKET = socket; // zpřístupnit pro jiné skripty

      // Remote draw point
      socket.on('draw:point', ({ x, y, color, lineWidth, from }) => {
        const prev = lastRemotePoint[from];
        const prevStrokeStyle = ctx.strokeStyle;
        const prevLineWidth = ctx.lineWidth;
        ctx.strokeStyle = color || '#22223b';
        ctx.lineWidth = lineWidth || 2;
        if (prev) {
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        lastRemotePoint[from] = { x, y };
        ctx.strokeStyle = prevStrokeStyle;
        ctx.lineWidth = prevLineWidth;
      });

      socket.on('draw:stroke:end', ({ from }) => {
        delete lastRemotePoint[from];
      });

      socket.on('shape:add', ({ shape, x, y, w, h, color, lineWidth }) => {
        const prevStrokeStyle = ctx.strokeStyle;
        const prevLineWidth = ctx.lineWidth;
        ctx.strokeStyle = color || '#22223b';
        ctx.lineWidth = lineWidth || 2;
        if (shape === 'rect') {
          ctx.strokeRect(x, y, w, h);
          state.canvasObjects.push({ type: 'rect', x, y, width: w, height: h, color: ctx.strokeStyle });
        } else if (shape === 'circle') {
          ctx.beginPath(); ctx.arc(x, y, w, 0, Math.PI*2); ctx.stroke();
          state.canvasObjects.push({ type: 'circle', x, y, width: w, color: ctx.strokeStyle });
        } else if (shape === 'line') {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.stroke();
          state.canvasObjects.push({ type: 'line', x, y, width: w, height: h, color: ctx.strokeStyle });
        }
        ctx.strokeStyle = prevStrokeStyle;
        ctx.lineWidth = prevLineWidth;
      });

      socket.on('text:add', ({ x, y, text, color, fontSize }) => {
        const prevFill = ctx.fillStyle;
        const prevFont = ctx.font;
        ctx.fillStyle = color || '#22223b';
        ctx.font = `${fontSize || 16}px Inter, system-ui, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(text, x, y);
        state.canvasObjects.push({ type: 'text', x, y, color: ctx.fillStyle, fontSize: fontSize || 16, content: text });
        ctx.fillStyle = prevFill;
        ctx.font = prevFont;
      });

      socket.on('board:clear', () => {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        snapshot();
      });
    }
  }

  // Ovládání změny velikosti plátna
  function setupCanvasSizeControls() {
    const wInput = document.getElementById('canvasWidthInput');
    const hInput = document.getElementById('canvasHeightInput');
    const applyBtn = document.getElementById('applyCanvasSize');
    const presetButtons = document.querySelectorAll('.preset-size');
    if (!wInput || !hInput || !applyBtn) return;

    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const w = parseInt(btn.getAttribute('data-w'), 10);
        const h = parseInt(btn.getAttribute('data-h'), 10);
        wInput.value = w;
        hInput.value = h;
        resizeBoard(w, h);
      });
    });

    applyBtn.addEventListener('click', () => {
      const w = parseInt(wInput.value, 10);
      const h = parseInt(hInput.value, 10);
      resizeBoard(w, h);
    });
  }

  function resizeBoard(newW, newH) {
    const min = 300, max = 4000;
    if (!Number.isFinite(newW) || !Number.isFinite(newH)) return;
    const w = Math.min(Math.max(newW, min), max);
    const h = Math.min(Math.max(newH, min), max);
    // uložit starý obsah
    const oldImage = canvas.toDataURL('image/png');
    state.boardWidth = w;
    state.boardHeight = h;
    sizeCanvas();
    updateZoomTransform();
    // pokus o zachování poměru stran: scale starý obsah doprostřed
    const img = new Image();
    img.onload = () => {
      const scaleX = w / img.width;
      const scaleY = h / img.height;
      const scale = Math.min(scaleX, scaleY);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const offsetX = (w - drawW) / 2;
      const offsetY = (h - drawH) / 2;
      ctx.clearRect(0,0,w,h);
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      snapshot();
      state._lastImage = canvas.toDataURL('image/png');
    };
    img.src = oldImage;
  }

  // Zoom ovládání
  function setupZoomControls() {
    const zoomRange = document.getElementById('zoomRange');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomLabel = document.getElementById('zoomLabel');
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    const fitBtn = document.getElementById('fitZoomBtn');
    if (!zoomRange || !zoomInBtn || !zoomOutBtn || !zoomLabel || !resetZoomBtn) return;

    function applyZoomValue(val) {
      const pct = Math.min(300, Math.max(10, val));
      state.zoom = pct / 100;
      zoomRange.value = pct;
      zoomLabel.textContent = pct + '%';
      updateZoomTransform();
    }

    zoomRange.addEventListener('input', e => applyZoomValue(parseInt(e.target.value, 10)));
    zoomInBtn.addEventListener('click', () => applyZoomValue(parseInt(zoomRange.value, 10) + 10));
    zoomOutBtn.addEventListener('click', () => applyZoomValue(parseInt(zoomRange.value, 10) - 10));
    resetZoomBtn.addEventListener('click', () => applyZoomValue(100));
    if (fitBtn) fitBtn.addEventListener('click', () => {
      if (!scrollHost) return;
      const availW = scrollHost.clientWidth - 16; // padding margin allowance
      const availH = scrollHost.clientHeight - 16;
      const scale = Math.min(availW / state.boardWidth, availH / state.boardHeight);
      applyZoomValue(Math.round(scale * 100));
    });
    updateZoomTransform();
  }

  function updateZoomTransform() {
    if (!inner) return;
    inner.style.transform = `scale(${state.zoom})`;
  }

  // Panning pravým tlačítkem myši
  function setupPanControls() {
    if (!scrollHost || !inner) return;
    let startX = 0, startY = 0, startScrollLeft = 0, startScrollTop = 0;

    inner.addEventListener('contextmenu', e => { e.preventDefault(); });

    inner.addEventListener('mousedown', e => {
      if (e.button === 2) { // right button
        state.panning = true;
        startX = e.clientX; startY = e.clientY;
        startScrollLeft = scrollHost.scrollLeft;
        startScrollTop = scrollHost.scrollTop;
        inner.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('mousemove', e => {
      if (!state.panning) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      scrollHost.scrollLeft = startScrollLeft - dx;
      scrollHost.scrollTop = startScrollTop - dy;
    });

    window.addEventListener('mouseup', e => {
      if (state.panning && e.button === 2) {
        state.panning = false;
        inner.style.cursor = 'default';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  // Načítání tabule (vykreslení dat z backendu)
  window.addEventListener('loadBoardData', (e) => {
    const data = e.detail;
    if (!data || !data.board || !Array.isArray(data.objects)) return;

    // Nastav aktuální board a připoj se do místnosti
    state.boardId = data.board.id;
    if (socket && state.boardId) socket.emit('board:join', { boardId: state.boardId });

    // Reset plátna
    ctx.clearRect(0, 0, state.boardWidth, state.boardHeight);
    state.canvasObjects = [];
    state.undoStack = [];
    state.redoStack = [];
    state._lastImage = null;

    // Případná změna velikosti plátna dle tabule
    if (Number.isFinite(data.board.size_x) && Number.isFinite(data.board.size_y)) {
      state.boardWidth = data.board.size_x;
      state.boardHeight = data.board.size_y;
      sizeCanvas();
    }

    // Vykreslení objektů
    data.objects.forEach((obj) => {
      try {
        const type = obj.type;
        const color = obj.color || '#000000';
        const x = obj.x || 0;
        const y = obj.y || 0;
        const w = obj.width || 0;
        const h = obj.height || 0;
        let content = null;
        if (obj.content) {
          try { content = JSON.parse(obj.content); } catch { content = obj.content; }
        }

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        if (type === 'rect') {
          ctx.strokeRect(x, y, w, h);
          state.canvasObjects.push({ type, x, y, width: w, height: h, color });
        } else if (type === 'circle') {
          const r = w; // width jako radius
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.stroke();
          state.canvasObjects.push({ type, x, y, width: r, height: r, color });
        } else if (type === 'line') {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.stroke();
          state.canvasObjects.push({ type, x, y, width: w, height: h, color });
        } else if (type === 'draw') {
          const points = content && content.points ? content.points : [];
          const lw = content && content.lineWidth ? content.lineWidth : 2;
          ctx.lineWidth = lw;
          ctx.beginPath();
          points.forEach((p, idx) => { if (idx === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
          ctx.stroke();
          state.canvasObjects.push({ type, color, lineWidth: lw, points });
        } else if (type === 'text') {
          const text = content && content.text ? content.text : '';
          const fontSize = content && content.fontSize ? content.fontSize : 16;
          ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
          ctx.textBaseline = 'top';
          ctx.fillText(text, x, y);
          state.canvasObjects.push({ type, x, y, color, content: { text, fontSize } });
        }
        ctx.restore();
      } catch { /* ignoruj chybu jednoho objektu */ }
    });
    snapshot();
  });
 })();
