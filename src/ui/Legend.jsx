// Painel "?": como ler o mapa.
export default function Legend({ onClose }) {
  return (
    <div className="panel sheet legend">
      <div className="grip" />
      <div className="sheet-head">
        <h2>Como ler o mapa</h2>
        <button className="sheet-done" onClick={onClose}>Fechar</button>
      </div>
      <ul>
        <li><i className="sw peak" /> Cada pico é uma corrida; a altura é a distância. Fileiras = meses.</li>
        <li><i className="sw gold" /> Pico dourado com anel = recorde atual.</li>
        <li><i className="sw diamond" /> Losango dourado = foi recorde na época.</li>
        <li><i className="sw goal" /> Pico translúcido com cristal = próximo pico (+10%).</li>
        <li><i className="sw trail" /> Trilha na lateral = média mensal de distância.</li>
        <li><i className="sw rock" /> Pico mais largo e recortado = corrida montanhosa.</li>
      </ul>
      <p className="muted hint">Arraste para girar · pinça para zoom · toque num pico para ver detalhes.</p>
    </div>
  )
}
