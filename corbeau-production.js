let currentUser = null;

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
  loadMyProducts();
}

document.getElementById("prodForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formMsg = document.getElementById("formMsg");
  const submitBtn = document.getElementById("submitBtn");
  formMsg.textContent = "";
  formMsg.className = "form-msg";

  const nom = document.getElementById("nom").value.trim();
  const description = document.getElementById("description").value.trim();
  const prix = parseFloat(document.getElementById("prix").value);
  const stock = parseInt(document.getElementById("stock").value, 10);
  const age = parseInt(document.getElementById("age").value, 10) || 0;
  const file = document.getElementById("photo").files[0];

  submitBtn.disabled = true;
  submitBtn.textContent = "Envoi...";

  let photoUrl = null;
  let photoWarning = "";
  if (file) {
    const ext = file.name.split(".").pop();
    const path = currentUser.id + "/" + Date.now() + "." + ext;
    const { error: uploadError } = await supabaseClient.storage.from("produits-corbeau").upload(path, file);
    if (uploadError) {
      photoWarning = " (envoyé sans photo : " + uploadError.message + ")";
    } else {
      photoUrl = supabaseClient.storage.from("produits-corbeau").getPublicUrl(path).data.publicUrl;
    }
  }

  const { error } = await supabaseClient.from("corbeau_produits").insert({
    nom, description,
    prix_fcfa: prix,
    stock_disponible: stock,
    age_minimum: age,
    photo_url: photoUrl,
    fournisseur_id: currentUser.id,
    statut: "en_attente",
    actif: false
  });

  submitBtn.disabled = false;
  submitBtn.textContent = "Proposer ce produit";

  if (error) {
    formMsg.textContent = error.message;
    formMsg.classList.add("error");
    return;
  }

  document.getElementById("prodForm").reset();
  formMsg.textContent = "Produit envoyé, en attente de confirmation." + photoWarning;
  formMsg.classList.add(photoWarning ? "error" : "success");
  loadMyProducts();
});

const STATUTS = { en_attente: "En attente", approuve: "En vente", refuse: "Refusé" };

async function loadMyProducts() {
  const box = document.getElementById("myProducts");
  const { data, error } = await supabaseClient
    .from("corbeau_produits")
    .select("id, nom, prix_fcfa, stock_disponible, statut, created_at, corbeau_attributions(quantite, statut, vendeur_id, profiles(nom_complet))")
    .eq("fournisseur_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    box.innerHTML = '<div class="empty-history">Aucun produit proposé pour le moment</div>';
    return;
  }

  box.innerHTML = data.map((p) => {
    const d = new Date(p.created_at);
    const date = d.toLocaleDateString("fr-FR");
    const label = STATUTS[p.statut] || p.statut;
    const pillClass = p.statut === "approuve" ? "paye" : (p.statut === "refuse" ? "refuse" : "en_attente");
    const attribs = p.corbeau_attributions || [];
    const totalPris = attribs.reduce((sum, a) => sum + a.quantite, 0);

    let suivi = '<div class="product-commission" style="margin-top:6px">Aucun revendeur pour l\'instant</div>';
    if (attribs.length > 0) {
      const lignes = attribs.map((a) => {
        const nom = a.profiles ? a.profiles.nom_complet : "Revendeur";
        return '<div style="font-size:11.5px;color:var(--text-muted);margin-top:3px">• ' + esc(nom) + ' — ' + a.quantite + ' unité(s) (' + esc(a.statut) + ')</div>';
      }).join("");
      suivi = '<div class="product-commission" style="margin-top:6px">' + totalPris + ' unité(s) prise(s) au total :</div>' + lignes;
    }

    return '<div class="admin-card">' +
      '<div class="admin-card-title">' + esc(p.nom) + '</div>' +
      '<div class="admin-card-meta">' + Number(p.prix_fcfa).toLocaleString("fr-FR") + ' F · stock ' + p.stock_disponible + ' · ' + date + '</div>' +
      '<span class="status-pill ' + pillClass + '">' + label + '</span>' +
      suivi + '</div>';
  }).join("");
}

init();
