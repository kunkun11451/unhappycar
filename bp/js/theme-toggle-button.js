// Single-button theme toggle (sun <-> moon)
(function(){
  const STORAGE_KEY = 'avatarTheme';
  const ROOT_CLASS = 'theme-light';

  function getSavedTheme(){
    try{ const s = localStorage.getItem(STORAGE_KEY); if (s === 'light' || s === 'dark') return s; }catch{}
    return null;
  }
  function saveTheme(t){ try{ localStorage.setItem(STORAGE_KEY, t); }catch{} }

  function applyTheme(theme){
    if (theme === 'light') document.body.classList.add(ROOT_CLASS);
    else document.body.classList.remove(ROOT_CLASS);
    const btn = document.querySelector('.theme-toggle-button');
    if (btn){
      btn.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      btn.setAttribute('aria-label', theme === 'light' ? '切换到深色模式' : '切换到浅色模式');
    }
  }

  function createButton(){
    const wrapper = document.createElement('div');
    wrapper.className = 'theme-toggle-btn';

    const label = document.createElement('label');
    label.setAttribute('for', 'themeToggle');
    label.className = 'themeToggle st-sunMoonThemeToggleBtn';
    label.setAttribute('type', 'checkbox');

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = 'themeToggle';
    input.className = 'themeToggleInput';

    // SVG markup
    const svgHtml = `
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" stroke="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="moon-mask">
          <rect x="0" y="0" width="20" height="20" fill="white"></rect>
          <circle cx="11" cy="3" r="8" fill="black"></circle>
        </mask>
        <circle class="sunMoon" cx="10" cy="10" r="8" mask="url(#moon-mask)"></circle>
        <g>
          <circle class="sunRay sunRay1" cx="18" cy="10" r="1.5"></circle>
          <circle class="sunRay sunRay2" cx="14" cy="16.928" r="1.5"></circle>
          <circle class="sunRay sunRay3" cx="6" cy="16.928" r="1.5"></circle>
          <circle class="sunRay sunRay4" cx="2" cy="10" r="1.5"></circle>
          <circle class="sunRay sunRay5" cx="6" cy="3.1718" r="1.5"></circle>
          <circle class="sunRay sunRay6" cx="14" cy="3.1718" r="1.5"></circle>
        </g>
      </svg>
    `;

    label.appendChild(input);
    // insert svg as HTML
    const span = document.createElement('span');
    span.innerHTML = svgHtml;
    label.appendChild(span.firstElementChild);

    // wire checkbox => theme
    label.addEventListener('click', (e) => {
      e.preventDefault();
      input.checked = !input.checked;
      const isLight = input.checked;
      const nextTheme = isLight ? 'light' : 'dark';

      if (!document.startViewTransition) {
        applyTheme(nextTheme);
        saveTheme(nextTheme);
        try { window.dispatchEvent(new CustomEvent('avatarThemeChanged', { detail: { theme: nextTheme } })); } catch {}
        return;
      }

      const transition = document.startViewTransition(() => {
        applyTheme(nextTheme);
      });

      transition.ready.then(() => {
        const x = e.clientX;
        const y = e.clientY;
        const endRadius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y)
        );

        document.documentElement.animate(
          {
            clipPath: [
              `circle(0 at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`
            ],
          },
          {
            duration: 500,
            easing: 'ease-in-out',
            pseudoElement: '::view-transition-new(root)',
          }
        );
      });
      
      saveTheme(nextTheme);
      try { window.dispatchEvent(new CustomEvent('avatarThemeChanged', { detail: { theme: nextTheme } })); } catch {}
    });
    
    input.addEventListener('change', (e) => {
      e.preventDefault();
    });

    wrapper.appendChild(label);

    // Sync input initial state with theme
    const currentTheme = document.body.classList.contains(ROOT_CLASS) ? 'light' : 'dark';
    input.checked = currentTheme === 'light';

    return wrapper;
  }

  function init(){
    const saved = getSavedTheme();
    const preferred = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    applyTheme(preferred);

    const header = document.querySelector('.app-header .container') || document.querySelector('.app-header');
    if (!header) return;
    if (document.querySelector('.theme-toggle-btn')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'theme-toggle-btn';
    wrapper.appendChild(createButton());
    header.style.position = header.style.position || 'relative';
    header.appendChild(wrapper);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();

})();
