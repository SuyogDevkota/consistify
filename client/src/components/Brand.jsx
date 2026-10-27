import { Link } from 'react-router-dom';

export default function Brand({ to = '/', className = '' }) {
  return (
    <Link className={`brand ${className}`} to={to}>
      <span className="brand-mark" aria-hidden>
        ↗
      </span>
      <span>
        consistify
        <small>Better, every day.</small>
      </span>
    </Link>
  );
}
