import { AbsoluteFill, interpolate, useCurrentFrame, staticFile, useVideoConfig } from 'remotion';
import { SearchBox, ProductCard } from '../components/Common';

export const NoisyResultScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();

    const introOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
    const gridOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: 'clamp' });

    const noisyProducts = [
        { name: 'Red Wine Cask Whiskey', price: '$85.00', img: staticFile('assets/whiskey_red_wine_cask_1770918749857.png') },
        { name: 'Wine Oak Barrels', price: '$299.00', img: staticFile('assets/whiskey_red_wine_cask_1770918749857.png') },
        { name: 'Vintage Grapes Photo', price: '$45.00', img: staticFile('assets/whiskey_red_wine_cask_1770918749857.png') },
        { name: 'Red Wine Vinegar', price: '$12.00', img: staticFile('assets/whiskey_red_wine_cask_1770918749857.png') },
    ];

    return (
        <AbsoluteFill style={{ backgroundColor: '#fff', color: '#000', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ position: 'absolute', top: 100, width: '100%', display: 'flex', justifyContent: 'center' }}>
                <SearchBox query="red wine" cursor={false} />
            </div>

            <div style={{
                opacity: introOpacity,
                position: 'absolute',
                top: 250,
                width: '100%',
                textAlign: 'center'
            }}>
                <h2 style={{ fontSize: 42, fontWeight: 300, letterSpacing: '-1px' }}>Noisy results cluttering your store?</h2>
            </div>

            <div style={{
                opacity: gridOpacity,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 40,
                padding: '300px 100px 50px',
                width: '100%',
                height: '100%',
                backgroundColor: '#fff'
            }}>
                {noisyProducts.map((p, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                        <ProductCard name={p.name} price={p.price} image={p.img} />
                        <div style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            backgroundColor: '#ff4d4d',
                            color: 'white',
                            padding: '4px 8px',
                            fontSize: 12,
                            fontWeight: 700
                        }}>IRRELEVANT</div>
                    </div>
                ))}
            </div>
        </AbsoluteFill>
    );
};
