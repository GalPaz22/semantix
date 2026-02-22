import { AbsoluteFill, interpolate, useCurrentFrame, staticFile, spring, useVideoConfig } from 'remotion';

export const OutroScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const opacity = interpolate(frame, [0, 20], [0, 1], {
        extrapolateRight: 'clamp',
    });

    const logoScale = spring({
        frame,
        fps,
        config: {
            damping: 12,
        },
    });

    return (
        <AbsoluteFill style={{
            backgroundColor: '#fff',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#000',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{ textAlign: 'center', opacity }}>
                <div style={{ transform: `scale(${logoScale})`, marginBottom: 40 }}>
                    <img src={staticFile('assets/logo-semantix.svg')} style={{ height: 100 }} />
                </div>
                <h2 style={{ fontSize: 48, fontWeight: 300, margin: 0, letterSpacing: '-1px' }}>Step into the future of e-commerce</h2>
                <p style={{ fontSize: 20, color: '#666', marginTop: 20, textTransform: 'uppercase', letterSpacing: '2px' }}>Measure results from day one</p>
                <div style={{
                    marginTop: 60,
                    fontSize: 28,
                    fontWeight: 700,
                    color: '#8D5CFF',
                    border: '1px solid #8D5CFF',
                    padding: '15px 40px',
                    display: 'inline-block'
                }}>
                    semantix-ai.com
                </div>
            </div>
        </AbsoluteFill>
    );
};
