// ══════════════════════════════════════════════
//  Cantina do Lindaura — JS principal
// ══════════════════════════════════════════════

// ── Estado global ──────────────────────────────
let cardapio = {
  titulo: '',
  descricao: '',
  itens: [],          // { id, nome, categoria, preco, estoque, ativo }
  reservasAbertas: true
};

let pedidos = [];    // { id, senha, nome, turma, itens, total, status, hora, formaPagamento, pago }
let proximaSenha = 1;
let ultimaSenhaChamada = null;
let filtroAtivo = 'todos';
let pixConfig = { tipo: '', chave: '' };

// ── Persistência ───────────────────────────────
function salvarEstado() {
  localStorage.setItem('cantina_cardapio', JSON.stringify(cardapio));
  localStorage.setItem('cantina_pedidos', JSON.stringify(pedidos));
  localStorage.setItem('cantina_senha', String(proximaSenha));
  localStorage.setItem('cantina_pix', JSON.stringify(pixConfig));
}

function carregarEstado() {
  try {
    const c = localStorage.getItem('cantina_cardapio');
    if (c) cardapio = JSON.parse(c);
    const p = localStorage.getItem('cantina_pedidos');
    if (p) pedidos = JSON.parse(p);
    const s = localStorage.getItem('cantina_senha');
    if (s) proximaSenha = parseInt(s) || 1;
    const px = localStorage.getItem('cantina_pix');
    if (px) pixConfig = JSON.parse(px);
    const tema = localStorage.getItem('cantina_tema');
    if (tema === 'escuro') aplicarTema('escuro', false);
  } catch (e) {}
}

// ── Navegação ──────────────────────────────────
function irPara(pagina, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + pagina).classList.add('active');
  if (btn) btn.classList.add('active');
  if (pagina === 'aluno') renderAluno();
}

// ── Tema escuro ────────────────────────────────
let temaAtual = 'claro';

function toggleTema() {
  aplicarTema(temaAtual === 'claro' ? 'escuro' : 'claro', true);
}

function aplicarTema(tema, salvar) {
  temaAtual = tema;
  if (tema === 'escuro') {
    document.documentElement.setAttribute('data-tema', 'escuro');
  } else {
    document.documentElement.removeAttribute('data-tema');
  }
  const btn = document.getElementById('btn-tema');
  if (btn) btn.textContent = tema === 'escuro' ? '☀️' : '🌙';
  if (salvar) localStorage.setItem('cantina_tema', tema);
}

// ── Toast ──────────────────────────────────────
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── PIN da cantina ─────────────────────────────
function entrarCantina() {
  const pin = document.getElementById('input-pin').value.trim();
  const pinSalvo = localStorage.getItem('cantina_pin') || '1234';
  if (pin === pinSalvo) {
    document.getElementById('area-pin').style.display = 'none';
    document.getElementById('area-cantina').style.display = 'block';
    renderCantina();
  } else {
    toast('Senha incorreta!');
    document.getElementById('input-pin').value = '';
  }
}

// ── Cardápio ───────────────────────────────────
function adicionarItem() {
  const nome = document.getElementById('novo-item-nome').value.trim();
  const cat = document.getElementById('novo-item-cat').value;
  const preco = parseFloat(document.getElementById('novo-item-preco').value) || 0;
  const qtdVal = document.getElementById('novo-item-qtd').value;
  const estoque = qtdVal === '' ? null : parseInt(qtdVal);

  if (!nome) { toast('Digite o nome do item.'); return; }

  cardapio.itens.push({
    id: Date.now(),
    nome, cat, preco,
    estoque,           // null = sem limite
    ativo: true
  });

  document.getElementById('novo-item-nome').value = '';
  document.getElementById('novo-item-preco').value = '';
  document.getElementById('novo-item-qtd').value = '';
  renderListaItens();
}

function removerItem(id) {
  cardapio.itens = cardapio.itens.filter(i => i.id !== id);
  renderListaItens();
}

