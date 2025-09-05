// index.js
async function carregarEventos() {
    const eventos = await getEventos();
    const listaEventos = document.getElementById('lista-eventos');

    listaEventos.innerHTML = '';

    // Só mostra eventos ativos
    const ativos = eventos.filter(ev => ev.status === "ativo");

    if (ativos.length === 0) {
        listaEventos.innerHTML = '<p>Nenhum evento disponível no momento.</p>';
        return;
    }

    ativos.forEach(evento => {
        const card = document.createElement('div');
        card.classList.add('card-evento');

        card.innerHTML = `
    <img src="${evento.foto_url}" alt="${evento.nome}">
    <h3>${evento.nome}</h3>
    <p><strong>${Number(evento.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></p>
    <button class="btn-detalhes" onclick="irParaDetalhes(${evento.id})">Ver Detalhes</button>
`;

        listaEventos.appendChild(card);
    });
}

function irParaDetalhes(id) {
    window.location.href = `detalhes.html?id=${id}`;
}

document.addEventListener("DOMContentLoaded", carregarEventos);


// =======================
//  Carrossel
// =======================
let slideIndex = 0;
let slideTimer;

function showSlides(n) {
  let slides = document.getElementsByClassName("carousel-slide");
  let dots = document.getElementsByClassName("dot");

  if (n > slides.length) { slideIndex = 1; }
  if (n < 1) { slideIndex = slides.length; }

  for (let i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";
  }
  for (let i = 0; i < dots.length; i++) {
    dots[i].className = dots[i].className.replace(" active", "");
  }

  slides[slideIndex - 1].style.display = "block";
  dots[slideIndex - 1].className += " active";
}

function plusSlides(n) {
  clearInterval(slideTimer);
  showSlides(slideIndex += n);
  autoSlide();
}

function currentSlide(n) {
  clearInterval(slideTimer);
  showSlides(slideIndex = n);
  autoSlide();
}

function autoSlide() {
  slideTimer = setInterval(() => {
    slideIndex++;
    showSlides(slideIndex);
  }, 5000); // muda a cada 5s
}

document.addEventListener("DOMContentLoaded", () => {
  slideIndex = 1;
  showSlides(slideIndex);
  autoSlide();
});
