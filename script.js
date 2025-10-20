/* --- NOVO: Bloco de Animação CountUp.js (À PROVA DE FALHAS) --- */

// Armazena as instâncias dos animadores para que possamos atualizá-las
let animadores = {};

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
    'clt-plr-anual', 'clt-incluir-fgts', // <-- ADICIONADO AQUI
    'pj-faturamento', 'pj-rbt12', 'pj-anexo', 'pj-contabilidade', 'pj-outros',
    'pj-faturamento-mei', 'pj-custo-mei', 'pj-outros-mei',
    'pj-faturamento-manual', 'pj-taxa-manual', 'pj-custos-fixos-manual'
];

// Helpers de Formatação
const formatBRL = (val) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPerc = (val) => `${val > 0 ? '+' : ''}${(val * 100).toFixed(1)}%`.replace('.', ',');
const getFloat = (id) => parseFloat(document.getElementById(id).value) || 0;
const getChecked = (id) => document.getElementById(id).checked;
const setHTML = (id, val) => { 
    const el = document.getElementById(id);
    if (el) el.innerHTML = val;
};

/* --- Bloco: INICIALIZAÇÃO (UX em Tempo Real) --- */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Adiciona listener 'input' (tempo real) a TODOS os campos
    todosInputIDs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', calcularEAtualizarUI);
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
                group.style.display = (group.id === `pj-${regime}-inputs`) ? 'block' : 'none';
            });
            
            calcularEAtualizarUI();
        });
    });

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

    // NOVO: Adiciona listener para o botão Exportar PDF
    const btnExport = document.getElementById('btn-export-pdf');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            window.print(); // Aciona a impressão do navegador
    });
}

    initAnimadores();

    // 4. Calcula uma vez no load (para zerar os campos)
    calcularEAtualizarUI();
});

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
        const regimePJ = document.querySelector('.pj-tab-btn.active').dataset.regime;
        let inputsPJ = { regime: regimePJ };
        let faturamentoPJ = 0;

        if (regimePJ === 'simples') {
            faturamentoPJ = getFloat('pj-faturamento');
            inputsPJ = { ...inputsPJ,
                faturamento: faturamentoPJ,
                rbt12: getFloat('pj-rbt12') || (faturamentoPJ * 12),
                anexo: document.getElementById('pj-anexo').value,
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
            detalhesImpostos: [] // Objeto vazio para UI
        };

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
        atualizarResultados(resCLT, resPJ, inputsCLT, inputsPJ);

    } catch (e) {
        console.error("Erro no cálculo:", e);
    }
}