function renderListaItens() {
  const el = document.getElementById('cant-lista-itens');
  if (!cardapio.itens.length) {
    el.innerHTML = '<div style="font-size:0.85rem;color:var(--cinza-texto);padding:0.5rem 0">Nenhum item ainda.</div>';
    return;
  }
  el.innerHTML = cardapio.itens.map(item => {
    const badges = { principal:'cat-principal', acomp:'cat-acomp', bebida:'cat-bebida', sobremesa:'cat-sobremesa', outro:'cat-outro' };
    const labels = { principal:'Principal', acomp:'Acomp.', bebida:'Bebida', sobremesa:'Sobremesa', outro:'Outro' };
    const vendidos = pedidos.filter(p => p.status !== 'cancelado').reduce((acc, p) => {
      return acc + (p.itens.filter(i => i.id === item.id).reduce((a,i)=>a+i.qtd,0));
    }, 0);
    const restante = item.estoque !== null ? item.estoque - vendidos : null;
    const estoqueClass = restante === null ? 'ok' : restante <= 0 ? 'esgotado' : restante <= 3 ? 'baixo' : 'ok';
    const estoqueLabel = restante === null ? 'Sem limite' : restante <= 0 ? 'Esgotado' : `${restante} restante${restante !== 1 ? 's' : ''}`;

    return `<div class="cant-item-row">
      <div class="cant-item-nome">${item.nome}
        <span class="cat-label ${badges[item.cat]||'cat-outro'}">${labels[item.cat]||'Outro'}</span>
      </div>
      <div class="cant-item-info">
        <span class="cant-item-preco">R$ ${item.preco.toFixed(2)}</span>
        <span class="estoque-badge ${estoqueClass}">${estoqueLabel}</span>
      </div>
      <button class="btn-del" onclick="removerItem(${item.id})" title="Remover">✕</button>
    </div>`;
  }).join('');
}

function toggleReservas() {
  cardapio.reservasAbertas = !cardapio.reservasAbertas;
  const btn = document.getElementById('toggle-reservas');
  btn.classList.toggle('on', cardapio.reservasAbertas);
  salvarEstado();
  renderAvisoEncerrado();
}

function salvarCardapio() {
  cardapio.titulo = document.getElementById('cant-titulo').value.trim();
  cardapio.descricao = document.getElementById('cant-desc').value.trim();
  salvarEstado();
  toast('Cardápio publicado!');
  renderAluno();
}

// ── PIX / Pagamento ────────────────────────────
function salvarPix() {
  pixConfig.tipo = document.getElementById('pix-tipo-select').value;
  pixConfig.chave = document.getElementById('pix-chave-input').value.trim();
  salvarEstado();
  toast('Dados de pagamento salvos!');
}

// ── Render Aluno ───────────────────────────────
function renderAluno() {
  const semCard = document.getElementById('aluno-sem-cardapio');
  const comCard = document.getElementById('aluno-com-cardapio');

  if (!cardapio.itens.length) {
    semCard.style.display = 'block';
    comCard.style.display = 'none';
    return;
  }
  semCard.style.display = 'none';
  comCard.style.display = 'block';

  document.getElementById('aluno-titulo-prato').textContent = cardapio.titulo || 'Cardápio do dia';
  document.getElementById('aluno-desc-prato').textContent = cardapio.descricao || '';

  const pill = document.getElementById('aluno-pill');
  pill.className = 'pill-status ' + (cardapio.reservasAbertas ? 'pill-aberto' : 'pill-encerrado');
  pill.innerHTML = `<span class="dot"></span> ${cardapio.reservasAbertas ? 'Abertas' : 'Encerradas'}`;

  renderAvisoEncerrado();
  renderSelecaoItens();
  renderPixAluno();
}

function renderAvisoEncerrado() {
  const aviso = document.getElementById('aviso-encerrado');
  const btn = document.getElementById('btn-reservar');
  if (aviso) aviso.style.display = cardapio.reservasAbertas ? 'none' : 'block';
  if (btn) btn.disabled = !cardapio.reservasAbertas;
}

function renderSelecaoItens() {
  const el = document.getElementById('lista-selecao-itens');
  if (!el) return;

  const vendidosPorItem = {};
  pedidos.filter(p => p.status !== 'cancelado').forEach(p => {
    p.itens.forEach(i => { vendidosPorItem[i.id] = (vendidosPorItem[i.id] || 0) + i.qtd; });
  });

  el.innerHTML = cardapio.itens.map(item => {
    const vendidos = vendidosPorItem[item.id] || 0;
    const restante = item.estoque !== null ? item.estoque - vendidos : null;
    const esgotado = restante !== null && restante <= 0;
    const classeItem = esgotado ? 'item-cardapio esgotado' : 'item-cardapio';
    const estoqueLabel = restante === null ? '' : esgotado ? 'Esgotado' : restante <= 3 ? `Apenas ${restante}` : `${restante} disponíveis`;
    const estoqueClass = restante === null ? '' : esgotado ? 'esgotado' : restante <= 3 ? 'baixo' : '';

    return `<div class="${classeItem}">
      <label class="checkbox-wrap">
        <input type="checkbox" name="item" value="${item.id}" ${esgotado ? 'disabled' : ''}>
        <span class="checkbox-box"></span>
        <span class="item-nome">${item.nome}</span>
        ${item.preco > 0 ? `<span class="item-preco">R$ ${item.preco.toFixed(2)}</span>` : ''}
        ${estoqueLabel ? `<span class="item-estoque ${estoqueClass}">${estoqueLabel}</span>` : ''}
      </label>
    </div>`;
  }).join('');
}

