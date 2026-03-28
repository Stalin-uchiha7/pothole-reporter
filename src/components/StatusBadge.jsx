export default function StatusBadge({ value, type = 'status' }) {
    return <span className={`badge ${value}`}>{value.replace('_', ' ')}</span>
  }