/* --- Bloco: Helper de Performance (Debounce) --- */
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
    console.log("Iniciando animadores..."); // LOG 1
    const options = { duration: 0.8, useEasing: true, decimal: ',', separator: '.', prefix: 'R$ ' };
    const animadoresConfig = {
        'res-total-rescisao': options,
        'res-total-proventos': { ...options, prefix: '+R$ ' }, // Provento
        'res-total-descontos': { ...options, prefix: '-R$ ' } // Desconto
    };
    try {
        let countUpLoaded = typeof countUp !== 'undefined';
        console.log("CountUp está carregado?", countUpLoaded); // LOG 2
        if (!countUpLoaded) {
            console.error("ERRO CRÍTICO: Biblioteca CountUp.js não carregou a tempo!");
            return; // Impede a continuação se a biblioteca não estiver pronta
        }

        for (const id in animadoresConfig) {
            const el = document.getElementById(id);
            if (el) {
                animadores[id] = new countUp.CountUp(el, 0, animadoresConfig[id]);
                if (!animadores[id].error) {
                    animadores[id].start();
                    console.log(`Animador para #${id} iniciado.`); // LOG 3
                } else {
                     console.error(`Erro ao criar animador para #${id}:`, animadores[id].error);
                }
            } else console.warn(`Elemento #${id} não encontrado.`);
        }
    } catch(e) { console.error("Erro fatal no initAnimadores:", e); }
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
const DESCONTO_SIMPLIFICADO_IRRF = 607.20;

const formatadorBRL_instancia = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatBRL = (val) => formatadorBRL_instancia.format(val || 0);
const getFloat = (id) => parseFloat(document.getElementById(id).value) || 0;
const getString = (id) => document.getElementById(id).value || '';
const getChecked = (id) => document.getElementById(id).checked;

/* --- Bloco: Helpers Seguros de UI (Reutilizados) --- */
function criarTaxItem(nome, valor, tipo = 'desconto') {
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
    if (salario <= 0 || isNaN(salario)) return 0; // Adicionado verificação NaN
    let salarioCalculo = Math.min(salario, TETO_INSS); // Aplica teto
    for (const faixa of FAIXAS_INSS) {
        if (salarioCalculo <= faixa.teto) {
            return Math.max(0, (salarioCalculo * faixa.aliquota) - faixa.deduzir);
        }
    }
    return INSS_TETO; 
}

function calcularIRRF_PelaTabela(base) { 
    if (base <= 0 || isNaN(base)) return 0; // Adicionado verificação NaN
    for (const faixa of FAIXAS_IRRF) {
        if (base <= faixa.limite) {
            return Math.max(0, (base * faixa.aliquota) - faixa.deducao);
        }
    }
    const ultimaFaixa = FAIXAS_IRRF[FAIXAS_IRRF.length - 1];
    return Math.max(0, (base * ultimaFaixa.aliquota) - ultimaFaixa.deducao);
}
/* --- Fim Funções Auxiliares --- */


/* --- Bloco: O MOTOR DA RESCISÃO --- */

