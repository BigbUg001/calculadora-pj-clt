// --- CONSTANTES DE IMPOSTO ATUALIZADAS PARA 2025 ---
const SALARIO_MINIMO = 1518.00; // 2025
const TETO_INSS = 8157.41; // 2025

// Tabela IRRF (2025 - MP 1.227/2024)
const FAIXAS_IRRF = [
    { limite: 2259.20, aliquota: 0, deducao: 0 },
    { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
    { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
    { limite: 4664.68, aliquota: 0.225, deducao: 662.94 },
    { limite: Infinity, aliquota: 0.275, deducao: 896.00 }
];
const DEDUCAO_DEPENDENTE_IRRF = 189.59;
const DESCONTO_SIMPLIFICADO_IRRF = 564.80;

// Tabela INSS (2025) - Progressiva reajustada
const FAIXAS_INSS = [
    { teto: 1518.00, aliquota: 0.075 },
    { teto: 3036.00, aliquota: 0.09 },
    { teto: 4554.00, aliquota: 0.12 },
    { teto: 8157.41, aliquota: 0.14 }
];
const INSS_FAIXA_1 = FAIXAS_INSS[0].teto * FAIXAS_INSS[0].aliquota;
const INSS_FAIXA_2 = INSS_FAIXA_1 + (FAIXAS_INSS[1].teto - FAIXAS_INSS[0].teto) * FAIXAS_INSS[1].aliquota;
const INSS_FAIXA_3 = INSS_FAIXA_2 + (FAIXAS_INSS[2].teto - FAIXAS_INSS[1].teto) * FAIXAS_INSS[2].aliquota;
const INSS_TETO = INSS_FAIXA_3 + (TETO_INSS - FAIXAS_INSS[2].teto) * FAIXAS_INSS[3].aliquota;

// Tabelas Simples Nacional (Anexo III e V - inalteradas)
const ANEXO_III = [
    { teto: 180000, aliquota: 0.06, pd: 0 }, { teto: 360000, aliquota: 0.112, pd: 9360 }, { teto: 720000, aliquota: 0.135, pd: 17640 },
    { teto: 1800000, aliquota: 0.16, pd: 35640 }, { teto: 3600000, aliquota: 0.21, pd: 125640 }, { teto: 4800000, aliquota: 0.33, pd: 648000 }
];
const ANEXO_V = [
    { teto: 180000, aliquota: 0.155, pd: 0 }, { teto: 360000, aliquota: 0.18, pd: 4500 }, { teto: 720000, aliquota: 0.195, pd: 9900 },
    { teto: 1800000, aliquota: 0.205, pd: 17100 }, { teto: 3600000, aliquota: 0.23, pd: 62100 }, { teto: 4800000, aliquota: 0.305, pd: 540000 }
];

// NOVO: Constantes de Custo Empresa (inalteradas, mas confirmadas)
const CUSTO_PATRONAL_INSS = 0.20; // 20% sobre Bruto (simplificado, Regime Geral)
const CUSTO_FGTS = 0.08;
const CUSTO_TERCEIROS = 0.058; // Média (SENAI, SESI, etc.)
const CUSTO_RAT = 0.03; // Média (Risco Ambiental do Trabalho)

// --- IDs de Todos os Inputs (para Share) - Adicionado clt-incluir-provisao ---
const todosInputIDs = [
    'clt-bruto', 'clt-dependentes', 'clt-vr', 'clt-va', 'clt-saude', 'clt-outros-descontos', 
    'clt-vt-gasto', 'clt-incluir-provisao', 'clt-incluir-fgts', // Removido clt-receber-vt
    'pj-regime', 'pj-faturamento', 'pj-rbt12', 'pj-anexo', 'pj-estrategia-prolabore',
    'pj-contabilidade', 'pj-outros', 'pj-faturamento-mei', 'pj-custo-mei', 'pj-outros-mei',
    'pj-faturamento-manual', 'pj-taxa-manual', 'pj-custos-fixos-manual',
    'visao-toggle'
];


// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // Botões
    document.getElementById('btn-calcular').addEventListener('click', handleCalculateClick);
    document.getElementById('btn-share').addEventListener('click', gerarLinkCompartilhamento);
    
    // Listeners de UI
    document.getElementById('pj-regime').addEventListener('change', togglePJInputs);
    document.getElementById('visao-toggle').addEventListener('change', handleVisaoChange);
    
    // Funções de Load
    togglePJInputs();
    handleVisaoChange(); // Define o estado inicial dos labels
    preencherCamposPelaURL(); // Preenche e calcula se houver link
});

