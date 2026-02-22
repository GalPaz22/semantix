import { Composition } from 'remotion';
import { SearchSaverVideo } from './SearchSaverVideo';

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="SearchSaverVideo"
                component={SearchSaverVideo}
                durationInFrames={1200} // 40 seconds at 30 fps
                fps={30}
                width={1920}
                height={1080}
            />
        </>
    );
};
