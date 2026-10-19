// Mini-Werkzeuge, um HTML-Elemente zu bauen und Fenster anzuzeigen.

type Attrs = Record<string, string | number | boolean | EventListener | undefined>;
type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (k === 'html') el.innerHTML = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el: HTMLElement) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Ein Fenster über dem Spiel. Gibt eine Funktion zum Schließen zurück. */
export function modal(content: HTMLElement, opts: { onClose?: () => void; dismissable?: boolean; className?: string } = {}) {
  const root = document.getElementById('overlay-root')!;
  const close = () => {
    wrap.classList.add('closing');
    setTimeout(() => wrap.remove(), 180);
    opts.onClose?.();
  };
  const wrap = h('div', { class: 'modal-wrap' }, h('div', { class: 'modal ' + (opts.className ?? '') }, content));
  if (opts.dismissable !== false) {
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) close();
    });
  }
  root.append(wrap);
  return close;
}

export function confirmDialog(title: string, text: string, okLabel = 'OK', cancelLabel = 'Abbrechen'): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: boolean) => {
      if (done) return;
      done = true;
      resolve(v);
      close();
    };
    const close = modal(
      h('div', { class: 'dialog' },
        h('h2', {}, title),
        h('p', { class: 'pre' }, text),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', onclick: () => finish(false) }, cancelLabel),
          h('button', { class: 'btn', onclick: () => finish(true) }, okLabel),
        ),
      ),
      { onClose: () => finish(false) },
    );
  });
}

let toastTimer = 0;
export function toast(text: string) {
  const root = document.getElementById('toast')!;
  root.textContent = text;
  root.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => root.classList.remove('show'), 2200);
}
