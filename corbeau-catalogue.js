let currentUser = null;
let currentAge = 0;
let selectedProduct = null;
let qty = 1;

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
    .select("statut, age")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (!candidature || candidature.statut !== "approuve") {
    window.location.href = "affiliation.html";
    return;
  }
  currentAge = candidature.age;

  loadCatalog();
  loadMyAttributions();
}

async function loadCatalog() {
  const box = document.getElementById("catalog");
  const { data, error } = await supabaseClient
    .from("corbeau_produits")
    .select("id, nom, prix_fcfa, commission_pct, part_app_pct, age_minimum, photo_url, stock_disponible")
    .eq("actif", true)
    .eq("statut", "approuve")
    .lte("age_minimum", currentAge)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    box.innerHTML = '<div class="empty-history">Aucun produit disponible pour ton profil pour le moment</div>';
    return;
  }

  box.innerHTML = '<div class="product-grid">' + data.map((p) => {
    const revendeurPct = p.commission_pct - p.part_app_pct;
    const commissionFcfa = Math.round(p.prix_fcfa * (revendeurPct / 100));
    const photo = p.photo_url
      ? '<img class="product-photo" src="' + esc(p.photo_url) + '" alt="">'
      : '<div class="product-photo">Pas de photo</div>';
    return '<div class="product-card cb-product-card" data-id="' + p.id + '">' + photo +
      '<div class="product-body">' +
      '<div class="product-name">' + esc(p.nom) + '</div>' +
      '<div class="product-price">' + Number(p.prix_fcfa).toLocaleString("fr-FR") + ' F / unité</div>' +
      '<div class="product-commission">+' + commissionFcfa.toLocaleString("fr-FR") + ' F de gain par unité vendue</div>' +
      '</div></div>';
  }).join("") + '</div>';

  box.querySelectorAll(".cb-product-card").forEach((card) => {
    card.addEventListener("click", () => openDetail(data.find((p) => p.id === card.dataset.id)));
  });
}

function openDetail(product) {
  selectedProduct = product;
  qty = 1;
  const revendeurPct = product.commission_pct - product.part_app_pct;
  document.getElementById("dName").textContent = product.nom;
  document.getElementById("dPrice").textContent = Number(product.prix_fcfa).toLocaleString("fr-FR") + " FCFA / unité";
  document.getElementById("dCommission").textContent = "Tu gagnes " + revendeurPct + "% sur chaque vente";
  document.getElementById("adresse").value = "";
  document.getElementById("formMsg").textContent = "";
  updateQtyDisplay();
  document.getElementById("overlay").classList.add("visible");
}

function updateQtyDisplay() {
  document.getElementById("qtyValue").textContent = qty;
  const total = selectedProduct.prix_fcfa * qty;
  document.getElementById("qtyTotal").textContent = total.toLocaleString("fr-FR") + " FCFA";
}

document.getElementById("qtyMinus").addEventListener("click", () => {
  if (qty > 1) { qty--; updateQtyDisplay(); }
});
document.getElementById("qtyPlus").addEventListener("click", () => {
  if (qty < (selectedProduct.stock_disponible || 999)) { qty++; updateQtyDisplay(); }
});
document.getElementById("closeDetail").addEventListener("click", () => {
  document.getElementById("overlay").classList.remove("visible");
});

document.getElementById("confirmBtn").addEventListener("click", async () => {
  const adresse = document.getElementById("adresse").value.trim();
  const formMsg = document.getElementById("formMsg");
  formMsg.textContent = "";
  formMsg.className = "form-msg";

  if (!adresse) {
    formMsg.textContent = "Indique une adresse de livraison.";
    formMsg.classList.add("error");
    return;
  }

  const btn = document.getElementById("confirmBtn");
  btn.disabled = true;
  btn.textContent = "Envoi...";

  const { error } = await supabaseClient.from("corbeau_attributions").insert({
    vendeur_id: currentUser.id,
    produit_id: selectedProduct.id,
    quantite: qty,
    prix_unitaire_fcfa: selectedProduct.prix_fcfa,
    commission_pct: selectedProduct.commission_pct,
    commission_revendeur_pct: selectedProduct.commission_pct - selectedProduct.part_app_pct,
    adresse_livraison: adresse,
    statut: "a_livrer"
  });

  btn.disabled = false;
  btn.textContent = "Je prends ce produit";

  if (error) {
    formMsg.textContent = error.message;
    formMsg.classList.add("error");
    return;
  }

  document.getElementById("overlay").classList.remove("visible");
  loadMyAttributions();
});

const STATUTS = { a_livrer: "En livraison", livre: "Livré, à vendre", vendu: "Vendu" };

async function loadMyAttributions() {
  const box = document.getElementById("myAttributions");
  const { data, error } = await supabaseClient
    .from("corbeau_attributions")
    .select("quantite, prix_unitaire_fcfa, statut, created_at, corbeau_produits(nom)")
    .eq("vendeur_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data || data.length === 0) {
    box.innerHTML = '<div class="empty-history">Aucun produit pris pour le moment</div>';
    return;
  }

  box.innerHTML = data.map((a) => {
    const d = new Date(a.created_at);
    const date = d.toLocaleDateString("fr-FR");
    const nom = a.corbeau_produits ? a.corbeau_produits.nom : "Produit";
    const label = STATUTS[a.statut] || a.statut;
    const pillClass = a.statut === "vendu" ? "paye" : (a.statut === "livre" ? "en_attente" : "en_attente");
    return '<div class="history-item">' +
      '<div><div class="history-amount">' + esc(nom) + ' ×' + a.quantite + '</div>' +
      '<div class="history-meta">' + esc(date) + '</div></div>' +
      '<span class="status-pill ' + pillClass + '">' + esc(label) + '</span></div>';
  }).join("");
}

init();
