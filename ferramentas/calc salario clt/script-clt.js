/* --- Bloco: Helper de Performance (Debounce) --- */
/**
 * Cria uma versão "debounced" de uma função que atrasa sua execução.
 */
function debounce(fn, wait = 300) {
  let timeoutId;
  
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, wait);
  };
}
/* --- Fim do Bloco Debounce --- */

/* --- NOVO: Bloco de Animação CountUp.js (À PROVA DE FALHAS) --- */
let animadores = {};
let ultimoResultadoCLT = null;
let cltDonutChart = null;
// As variáveis custoEmpresaChart e elCustoEmpresaTotal foram removidas

function initAnimadores() {
    const options = {
        duration: 1.0,
        useEasing: true,
        decimal: ',',
        separator: '.',
        prefix: 'R$ ',
    };
    
    const animadoresConfig = {
        'res-clt-pacote': options, // ID renomeado
        'res-clt-salario-em-conta': options
    };

    try {
        for (const id in animadoresConfig) {
            const el = document.getElementById(id);
            if (el) {
                animadores[id] = new countUp.CountUp(el, 0, animadoresConfig[id]);
                if (animadores[id].error) {
                    console.error(`Erro no CountUp para #${id}:`, animadores[id].error);
                } else {
                    animadores[id].start();
                }
            } else {
                console.warn(`Elemento de animação #${id} não encontrado. O valor será estático.`);
            }
        }
    } catch(e) {
        console.error("Erro fatal ao inicializar o CountUp.js.", e);
    }
}
/* --- Fim do Bloco de Animação --- */

/* --- Bloco: Formatador de Moeda Otimizado --- */
const formatadorBRL = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
});

/* --- Bloco: CONSTANTES DE IMPOSTO 2025 --- */
const SALARIO_MINIMO = 1518.00;
const TETO_INSS = 8157.41;
const FAIXAS_INSS = [
    { teto: 1518.00, aliquota: 0.075, deduzir: 0 },
    { teto: 2793.88, aliquota: 0.09, deduzir: 22.77 },
    { teto: 4190.83, aliquota: 0.12, deduzir: 106.59 },
    { teto: 8157.41, aliquota: 0.14, deduzir: 190.42 }
];
const INSS_TETO = (TETO_INSS * FAIXAS_INSS[3].aliquota) - FAIXAS_INSS[3].deduzir;
const FAIXAS_IRRF = [
    { limite: 2428.80, aliquota: 0, deducao: 0 },
    { limite: 2826.65, aliquota: 0.075, deducao: 182.16 },
    { limite: 3751.05, aliquota: 0.15, deducao: 409.71 },
    { limite: 4664.68, aliquota: 0.225, deducao: 682.81 },
    { limite: Infinity, aliquota: 0.275, deducao: 912.91 }
];
const DEDUCAO_DEPENDENTE_IRRF = 189.59;
const DESCONTO_SIMPLIFICADO_IRRF = 607.20;

/* --- Bloco: IDs dos Inputs e Helpers de Formato --- */
const todosInputIDs = [
    'clt-bruto', 'clt-dependentes', 'clt-beneficios', 'clt-descontos', 'clt-incluir-provisao', 
    'clt-plr-anual', 'clt-incluir-fgts'
];

/* --- Bloco: Helpers Seguros de UI (Substitui setHTML) --- */
function criarTaxItem(nome, valor, percentual, tipo = 'desconto', baseLabel = 'da receita') {
    const item = document.createElement('div');
    item.className = 'tax-item';
    if (tipo === 'provento') {
        item.classList.add('provento');
    }
    const spanLabel = document.createElement('span');
    const spanPercent = document.createElement('span');
    spanPercent.className = 'percentage';
    spanPercent.textContent = `(${(percentual * 100).toFixed(1)}% ${baseLabel})`.replace('.',',');
    spanLabel.append(nome, spanPercent);
    const strong = document.createElement('strong');
    strong.textContent = `${tipo === 'provento' ? '+' : '-'}${formatBRL(valor)}`;
    item.append(spanLabel, strong);
    return item;
}

