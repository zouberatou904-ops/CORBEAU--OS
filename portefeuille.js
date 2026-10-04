let currentSoldeCorbeau = 0;

async function init() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  await loadSolde(session.user.id);

  document.getElementById("amountAll").addEventListener("click", () => {
    document.getElementById("montant").value = currentSoldeCorbeau.toFixed(2);
  });

  document.getElementById("transferBtn").addEventListener("click", async () => {
    const montant = parseFloat(document.getElementById("montant").value);
    const formMsg = document.getElementById("formMsg");
    formMsg.textContent = "";
    formMsg.className = "form-msg";

    if (isNaN(montant) || montant <= 0) {
      formMsg.textContent = "Indique un montant valide.";
      formMsg.classList.add("error");
      return;
    }
    if (montant > currentSoldeCorbeau) {
      formMsg.textContent = "Solde Corbeau insuffisant.";
      formMsg.classList.add("error");
      return;
    }

    const btn = document.getElementById("transferBtn");
    btn.disabled = true;
    btn.textContent = "Transfert...";

    const { error } = await supabaseClient.rpc("transferer_solde_corbeau", { p_montant: montant });

    btn.disabled = false;
    btn.textContent = "Transférer vers BS WOLD CASH";

    if (error) {
      formMsg.textContent = error.message;
      formMsg.classList.add("error");
      return;
    }

    formMsg.textContent = "Transféré ! Disponible maintenant sur BS WOLD CASH.";
    formMsg.classList.add("success");
    document.getElementById("montant").value = "";
    await loadSolde(session.user.id);
  });
}

async function loadSolde(userId) {
  const { data } = await supabaseClient.from("profiles").select("solde_corbeau").eq("id", userId).maybeSingle();
  currentSoldeCorbeau = (data && typeof data.solde_corbeau === "number") ? data.solde_corbeau : 0;
  document.getElementById("soldeCorbeauK").innerHTML = currentSoldeCorbeau.toFixed(2) + '<span class="unit">K</span>';
  document.getElementById("soldeCorbeauFcfa").textContent = "≈ " + Math.round(currentSoldeCorbeau * 1000).toLocaleString("fr-FR") + " FCFA";
}

init();
