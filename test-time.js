const bookedDates = [{room: 'A', checkIn: '2026-04-01T17:00:00.000Z', checkOut: '2026-04-02T17:00:00.000Z'}];
function norm(ts) {
    const d = new Date(ts); d.setHours(0,0,0,0); return d.getTime();
}
function isDateBooked(room, dt) {
    const t = norm(dt);
    return bookedDates.some(b => {
        if(b.room !== room) return false;
        const bin = norm(b.checkIn);
        const bout = norm(b.checkOut);
        return t >= bin && t < bout; 
    });
}
const tzOffset = new Date().getTimezoneOffset();
console.log("TZ Offset:", tzOffset);

const LocalApril1 = new Date(2026, 3, 1);
const LocalApril2 = new Date(2026, 3, 2);
const LocalApril3 = new Date(2026, 3, 3);

console.log("April 1 is booked?", isDateBooked('A', LocalApril1));
console.log("April 2 is booked?", isDateBooked('A', LocalApril2));
console.log("April 3 is booked?", isDateBooked('A', LocalApril3));
