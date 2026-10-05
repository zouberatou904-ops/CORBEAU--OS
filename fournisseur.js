const FRAIS_PCT = 0;       // frais de retrait en % (à fixer)
const MIN_RETRAIT = 1000;  // retrait minimum en FCFA (à fixer)
let user = null, solde = 0;

const F = (n) => Math.round(n).toLocaleString("fr-FR") + " F";
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (id) => document.getElementById(id);

async function init() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = "login.html"; return; }
  user = session.user;
  await load();
  $("openRetrait").onclick = () => { $("formMsg").textContent = ""; $("overlay").classList.add("visible"); };
  $("closeOverlay").onclick = () => $("overlay").classList.remove("visible");
  $("montant").oninput = recap;
  $("confirmRetrait").onclick = retirer;
}

async function load() {
  const { data: prods } = await supabaseClient.from("corbeau_produits")
    .select("id, nom, stock_disponible, statut, actif").eq("fournisseur_id", user.id);
  const produits = prods || [];
  const ids = produits.map((p) => p.id);
  let attrs = [], ventes = [];
  if (ids.length) {
    attrs = (await supabaseClient.from("corbeau_attributions")
      .select("id, produit_id, commission_pct").in("produit_id", ids)).data || [];
    const aids = attrs.map((a) => a.id);
    if (aids.length) ventes = (await supabaseClient.from("corbeau_ventes")
      .select("attribution_id, quantite_vendue, montant_total_fcfa, statut, created_at").in("attribution_id", aids)).data || [];
  }
  const attrMap = {}; attrs.forEach((a) => { attrMap[a.id] = a; });
  // gain du fournisseur = montant vendu moins la commission totale (revendeur + app)
  const net = (v) => v.montant_total_fcfa * (100 - ((attrMap[v.attribution_id] || {}).commission_pct || 0)) / 100;

  const conf = ventes.filter((v) => v.statut === "confirme");
  const att = ventes.filter((v) => v.statut === "en_attente");
  const { data: rets } = await supabaseClient.from("corbeau_retraits_fournisseurs")
    .select("montant_fcfa, methode, statut, created_at").eq("fournisseur_id", user.id).order("created_at", { ascending: false });
  const retraits = rets || [];
  const retire = retraits.filter((r) => r.statut !== "refuse").reduce((s, r) => s + r.montant_fcfa, 0);

  solde = Math.max(0, conf.reduce((s, v) => s + net(v), 0) - retire);
  $("kCA").textContent = F(ventes.reduce((s, v) => s + v.montant_total_fcfa, 0));
  $("kActifs").textContent = produits.filter((p) => p.actif && p.statut === "approuve").length;
  $("kSolde").textContent = F(solde);
  $("kAttente").textContent = F(att.reduce((s, v) => s + net(v), 0));

  $("produits").innerHTML = produits.length ? produits.map((p) => {
    const pa = attrs.filter((a) => a.produit_id === p.id).map((a) => a.id);
    const pv = ventes.filter((v) => pa.includes(v.attribution_id));
    const vendus = pv.reduce((s, v) => s + v.quantite_vendue, 0);
    const total = vendus + p.stock_disponible;
    const pct = total ? Math.round(p.stock_disponible / total * 100) : 0;
    const low = p.stock_disponible > 0 && pct <= 20;
    const label = p.statut === "approuve" ? (low ? "Stock faible" : "En vente") : (p.statut === "refuse" ? "Refusé" : "En attente");
    return '<div class="admin-card"><div class="admin-card-title">' + esc(p.nom) + '</div>' +
      '<div class="admin-card-meta">Stock restant ' + p.stock_disponible + ' · Vendus ' + vendus + ' · Ton gain ' + F(pv.reduce((s, v) => s + net(v), 0)) + '</div>' +
      '<div class="fx-bar"><i class="' + (low ? "low" : "") + '" style="width:' + pct + '%"></i></div>' +
      '<span class="status-pill ' + (p.statut === "approuve" && !low ? "paye" : "en_attente") + '" style="margin-top:8px">' + label + '</span></div>';
  }).join("") : '<div class="empty-history">Aucun produit pour le moment</div>';

  // Ventes sur 7 jours
  const jours = [], noms = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); jours.push({ k: d.toDateString(), n: noms[d.getDay()], t: 0 }); }
  ventes.forEach((v) => { const j = jours.find((x) => x.k === new Date(v.created_at).toDateString()); if (j) j.t += v.montant_total_fcfa; });
  const max = Math.max(1, ...jours.map((j) => j.t));
  $("chart").innerHTML = jours.map((j) => '<div><b style="height:' + Math.round(j.t / max * 70) + 'px"></b>' + j.n + '</div>').join("");
  $("chartTotal").textContent = "Total 7 jours : " + F(jours.reduce((s, j) => s + j.t, 0));

  const SL = { en_attente: "En attente", complete: "Complété", refuse: "Refusé" };
  $("retraits").innerHTML = retraits.length ? retraits.slice(0, 10).map((r) =>
    '<div class="history-item"><div><div class="history-amount">' + F(r.montant_fcfa) + '</div><div class="history-meta">' +
    esc(new Date(r.created_at).toLocaleDateString("fr-FR")) + ' · ' + esc(r.methode) + '</div></div>' +
    '<span class="status-pill ' + (r.statut === "complete" ? "paye" : "en_attente") + '">' + (SL[r.statut] || r.statut) + '</span></div>'
  ).join("") : '<div class="empty-history">Aucun retrait pour le moment</div>';
}

function recap() {
  const m = parseFloat($("montant").value) || 0;
  const frais = Math.round(m * FRAIS_PCT / 100);
  $("recap").innerHTML = "Solde : <b>" + F(solde) + "</b> · Tu recevras : <b>" + F(Math.max(0, m - frais)) + "</b> (frais " + F(frais) + ")";
}

async function retirer() {
  const msg = $("formMsg"); msg.className = "form-msg";
  const m = parseFloat($("montant").value), num = $("numero").value.trim();
  const err = (t) => { msg.textContent = t; msg.classList.add("error"); };
  if (!num) return err("Indique ton numéro de réception.");
  if (!m || m < MIN_RETRAIT) return err("Retrait minimum : " + F(MIN_RETRAIT) + ".");
  if (m > solde) return err("Montant supérieur à ton solde disponible.");
  const btn = $("confirmRetrait"); btn.disabled = true;
  const { error } = await supabaseClient.from("corbeau_retraits_fournisseurs").insert({
    fournisseur_id: user.id, montant_fcfa: m, frais_fcfa: Math.round(m * FRAIS_PCT / 100),
    methode: $("methode").value, numero: num, statut: "en_attente"
  });
  btn.disabled = false;
  if (error) return err(error.message);
  $("overlay").classList.remove("visible");
  $("montant").value = "";
  await load();
}

init();
