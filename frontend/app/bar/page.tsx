'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useState } from 'react';
import { Clock, MapPin, Phone, ChevronLeft, ChevronRight, Wine, Music, Star } from 'lucide-react';

const photos = [
  { src: 'https://i4.photo.2gis.com/photo-gallery/9b086357-76fa-4b41-aea4-83d80ef20438.jpg', alt: 'Бар Скала - Интерьер' },
  { src: 'https://i2.photo.2gis.com/photo-gallery/210e67b4-7d42-42bb-b3a1-8b5ace7199c5.jpg', alt: 'Бар Скала - Барная стойка' },
  { src: 'https://i7.photo.2gis.com/photo-gallery/71a7702e-c05d-4b48-b537-ad9be1fbfb52.jpg', alt: 'Бар Скала - Зал' },
  { src: 'https://i2.photo.2gis.com/photo-gallery/33b53970-573c-43a4-a306-92e0fb7864a7.jpg', alt: 'Бар Скала - Атмосфера' },
  { src: 'https://i2.photo.2gis.com/photo-gallery/9a4b55c2-155b-4c55-b17d-cf5f85241cfa.jpg', alt: 'Бар Скала - Вечер' },
  { src: 'https://i6.photo.2gis.com/photo-gallery/8d7be2a8-0dce-4b56-b5a7-d7323fcb6983.jpg', alt: 'Бар Скала - Коктейли' },
];

const features = [
  { icon: <Wine size={28} />, title: 'Авторские коктейли', desc: 'Уникальные напитки от лучших барменов Тувы' },
  { icon: <Music size={28} />, title: 'Живая музыка', desc: 'Атмосферные вечера с живыми выступлениями' },
  { icon: <Star size={28} />, title: 'VIP-зона', desc: 'Приватное пространство для особых событий' },
];

export default function BarPage() {
  const [currentPhoto, setCurrentPhoto] = useState(0);

  const nextPhoto = () => setCurrentPhoto((prev) => (prev + 1) % photos.length);
  const prevPhoto = () => setCurrentPhoto((prev) => (prev - 1 + photos.length) % photos.length);

  return (
    <main style={{ backgroundColor: '#0a0a0a' }}>
      <Header />

      {/* Hero Section */}
      <section style={{
        height: '100vh',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("${photos[0].src}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.3) saturate(1.2)',
          transform: 'scale(1.05)'
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(transparent 40%, rgba(10,10,10,1))'
        }} />
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', color: 'white' }}>
          <p className="animate-fade" style={{
            fontSize: '0.85rem',
            letterSpacing: '6px',
            textTransform: 'uppercase',
            color: '#c9a050',
            marginBottom: '1.5rem'
          }}>
            НОЧНОЙ ЛАУНЖ БАР
          </p>
          <h1 className="animate-slide-up" style={{
            fontSize: 'clamp(3.5rem, 8vw, 7rem)',
            fontWeight: 800,
            color: 'white',
            marginBottom: '1.5rem',
            lineHeight: 1.05
          }}>
            СКАЛА
          </h1>
          <p className="animate-fade" style={{
            fontSize: '1.2rem',
            color: 'rgba(255,255,255,0.6)',
            maxWidth: '500px',
            margin: '0 auto 3rem',
            fontWeight: 300
          }}>
            Где каждый вечер становится незабываемым
          </p>
          <a href="#gallery" className="btn btn-gold animate-fade" style={{
            padding: '1.1rem 3rem',
            borderRadius: '50px',
            textDecoration: 'none'
          }}>
            Смотреть фото
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '6rem 0', backgroundColor: '#0a0a0a' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2.5rem'
          }}>
            {features.map((feature, i) => (
              <div key={i} data-reveal style={{
                padding: '2.5rem',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                borderRadius: '20px',
                border: '1px solid rgba(201,160,80,0.15)',
                textAlign: 'center',
                transition: 'all 0.4s ease'
              }}>
                <div style={{
                  width: '65px',
                  height: '65px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #c9a050, #b8860b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  color: 'white'
                }}>
                  {feature.icon}
                </div>
                <h3 style={{ color: 'white', fontSize: '1.3rem', marginBottom: '0.8rem' }}>
                  {feature.title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" style={{ padding: '6rem 0', backgroundColor: '#0f0f0f' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }} data-reveal>
            <p style={{ letterSpacing: '4px', textTransform: 'uppercase', color: '#c9a050', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.8rem' }}>
              ГАЛЕРЕЯ
            </p>
            <h2 style={{ color: 'white', fontSize: '2.8rem', fontWeight: 800 }}>
              Атмосфера бара
            </h2>
          </div>

          {/* Main Gallery Slider */}
          <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', maxHeight: '550px' }}>
            <img
              src={photos[currentPhoto].src}
              alt={photos[currentPhoto].alt}
              style={{
                width: '100%',
                height: '550px',
                objectFit: 'cover',
                transition: 'opacity 0.5s ease'
              }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.6))'
            }} />

            {/* Navigation Arrows */}
            <button onClick={prevPhoto} style={{
              position: 'absolute',
              left: '1.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.3)',
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}>
              <ChevronLeft size={24} />
            </button>
            <button onClick={nextPhoto} style={{
              position: 'absolute',
              right: '1.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.3)',
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}>
              <ChevronRight size={24} />
            </button>

            {/* Counter */}
            <div style={{
              position: 'absolute',
              bottom: '1.5rem',
              right: '1.5rem',
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(10px)',
              padding: '0.6rem 1.2rem',
              borderRadius: '50px',
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              {currentPhoto + 1} / {photos.length}
            </div>
          </div>

          {/* Thumbnail Strip */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginTop: '1.5rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            {photos.map((photo, i) => (
              <div
                key={i}
                onClick={() => setCurrentPhoto(i)}
                style={{
                  width: '90px',
                  height: '65px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: currentPhoto === i ? '2px solid #c9a050' : '2px solid transparent',
                  opacity: currentPhoto === i ? 1 : 0.5,
                  transition: 'all 0.3s ease'
                }}
              >
                <img src={photo.src} alt={photo.alt} style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section style={{ padding: '6rem 0', backgroundColor: '#0a0a0a' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4rem',
            alignItems: 'center'
          }}>
            <div data-reveal>
              <p style={{ letterSpacing: '4px', textTransform: 'uppercase', color: '#c9a050', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.8rem' }}>
                О БАРЕ
              </p>
              <h2 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.2 }}>
                Место, где <span style={{ color: '#c9a050' }}>время останавливается</span>
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '2rem' }}>
                Бар «Скала» — это ночной лаунж в самом центре Кызыла, где царит атмосфера изысканности и уюта.
                Премиальная коктейльная карта, живая музыка по пятницам и субботам, а также уникальный дизайн интерьера
                сделают каждый ваш визит незабываемым.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                  <Clock size={20} color="#c9a050" />
                  <span>Пт–Сб: 21:00 — 05:00</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                  <MapPin size={20} color="#c9a050" />
                  <span>г. Кызыл, ул. Интернациональная, 12</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                  <Phone size={20} color="#c9a050" />
                  <a href="tel:+73942221082" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
                    +7 (394) 222-10-82
                  </a>
                </div>
              </div>
            </div>

            {/* Large accent photo */}
            <div data-reveal style={{
              borderRadius: '24px',
              overflow: 'hidden',
              height: '450px',
              boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
              border: '1px solid rgba(201,160,80,0.15)'
            }}>
              <img
                src={photos[1].src}
                alt="Бар Скала - Барная стойка"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
