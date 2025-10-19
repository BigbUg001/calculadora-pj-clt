// --- CONSTANTES DE IMPOSTO ATUALIZADAS PARA 2025 ---
const SALARIO_MINIMO = 1518.00; // Salário mínimo 2025
const TETO_INSS = 8157.41; // Teto previdenciário INSS 2025
const ANEXO_III = [
    { teto: 180000, aliquota: 0.06, pd: 0 }, { teto: 360000, aliquota: 0.112, pd: 9360 }, { teto: 720000, aliquota: 0.135, pd: 17640 },
    { teto: 1800000, aliquota: 0.16, pd: 35640 }, { teto: 3600000, aliquota: 0.21, pd: 125640 }, { teto: 4800000, aliquota: 0.33, pd: 648000 }
];
const ANEXO_V = [
    { teto: 180000, aliquota: 0.155, pd: 0 }, { teto: 360000, aliquota: 0.18, pd: 4500 }, { teto: 720000, aliquota: 0.195, pd: 9900 },
    { teto: 1800000, aliquota: 0.205, pd: 17100 }, { teto: 3600000, aliquota: 0.23, pd: 62100 }, { teto: 4800000, aliquota: 0.305, pd: 540000 }
];
// --- FIM CONSTANTES ---


// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-calcular').addEventListener('click', handleCalculateClick);
    document.getElementById('pj-regime').addEventListener('change', togglePJInputs);
    
    togglePJInputs(); 
});

// --- FUNÇÃO DE UI (COMPLETA) ---
function togglePJInputs() {
    const regime = document.getElementById('pj-regime').value;
    document.getElementById('pj-simples-inputs').style.display = (regime === 'simples') ? 'block' : 'none';
    document.getElementById('pj-mei-inputs').style.display = (regime === 'mei') ? 'block' : 'none';
    document.getElementById('pj-manual-inputs').style.display = (regime === 'manual') ? 'block' : 'none';
}

// --- FUNÇÃO PRINCIPAL DE "CLICK" (COMPLETA, COM VALIDAÇÕES) ---
function handleCalculateClick() {
    const btn = document.getElementById('btn-calcular');
    const btnText = document.getElementById('btn-text');
    const spinner = document.getElementById('btn-spinner');

    btn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'block';

    setTimeout(() => {
        try {
            // 1. Obter inputs PJ (baseado no regime)
            const pjRegime = document.getElementById('pj-regime').value;
            let pjInputs = { regime: pjRegime };

            if (pjRegime === 'simples') {
                pjInputs = { ...pjInputs,
                    faturamento: parseFloat(document.getElementById('pj-faturamento').value) || 0,
                    rbt12: parseFloat(document.getElementById('pj-rbt12').value) || 0,
                    anexo: document.getElementById('pj-anexo').value,
                    estrategiaProlabore: document.getElementById('pj-estrategia-prolabore').value,
                    contabilidade: parseFloat(document.getElementById('pj-contabilidade').value) || 0,
                    outros: parseFloat(document.getElementById('pj-outros').value) || 0,
                };
                if (pjInputs.faturamento <= 0) throw new Error("Insira um faturamento válido maior que zero.");
                if (pjInputs.rbt12 < pjInputs.faturamento) pjInputs.rbt12 = pjInputs.faturamento * 12; // Assumir se vazio
            } else if (pjRegime === 'mei') {
                pjInputs = { ...pjInputs,
                    faturamento: parseFloat(document.getElementById('pj-faturamento-mei').value) || 0,
                    custoDAS: parseFloat(document.getElementById('pj-custo-mei').value) || 0,
                    outros: parseFloat(document.getElementById('pj-outros-mei').value) || 0,
                };
                if (pjInputs.faturamento <= 0) throw new Error("Insira um faturamento válido maior que zero.");
            } else if (pjRegime === 'manual') {
                pjInputs = { ...pjInputs,
                    faturamento: parseFloat(document.getElementById('pj-faturamento-manual').value) || 0,
                    taxa: parseFloat(document.getElementById('pj-taxa-manual').value) || 0,
                    custosFixos: parseFloat(document.getElementById('pj-custos-fixos-manual').value) || 0,
                };
                if (pjInputs.faturamento <= 0) throw new Error("Insira um faturamento válido maior que zero.");
            }
            
            // 2. Calcular o cenário PJ
            let resultadoPJ;
            if (pjRegime === 'simples') resultadoPJ = calcularPJ_Colaborador(pjInputs);
            else if (pjRegime === 'mei') resultadoPJ = calcularPJ_MEI(pjInputs);
            else if (pjRegime === 'manual') resultadoPJ = calcularPJ_Manual(pjInputs);
            
            // 3. Exibir resultado
            exibirResultadoPJ(resultadoPJ);

        } catch (e) {
            console.error(e);
            alert(e.message || "Ocorreu um erro no cálculo. Verifique os valores.");
        }
        
        // 4. Restaurar o botão
        btn.disabled = false;
        btnText.style.display = 'block';
        spinner.style.display = 'none';
        
        document.getElementById('resultado-pj-col').style.display = 'block';
    }, 50);
}