function renderPixAluno() {
  const box = document.getElementById('pix-info-aluno');
  if (!box) return;
  if (pixConfig.tipo && pixConfig.chave) {
    box.style.display = 'block';
    document.getElementById('pix-aluno-tipo').textContent = pixConfig.tipo.toUpperCase();
    document.getElementById('pix-aluno-chave').textContent = pixConfig.chave;
  } else {
    box.style.display = 'none';
  }
}

// ── Reserva ────────────────────────────────────
function fazerReserva() {
  if (!cardapio.reservasAbertas) { toast('Reservas encerradas.'); return; }

  const nome = document.getElementById('input-nome').value.trim();
  const turma = document.getElementById('input-turma').value;
  if (!nome) { toast('Digite seu nome.'); return; }
  if (!turma) { toast('Selecione sua turma.'); return; }

  const checks = [...document.querySelectorAll('#lista-selecao-itens input[type=checkbox]:checked')];
  if (!checks.length) { toast('Selecione ao menos um item.'); return; }

  const itensPedido = checks.map(c => {
    const item = cardapio.itens.find(i => i.id == c.value);
    return { id: item.id, nome: item.nome, preco: item.preco, qtd: 1 };
  });

  const total = itensPedido.reduce((acc, i) => acc + i.preco * i.qtd, 0);
  const forma = document.querySelector('input[name="forma-pagamento"]:checked')?.value || 'pix';
  const senha = proximaSenha++;

  const pedido = {
    id: Date.now(),
    senha,
    nome, turma,
    itens: itensPedido,
    total,
    status: 'aguardando',
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    formaPagamento: forma,
    pago: forma !== 'pix'  // cartão e dinheiro marcados como "a confirmar" — só PIX fica "pendente"
  };

  pedidos.push(pedido);
  salvarEstado();

  // Mostra confirmação
  document.getElementById('area-formulario').style.display = 'none';
  document.getElementById('area-confirmacao').style.display = 'block';
  document.getElementById('senha-gerada').textContent = String(senha).padStart(2, '0');

  const resumo = document.getElementById('resumo-itens-aluno');
  const icones = { pix: '💸 PIX', cartao: '💳 Cartão', dinheiro: '💵 Dinheiro' };
  resumo.innerHTML = `
    <ul>${itensPedido.map(i => `<li>${i.nome}${i.preco > 0 ? ' — R$ ' + i.preco.toFixed(2) : ''}</li>`).join('')}</ul>
    ${total > 0 ? `<div class="total-pedido">Total: R$ ${total.toFixed(2)}</div>` : ''}
    <div style="margin-top:0.5rem; font-size:0.8rem; color:var(--cinza-texto)">Pagamento: ${icones[forma] || forma}</div>
    ${forma === 'pix' ? `<div style="margin-top:0.4rem; font-size:0.78rem; color:var(--laranja); font-weight:600">⚠️ Confirme o pagamento via PIX antes de retirar.</div>` : ''}
  `;

  renderCantina();
}

function cancelarReserva() {
  // Encontra o último pedido desse "aluno" (último da sessão)
  const senha = parseInt(document.getElementById('senha-gerada').textContent);
  const idx = pedidos.findIndex(p => p.senha === senha);
  if (idx !== -1) {
    pedidos[idx].status = 'cancelado';
    salvarEstado();
    toast('Reserva cancelada.');
  }
  document.getElementById('area-confirmacao').style.display = 'none';
  document.getElementById('area-formulario').style.display = 'block';
  document.getElementById('input-nome').value = '';
  document.getElementById('input-turma').value = '';
  renderSelecaoItens();
  renderCantina();
}

// ── Render Cantina ─────────────────────────────
function renderCantina() {
  renderListaItens();
  renderStats();
  renderContagem();
  renderFaturamento();
  renderChamada();
  renderPedidos();

  // Preenche campos salvos
  document.getElementById('cant-titulo').value = cardapio.titulo;
  document.getElementById('cant-desc').value = cardapio.descricao;
  document.getElementById('toggle-reservas').classList.toggle('on', cardapio.reservasAbertas);
  document.getElementById('pix-tipo-select').value = pixConfig.tipo || '';
  document.getElementById('pix-chave-input').value = pixConfig.chave || '';
}