/* --- Bloco: Função de Atualização da UI (Painel Direito) --- 
*** SUBSTITUÍDA PELA VERSÃO COM CORES CORRIGIDAS (CLT WINS) ***
*/
function atualizarResultados(clt, pj, inputsCLT, inputsPJ) {
    const cltFinal = clt.valorFinal || 0;
    const cltSalarioEmConta = clt.salarioEmConta || 0;
    const pjFinal = pj.valorFinal || 0;
    const cltImpostos = clt.totalImpostos || 0;
    const pjImpostos = pj.totalImpostos || 0;

    const diferencaAbsoluta = Math.abs(pjFinal - cltFinal);
    const pjEhMelhor = pjFinal > cltFinal;
    const cltEhMelhor = cltFinal > pjFinal;
    
    const basePercentual = (cltFinal > 0 && pjFinal > 0) ? Math.min(cltFinal, pjFinal) : (diferencaAbsoluta > 0 ? Math.max(cltFinal, pjFinal) : 0);
    const variacaoPercentual = (basePercentual > 0) ? (diferencaAbsoluta / basePercentual) : (diferencaAbsoluta > 0 ? 1 : 0);

    // --- ANIMAÇÃO (Req. #2 e #5): Dispara o fade-in/slide-up nos cards ---
    const cardsParaAnimar = [
        '.result-card-principal', 
        '.result-card-comparativo',
        '#impacto-anual-card',
        '.recommendation-card',
        '#equivalency-card' // <-- ADICIONADO AQUI
    ];
    
    cardsParaAnimar.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.classList.remove('is-updating');
            void el.offsetWidth; 
            el.classList.add('is-updating');
        });
    });

    // 1. Card Variação Líquida
    const elVarPerc = document.getElementById('res-variacao-perc');
    const elVarCard = document.querySelector('.result-card-principal');
    
    if (animadores['res-variacao-abs']) {
        animadores['res-variacao-abs'].update(diferencaAbsoluta);
    } else {
        setHTML('res-variacao-abs', formatBRL(diferencaAbsoluta));
    }
    
    elVarCard.classList.remove('clt-wins'); 
    elVarPerc.classList.remove('positivo', 'negativo', 'clt-wins'); // <-- Limpa todas as classes

    if (pjEhMelhor) {
        elVarPerc.innerText = `${formatPerc(variacaoPercentual)} a mais como PJ`;
        elVarPerc.classList.add('positivo'); // (Teal)
    } else if (cltEhMelhor) {
        elVarPerc.innerText = `${formatPerc(variacaoPercentual)} a mais como CLT`; 
        elVarPerc.classList.add('clt-wins'); // <-- MUDANÇA: (Verde)
        elVarCard.classList.add('clt-wins'); // (Borda Verde)
    } else {
        elVarPerc.innerText = `Valores equivalentes`;
    }

    // 2. Cards Comparativos (Líquido e Impostos)
    if (animadores['res-clt-liquido']) animadores['res-clt-liquido'].update(cltFinal);
    else setHTML('res-clt-liquido', formatBRL(cltFinal));
    
    if (animadores['res-clt-salario-em-conta']) animadores['res-clt-salario-em-conta'].update(cltSalarioEmConta);
    else setHTML('res-clt-salario-em-conta', formatBRL(cltSalarioEmConta));
    
    if (animadores['res-pj-liquido']) animadores['res-pj-liquido'].update(pjFinal);
    else setHTML('res-pj-liquido', formatBRL(pjFinal));
    
    setHTML('res-clt-impostos', formatBRL(cltImpostos));
    setHTML('res-pj-impostos', formatBRL(pjImpostos));
    setHTML('res-pj-impostos-label', `Custos (${pj.titulo || 'PJ'})`);
    setHTML('res-clt-aliquota', `${(clt.aliquotaEfetiva * 100).toFixed(1)}% do bruto`.replace('.',','));
    setHTML('res-pj-aliquota', `${(pj.aliquotaEfetiva * 100).toFixed(1)}% da receita`.replace('.',','));

    // 3. Card Impacto Anual
    if (animadores['res-clt-anual']) animadores['res-clt-anual'].update(cltFinal * 12);
    else setHTML('res-clt-anual', formatBRL(cltFinal * 12));
    
    if (animadores['res-pj-anual']) animadores['res-pj-anual'].update(pjFinal * 12);
    else setHTML('res-pj-anual', formatBRL(pjFinal * 12));

    const difAnualWrapper = document.getElementById('res-anual-diferenca-wrapper') || document.getElementById('res-anual-diferenca');
    const difAnualLabel = document.getElementById('res-anual-diferenca-label');
    const difAnualValorNum = Math.abs(pjFinal * 12 - cltFinal * 12);
    
    if(difAnualWrapper) difAnualWrapper.classList.remove('positivo', 'negativo');

    if (animadores['res-anual-diferenca-valor'] && difAnualLabel) {
        if (pjEhMelhor) {
            animadores['res-anual-diferenca-valor'].options.prefix = '+R$ ';
            animadores['res-anual-diferenca-valor'].update(difAnualValorNum);
            difAnualLabel.innerText = '/ano (PJ)';
            if(difAnualWrapper) difAnualWrapper.classList.add('positivo');
        } else if (cltEhMelhor) {
            animadores['res-anual-diferenca-valor'].options.prefix = '+R$ ';
            animadores['res-anual-diferenca-valor'].update(difAnualValorNum);
            difAnualLabel.innerText = '/ano (CLT)';
            if(difAnualWrapper) difAnualWrapper.classList.add('negativo'); // (Vermelho - como na imagem)
        } else {
            animadores['res-anual-diferenca-valor'].options.prefix = 'R$ ';
            animadores['res-anual-diferenca-valor'].update(0);
            difAnualLabel.innerText = 'Equivalente';
        }
    } else if (difAnualWrapper) { 
        // Lógica do PDF (com a seta corrigida da etapa anterior)
        const svgSetaCima = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z"/></svg>`;

        if (pjEhMelhor) {
            difAnualWrapper.innerHTML = `${svgSetaCima} +${formatBRL(difAnualValorNum)}/ano (PJ)`;
            difAnualWrapper.classList.add('positivo');
        } else if (cltEhMelhor) {
            difAnualWrapper.innerHTML = `${svgSetaCima} +${formatBRL(difAnualValorNum)}/ano (CLT)`; // Seta para cima
            difAnualWrapper.classList.add('negativo'); // (Cor será tratada no CSS de impressão)
        } else {
            difAnualWrapper.innerHTML = `Valores anuais equivalentes`;
        }
    }

    // 4. Card Recomendação
    const elRecomendacao = document.getElementById('res-recomendacao-texto');
    const elRecomendacaoCard = elRecomendacao.closest('.recommendation-card');
    elRecomendacaoCard.classList.remove('negativo', 'clt-wins'); // <-- Limpa todas as classes

    if (cltFinal === 0 && pjFinal === 0) {
        elRecomendacao.innerHTML = "Preencha os valores à esquerda para ver a recomendação.";
    } else if (pjEhMelhor) {
        elRecomendacao.innerHTML = `Com base nos valores, <strong>PJ é ${formatBRL(diferencaAbsoluta)} mais vantajoso</strong> por mês.`;
    } else if (cltEhMelhor) {
        elRecomendacao.innerHTML = `Com base nos valores, <strong>CLT é ${formatBRL(diferencaAbsoluta)} mais vantajoso</strong> por mês.`;
        elRecomendacaoCard.classList.add('clt-wins'); // <-- MUDANÇA: (Verde)
    } else {
        elRecomendacao.innerHTML = "Os cenários são <strong>financeiramente equivalentes</strong>. Analise fatores como estabilidade e benefícios.";
    }

    // 5. Card Equivalência (NOVO)
    const elEquivalencia = document.getElementById('res-equivalencia-texto');
    // (A animação já foi adicionada ao array cardsParaAnimar)

    if (cltFinal === 0 || pjFinal === 0) {
        elEquivalencia.innerHTML = "Preencha ambos os cenários (CLT e PJ) para ver a equivalência.";
    } else if (pjEhMelhor) {
        // PJ ganha. Quanto o CLT precisaria ganhar?
        const brutoEquivalente = calcularEquivalenteCLT(pj.valorFinal, inputsCLT);
        elEquivalencia.innerHTML = `Para ter o mesmo pacote PJ (<span class="equivalencia-valor">${formatBRL(pj.valorFinal)}</span>), 
                                seu salário bruto CLT precisaria ser de aprox. 
                                <strong>${formatBRL(brutoEquivalente)}</strong>.`;

    } else if (cltEhMelhor) {
        // CLT ganha. Quanto o PJ precisaria faturar?
        const faturamentoEquivalente = calcularEquivalentePJ(clt.valorFinal, inputsPJ);
        elEquivalencia.innerHTML = `Para ter o mesmo pacote CLT (<span class="equivalencia-valor">${formatBRL(clt.valorFinal)}</span>), 
                                seu faturamento PJ precisaria ser de aprox. 
                                <strong>${formatBRL(faturamentoEquivalente)}</strong>.`;
    } else {
        elEquivalencia.innerHTML = "Os valores de CLT e PJ já são equivalentes.";
    }   

    // 5. Detalhamento de Tributos (CLT)
    const taxDetailsCltEl = document.getElementById('tax-details-clt');
    let cltHtmlProventos = '';
    let cltHtmlDescontos = '';
    let cltTotalProventos = 0;
    let cltTotalDescontos = 0;

    clt.detalhesImpostos.forEach(item => {
        if (item.tipo === 'provento' && item.valor > 0) {
            cltHtmlProventos += `
                <div class="tax-item provento">
                    <span>${item.nome}
                        <span class="percentage">(${(item.percentual * 100).toFixed(1)}% do bruto)</span>
                    </span>
                    <strong>+${formatBRL(item.valor)}</strong>
                </div>
            `;
            cltTotalProventos += item.valor;
        } else if (item.tipo === 'desconto' && item.valor > 0) {
            cltHtmlDescontos += `
                <div class="tax-item">
                    <span>${item.nome}
                        <span class="percentage">(${(item.percentual * 100).toFixed(1)}% do bruto)</span>
                    </span>
                    <strong>-${formatBRL(item.valor)}</strong>
                </div>
            `;
            cltTotalDescontos += item.valor;
        }
    });

    let finalCltHtml = '';
    if (cltTotalProventos > 0) {
        finalCltHtml += cltHtmlProventos + `
            <div class="tax-item tax-item-total provento">
                <span>Total de Benefícios</span>
                <strong>+${formatBRL(cltTotalProventos)}</strong>
            </div>
        `;
    }
    if (cltTotalDescontos > 0) {
        finalCltHtml += cltHtmlDescontos + `
            <div class="tax-item tax-item-total">
                <span>Total de Descontos</span>
                <strong>-${formatBRL(cltTotalDescontos)}</strong>
            </div>
        `;
    }

    if (finalCltHtml === '') {
        taxDetailsCltEl.innerHTML = `<div class="tax-item"><span>Nenhum detalhe</span></div>`;
    } else {
        taxDetailsCltEl.innerHTML = finalCltHtml;
    }

    // 6. Detalhamento de Tributos (PJ)
    const taxDetailsPjEl = document.getElementById('tax-details-pj');
    let pjHtml = '';
    let pjTotalCustos = 0;
    pj.detalhesImpostos.forEach(item => {
        if (item.valor > 0) {
             pjHtml += `
                <div class="tax-item">
                    <span>${item.nome}
                        <span class="percentage">(${(item.percentual * 100).toFixed(1)}% da receita)</span>
                    </span>
                    <strong>-${formatBRL(item.valor)}</strong>
                </div>
            `;
            pjTotalCustos += item.valor;
        }
    });
    if (pjTotalCustos > 0) {
        taxDetailsPjEl.innerHTML = pjHtml + `
            <div class="tax-item tax-item-total">
                <span>Total de Custos ${pj.titulo}</span>
                <strong>-${formatBRL(pjTotalCustos)}</strong> 
            </div>
        `;
    } else {
         taxDetailsPjEl.innerHTML = `<div class="tax-item"><span>Nenhum custo</span></div>`;
    }
}