function calcularRescisao() {
    console.log("Iniciando calcularRescisao..."); // LOG 4
    // 1. Coletar Inputs
    const salarioBruto = getFloat('salario-bruto');
    const tipoRescisao = getString('tipo-rescisao');
    const tipoAviso = getString('aviso-previo');
    const dataAdmissaoStr = getString('data-admissao');
    const dataDemissaoStr = getString('data-demissao');
    const saldoFGTS = getFloat('saldo-fgts');
    const temFeriasVencidas = getChecked('ferias-vencidas');

    let verbas = [];
    let descontos = [];
    let totalProventos = 0;
    let totalDescontos = 0;

    // Se os dados essenciais não estiverem preenchidos, retorna zerado
    if (!salarioBruto || !dataAdmissaoStr || !dataDemissaoStr) {
        console.warn("Dados essenciais ausentes."); // LOG 5
        return { liquidoFinal: 0, brutoTotal: 0, descontosTotal: 0, detalhes: [] };
    }

    // 2. Calcular Datas e Tempo de Trabalho
    const dataAdmissao = new Date(dataAdmissaoStr + 'T00:00:00'); // Fuso horário
    const dataDemissao = new Date(dataDemissaoStr + 'T00:00:00'); // Fuso horário

    // *** NOVA VALIDAÇÃO DE DATAS ***
    if (isNaN(dataAdmissao.getTime()) || isNaN(dataDemissao.getTime())) {
        console.error("Datas inválidas inseridas."); // LOG 6
        return { liquidoFinal: 0, brutoTotal: 0, descontosTotal: 0, detalhes: [{nome: "Erro: Verifique as datas", valor: 0, tipo: 'info'}] };
    }
    if (dataDemissao < dataAdmissao) {
         console.error("Data de demissão anterior à admissão."); // LOG 7
        return { liquidoFinal: 0, brutoTotal: 0, descontosTotal: 0, detalhes: [{nome: "Erro: Demissão antes da admissão", valor: 0, tipo: 'info'}] };
    }
    // *** FIM DA VALIDAÇÃO ***

    const diffTime = dataDemissao.getTime() - dataAdmissao.getTime(); // Use getTime() para segurança
    const diasDeTrabalho = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1); // Garante pelo menos 1 dia
    const mesesDeTrabalho = Math.ceil(diasDeTrabalho / (365.25 / 12));
    const anosDeTrabalho = Math.floor(diasDeTrabalho / 365.25);
    console.log(`Dias: ${diasDeTrabalho}, Meses: ${mesesDeTrabalho}, Anos: ${anosDeTrabalho}`); // LOG 8
    
    // 3. Lógica por Tipo de Rescisão (O código interno dos IFs permanece o mesmo)
    // ... (todo o código dos cenários sem_justa_causa, pedido_demissao, etc., vai aqui)...
     // ------------------------------------
    // Cenário 1: DEMISSÃO SEM JUSTA CAUSA
    // ------------------------------------
    if (tipoRescisao === 'sem_justa_causa') {
        // --- Verbas (Proventos) ---
        // Saldo de Salário
        const diasTrabalhadosMes = dataDemissao.getDate();
        const saldoSalario = (salarioBruto / 30) * diasTrabalhadosMes;
        verbas.push({ nome: `Saldo de Salário (${diasTrabalhadosMes} dias)`, valor: saldoSalario, tipo: 'provento' });
        totalProventos += saldoSalario;

        // Aviso Prévio Indenizado (se não for trabalhado)
        if (tipoAviso === 'indenizado') {
            // Regra do aviso prévio proporcional: 30 dias + 3 dias por ano (limitado a 90 dias total)
            const diasAvisoPrevio = Math.min(90, 30 + (Math.max(0, anosDeTrabalho) * 3));
            const valorAvisoPrevio = (salarioBruto / 30) * diasAvisoPrevio;
            verbas.push({ nome: `Aviso Prévio Indenizado (${diasAvisoPrevio} dias)`, valor: valorAvisoPrevio, tipo: 'provento' });
            totalProventos += valorAvisoPrevio;
        }

        // 13º Salário Proporcional
        const mesesTrabalhadosAno = dataDemissao.getMonth() + 1; // 0 (Jan) a 11 (Dez)
        const decimoTerceiro = (salarioBruto / 12) * mesesTrabalhadosAno;
        verbas.push({ nome: `13º Proporcional (${mesesTrabalhadosAno}/12 avos)`, valor: decimoTerceiro, tipo: 'provento' });
        totalProventos += decimoTerceiro;

        // Férias Vencidas + 1/3 (se houver)
        if (temFeriasVencidas) {
            const feriasVencidas = salarioBruto;
            const umTercoVencidas = feriasVencidas / 3;
            verbas.push({ nome: "Férias Vencidas", valor: feriasVencidas, tipo: 'provento' });
            verbas.push({ nome: "1/3 sobre Férias Vencidas", valor: umTercoVencidas, tipo: 'provento' });
            totalProventos += feriasVencidas + umTercoVencidas;
        }

        // Férias Proporcionais + 1/3
        const mesesPeriodoAquisitivo = mesesDeTrabalho % 12; // Quantos meses do período atual
        if (mesesPeriodoAquisitivo > 0) {
            const feriasProporcionais = (salarioBruto / 12) * mesesPeriodoAquisitivo;
            const umTercoProporcionais = feriasProporcionais / 3;
            verbas.push({ nome: `Férias Proporcionais (${mesesPeriodoAquisitivo}/12 avos)`, valor: feriasProporcionais, tipo: 'provento' });
            verbas.push({ nome: "1/3 sobre Férias Proporcionais", valor: umTercoProporcionais, tipo: 'provento' });
            totalProventos += feriasProporcionais + umTercoProporcionais;
        }

        // --- Descontos ---
        // INSS (incide sobre Saldo de Salário e 13º)
        const baseINSS = saldoSalario + decimoTerceiro;
        const inss = calcularINSS_Progressivo(baseINSS);
        descontos.push({ nome: "INSS (sobre Saldo e 13º)", valor: inss, tipo: 'desconto' });
        totalDescontos += inss;

        // IRRF (incide sobre Saldo de Salário e 13º, separadamente)
        const baseIRRF_Salario = saldoSalario - calcularINSS_Progressivo(saldoSalario);
        const irrf_Salario = calcularIRRF_PelaTabela(baseIRRF_Salario);
        const baseIRRF_13 = decimoTerceiro - calcularINSS_Progressivo(decimoTerceiro);
        const irrf_13 = calcularIRRF_PelaTabela(baseIRRF_13);
        const irrf = irrf_Salario + irrf_13;
        if (irrf > 0) {
            descontos.push({ nome: "IRRF (sobre Saldo e 13º)", valor: irrf, tipo: 'desconto' });
            totalDescontos += irrf;
        }
        
        // --- Outros Direitos (Não entram no líquido, mas são importantes) ---
        // Multa de 40% sobre FGTS
        const multaFGTS = saldoFGTS * 0.40;
        verbas.push({ nome: "Multa 40% FGTS (pago pela empresa)", valor: multaFGTS, tipo: 'info' }); // 'info' para não somar no líquido

        // Saque FGTS (Saldo + Multa)
        verbas.push({ nome: "Direito a Saque FGTS (Saldo + Multa)", valor: saldoFGTS + multaFGTS, tipo: 'info' });
        // Seguro Desemprego
        verbas.push({ nome: "Direito a Seguro-Desemprego", valor: 0, tipo: 'info' });
    }
    
    // ------------------------------------
    // Cenário 2: PEDIDO DE DEMISSÃO
    // ------------------------------------
    else if (tipoRescisao === 'pedido_demissao') {
        // --- Verbas (Proventos) ---
        // Saldo de Salário
        const diasTrabalhadosMes = dataDemissao.getDate();
        const saldoSalario = (salarioBruto / 30) * diasTrabalhadosMes;
        verbas.push({ nome: `Saldo de Salário (${diasTrabalhadosMes} dias)`, valor: saldoSalario, tipo: 'provento' });
        totalProventos += saldoSalario;

        // 13º Salário Proporcional
        const mesesTrabalhadosAno = dataDemissao.getMonth() + 1;
        const decimoTerceiro = (salarioBruto / 12) * mesesTrabalhadosAno;
        verbas.push({ nome: `13º Proporcional (${mesesTrabalhadosAno}/12 avos)`, valor: decimoTerceiro, tipo: 'provento' });
        totalProventos += decimoTerceiro;

        // Férias Vencidas + 1/3 (se houver)
        if (temFeriasVencidas) {
            const feriasVencidas = salarioBruto;
            const umTercoVencidas = feriasVencidas / 3;
            verbas.push({ nome: "Férias Vencidas", valor: feriasVencidas, tipo: 'provento' });
            verbas.push({ nome: "1/3 sobre Férias Vencidas", valor: umTercoVencidas, tipo: 'provento' });
            totalProventos += feriasVencidas + umTercoVencidas;
        }

        // Férias Proporcionais + 1/3
        const mesesPeriodoAquisitivo = mesesDeTrabalho % 12;
        if (mesesPeriodoAquisitivo > 0) {
            const feriasProporcionais = (salarioBruto / 12) * mesesPeriodoAquisitivo;
            const umTercoProporcionais = feriasProporcionais / 3;
            verbas.push({ nome: `Férias Proporcionais (${mesesPeriodoAquisitivo}/12 avos)`, valor: feriasProporcionais, tipo: 'provento' });
            verbas.push({ nome: "1/3 sobre Férias Proporcionais", valor: umTercoProporcionais, tipo: 'provento' });
            totalProventos += feriasProporcionais + umTercoProporcionais;
        }

        // --- Descontos ---
        // INSS (incide sobre Saldo de Salário e 13º)
        const baseINSS = saldoSalario + decimoTerceiro;
        const inss = calcularINSS_Progressivo(baseINSS);
        descontos.push({ nome: "INSS (sobre Saldo e 13º)", valor: inss, tipo: 'desconto' });
        totalDescontos += inss;

        // IRRF (mesma lógica)
        const baseIRRF_Salario = saldoSalario - calcularINSS_Progressivo(saldoSalario);
        const irrf_Salario = calcularIRRF_PelaTabela(baseIRRF_Salario);
        const baseIRRF_13 = decimoTerceiro - calcularINSS_Progressivo(decimoTerceiro);
        const irrf_13 = calcularIRRF_PelaTabela(baseIRRF_13);
        const irrf = irrf_Salario + irrf_13;
        if (irrf > 0) {
            descontos.push({ nome: "IRRF (sobre Saldo e 13º)", valor: irrf, tipo: 'desconto' });
            totalDescontos += irrf;
        }

        // Desconto do Aviso Prévio (se não for trabalhado/cumprido)
        if (tipoAviso === 'dispensado') {
            descontos.push({ nome: "Aviso Prévio (não cumprido)", valor: salarioBruto, tipo: 'desconto' });
            totalDescontos += salarioBruto;
        }
        
        // --- Outros Direitos (Não tem) ---
        verbas.push({ nome: "Não tem direito a Saque FGTS", valor: 0, tipo: 'info' });
        verbas.push({ nome: "Não tem direito a Multa FGTS", valor: 0, tipo: 'info' });
        verbas.push({ nome: "Não tem direito a Seguro-Desemprego", valor: 0, tipo: 'info' });
    }

    // ------------------------------------
    // Cenário 3: DEMISSÃO COM JUSTA CAUSA
    // ------------------------------------
    else if (tipoRescisao === 'justa_causa') {
        // --- Verbas (Proventos) ---
        // Saldo de Salário
        const diasTrabalhadosMes = dataDemissao.getDate();
        const saldoSalario = (salarioBruto / 30) * diasTrabalhadosMes;
        verbas.push({ nome: `Saldo de Salário (${diasTrabalhadosMes} dias)`, valor: saldoSalario, tipo: 'provento' });
        totalProventos += saldoSalario;

        // Férias Vencidas + 1/3 (se houver) - ÚNICO OUTRO DIREITO
        if (temFeriasVencidas) {
            const feriasVencidas = salarioBruto;
            const umTercoVencidas = feriasVencidas / 3;
            verbas.push({ nome: "Férias Vencidas", valor: feriasVencidas, tipo: 'provento' });
            verbas.push({ nome: "1/3 sobre Férias Vencidas", valor: umTercoVencidas, tipo: 'provento' });
            totalProventos += feriasVencidas + umTercoVencidas;
        }

        // --- Descontos ---
        // INSS (incide apenas sobre o Saldo de Salário)
        const inss = calcularINSS_Progressivo(saldoSalario);
        descontos.push({ nome: "INSS (sobre Saldo de Salário)", valor: inss, tipo: 'desconto' });
        totalDescontos += inss;
        
        // IRRF (incide apenas sobre o Saldo de Salário)
        const irrf = calcularIRRF_PelaTabela(saldoSalario - inss);
         if (irrf > 0) {
            descontos.push({ nome: "IRRF (sobre Saldo de Salário)", valor: irrf, tipo: 'desconto' });
            totalDescontos += irrf;
        }
        
        // --- Outros Direitos (Não tem) ---
        verbas.push({ nome: "Não tem direito a Aviso Prévio", valor: 0, tipo: 'info' });
        verbas.push({ nome: "Não tem direito a 13º Proporcional", valor: 0, tipo: 'info' });
        verbas.push({ nome: "Não tem direito a Férias Proporcionais", valor: 0, tipo: 'info' });
        verbas.push({ nome: "Não tem direito a Saque/Multa FGTS", valor: 0, tipo: 'info' });
        verbas.push({ nome: "Não tem direito a Seguro-Desemprego", valor: 0, tipo: 'info' });
    }
    
    // ------------------------------------
    // Cenário 4: ACORDO MÚTUO
    // ------------------------------------
    else if (tipoRescisao === 'acordo_mutuo') {
        // Recebe TUDO, mas pela METADE (Aviso e Multa FGTS)
        // --- Verbas (Proventos) ---
        // Saldo de Salário
        const diasTrabalhadosMes = dataDemissao.getDate();
        const saldoSalario = (salarioBruto / 30) * diasTrabalhadosMes;
        verbas.push({ nome: `Saldo de Salário (${diasTrabalhadosMes} dias)`, valor: saldoSalario, tipo: 'provento' });
        totalProventos += saldoSalario;

        // Aviso Prévio (50% se indenizado)
        if (tipoAviso === 'indenizado') {
            const diasAvisoPrevio = Math.min(90, 30 + (Math.max(0, anosDeTrabalho) * 3));
            const valorAvisoPrevio = ((salarioBruto / 30) * diasAvisoPrevio) / 2; // 50%
            verbas.push({ nome: `Aviso Prévio Indenizado (50%)`, valor: valorAvisoPrevio, tipo: 'provento' });
            totalProventos += valorAvisoPrevio;
        }

        // 13º Salário Proporcional (Integral)
        const mesesTrabalhadosAno = dataDemissao.getMonth() + 1;
        const decimoTerceiro = (salarioBruto / 12) * mesesTrabalhadosAno;
        verbas.push({ nome: `13º Proporcional (${mesesTrabalhadosAno}/12 avos)`, valor: decimoTerceiro, tipo: 'provento' });
        totalProventos += decimoTerceiro;

        // Férias Vencidas + 1/3 (Integral, se houver)
        if (temFeriasVencidas) {
            const feriasVencidas = salarioBruto;
            const umTercoVencidas = feriasVencidas / 3;
            verbas.push({ nome: "Férias Vencidas", valor: feriasVencidas, tipo: 'provento' });
            verbas.push({ nome: "1/3 sobre Férias Vencidas", valor: umTercoVencidas, tipo: 'provento' });
            totalProventos += feriasVencidas + umTercoVencidas;
        }

        // Férias Proporcionais + 1/3 (Integral)
        const mesesPeriodoAquisitivo = mesesDeTrabalho % 12;
        if (mesesPeriodoAquisitivo > 0) {
            const feriasProporcionais = (salarioBruto / 12) * mesesPeriodoAquisitivo;
            const umTercoProporcionais = feriasProporcionais / 3;
            verbas.push({ nome: `Férias Proporcionais (${mesesPeriodoAquisitivo}/12 avos)`, valor: feriasProporcionais, tipo: 'provento' });
            verbas.push({ nome: "1/3 sobre Férias Proporcionais", valor: umTercoProporcionais, tipo: 'provento' });
            totalProventos += feriasProporcionais + umTercoProporcionais;
        }

        // --- Descontos (Mesma lógica da "Sem Justa Causa") ---
        const baseINSS = saldoSalario + decimoTerceiro;
        const inss = calcularINSS_Progressivo(baseINSS);
        descontos.push({ nome: "INSS (sobre Saldo e 13º)", valor: inss, tipo: 'desconto' });
        totalDescontos += inss;

        const baseIRRF_Salario = saldoSalario - calcularINSS_Progressivo(saldoSalario);
        const irrf_Salario = calcularIRRF_PelaTabela(baseIRRF_Salario);
        const baseIRRF_13 = decimoTerceiro - calcularINSS_Progressivo(decimoTerceiro);
        const irrf_13 = calcularIRRF_PelaTabela(baseIRRF_13);
        const irrf = irrf_Salario + irrf_13;
        if (irrf > 0) {
            descontos.push({ nome: "IRRF (sobre Saldo e 13º)", valor: irrf, tipo: 'desconto' });
            totalDescontos += irrf;
        }

        // --- Outros Direitos ---
        // Multa de 20% (metade) sobre FGTS
        const multaFGTS = saldoFGTS * 0.20; // 20%
        verbas.push({ nome: "Multa 20% FGTS (Acordo)", valor: multaFGTS, tipo: 'info' }); 

        // Saque FGTS (80% do Saldo + Multa)
        const saqueFGTS = (saldoFGTS * 0.80) + multaFGTS;
        verbas.push({ nome: "Direito a Saque FGTS (80% do saldo)", valor: saqueFGTS, tipo: 'info' });
        verbas.push({ nome: "Não tem direito a Seguro-Desemprego", valor: 0, tipo: 'info' });
    }

    // 4. Consolidar Resultado
    const liquidoFinal = totalProventos - totalDescontos;
    const todosDetalhes = [...verbas, ...descontos];
    console.log("Resultado do Cálculo:", { liquidoFinal, brutoTotal: totalProventos, descontosTotal: totalDescontos }); // LOG 9

    return {
        liquidoFinal: liquidoFinal,
        brutoTotal: totalProventos,
        descontosTotal: totalDescontos,
        detalhes: todosDetalhes
    };
}
/* --- Fim do Motor --- */