function criarTaxItemTotal(label, valor, tipo = 'desconto') {
    const totalItem = document.createElement('div');
    totalItem.className = 'tax-item tax-item-total';
    if (tipo === 'provento') {
        totalItem.classList.add('provento');
    }
    const spanLabel = document.createElement('span');
    spanLabel.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = `${tipo === 'provento' ? '+' : '-'}${formatBRL(valor)}`;
    totalItem.append(spanLabel, strong);
    return totalItem;
}
/* --- Fim Bloco Helpers Seguros --- */

// Helpers de Formatação
const formatBRL = (val) => formatadorBRL.format(val || 0);
const formatPerc = (val) => `${val > 0 ? '+' : ''}${(val * 100).toFixed(1)}%`.replace('.', ',');
const getFloat = (id) => parseFloat(document.getElementById(id).value) || 0;
const getChecked = (id) => document.getElementById(id).checked;

/* --- Bloco: Cache de Seletores DOM --- */
let elResCltPacote, elResCltSalarioEmConta, elResCltImpostos, elResCltAliquota,
    elTaxDetailsClt;
// elCustoEmpresaTotal foi removido
/* --- Fim do Bloco de Cache --- */

/* --- Bloco: INICIALIZAÇÃO (UX em Tempo Real) --- */
if (typeof window !== 'undefined') { 
    
    const calcularComDebounce = debounce(calcularEAtualizarUI, 300);

    // ETAPA 1: Adicionar os listeners assim que o DOM (HTML) estiver pronto
    document.addEventListener('DOMContentLoaded', () => {
        
        // 1. Adiciona listeners (tempo real) a TODOS os campos
        todosInputIDs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const eventType = (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'input';
                if (eventType === 'input') {
                    el.addEventListener(eventType, calcularComDebounce);
                } else {
                    el.addEventListener(eventType, calcularEAtualizarUI);
                }
            }
        });

        /* --- INÍCIO: Lógica Modal Contracheque --- */
        const modalContracheque = document.getElementById('modal-contracheque');
        const toolContrachequeLink = document.getElementById('btn-modal-contracheque');
        const closeModalButton = document.getElementById('modal-contracheque-close');

        function abrirModalContracheque(e) {
            e.preventDefault(); 
            const outrosDescontos = getFloat('clt-descontos');
            if (!ultimoResultadoCLT || ultimoResultadoCLT.bruto <= 0) {
                alert("Por favor, insira um Salário Bruto primeiro.");
                return;
            }
            const res = ultimoResultadoCLT;
            const totalDescontos = res.inss + res.irrf + outrosDescontos;
            const aliquotaEfetivaINSS = (res.inss / (res.bruto || 1)) * 100;
            const aliquotaEfetivaIRRF = (res.irrf / (res.bruto || 1)) * 100;

            document.getElementById('modal-salario-bruto').textContent = formatBRL(res.bruto);
            document.getElementById('modal-total-proventos').textContent = formatBRL(res.bruto);
            document.getElementById('modal-inss').textContent = formatBRL(res.inss);
            document.getElementById('modal-irrf').textContent = formatBRL(res.irrf);
            document.getElementById('modal-outros-descontos').textContent = formatBRL(outrosDescontos);
            document.getElementById('modal-total-descontos').textContent = formatBRL(totalDescontos);
            document.getElementById('modal-inss-aliquota').textContent = aliquotaEfetivaINSS.toFixed(2).replace('.',',');
            document.getElementById('modal-irrf-aliquota').textContent = aliquotaEfetivaIRRF.toFixed(2).replace('.',',');
            document.getElementById('modal-liquido').textContent = formatBRL(res.salarioEmConta);
            modalContracheque.style.display = 'flex';
        }

        function fecharModalContracheque() {
            modalContracheque.style.display = 'none';
        }

        if (toolContrachequeLink) {
            toolContrachequeLink.addEventListener('click', abrirModalContracheque);
        }
        if (closeModalButton) {
            closeModalButton.addEventListener('click', fecharModalContracheque);
        }
        if (modalContracheque) {
            modalContracheque.addEventListener('click', (event) => {
                if (event.target === modalContracheque) {
                    fecharModalContracheque();
                }
            });
        }
        /* --- FIM: Lógica Modal Contracheque --- */

        /* --- INÍCIO: Lógica Accordion --- */
        const accordionButtons = document.querySelectorAll('.accordion-button');
        accordionButtons.forEach(button => {
            button.addEventListener('click', () => {
                button.classList.toggle('active');
                const content = button.nextElementSibling;
                if (content.style.maxHeight) {
                    content.style.maxHeight = null;
                } else {
                    content.style.maxHeight = content.scrollHeight + "px";
                }
            });
        });
        function atualizarAlturasAccordions() {
            document.querySelectorAll('.accordion-content').forEach(content => {
                if (content.style.maxHeight) {
                    content.style.maxHeight = content.scrollHeight + "px";
                }
            });
        }
        /* --- FIM: Lógica Accordion --- */
    
        /* --- Bloco: Popula o Cache de Seletores DOM --- */
        elResCltPacote = document.getElementById('res-clt-pacote');
        elResCltSalarioEmConta = document.getElementById('res-clt-salario-em-conta');
        elResCltImpostos = document.getElementById('res-clt-impostos');
        elResCltAliquota = document.getElementById('res-clt-aliquota');
        // elCustoEmpresaTotal foi removido
        elTaxDetailsClt = document.getElementById('tax-details-clt');
        /* --- Fim do Bloco de População do Cache --- */
    });
    
    // ETAPA 2: Inicializar os animadores e fazer o primeiro cálculo
    // APENAS DEPOIS que TUDO (incluindo countUp.js e chart.js) for carregado.
    window.addEventListener('load', () => {
        initAnimadores();
        calcularEAtualizarUI(); // Calcula uma vez no load
    });
}