// --- NOVA FUNÇÃO: CÁLCULO DE IRRF SOBRE PRÓ-LABORE (TABELA 2025) ---
function calcularIRRF(base) { // Base = pró-labore - INSS
    if (base <= 2259.20) return 0;
    if (base <= 2826.65) return base * 0.075 - 169.44;
    if (base <= 3751.05) return base * 0.15 - 381.44;
    if (base <= 4664.68) return base * 0.225 - 662.94;
    return base * 0.275 - 896.00;
}

// --- MÓDULOS DE CÁLCULO PJ (CORRIGIDOS) ---
function calcularPJ_Colaborador(inputs) {
    const { faturamento, rbt12, anexo, estrategiaProlabore, contabilidade, outros } = inputs;
    
    let prolaboreDefinido = 0;
    let notaOtimizacao = "";
    let anexoCalculado = anexo;
    const limiteSwitch = 61567.40; // Limite para otimização conforme referência

    if (estrategiaProlabore === 'otimizar') {
        // Otimização automática baseada no limite
        if (faturamento <= limiteSwitch) {
            anexoCalculado = 'iii';
            prolaboreDefinido = Math.max(faturamento * 0.28, SALARIO_MINIMO);
            notaOtimizacao = "Pró-labore 28% (Anexo III - Otimizado para baixa carga)";
        } else {
            anexoCalculado = 'v';
            prolaboreDefinido = SALARIO_MINIMO;
            notaOtimizacao = "Pró-labore Mínimo (Anexo V - Otimizado para minimizar IRRF)";
        }
    } else {
        // Estratégia mínima: Usa anexo input e pró-labore mínimo
        prolaboreDefinido = SALARIO_MINIMO;
        notaOtimizacao = "Pró-labore Mínimo (Sem Otimização Automática)";
    }

    const tabela = (anexoCalculado === 'iii') ? ANEXO_III : ANEXO_V;
    const aliquotaEfetiva = calcularAliquotaEfetiva(rbt12, tabela);
    const impostoSimples = faturamento * aliquotaEfetiva;
    const inssProlabore = Math.min(prolaboreDefinido * 0.11, 0.11 * TETO_INSS); // Max R$ 897.32 em 2025
    const baseIR = prolaboreDefinido - inssProlabore;
    const irrf = calcularIRRF(baseIR);
    const custosFixos = contabilidade + outros;
    const custosTotais = impostoSimples + inssProlabore + irrf + custosFixos;
    const liquidoPJ = faturamento - custosTotais;
    
    return {
        titulo: `Resumo PJ (Simples ${anexoCalculado.toUpperCase()})`,
        valorFinal: liquidoPJ,
        breakdown: [
            { label: "Faturamento Bruto", valor: faturamento, classe: 'provento' },
            { label: `(-) Imposto Simples (${formatPerc(aliquotaEfetiva)})`, valor: impostoSimples, classe: 'desconto' },
            { label: `(-) INSS (s/ Pró-Labore ${formatBRL(prolaboreDefinido)})`, valor: inssProlabore, classe: 'desconto' },
            { label: `(-) IRRF sobre Pró-Labore`, valor: irrf, classe: 'desconto' },
            { label: `(-) Custos Fixos (Contador, etc)`, valor: custosFixos, classe: 'desconto' },
        ],
        nota: `${notaOtimizacao}. Consulte contador para validação.`
    };
}