/* --- Bloco: Atualização da UI --- */
function atualizarUI() {
    console.log("Iniciando atualizarUI..."); // LOG 10
    try {
        const resultado = calcularRescisao();
        console.log("Resultado recebido pela UI:", resultado); // LOG 11

        // Verificação extra para NaN
        const liquidoFinal = isNaN(resultado.liquidoFinal) ? 0 : resultado.liquidoFinal;
        const brutoTotal = isNaN(resultado.brutoTotal) ? 0 : resultado.brutoTotal;
        const descontosTotal = isNaN(resultado.descontosTotal) ? 0 : resultado.descontosTotal;
        
        // Atualiza cards principais
        if(animadores['res-total-rescisao']) {
            console.log("Atualizando res-total-rescisao para:", liquidoFinal); // LOG 12
            animadores['res-total-rescisao'].update(liquidoFinal);
        }
        if(animadores['res-total-proventos']) {
             console.log("Atualizando res-total-proventos para:", brutoTotal); // LOG 13
            animadores['res-total-proventos'].update(brutoTotal);
        }
        if(animadores['res-total-descontos']) {
             console.log("Atualizando res-total-descontos para:", descontosTotal); // LOG 14
            animadores['res-total-descontos'].update(descontosTotal);
        }
        
        // Atualiza detalhes no accordion
        const elTaxDetails = document.getElementById('tax-details-rescisao');
        if (elTaxDetails) {
            elTaxDetails.textContent = ''; // Limpa
            
            let totalProventosDetalhe = 0;
            let totalDescontosDetalhe = 0;
            const proventosFragment = document.createDocumentFragment();
            const descontosFragment = document.createDocumentFragment();
            const infoFragment = document.createDocumentFragment(); // Para infos (FGTS, etc)

            (resultado.detalhes || []).forEach(item => { // Garante que detalhes seja um array
                if (item && (item.valor !== 0 || item.tipo === 'info')) { // Verifica se item existe
                    if (item.tipo === 'provento') {
                        proventosFragment.appendChild(criarTaxItem(item.nome, item.valor, 'provento'));
                        totalProventosDetalhe += item.valor;
                    } else if (item.tipo === 'desconto') {
                        descontosFragment.appendChild(criarTaxItem(item.nome, item.valor, 'desconto'));
                        totalDescontosDetalhe += item.valor;
                    } else {
                        // Trata 'info' (FGTS, Seguro, etc.)
                        const infoItem = criarTaxItem(item.nome, item.valor, 'provento');
                        infoItem.style.color = 'var(--cor-texto-secundario)'; // Cor mais sutil
                        if (infoItem.querySelector('strong')) {
                           infoItem.querySelector('strong').style.color = 'var(--cor-texto-secundario)';
                        }
                        infoFragment.appendChild(infoItem);
                    }
                }
            });

            if (totalProventosDetalhe > 0) {
                proventosFragment.appendChild(criarTaxItemTotal('Total de Verbas', totalProventosDetalhe, 'provento'));
                elTaxDetails.appendChild(proventosFragment);
            }
            if (totalDescontosDetalhe > 0) {
                descontosFragment.appendChild(criarTaxItemTotal('Total de Descontos', totalDescontosDetalhe, 'desconto'));
                elTaxDetails.appendChild(descontosFragment);
            }
            if (infoFragment.childElementCount > 0) {
                elTaxDetails.appendChild(infoFragment); // Adiciona as infos no final
            }

            if (elTaxDetails.childElementCount === 0) {
                elTaxDetails.innerHTML = '<div class="tax-item"><span>Preencha os dados</span></div>';
                 // Adiciona mensagem de erro de data se for o caso
                if (resultado.detalhes && resultado.detalhes.length > 0 && resultado.detalhes[0].nome.startsWith("Erro:")) {
                     elTaxDetails.innerHTML = `<div class="tax-item"><span style="color: var(--cor-negativo);">${resultado.detalhes[0].nome}</span></div>`;
                }
            }
        }
        
        // Reajusta altura do accordion (caso esteja aberto)
        atualizarAlturasAccordions();
        console.log("atualizarUI concluído."); // LOG 15

    } catch (e) {
        console.error("Erro DENTRO de atualizarUI:", e); // LOG ERRO
    }
}