/* --- Bloco: Função Mestra (Chamada a cada 'input') --- */
function calcularEAtualizarUI() {
    try {
        // 1. Obter Inputs CLT
        const inputsCLT = {
            bruto: getFloat('clt-bruto'),
            dependentes: getFloat('clt-dependentes'),
            beneficios: getFloat('clt-beneficios'),
            descontos: getFloat('clt-descontos'),
            incluirProvisao: getChecked('clt-incluir-provisao'),
            plrAnual: getFloat('clt-plr-anual'),
            incluirFGTS: getChecked('clt-incluir-fgts'),
        };

        // 2. Executar Cálculos
        const resCLT = (inputsCLT.bruto > 0) ? calcularCLT_Colaborador(inputsCLT) : { 
            valorFinal: 0, totalImpostos: 0, aliquotaEfetiva: 0,
            detalhesImpostos: [], bruto: 0, inss: 0, irrf: 0, salarioEmConta: 0 
        };

        // resCustoEmpresa foi removido

        ultimoResultadoCLT = resCLT;

        // 3. Atualizar Painel de Resultados
        atualizarResultados(resCLT, inputsCLT); // resCustoEmpresa removido

    } catch (e) {
        console.error("Erro no cálculo:", e);
    }
}

/* --- Bloco: Função de Atualização da UI (Painel Direito) --- */
function atualizarResultados(clt, inputsCLT) { // resCustoEmpresa removido
    const cltFinal = clt.valorFinal || 0;
    const cltSalarioEmConta = clt.salarioEmConta || 0;
    const cltImpostos = clt.totalImpostos || 0;
    
    // --- Preparação Dados Donut ---
    const cltDonutData = {
        salarioEmConta: clt.salarioEmConta, 
        beneficiosProvisoes: Math.max(0, clt.valorFinal - clt.salarioEmConta), 
        impostosDescontos: clt.totalImpostos 
    };
    atualizarDonutCharts(cltDonutData); // Gráfico Donut ainda é usado

    // --- ANIMAÇÃO ---
    document.querySelectorAll('.card').forEach(el => {
        el.classList.remove('is-updating');
        void el.offsetWidth; 
        el.classList.add('is-updating');
    });

    // 1. Card Comparativo (Usa cache)
    if (animadores['res-clt-pacote']) animadores['res-clt-pacote'].update(cltFinal);
    else if (elResCltPacote) elResCltPacote.textContent = formatBRL(cltFinal);
    
    if (animadores['res-clt-salario-em-conta']) animadores['res-clt-salario-em-conta'].update(cltSalarioEmConta);
    else if (elResCltSalarioEmConta) elResCltSalarioEmConta.textContent = formatBRL(cltSalarioEmConta);
    
    if (elResCltImpostos) elResCltImpostos.textContent = formatBRL(cltImpostos);
    if (elResCltAliquota) elResCltAliquota.textContent = `${(clt.aliquotaEfetiva * 100).toFixed(1)}% do bruto`.replace('.',',');

    // 2. Detalhamento de Tributos (CLT) (Usa cache, XSS-safe)
    if (elTaxDetailsClt) {
        elTaxDetailsClt.textContent = ''; // Limpa
        
        let cltTotalProventos = 0;
        let cltTotalDescontos = 0;
        const proventosFragment = document.createDocumentFragment();
        const descontosFragment = document.createDocumentFragment();

        clt.detalhesImpostos.forEach(item => {
            if (item.tipo === 'provento' && item.valor > 0) {
                proventosFragment.appendChild(criarTaxItem(item.nome, item.valor, item.percentual, 'provento', 'do bruto'));
                cltTotalProventos += item.valor;
            } else if (item.tipo === 'desconto' && item.valor > 0) {
                descontosFragment.appendChild(criarTaxItem(item.nome, item.valor, item.percentual, 'desconto', 'do bruto'));
                cltTotalDescontos += item.valor;
            }
        });

        if (cltTotalProventos > 0) {
            proventosFragment.appendChild(criarTaxItemTotal('Total de Benefícios', cltTotalProventos, 'provento'));
            elTaxDetailsClt.appendChild(proventosFragment);
        }
        if (cltTotalDescontos > 0) {
            descontosFragment.appendChild(criarTaxItemTotal('Total de Descontos', cltTotalDescontos, 'desconto'));
            elTaxDetailsClt.appendChild(descontosFragment);
        }

        if (elTaxDetailsClt.childElementCount === 0) {
            const fallbackItem = document.createElement('div');
            fallbackItem.className = 'tax-item';
            const fallbackSpan = document.createElement('span');
            fallbackSpan.textContent = 'Nenhum detalhe';
            fallbackItem.appendChild(fallbackSpan);
            elTaxDetailsClt.appendChild(fallbackItem);
        }
    }

    // 3. Card Custo Empresa (REMOVIDO)

    atualizarAlturasAccordions();
}