// --- FUNÇÕES DE UI (Loading, Toggle, etc) ---

function handleCalculateClick() {
    const btn = document.getElementById('btn-calcular');
    const btnText = document.getElementById('btn-text');
    const spinner = document.getElementById('btn-spinner');

    btn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'block';

    // Usamos setTimeout para permitir que o DOM atualize e mostre o spinner
    setTimeout(() => {
        try {
            calcularTudo();
        } catch (e) {
            console.error(e);
            alert("Ocorreu um erro no cálculo. Verifique os valores.");
        }
        
        // Restaura o botão
        btn.disabled = false;
        btnText.style.display = 'block';
        spinner.style.display = 'none';
        
        // Mostra resultados
        document.getElementById('resultado-clt-col').style.display = 'block';
        document.getElementById('resultado-pj-col').style.display = 'block';
        document.getElementById('anual-container').style.display = 'block';
    }, 50); // 50ms é suficiente
}

function handleVisaoChange() {
    const ehVisaoEmpresa = document.getElementById('visao-toggle').checked;
    const labelColaborador = document.getElementById('label-colaborador');
    const labelEmpresa = document.getElementById('label-empresa');
    
    if (ehVisaoEmpresa) {
        labelEmpresa.style.color = 'var(--cor-texto)';
        labelColaborador.style.color = 'var(--cor-texto-fraco)';
    } else {
        labelColaborador.style.color = 'var(--cor-texto)';
        labelEmpresa.style.color = 'var(--cor-texto-fraco)';
    }
    // Oculta/Mostra campos irrelevantes para a Visão Empresa
    document.getElementById('clt-incluir-provisao').parentElement.style.display = ehVisaoEmpresa ? 'none' : 'flex';
    document.getElementById('clt-incluir-fgts').parentElement.style.display = ehVisaoEmpresa ? 'none' : 'flex';
}

function togglePJInputs() {
    const regime = document.getElementById('pj-regime').value;
    document.getElementById('pj-simples-inputs').style.display = (regime === 'simples') ? 'block' : 'none';
    document.getElementById('pj-mei-inputs').style.display = (regime === 'mei') ? 'block' : 'none';
    document.getElementById('pj-manual-inputs').style.display = (regime === 'manual') ? 'block' : 'none';
}


