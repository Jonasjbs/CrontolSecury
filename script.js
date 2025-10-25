// js/script.js (expenseControl 0.5.2)

let dadosMotorista = [];
const LOCAL_STORAGE_KEY = 'controleGastosMotorista';
let graficoInstance = null;

// Variáveis para rastrear o período de filtro atual
let mesFiltroAtual = new Date().getMonth() + 1;
let anoFiltroAtual = new Date().getFullYear();

// Referências DOM
const dashboardResumo = document.getElementById('dashboard-resumo');
const tabelaReceitasBody = document.querySelector('#tabelaReceitas tbody');
const tabelaDespesasBody = document.querySelector('#tabelaDespesas tbody');
const formReceita = document.getElementById('formReceita');
const formDespesa = document.getElementById('formDespesa');
const aplicarFiltroButton = document.getElementById('aplicarFiltro');
const filtroMesSelect = document.getElementById('filtroMes');
const filtroAnoSelect = document.getElementById('filtroAno');
const buscaClienteInput = document.getElementById('buscaCliente');

// Novos Botões (Item 2 e 3)
const btnApagarReceitasPeriodo = document.getElementById('btnApagarReceitasPeriodo');
const btnApagarDespesasPeriodo = document.getElementById('btnApagarDespesasPeriodo');
const btnImprimirRelatorio = document.getElementById('btnImprimirRelatorio');


// ----------------------------------------------------
// MÓDULO: Persistência e Inicialização
// ----------------------------------------------------

function salvarDados() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dadosMotorista));
    popularFiltros();
}

function carregarDados() {
    const hoje = new Date();
    const hojeFormatado = hoje.toISOString().substring(0, 10);
    document.getElementById('dataReceita').value = hojeFormatado;
    document.getElementById('dataDespesa').value = hojeFormatado;
    
    const dadosSalvos = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (dadosSalvos) {
        dadosMotorista = JSON.parse(dadosSalvos);
    }
    
    popularFiltros();
    aplicarFiltro();
}

function popularFiltros() {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    
    let anos = new Set();
    dadosMotorista.forEach(reg => anos.add(new Date(reg.data).getFullYear()));
    if (!anos.has(anoAtual)) anos.add(anoAtual);
    
    filtroAnoSelect.innerHTML = '';
    [...anos].sort((a, b) => b - a).forEach(ano => {
        const option = document.createElement('option');
        option.value = ano;
        option.textContent = ano;
        filtroAnoSelect.appendChild(option);
    });

    const nomesMeses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    filtroMesSelect.innerHTML = '';
    nomesMeses.forEach((nome, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = nome;
        filtroMesSelect.appendChild(option);
    });
    
    filtroMesSelect.value = mesFiltroAtual;
    filtroAnoSelect.value = anoFiltroAtual;
}

function aplicarFiltro() {
    mesFiltroAtual = parseInt(filtroMesSelect.value);
    anoFiltroAtual = parseInt(filtroAnoSelect.value);
    
    calcularEExibirTotais();
    renderizarGraficoComparativo(); // Alterado para o novo gráfico
    renderizarTabelaReceitas(buscaClienteInput.value); 
    renderizarTabelaDespesas();
}


// ----------------------------------------------------
// MÓDULO: Cálculos e Dashboard
// ----------------------------------------------------

function filtrarDadosPorPeriodo() {
    return dadosMotorista.filter(reg => {
        const dataReg = new Date(reg.data + 'T00:00:00'); 
        if (isNaN(dataReg)) return false; 
        
        const regMes = dataReg.getMonth() + 1;
        const regAno = dataReg.getFullYear();
        
        return regMes === mesFiltroAtual && regAno === anoFiltroAtual;
    });
}

function calcularTotais() {
    const dadosFiltrados = filtrarDadosPorPeriodo();

    const resultados = dadosFiltrados.reduce((acc, reg) => {
        const valor = parseFloat(reg.valor) || 0;

        if (reg.tipo === 'receita') {
            acc.receita += valor;
            acc.clientesAtendidos += 1;
        } else if (reg.tipo === 'despesa') {
            acc.despesa += valor;
        }
        return acc;
    }, { receita: 0, despesa: 0, clientesAtendidos: 0 }); 

    resultados.saldo = resultados.receita - resultados.despesa;
    return resultados;
}

