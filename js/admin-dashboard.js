// =======================
// admin-dashboard.js
// Painel do Administrador — Categorias / Eventos / Compras / Cupons
// Usa as funções globais expostas por js/api.js: apiGet, apiPost, apiPut, apiDelete
// =======================

/* ---------- Helpers ---------- */
/* ---------- Helpers ---------- */
function isOk(res) {
  return res && (res.status === true || res.status_code === 200 || res.status_code === 201);
}

function formatDate(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  return d.toLocaleDateString("pt-BR"); // ex: 15/10/2025
}

function formatTime(time) {
  if (!time) return "";
  const t = typeof time === "string" ? time : String(time);
  return t.slice(0,5); // pega HH:mm
}

function formatDateTime(isoDateTime) {
  if (!isoDateTime) return "";
  const d = new Date(isoDateTime);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); 
  // ex: 15/10/2025 19:30
}

function parseValorBRL(valorStr) {
  if (!valorStr) return 0;

  // Remove espaços
  let v = valorStr.trim();

  // Remove R$ e espaços
  v = v.replace("R$", "").trim();

  // Caso tenha ponto como separador de milhar e vírgula como decimal
  if (/,\d{1,2}$/.test(v)) {
    v = v.replace(/\./g, "").replace(",", ".");
  } else {
    // Caso só tenha vírgula (sem milhar)
    v = v.replace(",", ".");
  }

  const num = parseFloat(v);
  return isNaN(num) ? 0 : num;
}

function formatarMoeda(input) {
  let valor = input.value.replace(/\D/g, ""); // só números
  valor = (parseInt(valor, 10) / 100).toFixed(2) + "";
  valor = valor.replace(".", ",");
  valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  input.value = valor;
}

