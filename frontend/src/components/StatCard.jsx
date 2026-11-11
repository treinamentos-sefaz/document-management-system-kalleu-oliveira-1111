import Icon from './Icon.jsx';

export default function StatCard({ icon, label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-card__icon">
        <Icon name={icon} />
      </span>
      <div>
        <p className="stat-card__label">{label}</p>
        <p className="stat-card__value">{value}</p>
      </div>
    </div>
  );
}
