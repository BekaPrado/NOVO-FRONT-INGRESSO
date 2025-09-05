const form = document.getElementById("formLogin");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));

  if (data.usuario && !data.email) {
    data.email = data.usuario;
    delete data.usuario;
  }

  const result = await apiPost("/admin/login", data);

  if (result.status) {
    localStorage.setItem("admin", "logado");
    location.href = "admin-dashboard.html";
  } else {
    showToast("❌ Credenciais inválidas!");
  }
});

// Toast helper
function showToast(message) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = message;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}
