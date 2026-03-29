const assert = require('assert');

// Simulate the backend data
const bookedDates = [
  { room: 'Room A', checkIn: '2026-04-15T15:00:00.000Z', checkOut: '2026-04-17T12:00:00.000Z' }, // Booked for 2 nights (15th, 16th)
];

const stateRoom = { name: 'Room A' };

// Simulate the frontend logic
function isDateBooked(d) {
    if (!stateRoom) return false;

    // Simulate tzOffset (e.g. +0700 => -420)
    const tzOffset = d.getTimezoneOffset() * 60000;
    const dateStr = (new Date(d.getTime() - tzOffset)).toISOString().substring(0, 10);

    return bookedDates.some(b => {
        if (b.room !== stateRoom.name) return false;
        const inStr = b.checkIn.substring(0, 10);
        const outStr = b.checkOut.substring(0, 10);
        return dateStr >= inStr && dateStr < outStr; 
    });
}

// Emulate user clicking 2026-04-15 on +0700 UI
const dateLocal15 = new Date('2026-04-15T00:00:00+07:00'); 
const dateLocal16 = new Date('2026-04-16T00:00:00+07:00');
const dateLocal14 = new Date('2026-04-14T00:00:00+07:00');
const dateLocal17 = new Date('2026-04-17T00:00:00+07:00');

console.log('14 is booked?', isDateBooked(dateLocal14)); // false
console.log('15 is booked?', isDateBooked(dateLocal15)); // true
console.log('16 is booked?', isDateBooked(dateLocal16)); // true
console.log('17 is booked?', isDateBooked(dateLocal17)); // false

// Test overlap checking
let hasBooked = false;
let testDate = new Date(dateLocal14);
while(testDate < dateLocal17) {
    if(isDateBooked(testDate)) hasBooked = true;
    testDate.setDate(testDate.getDate() + 1);
}
console.log('14 to 17 overlap?', hasBooked); // true