/* --- Bloco: Funções de CÁLCULO (Motor) --- */
function calcularCLT_Colaborador(inputs) {
    const { bruto, dependentes, beneficios, descontos, incluirProvisao, plrAnual, incluirFGTS } = inputs;
    const totalDescontosFixos = descontos;
    const inss = calcularINSS_Progressivo(bruto);
    const irrf = calcularIRRF_Preciso(bruto, inss, dependentes, totalDescontosFixos);
    
    const totalImpostosRetidos = inss + irrf;
    const totalCustosMensais = totalImpostosRetidos + totalDescontosFixos;
    const salarioEmConta = bruto - totalCustosMensais;
    const plrMensal = (plrAnual || 0) / 12;

    const liquidoComBeneficios = salarioEmConta + beneficios + plrMensal;
    const provisaoLiq13 = calcularProvisaoLiquida13(bruto, dependentes);
    const provisaoLiqFerias = calcularProvisaoLiquidaFerias(bruto, inss, irrf, dependentes, totalDescontosFixos);
    const provisaoLiquidaTotal = provisaoLiq13 + provisaoLiqFerias;
    const fgts = bruto * 0.08;

    const pacoteTotal = liquidoComBeneficios + 
                        (incluirFGTS ? fgts : 0) + 
                        (incluirProvisao ? provisaoLiquidaTotal : 0);

    const detalhesImpostos = [];
    if (beneficios > 0) detalhesImpostos.push({ nome: "Benefícios (VR, VA, etc)", valor: beneficios, percentual: beneficios / (bruto || 1), tipo: 'provento' });
    if (plrMensal > 0) detalhesImpostos.push({ nome: "PLR (Provisão Mensal)", valor: plrMensal, percentual: plrMensal / (bruto || 1), tipo: 'provento' });
    if (incluirFGTS && fgts > 0) detalhesImpostos.push({ nome: "FGTS (Depósito Mensal)", valor: fgts, percentual: fgts / (bruto || 1), tipo: 'provento' });
    if (incluirProvisao && provisaoLiquidaTotal > 0) detalhesImpostos.push({ nome: "13º e Férias (Média Líquida)", valor: provisaoLiquidaTotal, percentual: provisaoLiquidaTotal / (bruto || 1), tipo: 'provento' });
    if (inss > 0) detalhesImpostos.push({ nome: "INSS", valor: inss, percentual: inss / (bruto || 1), tipo: 'desconto' });
    if (irrf > 0) detalhesImpostos.push({ nome: "IRRF", valor: irrf, percentual: irrf / (bruto || 1), tipo: 'desconto' });
    if (totalDescontosFixos > 0) detalhesImpostos.push({ nome: "Outros Descontos", valor: totalDescontosFixos, percentual: totalDescontosFixos / (bruto || 1), tipo: 'desconto' });

    return {
        valorFinal: pacoteTotal,
        salarioEmConta: salarioEmConta,
        totalImpostos: totalCustosMensais,
        aliquotaEfetiva: (bruto > 0) ? totalCustosMensais / bruto : 0,
        detalhesImpostos: detalhesImpostos,
        bruto: bruto,
        inss: inss,
        irrf: irrf
    };
}

