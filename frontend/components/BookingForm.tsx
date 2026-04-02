'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Calendar from './Calendar';
import { Calendar as CalendarIcon, User, Phone, Check } from 'lucide-react';

interface BookingFormProps {
  roomName: string;
  price?: number;
  type?: 'hotel' | 'sauna' | 'yurts';
}

function BookingFormInner({ roomName, price, type = 'hotel' }: BookingFormProps) {
  const searchParams = useSearchParams();
  const chatId = searchParams.get('chat_id');
  
  const [step, setStep] = useState(1);
  const [date, setDate] = useState('');
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Mock duration 1 day for simplicity, can be expanded
      const checkIn = date;
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const checkOut = nextDay.toISOString().split('T')[0];

      const payload = {
        type: type,
        room: roomName,
        checkIn: checkIn,
        checkOut: checkOut,
        nights: 1,
        guest: formData.name,
        phone: formData.phone,
        total: price || 0,
        clientChatId: chatId
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success) {
        setIsSubmitted(true);
      } else {
        setError(result.error || 'Ошибка при бронировании');
      }
    } catch (err) {
      setError('Не удалось связаться с сервером');
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="animate-scale" style={{
        background: 'white',
        padding: '3rem',
        borderRadius: '20px',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'var(--secondary)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          color: 'white'
        }}>
          <Check size={40} />
        </div>
        <h2>Заявка принята!</h2>
        <p style={{ color: '#666', marginTop: '1rem' }}>Мы свяжемся с вами в ближайшее время для подтверждения бронирования.</p>
        <button 
          onClick={() => { setIsSubmitted(false); setStep(1); }}
          className="btn btn-gold" 
          style={{ marginTop: '2rem' }}
        >
          Вернуться
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade" style={{
      background: 'white',
      padding: '2rem',
      borderRadius: '20px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      border: '1px solid #eee'
    }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Бронирование</h2>
        <p style={{ color: 'var(--secondary)', fontWeight: 600 }}>{roomName}</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ 
          flex: 1, height: '4px', borderRadius: '2px', 
          background: step >= 1 ? 'var(--secondary)' : '#eee' 
        }} />
        <div style={{ 
          flex: 1, height: '4px', borderRadius: '2px', 
          background: step >= 2 ? 'var(--secondary)' : '#eee' 
        }} />
      </div>

      {step === 1 ? (
        <div className="animate-slide-up">
          <p style={{ marginBottom: '1rem', fontWeight: 600 }}>Выберите дату заезда:</p>
          <Calendar onSelect={(d) => { setDate(d); setStep(2); }} />
          {price && <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>Итого от: <strong>{price} ₽</strong></p>}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="animate-slide-up">
          <p style={{ marginBottom: '1.5rem', color: '#666' }}>
            <CalendarIcon size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            Выбранная дата: <strong>{date}</strong>
          </p>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Ваше имя</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input 
                type="text" 
                required
                placeholder="Иван Иванов"
                style={{
                  width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: '10px',
                  border: '1px solid #ddd', outline: 'none', transition: 'var(--transition)'
                }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Телефон</label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input 
                type="tel" 
                required
                placeholder="+7 (___) ___-__-__"
                style={{
                  width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: '10px',
                  border: '1px solid #ddd', outline: 'none', transition: 'var(--transition)'
                }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              type="button" 
              disabled={loading}
              onClick={() => setStep(1)}
              style={{ flex: 1, padding: '1rem', borderRadius: '10px', border: '1px solid #ddd', background: 'none', cursor: loading ? '#f5f5f5' : 'pointer', opacity: loading ? 0.5 : 1 }}
            >
              Назад
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-gold"
              style={{ flex: 2, border: 'none', position: 'relative', opacity: loading ? 0.8 : 1 }}
            >
              {loading ? 'Отправка...' : 'Забронировать'}
            </button>
          </div>
          {error && <p style={{ color: 'red', marginTop: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>}
        </form>
      )}
    </div>
  );
}

export default function BookingForm(props: BookingFormProps) {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка формы...</div>}>
      <BookingFormInner {...props} />
    </Suspense>
  );
}