// --- FUNÇÃO MESTRA DE CÁLCULO ---
function calcularTudo() {
    const ehVisaoEmpresa = document.getElementById('visao-toggle').checked;
    
    // 1. Obter inputs CLT
    const cltInputs = {
        bruto: parseFloat(document.getElementById('clt-bruto').value) || 0,
        vr: parseFloat(document.getElementById('clt-vr').value) || 0,
        va: parseFloat(document.getElementById('clt-va').value) || 0,
        saude: parseFloat(document.getElementById('clt-saude').value) || 0,
        outrosDescontos: parseFloat(document.getElementById('clt-outros-descontos').value) || 0,
        dependentes: parseInt(document.getElementById('clt-dependentes').value) || 0,
        incluirProvisao: document.getElementById('clt-incluir-provisao').checked,
        incluirFGTS: document.getElementById('clt-incluir-fgts').checked,
        gastoVT: parseFloat(document.getElementById('clt-vt-gasto').value) || 0,
    };
    if (cltInputs.bruto <= 0) throw new Error("Insira um salário bruto CLT válido.");
    
    // 2. Obter inputs PJ (baseado no regime)
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
        if (pjInputs.faturamento <= 0) throw new Error("Insira um faturamento PJ válido.");
        if (pjInputs.rbt12 < pjInputs.faturamento * 12) pjInputs.rbt12 = pjInputs.faturamento * 12; // Assumir anual se vazio ou inconsistente
        if (pjInputs.rbt12 > 4800000) throw new Error("RBT12 excede limite Simples Nacional (R$4.800.000/ano).");
    } else if (pjRegime === 'mei') {
        pjInputs = { ...pjInputs,
            faturamento: parseFloat(document.getElementById('pj-faturamento-mei').value) || 0,
            custoDAS: parseFloat(document.getElementById('pj-custo-mei').value) || 72,
            outros: parseFloat(document.getElementById('pj-outros-mei').value) || 0,
        };
        if (pjInputs.faturamento <= 0) throw new Error("Insira um faturamento MEI válido.");
        if (pjInputs.faturamento > 6750) alert("Aviso: Faturamento MEI excede média mensal (R$81.000/ano).");
    } else if (pjRegime === 'manual') {
        pjInputs = { ...pjInputs,
            faturamento: parseFloat(document.getElementById('pj-faturamento-manual').value) || 0,
            taxa: parseFloat(document.getElementById('pj-taxa-manual').value) || 0,
            custosFixos: parseFloat(document.getElementById('pj-custos-fixos-manual').value) || 0,
        };
        if (pjInputs.faturamento <= 0) throw new Error("Insira um faturamento manual válido.");
    }

    let resultadoCLT, resultadoPJ;
    
    // 3. Chamar os módulos de cálculo corretos
    if (ehVisaoEmpresa) {
        resultadoCLT = calcularCLT_Empresa(cltInputs);
        resultadoPJ = calcularPJ_Empresa(pjInputs);
    } else {
        resultadoCLT = calcularCLT_Colaborador(cltInputs);
        if (pjRegime === 'simples') resultadoPJ = calcularPJ_Colaborador(pjInputs);
        else if (pjRegime === 'mei') resultadoPJ = calcularPJ_MEI(pjInputs);
        else resultadoPJ = calcularPJ_Manual(pjInputs);
    }
    
    // 4. Exibir
    exibirResultados(resultadoCLT, resultadoPJ, ehVisaoEmpresa);
    exibirResultadoAnual(resultadoCLT, resultadoPJ, ehVisaoEmpresa);
}

// --- MÓDULOS DE CÁLCULO CLT (ATUALIZADOS) ---
function calcularCLT_Colaborador(inputs) {
    const { bruto, vr, va, saude, outrosDescontos, dependentes, incluirProvisao, incluirFGTS, gastoVT } = inputs;
    
    const inss = calcularINSS_Progressivo(bruto);
    const irrf = calcularIRRF_Preciso(bruto, inss, dependentes);
    const descontoVT = gastoVT > 0 ? Math.min(gastoVT, bruto * 0.06) : 0; // Sempre aplica se gasto informado
    const totalDescontos = inss + irrf + descontoVT + outrosDescontos + saude;
    const liquido = bruto - totalDescontos + (vr * 22) + va; // Assume 22 dias úteis para VR
    
    const fgts = bruto * 0.08;
    const provisao = bruto * 0.1944; // 13º (8,33%) + Férias (11,11% com 1/3)
    const pacoteTotal = liquido + (incluirFGTS ? fgts : 0) + (incluirProvisao ? provisao : 0);
    
    const breakdown = [
        { label: "Salário Bruto", valor: bruto, classe: 'provento' },
        { label: "(-) INSS", valor: inss, classe: 'desconto' },
        { label: "(-) IRRF", valor: irrf, classe: 'desconto' },
        { label: "(-) VT (6%)", valor: descontoVT, classe: 'desconto' },
        { label: "(-) Outros Descontos/Saúde", valor: outrosDescontos + saude, classe: 'desconto' },
        { label: "(+) VR + VA", valor: (vr * 22) + va, classe: 'provento' },
    ];
    if (incluirProvisao) breakdown.push({ label: "(+) Provisão (13º + Férias) - Incluída", valor: provisao, classe: 'provento' });
    if (incluirFGTS) breakdown.push({ label: "(+) FGTS (8%) - Incluído", valor: fgts, classe: 'provento' });
    
    return {
        titulo: "Resumo Mensal CLT",
        valorFinal: pacoteTotal,
        breakdown: breakdown
    };
}

