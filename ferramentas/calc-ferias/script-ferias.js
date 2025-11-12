/**
 * ===================================================================
 * === ARQUIVO: ferramentas/calc-ferias/script-ferias.js
 * === STATUS: Refatorado (Etapa 2)
 * ===================================================================
 * * Constantes e funções de cálculo globais (INSS, IRRF, formatBRL, etc.)
 * * foram removidas e agora são carregadas de /js/calculos-core.js
 * */

let animadores = {};

function initAnimadores() {
    if ("undefined" == typeof countUp) return void console.error("ERRO: Biblioteca CountUp não está carregada. As animações não funcionarão.");
    console.log("Iniciando animadores (Férias)...");
    const e = { duration: 0.8, useEasing: !0, decimal: ",", separator: ".", prefix: "R$ " },
        t = { "res-liquido-ferias": e, "res-total-bruto": { ...e, prefix: "+R$ " }, "res-total-descontos": { ...e, prefix: "-R$ " } };
    try {
        for (const e in t) {
            const o = document.getElementById(e);
            o
                ? ((animadores[e] = new countUp.CountUp(o, 0, t[e])), animadores[e].error ? console.error(`Erro ao criar animador Férias #${e}:`, animadores[e].error) : (animadores[e].start(), console.log(`Animador Férias #${e} iniciado.`)))
                : console.warn(`Elemento Férias #${e} não encontrado.`);
        }
    } catch (e) {
        console.error("Erro fatal no initAnimadores (Férias):", e);
    }
}

// Funções globais (formatadorBRL, SALARIO_MINIMO, TETO_INSS, FAIXAS_INSS, FAIXAS_IRRF, etc...)
// ... são carregadas do /js/calculos-core.js

function calcularFerias() {
    const e = getFloat("salario-bruto");
    let t = getFloat("dias-ferias");
    const o = getFloat("dependentes"),
        a = getChecked("vender-ferias");
    t = Math.max(5, Math.min(30, t || 30));
    const n = (e / 30) * t,
        r = n / 3,
        i = n + r;
    let s = 0,
        c = 0;
    a && t > 15 && ((c = Math.min(10, Math.floor(t / 3))), (s = (e / 30) * c), (s += s / 3));
    
    // Funções de calculos-core.js
    const l = calcularINSS_Progressivo(i),
          d = calcularIRRF_Preciso(i, l, o), // Passa 0 "outros descontos"
          u = i - l - d + s,
          m = i + s,
          p = l + d,
          f = [];
          
    return (
        n > 0 && f.push({ nome: `Férias (${t} dias)`, valor: n, tipo: "provento" }),
        r > 0 && f.push({ nome: "1/3 Constitucional", valor: r, tipo: "provento" }),
        s > 0 && f.push({ nome: `Abono Pecuniário (${c} dias + 1/3)`, valor: s, tipo: "provento" }),
        l > 0 && f.push({ nome: "INSS sobre Férias", valor: l, tipo: "desconto" }),
        d > 0 && f.push({ nome: "IRRF sobre Férias", valor: d, tipo: "desconto" }),
        { liquidoFinal: isNaN(u) ? 0 : u, brutoTotal: isNaN(m) ? 0 : m, descontosTotal: isNaN(p) ? 0 : p, detalhes: f }
    );
}
function atualizarUI() {
    try {
        const e = calcularFerias();
        if ((console.log("Resultado Férias:", e), animadores["res-liquido-ferias"])) animadores["res-liquido-ferias"].update(e.liquidoFinal);
        else {
            const t = document.getElementById("res-liquido-ferias");
            t && (t.innerText = formatBRL(e.liquidoFinal));
        }
        if (animadores["res-total-bruto"]) animadores["res-total-bruto"].update(e.brutoTotal);
        else {
            const t = document.getElementById("res-total-bruto");
            t && (t.innerText = formatBRL(e.brutoTotal));
        }
        if (animadores["res-total-descontos"]) animadores["res-total-descontos"].update(e.descontosTotal);
        else {
            const t = document.getElementById("res-total-descontos");
            t && (t.innerText = formatBRL(e.descontosTotal));
        }
        const t = document.getElementById("tax-details-ferias");
        if (t) {
            t.textContent = "";
            let o = 0,
                a = 0;
            const n = document.createDocumentFragment(),
                r = document.createDocumentFragment();
            (e.detalhes || []).forEach((e) => {
                e && e.valor > 0 && ("provento" === e.tipo ? (n.appendChild(criarTaxItem(e.nome, e.valor, 0, "provento")), (o += e.valor)) : (r.appendChild(criarTaxItem(e.nome, e.valor, 0, "desconto")), (a += e.valor)));
            }),
                o > 0 && (n.appendChild(criarTaxItemTotal("Total Bruto", o, "provento")), t.appendChild(n)),
                a > 0 && (r.appendChild(criarTaxItemTotal("Total Descontos", a, "desconto")), t.appendChild(r)),
                0 === t.childElementCount && (t.innerHTML = '<div class="tax-item"><span>Preencha os dados</span></div>');
        }
        atualizarAlturasAccordions();
    } catch (e) {
        console.error("Erro em atualizarUI (Férias):", e);
    }
}
function atualizarAlturasAccordions() {
    document.querySelectorAll(".accordion-content").forEach((e) => {
        const t = e.previousElementSibling;
        t && t.classList.contains("active") && (e.style.maxHeight = e.scrollHeight + "px");
    });
}
if ("undefined" != typeof window) {
    // A função debounce() é carregada do /js/calculos-core.js
    const e = debounce(atualizarUI, 300);
    document.addEventListener("DOMContentLoaded", () => {
        console.log("DOM Carregado (Férias). Adicionando Listeners...");
        ["salario-bruto", "dias-ferias", "dependentes", "vender-ferias"].forEach((t) => {
            const o = document.getElementById(t);
            if (o) {
                const t = "checkbox" === o.type ? "change" : "input";
                o.addEventListener(t, e);
            } else console.warn(`Elemento input Férias #${t} não encontrado.`);
        });
        document.querySelectorAll(".accordion-button").forEach((e) => {
            e.addEventListener("click", () => {
                e.classList.toggle("active");
                const t = e.nextElementSibling;
                t.style.maxHeight && "fit-content" !== t.style.maxHeight ? (t.style.maxHeight = null) : (t.style.maxHeight = t.scrollHeight + "px");
            });
        });
    }),
        window.addEventListener("load", () => {
            console.log("Window Carregado (Férias). Inicializando Calculadora...");
            try {
                if ("undefined" == typeof countUp) return void console.error("ERRO CRÍTICO (Férias): Biblioteca CountUp.js não carregou a tempo!");
                initAnimadores(), atualizarUI();
            } catch (e) {
                console.error("Erro durante o window.onload (Férias):", e);
            }
        });
}