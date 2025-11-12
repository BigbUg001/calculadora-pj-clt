/**
 * ===================================================================
 * === ARQUIVO: ferramentas/calc-salario-pj/script-salario-pj.js
 * === STATUS: Refatorado (Etapa 2)
 * ===================================================================
 * * Constantes e funções de cálculo globais (INSS, IRRF, formatBRL, etc.)
 * * foram removidas e agora são carregadas de /js/calculos-core.js
 * */

let animadores = {},
    pjDonutChart = null;

function initAnimadores() {
    const t = { duration: 0.8, useEasing: !0, decimal: ",", separator: ".", prefix: "R$ " },
        e = { "res-pj-liquido": t, "res-pj-impostos": { ...t, prefix: "-R$ " } };
    try {
        if (!("undefined" != typeof countUp)) return void console.error("ERRO CRÍTICO: Biblioteca CountUp.js não carregou a tempo!");
        for (const t in e) {
            const a = document.getElementById(t);
            a ? ((animadores[t] = new countUp.CountUp(a, 0, e[t])), animadores[t].error ? console.error(`Erro ao criar animador para #${t}:`, animadores[t].error) : animadores[t].start()) : console.warn(`Elemento #${t} não encontrado.`);
        }
    } catch (t) {
        console.error("Erro fatal no initAnimadores:", t);
    }
}

// Funções globais (formatadorBRL, SALARIO_MINIMO, TETO_INSS, FAIXAS_INSS, FAIXAS_IRRF, ANEXO_III, ANEXO_V, etc...)
// ... são carregadas do /js/calculos-core.js

function calcularCustosPJ(t, e, a, o) {
    const n = calcularAliquotaEfetiva(e, o), // Função de calculos-core.js
        r = t * n,
        i = Math.min(0.11 * a, 0.11 * TETO_INSS),
        l = calcularIRRF_PelaTabela(a - i, 0); // Função de calculos-core.js
    return { totalCustos: r + i + l, das: r, inss: i, irrf: l, aliquotaEfetiva: n };
}

const INPUT_LIMITS_PJ = {
    "pj-faturamento": 400000,
    "pj-rbt12": 4800000,
    "pj-contabilidade": 99999,
    "pj-outros": 999999,
};

