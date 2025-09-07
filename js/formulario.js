/*************************************************************************************************
 * Objetivo: Script do formulário de compra e cadastro de participantes
 * Autor: Rebeka Marcelino
 * Data: 05/09/2025
 * Versão: 1.5 (redirecionamento garantido ao voltar do PagSeguro)
 *************************************************************************************************/

// 🔹 Garante que ao voltar do PagSeguro, redireciona para a home mesmo com cache
window.addEventListener("pageshow", (event) => {
  if (localStorage.getItem("compraRealizada") === "true") {
    if (event.persisted) {
      // Se a página voltou do bfcache → força reload
      window.location.reload();
    } else {
      // Se recarregou normal → já redireciona
      localStorage.removeItem("compraRealizada");
      window.location.href = "index.html";
    }
  }
});

let empresaId = null;
let eventoId = new URLSearchParams(window.location.search).get("eventoId");
let cupomAplicado = null;
let limiteParticipantes = 1;

// Buscar limite de participantes
async function carregarEvento() {
  try {
    const eventoRes = await apiGet(`/evento/${eventoId}`);
    const evento = eventoRes.evento || eventoRes.dados;
    if (evento) {
      limiteParticipantes = evento.limite_participantes || 1;
      document.getElementById("msg-participantes").textContent =
        `⚠️ Você deve adicionar no mínimo ${limiteParticipantes} participantes e no máximo ${limiteParticipantes}.`;
    }
  } catch (err) {
    console.error("Erro ao carregar evento:", err);
  }
}
carregarEvento();

// Adicionar participante
function adicionarParticipante() {
  const qtd = document.querySelectorAll(".participante-item").length;
  if (qtd >= limiteParticipantes) {
    alert(`⚠️ Este evento permite no máximo ${limiteParticipantes} participantes.`);
    return;
  }

  const div = document.createElement("div");
  div.classList.add("participante-item");
  div.innerHTML = `
    <input type="text" placeholder="Nome *" class="nome-participante" required>
    <input type="email" placeholder="E-mail *" class="email-participante" required>
    <input type="text" placeholder="Telefone *" class="tel-participante" required oninput="mascaraTelefone(this)">
    <select class="genero-participante">
      <option value="Masculino">Masculino</option>
      <option value="Feminino">Feminino</option>
      <option value="Prefiro não informar" selected>Prefiro não informar</option>
    </select>
  `;
  document.getElementById("participantes").appendChild(div);
}

