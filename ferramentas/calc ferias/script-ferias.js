/* --- Bloco de Animação CountUp.js --- */
let animadores = {};

function initAnimadores() {
    const options = { duration: 0.8, useEasing: true, decimal: ',', separator: '.', prefix: 'R$ ' };
    const animadoresConfig = {
        'res-liquido-ferias': options,
        'res-total-bruto': { ...options, prefix: '+R$ ' }, // Provento
        'res-total-descontos': { ...options, prefix: '-R$ ' } // Desconto
    };
    try {
        for (const id in animadoresConfig) {
            const el = document.getElementById(id);
            if (el) {
                animadores[id] = new countUp.CountUp(el, 0, animadoresConfig[id]);
                if (!animadores[id].error) animadores[id].start();
            } else console.warn(`Elemento #${id} não encontrado.`);
        }
    } catch(e) { console.error("Erro CountUp:", e); }
}
/* --- Fim Bloco Animação --- */

/* --- Bloco: Constantes e Helpers --- */
const TETO_INSS = 8157.41;
const FAIXAS_INSS = [
    { teto: 1518.00, aliquota: 0.075, deduzir: 0 }, { teto: 2793.88, aliquota: 0.09, deduzir: 22.77 },
    { teto: 4190.83, aliquota: 0.12, deduzir: 106.59 }, { teto: 8157.41, aliquota: 0.14, deduzir: 190.42 }
];
const INSS_TETO = (TETO_INSS * FAIXAS_INSS[3].aliquota) - FAIXAS_INSS[3].deduzir;
const FAIXAS_IRRF = [
    { limite: 2428.80, aliquota: 0, deducao: 0 }, { limite: 2826.65, aliquota: 0.075, deducao: 182.16 },
    { limite: 3751.05, aliquota: 0.15, deducao: 409.71 }, { limite: 4664.68, aliquota: 0.225, deducao: 682.81 },
    { limite: Infinity, aliquota: 0.275, deducao: 912.91 }
];
const DEDUCAO_DEPENDENTE_IRRF = 189.59;
const DESCONTO_SIMPLIFICADO_IRRF = 607.20; // Férias usa cálculo normal do IRRF

const formatadorBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatBRL = (val) => formatadorBRL.format(val || 0);
const getFloat = (id) => parseFloat(document.getElementById(id).value) || 0;
const getChecked = (id) => document.getElementById(id).checked;

/* --- Bloco: Helpers Seguros de UI (Reutilizados) --- */
function criarTaxItem(nome, valor, percentual, tipo = 'desconto', baseLabel = 'do bruto') {
    const item = document.createElement('div');
    item.className = 'tax-item';
    if (tipo === 'provento') item.classList.add('provento');
    const spanLabel = document.createElement('span');
    spanLabel.textContent = nome;
    const strong = document.createElement('strong');
    strong.textContent = `${tipo === 'provento' ? '+' : '-'}${formatBRL(valor)}`;
    item.append(spanLabel, strong);
    return item;
}

function criarTaxItemTotal(label, valor, tipo = 'desconto') {
    const totalItem = document.createElement('div');
    totalItem.className = 'tax-item tax-item-total';
    if (tipo === 'provento') totalItem.classList.add('provento');
    const spanLabel = document.createElement('span');
    spanLabel.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = `${tipo === 'provento' ? '+' : '-'}${formatBRL(valor)}`;
    totalItem.append(spanLabel, strong);
    return totalItem;
}
/* --- Fim Bloco Helpers UI --- */

/* --- Bloco: Funções AUXILIARES de Cálculo (Reutilizadas) --- */
function calcularINSS_Progressivo(salario) {
    if (salario <= 0) return 0;
    if (salario > TETO_INSS) salario = TETO_INSS; // Aplica teto aqui
    for (const faixa of FAIXAS_INSS) {
        if (salario <= faixa.teto) {
            return Math.max(0, (salario * faixa.aliquota) - faixa.deduzir);
        }
    }
    return INSS_TETO; 
}

