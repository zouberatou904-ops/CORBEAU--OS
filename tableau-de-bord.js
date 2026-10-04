let currentUser = null;
let myAttributions = [];

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function init() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }
  currentUser = session.user;

  const { data: candidature } = await supabaseClient
    .from("candidatures_affiliation")
    .select("statut")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (!candidature || candidature.statut !== "approuve") {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("avatarInitial").textContent = (currentUser.email || "?")[0].toUpperCase();

  document.getElementById("dateLine").textContent =
    "Vue d'ensemble · " + new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  await loadWallet();
  await loadStock();
  await loadStats();
  await loadReversements();

  document.getElementById("openRapportBtn").addEventListener("click", openRapport);
  document.getElementById("closeOverlay").addEventListener("click", () => {
    document.getElementById("overlay").classList.remove("visible");
  });
  document.getElementById("selectProduit").addEventListener("change", updateRecap);
  document.getElementById("qteVendue").addEventListener("input", updateRecap);
  document.getElementById("submitRapportBtn").addEventListener("click", submitRapport);
}

async function loadWallet() {
  const { data } = await supabaseClient.from("profiles").select("solde_corbeau").eq("id", currentUser.id).maybeSingle();
  const solde = (data && typeof data.solde_corbeau === "number") ? data.solde_corbeau : 0;
  document.getElementById("walletK").innerHTML = solde.toFixed(2) + '<span class="unit">K</span>';
  document.getElementById("pillSolde").textContent = Math.round(solde * 1000).toLocaleString("fr-FR") + " FCFA";
}

async function loadStock() {
  const { data } = await supabaseClient
    .from("corbeau_attributions")
    .select("id, quantite, prix_unitaire_fcfa, commission_pct, commission_revendeur_pct, statut, corbeau_produits(nom)")
    .eq("vendeur_id", currentUser.id)
    .in("statut", ["a_livrer", "livre"]);

  myAttributions = data || [];
  const box = document.getElementById("stockTableWrap");

  if (myAttributions.length === 0) {
    box.innerHTML = '<div class="empty-history">Aucun produit en stock pour l\'instant</div>';
    populateSelect();
    return;
  }

  const totalPris = myAttributions.reduce((s, a) => s + a.quantite, 0);
  const pct = Math.min(100, totalPris * 10);
  document.getElementById("statStock").textContent = totalPris + " pcs";
  document.getElementById("statStockBar").style.width = pct + "%";
  document.getElementById("statStockPct").textContent = pct + "%";

  box.innerHTML = '<table class="db-stock-table"><tr><th>Produit</th><th>Quantité</th><th>Statut</th></tr>' +
    myAttributions.map((a) => {
      const nom = a.corbeau_produits ? a.corbeau_produits.nom : "Produit";
      const label = a.statut === "livre" ? "En stock" : "En livraison";
      return '<tr><td>' + esc(nom) + '</td><td><span class="db-qty-pill">' + a.quantite + '</span></td>' +
        '<td><span class="status-pill ' + (a.statut === "livre" ? "paye" : "en_attente") + '">' + label + '</span></td></tr>';
    }).join("") + '</table>';

  populateSelect();
}

function populateSelect() {
  const select = document.getElementById("selectProduit");
  const dispo = myAttributions.filter((a) => a.statut === "livre");
  if (dispo.length === 0) {
    select.innerHTML = '<option value="">Aucun produit en stock</option>';
    return;
  }
  select.innerHTML = dispo.map((a) => {
    const nom = a.corbeau_produits ? a.corbeau_produits.nom : "Produit";
    return '<option value="' + a.id + '">' + esc(nom) + ' (' + a.quantite + ' en stock)</option>';
  }).join("");
  updateRecap();
}

function updateRecap() {
  const id = document.getElementById("selectProduit").value;
  const attr = myAttributions.find((a) => a.id === id);
  const recap = document.getElementById("recapVente");
  if (!attr) { recap.textContent = ""; return; }
  const qte = parseInt(document.getElementById("qteVendue").value, 10) || 0;
  const total = attr.prix_unitaire_fcfa * qte;
  const revendeurPct = attr.commission_revendeur_pct != null ? attr.commission_revendeur_pct : (attr.commission_pct - 5);
  const gain = Math.round(total * (revendeurPct / 100));
  recap.innerHTML = 'Total vendu : <b>' + total.toLocaleString("fr-FR") + ' F</b> · Ton gain : <b>' + gain.toLocaleString("fr-FR") + ' F</b>';
}