function calcularEExibirTotais() {
    const totaisPeriodo = calcularTotais();
    const nomeMes = filtroMesSelect.options[filtroMesSelect.selectedIndex].text;
    
    dashboardResumo.innerHTML = `
        <div class="col-lg-3 col-md-6 mb-3">
            <div class="card p-3 shadow-sm border-success bg-light">
                <h5 class="text-success"><i class="fas fa-money-check-alt"></i> Saldo Bruto (${nomeMes})</h5>
                <p class="fs-4 text-success fw-bold">R$ ${totaisPeriodo.receita.toFixed(2).replace('.', ',')}</p>
            </div>
        </div>
        <div class="col-lg-3 col-md-6 mb-3">
            <div class="card p-3 shadow-sm border-danger bg-light">
                <h5 class="text-danger"><i class="fas fa-wallet"></i> Total Despesa (${nomeMes})</h5>
                <p class="fs-4 text-danger fw-bold">R$ ${totaisPeriodo.despesa.toFixed(2).replace('.', ',')}</p>
            </div>
        </div>
        <div class="col-lg-3 col-md-6 mb-3">
            <div class="card p-3 shadow-sm border-primary bg-light">
                <h5 class="text-primary"><i class="fas fa-chart-bar"></i> Saldo Líquido (${nomeMes})</h5>
                <p class="fs-4 fw-bold" style="color: ${totaisPeriodo.saldo >= 0 ? '#28a745' : '#dc3545'};">R$ ${totaisPeriodo.saldo.toFixed(2).replace('.', ',')}</p>
            </div>
        </div>
        <div class="col-lg-3 col-md-6 mb-3">
            <div class="card p-3 shadow-sm border-info bg-light">
                <h5 class="text-info"><i class="fas fa-handshake"></i> Clientes Atendidos</h5>
                <p class="fs-4 text-info fw-bold">${totaisPeriodo.clientesAtendidos}</p>
            </div>
        </div>
    `;
}

// ----------------------------------------------------
// MÓDULO: Histórico Separado e Pesquisa
// ----------------------------------------------------

