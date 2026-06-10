var CATS = { principal:'Prato principal', acomp:'Acompanhamento', bebida:'Bebida', sobremesa:'Sobremesa', outro:'Outro' };

var E = {
  titulo:'', descricao:'', reservasAbertas:true, itens:[], pedidos:[],
  contadorSenha:0, senhaAtual:null, meuPedido:null, filtroAtual:'todos',
  cardapioPublicado:false,
  pagamento: { tipo: '', chave: '' }
};

/* ─── Persistência ─────────────────────────────────────────────────── */

function carregar() {
  try {
    var s = localStorage.getItem('cantina_v4');
    if (s) {
      var salvo = JSON.parse(s);
      var hoje = new Date().toDateString();
      if (salvo.dia === hoje) {
        var mp = E.meuPedido;
        Object.assign(E, salvo);
        E.dia = undefined;
        E.meuPedido = mp;
        if (!E.pagamento) E.pagamento = { tipo: '', chave: '' };
      }
    }
    var meu = sessionStorage.getItem('meu_pedido_v4');
    if (meu) E.meuPedido = JSON.parse(meu);
  } catch(e) {}
}

function salvar() {
  var obj = Object.assign({}, E, { dia: new Date().toDateString(), meuPedido: null });
  localStorage.setItem('cantina_v4', JSON.stringify(obj));
}

/* ─── Navegação ─────────────────────────────────────────────────────── */

function irPara(pagina, el) {
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.nav-tab').forEach(function(t){ t.classList.remove('active'); });
  document.getElementById('page-'+pagina).classList.add('active');
  el.classList.add('active');
  if (pagina === 'aluno') renderAluno();
  if (pagina === 'cantina') {
    if (sessionStorage.getItem('cantina_auth')) {
      document.getElementById('area-pin').style.display = 'none';
      document.getElementById('area-cantina').style.display = 'block';
    }
    renderCantina();
  }
}

/* ─── Estoque helpers ───────────────────────────────────────────────── */

function estoqueRestante(it) {
  if (it.quantidade === undefined || it.quantidade === null || it.quantidade === '') return null;
  var qtd = parseInt(it.quantidade, 10);
  if (isNaN(qtd)) return null;
  var reservados = E.pedidos.filter(function(p){
    return p.status !== 'cancelado' && p.itensSelecionados.indexOf(it.nome) >= 0;
  }).length;
  return Math.max(0, qtd - reservados);
}

function estoqueClasse(restante) {
  if (restante === null) return '';
  if (restante === 0) return 'esgotado';
  if (restante <= 3) return 'baixo';
  return 'ok';
}

function estoqueTexto(it) {
  var r = estoqueRestante(it);
  if (r === null) return '';
  if (r === 0) return 'Esgotado';
  if (r === 1) return '1 restante';
  return r + ' restantes';
}

/* ─── Preço helpers ─────────────────────────────────────────────────── */

function formatarPreco(preco) {
  if (!preco && preco !== 0) return '';
  return 'R$ ' + parseFloat(preco).toFixed(2).replace('.', ',');
}

function totalPedido(itensSelecionados) {
  var total = 0;
  itensSelecionados.forEach(function(nome) {
    var it = E.itens.find(function(i){ return i.nome === nome; });
    if (it && it.preco) total += parseFloat(it.preco) || 0;
  });
  return total;
}

/* ─── Render Aluno ──────────────────────────────────────────────────── */

