const content = document.getElementById("content");

async function init() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }
  const user = session.user;

  const { data: candidature } = await supabaseClient
    .from("candidatures_affiliation")
    .select("statut")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!candidature) {
    renderForm(user.id);
  } else if (candidature.statut === "en_attente") {
    renderWaiting();
  } else if (candidature.statut === "refuse") {
    renderRefused();
  } else if (candidature.statut === "approuve") {
    renderApproved();
  } else {
    renderForm(user.id);
  }
}

function renderWaiting() {
  content.innerHTML =
    '<div class="waiting-box">' +
    '<div class="waiting-icon">⏳</div>' +
    '<h2>Candidature en cours d\'examen</h2>' +
    '<p>On vérifie ton dossier. Tu seras débloqué dès que ta candidature sera validée.</p>' +
    '</div>';
}

function renderRefused() {
  content.innerHTML =
    '<div class="waiting-box">' +
    '<div class="waiting-icon">❌</div>' +
    '<h2>Candidature refusée</h2>' +
    '<p>Contacte le support si tu penses que c\'est une erreur.</p>' +
    '</div>';
}

function renderApproved() {
  window.location.href = "tableau-de-bord.html";
}

function renderForm(userId) {
  content.innerHTML =
    '<h1 class="title">Devenir revendeur</h1>' +
    '<p class="subtitle">Remplis ce formulaire pour candidater</p>' +
    '<form id="candForm">' +
    '  <label for="nom">Nom</label>' +
    '  <input type="text" id="nom" required>' +
    '  <label for="prenom">Prénom</label>' +
    '  <input type="text" id="prenom" required>' +
    '  <label for="age">Âge</label>' +
    '  <input type="number" id="age" min="14" max="99" required>' +
    '  <label>Es-tu élève ?</label>' +
    '  <div class="radio-group">' +
    '    <div class="toggle-btn active" data-eleve="oui">Oui</div>' +
    '    <div class="toggle-btn" data-eleve="non">Non</div>' +
    '  </div>' +
    '  <div id="tuteurWrap" style="display:none">' +
    '    <label for="tuteur">WhatsApp d\'un parent/tuteur (obligatoire si tu as moins de 18 ans)</label>' +
    '    <input type="tel" id="tuteur" placeholder="+229 01 23 45 67 89">' +
    '  </div>' +
    '  <label>Type de pièce fournie</label>' +
    '  <div class="radio-group">' +
    '    <div class="toggle-btn active" data-piece="cni">CNI</div>' +
    '    <div class="toggle-btn" data-piece="carte_scolaire">Carte scolaire</div>' +
    '  </div>' +
    '  <div class="file-input-wrap">' +
    '    Photo de la pièce (claire et lisible)' +
    '    <input type="file" id="piece" accept="image/*" required>' +
    '  </div>' +
    '  <div id="formMsg" class="form-msg"></div>' +
    '  <button type="submit" class="btn-primary" id="submitBtn">Envoyer ma candidature</button>' +
    '</form>';

  let eleve = "oui";
  let piece = "cni";

  content.querySelectorAll("[data-eleve]").forEach((btn) => {
    btn.addEventListener("click", () => {
      content.querySelectorAll("[data-eleve]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      eleve = btn.dataset.eleve;
    });
  });
  content.querySelectorAll("[data-piece]").forEach((btn) => {
    btn.addEventListener("click", () => {
      content.querySelectorAll("[data-piece]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      piece = btn.dataset.piece;
    });
  });

  const ageInput = document.getElementById("age");
  const tuteurWrap = document.getElementById("tuteurWrap");
  ageInput.addEventListener("input", () => {
    const a = parseInt(ageInput.value, 10);
    tuteurWrap.style.display = (a && a < 18) ? "block" : "none";
  });

  document.getElementById("candForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formMsg = document.getElementById("formMsg");
    const submitBtn = document.getElementById("submitBtn");
    formMsg.textContent = "";
    formMsg.className = "form-msg";

    const nom = document.getElementById("nom").value.trim();
    const prenom = document.getElementById("prenom").value.trim();
    const age = parseInt(document.getElementById("age").value, 10);
    const tuteur = document.getElementById("tuteur").value.trim();
    const file = document.getElementById("piece").files[0];

    if (age < 18 && !tuteur) {
      formMsg.textContent = "Le contact WhatsApp d'un parent/tuteur est obligatoire pour les moins de 18 ans.";
      formMsg.classList.add("error");
      return;
    }
    if (!file) {
      formMsg.textContent = "Ajoute une photo de ta pièce.";
      formMsg.classList.add("error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Envoi...";

    const ext = file.name.split(".").pop();
    const path = userId + "/" + Date.now() + "." + ext;

    const { error: uploadError } = await supabaseClient.storage.from("pieces-identite").upload(path, file);

    if (uploadError) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Envoyer ma candidature";
      formMsg.textContent = "Erreur d'envoi de la photo : " + uploadError.message;
      formMsg.classList.add("error");
      return;
    }

    const { error } = await supabaseClient.from("candidatures_affiliation").insert({
      user_id: userId,
      nom, prenom, age,
      est_eleve: eleve === "oui",
      type_piece: piece,
      piece_url: path,
      tuteur_whatsapp: age < 18 ? tuteur : null
    });

    submitBtn.disabled = false;
    submitBtn.textContent = "Envoyer ma candidature";

    if (error) {
      formMsg.textContent = error.message;
      formMsg.classList.add("error");
      return;
    }

    renderWaiting();
  });
}

init();