function calcularIRRF_Preciso(bruto, inss, dependentes, outrosDescontos = 0) {
    if (bruto <= 0) return 0;
    const deducaoDependentes = dependentes * DEDUCAO_DEPENDENTE_IRRF;
    // Cálculo Padrão (com dependentes)
    const baseCalculoPadrao = bruto - inss - deducaoDependentes - outrosDescontos;
    const impostoPadrao = calcularIRRF_PelaTabela(baseCalculoPadrao);
    // Cálculo Simplificado (ignora dependentes e INSS, usa desconto fixo)
    const baseCalculoSimplificada = bruto - DESCONTO_SIMPLIFICADO_IRRF;
    const impostoSimplificado = calcularIRRF_PelaTabela(baseCalculoSimplificada);
    // Retorna o MENOR imposto
    return Math.max(0, Math.min(impostoPadrao, impostoSimplificado));
}

function calcularIRRF_PelaTabela(base) { // Versão simplificada (sem dependentes aqui)
    if (base <= 0) return 0;
    for (const faixa of FAIXAS_IRRF) {
        if (base <= faixa.limite) {
            return Math.max(0, (base * faixa.aliquota) - faixa.deducao);
        }
    }
    const ultimaFaixa = FAIXAS_IRRF[FAIXAS_IRRF.length - 1];
    return Math.max(0, (base * ultimaFaixa.aliquota) - ultimaFaixa.deducao);
}
/* --- Fim Funções Auxiliares --- */

/* --- Bloco: Função Principal de Cálculo de Férias --- */
function calcularFerias() {
    const salarioBruto = getFloat('salario-bruto');
    let diasFerias = getFloat('dias-ferias');
    const dependentes = getFloat('dependentes');
    const venderFerias = getChecked('vender-ferias');

    // Validação de dias de férias
    if (diasFerias < 5) diasFerias = 5;
    if (diasFerias > 30) diasFerias = 30;
    
    // Calcula o valor base das férias proporcionais aos dias
    const valorFeriasBase = (salarioBruto / 30) * diasFerias;
    const valorUmTerco = valorFeriasBase / 3;
    const valorBrutoFerias = valorFeriasBase + valorUmTerco;

    let valorAbonoBruto = 0;
    let diasAbono = 0;
    if (venderFerias && diasFerias > 15) { // Só pode vender se tirar mais de 15 dias
        diasAbono = Math.min(10, Math.floor(diasFerias / 3)); // Max 10 dias ou 1/3
        valorAbonoBruto = (salarioBruto / 30) * diasAbono;
        // Importante: O 1/3 do abono também é pago e não tem impostos
        valorAbonoBruto += valorAbonoBruto / 3; 
    }
    
    // Cálculo dos Descontos
    // INSS incide sobre (Valor Férias + 1/3), mas NÃO sobre o Abono
    const inssFerias = calcularINSS_Progressivo(valorBrutoFerias);

    // IRRF incide sobre (Valor Férias + 1/3 - INSS - Dependentes), mas NÃO sobre o Abono
    const irrfFerias = calcularIRRF_Preciso(valorBrutoFerias, inssFerias, dependentes);

    // Valores Líquidos
    const valorLiquidoFerias = valorBrutoFerias - inssFerias - irrfFerias;
    const valorLiquidoAbono = valorAbonoBruto; // Abono é isento de INSS e IRRF

    const totalLiquidoAReceber = valorLiquidoFerias + valorLiquidoAbono;
    const totalBrutoGeral = valorBrutoFerias + valorAbonoBruto;
    const totalDescontosGeral = inssFerias + irrfFerias;

    // Detalhes para o accordion
    const detalhes = [];
    detalhes.push({ nome: `Férias (${diasFerias} dias)`, valor: valorFeriasBase, tipo: 'provento' });
    detalhes.push({ nome: "1/3 Constitucional", valor: valorUmTerco, tipo: 'provento' });
    if (valorAbonoBruto > 0) {
        detalhes.push({ nome: `Abono Pecuniário (${diasAbono} dias + 1/3)`, valor: valorAbonoBruto, tipo: 'provento' });
    }
    if (inssFerias > 0) {
        detalhes.push({ nome: "INSS sobre Férias", valor: inssFerias, tipo: 'desconto' });
    }
    if (irrfFerias > 0) {
        detalhes.push({ nome: "IRRF sobre Férias", valor: irrfFerias, tipo: 'desconto' });
    }

    return {
        liquidoFinal: totalLiquidoAReceber,
        brutoTotal: totalBrutoGeral,
        descontosTotal: totalDescontosGeral,
        detalhes: detalhes
    };
}
/* --- Fim Função Principal --- */