function renderizarTabelaReceitas(termoBusca = '') {
    tabelaReceitasBody.innerHTML = '';
    
    let dadosParaExibir = filtrarDadosPorPeriodo().filter(reg => reg.tipo === 'receita');

    if (termoBusca) {
        const termo = termoBusca.toLowerCase();
        dadosParaExibir = dadosParaExibir.filter(reg => 
            reg.cliente.toLowerCase().includes(termo) || 
            reg.destino.toLowerCase().includes(termo)
        );
    }

    const dadosOrdenados = [...dadosParaExibir].sort((a, b) => new Date(b.data) - new Date(a.data));

    if (dadosOrdenados.length === 0) {
        tabelaReceitasBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhuma corrida (cliente) encontrada para o período/busca.</td></tr>`;
        return;
    }

    dadosOrdenados.forEach(reg => {
        const tr = document.createElement('tr');
        const valor = parseFloat(reg.valor) || 0;

        tr.innerHTML = `
            <td><i class="fas fa-user text-success"></i> ${reg.cliente}</td>
            <td>${reg.destino}</td>
            <td class="text-end fw-bold text-success">R$ ${valor.toFixed(2).replace('.', ',')}</td>
            <td>${new Date(reg.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
            <td class="no-print">
                <button class="btn btn-sm btn-outline-danger" onclick="excluirRegistro(${reg.id})">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tr.onclick = () => alert(`DETALHES DA CORRIDA:\nCliente: ${reg.cliente}\nDestino: ${reg.destino}\nValor: R$ ${valor.toFixed(2).replace('.', ',')}`);

        tabelaReceitasBody.appendChild(tr);
    });
}

function renderizarTabelaDespesas() {
    tabelaDespesasBody.innerHTML = '';
    
    let dadosParaExibir = filtrarDadosPorPeriodo().filter(reg => reg.tipo === 'despesa');
    const dadosOrdenados = [...dadosParaExibir].sort((a, b) => new Date(b.data) - new Date(a.data));

    if (dadosOrdenados.length === 0) {
        tabelaDespesasBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhuma despesa encontrada para o período.</td></tr>`;
        return;
    }

    dadosOrdenados.forEach(reg => {
        const tr = document.createElement('tr');
        const descricao = reg.descricao || '(Sem descrição)';
        const valor = parseFloat(reg.valor) || 0;

        tr.innerHTML = `
            <td><i class="fas fa-tag text-danger"></i> ${reg.categoria}</td>
            <td>${descricao}</td>
            <td class="text-end fw-bold text-danger">R$ ${valor.toFixed(2).replace('.', ',')}</td>
            <td>${new Date(reg.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
            <td class="no-print">
                <button class="btn btn-sm btn-outline-danger" onclick="excluirRegistro(${reg.id})">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tr.onclick = () => alert(`DETALHES DO GASTO:\nCategoria: ${reg.categoria}\nDescrição: ${descricao}\nValor: R$ ${valor.toFixed(2).replace('.', ',')}`);

        tabelaDespesasBody.appendChild(tr);
    });
}

function excluirRegistro(id) {
    if (confirm("Tem certeza que deseja excluir este registro?")) {
        dadosMotorista = dadosMotorista.filter(reg => reg.id !== id);
        salvarDados();
        aplicarFiltro();
        renderizarTabelaReceitas(buscaClienteInput.value);
        renderizarTabelaDespesas();
    }
}

// ----------------------------------------------------
// MÓDULO: 1. Gráfico (Novo Gráfico de Barras)
// ----------------------------------------------------

function renderizarGraficoComparativo() {
    const totaisPeriodo = calcularTotais(); // Já tem receita, despesa, saldo
    const dadosFiltrados = filtrarDadosPorPeriodo().filter(reg => reg.tipo === 'despesa');
    
    // Agrupa despesas por categoria
    const despesasPorCategoria = dadosFiltrados
        .reduce((acc, reg) => {
            const valor = parseFloat(reg.valor) || 0;
            acc[reg.categoria] = (acc[reg.categoria] || 0) + valor;
            return acc;
        }, {});

    if (graficoInstance) {
        graficoInstance.destroy();
    }
    
    const ctx = document.getElementById('graficoComparativo').getContext('2d');
    
    const cores = {
        'Saldo Bruto': '#28a745',
        'Gasolina': '#ffcd56',
        'Pedágio': '#4bc0c0',
        'Manutenção': '#ff6384',
        'Refeição': '#36a2eb',
        'Outros': '#9966ff'
    };
    
    // Define as labels e os dados para o gráfico de barras
    const labels = ['Saldo Bruto', ...Object.keys(despesasPorCategoria)];
    const data = [totaisPeriodo.receita, ...Object.values(despesasPorCategoria)];
    const coresFinais = labels.map(label => cores[label] || '#cccccc');

    graficoInstance = new Chart(ctx, {
        type: 'bar', // Tipo: Gráfico de Barras
        data: {
            labels: labels,
            datasets: [{
                label: 'Valor (R$)',
                data: data,
                backgroundColor: coresFinais,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false // Legenda é desnecessária em gráfico de barras
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            const valor = context.parsed.y;
                            return ` ${label}: R$ ${valor.toFixed(2).replace('.', ',')}`;
                        }
                    }
                },
                title: {
                    display: true,
                    text: `Comparativo do Mês de ${filtroMesSelect.options[filtroMesSelect.selectedIndex].text}`
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        // Formata o eixo Y para R$
                        callback: function(value) {
                            return 'R$ ' + value.toFixed(0).replace('.', ',');
                        }
                    }
                }
            }
        }
    });
}


// ----------------------------------------------------
// MÓDULO: Event Listeners e Ferramentas (Item 2 e 3)
// ----------------------------------------------------

// Eventos para formulários
formReceita.addEventListener('submit', function(e) { /* ... */ e.preventDefault();
    const novoRegistro = {
        id: Date.now(), 
        tipo: 'receita',
        cliente: document.getElementById('nomeCliente').value,
        destino: document.getElementById('destino').value,
        data: document.getElementById('dataReceita').value,
        valor: parseFloat(document.getElementById('valorReceita').value) || 0,
    };
    if (novoRegistro.valor <= 0) { alert("O valor da receita deve ser maior que zero."); return; }
    dadosMotorista.push(novoRegistro); salvarDados();
    const dataNova = new Date(novoRegistro.data);
    filtroMesSelect.value = dataNova.getMonth() + 1;
    filtroAnoSelect.value = dataNova.getFullYear();
    aplicarFiltro(); this.reset();
});