// Máscaras
function mascaraCPF(input) {
  input.value = input.value.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function mascaraCNPJ(input) {
  input.value = input.value.replace(/\D/g, "").slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}
function mascaraTelefone(input) {
  input.value = input.value.replace(/\D/g, "").slice(0, 11)
    .replace(/^(\d{2})(\d)/g, "($1) $2")
    .replace(/(\d{4,5})(\d{4})$/, "$1-$2");
}

// Validar empresa
function validarEmpresa(empresa) {
  if (!empresa.nome_empresa || !empresa.email || !empresa.logradouro || !empresa.numero ||
      !empresa.bairro || !empresa.cidade || !empresa.uf || !empresa.cep) {
    alert("⚠️ Preencha todos os campos obrigatórios.");
    return false;
  }
  return true;
}

// Enviar formulário
document.getElementById("form-empresa").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!confirm("Tem certeza que deseja enviar os dados?")) return;

  const empresa = {
    nome_empresa: document.getElementById("nome_empresa").value.trim(),
    email: document.getElementById("email").value.trim(),
    telefone: document.getElementById("telefone").value.trim(),
    cpf: document.getElementById("cpf").value.trim() || null,
    cnpj: document.getElementById("cnpj").value.trim() || null,
    logradouro: document.getElementById("logradouro").value.trim(),
    numero: document.getElementById("numero").value.trim(),
    bairro: document.getElementById("bairro").value.trim(),
    cidade: document.getElementById("cidade").value.trim(),
    uf: document.getElementById("uf").value.trim(),
    cep: document.getElementById("cep").value.trim(),
    complemento: document.getElementById("complemento").value.trim() || null,
    evento_id: parseInt(eventoId),
    cupom_id: cupomAplicado ? cupomAplicado.id : null
  };

  if (!validarEmpresa(empresa)) return;

  const participantesEls = document.querySelectorAll(".participante-item");
  let participantes = [];

  // ✅ Validação: mínimo obrigatório
  if (participantesEls.length < limiteParticipantes) {
    alert(`⚠️ Você deve cadastrar pelo menos ${limiteParticipantes} participantes.`);
    return;
  }

  // ✅ Validação: duplicados
  const vistos = new Set();
  for (let p of participantesEls) {
    const nome = p.querySelector(".nome-participante").value.trim();
    const email = p.querySelector(".email-participante").value.trim().toLowerCase();
    const telefone = p.querySelector(".tel-participante").value.trim();
    const genero = p.querySelector(".genero-participante").value;

    if (!nome || !email || !telefone) {
      alert("⚠️ Preencha todos os dados de cada participante.");
      return;
    }

    const chave = `${nome.toLowerCase()}|${email}|${telefone}`;
    if (vistos.has(chave)) {
      alert("⚠️ Não é permitido cadastrar participantes com os mesmos dados (nome, email ou telefone iguais).");
      return;
    }
    vistos.add(chave);

    participantes.push({ nome, email, telefone, genero });
  }

  try {
    const data = await apiPost("/empresa", empresa);
    if (data.status) {
      empresaId = data.dados?.id || data.empresa?.id;

      // Salvar todos os participantes
      for (let part of participantes) {
        part.empresa_id = empresaId;
        await apiPost("/participante", part);
      }

      alert("✅ Dados enviados com sucesso!");
      document.querySelectorAll("#form-empresa input, #form-empresa button, #form-empresa select").forEach(el => el.disabled = true);

      document.getElementById("secao-cupom").style.display = "block";
      document.getElementById("pagamento").style.display = "block";

      const eventoRes = await apiGet(`/evento/${eventoId}`);
      const eventoData = eventoRes.evento || eventoRes.dados;

      if (eventoData) {
        document.getElementById("botaoNormal").innerHTML = eventoData.botao_pagseguro;

        // 🔹 Captura clique no botão normal
        const pagSeguroBtn = document.querySelector("#botaoNormal form, #botaoNormal a, #botaoNormal button");
        if (pagSeguroBtn) {
          pagSeguroBtn.addEventListener("click", () => {
            localStorage.setItem("compraRealizada", "true");
          });
        }
      }
    } else {
      alert("Erro ao enviar os dados.");
    }
  } catch (error) {
    console.error("Erro ao enviar empresa:", error);
    alert("Erro de comunicação com o servidor.");
  }
});

// Validar cupom
async function validarCupom() {
  const codigo = document.getElementById("cupom").value.trim();
  try {
    const data = await apiPost("/cupom/validar", { codigo, evento_id: parseInt(eventoId) });
    const msg = document.getElementById("msg-cupom");

    if (data.status) {
      cupomAplicado = data.cupom;
      msg.textContent = `✅ Cupom válido! Desconto: ${cupomAplicado.desconto}`;
      msg.style.color = "lightgreen";

      document.getElementById("wrapNormalBtn").style.display = "none";
      document.getElementById("botaoCupom").innerHTML = cupomAplicado.botao_pagseguro_html;
      document.getElementById("wrapCupomBtn").style.display = "block";

      // 🔹 Captura clique no botão de cupom
      const pagSeguroCupomBtn = document.querySelector("#botaoCupom form, #botaoCupom a, #botaoCupom button");
      if (pagSeguroCupomBtn) {
        pagSeguroCupomBtn.addEventListener("click", () => {
          localStorage.setItem("compraRealizada", "true");
        });
      }
    } else {
      cupomAplicado = null;
      msg.textContent = "❌ Cupom inválido.";
      msg.style.color = "red";

      document.getElementById("wrapNormalBtn").style.display = "block";
      document.getElementById("wrapCupomBtn").style.display = "none";
      document.getElementById("botaoCupom").innerHTML = "";
    }
  } catch (error) {
    console.error("Erro ao validar cupom:", error);
    alert("Erro ao validar cupom.");
  }
}
