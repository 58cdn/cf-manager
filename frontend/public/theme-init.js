// Run before the application and styles load. Preferences never depend on credentials.
(function () {
  var root = document.documentElement;
  var style = 'default';
  var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  try {
    if (localStorage.getItem('cf-manager.ui-theme') === 'verdant') style = 'verdant';
    var saved = localStorage.getItem('darkMode');
    if (saved === 'true' || saved === 'false') dark = saved === 'true';
  } catch {
    root.dataset.preferenceStorage = 'unavailable';
  }
  root.dataset.uiTheme = style;
  root.classList.toggle('app-dark', dark);
  if (style === 'verdant') root.style.backgroundColor = dark ? '#111827' : '#f5f7f9';
})();