/* --- Bloco: Funções de CÁLCULO (Motor) --- 
*** ATUALIZADAS PARA RETORNAR 'detalhesImpostos' ***
*/

function calcularCLT_Colaborador(inputs) {
    // --- MUDANÇA: Novos inputs destruturados ---
    const { bruto, dependentes, beneficios, descontos, incluirProvisao, plrAnual, incluirFGTS } = inputs;

    // --- CORREÇÃO AQUI ---
    // A variável 'totalDescontosFixos' deve ser declarada ANTES de ser usada.
    const totalDescontosFixos = descontos;
    
    const inss = calcularINSS_Progressivo(bruto);
    // Agora 'totalDescontosFixos' existe e pode ser usado aqui.
    const irrf = calcularIRRF_Preciso(bruto, inss, dependentes, totalDescontosFixos);

    const totalImpostos = inss + irrf; // Impostos retidos
    const totalCustos = totalImpostos + totalDescontosFixos; // Total que sai do salário

    // Salário em conta é SÓ Bruto - Descontos
    const salarioEmConta = bruto - totalCustos; 

    // PLR Mensal
    const plrMensal = (plrAnual || 0) / 12;

    // Líquido total (para o pacote) inclui benefícios e PLR
    const liquidoComBeneficios = salarioEmConta + beneficios + plrMensal;

    const fgts = bruto * 0.08;
    const provisao = bruto * 0.1944; // 13º (8,33%) + Férias (11,11% com 1/3)

    // --- MUDANÇA: Lógica do "Pacote" agora usa os checkboxes ---
    const pacoteTotal = liquidoComBeneficios + (incluirFGTS ? fgts : 0) + (incluirProvisao ? provisao : 0);

    // Detalhes para o novo card
    const detalhesImpostos = [];

    // --- MUDANÇA: Adiciona PLR e Benefícios ---
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

    if (incluirFGTS && fgts > 0) detalhesImpostos.push({ 
        nome: "FGTS (Provisão Mensal)", 
        valor: fgts, 
        percentual: fgts / (bruto || 1), 
        tipo: 'provento' 
    });
    if (incluirProvisao && provisao > 0) detalhesImpostos.push({ 
        nome: "13º e Férias (Provisão Mensal)", 
        // A provisão é 1/12 (13º) + 1/12 (Férias) + 1/3 de 1/12 (1/3 Férias) = 19.44%
        valor: provisao, 
        percentual: provisao / (bruto || 1), 
        tipo: 'provento' 
    });

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

    return {
        valorFinal: pacoteTotal,
        salarioEmConta: salarioEmConta, // <-- CORRIGIDO
        totalImpostos: totalCustos, 
        aliquotaEfetiva: (bruto > 0) ? totalCustos / bruto : 0,
        detalhesImpostos: detalhesImpostos
    };
}

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

function calcularIRRF_PelaTabela(base) {
    if (base <= 0) return 0;
    for (const faixa of FAIXAS_IRRF) {
        if (base <= faixa.limite) {
            return (base * faixa.aliquota) - faixa.deducao;
        }
    }
    // Para valores acima da última faixa
    const ultimaFaixa = FAIXAS_IRRF[FAIXAS_IRRF.length - 1];
    return (base * ultimaFaixa.aliquota) - ultimaFaixa.deducao;
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
/* --- FIM Bloco de Equivalência --- */