/* --- Bloco: Atualização da UI --- */
function atualizarUI() {
    const resultado = calcularFerias();
    
    // Atualiza cards principais
    if(animadores['res-liquido-ferias']) animadores['res-liquido-ferias'].update(resultado.liquidoFinal);
    if(animadores['res-total-bruto']) animadores['res-total-bruto'].update(resultado.brutoTotal);
    if(animadores['res-total-descontos']) animadores['res-total-descontos'].update(resultado.descontosTotal);
    
    // Atualiza detalhes no accordion
    const elTaxDetails = document.getElementById('tax-details-ferias');
    if (elTaxDetails) {
        elTaxDetails.textContent = ''; // Limpa
        
        let totalProventos = 0;
        let totalDescontos = 0;
        const proventosFragment = document.createDocumentFragment();
        const descontosFragment = document.createDocumentFragment();

        resultado.detalhes.forEach(item => {
            if (item.valor > 0) {
                if (item.tipo === 'provento') {
                    proventosFragment.appendChild(criarTaxItem(item.nome, item.valor, 0, 'provento'));
                    totalProventos += item.valor;
                } else {
                    descontosFragment.appendChild(criarTaxItem(item.nome, item.valor, 0, 'desconto'));
                    totalDescontos += item.valor;
                }
            }
        });

        if (totalProventos > 0) {
            proventosFragment.appendChild(criarTaxItemTotal('Total Bruto', totalProventos, 'provento'));
            elTaxDetails.appendChild(proventosFragment);
        }
         if (totalDescontos > 0) {
            descontosFragment.appendChild(criarTaxItemTotal('Total Descontos', totalDescontos, 'desconto'));
            elTaxDetails.appendChild(descontosFragment);
        }

        if (elTaxDetails.childElementCount === 0) {
            elTaxDetails.innerHTML = '<div class="tax-item"><span>Preencha os dados</span></div>';
        }
    }
    
    // Reajusta altura do accordion (caso esteja aberto)
    atualizarAlturasAccordions();
}

/* --- Bloco: Lógica Accordion (Reutilizada) --- */
function atualizarAlturasAccordions() {
    document.querySelectorAll('.accordion-content').forEach(content => {
        const button = content.previousElementSibling;
        if (button && button.classList.contains('active')) {
            // Recalcula a altura SÓ se estiver ativo
            content.style.maxHeight = content.scrollHeight + "px";
        }
    });
}
/* --- Fim Lógica Accordion --- */

/* --- Bloco: INICIALIZAÇÃO GERAL --- */
if (typeof window !== 'undefined') {
    const calcularComDebounce = debounce(atualizarUI, 300);

    document.addEventListener('DOMContentLoaded', () => {
        // Listeners dos Inputs
        const inputIDs = ['salario-bruto', 'dias-ferias', 'dependentes', 'vender-ferias'];
        inputIDs.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                const eventType = (el.type === 'checkbox') ? 'change' : 'input';
                el.addEventListener(eventType, calcularComDebounce);
            }
        });

        // Listener do Accordion
        const accordionButtons = document.querySelectorAll('.accordion-button');
        accordionButtons.forEach(button => {
            button.addEventListener('click', () => {
                button.classList.toggle('active');
                const content = button.nextElementSibling;
                if (content.style.maxHeight && content.style.maxHeight !== 'fit-content') { // Não fechar se já estiver fit-content
                    content.style.maxHeight = null;
                } else {
                    content.style.maxHeight = content.scrollHeight + "px";
                }
            });
        });

        initAnimadores();
        atualizarUI(); // Calcula uma vez no load
    });
}
/* --- Fim Inicialização --- */