// calcularCLT_CustoEmpresa (REMOVIDO)

/* --- Funções de Provisão --- */
function calcularProvisaoLiquida13(bruto, dependentes) {
    if (bruto <= 0) return 0;
    const inss13 = calcularINSS_Progressivo(bruto);
    const baseIRRF13 = bruto - inss13;
    const irrf13 = calcularIRRF_PelaTabela(baseIRRF13, dependentes);
    const liquido13 = bruto - inss13 - irrf13;
    return liquido13 / 12;
}

function calcularProvisaoLiquidaFerias(bruto, inssNormal, irrfNormal, dependentes, descontosFixos) {
    if (bruto <= 0) return 0;
    const salarioLiquidoNormal = bruto - inssNormal - irrfNormal - descontosFixos;
    const brutoFerias = bruto + (bruto / 3);
    const inssFerias = calcularINSS_Progressivo(brutoFerias);
    const irrfFerias = calcularIRRF_Preciso(brutoFerias, inssFerias, dependentes, descontosFixos);
    const salarioLiquidoFerias = brutoFerias - inssFerias - irrfFerias - descontosFixos;
    const bonusLiquidoTotal = salarioLiquidoFerias - salarioLiquidoNormal;
    return bonusLiquidoTotal / 12;
}


/* --- Bloco: Funções AUXILIARES de Cálculo (Tabelas 2025) --- */
function calcularINSS_Progressivo(salario) {
    if (salario <= 0) return 0;
    if (salario > TETO_INSS) salario = TETO_INSS;
    for (const faixa of FAIXAS_INSS) {
        if (salario <= faixa.teto) {
            return (salario * faixa.aliquota) - faixa.deduzir;
        }
    }
    return INSS_TETO;
}

