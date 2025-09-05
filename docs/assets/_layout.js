(() => {
  // ---- Ayarlar ----
  const PROJECT_SLUG = "carelio-web";           // project page kullanıyorsun
  const BASE = PROJECT_SLUG ? `/${PROJECT_SLUG}/` : "/";
  const SKIP_HEADER = !!(window && window.SKIP_HEADER);

  // Sayfada yerel menü/header var mı? Varsa injection yapma.
  function hasOwnHeader() {
    return !!(
      document.querySelector("header.site-header") ||
      document.querySelector("header .nav") ||
      document.querySelector(".navbar, .topbar, .top-menu") ||
      document.querySelector("nav[role='navigation']")
    );
  }

  // ---- Yardımcılar ----
  async function fetchText(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`[${res.status}] ${url}`);
    return res.text();
  }

  async function inject(targetId, url, position = "start") {
    const el = document.getElementById(targetId);
    if (!el) return;
    try {
      const html = await fetchText(`${BASE}${url}`);
      if (position === "start") el.insertAdjacentHTML("afterbegin", html);
      else el.insertAdjacentHTML("beforeend", html);
    } catch (e) {
      console.warn("Partial yüklenemedi:", url, e);
    }
  }

  function normalize(pathname) {
    return PROJECT_SLUG
      ? pathname.replace(new RegExp(`^/${PROJECT_SLUG}`), "") || "/"
      : pathname || "/";
  }

  function markActive() {
    const here = normalize(location.pathname);
    const links = document.querySelectorAll(".nav a[href]");
    links.forEach(a => {
      const tmp = document.createElement("a");
      tmp.href = a.getAttribute("href");
      const path = normalize(tmp.pathname);

      const isHomeLink = (path === "/" || path.endsWith("/index.html"));
      const hereIsHome = (here === "/" || here.endsWith("/index.html"));
      const match = isHomeLink ? hereIsHome : here.endsWith(path);
      a.classList.toggle("active", !!match);
    });
  }

  function applyAuthUI() {
    const userName = localStorage.getItem("userName") || "";
    const guestEls = document.querySelectorAll(".auth-guest");
    const inEls    = document.querySelectorAll(".auth-loggedin");

    if (userName) {
      inEls.forEach(el => el.style.display = "");
      guestEls.forEach(el => el.style.display = "none");

      const navUserName = document.getElementById("navUserName");
      if (navUserName) navUserName.textContent = userName;

      const logout = document.getElementById("logoutLink");
      if (logout) {
        logout.addEventListener("click", (e) => {
          e.preventDefault();
          localStorage.removeItem("userName");
          location.href = `${BASE}`;
        });
      }
    } else {
      guestEls.forEach(el => el.style.display = "");
      inEls.forEach(el => el.style.display = "none");
    }
  }

  function wireFooter() {
    const y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  function wireMobileNav() {
    const toggler = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".nav");
    if (toggler && nav) {
      toggler.addEventListener("click", () => {
        nav.classList.toggle("show");
      });
    }
  }

  // ---- Başlatıcı ----
  document.addEventListener("DOMContentLoaded", async () => {
    if (!(SKIP_HEADER || hasOwnHeader())) {
      await inject("site-header", "partials/header.html", "start");
    }
    await inject("site-footer", "partials/footer.html", "end");

    markActive();
    applyAuthUI();
    wireFooter();
    wireMobileNav();
  });
})();
