/* Tema oscuro por defecto; se recuerda la elección clara u oscura en este navegador. */
(()=>{
  const KEY='tema', root=document.documentElement;
  const saved=()=>{try{return localStorage.getItem(KEY)==='light'?'light':'dark'}catch{return 'dark'}};
  const apply=theme=>{
    root.setAttribute('data-theme',theme);
    const button=document.querySelector('[data-theme-toggle]');
    if(button){
      const isLight=theme==='light';
      button.setAttribute('aria-pressed',String(isLight));
      button.setAttribute('aria-label',`Cambiar a tema ${isLight?'oscuro':'claro'}`);
    }
  };
  apply(saved()); // antes de dibujar la página, para evitar un destello del tema equivocado
  document.addEventListener('DOMContentLoaded',()=>{
    apply(saved());
    document.querySelector('[data-theme-switch]').addEventListener('click',()=>{
      const theme=root.dataset.theme==='light'?'dark':'light';
      try{localStorage.setItem(KEY,theme)}catch{}
      apply(theme);
    });
  });
})();
