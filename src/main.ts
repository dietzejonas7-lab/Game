// ===========================================================================
// Startpunkt des Spiels.
// ===========================================================================
import { SAVE_KEY, UPDATE_CHECK_MINUTES } from './config';
import { checkForUpdate, loadContent } from './content/loader';
import { Engine } from './engine/engine';
import { loadSave } from './engine/state';
import { storage } from './platform/platform';
import { App } from './ui/app';
import { toast } from './ui/dom';
import './styles.css';

async function start() {
  const root = document.getElementById('app')!;
  const loading = document.getElementById('loading');
  try {
    const { content, source } = await loadContent();
    const save = loadSave(await storage.get(SAVE_KEY));
    const engine = new Engine(content, save);
    const app = new App(engine);
    // Zeit nachholen, in der die App geschlossen war
    const offline = engine.catchUp();
    app.contentSource = source;
    app.mount(root);
    loading?.remove();
    void app.greet(offline);

    // Regelmäßig (und beim Zurückkehren in die App) nach neuen Inhalten schauen
    const check = async () => {
      const fresh = await checkForUpdate(engine.content.contentVersion);
      if (fresh) {
        engine.setContent(fresh);
        app.contentSource = 'online';
        app.refresh();
        toast('✨ Neue Inhalte geladen!');
      }
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void app.resume();
        void check();
      } else void app.save();
    });
    window.addEventListener('pagehide', () => void app.save());
    setInterval(check, UPDATE_CHECK_MINUTES * 60_000);
  } catch (e) {
    console.error(e);
    if (loading) loading.textContent = 'Fehler beim Laden 😢 ' + (e as Error).message;
  }
}

void start();
