import { ImageResponse } from 'next/og';

export const alt = 'Maketaa - AI 마케팅 콘텐츠 제작 도구';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #0A0A0F 0%, #141420 50%, #0A0A0F 100%)',
          position: 'relative',
        }}
      >
        {/* Gradient orb top-right */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-80px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,92,252,0.25) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        {/* Gradient orb bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '-60px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(91,141,239,0.2) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #7C5CFC, #5B8DEF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              fontWeight: 800,
              color: '#fff',
            }}
          >
            M
          </div>
          <span
            style={{
              fontSize: '48px',
              fontWeight: 700,
              color: '#fff',
            }}
          >
            Mak
            <span style={{ color: '#7C5CFC' }}>etaa</span>
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '28px',
            color: 'rgba(255,255,255,0.85)',
            fontWeight: 500,
            marginBottom: '16px',
            display: 'flex',
          }}
        >
          AI로 마케팅 콘텐츠를 쉽고 빠르게
        </div>

        {/* Sub-tagline */}
        <div
          style={{
            fontSize: '18px',
            color: 'rgba(255,255,255,0.5)',
            display: 'flex',
            gap: '24px',
          }}
        >
          <span>숏폼 영상 제작</span>
          <span>·</span>
          <span>카드뉴스 메이커</span>
          <span>·</span>
          <span>AI 마케팅 전략</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
