// --- CONSTANTES DE IMPOSTO (ATUALIZAR ANUALMENTE) ---
const SALARIO_MINIMO = 1412.00; // Mínimo Nacional 2024

// Tabela IRRF (Fevereiro 2024 - MP 1.206/2024)
const FAIXAS_IRRF = [
    { limite: 2259.20, aliquota: 0, deducao: 0 },
    { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
    { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
    { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
    { limite: Infinity, aliquota: 0.275, deducao: 896.00 }
];
const DEDUCAO_DEPENDENTE_IRRF = 189.59;
const DESCONTO_SIMPLIFICADO_IRRF = 564.80; // Novo, Fev/2024

// Tabela INSS (2024) - Cálculo Progressivo
const TETO_INSS = 7786.02;
const FAIXAS_INSS = [
    { teto: 1412.00, aliquota: 0.075 },
    { teto: 2666.68, aliquota: 0.09 },
    { teto: 4000.03, aliquota: 0.12 },
    { teto: 7786.02, aliquota: 0.14 } // Teto
];
// Valor pré-calculado das faixas cheias para performance
const INSS_FAIXA_1 = FAIXAS_INSS[0].teto * FAIXAS_INSS[0].aliquota; // 105.90
const INSS_FAIXA_2 = INSS_FAIXA_1 + (FAIXAS_INSS[1].teto - FAIXAS_INSS[0].teto) * FAIXAS_INSS[1].aliquota; // 218.82
const INSS_FAIXA_3 = INSS_FAIXA_2 + (FAIXAS_INSS[2].teto - FAIXAS_INSS[1].teto) * FAIXAS_INSS[2].aliquota; // 378.82

// Tabelas Simples Nacional (Anexo III e V)
// [limite RBT12, aliquota_nominal, parcela_a_deduzir]
const ANEXO_III = [
    { teto: 180000, aliquota: 0.06, pd: 0 },
    { teto: 360000, aliquota: 0.112, pd: 9360 },
    { teto: 720000, aliquota: 0.135, pd: 17640 },
    { teto: 1800000, aliquota: 0.16, pd: 35640 },
    { teto: 3600000, aliquota: 0.21, pd: 125640 },
    { teto: 4800000, aliquota: 0.33, pd: 648000 }
];
const ANEXO_V = [
    { teto: 180000, aliquota: 0.155, pd: 0 },
    { teto: 360000, aliquota: 0.18, pd: 4500 },
    { teto: 720000, aliquota: 0.195, pd: 9900 },
    { teto: 1800000, aliquota: 0.205, pd: 17100 },
    { teto: 3600000, aliquota: 0.23, pd: 62100 },
    { teto: 4800000, aliquota: 0.305, pd: 540000 }
];
// --- FIM CONSTANTES ---


// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // Botão principal
    document.getElementById('btn-calcular').addEventListener('click', calcularTudo);
    
    // Listener para o seletor de Regime PJ
    document.getElementById('pj-regime').addEventListener('change', togglePJInputs);
    
    // Inicializar o seletor
    togglePJInputs();
});

// --- FUNÇÃO DE UI (Mostrar/Ocultar Inputs PJ) ---
function togglePJInputs() {
    const regime = document.getElementById('pj-regime').value;
    
    // Oculta todos
    document.getElementById('pj-simples-inputs').style.display = 'none';
    document.getElementById('pj-mei-inputs').style.display = 'none';
    document.getElementById('pj-manual-inputs').style.display = 'none';
    
    // Mostra o relevante
    if (regime === 'simples') {
        document.getElementById('pj-simples-inputs').style.display = 'block';
    } else if (regime === 'mei') {
        document.getElementById('pj-mei-inputs').style.display = 'block';
    } else if (regime === 'manual') {
        document.getElementById('pj-manual-inputs').style.display = 'block';
    }
}


// --- FUNÇÃO PRINCIPAL DE CÁLCULO ---
function calcularTudo() {
    // 1. Obter inputs CLT
    const cltInputs = {
        bruto: parseFloat(document.getElementById('clt-bruto').value) || 0,
        vr: parseFloat(document.getElementById('clt-vr').value) || 0,
        va: parseFloat(document.getElementById('clt-va').value) || 0,
        saude: parseFloat(document.getElementById('clt-saude').value) || 0,
        outrosDescontos: parseFloat(document.getElementById('clt-outros-descontos').value) || 0,
        dependentes: parseInt(document.getElementById('clt-dependentes').value) || 0,
        incluirFGTS: document.getElementById('clt-incluir-fgts').checked,
    };
    
    // 2. Obter inputs PJ (baseado no regime)
    const pjRegime = document.getElementById('pj-regime').value;
    let pjInputs = { regime: pjRegime };

    if (pjRegime === 'simples') {
        pjInputs = { ...pjInputs,
            faturamento: parseFloat(document.getElementById('pj-faturamento').value) || 0,
            rbt12: parseFloat(document.getElementById('pj-rbt12').value) || 0,
            anexo: document.getElementById('pj-anexo').value,
            estrategiaProlabore: document.getElementById('pj-estrategia-prolabore').value, // NOVO
            contabilidade: parseFloat(document.getElementById('pj-contabilidade').value) || 0,
            outros: parseFloat(document.getElementById('pj-outros').value) || 0,
        };
    } else if (pjRegime === 'mei') {
        pjInputs = { ...pjInputs,
            faturamento: parseFloat(document.getElementById('pj-faturamento-mei').value) || 0,
            custoDAS: parseFloat(document.getElementById('pj-custo-mei').value) || 0,
            outros: parseFloat(document.getElementById('pj-outros-mei').value) || 0,
        };
    } else if (pjRegime === 'manual') {
        pjInputs = { ...pjInputs,
            faturamento: parseFloat(document.getElementById('pj-faturamento-manual').value) || 0,
            taxa: parseFloat(document.getElementById('pj-taxa-manual').value) || 0,
            custosFixos: parseFloat(document.getElementById('pj-custos-fixos-manual').value) || 0,
        };
    }

    // 3. Calcular os dois cenários
    const resultadoCLT = calcularCLT(cltInputs);
    
    let resultadoPJ;
    if (pjRegime === 'simples') resultadoPJ = calcularPJ_Simples(pjInputs);
    else if (pjRegime === 'mei') resultadoPJ = calcularPJ_MEI(pjInputs);
    else if (pjRegime === 'manual') resultadoPJ = calcularPJ_Manual(pjInputs);

    // 4. Exibir os resultados na tela
    exibirResultados(resultadoCLT, resultadoPJ);
    exibirResultadoAnual(resultadoCLT, resultadoPJ);
}

// --- MÓDULO DE CÁLCULO CLT (PRECISO) ---
function calcularCLT(inputs) {
    const { bruto, vr, va, saude, outrosDescontos, dependentes, incluirFGTS } = inputs;
    
    // 1. Cálculo INSS (Progressivo e Preciso)
    const inss = calcularINSS_Progressivo(bruto);
    
    // 2. Cálculo IRRF (Preciso - Dupla Verificação)
    const irrf = calcularIRRF_Preciso(bruto, inss, dependentes);

    // 3. Benefícios (Proventos)
    const vrTotal = vr * 22; // 22 dias úteis
    const vaTotal = va;
    const fgts = bruto * 0.08;
    // Provisão de 1/12 de férias + 1/3 sobre férias + 1/12 de 13º (Total 19.44%)
    const provisaoFerias13 = bruto * (1/12) + (bruto * (1/12) / 3) + (bruto / 12);
    
    // 4. Descontos
    const descontosBeneficios = saude + outrosDescontos;
    
    // 5. Líquido
    const salarioLiquido = bruto - inss - irrf - descontosBeneficios;
    
    // 6. Pacote Total
    let pacoteBase = salarioLiquido + vrTotal + vaTotal + provisaoFerias13;
    let pacoteTotalCLT = incluirFGTS ? pacoteBase + fgts : pacoteBase;

    return {
        bruto: bruto,
        inss: inss,
        irrf: irrf,
        descontos: descontosBeneficios,
        beneficios: vrTotal + vaTotal,
        fgts: fgts,
        provisaoFerias13: provisaoFerias13,
        liquido: salarioLiquido,
        pacoteTotal: pacoteTotalCLT,
        incluiuFGTS: incluirFGTS
    };
}

// --- MÓDULOS DE CÁLCULO PJ ---

function calcularPJ_Simples(inputs) {
    const { faturamento, rbt12, anexo, estrategiaProlabore, contabilidade, outros } = inputs;
    
    let prolaboreDefinido = 0;
    let notaOtimizacao = "";
    let anexoCalculado = anexo;

    // --- LÓGICA DE OTIMIZAÇÃO DE PRÓ-LABORE ---
    if (anexo === 'iii' || faturamento === 0) {
        // Se já é Anexo III, Fator R é irrelevante. Pague o mínimo.
        prolaboreDefinido = SALARIO_MINIMO;
        notaOtimizacao = "Pró-labore Mínimo (Anexo III não usa Fator R)";
    } else {
        // É Anexo V, precisa decidir.
        
        // Cenário 1: Pró-labore mínimo (FICA no Anexo V)
        const prolaboreMinimo = SALARIO_MINIMO;
        const inssMinimo = prolaboreMinimo * 0.11;
        const aliquotaV = calcularAliquotaEfetiva(rbt12, ANEXO_V);
        const impostoV = faturamento * aliquotaV;
        const custoTotalV = impostoV + inssMinimo;
        
        // Cenário 2: Pró-labore 28% (MIGRA para Anexo III)
        const prolaboreOtimizado = Math.max(faturamento * 0.28, SALARIO_MINIMO);
        const inssOtimizado = prolaboreOtimizado * 0.11;
        const aliquotaIII = calcularAliquotaEfetiva(rbt12, ANEXO_III);
        const impostoIII = faturamento * aliquotaIII;
        const custoTotalIII = impostoIII + inssOtimizado;
        
        if (estrategiaProlabore === 'otimizar') {
            if (custoTotalIII < custoTotalV) {
                // Vale a pena otimizar
                prolaboreDefinido = prolaboreOtimizado;
                anexoCalculado = 'iii';
                notaOtimizacao = `Pró-labore Otimizado (Migrou p/ Anexo III)`;
            } else {
                // Não vale a pena, usa o mínimo
                prolaboreDefinido = prolaboreMinimo;
                anexoCalculado = 'v';
                notaOtimizacao = `Pró-labore Mínimo (Otimização não vantajosa)`;
            }
        } else {
            // Usuário escolheu "minimo"
            prolaboreDefinido = prolaboreMinimo;
            anexoCalculado = 'v'; // Força Anexo V pois Fator R não será atingido
            notaOtimizacao = `Pró-labore Mínimo (Manual)`;
        }
    }
    // --- FIM DA LÓGICA DE PRÓ-LABORE ---

    // 1. Fator R (Apenas para display, a decisão já foi tomada)
    let fatorR = (faturamento > 0) ? prolaboreDefinido / faturamento : 0;
    
    // 2. Alíquota Efetiva (baseada no anexo que foi DECIDIDO)
    const tabela = (anexoCalculado === 'iii') ? ANEXO_III : ANEXO_V;
    const aliquotaEfetiva = calcularAliquotaEfetiva(rbt12, tabela);
    const impostoSimples = faturamento * aliquotaEfetiva;
    
    // 3. INSS sobre Pró-Labore
    const inssProlabore = prolaboreDefinido * 0.11;
    
    // 4. Custos Totais
    const custosFixos = contabilidade + outros;
    const custosTotais = impostoSimples + inssProlabore + custosFixos;
    
    // 5. Líquido
    const liquidoPJ = faturamento - custosTotais;
    
    return {
        regime: "Simples Nacional",
        faturamento: faturamento,
        imposto: impostoSimples,
        inss: inssProlabore,
        custosFixos: custosFixos,
        liquido: liquidoPJ,
        pacoteTotal: liquidoPJ,
        // Extras para display
        prolaboreDefinido: prolaboreDefinido,
        notaOtimizacao: notaOtimizacao,
        aliquotaEfetiva: aliquotaEfetiva,
        anexoFinal: anexoCalculado,
        fatorR: fatorR
    };
}

function calcularPJ_MEI(inputs) {
    const { faturamento, custoDAS, outros } = inputs;
    const limiteMEI = 6750; // 81.000 / 12
    let aviso = (faturamento > limiteMEI) ? `Atenção: Faturamento ${formatBRL(faturamento)} excede o limite mensal médio do MEI (${formatBRL(limiteMEI)}).` : "";
    
    const custosTotais = custoDAS + outros;
    const liquidoPJ = faturamento - custosTotais;
    
    return {
        regime: "MEI",
        faturamento: faturamento,
        imposto: custoDAS,
        inss: 0, // Já está no DAS
        custosFixos: outros,
        liquido: liquidoPJ,
        pacoteTotal: liquidoPJ,
        aviso: aviso
    };
}

function calcularPJ_Manual(inputs) {
    const { faturamento, taxa, custosFixos } = inputs;
    const imposto = faturamento * (taxa / 100);
    const liquidoPJ = faturamento - imposto - custosFixos;
    
    return {
        regime: "Manual",
        faturamento: faturamento,
        imposto: imposto,
        inss: 0, // Assumido 0, pois é manual
        custosFixos: custosFixos,
        liquido: liquidoPJ,
        pacoteTotal: liquidoPJ,
        // Extras
        taxaManual: taxa
    };
}


// --- FUNÇÕES AUXILIARES DE CÁLCULO (PRECISÃO) ---

function calcularINSS_Progressivo(salario) {
    if (salario <= 0) return 0;
    if (salario <= FAIXAS_INSS[0].teto) {
        return salario * FAIXAS_INSS[0].aliquota;
    }
    if (salario <= FAIXAS_INSS[1].teto) {
        return INSS_FAIXA_1 + (salario - FAIXAS_INSS[0].teto) * FAIXAS_INSS[1].aliquota;
    }
    if (salario <= FAIXAS_INSS[2].teto) {
        return INSS_FAIXA_2 + (salario - FAIXAS_INSS[1].teto) * FAIXAS_INSS[2].aliquota;
    }
    if (salario <= FAIXAS_INSS[3].teto) {
        return INSS_FAIXA_3 + (salario - FAIXAS_INSS[2].teto) * FAIXAS_INSS[3].aliquota;
    }
    // Teto
    return 908.85; // Valor Fixo do Teto 2024 (INSS_FAIXA_3 + (TETO_INSS - FAIXAS_INSS[2].teto) * FAIXAS_INSS[3].aliquota)
}

function calcularIRRF_Preciso(bruto, inss, dependentes) {
    if (bruto <= 0) return 0;
    // Método 1: Dedução Padrão (INSS, Dependentes)
    const deducaoDependentes = dependentes * DEDUCAO_DEPENDENTE_IRRF;
    const baseCalculoPadrao = bruto - inss - deducaoDependentes;
    const impostoPadrao = calcularIRRF_PelaTabela(baseCalculoPadrao);

    // Método 2: Desconto Simplificado (R$ 564,80)
    // O desconto simplificado substitui TODAS as deduções (INSS, dependentes)
    const baseCalculoSimplificada = bruto - DESCONTO_SIMPLIFICADO_IRRF;
    const impostoSimplificado = calcularIRRF_PelaTabela(baseCalculoSimplificada);
    
    // A lei permite usar o que for MENOR
    return Math.min(impostoPadrao, impostoSimplificado);
}

function calcularIRRF_PelaTabela(base) {
    if (base <= 0) return 0;
    
    for (const faixa of FAIXAS_IRRF) {
        if (base <= faixa.limite) {
            return (base * faixa.aliquota) - faixa.deducao;
        }
    }
    // Caso de segurança (nunca deve acontecer se Infinity for o último)
    const ultimaFaixa = FAIXAS_IRRF[FAIXAS_IRRF.length - 1];
    return (base * ultimaFaixa.aliquota) - ultimaFaixa.deducao;
}

function calcularAliquotaEfetiva(rbt12, tabela) {
    if (rbt12 <= 0) return 0;
    
    // Encontra a faixa correta na tabela
    let faixaCorreta = tabela[0];
    for (const faixa of tabela) {
        if (rbt12 <= faixa.teto) {
            faixaCorreta = faixa;
            break;
        }
        // Se for maior que a última faixa, usa a última
        faixaCorreta = tabela[tabela.length - 1];
    }
    
    // Fórmula da Alíquota Efetiva: ((RBT12 * Alíquota) - PD) / RBT12
    const { aliquota, pd } = faixaCorreta;
    const aliquotaEfetiva = ((rbt12 * aliquota) - pd) / rbt12;
    
    // O Simples tem um teto, mas para o cálculo mensal, a alíquota efetiva é o que importa
    return aliquotaEfetiva > 0 ? aliquotaEfetiva : 0;
}

// --- FUNÇÕES DE EXIBIÇÃO (DISPLAY) ---

const formatBRL = (val) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPerc = (val) => `${(val * 100).toFixed(2)}%`.replace('.', ',');

function exibirResultados(clt, pj) {
    const container = document.getElementById('resultado-container');
    const vencedor = clt.pacoteTotal > pj.pacoteTotal ? 'CLT' : 'PJ';
    
    const fgtsNota = clt.incluiuFGTS 
        ? `<span class="provento">(+ Incluído na comparação)</span>`
        : `<span class="desconto"> (Não incluído na comparação)</span>`;
    
    const provisaoTooltip = `Valor (19.44%) guardado para equiparar ao 13º e Férias + 1/3. Essencial para uma comparação justa.`;

    // HTML para CLT
    const cltHTML = `
        <div class="resultado-col clt ${vencedor === 'CLT' ? 'vencedor' : ''}">
            <h3><span class="cor-clt">■</span> Resumo Mensal CLT</h3>
            <ul>
                <li>Salário Bruto: <span>${formatBRL(clt.bruto)}</span></li>
                <li class="separador"></li>
                <li>(-) INSS: <span class="desconto">${formatBRL(clt.inss)}</span></li>
                <li>(-) IRRF: <span class="desconto">${formatBRL(clt.irrf)}</span></li>
                <li>(-) Outros Descontos: <span class="desconto">${formatBRL(clt.descontos)}</span></li>
                <li><strong>Salário Líquido (em conta):</strong> <span>${formatBRL(clt.liquido)}</span></li>
                <li class="separador"></li>
                <li>(+) Benefícios (VR+VA): <span class="provento">${formatBRL(clt.beneficios)}</span></li>
                <li>
                    <span>(+) Provisão (Férias+13º) <span class="info-tooltip" title="${provisaoTooltip}">?</span></span>
                    <span class="provento">${formatBRL(clt.provisaoFerias13)}</span>
                </li>
                <li>(+) FGTS (8%): <span>${formatBRL(clt.fgts)} ${fgtsNota}</span></li>
                <li class="final">"Pacote" Total CLT: <span>${formatBRL(clt.pacoteTotal)}</span></li>
            </ul>
        </div>
    `;

    // HTML para PJ (varia por regime)
    let pjHTML = '';
    
    if (pj.regime === 'Simples Nacional') {
        pjHTML = `
            <div class="resultado-col pj ${vencedor === 'PJ' ? 'vencedor' : ''}">
                <h3><span class="cor-pj">■</span> Resumo Mensal PJ (${pj.regime})</h3>
                <ul>
                    <li>Faturamento Bruto: <span>${formatBRL(pj.faturamento)}</span></li>
                    <li class="separador"></li>
                    <li>(-) Imposto Simples (${pj.anexoFinal.toUpperCase()}): <span class="desconto">${formatBRL(pj.imposto)}</span></li>
                    <li><span class="sub-label">Alíquota Efetiva: ${formatPerc(pj.aliquotaEfetiva)} (Fator R: ${formatPerc(pj.fatorR)})</span></li>
                    <li>(-) INSS (s/ Pró-Labore): <span class="desconto">${formatBRL(pj.inss)}</span></li>
                    <li><span class="sub-label">Pró-Labore: ${formatBRL(pj.prolaboreDefinido)} (${pj.notaOtimizacao})</span></li>
                    <li>(-) Custos (Contador, Outros): <span class="desconto">${formatBRL(pj.custosFixos)}</span></li>
                    <li class="final">Líquido Total PJ: <span>${formatBRL(pj.pacoteTotal)}</span></li>
                </ul>
            </div>
        `;
    } else if (pj.regime === 'MEI') {
        pjHTML = `
            <div class="resultado-col pj ${vencedor === 'PJ' ? 'vencedor' : ''}">
                <h3><span class="cor-pj">■</span> Resumo Mensal PJ (${pj.regime})</h3>
                <ul>
                    <li>Faturamento Bruto: <span>${formatBRL(pj.faturamento)}</span></li>
                    <li class="separador"></li>
                    <li>(-) Imposto Fixo (DAS-MEI): <span class="desconto">${formatBRL(pj.imposto)}</span></li>
                    <li>(-) Custos Fixos (Outros): <span class="desconto">${formatBRL(pj.custosFixos)}</span></li>
                    <li class="final">Líquido Total PJ: <span>${formatBRL(pj.pacoteTotal)}</span></li>
                </ul>
                ${pj.aviso ? `<small class="card-footer-note">${pj.aviso}</small>` : ''}
            </div>
        `;
    } else if (pj.regime === 'Manual') {
        pjHTML = `
            <div class="resultado-col pj ${vencedor === 'PJ' ? 'vencedor' : ''}">
                <h3><span class="cor-pj">■</span> Resumo Mensal PJ (${pj.regime})</h3>
                <ul>
                    <li>Faturamento Bruto: <span>${formatBRL(pj.faturamento)}</span></li>
                    <li class="separador"></li>
                    <li>(-) Imposto (${pj.taxaManual}%): <span class="desconto">${formatBRL(pj.imposto)}</span></li>
                    <li>(-) Custos Fixos: <span class="desconto">${formatBRL(pj.custosFixos)}</span></li>
                    <li class="final">Líquido Total PJ: <span>${formatBRL(pj.pacoteTotal)}</span></li>
                </ul>
            </div>
        `;
    }
    
    container.innerHTML = cltHTML + pjHTML;
}

function exibirResultadoAnual(clt, pj) {
    const container = document.getElementById('anual-container');
    if (!container) return; // Segurança

    const cltAnual = clt.pacoteTotal * 12;
    const pjAnual = pj.pacoteTotal * 12;
    const diferenca = Math.abs(cltAnual - pjAnual);
    
    let textoComparacao = '';
    if (pjAnual > cltAnual) {
        textoComparacao = `No cenário PJ, você teria uma renda anual <strong>${formatBRL(diferenca)}</strong> maior que no CLT.`;
    } else if (cltAnual > pjAnual) {
        textoComparacao = `No cenário CLT, seu "pacote" total anual seria <strong>${formatBRL(diferenca)}</strong> maior que o líquido PJ.`;
    } else {
        textoComparacao = `Os cenários se equivalem financeiramente ao longo do ano.`;
    }
    
    // Mostra o container (que estava oculto)
    container.style.display = 'block';

    container.innerHTML = `
        <h2>Comparação Anual</h2>
        <div class="anual-grid">
            <div class="anual-col clt">
                <h4>Pacote Total CLT (Ano)</h4>
                <div class="valor-anual">${formatBRL(cltAnual)}</div>
            </div>
            <div class="anual-col pj">
                <h4>Líquido Total PJ (Ano)</h4>
                <div class="valor-anual">${formatBRL(pjAnual)}</div>
            </div>
        </div>
        <p id="comparacao-anual-texto">
            ${textoComparacao}
        </Geral>
    `;
}