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
    undoObjectsStack: [], // paralelní stack pro canvasObjects
    redoObjectsStack: [], // paralelní stack pro canvasObjects (redo)
    maxSnapshots: 30,
    points: [],
    boardWidth: 1280,
    boardHeight: 720,
    zoom: 1,
    panning: false,
    userId: Number.isFinite(window.SW_CURRENT_USER_ID) ? window.SW_CURRENT_USER_ID : null,
    actorKey: null,
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
  const remotePaths = {}; // map socketId -> {points:[], color, lineWidth}
  let autosaveTimer = null;
  const AUTOSAVE_DELAY = 1500; // ms

  if (state.userId !== null) {
    state.actorKey = `user:${state.userId}`;
  } else {
    const storedActorKey = window.sessionStorage.getItem('sketchwave-actor-key');
    state.actorKey = storedActorKey || `guest:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem('sketchwave-actor-key', state.actorKey);
  }

  function cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getOwnActorKey() {
    return state.userId !== null ? `user:${state.userId}` : state.actorKey;
  }

  function getObjectActorKey(obj) {
    if (Number.isFinite(obj.createdBy)) return `user:${obj.createdBy}`;
    return obj.actorKey || null;
  }

  function isOwnObject(obj) {
    if (!obj) return false;
    return getObjectActorKey(obj) === getOwnActorKey();
  }

  function createLocalObject(data) {
    return {
      ...data,
      createdBy: state.userId,
      actorKey: state.actorKey
    };
  }

  function drawCanvasObject(obj) {
    if (!obj || !obj.type) return;
    const type = obj.type;
    const color = obj.color || '#000000';
    const x = Number.isFinite(obj.x) ? obj.x : 0;
    const y = Number.isFinite(obj.y) ? obj.y : 0;
    const w = Number.isFinite(obj.width) ? obj.width : 0;
    const h = Number.isFinite(obj.height) ? obj.height : 0;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'rect') {
      ctx.lineWidth = obj.lineWidth || 2;
      ctx.strokeRect(x, y, w, h);
    } else if (type === 'circle') {
      ctx.lineWidth = obj.lineWidth || 2;
      ctx.beginPath();
      ctx.arc(x, y, w, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === 'line') {
      ctx.lineWidth = obj.lineWidth || 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
      ctx.stroke();
    } else if (type === 'draw') {
      const points = Array.isArray(obj.points) ? obj.points : [];
      ctx.lineWidth = obj.lineWidth || 2;
      if (points.length >= 2) {
        ctx.beginPath();
        points.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      }
    } else if (type === 'text') {
      const fontSize = obj.fontSize || (obj.content && obj.content.fontSize) || 16;
      const text = typeof obj.content === 'string' ? obj.content : ((obj.content && obj.content.text) || obj.text || '');
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(text, x, y);
    }

    ctx.restore();
  }

  function redrawCanvas() {
    ctx.clearRect(0, 0, state.boardWidth, state.boardHeight);
    state.canvasObjects.forEach(drawCanvasObject);
    state._lastImage = canvas.toDataURL('image/png');
  }

  function addCanvasObject(obj, options = {}) {
    state.canvasObjects.push(cloneObject(obj));
    if (options.clearRedo !== false) state.redoStack = [];
  }

  function buildBoardQuery() {
    return window.SHARE_TOKEN ? `?share=${encodeURIComponent(window.SHARE_TOKEN)}` : '';
  }

  function scheduleAutosave() {
    if (!state.boardId) return;
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(runAutosave, AUTOSAVE_DELAY);
  }

  async function runAutosave() {
    autosaveTimer = null;
    if (!state.boardId) return;
    try {
      const payload = {
        size_x: state.boardWidth,
        size_y: state.boardHeight,
        objects: state.canvasObjects
      };
      await fetch(`/board/${state.boardId}/autosave${buildBoardQuery()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('Autosave selhal', e);
    }
  }

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
    redrawCanvas();
  }

  function snapshot() {
    try {
      state.undoStack.push(canvas.toDataURL('image/png'));
      state.undoObjectsStack.push(JSON.parse(JSON.stringify(state.canvasObjects)));
      if (state.undoStack.length > state.maxSnapshots) {
        state.undoStack.shift();
        state.undoObjectsStack.shift();
      }
      state.redoStack = [];
      state.redoObjectsStack = [];
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
    if ((typeof e.button === 'number' && e.button !== 0) || state.panning) return;
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
        const rectObject = createLocalObject({ type: 'rect', x: state.startX, y: state.startY, width: w, height: h, color: state.color, lineWidth: state.lineWidth });
        addCanvasObject(rectObject);
        if (socket && state.boardId) socket.emit('shape:add', { boardId: state.boardId, shape: 'rect', x: state.startX, y: state.startY, w, h, color: state.color, lineWidth: state.lineWidth, createdBy: rectObject.createdBy, actorKey: rectObject.actorKey });
      } else if (state.shape === 'circle') {
        const r = Math.hypot(w, h);
        ctx.beginPath(); ctx.arc(state.startX, state.startY, r, 0, Math.PI*2); ctx.stroke();
        const circleObject = createLocalObject({ type: 'circle', x: state.startX, y: state.startY, width: r, color: state.color, lineWidth: state.lineWidth });
        addCanvasObject(circleObject);
        if (socket && state.boardId) socket.emit('shape:add', { boardId: state.boardId, shape: 'circle', x: state.startX, y: state.startY, w: r, h: r, color: state.color, lineWidth: state.lineWidth, createdBy: circleObject.createdBy, actorKey: circleObject.actorKey });
      } else if (state.shape === 'line') {
        ctx.beginPath(); ctx.moveTo(state.startX, state.startY); ctx.lineTo(x, y); ctx.stroke();
        const dx = x - state.startX; const dy = y - state.startY;
        const lineObject = createLocalObject({ type: 'line', x: state.startX, y: state.startY, width: dx, height: dy, color: state.color, lineWidth: state.lineWidth });
        addCanvasObject(lineObject);
        if (socket && state.boardId) socket.emit('shape:add', { boardId: state.boardId, shape: 'line', x: state.startX, y: state.startY, w: dx, h: dy, color: state.color, lineWidth: state.lineWidth, createdBy: lineObject.createdBy, actorKey: lineObject.actorKey });
      }
      // restore
      state.color = prevColor; state.lineWidth = prevLine; setStyle();
      clearOverlay();
      scheduleAutosave();
    } else if (state.tool === 'draw') {
      const pts = state.points;
      if (pts.length >= 2) {
        const last = pts[pts.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
        const drawObject = createLocalObject({ type: 'draw', color: state.color, lineWidth: state.lineWidth, points: [...pts] });
        addCanvasObject(drawObject);
      }
      state.points = [];
      if (socket && state.boardId) socket.emit('draw:stroke:end', { boardId: state.boardId });
    }
    state._lastImage = canvas.toDataURL('image/png');
    scheduleAutosave();
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
          const textObject = createLocalObject({ type: 'text', x, y, color: textColor, fontSize, content: textValue });
          addCanvasObject(textObject);
          if (socket && state.boardId) socket.emit('text:add', { boardId: state.boardId, x, y, text: textValue, color: textColor, fontSize, createdBy: textObject.createdBy, actorKey: textObject.actorKey });
          input.remove();
          // restore previous
          state.color = prevColor; state.lineWidth = prevLine; setStyle();
          scheduleAutosave();
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
            // Nastavit board ID a připojit se do room pro sdílenou session
            state.boardId = data.board_id;
            if (socket && state.boardId) {
              socket.emit('board:join', { boardId: state.boardId, share: window.SHARE_TOKEN || null });
            }
            // Aktualizovat název v inputu, pokud byl vygenerován
            if (data.name && !boardNameInput.value.trim()) {
              boardNameInput.value = data.name;
            }
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
      let targetIndex = -1;
      for (let i = state.canvasObjects.length - 1; i >= 0; i -= 1) {
        if (isOwnObject(state.canvasObjects[i])) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex === -1) return;
      const [removed] = state.canvasObjects.splice(targetIndex, 1);
      state.redoStack.push({ object: cloneObject(removed), index: targetIndex });
      redrawCanvas();
      await runAutosave();
      if (socket && state.boardId) {
        socket.emit('board:sync', { boardId: state.boardId });
      }
    });
    if (redoBtn) redoBtn.addEventListener('click', async () => {
      if (!state.redoStack.length) return;
      const redoEntry = state.redoStack.pop();
      const insertIndex = Math.min(redoEntry.index, state.canvasObjects.length);
      state.canvasObjects.splice(insertIndex, 0, cloneObject(redoEntry.object));
      redrawCanvas();
      await runAutosave();
      if (socket && state.boardId) {
        socket.emit('board:sync', { boardId: state.boardId });
      }
    });
    if (clearBtn) clearBtn.addEventListener('click', () => {
      ctx.clearRect(0,0,canvas.width,canvas.height); snapshot();
      state.canvasObjects = [];
      state.redoStack = [];
      if (socket && state.boardId) socket.emit('board:clear', { boardId: state.boardId });
      scheduleAutosave();
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
    // Socket.IO klient - použij existující nebo vytvoř nový
    if (typeof io !== 'undefined') {
      socket = window.SW_SOCKET || io();
      window.SW_SOCKET = socket; // zpřístupnit pro jiné skripty

      // Remote draw point
      socket.on('draw:point', ({ x, y, color, lineWidth, from, createdBy, actorKey }) => {
        const prev = lastRemotePoint[from];
        const prevStrokeStyle = ctx.strokeStyle;
        const prevLineWidth = ctx.lineWidth;
        ctx.strokeStyle = color || '#22223b';
        ctx.lineWidth = lineWidth || 2;
        if (!remotePaths[from]) remotePaths[from] = { points: [], color: ctx.strokeStyle, lineWidth: ctx.lineWidth, createdBy: Number.isFinite(createdBy) ? createdBy : null, actorKey: actorKey || null };
        remotePaths[from].points.push({ x, y });
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
        if (remotePaths[from] && remotePaths[from].points.length) {
          addCanvasObject({ type: 'draw', color: remotePaths[from].color, lineWidth: remotePaths[from].lineWidth, points: [...remotePaths[from].points], createdBy: remotePaths[from].createdBy, actorKey: remotePaths[from].actorKey }, { clearRedo: false });
        }
        delete remotePaths[from];
      });

      socket.on('shape:add', ({ shape, x, y, w, h, color, lineWidth, createdBy, actorKey }) => {
        const prevStrokeStyle = ctx.strokeStyle;
        const prevLineWidth = ctx.lineWidth;
        ctx.strokeStyle = color || '#22223b';
        ctx.lineWidth = lineWidth || 2;
        if (shape === 'rect') {
          ctx.strokeRect(x, y, w, h);
          addCanvasObject({ type: 'rect', x, y, width: w, height: h, color: ctx.strokeStyle, lineWidth: ctx.lineWidth, createdBy: Number.isFinite(createdBy) ? createdBy : null, actorKey: actorKey || null }, { clearRedo: false });
        } else if (shape === 'circle') {
          ctx.beginPath(); ctx.arc(x, y, w, 0, Math.PI*2); ctx.stroke();
          addCanvasObject({ type: 'circle', x, y, width: w, color: ctx.strokeStyle, lineWidth: ctx.lineWidth, createdBy: Number.isFinite(createdBy) ? createdBy : null, actorKey: actorKey || null }, { clearRedo: false });
        } else if (shape === 'line') {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.stroke();
          addCanvasObject({ type: 'line', x, y, width: w, height: h, color: ctx.strokeStyle, lineWidth: ctx.lineWidth, createdBy: Number.isFinite(createdBy) ? createdBy : null, actorKey: actorKey || null }, { clearRedo: false });
        }
        ctx.strokeStyle = prevStrokeStyle;
        ctx.lineWidth = prevLineWidth;
      });

      socket.on('text:add', ({ x, y, text, color, fontSize, createdBy, actorKey }) => {
        const prevFill = ctx.fillStyle;
        const prevFont = ctx.font;
        ctx.fillStyle = color || '#22223b';
        ctx.font = `${fontSize || 16}px Inter, system-ui, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(text, x, y);
        addCanvasObject({ type: 'text', x, y, color: ctx.fillStyle, fontSize: fontSize || 16, content: text, createdBy: Number.isFinite(createdBy) ? createdBy : null, actorKey: actorKey || null }, { clearRedo: false });
        ctx.fillStyle = prevFill;
        ctx.font = prevFont;
      });

      socket.on('board:clear', () => {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        state.canvasObjects = [];
        state.redoStack = [];
      });

      // Board sync (např. po undo/redo) - znovu načíst data tabule
      socket.on('board:sync', async () => {
        if (!state.boardId) return;
        try {
          const resp = await fetch(`/board/${state.boardId}${buildBoardQuery()}`);
          const data = await resp.json();
          if (data.board && Array.isArray(data.objects)) {
            // Vykreslíme znovu celou tabuli
            window.dispatchEvent(new CustomEvent('loadBoardData', { detail: data }));
          }
        } catch (e) {
          console.warn('Sync failed', e);
        }
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
    state.boardWidth = w;
    state.boardHeight = h;
    sizeCanvas();
    updateZoomTransform();
    redrawCanvas();
    snapshot();
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
    if (socket && state.boardId) socket.emit('board:join', { boardId: state.boardId, share: window.SHARE_TOKEN || null });

    // Reset plátna
    ctx.clearRect(0, 0, state.boardWidth, state.boardHeight);
    state.canvasObjects = [];
    state.undoStack = [];
    state.redoStack = [];
    state.undoObjectsStack = [];
    state.redoObjectsStack = [];
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
        const createdBy = Number.isFinite(obj.created_by) ? obj.created_by : null;
        let content = null;
        if (obj.content) {
          try { content = JSON.parse(obj.content); } catch { content = obj.content; }
        }
        const actorKey = content && content.actorKey ? content.actorKey : null;
        if (type === 'rect') {
          const lw = (content && content.lineWidth) || 2;
          addCanvasObject({ type, x, y, width: w, height: h, color, lineWidth: lw, createdBy, actorKey }, { clearRedo: false });
        } else if (type === 'circle') {
          const r = w;
          const lw = (content && content.lineWidth) || 2;
          addCanvasObject({ type, x, y, width: r, height: r, color, lineWidth: lw, createdBy, actorKey }, { clearRedo: false });
        } else if (type === 'line') {
          const lw = (content && content.lineWidth) || 2;
          addCanvasObject({ type, x, y, width: w, height: h, color, lineWidth: lw, createdBy, actorKey }, { clearRedo: false });
        } else if (type === 'draw') {
          const points = content && content.points ? content.points : [];
          const lw = content && content.lineWidth ? content.lineWidth : 2;
          addCanvasObject({ type, color, lineWidth: lw, points, createdBy, actorKey }, { clearRedo: false });
        } else if (type === 'text') {
          const text = content && content.text ? content.text : '';
          const fontSize = content && content.fontSize ? content.fontSize : 16;
          addCanvasObject({ type, x, y, color, fontSize, content: text, createdBy, actorKey }, { clearRedo: false });
        }
      } catch { /* ignoruj chybu jednoho objektu */ }
    });
    redrawCanvas();
    snapshot();
  });
 })();
