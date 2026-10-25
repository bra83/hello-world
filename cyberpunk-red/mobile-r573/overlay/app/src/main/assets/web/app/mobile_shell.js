// Navigation and card hierarchy adapted from Braseiro Star Wars' scene-first UI.
// Existing nodes are moved, not cloned: their IDs, controllers and listeners survive.
export function installMobileShell() {
  if (document.body.dataset.mobileShell === '573') return;
  document.body.dataset.mobileShell = '573';
  const $ = selector => document.querySelector(selector);
  const fold = (label, nodes, parent, before = null, className = '') => {
    const items = nodes.filter(Boolean);
    if (!items.length || !parent) return null;
    const details = document.createElement('details');
    details.className = `mobile-fold ${className}`;
    const summary = document.createElement('summary');
    summary.textContent = label;
    details.append(summary);
    for (const node of items) details.append(node);
    parent.insertBefore(details, before);
    return details;
  };
  const nav = $('.bottom-nav');
  const sceneNav = nav?.querySelector('[data-tab="table"]');
  if (sceneNav) sceneNav.querySelector('span:last-child').textContent = 'CENA';
  const bagNav = nav?.querySelector('[data-tab="inventory"]');
  bagNav?.classList.add('secondary-tab', 'nav-target-only');
  bagNav?.setAttribute('tabindex', '-1');
  const combatNav = nav?.querySelector('[data-tab="combat"]');
  if (combatNav) {
    combatNav.classList.remove('secondary-tab', 'nav-target-only');
    combatNav.removeAttribute('tabindex');
    combatNav.innerHTML = '<span class="nav-glyph" aria-hidden="true">⌖</span><span>COMBATE</span>';
    nav.insertBefore(combatNav, $('#moreNavBtn'));
  }
  const home = $('#homeDashboard');
  if (home) {
    home.querySelector('.home-tagline')?.remove();
    home.querySelector('.home-quote')?.remove();
    fold('Sessão e atalhos', [home], $('.more-sheet-card'), $('.more-list'));
  }
  const master = $('.session-master-card');
  if (master) {
    const campaign = fold('Aventura · começar, continuar ou importar',
      [$('.adventure-start-controls'), $('.campaign-mini-actions'), $('#adventureImportDetails')],
      master, $('#tableNarrative'), 'mobile-campaign');
    // Put narration before setup forms, with the action composer immediately below it.
    const narration = $('#tableNarrative');
    if (narration) master.insertBefore(narration, campaign);
    const composer = $('.free-action-block');
    if (composer) master.insertBefore(composer, campaign);
    const tools = $('.session-tool-row');
    if (tools) master.insertBefore(tools, campaign);
    fold('Estado do personagem e ações sugeridas',
      [$('.session-player-state'), $('#sessionRecommended'), $('#sessionFlowGuide')], master);
  }
  const stack = $('#sessionLiveStack');
  if (stack && master) {
    stack.insertBefore(master, stack.querySelector('.session-npc-card'));
    const scene = $('.session-scene-card');
    if (scene) {
      const media = $('.scene-media-actions');
      fold('Imagem da cena · gerar ou importar', [media, $('#scenePrompt')], scene);
      const image = $('#sceneIllustration');
      const updateMedia = () => scene.classList.toggle('has-scene-image', !!image && !image.classList.contains('hidden') && !!image.getAttribute('src'));
      updateMedia();
      if (image) new MutationObserver(updateMedia).observe(image, {attributes:true,attributeFilter:['src','class']});
    }
  }
  const dice=$('#tableDiceBtn');
  if(dice){dice.removeAttribute('hidden');dice.classList.remove('hidden');dice.textContent='Dados';$('.session-tool-row')?.append(dice);}
  const updatePanel = $('#inAppUpdaterPanel');
  if (updatePanel) fold('Atualizações do aplicativo', [updatePanel], $('#tab-audio'));
  // Technical interchange belongs in advanced tools, keeping the normal update flow clear.
  const manual = $('#updatePackageJsonInput');
  if (manual) fold('Pacote manual · avançado', [manual, $('#applyUpdateBtn')], updatePanel);
  for (const details of document.querySelectorAll('#tab-audio > .mobile-fold')) details.open = false;
  const menu = $('#moreNavBtn');
  const close = $('#moreSheetClose');
  menu?.addEventListener('click', () => menu.setAttribute('aria-expanded', 'true'));
  close?.addEventListener('click', () => menu?.setAttribute('aria-expanded', 'false'));
  document.querySelectorAll('[data-open-tab], #moreHomeBtn').forEach(button =>
    button.addEventListener('click', () => menu?.setAttribute('aria-expanded', 'false')));
}
