document.addEventListener('DOMContentLoaded', () => {
    // O ID do botão agora é "btn-calcular" para pegar o estilo principal
    document.getElementById('btn-calcular').addEventListener('click', handleCalculateClick);
});

function handleCalculateClick() {
    const btn = document.getElementById('btn-calcular');
    const btnText = document.getElementById('btn-text');
    const spinner = document.getElementById('btn-spinner');

    btn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'block';

    setTimeout(() => {
        calcularFatorR();
        btn.disabled = false;
        btnText.style.display = 'block';
        spinner.style.display = 'none';
    }, 50);
}

function calcularFatorR() {
    const faturamento = parseFloat(document.getElementById('faturamento-mensal').value) || 0;
    const massaSalarial = parseFloat(document.getElementById('massa-salarial').value) || 0;
    const resultadoDiv = document.getElementById('resultado-fator-r');
    
    if (faturamento <= 0) {
        resultadoDiv.innerHTML = '<p class="resultado-fator-r-texto" style="color: var(--cor-perigo);">Por favor, insira um valor de faturamento válido.</p>';
        resultadoDiv.style.display = 'block';
        return;
    }
    
    const fatorR = massaSalarial / faturamento;
    const fatorRPercent = (fatorR * 100).toFixed(2).replace('.', ',');
    
    let htmlResultado = '';
    
    // Texto do resultado preciso (V8)
    if (fatorR >= 0.28) {
        htmlResultado = `
            <div class="resultado-fator-r-valor resultado-fator-r-anexo3">${fatorRPercent}%</div>
            <p class="resultado-fator-r-texto">
                Parabéns! Sua empresa se enquadra no <strong>Anexo III</strong> do Simples Nacional.
            </p>
            <div class="resultado-fator-r-aviso">
                As alíquotas do Anexo III variam de <strong>6% a 33%</strong>. Para saber sua alíquota efetiva exata, use nossa <a href="index.html">calculadora completa</a>, que considera seu faturamento dos últimos 12 meses.
            </div>
        `;
    } else {
        // ... (texto do Anexo V)
    }
    
    resultadoDiv.innerHTML = htmlResultado;
    resultadoDiv.style.display = 'block';
}