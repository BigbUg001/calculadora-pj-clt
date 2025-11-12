/**
 * ===================================================================
 * === ARQUIVO CENTRAL DE CÁLCULOS (calculos-core.js) ===
 * ===================================================================
 * * Este arquivo centraliza toda a lógica de impostos (INSS, IRRF, Simples)
 * e funções utilitárias (debounce, formatadores)
 * para ser compartilhado por todas as calculadoras.
 * * DRY Principle: Don't Repeat Yourself.
 * */

// ===================================================================
// === 1. FORMATADORES E HELPERS GLOBAIS
// ===================================================================

/**
 * Atraso (debounce) para inputs, para evitar cálculos excessivos.
 */
function debounce(t, e = 300) {
    let a;
    return function (...o) {
        clearTimeout(a),
            (a = setTimeout(() => {
                t.apply(this, o);
            }, e));
    };
}

const formatadorBRL = new Intl.NumberFormat("pt-BR", { 
    style: "currency", 
    currency: "BRL" 
});

/**
 * Formata um número para o padrão de moeda BRL (R$ 1.234,56).
 * @param {number} t - O número a ser formatado.
 * @returns {string} - O valor formatado.
 */
const formatBRL = (t) => formatadorBRL.format(t || 0);

/**
 * Pega o valor de um input como float, tratando valores nulos ou inválidos.
 * @param {string} t - O ID do elemento HTML.
 * @returns {number} - O valor como float (ou 0).
 */
const getFloat = (t) => parseFloat(document.getElementById(t).value) || 0;

/**
 * Pega o valor de um input como string.
 * @param {string} t - O ID do elemento HTML.
 * @returns {string} - O valor como string.
 */
const getString = (t) => document.getElementById(t).value || "";

/**
 * Verifica se um checkbox está marcado.
 * @param {string} t - O ID do elemento HTML.
 * @returns {boolean} - True se estiver marcado, false caso contrário.
 */
const getChecked = (t) => document.getElementById(t).checked;

/**
 * Cria um item de detalhe (linha de imposto/provento) para o card.
 */
function criarTaxItem(t, e, a, o = "desconto", l = "da receita") {
    const n = document.createElement("div");
    (n.className = "tax-item"), "provento" === o && n.classList.add("provento");
    const r = document.createElement("span"),
        s = document.createElement("span");
    (s.className = "percentage"), (s.textContent = `(${(100 * a).toFixed(1)}% ${l})`.replace(".", ",")), r.append(t, s);
    const i = document.createElement("strong");
    return (i.textContent = `${"provento" === o ? "+" : "-"}${formatBRL(e)}`), n.append(r, i), n;
}

/**
 * Cria a linha de TOTAL para o card de detalhes.
 */
function criarTaxItemTotal(t, e, a = "desconto") {
    const o = document.createElement("div");
    (o.className = "tax-item tax-item-total"), "provento" === a && o.classList.add("provento");
    const l = document.createElement("span");
    l.textContent = t;
    const n = document.createElement("strong");
    return (n.textContent = `${"provento" === a ? "+" : "-"}${formatBRL(e)}`), o.append(l, n), o;
}


// ===================================================================
// === 2. CONSTANTES TRIBUTÁRIAS (CLT - INSS E IRRF)
// ===================================================================

const SALARIO_MINIMO = 1518;
const TETO_INSS = 8157.41;

const FAIXAS_INSS = [
    { teto: 1518, aliquota: 0.075, deduzir: 0 },
    { teto: 2793.88, aliquota: 0.09, deduzir: 22.77 },
    { teto: 4190.83, aliquota: 0.12, deduzir: 106.59 },
    { teto: 8157.41, aliquota: 0.14, deduzir: 190.42 },
];

const INSS_TETO = TETO_INSS * FAIXAS_INSS[3].aliquota - FAIXAS_INSS[3].deduzir;

const FAIXAS_IRRF = [
    { limite: 2428.8, aliquota: 0, deducao: 0 },
    { limite: 2826.65, aliquota: 0.075, deducao: 182.16 },
    { limite: 3751.05, aliquota: 0.15, deducao: 409.71 },
    { limite: 4664.68, aliquota: 0.225, deducao: 682.81 },
    { limite: 1 / 0, aliquota: 0.275, deducao: 912.91 },
];

const DEDUCAO_DEPENDENTE_IRRF = 189.59;
const DESCONTO_SIMPLIFICADO_IRRF = 607.2; // 25% da 1ª faixa de isenção (2428.8 * 0.25)


