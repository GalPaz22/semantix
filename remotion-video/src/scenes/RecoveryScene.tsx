import { AbsoluteFill, interpolate, useCurrentFrame, staticFile } from 'remotion';
import { SearchBox, ProductCard } from '../components/Common';

export const RecoveryScene: React.FC = () => {
    const frame = useCurrentFrame();

    const loaderOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
    const gridOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: 'clamp' });

    const products = [
        { name: 'Midnight Wave Bikini', price: '$85.00', img: staticFile('assets/swimsuit_collection_1770918707829.png') },
        { name: 'Azure Deep One-Piece', price: '$120.00', img: staticFile('assets/swimsuit_collection_1770918707829.png') },
        { name: 'Coral Sunset Set', price: '$95.00', img: staticFile('assets/swimsuit_collection_1770918707829.png') },
        { name: 'Emerald Coast Two-Piece', price: '$49.00', img: staticFile('assets/swimsuit_collection_1770918707829.png') },
    ];

    return (
        <AbsoluteFill style={{ backgroundColor: '#fff' }}>
            <div style={{ position: 'absolute', top: 100, width: '100%', display: 'flex', justifyContent: 'center' }}>
                <SearchBox query="bikini" cursor={false} />
            </div>

            {/* Loader */}
            <AbsoluteFill style={{ opacity: frame < 70 ? loaderOpacity : 1 - gridOpacity, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none', backgroundColor: '#fff', display: frame < 80 ? 'flex' : 'none' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: 40 }}>
                        <img src={staticFile('assets/powered.png')} style={{ height: 120 }} />
                    </div>
                    <div className="loader" style={{
                        width: 50,
                        height: 50,
                        border: '4px solid #eee',
                        borderTop: '4px solid #000',
                        borderRadius: '50%',
                        margin: '0 auto 20px',
                        transform: `rotate(${frame * 12}deg)`
                    }} />
                    <div style={{ fontSize: 24, letterSpacing: '4px', textTransform: 'uppercase', color: '#000', fontWeight: 300 }}>Processing Intent</div>
                </div>
            </AbsoluteFill>

            {/* Results Grid */}
            <div style={{
                opacity: gridOpacity,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 40,
                padding: '250px 100px 50px',
                width: '100%',
                height: '100%',
                backgroundColor: '#fff',
                display: frame > 60 ? 'grid' : 'none'
            }}>
                {products.map((p, i) => (
                    <ProductCard
                        key={i}
                        name={p.name}
                        price={p.price}
                        image={p.img}
                        opacity={interpolate(frame, [70 + i * 5, 90 + i * 5], [0, 1], { extrapolateRight: 'clamp' })}
                        scale={interpolate(frame, [70 + i * 5, 90 + i * 5], [0.8, 1], { extrapolateRight: 'clamp' })}
                    />
                ))}
            </div>
        </AbsoluteFill>
    );
};
