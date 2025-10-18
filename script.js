// Aguarda o DOM carregar para adicionar o evento
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-calcular').addEventListener('click', calcularTudo);
});

// FUNÇÃO PRINCIPAL
function calcularTudo() {
    // 1. Obter todos os inputs
    const inputs = {
        // CLT
        cltBruto: parseFloat(document.getElementById('clt-bruto').value) || 0,
        cltVR: parseFloat(document.getElementById('clt-vr').value) || 0,
        cltVA: parseFloat(document.getElementById('clt-va').value) || 0,
        cltSaude: parseFloat(document.getElementById('clt-saude').value) || 0,
        cltDependentes: parseInt(document.getElementById('clt-dependentes').value) || 0,
        cltIncluirFGTS: document.getElementById('clt-incluir-fgts').checked, // NOVO
        
        // PJ
        pjFaturamento: parseFloat(document.getElementById('pj-faturamento').value) || 0,
        pjAnexo: document.getElementById('pj-anexo').value,
        pjProlabore: parseFloat(document.getElementById('pj-prolabore').value) || 0,
        pjContabilidade: parseFloat(document.getElementById('pj-contabilidade').value) || 0,
        pjOutros: parseFloat(document.getElementById('pj-outros').value) || 0,
    };

    // 2. Calcular os dois cenários
    const resultadoCLT = calcularCLT(inputs);
    const resultadoPJ = calcularPJ(inputs);

    // 3. Exibir os resultados na tela
    exibirResultados(resultadoCLT, resultadoPJ);
    exibirResultadoAnual(resultadoCLT, resultadoPJ);
}


// --- CÁLCULOS CLT ---
function calcularCLT(inputs) {
    const { cltBruto, cltVR, cltVA, cltSaude, cltDependentes, cltIncluirFGTS } = inputs;
    
    // Tabela INSS 2025 (Exemplo - VERIFIQUE OS VALORES ATUAIS)
    const inss = calcularINSS(cltBruto);
    
    // Tabela IRRF 2025 (Exemplo - VERIFIQUE OS VALORES ATUAIS)
    const baseIRRF = cltBruto - inss - (cltDependentes * 22.75); // Valor de dependente fictício
    const irrf = calcularIRRF(baseIRRF);
    
    // Benefícios (proventos)
    const vrTotal = cltVR * 22; // 22 dias úteis
    const vaTotal = cltVA;
    const fgts = cltBruto * 0.08;
    // Provisão de 1/12 de férias + 1/3 sobre férias + 1/12 de 13º
    const provisaoFerias13 = cltBruto * (1/12) + (cltBruto * (1/12) / 3) + (cltBruto / 12);
    
    // Descontos
    const descontosBeneficios = cltSaude; // Adicionar VT se houver
    
    const salarioLiquido = cltBruto - inss - irrf - descontosBeneficios;
    
    // "Pacote" Total que o funcionário recebe (líquido + benefícios)
    let pacoteBase = salarioLiquido + vrTotal + vaTotal + provisaoFerias13;
    let pacoteTotalCLT = cltIncluirFGTS ? pacoteBase + fgts : pacoteBase;

    return {
        bruto: cltBruto,
        inss: inss,
        irrf: irrf,
        descontos: descontosBeneficios,
        beneficios: vrTotal + vaTotal,
        fgts: fgts,
        provisaoFerias13: provisaoFerias13,
        liquido: salarioLiquido,
        pacoteTotal: pacoteTotalCLT,
        incluiuFGTS: cltIncluirFGTS // Retorna a decisão
    };
}

// --- CÁLCULOS PJ ---
function calcularPJ(inputs) {
    const { pjFaturamento, pjAnexo, pjProlabore, pjContabilidade, pjOutros } = inputs;

    // Fator R
    let anexoCalculado = pjAnexo;
    let fatorR = 0;
    if (pjFaturamento > 0 && pjAnexo === 'v') {
        fatorR = pjProlabore / pjFaturamento;
        if (fatorR >= 0.28) {
            anexoCalculado = 'iii'; // Caiu no Anexo III pelo Fator R
        }
    }
    
    // Imposto Simples Nacional (Exemplo - Alíquota inicial. O ideal é usar a tabela completa)
    // *** ATENÇÃO: Este é um cálculo SIMPLIFICADO. O cálculo real é complexo (alíquota efetiva). ***
    let aliquotaSimples = 0;
    if (anexoCalculado === 'iii') {
        aliquotaSimples = 0.06; // 6% (Anexo III, faixa 1)
    } else {
        aliquotaSimples = 0.155; // 15.5% (Anexo V, faixa 1)
    }
    const impostoSimples = pjFaturamento * aliquotaSimples;
    
    // INSS sobre o Pró-Labore (11%)
    const inssProlabore = pjProlabore * 0.11;
    
    // Custos Totais
    const custosTotais = impostoSimples + inssProlabore + pjContabilidade + pjOutros;
    
    // Líquido PJ
    const liquidoPJ = pjFaturamento - custosTotais;
    
    return {
        faturamento: pjFaturamento,
        anexoFinal: anexoCalculado,
        fatorR: fatorR,
        impostoSimples: impostoSimples,
        inssProlabore: inssProlabore,
        custosFixos: pjContabilidade + pjOutros,
        liquido: liquidoPJ,
        pacoteTotal: liquidoPJ // No PJ, o líquido é o pacote total
    };
}