function calcularCLT_Empresa(inputs) {
    const { bruto, vr, va, saude, gastoVT } = inputs; // Removido receberVT, assume se gastoVT >0
    
    const inssPatronal = bruto * CUSTO_PATRONAL_INSS;
    const fgts = bruto * CUSTO_FGTS;
    const terceiros = bruto * CUSTO_TERCEIROS;
    const rat = bruto * CUSTO_RAT;
    const provisao = bruto * 0.1944;
    const custoVT = gastoVT > 0 ? gastoVT : 0; // Assume custo se informado
    const custoBeneficios = (vr * 22) + va + saude + custoVT;
    const custoTotal = bruto + inssPatronal + fgts + terceiros + rat + provisao + custoBeneficios;
    
    return {
        titulo: "Custo Empresa (CLT)",
        valorFinal: custoTotal,
        breakdown: [
            { label: "Salário Bruto", valor: bruto, classe: 'desconto' },
            { label: "INSS Patronal (20%)", valor: inssPatronal, classe: 'desconto' },
            { label: "FGTS (8%)", valor: fgts, classe: 'desconto' },
            { label: "Terceiros (~5,8%)", valor: terceiros, classe: 'desconto' },
            { label: "RAT (~3%)", valor: rat, classe: 'desconto' },
            { label: "Provisão (13º + Férias)", valor: provisao, classe: 'desconto' },
            { label: "Benefícios (VR/VA/Saúde/VT)", valor: custoBeneficios, classe: 'desconto' }
        ]
    };
}

// --- MÓDULOS DE CÁLCULO PJ (MANTEVE-SE DAS CORREÇÕES ANTERIORES) ---
function calcularPJ_Colaborador(inputs) {
    const { faturamento, rbt12, anexo, estrategiaProlabore, contabilidade, outros } = inputs;
    
    let prolaboreDefinido = 0;
    let notaOtimizacao = "";
    let anexoCalculado = anexo;
    const limiteSwitch = 61567.40;

    if (estrategiaProlabore === 'otimizar') {
        if (faturamento <= limiteSwitch) {
            anexoCalculado = 'iii';
            prolaboreDefinido = Math.max(faturamento * 0.28, SALARIO_MINIMO);
            notaOtimizacao = "Pró-labore 28% (Anexo III - Otimizado)";
        } else {
            anexoCalculado = 'v';
            prolaboreDefinido = SALARIO_MINIMO;
            notaOtimizacao = "Pró-labore Mínimo (Anexo V - Minimiza IRRF)";
        }
    } else {
        prolaboreDefinido = SALARIO_MINIMO;
        notaOtimizacao = "Pró-labore Mínimo (Sem Otimização)";
    }

    const tabela = (anexoCalculado === 'iii') ? ANEXO_III : ANEXO_V;
    const aliquotaEfetiva = calcularAliquotaEfetiva(rbt12, tabela);
    const impostoSimples = faturamento * aliquotaEfetiva;
    const inssProlabore = Math.min(prolaboreDefinido * 0.11, 0.11 * TETO_INSS);
    const baseIR = prolaboreDefinido - inssProlabore;
    const irrf = calcularIRRF_PelaTabela(baseIR); // Usa tabela sem dependentes para PJ
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
            { label: `(-) Custos Fixos`, valor: custosFixos, classe: 'desconto' }
        ],
        nota: `${notaOtimizacao}. Consulte contador.`
    };
}

function calcularPJ_MEI(inputs) {
    const { faturamento, custoDAS, outros } = inputs;
    const limiteMEI = 6750; // R$81.000/ano
    let aviso = (faturamento > limiteMEI) ? `Atenção: Faturamento excede limite MEI (${formatBRL(limiteMEI)}/mês).` : "";
    
    const custosTotais = custoDAS + outros;
    const liquidoPJ = faturamento - custosTotais;
    
    return {
        titulo: "Resumo PJ (MEI)",
        valorFinal: liquidoPJ,
        breakdown: [
            { label: "Faturamento Bruto", valor: faturamento, classe: 'provento' },
            { label: "(-) DAS-MEI", valor: custoDAS, classe: 'desconto' },
            { label: "(-) Custos Fixos", valor: outros, classe: 'desconto' }
        ],
        nota: aviso
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
            { label: "(-) Custos Fixos", valor: custosFixos, classe: 'desconto' }
        ]
    };
}

