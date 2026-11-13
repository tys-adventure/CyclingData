// The browser decides eligibility. Manual setup remains available at all times.
export function setupInstallPrompt(window, document, standalone) {
 let prompt = null, busy = false, installed = standalone;
 const buttons = [...document.querySelectorAll('[data-native-install]')];
 const statuses = [...document.querySelectorAll('[data-install-status]')];
 function message(text) { statuses.forEach(node => { node.textContent = text; }); }
 function render() {
  buttons.forEach(button => { button.hidden = installed || !prompt; button.disabled = busy; });
  document.querySelectorAll('[data-installed-status]').forEach(node => { node.hidden = !installed; });
  document.documentElement.classList.toggle('installed-app', installed);
 }
 window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  if (installed || busy) return;
  prompt = event;
  message('Your browser can install RideVector directly. Or follow the device steps below.');
  render();
 });
 buttons.forEach(button => button.addEventListener('click', async () => {
  if (!prompt || busy || installed) return;
  const current = prompt;
  busy = true; render();
  try {
   await current.prompt();
   const choice = await current.userChoice;
   if (!installed) message(choice.outcome === 'accepted'
    ? 'Finish the browser’s installation steps, then look for RideVector in your apps.'
    : 'Install whenever you’re ready. You can still use the browser menu steps below.');
  } catch {
   if (!installed) message('The install prompt could not open. Use the browser menu steps below, or reopen this page in Chrome.');
  } finally {
   // A browser install event can only be prompted once, including after dismissal.
   prompt = null; busy = false; render();
  }
 }));
 window.addEventListener('appinstalled', () => {
  installed = true; prompt = null;
  message('RideVector is installed. Open it from your Home Screen or app launcher.');
  render();
 });
 render();
}
