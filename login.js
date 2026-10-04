const loginForm = document.getElementById("loginForm");
const formMsg = document.getElementById("formMsg");
const submitBtn = document.getElementById("submitBtn");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const code = document.getElementById("code").value.trim();

  formMsg.textContent = "";
  formMsg.className = "form-msg";
  submitBtn.disabled = true;
  submitBtn.textContent = "Connexion...";

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password: code });

  submitBtn.disabled = false;
  submitBtn.textContent = "Se connecter";

  if (error) {
    formMsg.textContent = "Email ou code incorrect.";
    formMsg.classList.add("error");
    return;
  }

  window.location.href = "index.html";
});