function calcularPJ_Empresa(inputs) {
    const faturamento = inputs.faturamento || inputs.faturamento_mei || inputs.faturamento_manual || 0;
    return {
        titulo: "Custo Empresa (PJ)",
        valorFinal: faturamento,
        breakdown: [
            { label: "Valor da Nota Fiscal (Custo Total)", valor: faturamento, classe: 'desconto' }
        ]
    };
}


// --- FUNÇÕES AUXILIARES DE CÁLCULO (ATUALIZADAS) ---
function calcularINSS_Progressivo(salario) {
    if (salario <= 0) return 0;
    if (salario <= FAIXAS_INSS[0].teto) return salario * FAIXAS_INSS[0].aliquota;
    if (salario <= FAIXAS_INSS[1].teto) return INSS_FAIXA_1 + (salario - FAIXAS_INSS[0].teto) * FAIXAS_INSS[1].aliquota;
    if (salario <= FAIXAS_INSS[2].teto) return INSS_FAIXA_2 + (salario - FAIXAS_INSS[1].teto) * FAIXAS_INSS[2].aliquota;
    if (salario <= TETO_INSS) return INSS_FAIXA_3 + (salario - FAIXAS_INSS[2].teto) * FAIXAS_INSS[3].aliquota;
    return INSS_TETO;
}

function calcularIRRF_Preciso(bruto, inss, dependentes) {
    if (bruto <= 0) return 0;
    const deducaoDependentes = dependentes * DEDUCAO_DEPENDENTE_IRRF;
    const baseCalculoPadrao = bruto - inss - deducaoDependentes;
    const impostoPadrao = calcularIRRF_PelaTabela(baseCalculoPadrao);
    const baseCalculoSimplificada = bruto - DESCONTO_SIMPLIFICADO_IRRF;
    const impostoSimplificado = calcularIRRF_PelaTabela(baseCalculoSimplificada);
    return Math.max(0, Math.min(impostoPadrao, impostoSimplificado));
}

function calcularIRRF_PelaTabela(base) {
    if (base <= 0) return 0;
    for (const faixa of FAIXAS_IRRF) {
        if (base <= faixa.limite) {
            return (base * faixa.aliquota) - faixa.deducao;
        }
    }
    const ultimaFaixa = FAIXAS_IRRF[FAIXAS_IRRF.length - 1];
    return (base * ultimaFaixa.aliquota) - ultimaFaixa.deducao;
}