// ===================================================================
// === 3. CONSTANTES SIMPLES NACIONAL (PJ)
// ===================================================================

const ANEXO_III = [
    { teto: 18e4, aliquota: 0.06, pd: 0 },
    { teto: 36e4, aliquota: 0.112, pd: 9360 },
    { teto: 72e4, aliquota: 0.135, pd: 17640 },
    { teto: 18e5, aliquota: 0.16, pd: 35640 },
    { teto: 36e5, aliquota: 0.21, pd: 125640 },
    { teto: 48e5, aliquota: 0.33, pd: 648e3 },
];

const ANEXO_V = [
    { teto: 18e4, aliquota: 0.155, pd: 0 },
    { teto: 36e4, aliquota: 0.18, pd: 4500 },
    { teto: 72e4, aliquota: 0.195, pd: 9900 },
    { teto: 18e5, aliquota: 0.205, pd: 17100 },
    { teto: 36e5, aliquota: 0.23, pd: 62100 },
    { teto: 48e5, aliquota: 0.305, pd: 54e4 },
];


// ===================================================================
// === 4. FUNÇÕES DE CÁLCULO COMPARTILHADAS
// ===================================================================

/**
 * Calcula o INSS progressivo sobre um salário bruto.
 * @param {number} t - O salário bruto.
 * @returns {number} - O valor do desconto de INSS.
 */
function calcularINSS_Progressivo(t) {
    if (t <= 0) return 0;
    let brutoTeto = Math.min(t, TETO_INSS);
    for (const e of FAIXAS_INSS) {
        if (brutoTeto <= e.teto) {
            return Math.max(0, brutoTeto * e.aliquota - e.deduzir);
        }
    }
    return INSS_TETO;
}

/**
 * Calcula o IRRF pela tabela (dedução por dependentes).
 * @param {number} t - A base de cálculo (Bruto - INSS - Dependentes).
 * @param {number} [e=0] - Número de dependentes (usado por `calcularIRRF_Preciso`).
 * @returns {number} - O valor do desconto de IRRF.
 */
function calcularIRRF_PelaTabela(t, e = 0) {
    if (t <= 0) return 0;
    const a = (e || 0) * DEDUCAO_DEPENDENTE_IRRF;
    const o = Math.max(0, t - a);
    for (const t of FAIXAS_IRRF) {
        if (o <= t.limite) return Math.max(0, o * t.aliquota - t.deducao);
    }
    const l = FAIXAS_IRRF[FAIXAS_IRRF.length - 1];
    return Math.max(0, o * l.aliquota - l.deducao);
}

/**
 * Calcula o IRRF escolhendo a melhor opção (Simplificado vs. Dependentes).
 * Usado pelas calculadoras CLT.
 * @param {number} t - Salário Bruto.
 * @param {number} e - Desconto INSS.
 * @param {number} a - Número de dependentes.
 * @param {number} o - Outros descontos (Plano de saúde, etc.).
 * @returns {number} - O menor valor de IRRF a ser pago.
 */
function calcularIRRF_Preciso(t, e, a, o) {
    if (t <= 0) return 0;
    // 1. Cálculo por Dependentes
    const baseCalculoDependentes = t - e - (a * DEDUCAO_DEPENDENTE_IRRF) - (o || 0);
    const irrfDependentes = calcularIRRF_PelaTabela(baseCalculoDependentes, 0); // Passa 0 pois já deduzimos

    // 2. Cálculo Simplificado
    const baseCalculoSimplificado = t - DESCONTO_SIMPLIFICADO_IRRF;
    const irrfSimplificado = calcularIRRF_PelaTabela(baseCalculoSimplificado, 0);

    // 3. Retorna o menor dos dois (mais vantajoso para o trabalhador)
    return Math.max(0, Math.min(irrfDependentes, irrfSimplificado));
}

/**
 * Calcula a alíquota efetiva do Simples Nacional (PJ).
 * @param {number} t - Receita Bruta (RBT12).
 * @param {Array} e - O Anexo (ANEXO_III ou ANEXO_V).
 * @returns {number} - A alíquota efetiva (ex: 0.06 para 6%).
 */
function calcularAliquotaEfetiva(t, e) {
    if (t <= 0) return 0;
    let a = e[e.length - 1];
    for (const o of e) {
        if (t <= o.teto) {
            a = o;
            break;
        }
    }
    const { aliquota: o, pd: l } = a;
    const n = (t * o - l) / t;
    return n > 0 ? n : 0;
}