function calcularIRRF_Preciso(bruto, inss, dependentes, outrosDescontos) {
    if (bruto <= 0) return 0;
    const deducaoDependentes = dependentes * DEDUCAO_DEPENDENTE_IRRF;
    const baseCalculoPadrao = bruto - inss - deducaoDependentes - (outrosDescontos || 0);
    const impostoPadrao = calcularIRRF_PelaTabela(baseCalculoPadrao);
    const baseCalculoSimplificada = bruto - DESCONTO_SIMPLIFICADO_IRRF;
    const impostoSimplificado = calcularIRRF_PelaTabela(baseCalculoSimplificada);
    return Math.max(0, Math.min(impostoPadrao, impostoSimplificado));
}

function calcularIRRF_PelaTabela(base, dependentes = 0) {
    if (base <= 0) return 0;
    const deducaoDependentes = (dependentes || 0) * DEDUCAO_DEPENDENTE_IRRF;
    const baseCalculo = Math.max(0, base - deducaoDependentes);
    for (const faixa of FAIXAS_IRRF) {
        if (baseCalculo <= faixa.limite) {
            return Math.max(0, (baseCalculo * faixa.aliquota) - faixa.deducao);
        }
    }
    const ultimaFaixa = FAIXAS_IRRF[FAIXAS_IRRF.length - 1];
    return Math.max(0, (baseCalculo * ultimaFaixa.aliquota) - ultimaFaixa.deducao);
}

/* --- Lógica dos Gráficos (Simplificada) --- */

function criarOuAtualizarDonut(chartInstance, canvasId, labels, data, colors) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null; 

    const dataFiltrada = [];
    const labelsFiltrados = [];
    const colorsFiltrados = [];

    data.forEach((valor, index) => {
        if (valor > 0) {
            dataFiltrada.push(valor);
            labelsFiltrados.push(labels[index]);
            colorsFiltrados.push(colors[index]);
        }
    });

    if (dataFiltrada.length === 0) {
        dataFiltrada.push(1);
        labelsFiltrados.push('Nenhum dado');
        colorsFiltrados.push('#3A3052');
    }

    const chartData = {
        labels: labelsFiltrados,
        datasets: [{
            data: dataFiltrada,
            backgroundColor: colorsFiltrados,
            borderColor: 'rgba(33, 28, 48, 0.5)',
            borderWidth: 2,
            hoverOffset: 4
        }]
    };

    const config = {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '70%', 
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { color: '#A09CB0', font: { family: 'Poppins' }, padding: 10 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const valor = context.raw || 0;
                            const totalSum = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = totalSum > 0 ? ((valor / totalSum) * 100).toFixed(1) : 0;
                            if (label === 'Nenhum dado') return 'Nenhum dado';
                            return ` ${label}: ${formatBRL(valor)} (${percentage.replace('.',',')}%)`;
                        }
                    }
                }
            }
        }
    };

    if (!chartInstance) {
        return new Chart(ctx, config);
    } else {
        chartInstance.data = chartData;
        chartInstance.update();
        return chartInstance;
    }
}

function atualizarDonutCharts(cltData) {
    cltDonutChart = criarOuAtualizarDonut(
        cltDonutChart,
        'clt-donut-chart',
        ['Salário em Conta', 'Benefícios/Provisões', 'Impostos/Descontos'],
        [cltData.salarioEmConta, cltData.beneficiosProvisoes, cltData.impostosDescontos],
        ['#98c379', '#61AFEF', '#E06C75'] 
    );
}

// atualizarCustoEmpresaChart (REMOVIDO)