const Toast = {
  show(msg, type = "success") {
    const wrap = document.getElementById("toastContainer");
    if (!wrap) return alert(msg);
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
};

const Modal = {
  open(title, bodyHtml, footerHtml) {
    const modal = document.getElementById("modal");
    if (!modal) {
      alert(title + "\n\n" + bodyHtml);
      return;
    }
    document.getElementById("modalTitle").innerText = title;
    document.getElementById("modalBody").innerHTML = bodyHtml;
    document.getElementById("modalFooter").innerHTML = footerHtml || `<button class="btn" onclick="Modal.close()">Fechar</button>`;
    modal.style.display = "block";
    modal.setAttribute("aria-hidden", "false");
  },
  close() {
    const modal = document.getElementById("modal");
    if (!modal) return;

    // --- destruir editor se existir (evita que o textarea continue invisível) ---
    if (window.editorDescricao && typeof window.editorDescricao.destroy === "function") {
      // destroy retorna Promise
      window.editorDescricao.destroy().catch(err => console.warn("Erro ao destruir editorDescricao:", err));
      window.editorDescricao = null;
    }

    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    document.getElementById("modalBody").innerHTML = "";
    document.getElementById("modalFooter").innerHTML = "";
  }
};


function setActive(btnId) {
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  if (!btnId) return;
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.add("active");
}

/* ---------- AdminUI ---------- */
const AdminUI = {
  /* ---------------- Categories ---------------- */
  async showCategorias() {
    setActive("btnCategorias");
    try {
      const r = await apiGet("/categoria");
      const categorias = r.dados || r.categorias || [];
      const main = document.getElementById("conteudo");
      main.innerHTML = `
        <section class="card">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <h2>Categorias</h2>
              <p class="subtle">Crie, edite ou remova categorias</p>
            </div>
            <div><button class="btn" id="btnNovaCategoria">+ Nova categoria</button></div>
          </div>
          <div style="margin-top:14px" class="table-wrap">
            <table>
              <thead><th>Nome</th><th>Editar ou Excluir</th></tr></thead>
              <tbody>
                ${categorias.length ? categorias.map(c => `
                  <tr>
                    <td>${c.nome}</td>
                    <td style="width:260px">
                      <div style="display:flex;gap:8px">
                        <button class="btn ghost" data-act="edit" data-id="${c.id}" data-nome="${c.nome}">Editar</button>
                        <button class="btn 4danger" data-act="del" data-id="${c.id}">Excluir</button>
                      </div>
                    </td>
                  </tr>
                `).join("") : `<tr><td colspan="3">Nenhuma categoria cadastrada.</td></tr>`}
              </tbody>
            </table>
          </div>
        </section>
      `;

      document.getElementById("btnNovaCategoria").addEventListener("click", () => this.openCategoriaForm());

      // Delegação de eventos na tabela (sem { once: true })
      const tbody = document.querySelector("#conteudo tbody");
      tbody.addEventListener("click", async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const act = btn.dataset.act, id = btn.dataset.id, nome = btn.dataset.nome;
        if (act === "del") {
          if (!confirm("Confirma exclusão da categoria?")) return;
          const res = await apiDelete(`/categoria/${id}`);
          if (isOk(res)) Toast.show("Categoria excluída.");
          else Toast.show(res.message || "Erro ao excluir (possível vínculo a eventos).", "warn");
          this.showCategorias();
        }
        if (act === "edit") this.editCategoria(id, nome);
      });
    } catch (err) {
      console.error(err);
      Toast.show("Erro ao buscar categorias", "error");
    }
  },

  async editEvento(id) {
  try {
    const r = await apiGet(`/evento/${id}`);
    const e = r.evento || r.dados;
    if (!e) {
      Toast.show("Evento não encontrado.", "warn");
      return;
    }
    this.openEventoForm(e);
  } catch (err) {
    console.error(err);
    Toast.show("Erro ao carregar evento.", "error");
  }
},

  openCategoriaForm(prefill) {
    Modal.open(prefill ? "Editar Categoria" : "Nova Categoria", `
      <form id="formCategoria" class="form-grid">
        <label>Nome
          <input id="inputNomeCategoria" name="nome" required value="${prefill?.nome || ""}" />
        </label>
      </form>
    `, `
      <button class="btn ghost" type="button" id="btnCancelCat">Cancelar</button>
      <button class="btn" id="btnSalvarCat">Salvar</button>
    `);

    document.getElementById("btnCancelCat").addEventListener("click", () => Modal.close());
    document.getElementById("btnSalvarCat").addEventListener("click", async () => {
      const nome = document.getElementById("inputNomeCategoria").value.trim();
      if (!nome) { Toast.show("Preencha o nome.", "warn"); return; }
      try {
        const res = prefill?.id ? await apiPut(`/categoria/${prefill.id}`, { nome }) : await apiPost("/categoria", { nome });
        Modal.close();
        if (isOk(res)) {
          Toast.show("Categoria salva.");
          this.showCategorias();
        } else {
          Toast.show(res.message || "Erro ao salvar categoria.", "error");
        }
      } catch (err) {
        console.error(err);
        Toast.show("Erro ao salvar categoria.", "error");
      }
    });
  },

  async editCategoria(id, nome) {
    this.openCategoriaForm({ id, nome });
  },

 /* ---------------- Eventos ---------------- */
  async showEventos() {
    setActive("btnEventos");
    try {
      const r = await apiGet("/evento");
      const eventos = r.eventos || r.dados || [];
      const main = document.getElementById("conteudo");
      main.innerHTML = `
        <section class="card">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <h2>Eventos</h2>
              <p class="subtle">Gerencie seus eventos: criar, editar, cancelar e excluir</p>
            </div>
            <div><button class="btn" id="btnNovoEvento">+ Novo evento</button></div>
          </div>

          <div style="margin-top:14px" class="table-wrap">
            <table>
<thead><tr><th>Nome</th><th>Data</th><th>Valor</th><th>Status</th><th>Opções</th></tr></thead>
              <tbody>
                ${eventos.length ? eventos.map(ev => `
                  <tr>
                    <td>${ev.nome}</td>
                    <td>${formatDate(ev.data_evento || ev.data)}</td>
                    <td>${Number(ev.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                    <td>${ev.status ? (ev.status === "ativo" ? `<span class="badge success">ativo</span>` : `<span class="badge">${ev.status}</span>`) : "-"}</td>
                    <td style="width:420px">
                      <div style="display:flex;flex-wrap:wrap;gap:8px">
                        <button class="btn ghost" data-act="edit" data-id="${ev.id}">Editar</button>
                        <button class="btn warn" data-act="cancel" data-id="${ev.id}">Cancelar</button>
                        <button class="btn danger" data-act="del" data-id="${ev.id}">Excluir</button>
                        <button class="btn" data-act="cupons" data-id="${ev.id}">Cupons</button>
                      </div>
                    </td>
                  </tr>
                `).join("") : `<tr><td colspan="6">Nenhum evento encontrado.</td></tr>`}
              </tbody>
            </table>
          </div>
        </section>
      `;

      document.getElementById("btnNovoEvento").addEventListener("click", () => this.openEventoForm());

      const tbody = document.querySelector("#conteudo tbody");
      tbody.addEventListener("click", async (e) => {
        const btn = e.target.closest("button"); if (!btn) return;
        const act = btn.dataset.act; const id = btn.dataset.id;
        if (act === "edit") {
          this.editEvento(id);
        } else if (act === "cancel") {
          if (!confirm("Confirma cancelamento do evento?")) return;
          const res = await apiPut(`/evento/${id}/cancelar`, {});
          if (isOk(res)) Toast.show("Evento cancelado.");
          else Toast.show(res.message || "Erro ao cancelar.", "error");
          this.showEventos();
        } else if (act === "del") {
          if (!confirm("Excluir o evento?")) return;
          const res = await apiDelete(`/evento/${id}`);
          if (isOk(res)) Toast.show("Evento excluído.");
          else Toast.show(res.message || "Erro ao excluir.", "error");
          this.showEventos();
        } else if (act === "cupons") {
          this.showCupons(id);
        }
      });

    } catch (err) {
      console.error(err);
      Toast.show("Erro ao buscar eventos", "error");
    }
  },

  async openEventoForm(prefill) {
    const rCat = await apiGet("/categoria");
    const categorias = rCat.categorias || rCat.dados || [];

    Modal.open(prefill ? "Editar Evento" : "Novo Evento", `
      <form id="formEvento" class="form-grid">
        <div class="form-2">
          <label>Nome 
            <input id="ev_nome" name="nome" required value="${prefill?.nome || ""}">
          </label>
          <label>Categoria 
            <select id="ev_categoria" name="categoria_id">
              <option value="">-- Sem categoria --</option>
              ${categorias.map(c => `<option value="${c.id}" ${prefill?.categoria_id == c.id ? "selected" : ""}>${c.nome}</option>`).join("")}
            </select>
          </label>
        </div>

        <label>Descrição 
          <textarea id="ev_descricao" name="descricao">${prefill?.descricao || ""}</textarea>
        </label>

        <div class="form-3">
          <label>Valor (R$) 
            <input id="ev_valor" name="valor" type="text" required 
              value="${prefill ? Number(prefill.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ""}" 
              oninput="formatarMoeda(this)">
          </label>
          <label>Data 
            <input id="ev_data" name="data_evento" type="date" required value="${prefill?.data_evento || ""}">
          </label>
          <label>Horário 
            <input id="ev_hora" name="horario_evento" type="time" required 
              value="${prefill?.horario_evento ? String(prefill.horario_evento).slice(0,5) : ""}">
          </label>
        </div>

        <div class="form-2">
          <label>URL da foto 
            <input id="ev_foto" name="foto_url" value="${prefill?.foto_url || ""}">
          </label>
          <label>Limite participantes 
            <input id="ev_limite" name="limite_participantes" type="number" min="1" required value="${prefill?.limite_participantes || 1}">
          </label>
        </div>

        <label>HTML do botão PagSeguro (valor normal) 
          <textarea id="ev_botao" name="botao_pagseguro">${prefill?.botao_pagseguro || ""}</textarea>
        </label>

        <label>Status
          <select id="ev_status" name="status">
            <option value="ativo" ${prefill?.status === "ativo" ? "selected" : ""}>ativo</option>
            <option value="cancelado" ${prefill?.status === "cancelado" ? "selected" : ""}>cancelado</option>
            <option value="excluido" ${prefill?.status === "excluido" ? "selected" : ""}>excluido</option>
          </select>
        </label>
      </form>
    `, `
      <button class="btn ghost" type="button" id="btnCancelEvento">Cancelar</button>
      <button class="btn" id="btnSalvarEvento">Salvar</button>
    `);

    if (window.editorDescricao && typeof window.editorDescricao.destroy === "function") {
      try { await window.editorDescricao.destroy(); } catch {}
      window.editorDescricao = null;
    }

    const el = document.querySelector('#ev_descricao');
    const EditorClass = window.ClassicEditor || (window.CKEDITOR && window.CKEDITOR.ClassicEditor);

    if (el && EditorClass) {
      try {
        window.editorDescricao = await EditorClass.create(el, {
          removePlugins: [
            'RealTimeCollaborativeComments',
            'Comments',
            'TrackChanges',
            'TrackChangesData',
            'RevisionHistory',
            'PresenceList',
            'RealTimeCollaborativeTrackChanges',
            'RealTimeCollaborativeRevisionHistory',
            'Pagination',
            'WProofreader',
            'MathType'
          ],
          toolbar: {
            items: [
              'heading', '|',
              'bold', 'italic', 'underline', 'link', '|',
              'bulletedList', 'numberedList', '|',
              'alignment', 'fontColor', 'fontBackgroundColor',
              '|', 'undo', 'redo'
            ]
          }
        });
        if (prefill?.descricao) window.editorDescricao.setData(prefill.descricao);
      } catch (err) {
        console.error("Erro inicializando CKEditor:", err);
        Toast.show("Editor rico não carregou, textarea simples em uso.", "warn");
      }
    }

    document.getElementById("btnCancelEvento").addEventListener("click", () => Modal.close());

    document.getElementById("btnSalvarEvento").addEventListener("click", async () => {
      const valorInput = document.getElementById("ev_valor").value;
      const catVal = document.getElementById("ev_categoria").value;

      const ev = {
        nome: document.getElementById("ev_nome").value,
        descricao: (window.editorDescricao && typeof window.editorDescricao.getData === "function")
                    ? window.editorDescricao.getData()
                    : document.getElementById("ev_descricao").value,
        valor: parseValorBRL(valorInput),
        foto_url: document.getElementById("ev_foto").value,
        categoria_id: catVal ? parseInt(catVal) : null,
        data_evento: document.getElementById("ev_data").value,
        horario_evento: document.getElementById("ev_hora").value,
        limite_participantes: parseInt(document.getElementById("ev_limite").value || 1),
        botao_pagseguro: document.getElementById("ev_botao").value,
        status: document.getElementById("ev_status").value
      };

      try {
        const res = prefill?.id
          ? await apiPut(`/evento/${prefill.id}`, ev)
          : await apiPost("/evento", ev);

        Modal.close();
        if (isOk(res)) {
          Toast.show("Evento salvo.");
          this.showEventos();
        } else {
          Toast.show(res.message || "Erro ao salvar evento.", "error");
        }
      } catch (err) {
        console.error(err);
        Toast.show("Erro ao salvar evento.", "error");
      }
    });
  },

  async editEvento(id) {
    try {
      const r = await apiGet(`/evento/${id}`);
      const ev = r.evento || r.dados;
      if (!ev) return Toast.show("Evento não encontrado", "error");
      this.openEventoForm(ev);
    } catch (err) {
      console.error(err);
      Toast.show("Erro ao buscar evento", "error");
    }
  },


  /* ---------------- Compras / Formulários ---------------- */
    /* ---------------- Compras / Formulários ---------------- */
  async showCompras() {
  setActive("btnCompras");
  try {
    const r = await apiGet("/evento");
    const eventos = r.eventos || r.dados || [];
    const main = document.getElementById("conteudo");

    main.innerHTML = `
      <section class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <h2>Compras / Formulários</h2>
            <p class="subtle">Veja empresas que compraram e seus participantes</p>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <select id="selEventoCompras">
              <option value="">Todos os eventos</option>
              ${eventos.map(ev => `<option value="${ev.id}">${ev.nome}</option>`).join("")}
            </select>
          </div>
        </div>

        <div id="wrapEmpresas" style="margin-top:12px" class="table-wrap">
        <div style="margin-top:14px; display:flex; justify-content:flex-end">
  <button class="btn" id="btnExportarCompras">📊 Exportar para Excel</button>
</div>

          <table>
            <thead>
              <tr><th>Empresa</th><th>Evento</th><th>Ver Participantes</th></tr>
            </thead>
            <tbody id="tbodyEmpresas"></tbody>
          </table>
        </div>
      </section>
    `;

    const tbody = document.getElementById("tbodyEmpresas");

    const carregarEmpresas = async (eventoId = "") => {
      try {
        let empresas = [];
        if (eventoId) {
          const re = await apiGet(`/empresa/evento/${eventoId}`);
          empresas = re.empresas || re.dados || [];
          empresas.forEach(em => em.evento_nome = eventos.find(e => e.id == eventoId)?.nome || "");
        } else {
          for (let ev of eventos) {
            const re = await apiGet(`/empresa/evento/${ev.id}`);
            const emps = re.empresas || re.dados || [];
            emps.forEach(em => em.evento_nome = ev.nome);
            empresas = empresas.concat(emps);
          }
        }

        tbody.innerHTML = empresas.length ? empresas.map(em => `
          <tr>
            <td>
              <strong>${em.nome_empresa}</strong>
              <div class="subtle">${em.email} • ${em.telefone || "—"}</div>
              <div class="subtle">CPF: ${em.cpf || "—"} • CNPJ: ${em.cnpj || "—"}</div>
            </td>
            <td>${em.evento_nome || "—"}</td>
            <td>
              <button class="btn ghost" 
                      data-act="ver-parts" 
                      data-id="${em.id}" 
                      data-nome="${String(em.nome_empresa).replace(/"/g, '&quot;')}">
                Participantes
              </button>
            </td>
          </tr>
        `).join("") : `<tr><td colspan="3">Nenhuma compra encontrada.</td></tr>`;

      } catch (err) {
        console.error(err);
        Toast.show("Erro ao carregar empresas.", "error");
      }
    };

    carregarEmpresas();

    document.getElementById("selEventoCompras").addEventListener("change", (e) => {
      carregarEmpresas(e.target.value);
    });

    tbody.addEventListener("click", async (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      if (btn.dataset.act === "ver-parts") {
        this.verParticipantes(btn.dataset.id, btn.dataset.nome);
      }
    });

  } catch (err) {
    console.error(err);
    Toast.show("Erro ao buscar eventos.", "error");

    document.getElementById("btnExportarCompras").addEventListener("click", () => {
  window.location.href = "http://localhost:5050/v1/100open/exportar-compras";
});

  }
},


async verParticipantes(empresaId, nomeEmpresa = "") {
  try {
    const r = await apiGet(`/participante/empresa/${empresaId}`);
    const participantes = r.participantes || r.dados || [];
    Modal.open(`Participantes — ${nomeEmpresa || "Empresa"}`, `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>Email</th><th>Telefone</th></tr></thead>
          <tbody>
            ${participantes.length ? participantes.map(p => `
              <tr>
                <td>${p.nome}</td>
                <td>${p.email || "—"}</td>
                <td>${p.telefone || "—"}</td>
              </tr>
            `).join("") : `<tr><td colspan="3">Nenhum participante.</td></tr>`}
          </tbody>
        </table>
      </div>
    `, `<button class="btn" onclick="Modal.close()">Fechar</button>`);
  } catch (err) {
    console.error(err);
    Toast.show("Erro ao carregar participantes.", "error");
  }
}

,
    /* ---------------- Cupons ---------------- */
  async showCupons(eventoId) {
    try {
      const eventoResp = await apiGet(`/evento/${eventoId}`);
      const evento = eventoResp.evento || eventoResp.dados || {};
      const r = await apiGet(`/cupom/evento/${eventoId}`);
      const list = r.cupons || r.dados || [];

Modal.open(`Cupons — ${evento.nome || "Evento"}`, `
            <div class="card" style="margin-bottom:12px">
          <h3>Adicionar cupom</h3>
          <form id="formCupom" class="form-grid">
            <div class="form-3">
              <label>Código <input name="codigo" required></label>
              <label>Desconto (R$) <input name="desconto" type="number" step="0.01" required></label>
              <label>Descrição <input name="descricao"></label>
            </div>
            <label>HTML do botão PagSeguro (com desconto) 
              <textarea name="botao_pagseguro_html" required></textarea>
            </label>
            <input type="hidden" name="evento_id" value="${eventoId}">
          </form>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="btn ghost" type="button" id="btnFecharCupons">Fechar</button>
            <button class="btn" id="btnAddCupom" type="button">Adicionar cupom</button>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Código / Descrição</th><th>Desconto</th><th>Ações</th></tr></thead>
            <tbody>
              ${list.length ? list.map(c => `
                <tr data-row-cupom="${c.id}">
                  <td><strong>${c.codigo}</strong>${c.descricao ? ` — ${c.descricao}` : ""}</td>
                  <td>R$ ${Number(c.desconto).toFixed(2)}</td>
                  <td>
                    <div style="display:flex;gap:8px">
                      <button class="btn ghost" data-act="ver-html" data-id="${c.id}">Ver HTML</button>
                      <button class="btn danger" data-act="del-cupom" data-id="${c.id}">Excluir</button>
                    </div>
                  </td>
                </tr>
              `).join("") : `<tr><td colspan="4">Nenhum cupom cadastrado.</td></tr>`}
            </tbody>
          </table>
        </div>
      `, ``);

      // botão fechar
      document.getElementById("btnFecharCupons").onclick = () => Modal.close();

      // botão adicionar cupom
      document.getElementById("btnAddCupom").onclick = async () => {
        const form = document.getElementById("formCupom");
        const data = Object.fromEntries(new FormData(form));
        data.evento_id = parseInt(data.evento_id);
        data.desconto = parseFloat(data.desconto);

        try {
          const res = await apiPost("/cupom", data);
          if (isOk(res)) {
            Toast.show("Cupom adicionado.");
            this.showCupons(eventoId); // recarrega lista
          } else {
            Toast.show(res.message || "Erro ao adicionar cupom.", "error");
          }
        } catch (err) {
          console.error(err);
          Toast.show("Erro ao adicionar cupom.", "error");
        }
      };

      // ações ver-html / excluir
      document.getElementById("modalBody").addEventListener("click", async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const act = btn.dataset.act;
        const cid = btn.dataset.id;

        if (act === "ver-html") {
          const cup = list.find(x => String(x.id) === String(cid));
          const html = cup?.botao_pagseguro_html || "<i>Sem HTML disponível</i>";
          Modal.open(`Botão PagSeguro — Cupom #${cid}`, `<div style="padding:8px;border:1px solid #ddd;border-radius:6px;overflow:auto">${html}</div>`, `<button class="btn" onclick="Modal.close()">Fechar</button>`);
        }

        if (act === "del-cupom") {
          if (!confirm("Deseja realmente excluir este cupom?")) return;
          try {
            const res = await apiDelete(`/cupom/${cid}`);
            if (isOk(res)) {
              Toast.show("Cupom excluído.");
              this.showCupons(eventoId);
            } else {
              Toast.show(res.message || "Erro ao excluir cupom.", "error");
            }
          } catch (err) {
            console.error(err);
            Toast.show("Erro ao excluir cupom.", "error");
          }
        }
      });

    } catch (err) {
      console.error(err);
      Toast.show("Erro ao acessar cupons.", "error");
    }
  }



};

/* ---------- Inicialização + cliques da sidebar sem inline ---------- */
window.addEventListener("load", () => {
  // Sidebar (mesmo com onclick no HTML, registramos listeners robustos)
  const btnCat = document.getElementById("btnCategorias");
  const btnEvt = document.getElementById("btnEventos");
  const btnCmp = document.getElementById("btnCompras");

  btnCat && btnCat.addEventListener("click", (e) => { e.preventDefault(); AdminUI.showCategorias(); });
  btnEvt && btnEvt.addEventListener("click", (e) => { e.preventDefault(); AdminUI.showEventos(); });
  btnCmp && btnCmp.addEventListener("click", (e) => { e.preventDefault(); AdminUI.showCompras(); });

  // Tela inicial
  AdminUI.showEventos();
});
