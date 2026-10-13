/* p5.neon addon adapter — MIT. Load after p5.js and p5.neon.js. */
(function (root) {
  'use strict';

  function install(P5, fn, lifecycles) {
    const own = function (instance, key) {
      if (!instance[key]) instance[key] = new Set();
      return instance[key];
    };

    fn.createNeonTracker = function (options = {}) {
      if (!root.NeonP5) throw new Error('Load p5.neon.js before p5.neon-addon.js.');
      const tracker = new root.NeonP5(options);
      own(this, '_p5NeonTrackers').add(tracker);
      return tracker;
    };

    fn.createNeonControls = function (tracker, options = {}) {
      if (!tracker || typeof tracker.connect !== 'function' || typeof tracker.useMouse !== 'function') {
        throw new Error('Pass a tracker created by createNeonTracker().');
      }
      const doc = root.document;
      if (!doc?.createElement) throw new Error('Neon controls need a browser document.');
      const parentOption = options.parent;
      const parent = typeof parentOption === 'string' ? doc.querySelector(parentOption) : parentOption;
      const sketch = this;
      const host = parent || canvas?.parentElement || doc.body;
      if (!host?.appendChild) throw new Error('Provide a valid controls parent element.');

      const panel = doc.createElement('section');
      panel.className = 'p5-neon-controls';
      Object.assign(panel.style, { display: 'grid', gap: '8px', margin: '8px 0', maxWidth: '100%' });
      const codeLabel = doc.createElement('label');
      codeLabel.textContent = 'Pairing code';
      Object.assign(codeLabel.style, { display: 'grid', gap: '4px', font: '14px sans-serif' });
      const code = doc.createElement('input');
      code.type = 'password'; code.autocomplete = 'off'; code.spellcheck = false;
      code.placeholder = 'Paste code from your running connector';
      Object.assign(code.style, { boxSizing: 'border-box', width: '100%', padding: '8px' });
      codeLabel.appendChild(code);
      const portLabel = doc.createElement('label');
      portLabel.textContent = 'Connector port';
      Object.assign(portLabel.style, { display: 'grid', gap: '4px', font: '14px sans-serif' });
      const port = doc.createElement('input');
      port.type = 'number'; port.min = '1024'; port.max = '65535';
      port.value = String(options.port || 8766); portLabel.appendChild(port);
      Object.assign(port.style, { boxSizing: 'border-box', width: '100%', padding: '8px' });
      const connect = doc.createElement('button');
      connect.type = 'button'; connect.textContent = options.connectLabel || 'Connect Neon';
      Object.assign(connect.style, { padding: '9px', cursor: 'pointer' });
      const mouse = doc.createElement('button');
      mouse.type = 'button'; mouse.textContent = options.mouseLabel || 'Use mouse';
      Object.assign(mouse.style, { padding: '9px', cursor: 'pointer' });
      const status = doc.createElement('output');
      status.setAttribute('aria-live', 'polite');
      status.textContent = 'Not connected. Mouse mode is available for testing.';
      Object.assign(status.style, { minHeight: '2.5em', font: '12px/1.4 sans-serif' });
      panel.append(codeLabel, portLabel, connect, mouse, status);
      host.appendChild(panel);

      const listeners = new AbortController();
      connect.addEventListener('click', async () => {
        status.textContent = 'Connecting…';
        try {
          await tracker.connect({ code: code.value.trim(), port: Number(port.value) });
          status.textContent = 'Connector paired. Waiting for valid gaze data.';
        } catch (error) { status.textContent = error.message; }
      }, { signal: listeners.signal });
      mouse.addEventListener('click', () => {
        try { tracker.useMouse(sketch._renderer?.canvas); status.textContent = 'Mouse simulation · no biometric data'; }
        catch (error) { status.textContent = error.message; }
      }, { signal: listeners.signal });
      const offStatus = tracker.on('status', message => { status.textContent = message; });
      const offError = tracker.on('error', message => { status.textContent = message; });
      let disposed = false;
      const dispose = () => {
        if (disposed) return;
        disposed = true; listeners.abort(); offStatus(); offError(); panel.remove();
        this._p5NeonPanels?.delete(dispose);
      };
      own(this, '_p5NeonPanels').add(dispose);
      return { element: panel, dispose };
    };

    const disposeTrackers = function () {
      for (const dispose of this._p5NeonPanels || []) dispose();
      for (const tracker of this._p5NeonTrackers || []) tracker.dispose();
      this._p5NeonPanels?.clear(); this._p5NeonTrackers?.clear();
    };

    if (lifecycles) {
      lifecycles.remove = disposeTrackers;
    } else if (P5.prototype.registerMethod) {
      P5.prototype.registerMethod('remove', disposeTrackers);
    }
  }

  const P5 = root.p5;
  if (!P5) throw new Error('Load p5.js before p5.neon-addon.js.');

  if (typeof P5.registerAddon === 'function') {
    P5.registerAddon(install);
  } else {
    // p5.js 1.x compatibility; registerMethod is the supported lifecycle hook there.
    install(P5, P5.prototype, null);
  }

  root.p5NeonAddon = install;
})(typeof window !== 'undefined' ? window : globalThis);