function renderAluno() {
  var sem = !E.cardapioPublicado || E.itens.length === 0;
  document.getElementById('aluno-sem-cardapio').style.display = sem ? 'block' : 'none';
  document.getElementById('aluno-com-cardapio').style.display = sem ? 'none' : 'block';
  if (sem) return;

  document.getElementById('aluno-titulo-prato').textContent = E.titulo || 'Refeicao do dia';
  document.getElementById('aluno-desc-prato').textContent = E.descricao;

  var pill = document.getElementById('aluno-pill');
  if (E.reservasAbertas) {
    pill.className = 'pill-status pill-aberto';
    pill.innerHTML = '<span class="dot"></span> Abertas';
  } else {
    pill.className = 'pill-status pill-encerrado';
    pill.innerHTML = '<span class="dot"></span> Encerradas';
  }
  document.getElementById('aviso-encerrado').style.display = E.reservasAbertas ? 'none' : 'block';
  document.getElementById('btn-reservar').disabled = !E.reservasAbertas;

  var cont = document.getElementById('lista-selecao-itens');
  var ordemCat = ['principal','acomp','bebida','sobremesa','outro'];
  var grupos = {};
  E.itens.forEach(function(it){ if (!grupos[it.categoria]) grupos[it.categoria]=[]; grupos[it.categoria].push(it); });
  var html = '';
  ordemCat.forEach(function(cat){
    if (!grupos[cat]) return;
    html += '<div class="sub-head">'+CATS[cat]+'</div>';
    grupos[cat].forEach(function(it){
      var restante = estoqueRestante(it);
      var esgotado = restante !== null && restante === 0;
      var classeRow = esgotado ? ' esgotado' : '';
      var precoHtml = it.preco ? '<span class="item-preco">'+formatarPreco(it.preco)+'</span>' : '';
      var estoqueHtml = '';
      if (restante !== null) {
        var cls = estoqueClasse(restante);
        estoqueHtml = '<span class="item-estoque '+cls+'">'+estoqueTexto(it)+'</span>';
      }
      html += '<div class="item-cardapio'+classeRow+'">';
      html += '<label class="checkbox-wrap">';
      html += '<input type="checkbox" id="cb-'+it.id+'" value="'+it.id+'"'+(esgotado?' disabled':'')+'>';
      html += '<span class="checkbox-box"></span>';
      html += '<span class="item-nome">'+it.nome+'</span>';
      html += '</label>';
      if (precoHtml || estoqueHtml) {
        html += '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px">'+precoHtml+estoqueHtml+'</div>';
      }
      html += '</div>';
    });
  });
  cont.innerHTML = html || '<div style="font-size:0.85rem; color:var(--cinza-texto); padding:0.5rem 0">Sem itens.</div>';

  // PIX info para o aluno
  renderPixAluno();

  if (E.meuPedido) {
    document.getElementById('area-formulario').style.display = 'none';
    document.getElementById('area-confirmacao').style.display = 'block';
    document.getElementById('senha-gerada').textContent = E.meuPedido.senha;
    var total = totalPedido(E.meuPedido.itensSelecionados);
    var ul = E.meuPedido.itensSelecionados.map(function(n){
      var it = E.itens.find(function(i){ return i.nome === n; });
      var p = it && it.preco ? ' — ' + formatarPreco(it.preco) : '';
      return '<li>'+n+p+'</li>';
    }).join('');
    var totalHtml = total > 0 ? '<div class="total-pedido">Total: '+formatarPreco(total)+'</div>' : '';
    document.getElementById('resumo-itens-aluno').innerHTML = '<ul>'+ul+'</ul>'+totalHtml;
  } else {
    document.getElementById('area-formulario').style.display = 'block';
    document.getElementById('area-confirmacao').style.display = 'none';
  }
}

function renderPixAluno() {
  var el = document.getElementById('pix-info-aluno');
  if (!el) return;
  if (!E.pagamento || !E.pagamento.chave) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  var tipoLabel = { cpf:'CPF', cnpj:'CNPJ', email:'E-mail', telefone:'Telefone', aleatoria:'Chave aleatória' };
  var label = tipoLabel[E.pagamento.tipo] || 'Chave PIX';
  document.getElementById('pix-aluno-tipo').textContent = label;
  document.getElementById('pix-aluno-chave').textContent = E.pagamento.chave;
}

/* ─── Reservas (Aluno) ──────────────────────────────────────────────── */

function fazerReserva() {
  if (!E.reservasAbertas) { toast('Reservas encerradas.'); return; }
  var nome = document.getElementById('input-nome').value.trim();
  var turma = document.getElementById('input-turma').value;
  if (!nome) { toast('Digite seu nome.'); return; }
  if (!turma) { toast('Selecione sua turma.'); return; }
  var checks = document.querySelectorAll('#lista-selecao-itens input[type="checkbox"]:checked');
  if (checks.length === 0) { toast('Selecione pelo menos um item.'); return; }

  // Verificar estoque antes de confirmar
  var itensSelecionados = [];
  var semEstoque = [];
  Array.from(checks).forEach(function(cb){
    var it = E.itens.find(function(i){ return String(i.id) === cb.value; });
    if (!it) return;
    var restante = estoqueRestante(it);
    if (restante !== null && restante <= 0) {
      semEstoque.push(it.nome);
    } else {
      itensSelecionados.push(it.nome);
    }
  });
  if (semEstoque.length > 0) {
    toast('Sem estoque: ' + semEstoque.join(', '));
    renderAluno();
    return;
  }
  if (itensSelecionados.length === 0) { toast('Selecione pelo menos um item.'); return; }

  E.contadorSenha++;
  var hora = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  var total = totalPedido(itensSelecionados);
  var pedido = { senha: E.contadorSenha, nome: nome, turma: turma, hora: hora, itensSelecionados: itensSelecionados, total: total, status: 'aguardando' };
  E.pedidos.push(pedido);
  E.meuPedido = pedido;
  sessionStorage.setItem('meu_pedido_v4', JSON.stringify(pedido));
  salvar();
  renderAluno();
  toast('Reserva feita! Senha: ' + pedido.senha);
}