function calcularSalarioPJ() {
    const t = Math.min(getFloat("pj-faturamento"), INPUT_LIMITS_PJ["pj-faturamento"]);
    let e = getFloat("pj-rbt12");
    const a = getString("pj-atividade"),
        o = Math.min(getFloat("pj-contabilidade"), INPUT_LIMITS_PJ["pj-contabilidade"]),
        n = Math.min(getFloat("pj-outros"), INPUT_LIMITS_PJ["pj-outros"]);
    let r, i, l, s, d, u, c;
    if ((e <= 0 && (e = 12 * t), (e = Math.min(e, INPUT_LIMITS_PJ["pj-rbt12"])), t <= 0))
        return { valorFinal: 0, totalImpostos: 0, aliquotaEfetiva: 0, titulo: "PJ", detalhesImpostos: [], prolabore: 0, estrategia: "Preencha os dados" };
    if ("anexo_iii" === a) {
        (r = Math.min(t, Math.max(SALARIO_MINIMO, 0.01 * t))), (i = "iii");
        const a = calcularCustosPJ(t, e, r, ANEXO_III); // Função de calculos-core.js
        (l = a.aliquotaEfetiva), (s = a.das), (d = a.inss), (u = a.irrf), (c = `Pró-labore mínimo (${formatBRL(r)}) para Anexo III Direto.`);
    } else {
        const a = Math.min(t, Math.max(SALARIO_MINIMO, 0.28 * t)),
            p = a / (t || 1) >= 0.28 ? "iii" : "v",
            m = calcularCustosPJ(t, e, a, a / (t || 1) >= 0.28 ? ANEXO_III : ANEXO_V), // Função de calculos-core.js
            I = m.totalCustos + o + n,
            E = Math.min(t, SALARIO_MINIMO),
            f = calcularCustosPJ(t, e, E, ANEXO_V); // Função de calculos-core.js
        I < f.totalCustos + o + n
            ? ((r = a), (i = p), (l = m.aliquotaEfetiva), (s = m.das), (d = m.inss), (u = m.irrf), (c = `Pró-labore de 28% (R$ ${formatBRL(r)}) para otimizar o Fator R e tributar no Anexo III.`))
            : ((r = E), (i = "v"), (l = f.aliquotaEfetiva), (s = f.das), (d = f.inss), (u = f.irrf), (c = `Pró-labore Mínimo (R$ ${formatBRL(r)}) para evitar IRRF alto, aceitando o Anexo V. (Estratégia do "Ponto de Virada")`));
    }
    const p = s + d + u + o + n,
        m = t - p,
        I = [];
    return (
        s > 0 && I.push({ nome: `Simples (Alíq. Efetiva ${i.toUpperCase()})`, valor: s, percentual: l, tipo: "desconto" }),
        d > 0 && I.push({ nome: "INSS Pró-labore", valor: d, percentual: d / (t || 1), tipo: "desconto" }),
        u > 0 && I.push({ nome: "IRRF Pró-labore", valor: u, percentual: u / (t || 1), tipo: "desconto" }),
        o > 0 && I.push({ nome: "Contabilidade", valor: o, percentual: o / (t || 1), tipo: "desconto" }),
        n > 0 && I.push({ nome: "Outros Custos", valor: n, percentual: n / (t || 1), tipo: "desconto" }),
        { valorFinal: Math.max(0, m), totalImpostos: p, titulo: `Simples ${i.toUpperCase()}`, aliquotaEfetiva: t > 0 ? p / t : 0, detalhesImpostos: I, prolabore: r, estrategia: c }
    );
}
function atualizarUI() {
    try {
        const t = calcularSalarioPJ();
        animadores["res-pj-liquido"] && animadores["res-pj-liquido"].update(t.valorFinal), animadores["res-pj-impostos"] && animadores["res-pj-impostos"].update(t.totalImpostos);
        const e = document.getElementById("res-pj-aliquota");
        e && (e.textContent = `${(100 * t.aliquotaEfetiva).toFixed(1)}% da receita`.replace(".", ",")), atualizarDonutCharts(t.valorFinal, t.totalImpostos);
        const a = document.getElementById("pj-prolabore-calculado"),
            o = document.getElementById("pj-prolabore-calculado-wrapper");
        a && o && (t.prolabore > 0 ? ((a.value = (t.prolabore || 0).toFixed(2).replace(".", ",")), (o.style.display = "block")) : ((a.value = "0,00"), (o.style.display = "none")));
        const n = document.getElementById("pj-strategy-text"),
            r = document.getElementById("pj-strategy-box");
        n && r && (t.estrategia && "Preencha os dados" !== t.estrategia ? ((n.textContent = t.estrategia), (r.style.display = "block")) : (r.style.display = "none"));
        const i = document.getElementById("pj-detalhe-titulo");
        i && (i.textContent = `Detalhes PJ`);
        const l = document.getElementById("tax-details-pj");
        if (l) {
            l.textContent = "";
            let e = 0;
            t.detalhesImpostos.length > 0
                ? (t.detalhesImpostos.forEach((t) => {
                      t.valor > 0 && (l.appendChild(criarTaxItem(t.nome, t.valor, t.percentual, "desconto", "da receita")), (e += t.valor)); // Função de calculos-core.js
                  }),
                  l.appendChild(criarTaxItemTotal(`Total de Custos ${t.titulo}`, e, "desconto"))) // Função de calculos-core.js
                : (l.innerHTML = '<div class="tax-item"><span>Preencha os dados</span></div>');
        }
        atualizarAlturasAccordions();
    } catch (t) {
        console.error("Erro DENTRO de atualizarUI:", t);
    }
}
function criarOuAtualizarDonut(t, e, a, o, n) {
    const r = document.getElementById(e);
    if (!r) return null;
    const i = [],
        l = [],
        s = [];
    o.forEach((t, e) => {
        t > 0 && (i.push(t), l.push(a[e]), s.push(n[e]));
    }),
        0 === i.length && (i.push(1), l.push("Nenhum dado"), s.push("#3A3052"));
    
    const d = { labels: l, datasets: [{ data: i, backgroundColor: s, borderColor: "rgba(255,255,255,0)", borderWidth: 0, hoverOffset: 4 }] },
        u = {
            type: "doughnut",
            data: d,
            options: {
                responsive: !0,
                maintainAspectRatio: !0,
                cutout: "70%",
                plugins: {
                    legend: { display: !0, position: "bottom", labels: { color: "#A09CB0", font: { family: "Poppins" }, padding: 10 } },
                    tooltip: {
                        callbacks: {
                            label: function (t) {
                                const e = t.label || "",
                                    a = t.raw || 0,
                                    o = t.chart.data.datasets[0].data.reduce((t, e) => t + e, 0),
                                    n = o > 0 ? ((a / o) * 100).toFixed(1) : 0;
                                return "Nenhum dado" === e ? "Nenhum dado" : ` ${e}: ${formatBRL(a)} (${n.replace(".", ",")}%)`;
                            },
                        },
                    },
                },
            },
        };
    return t ? ((t.data = d), t.update(), t) : new Chart(r, u);
}
function atualizarDonutCharts(t, e) {
    pjDonutChart = criarOuAtualizarDonut(
        pjDonutChart,
        "pj-donut-chart",
        ["Líquido no Bolso", "Total de Custos/Impostos"],
        [t, e],
        ["#0D47A1", "#D32F2F"] // Azul Marinho, Vermelho
    );
}
function atualizarAlturasAccordions() {
    document.querySelectorAll(".accordion-content").forEach((t) => {
        const e = t.previousElementSibling;
        e && e.classList.contains("active") && (t.style.maxHeight = t.scrollHeight + "px");
    });
}
if ("undefined" != typeof window) {
    const t = debounce(atualizarUI, 300), // 't' é a função com debounce
        e = atualizarUI; // 'e' é a função instantânea

    document.addEventListener("DOMContentLoaded", () => {
        ["pj-faturamento", "pj-rbt12", "pj-atividade", "pj-contabilidade", "pj-outros"].forEach((a) => {
            const o = document.getElementById(a);
            if (o) {
                const n = "SELECT" === o.tagName ? "change" : "input";
                
                // CORREÇÃO: 'input' (digitação) usa debounce 't'. 'change' (select) usa instantâneo 'e'.
                if (n === "input") {
                    o.addEventListener(n, t); // Adiciona debounce para inputs
                } else {
                    o.addEventListener(n, e); // Adiciona instantâneo para selects
                }
            }
        });

        // CORREÇÃO: O listener do accordion estava faltando. Foi readicionado.
        document.querySelectorAll(".accordion-button").forEach((t) => {
            t.addEventListener("click", () => {
                t.classList.toggle("active");
                const e = t.nextElementSibling;
                e.style.maxHeight ? (e.style.maxHeight = null) : (e.style.maxHeight = e.scrollHeight + "px");
            });
        });
    }),
        window.addEventListener("load", () => {
            try {
                initAnimadores(), atualizarUI();
            } catch (t) {
                console.error("Erro durante o window.onload:", t);
            }
        });
}