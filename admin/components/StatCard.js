// admin/components/StatCard.js
/**
 * Komponent karty statystyk dla panelu administratora
 * Statistics card component for admin panel
 */

import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

const StatCard = ({ title, value, icon, color, link }) => {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>
        <i className={icon}></i>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
      {link && (
        <Link to={link} className="stat-link">
          Szczegóły <i className="fas fa-arrow-right"></i>
        </Link>
      )}
    </div>
  );
};

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  icon: PropTypes.string.isRequired,
  color: PropTypes.oneOf(['blue', 'green', 'red', 'yellow', 'orange', 'purple']),
  link: PropTypes.string
};

StatCard.defaultProps = {
  color: 'blue',
  link: null
};

export default StatCard;