function cancelarReserva() {
  if (!confirm('Cancelar sua reserva?')) return;
  E.pedidos = E.pedidos.filter(function(p){ return p.senha !== E.meuPedido.senha; });
  E.meuPedido = null;
  sessionStorage.removeItem('meu_pedido_v4');
  salvar();
  renderAluno();
  toast('Reserva cancelada.');
}

/* ─── Acesso Cantina ────────────────────────────────────────────────── */

function entrarCantina() {
  var pin = document.getElementById('input-pin').value;
  if (pin === '1234') {
    sessionStorage.setItem('cantina_auth','1');
    document.getElementById('area-pin').style.display = 'none';
    document.getElementById('area-cantina').style.display = 'block';
    document.getElementById('cant-titulo').value = E.titulo;
    document.getElementById('cant-desc').value = E.descricao;
    renderCantina();
    renderConfigPix();
  } else { toast('Senha incorreta.'); document.getElementById('input-pin').value = ''; }
}

/* ─── Itens do Cardápio (Cantina) ───────────────────────────────────── */

function adicionarItem() {
  var nome = document.getElementById('novo-item-nome').value.trim();
  var cat = document.getElementById('novo-item-cat').value;
  var preco = document.getElementById('novo-item-preco').value.trim();
  var quantidade = document.getElementById('novo-item-qtd').value.trim();

  if (!nome) { toast('Digite o nome do item.'); return; }

  var precoNum = preco ? parseFloat(preco.replace(',','.')) : null;
  var qtdNum = quantidade ? parseInt(quantidade, 10) : null;
  if (preco && isNaN(precoNum)) { toast('Preço inválido.'); return; }
  if (quantidade && (isNaN(qtdNum) || qtdNum < 0)) { toast('Quantidade inválida.'); return; }

  E.itens.push({
    id: Date.now(),
    nome: nome,
    categoria: cat,
    preco: precoNum,
    quantidade: qtdNum
  });

  document.getElementById('novo-item-nome').value = '';
  document.getElementById('novo-item-preco').value = '';
  document.getElementById('novo-item-qtd').value = '';
  renderListaItens();
  toast('Item adicionado!');
}

function removerItem(id) {
  E.itens = E.itens.filter(function(i){ return i.id !== id; });
  renderListaItens();
}

function renderListaItens() {
  var cont = document.getElementById('cant-lista-itens');
  if (E.itens.length === 0) {
    cont.innerHTML = '<div style="font-size:0.85rem;color:var(--cinza-texto);padding:0.5rem 0">Nenhum item ainda.</div>';
    return;
  }
  var ordemCat = ['principal','acomp','bebida','sobremesa','outro'];
  var grupos = {};
  E.itens.forEach(function(it){ if (!grupos[it.categoria]) grupos[it.categoria]=[]; grupos[it.categoria].push(it); });
  var html = '';
  ordemCat.forEach(function(cat){
    if (!grupos[cat]) return;
    html += '<div class="sub-head">'+CATS[cat]+'</div>';
    grupos[cat].forEach(function(it){
      var reservados = E.pedidos.filter(function(p){ return p.itensSelecionados.indexOf(it.nome)>=0; }).length;
      var restante = estoqueRestante(it);
      var cls = estoqueClasse(restante);
      var estoqueHtml = '';
      if (restante !== null) {
        estoqueHtml = '<span class="cant-item-estoque '+cls+'">'+estoqueTexto(it)+' ('+reservados+' res.)</span>';
      } else {
        estoqueHtml = reservados > 0 ? '<span class="cant-item-estoque">'+reservados+' reserva'+(reservados>1?'s':'')+'</span>' : '';
      }
      var precoHtml = it.preco ? '<span class="cant-item-preco">'+formatarPreco(it.preco)+'</span>' : '';
      html += '<div class="cant-item-row">';
      html += '<span class="cant-item-nome">'+it.nome+'</span>';
      html += '<div class="cant-item-info">'+precoHtml+estoqueHtml+'</div>';
      html += '<button class="btn-del" onclick="removerItem('+it.id+')" title="Remover item">×</button>';
      html += '</div>';
    });
  });
  cont.innerHTML = html;
}

/* ─── Cardápio / Toggle ─────────────────────────────────────────────── */