/* --- Bloco: Lógica Accordion (Reutilizada) --- */
function atualizarAlturasAccordions() {
    document.querySelectorAll('.accordion-content').forEach(content => {
        const button = content.previousElementSibling;
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
         console.log("DOM Carregado. Adicionando Listeners..."); // LOG ON DOM LOAD
        // Listeners dos Inputs
        const inputIDs = [
            'tipo-rescisao', 'salario-bruto', 'data-admissao', 'data-demissao', 
            'aviso-previo', 'saldo-fgts', 'ferias-vencidas'
        ];
        
        inputIDs.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                const eventType = (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date') 
                                ? 'change' 
                                : 'input';
                el.addEventListener(eventType, calcularComDebounce);
            } else {
                 console.warn(`Elemento de input #${id} não encontrado no DOMContentLoaded.`);
            }
        });

        // Listener do Accordion
        const accordionButtons = document.querySelectorAll('.accordion-button');
        accordionButtons.forEach(button => {
            button.addEventListener('click', () => {
                button.classList.toggle('active');
                const content = button.nextElementSibling;
                if (content.style.maxHeight) {
                    content.style.maxHeight = null;
                } else {
                    content.style.maxHeight = content.scrollHeight + "px";
                }
            });
        });
    });
    
    // ETAPA 2: Inicializar os animadores e fazer o primeiro cálculo
    window.addEventListener('load', () => {
         console.log("Window Carregado. Inicializando Calculadora..."); // LOG ON WINDOW LOAD
        try {
            initAnimadores(); // Tenta inicializar os animadores
            atualizarUI(); // Tenta calcular e atualizar a UI
        } catch (e) {
            console.error("Erro durante o window.onload:", e);
        }
    });
}
/* --- Fim Inicialização --- */