function openRapport() {
  if (myAttributions.filter((a) => a.statut === "livre").length === 0) {
    alert("Tu n'as aucun produit livré à déclarer pour l'instant.");
    return;
  }
  document.getElementById("qteVendue").value = 1;
  document.getElementById("rapportMsg").textContent = "";
  updateRecap();
  document.getElementById("overlay").classList.add("visible");
}

async function submitRapport() {
  const attributionId = document.getElementById("selectProduit").value;
  const qte = parseInt(document.getElementById("qteVendue").value, 10);
  const msg = document.getElementById("rapportMsg");
  msg.textContent = "";
  msg.className = "form-msg";

  const attr = myAttributions.find((a) => a.id === attributionId);
  if (!attr) { msg.textContent = "Choisis un produit."; msg.classList.add("error"); return; }
  if (!qte || qte < 1 || qte > attr.quantite) {
    msg.textContent = "Quantité invalide (max " + attr.quantite + ").";
    msg.classList.add("error");
    return;
  }

  const btn = document.getElementById("submitRapportBtn");
  btn.disabled = true;
  btn.textContent = "Envoi...";

  const montantTotal = attr.prix_unitaire_fcfa * qte;
  const revendeurPct = attr.commission_revendeur_pct != null ? attr.commission_revendeur_pct : (attr.commission_pct - 5);
  const montantRevendeur = Math.round(montantTotal * (revendeurPct / 100));
  const montantAReverser = Math.round(montantTotal - montantRevendeur);

  const { error } = await supabaseClient.from("corbeau_ventes").insert({
    vendeur_id: currentUser.id,
    attribution_id: attributionId,
    quantite_vendue: qte,
    montant_total_fcfa: montantTotal,
    montant_revendeur_fcfa: montantRevendeur,
    montant_a_reverser_fcfa: montantAReverser,
    statut: "en_attente"
  });

  const quantiteRestante = attr.quantite - qte;
  await supabaseClient
    .from("corbeau_attributions")
    .update({ quantite: quantiteRestante, statut: quantiteRestante > 0 ? "livre" : "vendu" })
    .eq("id", attributionId);

  btn.disabled = false;
  btn.textContent = "Confirmer et déclarer";

  if (error) {
    msg.textContent = error.message;
    msg.classList.add("error");
    return;
  }

  document.getElementById("overlay").classList.remove("visible");
  await loadStock();
  await loadStats();
  await loadReversements();
}

async function loadStats() {
  const { data } = await supabaseClient
    .from("corbeau_ventes")
    .select("quantite_vendue, montant_revendeur_fcfa, montant_a_reverser_fcfa, statut, created_at")
    .eq("vendeur_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = data || [];
  const today = new Date().toDateString();
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;

  const ventesJour = rows.filter((r) => new Date(r.created_at).toDateString() === today);
  const articlesJour = ventesJour.reduce((s, r) => s + r.quantite_vendue, 0);
  document.getElementById("statVentesJour").textContent = articlesJour + " article(s)";

  const aReverser = rows.filter((r) => r.statut === "en_attente").reduce((s, r) => s + r.montant_a_reverser_fcfa, 0);
  document.getElementById("statAReverser").textContent = Math.round(aReverser).toLocaleString("fr-FR") + " F";

  const gainsSemaine = rows.filter((r) => new Date(r.created_at).getTime() >= weekAgo)
    .reduce((s, r) => s + r.montant_revendeur_fcfa, 0);
  document.getElementById("statGainsSemaine").textContent = Math.round(gainsSemaine).toLocaleString("fr-FR") + " F";
}

const VSTAT = { en_attente: "En attente", confirme: "Confirmé" };

async function loadReversements() {
  const box = document.getElementById("reversementsList");
  const { data } = await supabaseClient
    .from("corbeau_ventes")
    .select("quantite_vendue, montant_a_reverser_fcfa, statut, created_at")
    .eq("vendeur_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!data || data.length === 0) {
    box.innerHTML = '<div class="empty-history">Aucun rapport soumis pour le moment</div>';
    return;
  }

  box.innerHTML = data.map((r) => {
    const d = new Date(r.created_at);
    const date = d.toLocaleDateString("fr-FR") + " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const label = VSTAT[r.statut] || r.statut;
    const pillClass = r.statut === "confirme" ? "paye" : "en_attente";
    return '<div class="history-item">' +
      '<div><div class="history-amount">' + r.quantite_vendue + ' vendu(s)</div>' +
      '<div class="history-meta">' + esc(date) + ' · à reverser : ' + Math.round(r.montant_a_reverser_fcfa).toLocaleString("fr-FR") + ' F</div></div>' +
      '<span class="status-pill ' + pillClass + '">' + label + '</span></div>';
  }).join("");
}

init();
