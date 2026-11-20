/* Corbeau — configuration et petits outils communs.
   La clé « publishable » est faite pour être publique. Ne mets JAMAIS ici la clé « secret » ou « service_role ». */
window.CORBEAU_CONFIG = {
  SUPABASE_URL: "https://gomaeayeulqzstvobqqr.supabase.co",
  SUPABASE_KEY: "sb_publishable_WA-Zyuqm--mduzqg3eqTBQ_v3l-vNxz",
  WHATSAPP: "2290129496269"
};

(function () {
  var cfg = window.CORBEAU_CONFIG;
  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var F = function (n) {
    return new Intl.NumberFormat("fr-FR").format(Number(n) || 0).replace(/[  ]/g, " ") + " F";
  };
  var fdate = function (s) {
    return new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  var ICON = {
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10"/><path d="M15 9.5c-.6-.9-1.7-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.4 0-2.5-.6-3.1-1.5"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
    arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    back: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
    chat: '<path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.7-5.1A8.5 8.5 0 1 1 21 12Z"/>',
    shop: '<path d="M4 9h16l-1.2 10.2a1 1 0 0 1-1 .8H6.2a1 1 0 0 1-1-.8L4 9Z"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/>',
    chart: '<path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M16 15h2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
  };
  var svg = function (p, size) {
    return '<svg aria-hidden="true" width="' + (size || 20) + '" height="' + (size || 20) +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + "</svg>";
  };

  var tt;
  var toast = function (msg) {
    var t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(tt);
    tt = setTimeout(function () { t.classList.remove("show"); }, 3200);
  };

  var load = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var store = function (k, v) {
    try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {}
  };

  window.C = { cfg: cfg, sb: sb, $: $, esc: esc, F: F, fdate: fdate, ICON: ICON, svg: svg, toast: toast, load: load, store: store };
})();