function salvarCardapio() {
  E.titulo = document.getElementById('cant-titulo').value.trim();
  E.descricao = document.getElementById('cant-desc').value.trim();
  E.cardapioPublicado = true;
  salvar();
  renderListaItens();
  toast('Cardápio publicado!');
}

function toggleReservas() {
  E.reservasAbertas = !E.reservasAbertas;
  document.getElementById('toggle-reservas').classList.toggle('on', E.reservasAbertas);
  salvar();
  toast(E.reservasAbertas ? 'Reservas abertas.' : 'Reservas encerradas.');
}

/* ─── Chamada de Senhas ─────────────────────────────────────────────── */

function chamarProxima() {
  var fila = E.pedidos.filter(function(p){ return p.status==='aguardando'; });
  if (fila.length===0) { toast('Nenhum pedido na fila.'); return; }
  if (E.senhaAtual !== null) {
    var ant = E.pedidos.find(function(p){ return p.senha===E.senhaAtual; });
    if (ant && ant.status==='aguardando') ant.status='entregue';
  }
  E.senhaAtual = fila[0].senha;
  salvar();
  renderCantina();
}

function marcarEntregue(senha) {
  var p = E.pedidos.find(function(x){ return x.senha===senha; });
  if (p) { p.status='entregue'; salvar(); renderCantina(); toast('Senha '+senha+' entregue.'); }
}

/* ─── Filtro de Pedidos ─────────────────────────────────────────────── */

function filtrar(f, el) {
  E.filtroAtual = f;
  document.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('active'); });
  el.classList.add('active');
  renderListaPedidos();
}

/* ─── Render Cantina ────────────────────────────────────────────────── */

function renderCantina() {
  if (document.getElementById('area-cantina').style.display==='none') return;
  if (!document.getElementById('cant-titulo').value) document.getElementById('cant-titulo').value = E.titulo;
  if (!document.getElementById('cant-desc').value) document.getElementById('cant-desc').value = E.descricao;
  document.getElementById('toggle-reservas').classList.toggle('on', E.reservasAbertas);
  renderListaItens();

  var total = E.pedidos.length;
  var aguardando = E.pedidos.filter(function(p){ return p.status==='aguardando'; }).length;
  var entregue = E.pedidos.filter(function(p){ return p.status==='entregue'; }).length;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-aguardando').textContent = aguardando;
  document.getElementById('stat-entregue').textContent = entregue;

  // Faturamento total
  var faturamento = E.pedidos.reduce(function(acc, p){ return acc + (p.total || 0); }, 0);
  var elFat = document.getElementById('stat-faturamento');
  if (elFat) elFat.textContent = faturamento > 0 ? formatarPreco(faturamento) : 'R$ 0,00';

  // Contagem por item + estoque
  var cardContagem = document.getElementById('card-contagem');
  if (E.itens.length===0||total===0) {
    cardContagem.innerHTML='<div style="font-size:0.85rem;color:var(--cinza-texto);padding:0.25rem 0">Sem pedidos ainda.</div>';
  } else {
    var maxQtd = Math.max.apply(null, E.itens.map(function(it){
      return E.pedidos.filter(function(p){ return p.itensSelecionados.indexOf(it.nome)>=0; }).length;
    }).concat([1]));
    cardContagem.innerHTML = E.itens.map(function(it){
      var qtd = E.pedidos.filter(function(p){ return p.itensSelecionados.indexOf(it.nome)>=0; }).length;
      var restante = estoqueRestante(it);
      var pct = Math.round(qtd/maxQtd*100);
      var barCls = '';
      if (restante !== null) { barCls = estoqueClasse(restante); }
      var estoqueInfo = restante !== null ? '<div class="contagem-estoque '+estoqueClasse(restante)+'">'+estoqueTexto(it)+'</div>' : '';
      return '<div class="contagem-item"><div class="contagem-nome">'+it.nome+'</div><div class="barra-wrap"><div class="barra-fill '+barCls+'" style="width:'+pct+'%"></div></div><div class="contagem-num">'+qtd+'</div>'+estoqueInfo+'</div>';
    }).join('');
  }

  // Box de chamada
  var box = document.getElementById('box-chamada');
  if (E.senhaAtual!==null) {
    var p = E.pedidos.find(function(x){ return x.senha===E.senhaAtual; });
    if (p) {
      box.className='chamada-box';
      var totalStr = p.total ? ' · '+formatarPreco(p.total) : '';
      box.innerHTML='<div style="flex:1;min-width:0"><div class="chamada-label">Senha chamada agora</div><div class="chamada-senha">'+p.senha+'</div><div class="chamada-nome">'+p.nome+' — '+p.turma+'</div><div class="chamada-itens">'+p.itensSelecionados.join(' / ')+totalStr+'</div></div><button class="btn btn-outline btn-sm" style="border-color:rgba(255,255,255,0.5);color:#fff;background:rgba(255,255,255,0.12);white-space:nowrap;flex-shrink:0" onclick="marcarEntregue('+p.senha+')">Entregue</button>';
    }
  } else {
    box.className='chamada-box chamada-vazia';
    box.innerHTML='<div style="width:100%">Nenhuma senha chamada ainda</div>';
  }
  renderListaPedidos();
  renderFaturamento();
}