function calcularPJ_MEI(inputs) {
    const { faturamento, custoDAS, outros } = inputs;
    const limiteMEI = 7666.67; // Atualizado para 2025 (R$ 92.000 anual / 12)
    let aviso = (faturamento > limiteMEI) ? `Atenção: Faturamento excede o limite médio do MEI 2025 (${formatBRL(limiteMEI)}). Considere migração para Simples.` : "";
    
    const custosTotais = custoDAS + outros;
    const liquidoPJ = faturamento - custosTotais;
    
    return {
        titulo: "Resumo PJ (MEI)",
        valorFinal: liquidoPJ,
        breakdown: [
            { label: "Faturamento Bruto", valor: faturamento, classe: 'provento' },
            { label: "(-) Imposto Fixo (DAS-MEI)", valor: custoDAS, classe: 'desconto' },
            { label: "(-) Custos Fixos (Outros)", valor: outros, classe: 'desconto' },
        ],
        aviso: aviso
    };
}

function calcularPJ_Manual(inputs) {
    const { faturamento, taxa, custosFixos } = inputs;
    const imposto = faturamento * (taxa / 100);
    const liquidoPJ = faturamento - imposto - custosFixos;
    
    return {
        titulo: "Resumo PJ (Manual)",
        valorFinal: liquidoPJ,
        breakdown: [
            { label: "Faturamento Bruto", valor: faturamento, classe: 'provento' },
            { label: `(-) Imposto (${taxa}%)`, valor: imposto, classe: 'desconto' },
            { label: "(-) Custos Fixos", valor: custosFixos, classe: 'desconto' },
        ]
    };
}


// --- FUNÇÕES AUXILIARES DE CÁLCULO (COMPLETAS) ---
function calcularAliquotaEfetiva(rbt12, tabela) {
    if (rbt12 <= 0) return 0;
    let faixaCorreta = tabela[tabela.length - 1]; // Última faixa por default
    for (const faixa of tabela) {
        if (rbt12 <= faixa.teto) {
            faixaCorreta = faixa;
            break;
        }
    }
    const { aliquota, pd } = faixaCorreta;
    const aliquotaEfetiva = ((rbt12 * aliquota) - pd) / rbt12;
    return aliquotaEfetiva > 0 ? aliquotaEfetiva : 0;
}

const formatBRL = (val) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPerc = (val) => `${(val * 100).toFixed(2)}%`.replace('.', ',');


// --- FUNÇÃO DE EXIBIÇÃO (DISPLAY) (COMPLETA) ---
function exibirResultadoPJ(pj) {
    document.getElementById('resultado-pj-titulo').innerHTML = `<span class="cor-pj">■</span> ${pj.titulo}`;
    const listaPJ = document.getElementById('resultado-pj-lista');
    listaPJ.innerHTML = ''; // Limpa a lista
    
    pj.breakdown.forEach(item => {
        listaPJ.innerHTML += `<li class="${item.classe}"><span>${item.label}</span> <span>${formatBRL(item.valor)}</span></li>`;
    });
    
    if (pj.nota) { // Adiciona a nota de otimização
        listaPJ.innerHTML += `<li><span class="sub-label">${pj.nota}</span></li>`;
    }
    
    if (pj.aviso) { // Adiciona o aviso do MEI
        listaPJ.innerHTML += `<li><small class="card-footer-note" style="margin-top: 0; padding: 0;">${pj.aviso}</small></li>`;
    }
    
    listaPJ.innerHTML += `<li class="final"><span>Líquido Total PJ</span> <span>${formatBRL(pj.valorFinal)}</span></li>`;
}