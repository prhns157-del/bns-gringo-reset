const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector("#site-nav");

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

document.querySelectorAll(".faq-question").forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.closest(".faq-item");
    const answer = item?.querySelector(".faq-answer");
    const isOpen = item?.classList.toggle("is-open");

    button.setAttribute("aria-expanded", String(Boolean(isOpen)));
    if (answer) answer.hidden = !isOpen;
  });
});
