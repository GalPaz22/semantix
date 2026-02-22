import { interpolate, useCurrentFrame, AbsoluteFill } from 'remotion';

export const SearchBox: React.FC<{ query: string; cursor: boolean }> = ({ query, cursor }) => {
    const frame = useCurrentFrame();

    return (
        <div style={{
            width: 900,
            height: 70,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 25px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            fontSize: 28,
            fontFamily: 'Inter, sans-serif',
            color: '#000',
            letterSpacing: '-0.5px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <span>{query}</span>
                {cursor && (
                    <span style={{
                        width: 2,
                        height: 30,
                        backgroundColor: '#000',
                        marginLeft: 4,
                        opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0
                    }} />
                )}
            </div>
            <div style={{ fontSize: 24, opacity: 0.8 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </div>
        </div>
    );
};

export const ProductCard: React.FC<{ name: string; price: string; image: string; opacity?: number; scale?: number }> = ({ name, price, image, opacity = 1, scale = 1 }) => (
    <div style={{
        width: 320,
        backgroundColor: '#fff',
        border: '1px solid #eee',
        opacity,
        transform: `scale(${scale})`,
        fontFamily: 'Inter, sans-serif'
    }}>
        <div style={{ width: '100%', height: 400, overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
            <img src={image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ padding: '20px 0' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.2px', textTransform: 'uppercase' }}>{name}</div>
            <div style={{ fontSize: 14, color: '#666', fontWeight: 500 }}>{price}</div>
        </div>
    </div>
);
