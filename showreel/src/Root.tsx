import "./index.css"
import { Composition } from "remotion"
import { Showreel, SHOWREEL_DURATION } from "./marken/Showreel"
import { FPS, W, H } from "./marken/theme"

export const RemotionRoot: React.FC = () => (
  <Composition
    id="MarkenShowreel"
    component={Showreel}
    durationInFrames={SHOWREEL_DURATION}
    fps={FPS}
    width={W}
    height={H}
  />
)
