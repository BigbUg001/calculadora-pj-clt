document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-calcular-fator-r').addEventListener('click', calcularFatorR);
});

function calcularFatorR() {
    const faturamento = parseFloat(document.getElementById('faturamento-mensal').value) || 0;
    const prolabore = parseFloat(document.getElementById('prolabore').value) || 0;
    const resultadoDiv = document.getElementById('resultado-fator-r');
    
    if (faturamento <= 0) {
        resultadoDiv.innerHTML = '<p class="resultado-fator-r-texto" style="color: var(--cor-perigo);">Por favor, insira um valor de faturamento válido.</p>';
        resultadoDiv.style.display = 'block';
        return;
    }
    
    const fatorR = prolabore / faturamento;
    const fatorRPercent = (fatorR * 100).toFixed(2).replace('.', ',');
    
    let htmlResultado = '';
    
    if (fatorR >= 0.28) {
        // Atingiu o Fator R
        htmlResultado = `
            <div class="resultado-fator-r-valor resultado-fator-r-anexo3">${fatorRPercent}%</div>
            <p class="resultado-fator-r-texto">
                Parabéns! Com um Fator R de ${fatorRPercent}%, sua empresa se enquadra nas alíquotas do <strong>Anexo III</strong> (a partir de 6%).
            </p>
        `;
    } else {
        // Não atingiu
        htmlResultado = `
            <div class="resultado-fator-r-valor resultado-fator-r-anexo5">${fatorRPercent}%</div>
            <p class="resultado-fator-r-texto">
                Atenção! Com um Fator R de ${fatorRPercent}%, sua empresa será tributada pelo <strong>Anexo V</strong> (a partir de 15.5%).
            </p>
        `;
    }
    
    resultadoDiv.innerHTML = htmlResultado;
    resultadoDiv.style.display = 'block';
}