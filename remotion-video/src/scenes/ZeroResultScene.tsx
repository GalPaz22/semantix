import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { SearchBox } from '../components/Common';

export const ZeroResultScene: React.FC = () => {
    const frame = useCurrentFrame();

    return (
        <AbsoluteFill style={{ backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ position: 'absolute', top: 100, width: '100%', display: 'flex', justifyContent: 'center' }}>
                <SearchBox query="bikini" cursor={false} />
            </div>

            <div style={{ textAlign: 'center', color: '#000', fontFamily: 'Inter, sans-serif' }}>
                <div style={{ fontSize: 80, marginBottom: 20, opacity: 0.8 }}>🏝️</div>
                <h2 style={{ fontSize: 48, fontWeight: 300, margin: 0, letterSpacing: '-1px' }}>No results matched your search</h2>
                <p style={{ fontSize: 20, color: '#666', marginTop: 10, letterSpacing: '0.5px' }}>Revenue potentially lost</p>
            </div>
        </AbsoluteFill>
    );
};