function renderStats() {
  const ativos = pedidos.filter(p => p.status !== 'cancelado');
  document.getElementById('stat-total').textContent = ativos.length;
  document.getElementById('stat-aguardando').textContent = ativos.filter(p => p.status === 'aguardando').length;
  document.getElementById('stat-entregue').textContent = ativos.filter(p => p.status === 'entregue').length;
}

function renderContagem() {
  const el = document.getElementById('card-contagem');
  if (!cardapio.itens.length) {
    el.innerHTML = '<div style="font-size:0.85rem;color:var(--cinza-texto);padding:0.25rem 0">Sem itens no cardápio.</div>';
    return;
  }

  const vendidos = {};
  pedidos.filter(p => p.status !== 'cancelado').forEach(p => {
    p.itens.forEach(i => { vendidos[i.id] = (vendidos[i.id] || 0) + i.qtd; });
  });

  el.innerHTML = cardapio.itens.map(item => {
    const qtdVendida = vendidos[item.id] || 0;
    const max = item.estoque !== null ? item.estoque : Math.max(qtdVendida, 10);
    const pct = max > 0 ? Math.min(100, (qtdVendida / max) * 100) : 0;
    const restante = item.estoque !== null ? item.estoque - qtdVendida : null;
    const barClass = restante !== null && restante <= 0 ? 'esgotado' : restante !== null && restante <= 3 ? 'baixo' : '';
    const estoqueLabel = restante === null ? '∞' : `${restante} restante${restante !== 1 ? 's' : ''}`;

    return `<div class="contagem-item">
      <span class="contagem-nome">${item.nome}</span>
      <div class="barra-wrap"><div class="barra-fill ${barClass}" style="width:${pct}%"></div></div>
      <span class="contagem-num">${qtdVendida}</span>
      <span class="contagem-estoque">${estoqueLabel}</span>
    </div>`;
  }).join('');
}

function renderFaturamento() {
  const el = document.getElementById('card-faturamento');
  const ativos = pedidos.filter(p => p.status !== 'cancelado' && p.total > 0);
  if (!ativos.length) {
    el.innerHTML = '<div style="font-size:0.85rem;color:var(--cinza-texto)">Sem dados ainda.</div>';
    return;
  }

  const totalGeral = ativos.reduce((a, p) => a + p.total, 0);
  const porForma = {};
  ativos.forEach(p => {
    const f = p.formaPagamento || 'pix';
    porForma[f] = (porForma[f] || 0) + p.total;
  });

  const labels = { pix: '💸 PIX', cartao: '💳 Cartão', dinheiro: '💵 Dinheiro' };

  el.innerHTML = Object.entries(porForma).map(([f, v]) =>
    `<div class="faturamento-row"><span>${labels[f] || f}</span><span>R$ ${v.toFixed(2)}</span></div>`
  ).join('') +
  `<div class="faturamento-total"><span>Total</span><span>R$ ${totalGeral.toFixed(2)}</span></div>`;
}

function renderChamada() {
  const box = document.getElementById('box-chamada');
  if (!ultimaSenhaChamada) {
    box.className = 'chamada-box chamada-vazia';
    box.innerHTML = '<div style="width:100%">Nenhuma senha chamada ainda</div>';
    return;
  }
  const p = pedidos.find(x => x.senha === ultimaSenhaChamada && x.status !== 'cancelado');
  if (!p) return;
  const icones = { pix: '💸', cartao: '💳', dinheiro: '💵' };
  const statusPag = p.formaPagamento === 'pix' ? (p.pago ? '✅ PIX confirmado' : '⚠️ Aguardando PIX') : `${icones[p.formaPagamento] || ''} Pagar na retirada`;

  box.className = 'chamada-box';
  box.innerHTML = `
    <div>
      <div class="chamada-label">Senha chamada</div>
      <div class="chamada-senha">${String(p.senha).padStart(2,'0')}</div>
    </div>
    <div style="flex:1">
      <div class="chamada-nome">${p.nome} · ${p.turma}</div>
      <div class="chamada-itens">${p.itens.map(i=>i.nome).join(', ')}</div>
      <div style="font-size:0.75rem; margin-top:3px; opacity:0.85">${statusPag}</div>
    </div>
    <div>
      <button class="btn btn-laranja btn-sm" onclick="confirmarEntrega(${p.senha})">Entregar</button>
    </div>`;
}

