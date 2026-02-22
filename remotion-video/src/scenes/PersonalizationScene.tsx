import { AbsoluteFill, interpolate, useCurrentFrame, staticFile } from 'remotion';
import { SearchBox, ProductCard } from '../components/Common';

export const PersonalizationScene: React.FC = () => {
    const frame = useCurrentFrame();

    const profileOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' });
    const rerankOpacity = interpolate(frame, [80, 100], [0, 1], { extrapolateRight: 'clamp' });

    const initialProducts = [
        { name: 'Budget Runner', price: '$59', img: staticFile('assets/running_shoes_premium_v2_1770918778214.png') },
        { name: 'Pro Sprint', price: '$180', img: staticFile('assets/running_shoes_premium_v2_1770918778214.png') },
        { name: 'Daily Jogger', price: '$85', img: staticFile('assets/running_shoes_premium_v2_1770918778214.png') },
        { name: 'Ultra Trail', price: '$220', img: staticFile('assets/running_shoes_premium_v2_1770918778214.png') },
    ];

    // Reorder based on frame
    const order = frame > 100 ? [1, 3, 2, 0] : [0, 1, 2, 3];

    return (
        <AbsoluteFill style={{ backgroundColor: '#fff', color: '#000', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ position: 'absolute', top: 100, width: '100%', display: 'flex', justifyContent: 'center' }}>
                <SearchBox query="running shoes" cursor={false} />
            </div>

            {/* User Profile Info */}
            <div style={{
                opacity: profileOpacity,
                position: 'absolute',
                top: 200,
                right: 100,
                textAlign: 'right',
                display: 'flex',
                alignItems: 'center'
            }}>
                <div style={{ marginRight: 20 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px' }}>User Profile: Alex</div>
                    <div style={{ fontSize: 14, color: '#8D5CFF', textTransform: 'uppercase', letterSpacing: '1px' }}>Preference: Elite Performance</div>
                </div>
                <div style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    backgroundColor: '#8D5CFF',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#fff'
                }}>A</div>
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
                {order.map((idx, pos) => {
                    const p = initialProducts[idx];
                    return <ProductCard key={idx} name={p.name} price={p.price} image={p.img} />;
                })}
            </div>

            {frame > 90 && frame < 150 && (
                <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
                    <div style={{
                        backgroundColor: 'rgba(141, 92, 255, 0.9)',
                        color: '#fff',
                        padding: '20px 40px',
                        fontSize: 32,
                        fontWeight: 700,
                        letterSpacing: '2px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                        opacity: rerankOpacity
                    }}>PERSONALIZING RESULTS...</div>
                </AbsoluteFill>
            )}
        </AbsoluteFill>
    );
};
