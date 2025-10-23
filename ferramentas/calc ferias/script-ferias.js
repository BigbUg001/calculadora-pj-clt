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

/* --- Bloco de Animação CountUp.js --- */
let animadores = {};

function initAnimadores() {
    // Garantir que a biblioteca countUp (minúsculo) esteja disponível
    if (typeof countUp === 'undefined') { // <-- MUDANÇA AQUI
        console.error("ERRO: Biblioteca CountUp não está carregada. As animações não funcionarão.");
        return;
    }
    console.log("Iniciando animadores (Férias)..."); // Log para confirmação
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
                // Usar 'countUp.CountUp' (minúsculo/maiúsculo)
                animadores[id] = new countUp.CountUp(el, 0, animadoresConfig[id]); // <-- MUDANÇA AQUI
                if (!animadores[id].error) {
                    animadores[id].start();
                     console.log(`Animador Férias #${id} iniciado.`); // Log
                } else {
                    console.error(`Erro ao criar animador Férias #${id}:`, animadores[id].error);
                }
            } else console.warn(`Elemento Férias #${id} não encontrado.`);
        }
    } catch(e) { console.error("Erro fatal no initAnimadores (Férias):", e); }
}

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

const formatadorBRL_instancia = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }); 
const formatBRL = (val) => formatadorBRL_instancia.format(val || 0); 
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
    if (salario <= 0 || isNaN(salario)) return 0;
    let salarioCalculo = Math.min(salario, TETO_INSS); 
    for (const faixa of FAIXAS_INSS) {
        if (salarioCalculo <= faixa.teto) {
            return Math.max(0, (salarioCalculo * faixa.aliquota) - faixa.deduzir);
        }
    }
    return INSS_TETO; 
}

function calcularIRRF_Preciso(bruto, inss, dependentes, outrosDescontos = 0) {
    if (bruto <= 0 || isNaN(bruto)) return 0;
    const deducaoDependentes = (dependentes || 0) * DEDUCAO_DEPENDENTE_IRRF; // Garantir que dependentes seja número
    const inssCalc = isNaN(inss) ? 0 : inss; // Garantir que inss seja número
    
    // Cálculo Padrão
    const baseCalculoPadrao = bruto - inssCalc - deducaoDependentes - outrosDescontos;
    const impostoPadrao = calcularIRRF_PelaTabela(baseCalculoPadrao);
    
    // Cálculo Simplificado
    const baseCalculoSimplificada = bruto - DESCONTO_SIMPLIFICADO_IRRF;
    const impostoSimplificado = calcularIRRF_PelaTabela(baseCalculoSimplificada);
    
    return Math.max(0, Math.min(impostoPadrao, impostoSimplificado));
}

function calcularIRRF_PelaTabela(base) {
    if (base <= 0 || isNaN(base)) return 0;
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
    diasFerias = Math.max(5, Math.min(30, diasFerias || 30)); // Garante entre 5 e 30, padrão 30
    
    // Calcula o valor base das férias proporcionais aos dias
    const valorFeriasBase = (salarioBruto / 30) * diasFerias;
    const valorUmTerco = valorFeriasBase / 3;
    const valorBrutoFerias = valorFeriasBase + valorUmTerco;

    let valorAbonoBruto = 0;
    let diasAbono = 0;
    if (venderFerias && diasFerias > 15) { 
        diasAbono = Math.min(10, Math.floor(diasFerias / 3)); 
        valorAbonoBruto = (salarioBruto / 30) * diasAbono;
        valorAbonoBruto += valorAbonoBruto / 3; 
    }
    
    // Cálculo dos Descontos
    const inssFerias = calcularINSS_Progressivo(valorBrutoFerias);
    const irrfFerias = calcularIRRF_Preciso(valorBrutoFerias, inssFerias, dependentes);

    // Valores Líquidos
    const valorLiquidoFerias = valorBrutoFerias - inssFerias - irrfFerias;
    const valorLiquidoAbono = valorAbonoBruto; 

    const totalLiquidoAReceber = valorLiquidoFerias + valorLiquidoAbono;
    const totalBrutoGeral = valorBrutoFerias + valorAbonoBruto;
    const totalDescontosGeral = inssFerias + irrfFerias;

    // Detalhes para o accordion
    const detalhes = [];
    if (valorFeriasBase > 0) detalhes.push({ nome: `Férias (${diasFerias} dias)`, valor: valorFeriasBase, tipo: 'provento' });
    if (valorUmTerco > 0) detalhes.push({ nome: "1/3 Constitucional", valor: valorUmTerco, tipo: 'provento' });
    if (valorAbonoBruto > 0) detalhes.push({ nome: `Abono Pecuniário (${diasAbono} dias + 1/3)`, valor: valorAbonoBruto, tipo: 'provento' });
    if (inssFerias > 0) detalhes.push({ nome: "INSS sobre Férias", valor: inssFerias, tipo: 'desconto' });
    if (irrfFerias > 0) detalhes.push({ nome: "IRRF sobre Férias", valor: irrfFerias, tipo: 'desconto' });

    // Garantir que os valores retornados sejam números
    return {
        liquidoFinal: isNaN(totalLiquidoAReceber) ? 0 : totalLiquidoAReceber,
        brutoTotal: isNaN(totalBrutoGeral) ? 0 : totalBrutoGeral,
        descontosTotal: isNaN(totalDescontosGeral) ? 0 : totalDescontosGeral,
        detalhes: detalhes
    };
}
/* --- Fim Função Principal --- */