function calcularAliquotaEfetiva(rbt12, tabela) {
    if (rbt12 <= 0) return 0;
    let faixaCorreta = tabela[tabela.length - 1];
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


// --- FUNÇÕES DE EXIBIÇÃO (DISPLAY) ---

const formatBRL = (val) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPerc = (val) => `${(val * 100).toFixed(2)}%`.replace('.', ',');

function exibirResultados(clt, pj, ehVisaoEmpresa) {
    const vencedor = clt.valorFinal > pj.valorFinal ? 'CLT' : 'PJ';
    
    // Atualiza Coluna CLT
    document.getElementById('clt-resultado-titulo').innerHTML = `<span class="cor-clt">■</span> ${clt.titulo}`;
    const listaCLT = document.getElementById('clt-resultado-lista');
    listaCLT.innerHTML = ''; // Limpa a lista
    clt.breakdown.forEach(item => {
        if (item.label) listaCLT.innerHTML += `<li class="${item.classe}"><span>${item.label}</span> <span>${formatBRL(item.valor)}</span></li>`;
    });
    listaCLT.innerHTML += `<li class="final"><span>${ehVisaoEmpresa ? 'Custo Total' : 'Pacote Total'} CLT</span> <span>${formatBRL(clt.valorFinal)}</span></li>`;
    
    // Atualiza Coluna PJ
    document.getElementById('pj-resultado-titulo').innerHTML = `<span class="cor-pj">■</span> ${pj.titulo}`;
    const listaPJ = document.getElementById('pj-resultado-lista');
    listaPJ.innerHTML = ''; // Limpa a lista
    pj.breakdown.forEach(item => {
        listaPJ.innerHTML += `<li class="${item.classe}"><span>${item.label}</span> <span>${formatBRL(item.valor)}</span></li>`;
    });
    if (pj.nota) {
        listaPJ.innerHTML += `<li><span class="sub-label">${pj.nota}</span></li>`;
    }
    listaPJ.innerHTML += `<li class="final"><span>${ehVisaoEmpresa ? 'Custo Total' : 'Líquido Total'} PJ</span> <span>${formatBRL(pj.valorFinal)}</span></li>`;

    // Destaca vencedor
    const colCLT = document.getElementById('resultado-clt-col');
    const colPJ = document.getElementById('resultado-pj-col');
    colCLT.classList.remove('vencedor');
    colPJ.classList.remove('vencedor');
    if (vencedor === 'CLT') colCLT.classList.add('vencedor');
    else colPJ.classList.add('vencedor');
}

function exibirResultadoAnual(clt, pj, ehVisaoEmpresa) {
    const container = document.getElementById('anual-container');
    const cltAnual = clt.valorFinal * 12;
    const pjAnual = pj.valorFinal * 12;
    const diferenca = Math.abs(cltAnual - pjAnual);
    
    let textoComparacao = '';
    let tituloAnual = '';
    
    if (ehVisaoEmpresa) {
        tituloAnual = "Comparação de Custo Anual (Empresa)";
        if (pjAnual < cltAnual) {
            textoComparacao = `Contratar como PJ representa uma <strong>economia anual de ${formatBRL(diferenca)}</strong> para a empresa.`;
        } else {
            textoComparacao = `Contratar como CLT é <strong>${formatBRL(diferenca)}</strong> mais barato para a empresa neste cenário.`;
        }
    } else {
        tituloAnual = "Comparação de Renda Anual (Colaborador)";
        if (pjAnual > cltAnual) {
            textoComparacao = `Como PJ, sua renda anual seria <strong>${formatBRL(diferenca)}</strong> maior que o pacote CLT.`;
        } else {
            textoComparacao = `Como CLT, seu pacote anual seria <strong>${formatBRL(diferenca)}</strong> maior que o líquido PJ.`;
        }
    }

    container.innerHTML = `
        <h2>${tituloAnual}</h2>
        <div class="anual-grid">
            <div class="anual-col clt">
                <h4>${ehVisaoEmpresa ? 'Custo Total' : 'Pacote Total'} CLT (Ano)</h4>
                <div class="valor-anual">${formatBRL(cltAnual)}</div>
            </div>
            <div class="anual-col pj">
                <h4>${ehVisaoEmpresa ? 'Custo Total' : 'Líquido Total'} PJ (Ano)</h4>
                <div class="valor-anual">${formatBRL(pjAnual)}</div>
            </div>
        </div>
        <p id="comparacao-anual-texto">${textoComparacao}</p>
    `;
}

// --- FUNÇÕES DE SHARE (URL) ---

function gerarLinkCompartilhamento(e) {
    const params = new URLSearchParams();
    
    for (const id of todosInputIDs) {
        const el = document.getElementById(id);
        if (el) {
            if (el.type === 'checkbox') {
                params.append(id, el.checked);
            } else if (el.value) {
                params.append(id, el.value);
            }
        }
    }
    
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    
    // Copia para o clipboard
    navigator.clipboard.writeText(url).then(() => {
        // Feedback para o usuário
        const btn = e.target;
        const originalText = btn.innerText;
        btn.innerText = 'Link Copiado!';
        btn.disabled = true;
        setTimeout(() => {
            btn.innerText = originalText;
            btn.disabled = false;
        }, 2000);
    }, () => {
        alert('Erro ao copiar link. Tente manualmente.');
    });
}

function preencherCamposPelaURL() {
    const params = new URLSearchParams(window.location.search);
    let temParametros = false;
    
    for (const id of todosInputIDs) {
        const paramValue = params.get(id);
        if (paramValue !== null) {
            temParametros = true;
            const el = document.getElementById(id);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = (paramValue === 'true');
                } else {
                    el.value = paramValue;
                }
            }
        }
    }
    
    // Se algum parâmetro foi preenchido, dispara os eventos de UI e calcula
    if (temParametros) {
        togglePJInputs();
        handleVisaoChange();
        handleCalculateClick();
    }
}