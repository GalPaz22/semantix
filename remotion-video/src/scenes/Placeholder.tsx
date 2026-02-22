import { AbsoluteFill } from 'remotion';
export const PlaceholderScene: React.FC<{ text: string }> = ({ text }) => (
    <AbsoluteFill style={{ backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }}>
        <h2 style={{ fontSize: 40, color: '#374151' }}>{text}</h2>
    </AbsoluteFill>
);