formDespesa.addEventListener('submit', function(e) { /* ... */ e.preventDefault();
    const novoRegistro = {
        id: Date.now(),
        tipo: 'despesa',
        categoria: document.getElementById('tipoGasto').value,
        descricao: document.getElementById('descricaoGasto').value.trim(), 
        data: document.getElementById('dataDespesa').value,
        valor: parseFloat(document.getElementById('valorDespesa').value) || 0,
    };
    if (novoRegistro.valor <= 0) { alert("O valor da despesa deve ser maior que zero."); return; }
    dadosMotorista.push(novoRegistro); salvarDados();
    const dataNova = new Date(novoRegistro.data);
    filtroMesSelect.value = dataNova.getMonth() + 1;
    filtroAnoSelect.value = dataNova.getFullYear();
    aplicarFiltro(); this.reset();
});

// Listener para o botão 'Aplicar Filtro'
aplicarFiltroButton.addEventListener('click', () => {
    buscaClienteInput.value = ''; 
    aplicarFiltro();
});

// Listener para a busca de Cliente
buscaClienteInput.addEventListener('keyup', (e) => {
    renderizarTabelaReceitas(e.target.value);
});

// Listener para a troca de abas
document.getElementById('myTab').addEventListener('shown.bs.tab', (e) => {
    if (e.target.id === 'clientes-tab') {
        renderizarTabelaReceitas(buscaClienteInput.value);
    } else if (e.target.id === 'despesas-tab') {
        renderizarTabelaDespesas();
    }
});


// ----------------------------------------------------
// Item 2: Novas Funções de Ferramentas (Apagar e Imprimir)
// ----------------------------------------------------

// Apagar Receitas do Período
btnApagarReceitasPeriodo.addEventListener('click', () => {
    const nomeMes = filtroMesSelect.options[filtroMesSelect.selectedIndex].text;
    if (confirm(`ATENÇÃO: Deseja apagar TODAS as RECEITAS de ${nomeMes}/${anoFiltroAtual}?`)) {
        
        dadosMotorista = dadosMotorista.filter(reg => {
            const dataReg = new Date(reg.data + 'T00:00:00');
            const regMes = dataReg.getMonth() + 1;
            const regAno = dataReg.getFullYear();
            
            // Mantém o registro SE:
            // 1. Não for uma receita
            // 2. Ou se for de outro período (mês ou ano diferente)
            return !(reg.tipo === 'receita' && regMes === mesFiltroAtual && regAno === anoFiltroAtual);
        });
        
        salvarDados();
        aplicarFiltro();
        alert(`Receitas de ${nomeMes}/${anoFiltroAtual} apagadas.`);
    }
});

// Apagar Despesas do Período
btnApagarDespesasPeriodo.addEventListener('click', () => {
    const nomeMes = filtroMesSelect.options[filtroMesSelect.selectedIndex].text;
    if (confirm(`ATENÇÃO: Deseja apagar TODAS as DESPESAS de ${nomeMes}/${anoFiltroAtual}?`)) {
        
        dadosMotorista = dadosMotorista.filter(reg => {
            const dataReg = new Date(reg.data + 'T00:00:00');
            const regMes = dataReg.getMonth() + 1;
            const regAno = dataReg.getFullYear();
            
            // Mantém o registro SE:
            // 1. Não for uma despesa
            // 2. Ou se for de outro período (mês ou ano diferente)
            return !(reg.tipo === 'despesa' && regMes === mesFiltroAtual && regAno === anoFiltroAtual);
        });
        
        salvarDados();
        aplicarFiltro();
        alert(`Despesas de ${nomeMes}/${anoFiltroAtual} apagadas.`);
    }
});

// Item 3: Imprimir Relatório
btnImprimirRelatorio.addEventListener('click', () => {
    // A mágica é feita pelo CSS @media print
    window.print();
});


// Inicialização da Aplicação
document.addEventListener('DOMContentLoaded', carregarDados);