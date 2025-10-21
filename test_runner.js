// Este é o seu script de teste automatizado: test_runner.js
const fs = require('fs');
const {
    calcularPJ_Colaborador,
    // Você pode importar outras funções se precisar
} = require('./script.js');

console.log("Iniciando Testador Automatizado da Calculadora...\n");

/**
 * Gera todos os cenários de teste, incluindo os fixos e os automáticos.
 * @returns {Array<Object>} Um array de objetos de cenário
 */
function generateScenarios() {
    const scenarios = [];

    // 1. Testes Fixos (os que já validamos)
    scenarios.push(
        {
            descricao: "Teste Fixo 1: PJ 10k (Anexo III)",
            inputs: { faturamento: 10000, rbt12: 120000, anexo: 'iii', contabilidade: 100, outros: 0 },
            esperado: 866.98
        },
        {
            descricao: "Teste Fixo 2: PJ 10k (Fator R)",
            inputs: { faturamento: 10000, rbt12: 120000, anexo: 'v', contabilidade: 100, outros: 0 },
            esperado: 1012.74
        },
        {
            descricao: "Teste Fixo 3: PJ 100k (Anexo III)",
            inputs: { faturamento: 100000, rbt12: 1200000, anexo: 'iii', contabilidade: 100, outros: 0 },
            esperado: 13296.98
        },
        {
            descricao: "Teste Fixo 4: PJ 100k (Fator R)",
            inputs: { faturamento: 100000, rbt12: 1200000, anexo: 'v', contabilidade: 100, outros: 0 },
            esperado: 20567.65 
        }
    );

    // --- Testes Gerados Automaticamente ---

    // 2. Loop de Faturamento (de 2k a 400k)
    const faturamentoSteps = [
        ...Array.from({ length: 18 }, (_, i) => 2000 + i * 1000), // 2k a 19k (steps de 1k)
        ...Array.from({ length: 191 }, (_, i) => 20000 + i * 2000) // 20k a 400k (steps de 2k)
    ];
    const anexoTypes = ['iii', 'v']; // Anexo III Direto vs Fator R
    const outrosCustosSteps = [0, 500, 1500]; // Variação de custos

    for (const fat of faturamentoSteps) {
        for (const anexo of anexoTypes) {
            for (const custos of outrosCustosSteps) {
                scenarios.push({
                    descricao: `Gen: Fat ${fat} | Anexo ${anexo} | Custos ${custos}`,
                    inputs: {
                        faturamento: fat,
                        rbt12: fat * 12, // Usa a lógica de fallback
                        anexo: anexo,
                        contabilidade: 100, // Fixo
                        outros: custos
                    },
                    esperado: 0 // 0 = Apenas logar o resultado, não validar
                });
            }
        }
    }

    // 3. Testes Específicos de RBT12
    scenarios.push(
        {
            descricao: "Especial: Fat 30k | RBT12 Baixo (Fator R)",
            inputs: { faturamento: 30000, rbt12: 50000, anexo: 'v', contabilidade: 100, outros: 0 },
            esperado: 0
        },
        {
            descricao: "Especial: Fat 30k | RBT12 Baixo (Anexo III)",
            inputs: { faturamento: 30000, rbt12: 50000, anexo: 'iii', contabilidade: 100, outros: 0 },
            esperado: 0
        }
    );
    
    return scenarios;
}

// --- Roda os testes e gera o Log ---
const logLines = [];
const csvData = [];
const cenariosPJ = generateScenarios();
const totalTestes = cenariosPJ.length;

console.log(`Gerando log para ${totalTestes} cenários...`);

// Adiciona o Cabeçalho do CSV
csvData.push([
    "descricao", "faturamento", "rbt12_input", "anexo_input", 
    "outros_custos_input", "custos_calculado", "liquido_calculado", "status"
]);

cenariosPJ.forEach(cenario => {
    // *** AQUI ELE CHAMA SUA FUNÇÃO REAL ***
    const resultado = calcularPJ_Colaborador(cenario.inputs);
    
    const totalCustosCalculado = parseFloat(resultado.totalImpostos.toFixed(2));
    const totalCustosEsperado = parseFloat(cenario.esperado.toFixed(2));
    const liquidoCalculado = parseFloat(resultado.valorFinal.toFixed(2));
    
    let status = '';
    let statusCsv = '';

    if (cenario.esperado === 0) {
        status = `[LOG] - Custos: ${totalCustosCalculado} | Líquido: ${liquidoCalculado}`;
        statusCsv = 'LOG';
    } else if (totalCustosCalculado === totalCustosEsperado) {
        status = `[PASS] - Esperado: ${totalCustosEsperado} | Calculado: ${totalCustosCalculado}`;
        statusCsv = 'PASS';
    } else {
        status = `[FAIL] - Esperado: ${totalCustosEsperado} | Calculado: ${totalCustosCalculado}`;
        statusCsv = 'FAIL';
    }
    
    const logEntry = `${cenario.descricao.padEnd(45)} | ${status}`;
    console.log(logEntry);
    logLines.push(logEntry);

    // Adiciona dados para o CSV
    csvData.push([
        cenario.descricao,
        cenario.inputs.faturamento,
        cenario.inputs.rbt12,
        cenario.inputs.anexo,
        cenario.inputs.outros,
        totalCustosCalculado,
        liquidoCalculado,
        statusCsv
    ]);
});

// Salva o log em um arquivo de texto
fs.writeFileSync('log_de_testes_massivo.txt', 
    `Log de Testes Automatizados - ${totalTestes} cenários\n` +
    "=".repeat(60) + "\n" +
    logLines.join('\n')
);

// Salva os resultados em um CSV para análise
// (Converte o array de arrays para uma string CSV)
const csvContent = csvData.map(row => row.join(',')).join('\n');
fs.writeFileSync('resultados_testes_massivos.csv', csvContent);

console.log(`\n--- Testes Concluídos! (${totalTestes} testes) ---`);
console.log("Log de texto salvo em 'log_de_testes_massivo.txt'");
console.log("Resultados detalhados salvos em 'resultados_testes_massivos.csv'");