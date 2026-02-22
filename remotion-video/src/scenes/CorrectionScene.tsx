import { AbsoluteFill, interpolate, useCurrentFrame, staticFile } from 'remotion';
import { SearchBox, ProductCard } from '../components/Common';

export const CorrectionScene: React.FC = () => {
    const frame = useCurrentFrame();

    const bannerOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' });

    const products = [
        { name: 'Premium Cabernet', price: '$55.00', img: staticFile('assets/red_wine_bottles_1770918723036.png') },
        { name: 'Vintage Merlot 2021', price: '$48.00', img: staticFile('assets/red_wine_bottles_1770918723036.png') },
        { name: 'Reserve Pinot Noir', price: '$65.00', img: staticFile('assets/red_wine_bottles_1770918723036.png') },
        { name: 'Chateau Malbec', price: '$42.00', img: staticFile('assets/red_wine_bottles_1770918723036.png') },
    ];

    return (
        <AbsoluteFill style={{ backgroundColor: '#fff', color: '#000', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ position: 'absolute', top: 100, width: '100%', display: 'flex', justifyContent: 'center' }}>
                <SearchBox query="red wine" cursor={false} />
            </div>

            <div style={{
                opacity: bannerOpacity,
                backgroundColor: '#f8f8f8',
                borderBottom: '2px solid #8D5CFF',
                color: '#000',
                padding: '15px 0',
                textAlign: 'center',
                fontSize: 24,
                fontWeight: 300,
                position: 'absolute',
                top: 180,
                width: '100%',
                letterSpacing: '1px',
                textTransform: 'uppercase'
            }}>
                ✨ Semantix injected results: 4 relevant products found
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 40,
                padding: '300px 100px 50px',
                width: '100%',
                height: '100%',
                backgroundColor: '#fff'
            }}>
                {products.map((p, i) => (
                    <ProductCard key={i} name={p.name} price={p.price} image={p.img} opacity={interpolate(frame, [40 + i * 5, 60 + i * 5], [0, 1], { extrapolateLeft: 'clamp' })} />
                ))}
            </div>
        </AbsoluteFill>
    );
};