function renderListaPedidos() {
  var lista = document.getElementById('lista-pedidos');
  var pedidos = E.pedidos.slice().reverse();
  if (E.filtroAtual==='aguardando') pedidos=pedidos.filter(function(p){ return p.status==='aguardando'; });
  if (E.filtroAtual==='entregue') pedidos=pedidos.filter(function(p){ return p.status==='entregue'; });
  if (pedidos.length===0) { lista.innerHTML='<div class="lista-vazia"><div class="ico">🍽</div>Nenhum pedido aqui.</div>'; return; }
  lista.innerHTML = pedidos.map(function(p){
    var totalStr = p.total ? '<div class="pedido-total">'+formatarPreco(p.total)+'</div>' : '';
    return '<div class="pedido-item"><div class="pedido-senha'+(p.status==='entregue'?' entregue':'')+'">'+p.senha+'</div><div class="pedido-info"><div class="pedido-nome">'+p.nome+'</div><div class="pedido-turma">'+p.turma+'</div><div class="pedido-itens">'+p.itensSelecionados.join(' / ')+'</div>'+totalStr+'<div class="pedido-hora">'+p.hora+'</div></div><div>'+(p.status==='aguardando'?'<button class="btn btn-verde btn-sm" style="width:auto" onclick="marcarEntregue('+p.senha+')">Entregue</button>':'<span style="font-size:0.75rem;color:var(--cinza-texto)">Entregue</span>')+'</div></div>';
  }).join('');
}

/* ─── Faturamento ───────────────────────────────────────────────────── */

function renderFaturamento() {
  var cont = document.getElementById('card-faturamento');
  if (!cont) return;
  if (E.itens.length === 0 || E.pedidos.length === 0) {
    cont.innerHTML = '<div style="font-size:0.85rem;color:var(--cinza-texto)">Sem dados ainda.</div>';
    return;
  }
  var html = '';
  E.itens.forEach(function(it) {
    if (!it.preco) return;
    var qtd = E.pedidos.filter(function(p){ return p.itensSelecionados.indexOf(it.nome) >= 0; }).length;
    if (qtd === 0) return;
    var sub = qtd * parseFloat(it.preco);
    html += '<div class="faturamento-row"><span>'+it.nome+' ×'+qtd+'</span><span>'+formatarPreco(sub)+'</span></div>';
  });
  var totalGeral = E.pedidos.reduce(function(acc, p){ return acc + (p.total || 0); }, 0);
  if (html) {
    html += '<div class="faturamento-total"><span>Total arrecadado</span><span>'+formatarPreco(totalGeral)+'</span></div>';
  } else {
    html = '<div style="font-size:0.85rem;color:var(--cinza-texto)">Nenhum item com preço definido.</div>';
  }
  cont.innerHTML = html;
}

/* ─── Pagamento / PIX ───────────────────────────────────────────────── */

function renderConfigPix() {
  if (!E.pagamento) E.pagamento = { tipo: '', chave: '' };
  var tipoSelect = document.getElementById('pix-tipo-select');
  var chaveInput = document.getElementById('pix-chave-input');
  if (tipoSelect) tipoSelect.value = E.pagamento.tipo || '';
  if (chaveInput) chaveInput.value = E.pagamento.chave || '';
}

function salvarPix() {
  var tipo = document.getElementById('pix-tipo-select').value;
  var chave = document.getElementById('pix-chave-input').value.trim();
  if (!tipo && chave) { toast('Selecione o tipo de chave PIX.'); return; }
  E.pagamento = { tipo: tipo, chave: chave };
  salvar();
  toast(chave ? 'Dados de pagamento salvos!' : 'Dados de pagamento removidos.');
}

/* ─── Toast ─────────────────────────────────────────────────────────── */

function toast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 2500);
}

/* ─── Init ───────────────────────────────────────────────────────────── */

carregar();
renderAluno();
setInterval(function(){
  carregar();
  if (document.getElementById('page-aluno').classList.contains('active')) renderAluno();
  if (document.getElementById('page-cantina').classList.contains('active')) renderCantina();
}, 10000);
