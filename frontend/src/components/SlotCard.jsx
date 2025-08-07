import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/ComponentStyles.css';

const SlotCard = ({ slot }) => {
  return (
    <div className={`slot-card ${slot.isBooked ? 'booked' : ''}`}>
      <h3>Slot {slot.number}</h3>
      <p>Status: {slot.isBooked ? 'Booked' : 'Available'}</p>
      {!slot.isBooked && (
        <Link to={`/book/${slot._id}`}>
          <button>Book Now</button>
        </Link>
      )}
    </div>
  );
};

export default SlotCard;