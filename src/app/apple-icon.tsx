import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #7C5CFC, #5B8DEF)',
          borderRadius: '36px',
        }}
      >
        <span
          style={{
            fontSize: '110px',
            fontWeight: 800,
            color: '#fff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          M
        </span>
      </div>
    ),
    { ...size },
  );
}
