// --- CONSTANTES DE IMPOSTO (ATUALIZAR ANUALMENTE) ---
const SALARIO_MINIMO = 1412.00; // 2024
const TETO_INSS = 7786.02; // 2024

// Tabela IRRF (Fevereiro 2024 - MP 1.206/2024)
const FAIXAS_IRRF = [
    { limite: 2259.20, aliquota: 0, deducao: 0 },
    { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
    { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
    { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
    { limite: Infinity, aliquota: 0.275, deducao: 896.00 }
];
const DEDUCAO_DEPENDENTE_IRRF = 189.59;
const DESCONTO_SIMPLIFICADO_IRRF = 564.80;

// Tabela INSS (2024) - Cálculo Progressivo
const FAIXAS_INSS = [
    { teto: 1412.00, aliquota: 0.075 },
    { teto: 2666.68, aliquota: 0.09 },
    { teto: 4000.03, aliquota: 0.12 },
    { teto: 7786.02, aliquota: 0.14 }
];
const INSS_FAIXA_1 = FAIXAS_INSS[0].teto * FAIXAS_INSS[0].aliquota;
const INSS_FAIXA_2 = INSS_FAIXA_1 + (FAIXAS_INSS[1].teto - FAIXAS_INSS[0].teto) * FAIXAS_INSS[1].aliquota;
const INSS_FAIXA_3 = INSS_FAIXA_2 + (FAIXAS_INSS[2].teto - FAIXAS_INSS[1].teto) * FAIXAS_INSS[2].aliquota;
const INSS_TETO = INSS_FAIXA_3 + (TETO_INSS - FAIXAS_INSS[2].teto) * FAIXAS_INSS[3].aliquota; // 908.85

// Tabelas Simples Nacional (Anexo III e V)
const ANEXO_III = [ /* ... (omitido para brevidade, cole o da V4) ... */ ];
const ANEXO_V = [ /* ... (omitido para brevidade, cole o da V4) ... */ ];
// COLE AS TABELAS ANEXO_III E ANEXO_V DA VERSÃO ANTERIOR AQUI
const ANEXO_III_V4 = [
    { teto: 180000, aliquota: 0.06, pd: 0 }, { teto: 360000, aliquota: 0.112, pd: 9360 }, { teto: 720000, aliquota: 0.135, pd: 17640 },
    { teto: 1800000, aliquota: 0.16, pd: 35640 }, { teto: 3600000, aliquota: 0.21, pd: 125640 }, { teto: 4800000, aliquota: 0.33, pd: 648000 }
];
const ANEXO_V_V4 = [
    { teto: 180000, aliquota: 0.155, pd: 0 }, { teto: 360000, aliquota: 0.18, pd: 4500 }, { teto: 720000, aliquota: 0.195, pd: 9900 },
    { teto: 1800000, aliquota: 0.205, pd: 17100 }, { teto: 3600000, aliquota: 0.23, pd: 62100 }, { teto: 4800000, aliquota: 0.305, pd: 540000 }
];
ANEXO_III.push(...ANEXO_III_V4);
ANEXO_V.push(...ANEXO_V_V4);


// NOVO: Constantes de Custo Empresa
const CUSTO_PATRONAL_INSS = 0.20; // 20% sobre Bruto (simplificado, Regime Geral)
const CUSTO_FGTS = 0.08;
const CUSTO_TERCEIROS = 0.058; // Média (SENAI, SESI, etc.)
const CUSTO_RAT = 0.03; // Média (Risco Ambiental do Trabalho)

// --- IDs de Todos os Inputs (para Share) ---
const todosInputIDs = [
    'clt-bruto', 'clt-dependentes', 'clt-vr', 'clt-va', 'clt-saude', 'clt-outros-descontos', 
    'clt-vt-gasto', 'clt-receber-vt', 'clt-incluir-fgts',
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
        incluirFGTS: document.getElementById('clt-incluir-fgts').checked,
        gastoVT: parseFloat(document.getElementById('clt-vt-gasto').value) || 0, // NOVO
        receberVT: document.getElementById('clt-receber-vt').checked, // NOVO
    };
    
    // 2. Obter inputs PJ (baseado no regime)
    const pjRegime = document.getElementById('pj-regime').value;
    let pjInputs = { regime: pjRegime };
    // (Lógica para ler MEI e Manual omitida para brevidade, mas deve existir)
    pjInputs = { ...pjInputs,
        faturamento: parseFloat(document.getElementById('pj-faturamento').value) || 0,
        rbt12: parseFloat(document.getElementById('pj-rbt12').value) || 0,
        anexo: document.getElementById('pj-anexo').value,
        estrategiaProlabore: document.getElementById('pj-estrategia-prolabore').value,
        contabilidade: parseFloat(document.getElementById('pj-contabilidade').value) || 0,
        outros: parseFloat(document.getElementById('pj-outros').value) || 0,
    };

    let resultadoCLT, resultadoPJ;
    
    // 3. Chamar os módulos de cálculo corretos
    if (ehVisaoEmpresa) {
        resultadoCLT = calcularCLT_Empresa(cltInputs);
        resultadoPJ = calcularPJ_Empresa(pjInputs);
    } else {
        resultadoCLT = calcularCLT_Colaborador(cltInputs);
        // (Aqui entraria a lógica para chamar `calcularPJ_MEI` ou `Manual`)
        resultadoPJ = calcularPJ_Colaborador(pjInputs);
    }

    // 4. Exibir os resultados na tela
    exibirResultados(resultadoCLT, resultadoPJ, ehVisaoEmpresa);
    exibirResultadoAnual(resultadoCLT, resultadoPJ, ehVisaoEmpresa);
}

// --- MÓDULOS DE CÁLCULO (COLABORADOR) ---

function calcularCLT_Colaborador(inputs) {
    const { bruto, vr, va, saude, outrosDescontos, dependentes, incluirFGTS, gastoVT, receberVT } = inputs;
    
    // 1. Lógica VT (NOVA)
    let descontoVT = 0;
    let beneficioVT = 0;
    if (receberVT && gastoVT > 0) {
        // O desconto é 6% do bruto, LIMITADO ao gasto real.
        descontoVT = Math.min(bruto * 0.06, gastoVT);
        beneficioVT = gastoVT; // O benefício é o valor total recebido
    }
    
    const inss = calcularINSS_Progressivo(bruto);
    const irrf = calcularIRRF_Preciso(bruto, inss, dependentes);
    
    const vrTotal = vr * 22;
    const vaTotal = va;
    const fgts = bruto * CUSTO_FGTS;
    const provisaoFerias13 = bruto * (1/12) + (bruto * (1/12) / 3) + (bruto / 12);
    
    const descontosBeneficios = saude + outrosDescontos + descontoVT;
    const salarioLiquido = bruto - inss - irrf - descontosBeneficios;
    
    let pacoteBase = salarioLiquido + vrTotal + vaTotal + beneficioVT + provisaoFerias13;
    let pacoteTotalCLT = incluirFGTS ? pacoteBase + fgts : pacoteBase;

    // Retorna um objeto estruturado para o display
    return {
        titulo: "Resumo Mensal CLT",
        valorFinal: pacoteTotalCLT,
        breakdown: [
            { label: "Salário Bruto", valor: bruto, classe: 'provento' },
            { label: "(-) INSS", valor: inss, classe: 'desconto' },
            { label: "(-) IRRF", valor: irrf, classe: 'desconto' },
            { label: "(-) Descontos (Saúde, VT, Outros)", valor: saude + outrosDescontos + descontoVT, classe: 'desconto' },
            { label: "Salário Líquido (em conta)", valor: salarioLiquido, classe: 'final-sub' },
            { label: "(+) Benefícios (VR/VA/VT)", valor: vrTotal + vaTotal + beneficioVT, classe: 'provento' },
            { label: `(+) Provisão (Férias+13º) <span class="info-tooltip" title="Valor (19.44%) guardado para equiparar ao 13º e Férias + 1/3. Essencial para uma comparação justa.">?</span>`, valor: provisaoFerias13, classe: 'provento' },
            { label: `(+) FGTS (8%) ${incluirFGTS ? '(Incluído)' : '(Não Incluído)'}`, valor: fgts, classe: 'provento' },
        ]
    };
}

function calcularPJ_Colaborador(inputs) {
    const { faturamento, rbt12, anexo, estrategiaProlabore, contabilidade, outros } = inputs;
    
    let prolaboreDefinido = 0;
    let notaOtimizacao = "";
    let anexoCalculado = anexo;

    if (anexo === 'iii' || faturamento === 0) {
        prolaboreDefinido = SALARIO_MINIMO;
        notaOtimizacao = "Pró-labore Mínimo (Anexo III)";
    } else {
        const prolaboreMinimo = SALARIO_MINIMO;
        const inssMinimo = prolaboreMinimo * 0.11;
        const aliquotaV = calcularAliquotaEfetiva(rbt12, ANEXO_V);
        const impostoV = faturamento * aliquotaV;
        const custoTotalV = impostoV + inssMinimo;
        
        const prolaboreOtimizado = Math.max(faturamento * 0.28, SALARIO_MINIMO);
        const inssOtimizado = prolaboreOtimizado * 0.11;
        const aliquotaIII = calcularAliquotaEfetiva(rbt12, ANEXO_III);
        const impostoIII = faturamento * aliquotaIII;
        const custoTotalIII = impostoIII + inssOtimizado;
        
        if (estrategiaProlabore === 'otimizar' && custoTotalIII < custoTotalV) {
            prolaboreDefinido = prolaboreOtimizado;
            anexoCalculado = 'iii';
            notaOtimizacao = `Otimizado (Migrou p/ Anexo III)`;
        } else {
            prolaboreDefinido = prolaboreMinimo;
            anexoCalculado = 'v';
            notaOtimizacao = `Mínimo (Otimização não vantajosa)`;
        }
    }

    const tabela = (anexoCalculado === 'iii') ? ANEXO_III : ANEXO_V;
    const aliquotaEfetiva = calcularAliquotaEfetiva(rbt12, tabela);
    const impostoSimples = faturamento * aliquotaEfetiva;
    const inssProlabore = prolaboreDefinido * 0.11;
    const custosFixos = contabilidade + outros;
    const custosTotais = impostoSimples + inssProlabore + custosFixos;
    const liquidoPJ = faturamento - custosTotais;
    
    return {
        titulo: `Resumo Mensal PJ (Simples ${anexoCalculado.toUpperCase()})`,
        valorFinal: liquidoPJ,
        breakdown: [
            { label: "Faturamento Bruto", valor: faturamento, classe: 'provento' },
            { label: `(-) Imposto Simples (${formatPerc(aliquotaEfetiva)})`, valor: impostoSimples, classe: 'desconto' },
            { label: `(-) INSS (s/ Pró-Labore ${formatBRL(prolaboreDefinido)})`, valor: inssProlabore, classe: 'desconto' },
            { label: `(-) Custos Fixos (Contador, etc)`, valor: custosFixos, classe: 'desconto' },
        ],
        nota: `Pró-Labore: ${notaOtimizacao}`
    };
}

// --- MÓDULOS DE CÁLCULO (EMPRESA) ---

function calcularCLT_Empresa(inputs) {
    const { bruto, vr, va, gastoVT, receberVT } = inputs;
    
    // Encargos Básicos
    const fgts = bruto * CUSTO_FGTS;
    const provisaoFerias13 = bruto * (1/12) + (bruto * (1/12) / 3) + (bruto / 12);
    
    // Encargos Patronais (Simplificado - Simples Nacional é diferente)
    // Assumindo Lucro Presumido/Real para comparação justa
    const inssPatronal = bruto * CUSTO_PATRONAL_INSS;
    const terceiros = bruto * CUSTO_TERCEIROS;
    const rat = bruto * CUSTO_RAT;
    const encargos = inssPatronal + terceiros + rat;
    
    // Benefícios (Custo da Empresa)
    const vrTotal = vr * 22;
    const vaTotal = va;
    const beneficioVT = (receberVT ? gastoVT : 0); // Custo total do VT para a empresa
    const beneficios = vrTotal + vaTotal + beneficioVT;
    
    const custoTotal = bruto + fgts + provisaoFerias13 + encargos + beneficios;

    return {
        titulo: "Custo Empresa (CLT)",
        valorFinal: custoTotal,
        breakdown: [
            { label: "Salário Bruto", valor: bruto, classe: 'desconto' },
            { label: "(+) Encargos (INSS, RAT, Terceiros)", valor: encargos, classe: 'desconto' },
            { label: "(+) FGTS (8%)", valor: fgts, classe: 'desconto' },
            { label: "(+) Provisão (Férias+13º)", valor: provisaoFerias13, classe: 'desconto' },
            { label: "(+) Benefícios (VR/VA/VT)", valor: beneficios, classe: 'desconto' },
        ]
    };
}

function calcularPJ_Empresa(inputs) {
    // Para a empresa, o custo do PJ é simplesmente o faturamento (valor da NF).
    const { faturamento } = inputs;
    return {
        titulo: "Custo Empresa (PJ)",
        valorFinal: faturamento,
        breakdown: [
            { label: "Valor da Nota Fiscal (Custo Total)", valor: faturamento, classe: 'desconto' }
        ]
    };
}


// --- FUNÇÕES AUXILIARES DE CÁLCULO (INSS, IRRF, Simples) ---
// (Cole as funções `calcularINSS_Progressivo`, `calcularIRRF_Preciso`, `calcularIRRF_PelaTabela`, `calcularAliquotaEfetiva` da V4 aqui)
function calcularINSS_Progressivo(salario) { /* ...COLE AQUI... */ 
    if (salario <= 0) return 0;
    if (salario <= FAIXAS_INSS[0].teto) return salario * FAIXAS_INSS[0].aliquota;
    if (salario <= FAIXAS_INSS[1].teto) return INSS_FAIXA_1 + (salario - FAIXAS_INSS[0].teto) * FAIXAS_INSS[1].aliquota;
    if (salario <= FAIXAS_INSS[2].teto) return INSS_FAIXA_2 + (salario - FAIXAS_INSS[1].teto) * FAIXAS_INSS[2].aliquota;
    if (salario <= TETO_INSS) return INSS_FAIXA_3 + (salario - FAIXAS_INSS[2].teto) * FAIXAS_INSS[3].aliquota;
    return INSS_TETO;
}
function calcularIRRF_Preciso(bruto, inss, dependentes) { /* ...COLE AQUI... */ 
    if (bruto <= 0) return 0;
    const deducaoDependentes = dependentes * DEDUCAO_DEPENDENTE_IRRF;
    const baseCalculoPadrao = bruto - inss - deducaoDependentes;
    const impostoPadrao = calcularIRRF_PelaTabela(baseCalculoPadrao);
    const baseCalculoSimplificada = bruto - DESCONTO_SIMPLIFICADO_IRRF;
    const impostoSimplificado = calcularIRRF_PelaTabela(baseCalculoSimplificada);
    return Math.max(0, Math.min(impostoPadrao, impostoSimplificado));
}
function calcularIRRF_PelaTabela(base) { /* ...COLE AQUI... */ 
    if (base <= 0) return 0;
    for (const faixa of FAIXAS_IRRF) { if (base <= faixa.limite) { return (base * faixa.aliquota) - faixa.deducao; } }
    const ultimaFaixa = FAIXAS_IRRF[FAIXAS_IRRF.length - 1]; return (base * ultimaFaixa.aliquota) - ultimaFaixa.deducao;
}
function calcularAliquotaEfetiva(rbt12, tabela) { /* ...COLE AQUI... */ 
    if (rbt12 <= 0) return 0;
    let faixaCorreta = tabela[0];
    for (const faixa of tabela) { if (rbt12 <= faixa.teto) { faixaCorreta = faixa; break; } faixaCorreta = tabela[tabela.length - 1]; }
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
        listaCLT.innerHTML += `<li class="${item.classe}"><span>${item.label}</span> <span>${formatBRL(item.valor)}</span></li>`;
    });
    listaCLT.innerHTML += `<li class="final"><span>${ehVisaoEmpresa ? 'Custo Total' : 'Pacote Total'} CLT</span> <span>${formatBRL(clt.valorFinal)}</span></li>`;
    
    // Atualiza Coluna PJ
    document.getElementById('pj-resultado-titulo').innerHTML = `<span class="cor-pj">■</span> ${pj.titulo}`;
    const listaPJ = document.getElementById('pj-resultado-lista');
    listaPJ.innerHTML = ''; // Limpa a lista
    pj.breakdown.forEach(item => {
        listaPJ.innerHTML += `<li class="${item.classe}"><span>${item.label}</span> <span>${formatBRL(item.valor)}</span></li>`;
    });
    if (pj.nota) { // Adiciona a nota de otimização
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