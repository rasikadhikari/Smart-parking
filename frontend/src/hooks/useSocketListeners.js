import { useEffect } from 'react';
import io from 'socket.io-client';

export const socket = io('http://localhost:5002', {
  withCredentials: true,
  transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
});

export const useSocketListeners = ({ setSlots, setBookings, setParkingSpaces }) => {
  useEffect(() => {
      
      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        socket.emit('requestSlots');
      });
  
      socket.on('slotsUpdate', (data) => {
        console.log('Received slotsUpdate in App.js:', data);
        setSlots((prev) => {
          if (Array.isArray(data)) {
            return { ...prev, null: data };
          }
          const { parkingSpaceId, slots } = data;
         
          return { ...prev, [parkingSpaceId || 'null']: slots };
        });
      });
  
      socket.on('bookingsUpdate', (data) => {
        console.log('Received bookingsUpdate in App.js:', data);
        setBookings((prev) => {
          if (Array.isArray(data)) {
            return { ...prev, null: data };
          }
          const { parkingSpaceId, bookings } = data;
          return { ...prev, [parkingSpaceId || 'null']: bookings };
        });
      });
  
      socket.on('parkingSpacesUpdate', (data) => {
        console.log('Received parkingSpacesUpdate in App.js:', data);
        setParkingSpaces(data);
      });
  
      return () => {
        socket.off('connect');
        socket.off('slotsUpdate');
        socket.off('bookingsUpdate');
        socket.off('parkingSpacesUpdate');
      };
    }, [setSlots, setBookings, setParkingSpaces]);
};
