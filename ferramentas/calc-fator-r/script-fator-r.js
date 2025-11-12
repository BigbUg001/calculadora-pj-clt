/**
 * ===================================================================
 * === ARQUIVO: ferramentas/calc-fator-r/script-fator-r.js
 * === STATUS: Refatorado (Etapa 2)
 * ===================================================================
 * * Constantes e funções de cálculo globais (debounce, getFloat, etc.)
 * * foram removidas e agora são carregadas de /js/calculos-core.js
 * */

let animadores = {};

function initAnimadores() {
    const a = { duration: 0.8, useEasing: !0, decimal: ",", separator: ".", suffix: "%" };
    try {
        if (!("undefined" != typeof countUp)) return void console.error("ERRO CRÍTICO: Biblioteca CountUp.js não carregou a tempo!");
        const e = document.getElementById("res-fator-r-perc");
        e ? ((animadores.fatorR = new countUp.CountUp(e, 0, a)), animadores.fatorR.error ? console.error("Erro ao criar animador:", animadores.fatorR.error) : animadores.fatorR.start()) : console.warn("Elemento res-fator-r-perc não encontrado.");
    } catch (a) {
        console.error("Erro fatal no initAnimadores:", a);
    }
}

// Funções globais (getFloat)
// ... são carregadas do /js/calculos-core.js

function calcularFatorR() {
    const a = getFloat("faturamento-bruto"),
        e = getFloat("gastos-folha");
    if (a <= 0 || e <= 0)
        return {
            fatorR: 0,
            anexo: "Preencha os dados",
            aliquota: "Alíquota inicial a partir de...",
            explicacao: "Insira seu faturamento bruto e seus gastos com folha (pró-labore) para calcular seu Fator R.",
            classe: "",
        };
    const o = e / a;
    let t, r, n, i;
    return (
        o >= 0.28
            ? ((t = "Anexo III"), (r = "A partir de 6%"), (n = `Parabéns! Seu Fator R de ${(100 * o).toFixed(1)}% é igual ou superior a 28%, enquadrando sua empresa no Anexo III. Sua alíquota inicial é de 6%.`), (i = "positivo"))
            : ((t = "Anexo V"), (r = "A partir de 15,5%"), (n = `Atenção! Seu Fator R de ${(100 * o).toFixed(1)}% é inferior a 28%, enquadrando sua empresa no Anexo V. Sua alíquota inicial é de 15,5%. Considere aumentar seu pró-labore para R$ ${formatBRL(0.28 * a)} para economizar.`), (i = "negativo")), // Usa formatBRL de calculos-core.js
        { fatorR: o, anexo: t, aliquota: r, explicacao: n, classe: i }
    );
}
function atualizarUI() {
    try {
        const a = calcularFatorR(),
            e = document.getElementById("res-card-principal"),
            o = document.getElementById("res-anexo-nome"),
            t = document.getElementById("res-anexo-aliquota"),
            r = document.getElementById("res-explicacao");
        animadores.fatorR && animadores.fatorR.update(100 * a.fatorR), (o.textContent = a.anexo), (t.textContent = a.aliquota), (r.innerHTML = a.explicacao), e.classList.remove("positivo", "negativo"), a.classe && e.classList.add(a.classe); // innerHTML usado para renderizar o link
    } catch (a) {
        console.error("Erro DENTRO de atualizarUI:", a);
    }
}
if ("undefined" != typeof window) {
    // A função debounce() é carregada do /js/calculos-core.js
    const a = debounce(atualizarUI, 300);
    document.addEventListener("DOMContentLoaded", () => {
        ["faturamento-bruto", "gastos-folha"].forEach((e) => {
            const o = document.getElementById(e);
            o && o.addEventListener("input", a);
        });
    }),
        window.addEventListener("load", () => {
            try {
                initAnimadores(), atualizarUI();
            } catch (a) {
                console.error("Erro durante o window.onload:", a);
            }
        });
}