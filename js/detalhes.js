async function carregarDetalhes() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        document.getElementById("detalhes-evento").innerHTML = "<p>Evento não encontrado.</p>";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/evento/${id}`);
        const data = await response.json();

        console.log("DEBUG detalhe:", data);

        if (!data.evento) {
            document.getElementById("detalhes-evento").innerHTML = "<p>Evento não encontrado.</p>";
            return;
        }

        const evento = data.evento;

        document.getElementById("detalhes-evento").innerHTML = `
    <div class="detalhe-card">
        <img src="${evento.foto_url}" alt="${evento.nome}">
        <h2>${evento.nome}</h2>
        <div class="descricao-evento">
            ${evento.descricao || ""}
        </div>
        <p><strong>Valor:</strong> ${Number(evento.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
        <div class="compra">
    <button class="btn-comprar" onclick="irParaFormulario(${evento.id})">Comprar</button>
</div>

    </div>
`;

    } catch (err) {
        console.error("Erro ao carregar evento:", err);
        document.getElementById("detalhes-evento").innerHTML = "<p>Erro ao carregar detalhes do evento.</p>";
    }
}

function irParaFormulario(eventoId) {
    window.location.href = `formulario.html?eventoId=${eventoId}`;
}

document.addEventListener("DOMContentLoaded", carregarDetalhes);
