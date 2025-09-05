const urlParams = new URLSearchParams(window.location.search);
const eventoId = urlParams.get("id");

async function carregarEvento() {
  const evento = await apiGet(`/evento/${eventoId}`);
  const ev = evento.dados;

  document.getElementById("detalhesEvento").innerHTML = `
    <div class="card">
      <h2>${ev.nome}</h2>
      <img src="${ev.foto_url}" width="300">
      <p>${ev.descricao}</p>
      <p><b>R$ ${ev.valor}</b></p>
      <p>Data: ${ev.data_evento} às ${ev.horario_evento}</p>
<button onclick="location.href='formulario.html?eventoId=${ev.id}'">Comprar</button>
    </div>
  `;
}

carregarEvento();
