import { AbsoluteFill, interpolate, useCurrentFrame, staticFile, spring, useVideoConfig } from 'remotion';

export const IntroScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
        extrapolateRight: 'clamp',
    });

    const logoScale = spring({
        frame,
        fps,
        config: {
            damping: 12,
        },
    });

    const taglineOpacity = interpolate(frame, [40, 60], [0, 1], {
        extrapolateRight: 'clamp',
    });

    return (
        <AbsoluteFill style={{
            backgroundColor: '#fff',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#000',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{ opacity: logoOpacity, transform: `scale(${logoScale})`, textAlign: 'center' }}>
                <div style={{ marginBottom: 30 }}>
                    <img src={staticFile('assets/logo-semantix.svg')} style={{ height: 120 }} />
                </div>
                <h1 style={{
                    fontSize: 64,
                    fontWeight: 300,
                    margin: 0,
                    letterSpacing: '-1.5px',
                    lineHeight: 1.1
                }}>
                    turn your <span style={{ fontWeight: 700 }}>search engine</span><br />to <span style={{ color: '#8D5CFF', fontWeight: 700 }}>sales engine</span>
                </h1>
                <div style={{
                    opacity: taglineOpacity,
                    fontSize: 24,
                    marginTop: 30,
                    color: '#666',
                    fontWeight: 400,
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                }}>
                    with zero effort
                </div>
            </div>
        </AbsoluteFill>
    );
};
