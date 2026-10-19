// ===========================================================================
// Startpunkt des Spiels.
// ===========================================================================
import { UPDATE_CHECK_MINUTES } from './config';
import { checkForUpdate, loadContent } from './content/loader';
import { Game } from './game/game';
import { App } from './ui/app';
import { toast } from './ui/dom';
import { showGallery } from './ui/gallery';
import './styles.css';

async function start() {
  const root = document.getElementById('app')!;
  const loading = document.getElementById('loading');
  try {
    const { content, source } = await loadContent();
    if (location.hash === '#galerie') {
      loading?.remove();
      showGallery(root, content);
      return;
    }
    const game = new Game();
    await game.init(content);
    const app = new App(game);
    app.contentSource = source;
    app.mount(root);
    loading?.remove();

    // Regelmäßig (und beim Zurückkehren in die App) nach neuen Inhalten schauen
    const check = async () => {
      const fresh = await checkForUpdate(game.content.contentVersion);
      if (fresh) {
        game.updateContent(fresh);
        app.contentSource = 'online';
        app.refresh();
        toast('✨ Neue Inhalte geladen!');
      }
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void check();
      else void game.persist();
    });
    setInterval(check, UPDATE_CHECK_MINUTES * 60_000);
  } catch (e) {
    console.error(e);
    if (loading) loading.textContent = 'Fehler beim Laden 😢 ' + (e as Error).message;
  }
}

void start();
