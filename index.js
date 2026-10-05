// Corbeau : accès direct avec le compte BS WOLD (plus de candidature)
async function init() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }
  window.location.href = "tableau-de-bord.html";
}

init();