function chamarProxima() {
  const aguardando = pedidos.filter(p => p.status === 'aguardando').sort((a, b) => a.senha - b.senha);
  if (!aguardando.length) { toast('Nenhum pedido aguardando.'); return; }
  ultimaSenhaChamada = aguardando[0].senha;
  renderChamada();
}

function confirmarEntrega(senha) {
  const p = pedidos.find(x => x.senha === senha);
  if (!p) return;

  // Se pagamento for PIX e não foi confirmado, perguntar
  if (p.formaPagamento === 'pix' && !p.pago) {
    if (!confirm(`O pagamento PIX de ${p.nome} foi confirmado?\n\nSenha: ${String(p.senha).padStart(2,'0')}\nTotal: R$ ${p.total.toFixed(2)}`)) {
      toast('Confirme o PIX antes de entregar.');
      return;
    }
    p.pago = true;
  }

  p.status = 'entregue';
  salvarEstado();
  toast(`Senha ${String(senha).padStart(2,'0')} entregue!`);
  ultimaSenhaChamada = null;
  renderCantina();
}

function confirmarPagamentoPix(senha) {
  const p = pedidos.find(x => x.senha === senha);
  if (!p) return;
  p.pago = true;
  salvarEstado();
  toast(`PIX confirmado para senha ${String(senha).padStart(2,'0')}!`);
  renderPedidos();
  renderChamada();
}

function renderPedidos() {
  const el = document.getElementById('lista-pedidos');
  let lista = pedidos.filter(p => p.status !== 'cancelado');

  if (filtroAtivo === 'aguardando') lista = lista.filter(p => p.status === 'aguardando');
  if (filtroAtivo === 'entregue') lista = lista.filter(p => p.status === 'entregue');

  if (!lista.length) {
    el.innerHTML = '<div class="lista-vazia"><div class="ico">🍽</div>Nenhum pedido ainda.</div>';
    return;
  }

  const icones = { pix: '💸', cartao: '💳', dinheiro: '💵' };

  el.innerHTML = lista.sort((a,b) => a.senha - b.senha).map(p => {
    const senhaClass = p.status === 'entregue' ? 'pedido-senha entregue' : 'pedido-senha';
    const statusPag = p.formaPagamento === 'pix'
      ? (p.pago
        ? `<span style="color:var(--verde);font-size:0.72rem;font-weight:600">✅ PIX confirmado</span>`
        : `<span style="color:var(--laranja);font-size:0.72rem;font-weight:600">⚠️ PIX pendente
            <button class="btn-sm btn" style="margin-left:6px;padding:2px 8px;font-size:0.7rem;background:var(--verde);color:#fff;border-radius:6px;border:none;cursor:pointer" onclick="confirmarPagamentoPix(${p.senha})">Confirmar PIX</button>
          </span>`)
      : `<span style="color:var(--cinza-texto);font-size:0.72rem">${icones[p.formaPagamento]||''} Pagar na retirada</span>`;

    const btnAcao = p.status === 'aguardando'
      ? `<button class="btn btn-laranja btn-sm" onclick="confirmarEntrega(${p.senha})">Entregar</button>`
      : `<span class="pill-status pill-encerrado" style="font-size:0.72rem">Entregue</span>`;

    return `<div class="pedido-item">
      <div class="${senhaClass}">${String(p.senha).padStart(2,'0')}</div>
      <div class="pedido-info">
        <div class="pedido-nome">${p.nome}</div>
        <div class="pedido-turma">${p.turma} · ${p.hora}</div>
        <div class="pedido-itens">${p.itens.map(i=>i.nome).join(', ')}</div>
        <div style="margin-top:3px">${statusPag}</div>
        ${p.total > 0 ? `<div class="pedido-total">R$ ${p.total.toFixed(2)}</div>` : ''}
      </div>
      <div>${btnAcao}</div>
    </div>`;
  }).join('');
}

function filtrar(tipo, btn) {
  filtroAtivo = tipo;
  document.querySelectorAll('.filtro-row .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderPedidos();
}

// ── Init ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  carregarEstado();
  renderAluno();

  // Injetar botão de tema na nav
  const nav = document.querySelector('nav');
  const temaBtn = document.createElement('button');
  temaBtn.id = 'btn-tema';
  temaBtn.className = 'nav-tab';
  temaBtn.textContent = temaAtual === 'escuro' ? '☀️' : '🌙';
  temaBtn.title = 'Alternar tema';
  temaBtn.onclick = toggleTema;
  nav.appendChild(temaBtn);
});
