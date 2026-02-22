import { AbsoluteFill, interpolate, useCurrentFrame, staticFile } from 'remotion';
import { SearchBox, ProductCard } from '../components/Common';

export const MerchandisingScene: React.FC = () => {
    const frame = useCurrentFrame();

    const dashboardOpacity = interpolate(frame, [0, 20], [1, 1], { extrapolateRight: 'clamp' });
    const searchOpacity = interpolate(frame, [100, 120], [0, 1], { extrapolateRight: 'clamp' });

    const boostStatus = frame > 40 ? '✅ Boosted' : 'Boost Product';

    const products = [
        { name: 'Premium Cabernet Reserve', price: '$55.00', img: staticFile('assets/red_wine_bottles_1770918723036.png') },
        { name: 'Vintage Merlot', price: '$48.00', img: staticFile('assets/red_wine_bottles_1770918723036.png') },
        { name: 'Reserve Pinot', price: '$65.00', img: staticFile('assets/red_wine_bottles_1770918723036.png') },
        { name: 'Chateau Malbec', price: '$42.00', img: staticFile('assets/red_wine_bottles_1770918723036.png') },
    ];

    return (
        <AbsoluteFill style={{ backgroundColor: '#fff', color: '#000', fontFamily: 'Inter, sans-serif' }}>
            {/* Dashboard Part */}
            <AbsoluteFill style={{ opacity: 1 - searchOpacity, padding: 80, display: frame < 120 ? 'flex' : 'none', backgroundColor: '#fff' }}>
                <div style={{ fontSize: 18, color: '#8D5CFF', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 20 }}>Semantix Merchant Dashboard</div>
                <div style={{ height: 1, backgroundColor: '#eee', marginBottom: 60 }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fcfcfc', padding: 40, border: '1px solid #eee' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <img src={staticFile('assets/red_wine_bottles_1770918723036.png')} style={{ width: 120, height: 120, objectFit: 'cover', border: '1px solid #eee' }} />
                        <div style={{ marginLeft: 30 }}>
                            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-1px' }}>Premium Cabernet Reserve</div>
                            <div style={{ fontSize: 18, color: '#666' }}>In Stock: 450 units</div>
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: frame > 40 ? 'transparent' : '#8D5CFF',
                        border: frame > 40 ? '2px solid #8D5CFF' : 'none',
                        color: frame > 40 ? '#8D5CFF' : '#fff',
                        padding: '15px 40px',
                        fontSize: 20,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        {boostStatus}
                    </div>
                </div>

                {frame > 50 && frame < 90 && (
                    <div style={{
                        marginTop: 40,
                        fontSize: 40,
                        fontWeight: 700,
                        color: '#10B981',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        letterSpacing: '4px'
                    }}>Optimizing Search Ranking...</div>
                )}
            </AbsoluteFill>

            {/* Search Result Part */}
            <AbsoluteFill style={{ opacity: searchOpacity, backgroundColor: '#fff', display: frame > 100 ? 'flex' : 'none' }}>
                <div style={{ position: 'absolute', top: 80, width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <SearchBox query="red wine" cursor={false} />
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 40,
                    padding: '250px 100px 50px',
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#fff'
                }}>
                    {products.map((p, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                            {i === 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: -15,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: '#8D5CFF',
                                    color: '#fff',
                                    padding: '4px 12px',
                                    fontSize: 12,
                                    fontWeight: 800,
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    zIndex: 10
                                }}>Boosted</div>
                            )}
                            <ProductCard name={p.name} price={p.price} image={p.img} scale={i === 0 ? 1.05 : 1} />
                        </div>
                    ))}
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
