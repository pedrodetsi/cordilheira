export default function Legend() {
  return (
    <div className="panel legend">
      <span><i className="sw gold" /> recorde atual</span>
      <span><i className="sw amber" /> recorde da época</span>
      <span><i className="sw ice" /> lençol de platô</span>
      <span><i className="sw crystal" /> próxima meta</span>
      <span><i className="sw trail" /> tendência mensal</span>
      <span className="hint">arraste para girar · scroll/pinça para zoom · clique num pico</span>
    </div>
  )
}
