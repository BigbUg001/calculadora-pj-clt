// test_validacao.js
const fs = require('fs');
const { parse } = require('csv-parse/sync'); 

// Importa as funções "unidade" do seu script
const {
    calcularINSS_Progressivo,
    calcularIRRF_Preciso,
    calcularAliquotaEfetiva,
    calcularIRRF_PelaTabela, // Usada no Pró-labore
    ANEXO_III,
    ANEXO_V,
    TETO_INSS
} = require('./script.js');

let falhas = 0;

// Helper para formatar e comparar
const f = (num) => parseFloat(num.toFixed(2));
const log = (pass, msg) => {
    if (pass) {
        console.log(`  [PASS] ${msg}`);
    } else {
        console.log(`  [FAIL] ${msg}`);
        falhas++;
    }
};

console.log('--- Iniciando Teste de Validação Tributária ---');

// --- 1. Testando CLT: INSS Progressivo ---
try {
    console.log('\n[TESTE 1] Validando: calcularINSS_Progressivo (CLT)');
    const gabarito = parse(fs.readFileSync('gabarito_clt_inss.csv'), { columns: true });
    for (const linha of gabarito) {
        const salario = parseFloat(linha.salario_bruto);
        const esperado = f(parseFloat(linha.inss_esperado));
        const calculado = f(calcularINSS_Progressivo(salario));
        log(calculado === esperado, `Salário R$ ${salario.toFixed(2)} -> INSS Esperado: ${esperado.toFixed(2)} | Calculado: ${calculado.toFixed(2)}`);
    }
} catch (e) { log(false, `Erro ao ler gabarito_clt_inss.csv: ${e.message}`); }

// --- 2. Testando CLT: IRRF (Simplificado vs Padrão) ---
try {
    console.log('\n[TESTE 2] Validando: calcularIRRF_Preciso (CLT)');
    const gabarito = parse(fs.readFileSync('gabarito_clt_irrf.csv'), { columns: true });
    for (const linha of gabarito) {
        const bruto = parseFloat(linha.bruto);
        const dependentes = parseFloat(linha.dependentes);
        const outrosDescontos = parseFloat(linha.outros_descontos);
        const inss = parseFloat(linha.inss_calculado); // Usa o INSS pré-calculado
        const esperado = f(parseFloat(linha.irrf_esperado));
        const calculado = f(calcularIRRF_Preciso(bruto, inss, dependentes, outrosDescontos));
        log(calculado === esperado, `Bruto R$ ${bruto.toFixed(2)} (Dep: ${dependentes}) -> IRRF Esperado: ${esperado.toFixed(2)} | Calculado: ${calculado.toFixed(2)}`);
    }
} catch (e) { log(false, `Erro ao ler gabarito_clt_irrf.csv: ${e.message}`); }

// --- 3. Testando PJ: Alíquota Anexo III ---
try {
    console.log('\n[TESTE 3] Validando: calcularAliquotaEfetiva (Anexo III)');
    const gabarito = parse(fs.readFileSync('gabarito_pj_anexo_iii.csv'), { columns: true });
    for (const linha of gabarito) {
        const rbt12 = parseFloat(linha.rbt12);
        const esperado = f(parseFloat(linha.aliquota_efetiva_esperada_perc));
        const calculado = f(calcularAliquotaEfetiva(rbt12, ANEXO_III) * 100); // Converte para %
        log(calculado === esperado, `RBT12 R$ ${rbt12.toFixed(2)} -> Alíquota Esperada: ${esperado.toFixed(2)}% | Calculada: ${calculado.toFixed(2)}%`);
    }
} catch (e) { log(false, `Erro ao ler gabarito_pj_anexo_iii.csv: ${e.message}`); }

// --- 4. Testando PJ: Alíquota Anexo V ---
try {
    console.log('\n[TESTE 4] Validando: calcularAliquotaEfetiva (Anexo V)');
    const gabarito = parse(fs.readFileSync('gabarito_pj_anexo_v.csv'), { columns: true });
    for (const linha of gabarito) {
        const rbt12 = parseFloat(linha.rbt12);
        const esperado = f(parseFloat(linha.aliquota_efetiva_esperada_perc));
        const calculado = f(calcularAliquotaEfetiva(rbt12, ANEXO_V) * 100); // Converte para %
        log(calculado === esperado, `RBT12 R$ ${rbt12.toFixed(2)} -> Alíquota Esperada: ${esperado.toFixed(2)}% | Calculada: ${calculado.toFixed(2)}%`);
    }
} catch (e) { log(false, `Erro ao ler gabarito_pj_anexo_v.csv: ${e.message}`); }

// --- 5. Testando PJ: Impostos sobre Pró-labore ---
try {
    console.log('\n[TESTE 5] Validando: Lógica de Pró-labore (INSS 11% e IRRF)');
    const gabarito = parse(fs.readFileSync('gabarito_pj_prolabore.csv'), { columns: true });
    for (const linha of gabarito) {
        const prolabore = parseFloat(linha.prolabore_bruto);
        const esperado_inss = f(parseFloat(linha.inss_prolabore_esperado));
        const esperado_irrf = f(parseFloat(linha.irrf_prolabore_esperado));
        
        // Simula a lógica do seu script
        const inss_calculado = f(Math.min(prolabore * 0.11, 0.11 * TETO_INSS));
        const base_irrf = prolabore - inss_calculado;
        const irrf_calculado = f(calcularIRRF_PelaTabela(base_irrf)); // Usa a função de IRRF mais simples
        
        log(inss_calculado === esperado_inss, `Pró-labore R$ ${prolabore.toFixed(2)} -> INSS Esperado: ${esperado_inss.toFixed(2)} | Calculado: ${inss_calculado.toFixed(2)}`);
        log(irrf_calculado === esperado_irrf, `Pró-labore R$ ${prolabore.toFixed(2)} -> IRRF Esperado: ${esperado_irrf.toFixed(2)} | Calculado: ${irrf_calculado.toFixed(2)}`);
    }
} catch (e) { log(false, `Erro ao ler gabarito_pj_prolabore.csv: ${e.message}`); }


console.log('\n--- Validação Concluída ---');
if (falhas > 0) {
    console.error(`\nATENÇÃO: ${falhas} falha(s) detectada(s). A lógica tributária está inconsistente!`);
} else {
    console.log('\nSUCESSO: Todos os testes de validação tributária passaram.');
}