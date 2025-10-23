// Topo do script.js
const LOGO_BASE64 = "Calculadora Salarial";
/* --- NOVO: Bloco de Animação CountUp.js (À PROVA DE FALHAS) --- */

// Armazena as instâncias dos animadores para que possamos atualizá-las
let animadores = {};

let ultimoResultadoCLT = null;

let mainBarChart = null;

let cltDonutChart = null;
let pjDonutChart = null;

let custoEmpresaChart = null;

let impactoAnualChart = null;

/**
 * Inicializa todas as instâncias do CountUp.js.
 * Chamado uma vez quando o DOM é carregado.
 */
function initAnimadores() {
    const options = {
        duration: 1.0, // 1 segundo
        useEasing: true, // Easing suave
        decimal: ',',
        separator: '.',
        prefix: 'R$ ',
    };
    
    // Lista de IDs e suas opções
    const animadoresConfig = {
        'res-variacao-abs': options,
        'res-clt-liquido': options,
        'res-pj-liquido': options,
        'res-clt-anual': options,
        'res-pj-anual': options,
        'res-anual-diferenca-valor': { ...options, prefix: '+R$ ' },
        'res-clt-salario-em-conta': options // <-- ADICIONADO AQUI
    };

    try {
        for (const id in animadoresConfig) {
            const el = document.getElementById(id);
            // !! ESTA É A CORREÇÃO !!
            // Só inicializa o animador se o elemento HTML for encontrado
            if (el) {
                animadores[id] = new countUp.CountUp(el, 0, animadoresConfig[id]);
                if (animadores[id].error) {
                    console.error(`Erro no CountUp para #${id}:`, animadores[id].error);
                } else {
                    animadores[id].start(); // Inicia em 0
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
// (Baseado nas tabelas do .docx)
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
    // Tabela 2025 (vigente desde 2024, MP 1206/2024)
    // Atualizada para a tabela de R$ 607,20 de desconto simplificado (2x min de R$ 1518)
    // Tabela correta (do .docx):
    { limite: 2428.80, aliquota: 0, deducao: 0 },
    { limite: 2826.65, aliquota: 0.075, deducao: 182.16 },
    { limite: 3751.05, aliquota: 0.15, deducao: 409.71 },
    { limite: 4664.68, aliquota: 0.225, deducao: 682.81 },
    { limite: Infinity, aliquota: 0.275, deducao: 912.91 }
];
const DEDUCAO_DEPENDENTE_IRRF = 189.59;
const DESCONTO_SIMPLIFICADO_IRRF = 607.20; // 25% do limite de isenção

const ANEXO_III = [
    { teto: 180000, aliquota: 0.06, pd: 0 }, { teto: 360000, aliquota: 0.112, pd: 9360 }, { teto: 720000, aliquota: 0.135, pd: 17640 },
    { teto: 1800000, aliquota: 0.16, pd: 35640 }, { teto: 3600000, aliquota: 0.21, pd: 125640 }, { teto: 4800000, aliquota: 0.33, pd: 648000 }
];
const ANEXO_V = [
    { teto: 180000, aliquota: 0.155, pd: 0 }, { teto: 360000, aliquota: 0.18, pd: 4500 }, { teto: 720000, aliquota: 0.195, pd: 9900 },
    { teto: 1800000, aliquota: 0.205, pd: 17100 }, { teto: 3600000, aliquota: 0.23, pd: 62100 }, { teto: 4800000, aliquota: 0.305, pd: 540000 }
];

/* --- Bloco: IDs dos Inputs e Helpers de Formato --- */
const todosInputIDs = [
    'clt-bruto', 'clt-dependentes', 'clt-beneficios', 'clt-descontos', 'clt-incluir-provisao', 
    'clt-plr-anual', 'clt-incluir-fgts', 
    'pj-faturamento', 'pj-rbt12', 'pj-atividade', 'pj-contabilidade', 'pj-outros', // <-- CORRIGIDO
    'pj-faturamento-mei', 'pj-custo-mei', 'pj-outros-mei',
    'pj-faturamento-manual', 'pj-taxa-manual', 'pj-custos-fixos-manual'
];

/* --- Bloco: Helper de Performance (Debounce) --- */

/**
 * Cria uma versão "debounced" de uma função que atrasa sua execução.
 * (Usado para evitar recálculos excessivos em inputs)
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

/* --- Bloco: Helpers Seguros de UI (Substitui setHTML) --- */

/**
 * Helper seguro para criar o item de detalhe de imposto
 * (Substitui a concatenação de HTML)
 */
function criarTaxItem(nome, valor, percentual, tipo = 'desconto', baseLabel = 'da receita') {
    const item = document.createElement('div');
    item.className = 'tax-item';
    if (tipo === 'provento') {
        item.classList.add('provento');
    }

    const spanLabel = document.createElement('span');
    const spanPercent = document.createElement('span');
    spanPercent.className = 'percentage';
    // Formata o label da base (ex: % do bruto vs % da receita)
    spanPercent.textContent = `(${(percentual * 100).toFixed(1)}% ${baseLabel})`.replace('.',',');
    
    spanLabel.append(nome, spanPercent);

    const strong = document.createElement('strong');
    strong.textContent = `${tipo === 'provento' ? '+' : '-'}${formatBRL(valor)}`;

    item.append(spanLabel, strong);
    return item;
}

/**
 * Helper seguro para criar a linha total dos detalhes de imposto
 */
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
// Variáveis para armazenar os elementos da UI (são preenchidas no DOMContentLoaded)
let elResVariacaoAbs, elResVariacaoPerc, elVarCard, elResCltLiquido, 
    elResCltSalarioEmConta, elResPjLiquido, elResCltImpostos, elResPjImpostos, 
    elResPjImpostosLabel, elResCltAliquota, elResPjAliquota, elResCltAnual, 
    elResPjAnual, elDifAnualWrapper, elDifAnualLabel, elAnimadorDifAnualValor, 
    elRecomendacao, elRecomendacaoCard, elEquivalencia, elTaxDetailsClt, 
    elTaxDetailsPj, elPjDetalheTitulo, 
    elCustoEmpresaTotal, elEconomiaEmpresaTexto, elBtnGerarRelatorio;
/* --- Fim do Bloco de Cache --- */

/* --- Bloco: INICIALIZAÇÃO (UX em Tempo Real) --- 
*** CORRIGIDO COM DEBOUNCE PARA PERFORMANCE ***
*/
if (typeof window !== 'undefined') { 
    
    // Cria a versão debounced da nossa função de cálculo
    const calcularComDebounce = debounce(calcularEAtualizarUI, 300);

    document.addEventListener('DOMContentLoaded', () => {

        lerDadosDaURL();

        const bodyEl = document.body;
        
        // 1. Adiciona listeners (tempo real) a TODOS os campos
        todosInputIDs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                // Verifica o tipo de elemento para usar o evento correto
                const eventType = (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'input';
            
                if (eventType === 'input') {
                    // --- CORREÇÃO AQUI ---
                    // Inputs de NÚMERO usam a versão com DEBOUNCE
                    el.addEventListener(eventType, calcularComDebounce);
                } else {
                    // --- CORREÇÃO AQUI ---
                    // Selects e Checkboxes disparam o cálculo IMEDIATAMENTE
                    el.addEventListener(eventType, calcularEAtualizarUI);
                }
            }
        });

        // 2. Adiciona listeners para as ABAS PJ
        const pjTabs = document.querySelectorAll('.pj-tab-btn');
        pjTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                pjTabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
            
                const regime = e.currentTarget.dataset.regime;
                document.querySelectorAll('.pj-regime-group').forEach(group => {
                    // CORREÇÃO: Usar .id para checar o ID do grupo
                    group.style.display = (group.id === `pj-${regime}-inputs`) ? 'block' : 'none';
                });
            
                // Dispara o cálculo imediato ao trocar de aba
                calcularEAtualizarUI();

            });
        });

/* --- INÍCIO: Lógica Modal Contracheque --- */

// 1. Pega os elementos do DOM
const modalContracheque = document.getElementById('modal-contracheque');
const toolContrachequeLink = document.getElementById('btn-modal-contracheque'); // ID do <button>
const closeModalButton = document.getElementById('modal-contracheque-close');

// 2. Função para ABRIR o modal
function abrirModalContracheque(e) {
    e.preventDefault(); // Impede o link de navegar

    // Pega os inputs MAIS ATUAIS (caso o usuário tenha mudado "Outros Descontos")
    const outrosDescontos = getFloat('clt-descontos');

    if (!ultimoResultadoCLT || ultimoResultadoCLT.bruto <= 0) {
        alert("Por favor, insira um Salário Bruto primeiro.");
        return;
    }

    // Popula os campos do Modal
    const res = ultimoResultadoCLT; // Pega o último resultado salvo
    const totalDescontos = res.inss + res.irrf + outrosDescontos;

    // Alíquotas Efetivas
    const aliquotaEfetivaINSS = (res.inss / (res.bruto || 1)) * 100;
    const aliquotaEfetivaIRRF = (res.irrf / (res.bruto || 1)) * 100;

    // Proventos [cite: 10]
    document.getElementById('modal-salario-bruto').textContent = formatBRL(res.bruto);
    document.getElementById('modal-total-proventos').textContent = formatBRL(res.bruto);

    // Descontos [cite: 11]
    document.getElementById('modal-inss').textContent = formatBRL(res.inss);
    document.getElementById('modal-irrf').textContent = formatBRL(res.irrf);
    document.getElementById('modal-outros-descontos').textContent = formatBRL(outrosDescontos);
    document.getElementById('modal-total-descontos').textContent = formatBRL(totalDescontos);

    // Alíquotas
    document.getElementById('modal-inss-aliquota').textContent = aliquotaEfetivaINSS.toFixed(2).replace('.',',');
    document.getElementById('modal-irrf-aliquota').textContent = aliquotaEfetivaIRRF.toFixed(2).replace('.',',');

    // Líquido (usa o valor de salarioEmConta, que já considera "outros descontos") [cite: 12]
    document.getElementById('modal-liquido').textContent = formatBRL(res.salarioEmConta);

    // Exibe o modal (usando o mesmo padrão das abas PJ)
    modalContracheque.style.display = 'flex';
}

// 3. Função para FECHAR o modal
function fecharModalContracheque() {
    modalContracheque.style.display = 'none';
}

// 4. Adiciona os Event Listeners
if (toolContrachequeLink) {
    toolContrachequeLink.addEventListener('click', abrirModalContracheque);
}
if (closeModalButton) {
    closeModalButton.addEventListener('click', fecharModalContracheque);
}

// Fecha o modal se o usuário clicar fora da caixa de conteúdo (no overlay)
if (modalContracheque) {
    modalContracheque.addEventListener('click', (event) => {
        if (event.target === modalContracheque) {
            fecharModalContracheque();
        }
    });
}

/* --- FIM: Lógica Modal Contracheque --- */

/* --- INÍCIO: Lógica Accordion (Func. 3 / Passo 2) --- */
const accordionButtons = document.querySelectorAll('.accordion-button');

accordionButtons.forEach(button => {
    button.addEventListener('click', () => {
        // 1. Ativa/desativa o estado visual do botão (gira o ícone)
        button.classList.toggle('active');

        // 2. Encontra o painel de conteúdo
        const content = button.nextElementSibling;

        // 3. Expande ou retrai o conteúdo
        if (content.style.maxHeight) {
            // Se já tem altura (está aberto), fecha
            content.style.maxHeight = null;
        } else {
            // Se está fechado, abre calculando a altura necessária
            content.style.maxHeight = content.scrollHeight + "px";
        }
    });
});

// Função para reajustar a altura de accordions abertos
// (Necessário quando o conteúdo de dentro muda, ex: recalcular)
// Garante visibilidade global
window.atualizarAlturasAccordions = function atualizarAlturasAccordions() {
    document.querySelectorAll('.accordion-content').forEach(content => {
        if (content.style.maxHeight) {
            content.style.maxHeight = content.scrollHeight + "px";
        }
    });
};

/* --- FIM: Lógica Accordion --- */

        // 3. Adiciona listeners para o FAQ
        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const faqId = e.currentTarget.dataset.faq;
            
                // Fecha todos os itens
                faqItems.forEach(i => i.classList.remove('active'));
                // Abre o item clicado
                e.currentTarget.classList.add('active');

                // Esconde todos os painéis
                document.querySelectorAll('.faq-content-panel').forEach(panel => {
                    panel.classList.remove('active');
                    if (panel.id === `faq-${faqId}`) {
                        // Mostra o painel correto
                        panel.classList.add('active');
                    }
                });
            });
        });

        // NOVO: Listener para o botão de Compartilhar Link
    const btnShare = document.getElementById('btn-share-link');
    if (btnShare) {
        btnShare.addEventListener('click', () => {
            const queryString = gerarQueryString();
            const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?${queryString}`;
            
            // Tenta usar a API de Compartilhamento (Mobile)
            if (navigator.share) {
                navigator.share({
                    title: 'Simulação Calculadora Salarial: CLT vs PJ',
                    text: 'Veja esta simulação que fiz no comparador Calculadora Salarial:',
                    url: newUrl,
                })
                .catch(console.error);
            } else {
                // Fallback para Copiar (Desktop)
                navigator.clipboard.writeText(newUrl).then(() => {
                    // Feedback temporário
                    const originalText = btnShare.innerHTML;
                    btnShare.innerHTML = 'Link Copiado!';
                    setTimeout(() => {
                        btnShare.innerHTML = originalText;
                    }, 2000);
                }, (err) => {
                    alert('Erro ao copiar link.');
                });
            }
        });
    }
    
        /* --- Bloco: Popula o Cache de Seletores DOM --- */
        elResVariacaoAbs = document.getElementById('res-variacao-abs');
        elResVariacaoPerc = document.getElementById('res-variacao-perc');
        elVarCard = document.querySelector('.result-card-principal');
        elResCltLiquido = document.getElementById('res-clt-liquido');
        elResCltSalarioEmConta = document.getElementById('res-clt-salario-em-conta');
        elResPjLiquido = document.getElementById('res-pj-liquido');
        elResCltImpostos = document.getElementById('res-clt-impostos');
        elResPjImpostos = document.getElementById('res-pj-impostos');
        elResPjImpostosLabel = document.getElementById('res-pj-impostos-label');
        elResCltAliquota = document.getElementById('res-clt-aliquota');
        elResPjAliquota = document.getElementById('res-pj-aliquota');
        elResCltAnual = document.getElementById('res-clt-anual');
        elResPjAnual = document.getElementById('res-pj-anual');
        elDifAnualWrapper = document.getElementById('res-anual-diferenca-wrapper');
        elDifAnualLabel = document.getElementById('res-anual-diferenca-label');
        elAnimadorDifAnualValor = document.getElementById('res-anual-diferenca-valor'); 
        elRecomendacao = document.getElementById('res-recomendacao-texto');
        if (elRecomendacao) {
            elRecomendacaoCard = elRecomendacao.closest('.recommendation-card');
        }
        elEquivalencia = document.getElementById('res-equivalencia-texto');
        elCustoEmpresaTotal = document.getElementById('custo-empresa-total');
        elEconomiaEmpresaTexto = document.getElementById('res-economia-empresa-texto');
        elBtnGerarRelatorio = document.getElementById('btn-gerar-relatorio');
        const modalNegociacao = document.getElementById('modal-negociacao');
        const modalNegociacaoClose = document.getElementById('modal-negociacao-close');
        const btnCopiarRelatorio = document.getElementById('btn-copiar-relatorio');
        elTaxDetailsClt = document.getElementById('tax-details-clt');
        elTaxDetailsPj = document.getElementById('tax-details-pj');
        elPjDetalheTitulo = document.getElementById('pj-detalhe-titulo');
        /* --- Fim do Bloco de População do Cache --- */


        /* --- INÍCIO: Listeners Modal Negociação (Passo 6.5) --- */

        // 1. Listener para o botão "Gerar Relatório de Negociação" (o que abre o modal)
        if (elBtnGerarRelatorio) {
            elBtnGerarRelatorio.addEventListener('click', () => {
                // A função de popular os dados está na 'atualizarResultados'
                // Aqui, apenas mostramos o modal
                if (modalNegociacao) {
                    modalNegociacao.style.display = 'flex';
                }
            });
        }

        // 2. Botão de Fechar o modal de Negociação
        if (modalNegociacaoClose) {
            modalNegociacaoClose.addEventListener('click', () => {
            modalNegociacao.style.display = 'none';
            });
        }

        // 4. Botão de Copiar Texto
        if (btnCopiarRelatorio) {
            btnCopiarRelatorio.addEventListener('click', () => {
                const content = document.getElementById('report-text-content');
                if (navigator.clipboard && content) {
                    navigator.clipboard.writeText(content.innerText)
                        .then(() => {
                            // Pode trocar por um feedback visual mais elegante
                            alert('Relatório copiado para a área de transferência!');
                        })
                        .catch(err => {
                            alert('Falha ao copiar. Tente manualmente.');
                        });
                }
            });
        }

        initAnimadores();

        // 4. Calcula uma vez no load (para zerar os campos)
        calcularEAtualizarUI();
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
            plrAnual: getFloat('clt-plr-anual'), // <-- ADICIONADO AQUI
            incluirFGTS: getChecked('clt-incluir-fgts'), // <-- ADICIONADO AQUI
        };

        // 2. Obter Inputs PJ
        // Segurança: pega o botão ativo ou usa 'simples' como fallback
        const activeTab = document.querySelector('.pj-tab-btn.active') || document.querySelector('.pj-tab-btn');
        const regimePJ = activeTab ? (activeTab.dataset?.regime || 'simples') : 'simples';

        let inputsPJ = { regime: regimePJ };
        let faturamentoPJ = 0;

        if (regimePJ === 'simples') {
            faturamentoPJ = getFloat('pj-faturamento');
            inputsPJ = { ...inputsPJ,
                faturamento: faturamentoPJ,
                rbt12: getFloat('pj-rbt12') || (faturamentoPJ * 12),
                anexo: (document.getElementById('pj-atividade').value === 'fator_r') ? 'v' : 'iii',
                contabilidade: getFloat('pj-contabilidade'),
                outros: getFloat('pj-outros'),
            };
        } else if (regimePJ === 'mei') {
            faturamentoPJ = getFloat('pj-faturamento-mei');
            inputsPJ = { ...inputsPJ,
                faturamento: faturamentoPJ,
                custoDAS: getFloat('pj-custo-mei'),
                outros: getFloat('pj-outros-mei'),
            };
        } else if (regimePJ === 'manual') {
            faturamentoPJ = getFloat('pj-faturamento-manual');
            inputsPJ = { ...inputsPJ,
                faturamento: faturamentoPJ,
                taxa: getFloat('pj-taxa-manual'),
                custosFixos: getFloat('pj-custos-fixos-manual'),
            };
        }

        // 3. Executar Cálculos
        const resCLT = (inputsCLT.bruto > 0) ? calcularCLT_Colaborador(inputsCLT) : { 
            valorFinal: 0, totalImpostos: 0, aliquotaEfetiva: 0,
            detalhesImpostos: [], // Objeto vazio para UI
            // Adiciona campos de fallback para o modal
            bruto: 0, inss: 0, irrf: 0, salarioEmConta: 0 
        };

        const resCustoEmpresa = (inputsCLT.bruto > 0) ? calcularCLT_CustoEmpresa(inputsCLT) : {
            totalCusto: 0, bruto: 0, inssPatronal: 0, fgts: 0, provisao13Ferias: 0, provisaoMultaFGTS: 0, beneficios: 0
        };

        ultimoResultadoCLT = resCLT; // Guarda o último resultado para o modal

        let resPJ;
        if (faturamentoPJ > 0) {
            if (regimePJ === 'simples') resPJ = calcularPJ_Colaborador(inputsPJ);
            else if (regimePJ === 'mei') resPJ = calcularPJ_MEI(inputsPJ);
            else resPJ = calcularPJ_Manual(inputsPJ);
        } else {
            resPJ = { 
                valorFinal: 0, totalImpostos: 0, aliquotaEfetiva: 0, titulo: "PJ",
                detalhesImpostos: [] // Objeto vazio para UI
            };
        }

        // 4. Atualizar Painel de Resultados
        atualizarResultados(resCLT, resPJ, inputsCLT, inputsPJ, resCustoEmpresa);

    } catch (e) {
        console.error("Erro no cálculo:", e);
    }
}

/* --- Bloco: Função de Atualização da UI (Painel Direito) --- 
*** OTIMIZADA: Usa variáveis de cache e é segura contra XSS ***
*/
function atualizarResultados(clt, pj, inputsCLT, inputsPJ, resCustoEmpresa) {
    const cltFinal = clt.valorFinal || 0;
    const cltSalarioEmConta = clt.salarioEmConta || 0;
    const pjFinal = pj.valorFinal || 0;
    const cltImpostos = clt.totalImpostos || 0;
    const pjImpostos = pj.totalImpostos || 0;

    const diferencaAbsoluta = Math.abs(pjFinal - cltFinal);
    const pjEhMelhor = pjFinal > cltFinal;
    const cltEhMelhor = cltFinal > pjFinal;

    atualizarMainBarChart(cltFinal, pjFinal, pjEhMelhor);

    // --- INÍCIO: Preparação Dados Donut (Func. 3 / Passo 3) ---
    const cltDonutData = {
        // [cite: 35]
        salarioEmConta: clt.salarioEmConta, 
        // [cite: 36]
        beneficiosProvisoes: Math.max(0, clt.valorFinal - clt.salarioEmConta), 
        // [cite: 37]
        impostosDescontos: clt.totalImpostos 
    };

    const pjDonutData = {
        // [cite: 39]
        liquido: pj.valorFinal, 
        // [cite: 40]
        custos: pj.totalImpostos 
    };
    atualizarDonutCharts(cltDonutData, pjDonutData);
    // --- FIM: Preparação Dados Donut ---

    // --- INÍCIO: Preparação Dados Sparkline (Func. 3 / Passo 5 - CORRIGIDO) ---
    const cltLineData = [0];
    const pjLineData = [0];
    for (let i = 1; i <= 12; i++) {
        cltLineData.push(cltFinal * i); // Acumulado CLT (sempre crescente)
        pjLineData.push(pjFinal * i); // Acumulado PJ (sempre crescente)
    }
    // Passa os dois arrays de dados para a função do gráfico
    atualizarImpactoAnualChart(cltLineData, pjLineData);
    // --- FIM: Preparação Dados Sparkline ---
    const basePercentual = (cltFinal > 0 && pjFinal > 0) ? Math.min(cltFinal, pjFinal) : (diferencaAbsoluta > 0 ? Math.max(cltFinal, pjFinal) : 0);
    const variacaoPercentual = (basePercentual > 0) ? (diferencaAbsoluta / basePercentual) : (diferencaAbsoluta > 0 ? 1 : 0);

    // --- ANIMAÇÃO (Req. #2 e #5): Dispara o fade-in/slide-up nos cards ---
    const cardsParaAnimar = [
        '.result-card-principal', 
        '.result-card-comparativo',
        '#impacto-anual-card',
        '.recommendation-card',
        '#equivalency-card'
    ];
    
    cardsParaAnimar.forEach(selector => {
        // QuerySelectorAll ainda é necessário aqui para encontrar as classes
        document.querySelectorAll(selector).forEach(el => {
            el.classList.remove('is-updating');
            void el.offsetWidth; 
            el.classList.add('is-updating');
        });
    });

    // 1. Card Variação Líquida (Usa cache)
    if (animadores['res-variacao-abs']) {
        animadores['res-variacao-abs'].update(diferencaAbsoluta);
    } else if (elResVariacaoAbs) {
        elResVariacaoAbs.textContent = formatBRL(diferencaAbsoluta);
    }
    
    if (elVarCard) elVarCard.classList.remove('clt-wins'); 
    if (elResVariacaoPerc) {
        elResVariacaoPerc.classList.remove('positivo', 'negativo', 'clt-wins'); 

        if (pjEhMelhor) {
            elResVariacaoPerc.textContent = `${formatPerc(variacaoPercentual)} a mais como PJ`;
            elResVariacaoPerc.classList.add('positivo'); 
        } else if (cltEhMelhor) {
            elResVariacaoPerc.textContent = `${formatPerc(variacaoPercentual)} a mais como CLT`;
            elResVariacaoPerc.classList.add('clt-wins'); 
            if (elVarCard) elVarCard.classList.add('clt-wins'); 
        } else {
            elResVariacaoPerc.textContent = `Valores equivalentes`;
        }
    }

    // 2. Cards Comparativos (Líquido e Impostos) (Usa cache)
    if (animadores['res-clt-liquido']) animadores['res-clt-liquido'].update(cltFinal);
    else if (elResCltLiquido) elResCltLiquido.textContent = formatBRL(cltFinal);
    
    if (animadores['res-clt-salario-em-conta']) animadores['res-clt-salario-em-conta'].update(cltSalarioEmConta);
    else if (elResCltSalarioEmConta) elResCltSalarioEmConta.textContent = formatBRL(cltSalarioEmConta);
    
    if (animadores['res-pj-liquido']) animadores['res-pj-liquido'].update(pjFinal);
    else if (elResPjLiquido) elResPjLiquido.textContent = formatBRL(pjFinal);
    
    if (elResCltImpostos) elResCltImpostos.textContent = formatBRL(cltImpostos);
    if (elResPjImpostos) elResPjImpostos.textContent = formatBRL(pjImpostos);
    if (elResPjImpostosLabel) elResPjImpostosLabel.textContent = `Custos (${pj.titulo || 'PJ'})`;
    if (elResCltAliquota) elResCltAliquota.textContent = `${(clt.aliquotaEfetiva * 100).toFixed(1)}% do bruto`.replace('.',',');
    if (elResPjAliquota) elResPjAliquota.textContent = `${(pj.aliquotaEfetiva * 100).toFixed(1)}% da receita`.replace('.',',');

    // 3. Card Impacto Anual (Usa cache)
    if (animadores['res-clt-anual']) animadores['res-clt-anual'].update(cltFinal * 12);
    else if (elResCltAnual) elResCltAnual.textContent = formatBRL(cltFinal * 12);
    
    if (animadores['res-pj-anual']) animadores['res-pj-anual'].update(pjFinal * 12);
    else if (elResPjAnual) elResPjAnual.textContent = formatBRL(pjFinal * 12);

    const difAnualValorNum = Math.abs(pjFinal * 12 - cltFinal * 12);
    if (elDifAnualWrapper) elDifAnualWrapper.classList.remove('positivo', 'negativo');

    if (animadores['res-anual-diferenca-valor'] && elDifAnualLabel) {
        if (pjEhMelhor) {
            animadores['res-anual-diferenca-valor'].options.prefix = '+R$ ';
            animadores['res-anual-diferenca-valor'].update(difAnualValorNum);
            elDifAnualLabel.textContent = '/ano (PJ)';
            if(elDifAnualWrapper) elDifAnualWrapper.classList.add('positivo');
        } else if (cltEhMelhor) {
            animadores['res-anual-diferenca-valor'].options.prefix = '+R$ ';
            animadores['res-anual-diferenca-valor'].update(difAnualValorNum);
            elDifAnualLabel.textContent = '/ano (CLT)';
            if(elDifAnualWrapper) elDifAnualWrapper.classList.add('negativo'); 
        } else {
            animadores['res-anual-diferenca-valor'].options.prefix = 'R$ ';
            animadores['res-anual-diferenca-valor'].update(0);
            elDifAnualLabel.textContent = 'Equivalente';
        }
    } else if (elDifAnualWrapper && elAnimadorDifAnualValor && elDifAnualLabel) { 
        // Fallback seguro usando cache
        if (pjEhMelhor) {
            elAnimadorDifAnualValor.textContent = `+${formatBRL(difAnualValorNum)}`;
            elDifAnualLabel.textContent = '/ano (PJ)';
            elDifAnualWrapper.classList.add('positivo');
        } else if (cltEhMelhor) {
            elAnimadorDifAnualValor.textContent = `+${formatBRL(difAnualValorNum)}`;
            elDifAnualLabel.textContent = '/ano (CLT)';
            elDifAnualWrapper.classList.add('negativo');
        } else {
            elAnimadorDifAnualValor.textContent = formatBRL(0);
            elDifAnualLabel.textContent = 'Equivalente';
        }
    }

    // 4. Card Recomendação (Usa cache, XSS-safe)
    if (elRecomendacao && elRecomendacaoCard) {
        elRecomendacaoCard.classList.remove('negativo', 'clt-wins');
        elRecomendacao.textContent = ''; // Limpa

        if (cltFinal === 0 && pjFinal === 0) {
            elRecomendacao.textContent = "Preencha os valores à esquerda para ver a recomendação.";
        } else if (pjEhMelhor) {
            const strong = document.createElement('strong');
            strong.textContent = `PJ é ${formatBRL(diferencaAbsoluta)} mais vantajoso`;
            elRecomendacao.append(strong, " por mês.");
        } else if (cltEhMelhor) {
            const strong = document.createElement('strong');
            strong.textContent = `CLT é ${formatBRL(diferencaAbsoluta)} mais vantajoso`;
            elRecomendacao.append(strong, " por mês.");
            elRecomendacaoCard.classList.add('clt-wins');
        } else {
            const strong = document.createElement('strong');
            strong.textContent = "financeiramente equivalentes";
            elRecomendacao.append("Os cenários são ", strong, ". Analise fatores como estabilidade e benefícios.");
        }
    }

    // 5. Card Equivalência (Usa cache, XSS-safe)
    if (elEquivalencia) {
        elEquivalencia.textContent = ''; // Limpa

        if (cltFinal === 0 || pjFinal === 0) {
            elEquivalencia.textContent = "Preencha ambos os cenários (CLT e PJ) para ver a equivalência.";
        } else {
            const valSpan = document.createElement('span');
            valSpan.className = 'equivalencia-valor';
            const strong = document.createElement('strong');

            if (pjEhMelhor) {
                valSpan.textContent = formatBRL(pj.valorFinal);
                const brutoEquivalente = calcularEquivalenteCLT(pj.valorFinal, inputsCLT);
                strong.textContent = formatBRL(brutoEquivalente);
                elEquivalencia.append("Para ter o mesmo pacote PJ (", valSpan, "), seu salário bruto CLT precisaria ser de aprox. ", strong, ".");

            } else if (cltEhMelhor) {
                valSpan.textContent = formatBRL(clt.valorFinal);
                const faturamentoEquivalente = calcularEquivalentePJ(clt.valorFinal, inputsPJ);
                strong.textContent = formatBRL(faturamentoEquivalente);
                elEquivalencia.append("Para ter o mesmo pacote CLT (", valSpan, "), seu faturamento PJ precisaria ser de aprox. ", strong, ".");
            } else {
                elEquivalencia.textContent = "Os valores de CLT e PJ já são equivalentes.";
            }
        }
    }   

    // 6. Detalhamento de Tributos (CLT) (Usa cache, XSS-safe)
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

    // 7. Detalhamento de Tributos (PJ) (Usa cache, XSS-safe)
    if (elPjDetalheTitulo) elPjDetalheTitulo.textContent = `Detalhes PJ (${pj.titulo || 'Simples'})`;
    
    if (elTaxDetailsPj) {
        elTaxDetailsPj.textContent = ''; // Limpa
        let pjTotalCustos = 0;
        
        pj.detalhesImpostos.forEach(item => {
            if (item.valor > 0) {
                elTaxDetailsPj.appendChild(criarTaxItem(item.nome, item.valor, item.percentual, 'desconto', 'da receita'));
                pjTotalCustos += item.valor;
            }
        });
        
        if (pjTotalCustos > 0) {
            elTaxDetailsPj.appendChild(criarTaxItemTotal(`Total de Custos ${pj.titulo}`, pjTotalCustos, 'desconto'));
        } else {
            const fallbackItemPj = document.createElement('div');
            fallbackItemPj.className = 'tax-item';
            const fallbackSpanPj = document.createElement('span');
            fallbackSpanPj.textContent = 'Nenhum custo';
            fallbackItemPj.appendChild(fallbackSpanPj);
            elTaxDetailsPj.appendChild(fallbackItemPj);
        }
    }

    // 8. Card Custo Empresa (Funcionalidade 2 / MODIFICADO P/ GRÁFICO) 
    atualizarCustoEmpresaChart(resCustoEmpresa);

    if (elCustoEmpresaTotal) { // Atualiza o total
        elCustoEmpresaTotal.textContent = formatBRL(resCustoEmpresa.totalCusto);
    }

    // 9. Card Economia Empresa (MODIFICADO com Microcopy - Passo 6)
    if (elEconomiaEmpresaTexto && elBtnGerarRelatorio) {
        const custoCLT = resCustoEmpresa.totalCusto;
        const faturamentoPJ = inputsPJ.faturamento;
        const economia = custoCLT - faturamentoPJ;
        
        /* --- INÍCIO: Popula o Modal de Relatório (Passo 6.5) --- */
        const elReportBruto = document.getElementById('report-clt-bruto');
        const elReportCusto = document.getElementById('report-custo-total');
        const elReportPJ = document.getElementById('report-pj-faturamento');
        const elReportEconomia = document.getElementById('report-economia');
        const elReportNegativo = document.getElementById('report-texto-negativo');
        const elReportExcedente = document.getElementById('report-custo-excedente');
        
        if (elReportBruto) {
            elReportBruto.textContent = formatBRL(inputsCLT.bruto);
            elReportCusto.textContent = formatBRL(custoCLT);
            elReportPJ.textContent = formatBRL(faturamentoPJ);
            elReportEconomia.textContent = formatBRL(Math.abs(economia));
            elReportExcedente.textContent = formatBRL(Math.abs(economia));
        }
        /* --- FIM: Popula Modal --- */


        if (custoCLT > 0 && faturamentoPJ > 0) {

            elEconomiaEmpresaTexto.textContent = ''; // Limpa o conteúdo

            if (economia > 0) {
                // Cenário onde PJ é mais barato para a empresa (microcopy)
                const strongEl = document.createElement('strong');
                strongEl.textContent = `${formatBRL(economia)} / mês`;
                elEconomiaEmpresaTexto.append('Sua vantagem (economia para a empresa): ', strongEl);

                elBtnGerarRelatorio.style.display = 'flex'; // Mostra o botão

                // (Controle do modal)
                if(elReportNegativo) elReportNegativo.style.display = 'none';
                if(elReportEconomia) elReportEconomia.parentElement.style.display = 'block';

            } else {
                // Cenário onde PJ é mais caro que o custo CLT
                const strongEl = document.createElement('strong');
                strongEl.className = 'negativo';
                strongEl.textContent = formatBRL(Math.abs(economia));
                elEconomiaEmpresaTexto.append('O faturamento PJ é ', strongEl, ' superior ao custo total do CLT.');

                elBtnGerarRelatorio.style.display = 'none'; // Esconde o botão

                // (Controle do modal)
                if(elReportNegativo) elReportNegativo.style.display = 'block';
                if(elReportEconomia) elReportEconomia.parentElement.style.display = 'none';
            }
        } else {
            elEconomiaEmpresaTexto.textContent = "Preencha o salário CLT e o faturamento PJ para ver a economia da empresa.";
            elBtnGerarRelatorio.style.display = 'none'; // Esconde o botão
        }


    atualizarAlturasAccordions(); // Reajusta o tamanho dos accordions abertos

}
}

/* --- Bloco: Funções de CÁLCULO (Motor) --- 
*** ATUALIZADAS PARA RETORNAR 'detalhesImpostos' ***
*/

function calcularCLT_Colaborador(inputs) {
    // --- Entradas (sem mudança) ---
    const { bruto, dependentes, beneficios, descontos, incluirProvisao, plrAnual, incluirFGTS } = inputs;

    // --- Cálculos Mensais (Salário em Conta) ---
    const totalDescontosFixos = descontos;
    const inss = calcularINSS_Progressivo(bruto);
    const irrf = calcularIRRF_Preciso(bruto, inss, dependentes, totalDescontosFixos);
    
    const totalImpostosRetidos = inss + irrf; // Impostos retidos NO MÊS
    const totalCustosMensais = totalImpostosRetidos + totalDescontosFixos; // Total que sai do salário

    // Este é o "Salário em Conta" que o usuário vê
    const salarioEmConta = bruto - totalCustosMensais;
    const plrMensal = (plrAnual || 0) / 12;

    // --- CÁLCULO DO PACOTE (A GRANDE MUDANÇA) ---

    // 1. Benefícios (VR, VA) e PLR
    const liquidoComBeneficios = salarioEmConta + beneficios + plrMensal;

    // 2. Provisão LÍQUIDA (O CÁLCULO CORRETO)
    // Usa as novas funções que adicionamos
    const provisaoLiq13 = calcularProvisaoLiquida13(bruto, dependentes);
    const provisaoLiqFerias = calcularProvisaoLiquidaFerias(bruto, inss, irrf, dependentes, totalDescontosFixos);
    const provisaoLiquidaTotal = provisaoLiq13 + provisaoLiqFerias;

    // 3. FGTS (simples, 8% do bruto mensal)
    const fgts = bruto * 0.08;

    // 4. Pacote Total (SOMA DE LÍQUIDOS + FGTS)
    // É o 'salario em conta' + benefícios + provisões LÍQUIDAS + FGTS
    const pacoteTotal = liquidoComBeneficios + 
                        (incluirFGTS ? fgts : 0) + 
                        (incluirProvisao ? provisaoLiquidaTotal : 0);

    // --- Detalhes para o card (sem mudança na estrutura) ---
    const detalhesImpostos = [];

    // Proventos
    if (beneficios > 0) detalhesImpostos.push({ 
        nome: "Benefícios (VR, VA, etc)", 
        valor: beneficios, 
        percentual: beneficios / (bruto || 1), 
        tipo: 'provento' 
    });
    if (plrMensal > 0) detalhesImpostos.push({ 
        nome: "PLR (Provisão Mensal)", 
        valor: plrMensal, 
        percentual: plrMensal / (bruto || 1), 
        tipo: 'provento' 
    });

    // MODIFICAÇÃO no FGTS (só o nome, o valor está ok)
    if (incluirFGTS && fgts > 0) detalhesImpostos.push({ 
        nome: "FGTS (Depósito Mensal)", // <-- Nome mais claro
        valor: fgts, 
        percentual: fgts / (bruto || 1), 
        tipo: 'provento' 
    });

    // MODIFICAÇÃO na Provisão (de bruto para líquido)
    if (incluirProvisao && provisaoLiquidaTotal > 0) detalhesImpostos.push({ 
        nome: "13º e Férias (Média Líquida)", // <-- Nome e valor CORRETOS
        valor: provisaoLiquidaTotal, 
        percentual: provisaoLiquidaTotal / (bruto || 1), 
        tipo: 'provento' 
    });

    // Descontos (sem mudança)
    if (inss > 0) detalhesImpostos.push({ 
        nome: "INSS", 
        valor: inss, 
        percentual: inss / (bruto || 1), 
        tipo: 'desconto' 
    });
    if (irrf > 0) detalhesImpostos.push({ 
        nome: "IRRF", 
        valor: irrf, 
        percentual: irrf / (bruto || 1), 
        tipo: 'desconto' 
    });
    if (totalDescontosFixos > 0) detalhesImpostos.push({ 
        nome: "Outros Descontos", 
        valor: totalDescontosFixos, 
        percentual: totalDescontosFixos / (bruto || 1), 
        tipo: 'desconto' 
    });

    // Retorno para a UI
    // Retorno para a UI
    return {
        valorFinal: pacoteTotal,
        salarioEmConta: salarioEmConta, // Retorna o salário em conta
        totalImpostos: totalCustosMensais, // Total de descontos (impostos + fixos)
        aliquotaEfetiva: (bruto > 0) ? totalCustosMensais / bruto : 0,
        detalhesImpostos: detalhesImpostos,

        // --- NOVO PARA MODAL CONTRACHEQUE ---
        bruto: bruto,
        inss: inss,
        irrf: irrf
        // --- FIM NOVO ---
    };
}

// ========== INÍCIO: Funcionalidade 2 - Custo Empresa ==========
/**
 * Calcula o custo total de um funcionário CLT para a empresa.
 * Usa as regras de bolso/provisões especificadas no .docx
 */
function calcularCLT_CustoEmpresa(inputs) {
    const { bruto, beneficios } = inputs;
    if (bruto <= 0) {
        return { totalCusto: 0, bruto: 0, inssPatronal: 0, fgts: 0, provisao13Ferias: 0, provisaoMultaFGTS: 0, beneficios: 0};
    }

    // 1. INSS Patronal (Regra Geral 20%) [cite: 21]
    const inssPatronal = bruto * 0.20;

    // 2. FGTS (8%) [cite: 22]
    const fgts = bruto * 0.08;

    // 3. Provisão 13º/Férias (19.4% conforme .docx) [cite: 23]
    // (Isso é uma "regra de bolso" que inclui 13º, Férias, 1/3 Férias e encargos sobre eles)
    const provisao13Ferias = bruto * 0.194;

    // 4. Provisão Multa 40% FGTS (4% conforme .docx) [cite: 24]
    // (Regra de bolso para a provisão mensal da multa rescisória)
    const provisaoMultaFGTS = bruto * 0.04;

    // 5. Custo Total [cite: 25]
    const totalCustoEmpresa = bruto + inssPatronal + fgts + provisao13Ferias + provisaoMultaFGTS + beneficios;

    return {
        totalCusto: totalCustoEmpresa,
        bruto: bruto,
        inssPatronal: inssPatronal,
        fgts: fgts,
        provisao13Ferias: provisao13Ferias,
        provisaoMultaFGTS: provisaoMultaFGTS,
        beneficios: beneficios
    };
}
// ========== FIM: Funcionalidade 2 - Custo Empresa ==========

function calcularPJ_Colaborador(inputs) {
    const { faturamento, rbt12, anexo, contabilidade, outros } = inputs;
    
    let prolaboreDefinido = 0;
    let anexoCalculado = anexo;

    if (anexo === 'v') { // Lógica Otimizador Fator R
        const prolaboreIdeal = faturamento * 0.28;
        prolaboreDefinido = Math.max(prolaboreIdeal, SALARIO_MINIMO);
        anexoCalculado = (prolaboreDefinido / (faturamento || 1) >= 0.28) ? 'iii' : 'v';
    } else {
        prolaboreDefinido = SALARIO_MINIMO;
        anexoCalculado = 'iii';
    }
    
    prolaboreDefinido = Math.min(faturamento, prolaboreDefinido);

    const tabela = (anexoCalculado === 'iii') ? ANEXO_III : ANEXO_V;
    const aliquotaEfetivaSimples = calcularAliquotaEfetiva(rbt12, tabela);
    const impostoSimples = faturamento * aliquotaEfetivaSimples;
    const inssProlabore = Math.min(prolaboreDefinido * 0.11, 0.11 * TETO_INSS);
    const baseIR = prolaboreDefinido - inssProlabore;
    const irrfProlabore = calcularIRRF_PelaTabela(baseIR, 0); 
    
    const custosFixos = contabilidade + outros;
    const custosTotais = impostoSimples + inssProlabore + irrfProlabore + custosFixos;
    const liquidoPJ = faturamento - custosTotais;
    
    const detalhesImpostos = [];
    if (impostoSimples > 0) detalhesImpostos.push({ nome: `Simples (Anexo ${anexoCalculado.toUpperCase()})`, valor: impostoSimples, percentual: aliquotaEfetivaSimples, tipo: 'desconto' });
    if (inssProlabore > 0) detalhesImpostos.push({ nome: "INSS Pró-labore", valor: inssProlabore, percentual: inssProlabore / (faturamento || 1), tipo: 'desconto' });
    if (irrfProlabore > 0) detalhesImpostos.push({ nome: "IRRF Pró-labore", valor: irrfProlabore, percentual: irrfProlabore / (faturamento || 1), tipo: 'desconto' });
    if (contabilidade > 0) detalhesImpostos.push({ nome: "Contabilidade", valor: contabilidade, percentual: contabilidade / (faturamento || 1), tipo: 'desconto' });
    if (outros > 0) detalhesImpostos.push({ nome: "Outros Custos", valor: outros, percentual: outros / (faturamento || 1), tipo: 'desconto' });

    return {
        valorFinal: Math.max(0, liquidoPJ),
        totalImpostos: custosTotais,
        titulo: `Simples ${anexoCalculado.toUpperCase()}`,
        aliquotaEfetiva: (faturamento > 0) ? custosTotais / faturamento : 0,
        detalhesImpostos: detalhesImpostos
    };
}

function calcularPJ_MEI(inputs) {
    const { faturamento, custoDAS, outros } = inputs;
    const custosTotais = custoDAS + outros;
    const liquidoPJ = faturamento - custosTotais;
    
    const detalhesImpostos = [];
    if (custoDAS > 0) detalhesImpostos.push({ nome: "DAS-MEI", valor: custoDAS, percentual: custoDAS / (faturamento || 1), tipo: 'desconto' });
    if (outros > 0) detalhesImpostos.push({ nome: "Outros Custos", valor: outros, percentual: outros / (faturamento || 1), tipo: 'desconto' });

    return {
        valorFinal: Math.max(0, liquidoPJ),
        totalImpostos: custosTotais,
        titulo: "MEI",
        aliquotaEfetiva: (faturamento > 0) ? custosTotais / faturamento : 0,
        detalhesImpostos: detalhesImpostos
    };
}

function calcularPJ_Manual(inputs) {
    const { faturamento, taxa, custosFixos } = inputs;
    const imposto = faturamento * (taxa / 100);
    const custosTotais = imposto + custosFixos;
    const liquidoPJ = faturamento - custosTotais;
    
    const detalhesImpostos = [];
    if (imposto > 0) detalhesImpostos.push({ nome: `Imposto Manual (${taxa}%)`, valor: imposto, percentual: taxa / 100, tipo: 'desconto' });
    if (custosFixos > 0) detalhesImpostos.push({ nome: "Custos Fixos", valor: custosFixos, percentual: custosFixos / (faturamento || 1), tipo: 'desconto' });

    return {
        valorFinal: Math.max(0, liquidoPJ),
        totalImpostos: custosTotais,
        titulo: `Manual (${taxa}%)`,
        aliquotaEfetiva: (faturamento > 0) ? custosTotais / faturamento : 0,
        detalhesImpostos: detalhesImpostos
    };
}

/* --- (Cole este bloco na linha 485, após calcularPJ_Manual) --- */

/**
 * Calcula a provisão mensal LÍQUIDA do 13º salário.
 * O IRRF do 13º tem tributação exclusiva (não usa desconto simplificado).
 */
function calcularProvisaoLiquida13(bruto, dependentes) {
    if (bruto <= 0) return 0;
    
    // 1. Calcula descontos sobre o 13º
    const inss13 = calcularINSS_Progressivo(bruto);
    const baseIRRF13 = bruto - inss13;
    const irrf13 = calcularIRRF_PelaTabela(baseIRRF13, dependentes); // Usa a função corrigida
    
    // 2. Calcula o líquido
    const liquido13 = bruto - inss13 - irrf13;
    
    // 3. Retorna a provisão mensal
    return liquido13 / 12;
}

/**
 * Calcula a provisão mensal LÍQUIDA do "bônus" de 1/3 de férias.
 * Compara o líquido de um mês normal com o líquido do mês de férias.
 */
function calcularProvisaoLiquidaFerias(bruto, inssNormal, irrfNormal, dependentes, descontosFixos) {
    if (bruto <= 0) return 0;

    // 1. Líquido de um mês normal (Salário em Conta)
    // (O 'salarioEmConta' da função principal)
    const salarioLiquidoNormal = bruto - inssNormal - irrfNormal - descontosFixos;

    // 2. Líquido do Mês de Férias (com 1/3)
    const brutoFerias = bruto + (bruto / 3);
    const inssFerias = calcularINSS_Progressivo(brutoFerias);
    // Férias usa o cálculo de IRRF normal (simplificado ou não)
    const irrfFerias = calcularIRRF_Preciso(brutoFerias, inssFerias, dependentes, descontosFixos);
    
    // O líquido total do mês de férias
    const salarioLiquidoFerias = brutoFerias - inssFerias - irrfFerias - descontosFixos;

    // 3. O "bônus" líquido é a diferença que sobra
    const bonusLiquidoTotal = salarioLiquidoFerias - salarioLiquidoNormal;
    
    // 4. Retorna a provisão mensal desse bônus
    return bonusLiquidoTotal / 12;
}


/* --- Bloco: Funções AUXILIARES de Cálculo (Tabelas 2025) --- */
function calcularINSS_Progressivo(salario) {
    if (salario <= 0) return 0;
    if (salario > TETO_INSS) salario = TETO_INSS;
    // Usa a tabela com 'deduzir' que é matematicamente idêntica à progressiva
    for (const faixa of FAIXAS_INSS) {
        if (salario <= faixa.teto) {
            return (salario * faixa.aliquota) - faixa.deduzir;
        }
    }
    return INSS_TETO; // Retorna o teto se for maior que a última faixa (já tratado, mas é uma garantia)
}

function calcularIRRF_Preciso(bruto, inss, dependentes, outrosDescontos) {
    if (bruto <= 0) return 0;
    const deducaoDependentes = dependentes * DEDUCAO_DEPENDENTE_IRRF;
    
    // 1. Cálculo Padrão (com dependentes)
    const baseCalculoPadrao = bruto - inss - deducaoDependentes - (outrosDescontos || 0);
    const impostoPadrao = calcularIRRF_PelaTabela(baseCalculoPadrao);
    
    // 2. Cálculo Simplificado (ignora dependentes e INSS, usa desconto fixo)
    const baseCalculoSimplificada = bruto - DESCONTO_SIMPLIFICADO_IRRF;
    const impostoSimplificado = calcularIRRF_PelaTabela(baseCalculoSimplificada);
    
    // Retorna o MENOR imposto, que é o mais vantajoso para o contribuinte
    return Math.max(0, Math.min(impostoPadrao, impostoSimplificado));
}

/* --- (Substitua a função original da linha 520) --- */

function calcularIRRF_PelaTabela(base, dependentes = 0) {
    if (base <= 0) return 0;
    
    // CORREÇÃO: Adiciona dedução de dependentes
    const deducaoDependentes = (dependentes || 0) * DEDUCAO_DEPENDENTE_IRRF;
    const baseCalculo = Math.max(0, base - deducaoDependentes);

    for (const faixa of FAIXAS_IRRF) {
        if (baseCalculo <= faixa.limite) {
            // Aplica a fórmula sobre a base já deduzida
            return Math.max(0, (baseCalculo * faixa.aliquota) - faixa.deducao);
        }
    }
    // Para valores acima da última faixa
    const ultimaFaixa = FAIXAS_IRRF[FAIXAS_IRRF.length - 1];
    return Math.max(0, (baseCalculo * ultimaFaixa.aliquota) - ultimaFaixa.deducao);
}
function calcularAliquotaEfetiva(rbt12, tabela) {
    if (rbt12 <= 0) return 0;
    let faixaCorreta = tabela[tabela.length - 1]; // Assume a última faixa
    for (const faixa of tabela) {
        if (rbt12 <= faixa.teto) {
            faixaCorreta = faixa;
            break;
        }
    }
    const { aliquota, pd } = faixaCorreta;
    // Fórmula da Alíquota Efetiva = (RBT12 * Alíquota Nominal - Parcela a Deduzir) / RBT12
    const aliquotaEfetiva = ((rbt12 * aliquota) - pd) / rbt12;
    return aliquotaEfetiva > 0 ? aliquotaEfetiva : 0;
}

/* --- NOVO: Bloco de Cálculo de Equivalência (Busca Binária) --- */

/**
 * Tenta encontrar qual Salário Bruto CLT_Bruto gera um Pacote Líquido
 * (valorFinal) igual ao targetNetPJ.
 */
function calcularEquivalenteCLT(targetNetPJ, inputsCLTBase) {
    if (targetNetPJ <= 0) return 0;
    let minBruto = 0;
    let maxBruto = targetNetPJ * 3; // Chute inicial alto
    let iteracoes = 0;
    const maxIteracoes = 30;
    const precisao = 1.0; // +/- R$ 1,00

    while (iteracoes < maxIteracoes) {
        let chuteBruto = (minBruto + maxBruto) / 2;
        const inputsChute = {
            ...inputsCLTBase, // Usa os checkboxes e dependentes da tela
            bruto: chuteBruto,
            // Pega os valores atuais dos outros campos
            plrAnual: getFloat('clt-plr-anual'), 
            beneficios: getFloat('clt-beneficios'),
            descontos: getFloat('clt-descontos')
        };
        const netCalculado = calcularCLT_Colaborador(inputsChute).valorFinal;
        
        if (Math.abs(netCalculado - targetNetPJ) <= precisao) return chuteBruto;
        if (netCalculado < targetNetPJ) minBruto = chuteBruto;
        else maxBruto = chuteBruto;
        iteracoes++;
    }
    return (minBruto + maxBruto) / 2;
}

/**
 * Tenta encontrar qual Faturamento Bruto PJ gera um Líquido
 * (valorFinal) igual ao targetNetCLT.
 */
function calcularEquivalentePJ(targetNetCLT, inputsPJBase) {
    if (targetNetCLT <= 0) return 0;
    let minFat = 0;
    let maxFat = targetNetCLT * 3; // Chute inicial alto
    let iteracoes = 0;
    const maxIteracoes = 30;
    const precisao = 1.0; // +/- R$ 1,00
    const regimePJ = inputsPJBase.regime;

    while (iteracoes < maxIteracoes) {
        let chuteFat = (minFat + maxFat) / 2;
        let inputsChute = { ...inputsPJBase };

        // Atualiza o faturamento e RBT12 no chute
        if (regimePJ === 'simples') {
            inputsChute.faturamento = chuteFat;
            // Simplificação: assume rbt12 = fat * 12 se o RBT12 não for maior
            inputsChute.rbt12 = Math.max(getFloat('pj-rbt12'), chuteFat * 12);
        } else if (regimePJ === 'mei') {
            inputsChute.faturamento = chuteFat;
        } else if (regimePJ === 'manual') {
            inputsChute.faturamento = chuteFat;
        }
        
        let netCalculado = 0;
        if (regimePJ === 'simples') netCalculado = calcularPJ_Colaborador(inputsChute).valorFinal;
        else if (regimePJ === 'mei') netCalculado = calcularPJ_MEI(inputsChute).valorFinal;
        else netCalculado = calcularPJ_Manual(inputsChute).valorFinal;

        if (Math.abs(netCalculado - targetNetCLT) <= precisao) return chuteFat;
        if (netCalculado < targetNetCLT) minFat = chuteFat;
        else maxFat = chuteFat;
        iteracoes++;
    }
    return (minFat + maxFat) / 2;
}

/* --- INÍCIO: Lógica Gráfico Principal (Func. 3) --- */

function atualizarMainBarChart(cltValor, pjValor, pjEhMelhor) {
    const ctx = document.getElementById('main-bar-chart');
    if (!ctx) return; // Se o canvas não existir, sai

    const corCLT = 'rgba(152, 195, 121, 0.8)'; // Verde (var(--cor-clt))
    const corPJ = 'rgba(97, 175, 239, 0.8)';  // Azul (var(--cor-pj))
    const corVantagem = 'rgba(0, 212, 200, 0.9)'; // Teal (var(--cor-acao-secundaria))

    const dados = {
        labels: ['CLT', 'PJ'],
        datasets: [{
            label: 'Valor Líquido Mensal',
            data: [cltValor, pjValor],
            backgroundColor: [
                pjEhMelhor ? corCLT : corVantagem, // CLT é vantagem (verde) ou normal?
                pjEhMelhor ? corVantagem : corPJ  // PJ é vantagem (teal) ou normal?
            ],
            borderRadius: 4,
            borderSkipped: false,
        }]
    };

    const config = {
        type: 'bar', // Tipo barra
        data: dados,
        options: {
            indexAxis: 'y', // <-- Transforma em barras horizontais
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // Sem legenda [cite: 24]
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: ${formatBRL(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: { // Eixo X (valores)
                    display: false, // Sem eixos visíveis [cite: 24]
                    grid: { display: false }
                },
                y: { // Eixo Y (labels CLT/PJ)
                    grid: { display: false, drawBorder: false },
                    ticks: {
                        color: '#F0F0F0', // Cor do texto (var(--cor-texto-principal))
                        font: {
                            size: 14,
                            weight: '600',
                            family: 'Poppins'
                        }
                    }
                }
            }
        }
    };

    // Se o gráfico não existe, cria
    if (!mainBarChart) {
        mainBarChart = new Chart(ctx, config);
    } 
    // Se já existe, apenas atualiza os dados e as cores
    else {
        mainBarChart.data.datasets[0].data = dados.datasets[0].data;
        mainBarChart.data.datasets[0].backgroundColor = dados.datasets[0].backgroundColor;
        mainBarChart.update();
    }
}
/* --- FIM: Lógica Gráfico Principal --- */

/* --- INÍCIO: Lógica Gráficos Donut (Func. 3 / Passo 3) --- */

/**
 * Função helper genérica para criar ou atualizar um gráfico donut
 */
function criarOuAtualizarDonut(chartInstance, canvasId, labels, data, colors) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null; // Sai se o canvas não existe

    // Filtra dados e labels que são 0 para não poluir o gráfico
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

    // Se todos os dados forem 0, mostra um gráfico "cinza"
    if (dataFiltrada.length === 0) {
        dataFiltrada.push(1);
        labelsFiltrados.push('Nenhum dado');
        colorsFiltrados.push('#3A3052'); // var(--cor-borda)
    }

    const chartData = {
        labels: labelsFiltrados,
        datasets: [{
            data: dataFiltrada,
            backgroundColor: colorsFiltrados,
            borderColor: 'rgba(33, 28, 48, 0.5)', // var(--cor-card-bg)
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
            cutout: '70%', // Espessura do donut
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: '#A09CB0', // var(--cor-texto-secundario)
                        font: { family: 'Poppins' },
                        padding: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const valor = context.raw || 0;
                            // Calcula o percentual
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

/**
 * Função principal que gerencia os dois donuts
 */
function atualizarDonutCharts(cltData, pjData) {

    // 1. Atualiza Donut CLT [cite: 34-37]
    cltDonutChart = criarOuAtualizarDonut(
        cltDonutChart,
        'clt-donut-chart',
        ['Salário em Conta', 'Benefícios/Provisões', 'Impostos/Descontos'],
        [cltData.salarioEmConta, cltData.beneficiosProvisoes, cltData.impostosDescontos],
        ['#98c379', '#61AFEF', '#E06C75'] // Verde (CLT), Azul (PJ), Vermelho (Negativo)
    );

    // 2. Atualiza Donut PJ [cite: 38-40]
    pjDonutChart = criarOuAtualizarDonut(
        pjDonutChart,
        'pj-donut-chart',
        ['Líquido Total', 'Custos/Impostos'],
        [pjData.liquido, pjData.custos],
        ['#98c379', '#E06C75'] // Verde (CLT), Vermelho (Negativo)
    );
}
/* --- FIM: Lógica Gráficos Donut --- */

/* --- INÍCIO: Lógica Gráfico Custo Empresa (Func. 3 / Passo 4) --- */

function atualizarCustoEmpresaChart(data) {
    const ctx = document.getElementById('custo-empresa-chart');
    if (!ctx) return;

    // --- INÍCIO DA NOVA LÓGICA DE ORDENAÇÃO ---

    // 1. (MODIFICADO) Combina labels e valores em um array de objetos
    const dataSegments = [
        { label: 'Salário Bruto', value: data.bruto },
        { label: 'Benefícios (VA, VR, etc)', value: data.beneficios },
        { label: 'INSS Patronal (20%)', value: data.inssPatronal },
        { label: 'FGTS (8%)', value: data.fgts },
        { label: 'Provisão 13º/Férias (19.4%)', value: data.provisao13Ferias },
        { label: 'Provisão Multa 40% (4%)', value: data.provisaoMultaFGTS }
    ];

    // 2. (NOVO) A paleta de 6 cores (dark to light)
    const colors = [
        '#4B633C', // 1. Mais Escuro (para o maior valor)
        '#6A8A56', // 2.
        '#88B273', // 3.
        '#A6D990', // 4.
        '#C4E6B4', // 5.
        '#E2F3DA'  // 6. Mais Claro (para o 6º valor)
    ];

    // 3. (NOVO) Filtra valores 0 e ORDENA do maior para o menor
    const sortedSegments = dataSegments
        .filter(segment => segment.value > 0)
        .sort((a, b) => b.value - a.value); // b.value - a.value = Decrescente

    // --- FIM DA NOVA LÓGICA DE ORDENAÇÃO ---


    const datasets = [];
    // Se não houver dados, exibe uma barra cinza
    if (sortedSegments.length === 0) {
         datasets.push({
            label: 'Nenhum dado',
            data: [1],
            backgroundColor: '#3A3052' // var(--cor-borda)
         });
    } else {
        // 4. (MODIFICADO) Itera sobre o array JÁ ORDENADO
        sortedSegments.forEach((segment, index) => {
            datasets.push({
                label: segment.label,
                data: [segment.value], // O valor ordenado
                backgroundColor: colors[index], // A cor da paleta (index 0 = mais escuro)
                barThickness: 40, // Grossura da barra
            });
        });
    }

    const chartData = {
        labels: ['Custo Total'], // Apenas um label no eixo Y
        datasets: datasets
    };

    const config = {
        type: 'bar',
        data: chartData,
        options: {
            indexAxis: 'y', // Barra horizontal
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // Sem legenda
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const valor = context.raw || 0;
                            return ` ${label}: ${formatBRL(valor)}`;
                        }
                    }
                }
            },
            scales: {
                x: { // Eixo X (valores)
                    display: false, // Sem eixos
                    stacked: true, // <-- Chave para empilhar
                    grid: { display: false }
                },
                y: { // Eixo Y (label 'Custo Total')
                    display: false, // Sem eixos
                    stacked: true, // <-- Chave para empilhar
                    grid: { display: false }
                }
            }
        }
    };

    if (!custoEmpresaChart) {
        custoEmpresaChart = new Chart(ctx, config);
    } else {
        custoEmpresaChart.data = chartData;
        custoEmpresaChart.update();
    }
}
/* --- FIM: Lógica Gráfico Custo Empresa --- */

/* --- FIM Bloco de Equivalência --- */

/* --- INÍCIO: Lógica Gráfico Sparkline (Func. 3 / Passo 5 - CORRIGIDO 2.0) --- */

function atualizarImpactoAnualChart(cltData, pjData) {
    const ctx = document.getElementById('impacto-anual-chart');
    if (!ctx) return;

    // Cores do tema (Verde CLT, Azul PJ)
    const corCLT = 'rgba(152, 195, 121, 1)'; // var(--cor-clt)
    const corPJ = 'rgba(97, 175, 239, 1)';  // var(--cor-pj)

    // Cores de fundo (área preenchida)
    const corFundoCLT = 'rgba(152, 195, 121, 0.1)';
    const corFundoPJ = 'rgba(97, 175, 239, 0.1)';

    // Descobre quem tem o valor final maior para dar destaque (linha mais grossa)
    const cltTotal = cltData[cltData.length - 1];
    const pjTotal = pjData[pjData.length - 1];
    const cltEhMelhor = cltTotal > pjTotal;

    const chartData = {
        labels: ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'],
        datasets: [
            { // Linha CLT
                label: 'CLT Acumulado',
                data: cltData,
                borderColor: corCLT,
                borderWidth: cltEhMelhor ? 4 : 2, // Destaque se for melhor
                pointRadius: 0,
                tension: 0.1,
                fill: true, // Adiciona área preenchida
                backgroundColor: corFundoCLT
            },
            { // Linha PJ
                label: 'PJ Acumulado',
                data: pjData,
                borderColor: corPJ,
                borderWidth: !cltEhMelhor ? 4 : 2, // Destaque se for melhor
                pointRadius: 0,
                tension: 0.1,
                fill: true, // Adiciona área preenchida
                backgroundColor: corFundoPJ
            }
        ]
    };

    const config = {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // Sem legenda
                tooltip: {
                    mode: 'index', // Mostra os dois valores no mesmo mês
                    intersect: false,
                    callbacks: {
                        // Mostra "Mês 6" etc. no título
                        title: (tooltipItems) => `Mês ${tooltipItems[0].dataIndex}`,
                        label: (context) => ` ${context.dataset.label}: ${formatBRL(context.raw)}`
                    }
                }
            },
            scales: {
                x: { display: false }, // Sem eixos
                y: { display: false }  // Sem eixos
            }
        }
    };

    if (!impactoAnualChart) {
        impactoAnualChart = new Chart(ctx, config);
    } else {
        // Atualiza os dados das duas linhas
        impactoAnualChart.data.datasets[0].data = cltData;
        impactoAnualChart.data.datasets[1].data = pjData;
        // Atualiza o destaque (linha grossa)
        impactoAnualChart.data.datasets[0].borderWidth = cltEhMelhor ? 4 : 2;
        impactoAnualChart.data.datasets[1].borderWidth = !cltEhMelhor ? 4 : 2;
        impactoAnualChart.update('none'); // Atualiza sem animação
    }
}
/* --- FIM: Lógica Gráfico Sparkline --- */

// --- Bloco de Exportação para Testes (VERSÃO CORRIGIDA) ---
if (typeof module !== 'undefined' && module.exports) {
    
    // Disponibiliza as funções PURAS de cálculo e constantes
    module.exports = {
        // Funções Principais de Cálculo
        calcularCLT_Colaborador,
        calcularPJ_Colaborador,
        calcularPJ_MEI,
        calcularPJ_Manual,

        // Funções Auxiliares
        calcularINSS_Progressivo,
        calcularIRRF_Preciso,
        calcularIRRF_PelaTabela,
        calcularAliquotaEfetiva,
        
        // Constantes (para referência nos testes)
        SALARIO_MINIMO,
        TETO_INSS,
        FAIXAS_INSS,
        FAIXAS_IRRF,
        ANEXO_III,
        ANEXO_V
    };
}
/* --- Fim do Bloco de Exportação ---*/

/**
 * Desenha o cabeçalho personalizado "Calculex" no documento PDF.
 * @param {jsPDF} doc - A instância do documento jsPDF.
 */
function addPdfHeader(doc) {
    const pdfWidth = doc.internal.pageSize.getWidth();
    const headerHeight = 15; // 15mm de altura
    const margin = 10; // 10mm de margem

    // Cor de fundo do seu tema (ex: --cor-card-bg)
    doc.setFillColor('#211C30'); 
    doc.rect(0, 0, pdfWidth, headerHeight, 'F'); // 'F' = Fill (Preencher)

    // Adiciona o Logo (ajuste X, Y, Largura, Altura)
    // Se você colou o LOGO_BASE64 no Passo 2:
    try {
        // Tenta adicionar a imagem. Ajuste os 4 números (x, y, w, h)
        // doc.addImage(LOGO_BASE64, 'PNG', margin, 3, 40, 9); 
        
        // Se preferir texto:
        doc.setFont('Poppins', 'bold'); // (jsPDF tentará usar a fonte)
        doc.setFontSize(16);
        doc.setTextColor('#F0F0F0'); // Branco
        doc.text('Calculex', margin, headerHeight / 2 + 4);

    } catch (e) {
        console.error("Erro ao adicionar logo:", e);
        // Fallback para texto caso a imagem falhe
        doc.setFont('Poppins', 'bold');
        doc.setFontSize(16);
        doc.setTextColor('#F0F0F0');
        doc.text('Calculex', margin, headerHeight / 2 + 4);
    }

    return headerHeight; // Retorna a altura para sabermos onde começar o conteúdo
}

/**
 * Pega todos os valores dos inputs e gera uma string de URL.
 */
function gerarQueryString() {
    const params = new URLSearchParams();

    // Pega o regime PJ ativo
    const regimePJ = document.querySelector('.pj-tab-btn.active').dataset.regime;
    params.set('regime', regimePJ);

    // Adiciona todos os inputs CLT
    params.set('clt_bruto', getFloat('clt-bruto'));
    params.set('clt_dep', getFloat('clt-dependentes'));
    params.set('clt_ben', getFloat('clt-beneficios'));
    params.set('clt_desc', getFloat('clt-descontos'));
    params.set('clt_plr', getFloat('clt-plr-anual'));
    params.set('clt_prov', getChecked('clt-incluir-provisao') ? '1' : '0');
    params.set('clt_fgts', getChecked('clt-incluir-fgts') ? '1' : '0');

    // Adiciona todos os inputs PJ (Simples, MEI, Manual)
    params.set('pj_fat_s', getFloat('pj-faturamento'));
    params.set('pj_rbt12', getFloat('pj-rbt12'));
    params.set('pj_ativ', document.getElementById('pj-atividade').value);
    params.set('pj_cont', getFloat('pj-contabilidade'));
    params.set('pj_outros_s', getFloat('pj-outros'));
    
    params.set('pj_fat_mei', getFloat('pj-faturamento-mei'));
    params.set('pj_das', getFloat('pj-custo-mei'));
    params.set('pj_outros_mei', getFloat('pj-outros-mei'));

    params.set('pj_fat_m', getFloat('pj-faturamento-manual'));
    params.set('pj_taxa_m', getFloat('pj-taxa-manual'));
    params.set('pj_custos_m', getFloat('pj-custos-fixos-manual'));

    return params.toString();
}

/**
 * Lê os dados da URL quando a página carrega e preenche os campos.
 */
function lerDadosDaURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.size === 0) return; // Nenhum parâmetro, não faz nada

    try {
        // Restaura o regime PJ
        const regime = params.get('regime');
        if (regime) {
            document.querySelectorAll('.pj-tab-btn').forEach(tab => {
                const isActive = tab.dataset.regime === regime;
                tab.classList.toggle('active', isActive);
            });
            document.querySelectorAll('.pj-regime-group').forEach(group => {
                group.style.display = (group.id === `pj-${regime}-inputs`) ? 'block' : 'none';
            });
        }

        // Restaura inputs CLT
        document.getElementById('clt-bruto').value = params.get('clt_bruto') || '';
        document.getElementById('clt-dependentes').value = params.get('clt_dep') || '0';
        document.getElementById('clt-beneficios').value = params.get('clt_ben') || '';
        document.getElementById('clt-descontos').value = params.get('clt_desc') || '';
        document.getElementById('clt-plr-anual').value = params.get('clt_plr') || '';
        document.getElementById('clt-incluir-provisao').checked = params.get('clt_prov') === '1';
        document.getElementById('clt-incluir-fgts').checked = params.get('clt_fgts') === '1';

        // Restaura inputs PJ
        document.getElementById('pj-faturamento').value = params.get('pj_fat_s') || '';
        document.getElementById('pj-rbt12').value = params.get('pj_rbt12') || '';
        document.getElementById('pj-atividade').value = params.get('pj_ativ') || 'fator_r';
        document.getElementById('pj-contabilidade').value = params.get('pj_cont') || '';
        document.getElementById('pj-outros').value = params.get('pj_outros_s') || '';
        
        document.getElementById('pj-faturamento-mei').value = params.get('pj_fat_mei') || '';
        document.getElementById('pj-custo-mei').value = params.get('pj_das') || '';
        document.getElementById('pj-outros-mei').value = params.get('pj_outros_mei') || '';

        document.getElementById('pj-faturamento-manual').value = params.get('pj_fat_m') || '';
        document.getElementById('pj-taxa-manual').value = params.get('pj_taxa_m') || '';
        document.getElementById('pj-custos-fixos-manual').value = params.get('pj_custos_m') || '';

        // Calcula os resultados com os dados da URL
        calcularEAtualizarUI();

    } catch (e) {
        console.error("Erro ao ler dados da URL:", e);
    }
}