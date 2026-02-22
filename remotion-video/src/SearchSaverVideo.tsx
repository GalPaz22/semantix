import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { IntroScene } from './scenes/IntroScene';
import { ZeroResultScene } from './scenes/ZeroResultScene';
import { RecoveryScene } from './scenes/RecoveryScene';
import { NoisyResultScene } from './scenes/NoisyResultScene';
import { CorrectionScene } from './scenes/CorrectionScene';
import { PersonalizationScene } from './scenes/PersonalizationScene';
import { MerchandisingScene } from './scenes/MerchandisingScene';
import { OutroScene } from './scenes/OutroScene';

export const SearchSaverVideo: React.FC = () => {
    return (
        <TransitionSeries>
            <TransitionSeries.Sequence durationInFrames={120}>
                <IntroScene />
            </TransitionSeries.Sequence>

            <TransitionSeries.Transition
                timing={linearTiming({ durationInFrames: 30 })}
                presentation={fade()}
            />

            <TransitionSeries.Sequence durationInFrames={150}>
                <ZeroResultScene />
            </TransitionSeries.Sequence>

            <TransitionSeries.Transition
                timing={linearTiming({ durationInFrames: 30 })}
                presentation={fade()}
            />

            <TransitionSeries.Sequence durationInFrames={180}>
                <RecoveryScene />
            </TransitionSeries.Sequence>

            <TransitionSeries.Transition
                timing={linearTiming({ durationInFrames: 30 })}
                presentation={fade()}
            />

            <TransitionSeries.Sequence durationInFrames={150}>
                <NoisyResultScene />
            </TransitionSeries.Sequence>

            <TransitionSeries.Transition
                timing={linearTiming({ durationInFrames: 30 })}
                presentation={fade()}
            />

            <TransitionSeries.Sequence durationInFrames={150}>
                <CorrectionScene />
            </TransitionSeries.Sequence>

            <TransitionSeries.Transition
                timing={linearTiming({ durationInFrames: 30 })}
                presentation={fade()}
            />

            <TransitionSeries.Sequence durationInFrames={180}>
                <PersonalizationScene />
            </TransitionSeries.Sequence>

            <TransitionSeries.Transition
                timing={linearTiming({ durationInFrames: 30 })}
                presentation={fade()}
            />

            <TransitionSeries.Sequence durationInFrames={210}>
                <MerchandisingScene />
            </TransitionSeries.Sequence>

            <TransitionSeries.Transition
                timing={linearTiming({ durationInFrames: 30 })}
                presentation={fade()}
            />

            <TransitionSeries.Sequence durationInFrames={120}>
                <OutroScene />
            </TransitionSeries.Sequence>
        </TransitionSeries>
    );
};