// --- Funções Auxiliares de Cálculo (NECESSÁRIO ATUALIZAR ANUALMENTE) ---
function calcularINSS(salario) {
    // Tabela 2024/2025 (EXEMPLO)
    // Estas faixas são progressivas! O cálculo correto é mais complexo.
    // Para simplificar a V1, usaremos alíquotas fixas (ERRADO, mas fácil de implementar)
    // O CORRETO é (salario - teto_faixa_anterior) * aliquota + imposto_faixa_anterior
    // Vou manter o cálculo progressivo simplificado da V1:
    if (salario <= 1412.00) return salario * 0.075;
    if (salario <= 2666.68) return (salario - 1412.00) * 0.09 + (1412.00 * 0.075);
    if (salario <= 4000.03) return (salario - 2666.68) * 0.12 + (2666.68 - 1412.00) * 0.09 + (1412.00 * 0.075);
    if (salario <= 7786.02) return (salario - 4000.03) * 0.14 + (4000.03 - 2666.68) * 0.12 + (2666.68 - 1412.00) * 0.09 + (1412.00 * 0.075);
    return 908.85; // Teto (EXEMPLO)
}

function calcularIRRF(base) {
    // Tabela 2024/2025 (EXEMPLO)
    if (base <= 2259.20) return 0;
    if (base <= 2826.65) return (base * 0.075) - 169.44;
    if (base <= 3751.05) return (base * 0.15) - 381.44;
    if (base <= 4664.68) return (base * 0.225) - 662.77;
    return (base * 0.275) - 896.00;
}


// --- FUNÇÃO PARA EXIBIR O RESULTADO MENSAL ---
function exibirResultados(clt, pj) {
    const container = document.getElementById('resultado-container');
    const formatBRL = (val) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const vencedor = clt.pacoteTotal > pj.pacoteTotal ? 'CLT' : 'PJ';
    
    // Nota sobre o FGTS
    const fgtsNota = clt.incluiuFGTS 
        ? `<span class="provento">(+ Incluído na comparação)</span>`
        : `<span class="desconto"> (Não incluído na comparação)</span>`;

    container.innerHTML = `
        <div class="resultado-col ${vencedor === 'CLT' ? 'vencedor' : ''}">
            <h3>👨‍💼 Resumo Mensal CLT</h3>
            <ul>
                <li>Salário Bruto: <span>${formatBRL(clt.bruto)}</span></li>
                <li>(-) INSS: <span class="desconto">${formatBRL(clt.inss)}</span></li>
                <li>(-) IRRF: <span class="desconto">${formatBRL(clt.irrf)}</span></li>
                <li>(-) Descontos (Saúde, etc): <span class="desconto">${formatBRL(clt.descontos)}</span></li>
                <li><strong>Salário Líquido (em conta):</strong> <span>${formatBRL(clt.liquido)}</span></li>
                <li class="separador"></li>
                <li>(+) Benefícios (VR+VA): <span class="provento">${formatBRL(clt.beneficios)}</span></li>
                <li>(+) Provisão (Férias+13º): <span class="provento">${formatBRL(clt.provisaoFerias13)}</span></li>
                <li>(+) FGTS (8%): <span>${formatBRL(clt.fgts)} ${fgtsNota}</span></li>
                <li class="final">"Pacote" Total CLT: <span>${formatBRL(clt.pacoteTotal)}</span></li>
            </ul>
        </div>
        
        <div class="resultado-col ${vencedor === 'PJ' ? 'vencedor' : ''}">
            <h3>🚀 Resumo Mensal PJ</h3>
            <ul>
                <li>Faturamento Bruto: <span>${formatBRL(pj.faturamento)}</span></li>
                <li>(-) Imposto Simples (${pj.anexoFinal.toUpperCase()}): <span class="desconto">${formatBRL(pj.impostoSimples)}</span></li>
                <li>(-) INSS (Pró-Labore): <span class="desconto">${formatBRL(pj.inssProlabore)}</span></li>
                <li>(-) Custos (Contador, Outros): <span class="desconto">${formatBRL(pj.custosFixos)}</span></li>
                <li class="final">Líquido Total PJ: <span>${formatBRL(pj.liquido)}</span></li>
            </ul>
            <small class="sub-label">Fator R (se aplicável): ${(pj.fatorR * 100).toFixed(1)}%</small>
        </div>
    `;
}

// --- FUNÇÃO PARA EXIBIR O RESULTADO ANUAL (NOVA) ---
function exibirResultadoAnual(clt, pj) {
    const container = document.getElementById('anual-container');
    if (!container) return; // Segurança

    const formatBRL = (val) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
            <div class="anual-col">
                <h4>Pacote Total CLT (Ano)</h4>
                <div class="valor-anual">${formatBRL(cltAnual)}</div>
            </div>
            <div class="anual-col">
                <h4>Líquido Total PJ (Ano)</h4>
                <div class="valor-anual">${formatBRL(pjAnual)}</div>
            </div>
        </div>
        <p id="comparacao-anual-texto">
            ${textoComparacao}
        </p>
    `;
}