/* --- Bloco: Atualização da UI --- */
function atualizarUI() {
    try {
        const resultado = calcularFerias();
        console.log("Resultado Férias:", resultado); // Log para depuração
        
        // Atualiza cards principais (USANDO A ANIMAÇÃO)
        if(animadores['res-liquido-ferias']) {
            animadores['res-liquido-ferias'].update(resultado.liquidoFinal);
        } else { // Fallback se animador não inicializou
             const el = document.getElementById('res-liquido-ferias');
             if(el) el.innerText = formatBRL(resultado.liquidoFinal);
        }
        
        if(animadores['res-total-bruto']) {
            animadores['res-total-bruto'].update(resultado.brutoTotal);
        } else {
             const el = document.getElementById('res-total-bruto');
             if(el) el.innerText = formatBRL(resultado.brutoTotal);
        }
        
        if(animadores['res-total-descontos']) {
             animadores['res-total-descontos'].update(resultado.descontosTotal);
        } else {
             const el = document.getElementById('res-total-descontos');
             if(el) el.innerText = formatBRL(resultado.descontosTotal);
        }

        // Atualiza detalhes no accordion
        const elTaxDetails = document.getElementById('tax-details-ferias');
        if (elTaxDetails) {
            elTaxDetails.textContent = ''; // Limpa
            
            let totalProventos = 0;
            let totalDescontos = 0;
            const proventosFragment = document.createDocumentFragment();
            const descontosFragment = document.createDocumentFragment();

            (resultado.detalhes || []).forEach(item => { // Garante array
                if (item && item.valor > 0) { // Garante item e valor > 0
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
        
        atualizarAlturasAccordions();
    } catch (e) {
        console.error("Erro em atualizarUI (Férias):", e);
    }
}

/* --- Bloco: Lógica Accordion (Reutilizada) --- */
function atualizarAlturasAccordions() {
    document.querySelectorAll('.accordion-content').forEach(content => {
        const button = content.previousElementSibling;
        // Só atualiza se o botão existir e estiver ativo (classe 'active')
        if (button && button.classList.contains('active')) { 
            content.style.maxHeight = content.scrollHeight + "px";
        }
    });
}
/* --- Fim Lógica Accordion --- */

/* --- Bloco: INICIALIZAÇÃO GERAL --- */
if (typeof window !== 'undefined') {
    const calcularComDebounce = debounce(atualizarUI, 300);

    // ETAPA 1: Adicionar os listeners assim que o DOM (HTML) estiver pronto
    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOM Carregado (Férias). Adicionando Listeners...");

        // Listeners dos Inputs
        const inputIDs = ['salario-bruto', 'dias-ferias', 'dependentes', 'vender-ferias'];
        inputIDs.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                const eventType = (el.type === 'checkbox') ? 'change' : 'input';
                el.addEventListener(eventType, calcularComDebounce);
            } else {
                console.warn(`Elemento input Férias #${id} não encontrado.`);
            }
        });

        // Listener do Accordion
        const accordionButtons = document.querySelectorAll('.accordion-button');
        accordionButtons.forEach(button => {
            button.addEventListener('click', () => {
                button.classList.toggle('active');
                const content = button.nextElementSibling;
                if (content.style.maxHeight && content.style.maxHeight !== 'fit-content') {
                    content.style.maxHeight = null;
                } else {
                    content.style.maxHeight = content.scrollHeight + "px"; 
                }
            });
        });
    }); // Fim do DOMContentLoaded listener

    // ETAPA 2: Inicializar os animadores e fazer o primeiro cálculo
    // (Mesma estratégia da Calculadora de Rescisão)
    window.addEventListener('load', () => {
         console.log("Window Carregado (Férias). Inicializando Calculadora...");
        try {
            // Verifica se a biblioteca (objeto minúsculo) está carregada
            if (typeof countUp === 'undefined') { // <-- MUDANÇA AQUI
                console.error("ERRO CRÍTICO (Férias): Biblioteca CountUp.js não carregou a tempo!");
                return;
            }
            
            initAnimadores(); // Inicializa as animações
            atualizarUI();    // Executa o primeiro cálculo
        } catch (e) {
            console.error("Erro durante o window.onload (Férias):", e);
        }
    });
}
/* --- Fim Inicialização --- */